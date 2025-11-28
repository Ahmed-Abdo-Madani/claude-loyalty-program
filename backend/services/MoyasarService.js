import axios from 'axios';
import crypto from 'crypto';
import logger from '../config/logger.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';

/**
 * MoyasarService - Payment processing service for Moyasar gateway
 * Handles one-time payments, tokenized recurring payments, verification, and refunds
 * 
 * API Documentation: https://docs.moyasar.com/api/
 * Authentication: Basic Auth with secret key
 * Amount Format: Integer in smallest unit (halalas: 1 SAR = 100)
 */
class MoyasarService {
  static MOYASAR_API_BASE_URL = 'https://api.moyasar.com/v1';

  /**
   * Get Moyasar API authentication headers
   * Uses Basic Auth with secret key (format: secretKey:)
   * @returns {Object} Headers object with Authorization and Content-Type
   * @throws {Error} If MOYASAR_SECRET_KEY is not configured
   */
  static getAuthHeaders() {
    const secretKey = process.env.MOYASAR_SECRET_KEY;
    
    if (!secretKey) {
      const error = new Error('MOYASAR_SECRET_KEY is not configured in environment variables');
      logger.error('Moyasar configuration error', { error: error.message });
      throw error;
    }

    // Basic Auth format: base64(secretKey:)
    const authString = Buffer.from(`${secretKey}:`).toString('base64');
    
    return {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate Moyasar publishable key format
   * @param {string} publishableKey - Publishable key to validate
   * @returns {Object} Validation result with valid, environment, and message
   */
  static validatePublishableKey(publishableKey) {
    const match = publishableKey?.match(/^pk_(test|live)_[a-zA-Z0-9_]+$/);
    const result = {
      valid: !!match,
      environment: match?.[1] || 'invalid',
      message: match ? 'Valid key format' : 'Invalid key format'
    };
    
    logger.debug('Publishable key validation', {
      valid: result.valid,
      environment: result.environment,
      keyPrefix: publishableKey?.substring(0, 15) + '...'
    });
    
    return result;
  }

  /**
   * Check if publishable key is a production key
   * @param {string} publishableKey - Publishable key to check
   * @returns {boolean} True if production key (starts with pk_live_)
   */
  static isProductionKey(publishableKey) {
    return publishableKey?.startsWith('pk_live_') || false;
  }

  /**
   * Convert SAR amount to halalas (smallest unit)
   * Moyasar requires amounts in smallest currency unit
   * @param {number} amountSAR - Amount in Saudi Riyals
   * @returns {number} Amount in halalas (1 SAR = 100 halalas)
   * @throws {Error} If amount is invalid
   */
  static convertToHalalas(amountSAR) {
    if (typeof amountSAR !== 'number' || amountSAR < 0) {
      throw new Error(`Invalid amount: ${amountSAR}. Must be a positive number.`);
    }

    // Convert to halalas and round to avoid floating point issues
    const halalas = Math.round(amountSAR * 100);
    
    logger.debug('Amount conversion', { amountSAR, halalas });
    
    return halalas;
  }

  /**
   * Convert halalas to SAR
   * @param {number} amountHalalas - Amount in halalas
   * @returns {number} Amount in Saudi Riyals
   */
  static convertToSAR(amountHalalas) {
    if (typeof amountHalalas !== 'number' || amountHalalas < 0) {
      throw new Error(`Invalid amount: ${amountHalalas}. Must be a positive number.`);
    }

    const amountSAR = amountHalalas / 100;
    
    return amountSAR;
  }

  /**
   * Create one-time payment via Moyasar API
   * Supports card payments with optional 3D Secure verification
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.businessId - Business secure ID
   * @param {string} paymentData.subscriptionId - Subscription secure ID
   * @param {number} paymentData.amount - Amount in SAR
   * @param {string} paymentData.currency - Currency code (default: SAR)
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - URL for 3DS redirect
   * @param {Object} paymentData.source - Payment source (card details or token)
   * @returns {Promise<Object>} Payment result with success status and payment data
   * @throws {Error} If payment creation fails
   */
  static async createPayment(paymentData) {
    const {
      businessId,
      subscriptionId,
      amount,
      currency = 'SAR',
      description,
      callbackUrl,
      source
    } = paymentData;

    // Validate required fields
    if (!businessId) {
      throw new Error('businessId is required for payment creation');
    }
    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required for payment creation');
    }
    if (!currency) {
      throw new Error('currency is required for payment creation');
    }
    if (!source) {
      throw new Error('source (payment method) is required for payment creation');
    }

    // Resolve callback URL with fallback to environment variable
    const resolvedCallbackUrl = callbackUrl || process.env.MOYASAR_CALLBACK_URL;
    if (!resolvedCallbackUrl) {
      throw new Error(
        'callbackUrl is required for payment creation. ' +
        'Provide it in paymentData or set MOYASAR_CALLBACK_URL environment variable.'
      );
    }

    logger.debug('Creating Moyasar payment', {
      businessId,
      subscriptionId,
      amount,
      currency,
      description
    });

    try {
      // Convert amount to smallest unit (halalas)
      const amountHalalas = this.convertToHalalas(amount);

      // Generate unique idempotency key
      const givenId = crypto.randomUUID();

      // Create payment record in database with pending status
      const payment = await Payment.create({
        business_id: businessId,
        subscription_id: subscriptionId,
        amount,
        currency,
        status: 'pending',
        payment_method: 'card',
        metadata: {
          gateway: 'moyasar',
          given_id: givenId,
          description,
          callback_url: resolvedCallbackUrl
        }
      });

      logger.debug('Payment record created', {
        paymentId: payment.public_id,
        givenId,
        callbackUrl: resolvedCallbackUrl
      });

      // Prepare Moyasar API request
      const moyasarPayload = {
        given_id: givenId,
        amount: amountHalalas,
        currency,
        description: description || `Subscription payment for business ${businessId}`,
        callback_url: resolvedCallbackUrl,
        source
      };

      // Make API request to Moyasar
      const response = await axios.post(
        `${this.MOYASAR_API_BASE_URL}/payments`,
        moyasarPayload,
        {
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      const moyasarPayment = response.data;

      logger.info('Moyasar payment created', {
        moyasarPaymentId: moyasarPayment.id,
        status: moyasarPayment.status,
        amount: moyasarPayment.amount,
        paymentId: payment.public_id
      });

      // Update payment record with Moyasar payment ID
      await payment.update({
        moyasar_payment_id: moyasarPayment.id,
        metadata: {
          ...payment.metadata,
          moyasar_response: moyasarPayment
        }
      });

      // Handle different payment statuses
      if (moyasarPayment.status === 'paid') {
        // Payment successful - mark as paid
        await payment.markAsPaid(moyasarPayment.id, {
          ...payment.metadata,
          transaction_id: moyasarPayment.id,
          moyasar_created_at: moyasarPayment.created_at
        });

        logger.info('Payment completed successfully', {
          paymentId: payment.public_id,
          moyasarPaymentId: moyasarPayment.id
        });

        return {
          success: true,
          payment,
          moyasarPayment,
          requiresVerification: false
        };
      } else if (moyasarPayment.status === 'initiated') {
        // 3DS verification required
        logger.info('Payment requires 3DS verification', {
          paymentId: payment.public_id,
          moyasarPaymentId: moyasarPayment.id,
          transactionUrl: moyasarPayment.source?.transaction_url
        });

        return {
          success: false,
          payment,
          moyasarPayment,
          requiresVerification: true,
          transactionUrl: moyasarPayment.source?.transaction_url
        };
      } else if (moyasarPayment.status === 'failed') {
        // Payment failed
        await payment.markAsFailed(
          moyasarPayment.source?.message || 'Payment failed at Moyasar'
        );

        logger.warn('Payment failed at Moyasar', {
          paymentId: payment.public_id,
          moyasarPaymentId: moyasarPayment.id,
          reason: moyasarPayment.source?.message
        });

        return {
          success: false,
          payment,
          moyasarPayment,
          requiresVerification: false,
          error: moyasarPayment.source?.message
        };
      }

      // Unknown status
      logger.warn('Unknown payment status from Moyasar', {
        paymentId: payment.public_id,
        moyasarPaymentId: moyasarPayment.id,
        status: moyasarPayment.status
      });

      return {
        success: false,
        payment,
        moyasarPayment,
        requiresVerification: false
      };

    } catch (error) {
      logger.error('Failed to create Moyasar payment', {
        businessId,
        subscriptionId,
        amount,
        error: error.message,
        stack: error.stack,
        moyasarError: error.response?.data
      });

      throw this.handleMoyasarError(error);
    }
  }

  /**
   * Create payment using stored Moyasar token for recurring billing
   * Token-based payments don't require 3DS verification
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.businessId - Business secure ID
   * @param {string} paymentData.subscriptionId - Subscription secure ID
   * @param {string} paymentData.token - Moyasar payment token
   * @param {number} paymentData.amount - Amount in SAR
   * @param {string} paymentData.currency - Currency code (default: SAR)
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - URL for redirect
   * @param {Transaction} paymentData.transaction - Optional Sequelize transaction for atomic operations
   * @returns {Promise<Object>} Payment result with success status and payment data
   * @throws {Error} If payment creation fails
   */
  static async createTokenizedPayment(paymentData) {
    const {
      businessId,
      subscriptionId,
      token,
      amount,
      currency = 'SAR',
      description,
      callbackUrl,
      transaction
    } = paymentData;

    // Validate required fields
    if (!businessId) {
      throw new Error('businessId is required for tokenized payment');
    }
    if (!subscriptionId) {
      throw new Error('subscriptionId is required for tokenized payment');
    }
    if (!token) {
      throw new Error('token is required for tokenized payment');
    }
    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required for tokenized payment');
    }

    // Resolve callback URL with fallback to environment variable
    const resolvedCallbackUrl = callbackUrl || process.env.MOYASAR_CALLBACK_URL;
    if (!resolvedCallbackUrl) {
      throw new Error(
        'callbackUrl is required for tokenized payment. ' +
        'Provide it in paymentData or set MOYASAR_CALLBACK_URL environment variable.'
      );
    }

    logger.debug('Creating tokenized Moyasar payment', {
      businessId,
      subscriptionId,
      amount,
      currency,
      tokenLength: token.length
    });

    try {
      // Fetch subscription to verify token matches
      const subscription = await Subscription.findOne({
        where: { public_id: subscriptionId }
      });

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      // Validate token matches subscription - fail fast on mismatch
      if (subscription.moyasar_token !== token) {
        const error = new Error(
          `Token mismatch for subscription ${subscriptionId}. ` +
          `Provided token does not match stored payment method.`
        );
        logger.error('Token mismatch detected', {
          subscriptionId,
          expectedToken: subscription.moyasar_token?.substring(0, 10),
          providedToken: token.substring(0, 10)
        });
        throw error;
      }

      // Convert amount to smallest unit
      const amountHalalas = this.convertToHalalas(amount);

      // Generate unique idempotency key
      const givenId = crypto.randomUUID();

      // Create payment record in database (use transaction if provided)
      const payment = await Payment.create({
        business_id: businessId,
        subscription_id: subscriptionId,
        amount,
        currency,
        status: 'pending',
        payment_method: 'card',
        metadata: {
          gateway: 'moyasar',
          given_id: givenId,
          description,
          callback_url: resolvedCallbackUrl,
          recurring: true,
          token_used: token.substring(0, 10) + '...' // Store partial token for reference
        }
      }, transaction ? { transaction } : {});

      logger.debug('Tokenized payment record created', {
        paymentId: payment.public_id,
        givenId,
        callbackUrl: resolvedCallbackUrl
      });

      // Prepare Moyasar API request with token source
      const moyasarPayload = {
        given_id: givenId,
        amount: amountHalalas,
        currency,
        description: description || `Recurring subscription payment for business ${businessId}`,
        callback_url: resolvedCallbackUrl,
        source: {
          type: 'token',
          token: token
        }
      };

      // Make API request to Moyasar
      const response = await axios.post(
        `${this.MOYASAR_API_BASE_URL}/payments`,
        moyasarPayload,
        {
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      const moyasarPayment = response.data;

      logger.info('Moyasar tokenized payment created', {
        moyasarPaymentId: moyasarPayment.id,
        status: moyasarPayment.status,
        amount: moyasarPayment.amount,
        paymentId: payment.public_id
      });

      // Update payment record with Moyasar payment ID (use transaction if provided)
      await payment.update({
        moyasar_payment_id: moyasarPayment.id,
        metadata: {
          ...payment.metadata,
          moyasar_response: moyasarPayment
        }
      }, transaction ? { transaction } : {});

      // Handle payment status
      if (moyasarPayment.status === 'paid') {
        // Payment successful - mark as paid (use transaction if provided)
        if (transaction) {
          await payment.update({
            status: 'paid',
            paid_at: new Date(),
            moyasar_payment_id: moyasarPayment.id,
            metadata: {
              ...payment.metadata,
              transaction_id: moyasarPayment.id,
              moyasar_created_at: moyasarPayment.created_at
            }
          }, { transaction });
        } else {
          await payment.markAsPaid(moyasarPayment.id, {
            ...payment.metadata,
            transaction_id: moyasarPayment.id,
            moyasar_created_at: moyasarPayment.created_at
          });
        }

        logger.info('Tokenized payment completed successfully', {
          paymentId: payment.public_id,
          moyasarPaymentId: moyasarPayment.id
        });

        return {
          success: true,
          payment,
          moyasarPayment
        };
      } else if (moyasarPayment.status === 'failed') {
        // Payment failed (use transaction if provided)
        if (transaction) {
          await payment.update({
            status: 'failed',
            failure_reason: moyasarPayment.source?.message || 'Tokenized payment failed at Moyasar',
            metadata: {
              ...payment.metadata,
              moyasar_failure: moyasarPayment.source
            }
          }, { transaction });
        } else {
          await payment.markAsFailed(
            moyasarPayment.source?.message || 'Tokenized payment failed at Moyasar'
          );
        }

        logger.warn('Tokenized payment failed at Moyasar', {
          paymentId: payment.public_id,
          moyasarPaymentId: moyasarPayment.id,
          reason: moyasarPayment.source?.message
        });

        return {
          success: false,
          payment,
          moyasarPayment,
          error: moyasarPayment.source?.message
        };
      }

      // Unknown status (shouldn't happen with tokens)
      logger.warn('Unexpected status for tokenized payment', {
        paymentId: payment.public_id,
        moyasarPaymentId: moyasarPayment.id,
        status: moyasarPayment.status
      });

      return {
        success: false,
        payment,
        moyasarPayment
      };

    } catch (error) {
      logger.error('Failed to create tokenized Moyasar payment', {
        businessId,
        subscriptionId,
        amount,
        error: error.message,
        stack: error.stack,
        moyasarError: error.response?.data
      });

      throw this.handleMoyasarError(error);
    }
  }

  /**
   * Fetch payment details from Moyasar API without database lookups
   * Helper method for callback endpoint to get payment metadata
   * @param {string} moyasarPaymentId - Moyasar payment ID
   * @returns {Promise<object>} Moyasar payment object with metadata
   * @throws {Error} If payment not found or API error occurs
   */
  static async fetchPaymentFromMoyasar(moyasarPaymentId) {
    logger.debug('Fetching payment from Moyasar API', { moyasarPaymentId })

    try {
      // FIXED: Use MOYASAR_API_BASE_URL constant for consistency
      const response = await axios.get(
        `${this.MOYASAR_API_BASE_URL}/payments/${moyasarPaymentId}`,
        { headers: this.getAuthHeaders() }
      )

      logger.debug('Payment fetched from Moyasar', {
        moyasarPaymentId,
        status: response.data.status,
        amount: response.data.amount,
        hasMetadata: !!response.data.metadata
      })

      return response.data
    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn('Payment not found on Moyasar', { moyasarPaymentId })
        throw new Error('MOYASAR_PAYMENT_NOT_FOUND')
      }
      
      logger.error('Error fetching payment from Moyasar', {
        moyasarPaymentId,
        error: error.message,
        status: error.response?.status
      })
      
      // FIXED: Actually throw the formatted error so caller can catch it
      throw this.handleMoyasarError(error)
    }
  }

  /**
   * Pure verification logic - reads Moyasar and DB state without mutations
   * Used by both production payment flow and read-only debug endpoint
   * @param {string} moyasarPaymentId - Moyasar payment ID (pay_xxx)
   * @returns {Promise<Object>} Verification result with verified flag, payment, moyasarPayment, issues, verificationDetails
   * @throws {Error} If verification request fails
   * @private
   */
  static async getVerificationResult(moyasarPaymentId) {
    if (!moyasarPaymentId) {
      throw new Error('moyasarPaymentId is required for payment verification');
    }

    logger.debug('Fetching verification result (read-only, no side effects)', { moyasarPaymentId });

    // Fetch payment from Moyasar API
    const response = await axios.get(
      `${this.MOYASAR_API_BASE_URL}/payments/${moyasarPaymentId}`,
      {
        headers: this.getAuthHeaders(),
        timeout: 10000
      }
    );

    const moyasarPayment = response.data;

      // Detailed logging of Moyasar response
      logger.debug('Moyasar payment fetched - full details', {
        moyasarPaymentId,
        status: moyasarPayment.status,
        amount: moyasarPayment.amount,
        amountInHalalas: moyasarPayment.amount,
        amountInSAR: this.convertToSAR(moyasarPayment.amount),
        currency: moyasarPayment.currency,
        source: moyasarPayment.source ? {
          type: moyasarPayment.source.type,
          company: moyasarPayment.source.company,
          last4: moyasarPayment.source.last4?.substring(0, 4) + '****' // Masked
        } : null,
        createdAt: moyasarPayment.created_at
      });

      // Fetch payment from our database
      let payment = await Payment.findOne({
        where: { moyasar_payment_id: moyasarPaymentId }
      });

      // FIXED: Add fallback lookup path if primary lookup fails
      // Check both snake_case (backend standard) and camelCase (frontend standard)
      const sessionId = moyasarPayment.metadata?.session_id || moyasarPayment.metadata?.sessionId;

      if (!payment && sessionId) {
        logger.info('Primary lookup failed, attempting fallback by session_id', {
          moyasarPaymentId,
          sessionId
        });
        
        const { Sequelize } = await import('sequelize');
        payment = await Payment.findOne({
          where: {
            [Sequelize.Op.and]: [
              Sequelize.where(
                Sequelize.json('metadata.session_id'),
                sessionId
              )
            ]
          }
        });
        
        if (payment) {
          logger.info('Payment found via fallback lookup, linking Moyasar payment ID', {
            paymentId: payment.public_id,
            moyasarPaymentId
          });
          
          // Link the Moyasar payment ID for future lookups
          await payment.update({ moyasar_payment_id: moyasarPaymentId });
        }
      }

      if (!payment) {
        logger.warn('Payment not found in database - check if payment was created during checkout', {
          moyasarPaymentId,
          searchedBy: 'moyasar_payment_id and fallback session_id',
          suggestion: 'Verify payment record exists before Moyasar redirect'
        });
        
        return {
          verified: false,
          moyasarPayment,
          payment: null,
          issues: ['Payment record not found in database']
        };
      }

      const issues = [];

      // Verify payment status
      if (moyasarPayment.status !== 'paid') {
        issues.push(`Payment status is ${moyasarPayment.status}, expected 'paid'`);
        logger.warn('Payment status mismatch', {
          moyasarPaymentId,
          status: moyasarPayment.status
        });
      }

      // Verify amount (convert Moyasar amount to SAR) with tolerance for floating-point precision
      const expectedAmountSAR = payment.amount;
      const actualAmountSAR = this.convertToSAR(moyasarPayment.amount);
      const amountDifference = Math.abs(actualAmountSAR - expectedAmountSAR);
      const AMOUNT_TOLERANCE = 0.01; // Allow 1 halala tolerance for rounding
      
      logger.debug('Amount verification', {
        moyasarPaymentId,
        expectedSAR: expectedAmountSAR,
        actualSAR: actualAmountSAR,
        difference: amountDifference,
        tolerance: AMOUNT_TOLERANCE,
        moyasarHalalas: moyasarPayment.amount,
        match: amountDifference <= AMOUNT_TOLERANCE
      });
      
      if (amountDifference > AMOUNT_TOLERANCE) {
        issues.push(`Amount mismatch: expected ${expectedAmountSAR} SAR, got ${actualAmountSAR} SAR (difference: ${amountDifference.toFixed(2)} SAR)`);
        logger.warn('Payment amount mismatch exceeds tolerance', {
          moyasarPaymentId,
          expected: expectedAmountSAR,
          actual: actualAmountSAR,
          difference: amountDifference,
          tolerance: AMOUNT_TOLERANCE
        });
      }

      // Verify currency
      if (moyasarPayment.currency !== payment.currency) {
        issues.push(`Currency mismatch: expected ${payment.currency}, got ${moyasarPayment.currency}`);
        logger.warn('Payment currency mismatch', {
          moyasarPaymentId,
          expected: payment.currency,
          actual: moyasarPayment.currency
        });
      }

      // Verification summary
      const statusMatch = moyasarPayment.status === 'paid';
      const amountMatch = Math.abs(actualAmountSAR - expectedAmountSAR) <= 0.01;
      const currencyMatch = moyasarPayment.currency === payment.currency;
      
      logger.info('Payment verification summary', {
        moyasarPaymentId,
        paymentId: payment.public_id,
        statusMatch,
        amountMatch,
        currencyMatch,
        issuesCount: issues.length,
        finalVerified: issues.length === 0 && statusMatch
      });
      
      // Note: Test cards may have slight timing delays or status transitions
      // Status 'initiated' or 'authorized' indicates incomplete payment processing
      if (moyasarPayment.status === 'initiated' || moyasarPayment.status === 'authorized') {
        logger.debug('Payment in transitional state - may need retry', {
          moyasarPaymentId,
          status: moyasarPayment.status,
          note: 'Test cards may take a few seconds to reach paid status'
        });
      }
      
      // Create verification details object
      const verificationDetails = {
        statusMatch,
        amountMatch,
        currencyMatch,
        amountDifference: Math.abs(actualAmountSAR - expectedAmountSAR),
        expectedAmount: expectedAmountSAR,
        actualAmount: actualAmountSAR,
        expectedCurrency: payment.currency,
        actualCurrency: moyasarPayment.currency,
        expectedStatus: 'paid',
        actualStatus: moyasarPayment.status
      };

      // Determine verification status (no mutations in this pure function)
      const verified = issues.length === 0 && moyasarPayment.status === 'paid';
      
      // Log verification result
      if (verified) {
        logger.info('Payment verification successful (no mutations applied)', {
          paymentId: payment.public_id,
          moyasarPaymentId
        });
        
        return {
          verified: true,
          payment,
          moyasarPayment,
          issues: [],
          verificationDetails
        };
      } else if (moyasarPayment.status === 'failed') {
        logger.warn('Payment failed at Moyasar (no mutations applied)', {
          paymentId: payment.public_id,
          moyasarPaymentId,
          reason: moyasarPayment.source?.message
        });

        return {
          verified: false,
          payment,
          moyasarPayment,
          issues: ['Payment failed at Moyasar', ...issues],
          verificationDetails
        };
      } else {
        // Verification failed or status is not final
        // CRITICAL: Check if Moyasar says paid but validation failed
        if (moyasarPayment.status === 'paid' && issues.length > 0) {
          logger.error('CRITICAL: Moyasar confirmed payment as PAID but verification failed due to data mismatches', {
            paymentId: payment.public_id,
            moyasarPaymentId,
            issues,
            verificationDetails,
            action: 'MANUAL_REVIEW_REQUIRED'
          });
        }
        
        logger.warn('Payment verification failed', {
          paymentId: payment.public_id,
          moyasarPaymentId,
          issues,
          verificationDetails
        });

        return {
          verified: false,
          payment,
          moyasarPayment,
          issues,
          verificationDetails
        };
      }
  }

  /**
   * Verify a payment and apply side effects (update payment status)
   * Used after 3DS redirect or to check payment status in production flow
   * @param {string} moyasarPaymentId - Moyasar payment ID (pay_xxx)
   * @returns {Promise<Object>} Verification result with payment details
   * @throws {Error} If verification fails
   */
  static async verifyPayment(moyasarPaymentId) {
    if (!moyasarPaymentId) {
      throw new Error('moyasarPaymentId is required for payment verification');
    }

    logger.debug('Verifying Moyasar payment (with side effects)', { moyasarPaymentId });

    try {
      // Get pure verification result without mutations
      const verificationResult = await this.getVerificationResult(moyasarPaymentId);
      
      const { verified, payment, moyasarPayment, issues, verificationDetails } = verificationResult;

      // Apply side effects based on verification result
      if (verified && payment) {
        // Payment verified successfully - moyasar_payment_id already set, so pass null
        await payment.markAsPaid(null, null);

        // Separately update metadata to preserve existing keys
        await payment.update({
          metadata: {
            ...payment.metadata,
            transaction_id: moyasarPayment.id,
            moyasar_created_at: moyasarPayment.created_at,
            verification_metadata: moyasarPayment
          }
        });

        logger.info('Payment verified and marked as paid', {
          paymentId: payment.public_id,
          moyasarPaymentId
        });

        return {
          verified: true,
          payment,
          moyasarPayment,
          issues: [],
          verificationDetails
        };
      } else if (moyasarPayment?.status === 'failed' && payment) {
        // Payment failed
        await payment.markAsFailed(
          moyasarPayment.source?.message || 'Payment failed at Moyasar'
        );

        logger.warn('Payment verification failed - payment failed at Moyasar', {
          paymentId: payment.public_id,
          moyasarPaymentId,
          reason: moyasarPayment.source?.message
        });

        return {
          verified: false,
          payment,
          moyasarPayment,
          issues: ['Payment failed at Moyasar', ...issues],
          verificationDetails
        };
      } else {
        // Verification failed - no mutations applied
        return verificationResult;
      }

    } catch (error) {
      logger.error('Failed to verify Moyasar payment', {
        moyasarPaymentId,
        error: error.message,
        stack: error.stack,
        moyasarError: error.response?.data
      });

      throw this.handleMoyasarError(error);
    }
  }

  /**
   * Process full or partial refund for a payment
   * @param {string} moyasarPaymentId - Moyasar payment ID
   * @param {Object} refundData - Refund details
   * @param {number} [refundData.amount] - Partial refund amount in SAR (optional, full refund if not provided)
   * @param {string} [refundData.description] - Refund reason/description
   * @returns {Promise<Object>} Refund result with success status
   * @throws {Error} If refund fails
   */
  static async refundPayment(moyasarPaymentId, refundData = {}) {
    if (!moyasarPaymentId) {
      throw new Error('moyasarPaymentId is required for refund');
    }

    const { amount, description } = refundData;

    logger.debug('Processing Moyasar refund', {
      moyasarPaymentId,
      amount,
      description
    });

    try {
      // Fetch payment from database
      const payment = await Payment.findOne({
        where: { moyasar_payment_id: moyasarPaymentId }
      });

      if (!payment) {
        throw new Error(`Payment not found with Moyasar ID: ${moyasarPaymentId}`);
      }

      // Validate payment is eligible for refund
      if (payment.status !== 'paid') {
        throw new Error(`Payment is not in 'paid' status. Current status: ${payment.status}`);
      }

      // Check if already refunded
      if (payment.refund_amount && payment.refund_amount >= payment.amount) {
        throw new Error('Payment has already been fully refunded');
      }

      // Calculate refund amount
      let refundAmountSAR;
      let refundAmountHalalas;

      if (amount) {
        // Partial refund
        refundAmountSAR = amount;
        
        // Validate partial refund amount
        const remainingAmount = payment.amount - (payment.refund_amount || 0);
        if (refundAmountSAR > remainingAmount) {
          throw new Error(`Refund amount ${refundAmountSAR} SAR exceeds remaining amount ${remainingAmount} SAR`);
        }
        
        refundAmountHalalas = this.convertToHalalas(refundAmountSAR);
      } else {
        // Full refund
        refundAmountSAR = payment.amount - (payment.refund_amount || 0);
        refundAmountHalalas = null; // Moyasar treats null as full refund
      }

      logger.debug('Refund amount calculated', {
        paymentId: payment.public_id,
        refundAmountSAR,
        refundAmountHalalas,
        originalAmount: payment.amount,
        previouslyRefunded: payment.refund_amount || 0
      });

      // Prepare Moyasar API request
      const refundPayload = {
        description: description || 'Refund processed'
      };

      // Add amount only for partial refunds
      if (refundAmountHalalas !== null) {
        refundPayload.amount = refundAmountHalalas;
      }

      // Make API request to Moyasar
      const response = await axios.post(
        `${this.MOYASAR_API_BASE_URL}/payments/${moyasarPaymentId}/refund`,
        refundPayload,
        {
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      const moyasarResponse = response.data;

      logger.info('Moyasar refund processed', {
        moyasarPaymentId,
        refundId: moyasarResponse.id,
        refundedAmount: moyasarResponse.refunded,
        status: moyasarResponse.refunded_at ? 'refunded' : 'pending'
      });

      // Update payment record with refund amount
      await payment.processRefund(refundAmountSAR);

      // Update metadata with additional refund details
      await payment.update({
        metadata: {
          ...payment.metadata,
          moyasar_refund_id: moyasarResponse.id,
          refund_description: description,
          moyasar_refunded_at: moyasarResponse.refunded_at,
          moyasar_refund_response: moyasarResponse
        }
      });

      logger.info('Payment refund completed', {
        paymentId: payment.public_id,
        moyasarPaymentId,
        refundedAmount: refundAmountSAR,
        totalRefunded: payment.refund_amount
      });

      return {
        success: true,
        payment,
        refund: {
          amount: refundAmountSAR,
          currency: payment.currency,
          description,
          refundedAt: moyasarResponse.refunded_at
        },
        moyasarResponse
      };

    } catch (error) {
      logger.error('Failed to process Moyasar refund', {
        moyasarPaymentId,
        amount,
        error: error.message,
        stack: error.stack,
        moyasarError: error.response?.data
      });

      throw this.handleMoyasarError(error);
    }
  }

  /**
   * Parse and format Moyasar API errors
   * Extracts relevant error information from Axios errors
   * @param {Error} error - Original error object
   * @returns {Error} Formatted error with Moyasar details
   */
  static handleMoyasarError(error) {
    // Check if it's an Axios error with response
    if (error.response && error.response.data) {
      const moyasarError = error.response.data;
      
      // Extract Moyasar error details
      const errorMessage = moyasarError.message || 'Unknown Moyasar error';
      const errorType = moyasarError.type || 'moyasar_error';
      const errorCode = error.response.status;

      logger.error('Moyasar API error', {
        message: errorMessage,
        type: errorType,
        code: errorCode,
        details: moyasarError
      });

      // Check for authentication errors (401)
      if (errorCode === 401 || 
          errorMessage.toLowerCase().includes('authentication') || 
          errorMessage.toLowerCase().includes('api key')) {
        const authError = new Error('Invalid Moyasar API credentials. Check MOYASAR_SECRET_KEY.');
        authError.type = 'authentication_error';
        authError.code = errorCode;
        authError.originalError = error;
        return authError;
      }

      // Create formatted error
      const formattedError = new Error(`Moyasar Error: ${errorMessage}`);
      formattedError.type = errorType;
      formattedError.code = errorCode;
      formattedError.moyasarError = moyasarError;
      formattedError.originalError = error;

      return formattedError;
    }

    // Network or other error
    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error('Moyasar API request timeout');
      timeoutError.type = 'timeout_error';
      timeoutError.originalError = error;
      
      logger.error('Moyasar API timeout', { error: error.message });
      
      return timeoutError;
    }

    // Generic error
    logger.error('Moyasar service error', {
      message: error.message,
      stack: error.stack
    });

    return error;
  }
}

export default MoyasarService;
