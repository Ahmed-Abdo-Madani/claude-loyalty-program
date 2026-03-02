import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import logger from '../config/logger.js';
import TemplateRenderer from '../utils/emailTemplateRenderer.js';

/**
 * EmailService - Email processing service using Resend
 * Handles transactional emails, receipts, and business notifications
 * 
 * API Documentation: https://resend.com/docs
 * Authentication: Bearer Token (API Key)
 */
class EmailService {
  static HEADERS = {
    'X-Entity-Ref-ID': randomUUID(), // Tracking ID for logs
  };

  static emailRateLimiter = {
    count: 0,
    resetTime: null,
    dailyLimit: 100 // Default, will be updated from env
  };

  static resendClient = null;

  /**
   * Get Resend API client instance (Singleton pattern)
   * @returns {Resend} Resend client instance
   * @throws {Error} If RESEND_API_KEY is not configured
   */
  static getResendClient() {
    if (this.resendClient) {
      return this.resendClient;
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      const error = new Error('RESEND_API_KEY is not configured in environment variables');
      logger.error('Resend configuration error', { error: error.message });
      throw error;
    }

    this.resendClient = new Resend(apiKey);
    logger.debug('Resend client initialized');

    return this.resendClient;
  }

  /**
   * Get usage statistics for the rate limiter
   * @returns {Object} Usage statistics
   */
  static getUsageStats() {
    this.checkAndResetRateLimit();

    return {
      emailsSentToday: this.emailRateLimiter.count,
      dailyLimit: this.emailRateLimiter.dailyLimit,
      remainingToday: Math.max(0, this.emailRateLimiter.dailyLimit - this.emailRateLimiter.count),
      percentUsed: Number(((this.emailRateLimiter.count / this.emailRateLimiter.dailyLimit) * 100).toFixed(1)),
      resetTime: this.emailRateLimiter.resetTime
    };
  }

  /**
   * Check and reset the daily rate limit counter if a new day has started
   */
  static checkAndResetRateLimit() {
    const now = new Date();

    // Initialize if needed
    if (!this.emailRateLimiter.resetTime) {
      const nextMidnight = new Date(now);
      nextMidnight.setUTCHours(24, 0, 0, 0);
      this.emailRateLimiter.resetTime = nextMidnight;
      this.emailRateLimiter.dailyLimit = parseInt(process.env.RESEND_DAILY_LIMIT || '100', 10);
      return;
    }

    // Reset if past midnight UTC
    if (now >= this.emailRateLimiter.resetTime) {
      this.emailRateLimiter.count = 0;
      const nextMidnight = new Date(now);
      nextMidnight.setUTCHours(24, 0, 0, 0); // Next midnight
      this.emailRateLimiter.resetTime = nextMidnight;
      this.emailRateLimiter.dailyLimit = parseInt(process.env.RESEND_DAILY_LIMIT || '100', 10);
      logger.info('Email rate limit counter reset for the new day');
    }
  }

  /**
   * Check if sending is allowed under rate limits
   * @throws {Error} If rate limit exceeded
   */
  static checkRateLimit() {
    this.checkAndResetRateLimit();

    if (this.emailRateLimiter.count >= this.emailRateLimiter.dailyLimit) {
      const error = new Error(`Daily email limit of ${this.emailRateLimiter.dailyLimit} reached`);
      error.code = 'RATE_LIMIT_EXCEEDED';
      throw error;
    }

    // Log warning if approaching limit (80%, 90%, 95%)
    const percentUsed = (this.emailRateLimiter.count / this.emailRateLimiter.dailyLimit) * 100;
    if (percentUsed >= 95) {
      logger.warn('Email rate limit critical', { percentUsed, count: this.emailRateLimiter.count, limit: this.emailRateLimiter.dailyLimit });
    } else if (percentUsed >= 80 && percentUsed < 81) { // Log once around 80%
      logger.warn('Email rate limit approaching', { percentUsed, count: this.emailRateLimiter.count, limit: this.emailRateLimiter.dailyLimit });
    }
  }

  /**
   * Validate required email configuration
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is missing
   */
  static validateConfig() {
    const requiredVars = ['RESEND_API_KEY', 'EMAIL_FROM', 'FRONTEND_URL'];
    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
      const error = new Error(`Missing required email configuration: ${missingVars.join(', ')}`);
      logger.error('Email configuration error', { missingVars });
      throw error;
    }

    return true;
  }

  /**
   * Send a payment receipt to a customer
   * @param {string} customerEmail - Customer email address
   * @param {Buffer} receiptPdf - PDF buffer of the receipt
   * @param {Object} receiptData - Receipt metadata
   * @param {string} receiptData.receiptNumber - Receipt reference number
   * @param {string} receiptData.businessName - Name of the business
   * @param {string} receiptData.saleDate - Date of sale
   * @param {string} receiptData.total - Total amount formatted
   * @returns {Promise<Object>} Send result
   */
  static async sendReceipt(customerEmail, receiptPdf, receiptData) {
    const { receiptNumber, businessName, language = 'ar' } = receiptData;

    const subject = language === 'ar'
      ? `إيصال رقم ${receiptNumber} - ${businessName}`
      : `Receipt #${receiptNumber} - ${businessName}`;

    // Use template renderer
    const html = await TemplateRenderer.renderReceiptTemplate(receiptData, language);

    // Generate simple text fallback
    const text = language === 'ar'
      ? `إيصال من ${businessName}\n\nشكراً لتعاملكم معنا. الرجاء العثور على الإيصال #${receiptNumber} مرفقاً.`
      : `Receipt from ${businessName}\n\nThank you for your business. Please find your receipt #${receiptNumber} attached.`;

    return this.sendTransactional({
      to: customerEmail,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `receipt-${receiptNumber}.pdf`,
          content: receiptPdf
        }
      ]
    });
  }

  /**
   * Send a notification to a business owner
   * @param {string} businessEmail - Business owner email
   * @param {string} subject - Email subject
   * @param {string} message - Email body (HTML)
   * @param {Object} options - Optional parameters
   * @returns {Promise<Object>} Send result
   */
  static async sendBusinessNotification(businessEmail, subject, message, options = {}) {
    const { priority, language = 'en', notificationType, notificationData } = options;

    let html;

    // Use template if type is provided
    if (notificationType && notificationData) {
      html = await TemplateRenderer.renderNotificationTemplate(notificationType, notificationData, language);
    } else {
      // Fallback/Generic notification
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h3>Business Notification</h3>
          <div style="padding: 15px; border: 1px solid #eee; border-radius: 5px;">
            ${message}
          </div>
          <p style="font-size: 12px; color: #888; margin-top: 20px;">
            Sent by Madn Notification System
          </p>
        </div>
      `;
    }

    return this.sendTransactional({
      to: businessEmail,
      subject,
      html,
      text: options.text || (typeof message === 'string' ? message.replace(/<[^>]*>?/gm, '') : 'Notification'),
      priority,
      ...options
    });
  }

  /**
   * Send a message notification email
   * @param {string} recipientEmail - Recipient email
   * @param {Object} notificationData - Data for the template
   * @param {Object} options - Options (language, notificationType, unsubscribeToken)
   * @returns {Promise<Object>} Send result
   */
  static async sendMessageNotification(recipientEmail, notificationData, options = {}) {
    const { language = 'en', notificationType, unsubscribeToken, replyTo } = options;

    if (!['new-message', 'new-inquiry'].includes(notificationType)) {
      throw new Error(`Invalid notification type: ${notificationType}`);
    }

    // Generate unsubscribe URL if token provided
    const unsubscribeUrl = unsubscribeToken
      ? `${process.env.FRONTEND_URL}/unsubscribe/messages/${unsubscribeToken}`
      : null;

    // Add unsubscribe URL to data
    const data = {
      ...notificationData,
      unsubscribeUrl,
      language
    };

    // Render HTML
    const html = await TemplateRenderer.renderMessageNotificationTemplate(notificationType, data, language);

    // Generate fallback text
    let text = '';
    if (notificationType === 'new-message') {
      text = `New message from ${notificationData.adminName || 'Admin'}\n\n`;
      text += `Subject: ${notificationData.subject}\n\n`;
      text += `Message:\n${notificationData.messageBody}\n\n`;
      text += `To reply, please send an email to: ${notificationData.supportEmail}\n\n`;
      if (unsubscribeUrl) text += `Unsubscribe: ${unsubscribeUrl}`;
    } else {
      text = `New inquiry from ${notificationData.businessName}\n\n`;
      text += `Subject: ${notificationData.subject}\n\n`;
      text += `View in dashboard: ${notificationData.conversationUrl}`;
    }

    return this.sendTransactional({
      to: recipientEmail,
      subject: notificationData.subject,
      html,
      text,
      priority: 'normal',
      replyTo: replyTo, // Pass replyTo if provided
      externalId: options.messageId || undefined // Use message ID for tracking if provided
    });
  }

  /**
   * Send a templated email
   * @param {string} templateName - Template renderer name
   * @param {Object} data - Template data
   * @param {Object} emailOptions - Email options (to, subject, etc)
   * @returns {Promise<Object>} Send result
   */
  static async sendTemplatedEmail(templateName, data, emailOptions) {
    const language = data.language || 'ar';
    const html = await TemplateRenderer.renderTemplate(templateName, data, language);

    return this.sendTransactional({
      ...emailOptions,
      html,
      text: data.text || html.replace(/<[^>]*>?/gm, '') // Fallback text from HTML
    });
  }

  /**
   * Send a transactional email via Resend with retry logic and rate limiting
   * @param {Object} emailData - Email details
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Subject line
   * @param {string} emailData.html - HTML content
   * @param {string} emailData.text - Plain text content (optional, auto-generated if missing)
   * @param {Array} emailData.attachments - Attachments array usually { filename, content }
   * @param {string} emailData.priority - 'high', 'normal', 'low' (default: normal)
   * @returns {Promise<Object>} Result with success status and message ID
   */
  static async sendTransactional(emailData) {
    const {
      to,
      subject,
      html,
      text,
      attachments = [],
      priority,
      replyTo
    } = emailData;

    let attempt = 0;

    try {
      this.validateConfig();

      // Check rate limit before proceeding
      this.checkRateLimit();

      // Validate inputs
      if (!to || !subject) {
        throw new Error('Missing required fields: to, subject');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        throw new Error(`Invalid email address format: ${to}`);
      }

      const client = this.getResendClient();
      const from = process.env.EMAIL_FROM;
      const defaultReplyTo = process.env.EMAIL_REPLY_TO || from;
      const finalReplyTo = replyTo || defaultReplyTo;

      // Retry configuration
      const maxRetries = parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS || '3', 10);
      const baseDelay = 1000; // 1 second
      let lastError = null;

      while (attempt <= maxRetries) {
        try {
          attempt++;

          if (attempt > 1) {
            logger.info(`Retrying email send (attempt ${attempt}/${maxRetries + 1})`, { to, subject });
          }

          logger.debug('Sending email via Resend', {
            to,
            subject,
            attachmentCount: attachments.length,
            attempt
          });

          const payload = {
            from,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback text generation
            reply_to: finalReplyTo,
            attachments,
            headers: priority === 'high' ? { 'X-Priority': '1' } : undefined
          };

          const result = await client.emails.send(payload);

          if (result.error) {
            throw result.error;
          }

          // Increment rate limiter on success
          this.emailRateLimiter.count++;

          logger.info('Email sent successfully', {
            messageId: result.data?.id,
            to,
            attempts: attempt
          });

          return {
            success: true,
            externalId: result.data?.id,
            provider: 'resend',
            attempts: attempt
          };

        } catch (error) {
          lastError = error;
          const standardizedError = this.handleResendError(error);

          // Check if retryable
          if (standardizedError.isRetryable && attempt <= maxRetries) {
            const delayMs = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
            logger.warn(`Email send failed, retrying in ${delayMs}ms`, {
              error: standardizedError.message,
              attempt,
              nextRetry: delayMs
            });

            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }

          // Not retryable or max retries reached
          throw standardizedError;
        }
      }
    } catch (error) {
      const errorContext = {
        to,
        subject,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        isRetryable: error.isRetryable || false,
        attempts: attempt
      };

      if (error.code !== 'RATE_LIMIT_EXCEEDED') {
        logger.error('Failed to send email', errorContext);
      } else {
        logger.warn('Email send prevented by rate limit', errorContext);
      }

      const enhancedError = this.handleResendError(error);
      Object.assign(enhancedError, errorContext);
      throw enhancedError;
    }
  }

  /**
   * Handle Resend API errors and standardize output
   * @param {Error} error - Original error object
   * @returns {Error} Standardized error object
   */
  static handleResendError(error) {
    // Already a standard error?
    if (error.type && error.code && error.isRetryable !== undefined) return error;

    let message = error.message || 'Unknown email error';
    let code = 'EMAIL_SEND_FAILED';
    let isRetryable = false;

    // Map common Resend errors and determine retryability
    // Resend SDK errors often have a 'name' or 'statusCode'
    if (message.includes('API key') || error.statusCode === 401) {
      message = 'Invalid Resend API key';
      code = 'AUTH_ERROR';
      isRetryable = false; // Configuration error
    } else if (error.statusCode === 429 || message.includes('rate limit')) {
      message = 'Resend rate limit exceeded';
      code = 'RATE_LIMIT_PROVIDER'; // Distinguish from internal RATE_LIMIT_EXCEEDED
      isRetryable = true; // Retry might work later
    } else if (error.statusCode === 400 || message.includes('invalid')) {
      code = 'VALIDATION_ERROR';
      isRetryable = false; // Bad request
    } else if (message.includes('timeout') || message.includes('network') || message.includes('ECONN')) {
      message = 'Resend API timeout or network error';
      code = 'NETWORK_ERROR';
      isRetryable = true;
    } else if (error.statusCode >= 500) {
      message = 'Resend server error';
      code = 'SERVER_ERROR';
      isRetryable = true;
    }

    const standardError = new Error(message);
    standardError.code = code;
    standardError.originalError = error;
    standardError.isRetryable = isRetryable;

    return standardError;
  }
}

export default EmailService;
