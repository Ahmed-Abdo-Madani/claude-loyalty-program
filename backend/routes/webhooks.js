/**
 * Moyasar Webhook Routes
 * 
 * Handles real-time payment notifications from Moyasar payment gateway
 * Implements HMAC-SHA256 signature verification and idempotency checks
 * 
 * Webhook Events:
 * - payment.paid: Payment successfully completed
 * - payment.failed: Payment declined or failed
 * - payment.refunded: Payment refunded (full or partial)
 * - payment.authorized: Payment pre-authorized (optional)
 * - payment.captured: Payment captured after authorization (optional)
 * 
 * Security:
 * - No authentication middleware (webhooks come from Moyasar servers)
 * - Signature verification using HMAC-SHA256 is the authentication mechanism
 * - Idempotency checks prevent duplicate processing
 * - Rate limiting applied at server level
 */

import express from 'express'
import crypto from 'crypto'
import logger from '../config/logger.js'
import WebhookLog from '../models/WebhookLog.js'
import Payment from '../models/Payment.js'
import Subscription from '../models/Subscription.js'
import Business from '../models/Business.js'
import SubscriptionService from '../services/SubscriptionService.js'
import NotificationLog from '../models/NotificationLog.js'
import { Resend } from 'resend'

const router = express.Router()

// Initialize Resend for webhook verification
// Note: EmailService handles the primary API instance for sending emails
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Verify Moyasar webhook signature using HMAC-SHA256
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from x-moyasar-signature header
 * @param {string} secret - MOYASAR_WEBHOOK_SECRET
 * @returns {boolean} - Whether signature is valid
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false
  }

  try {
    // Compute HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    logger.error('Webhook signature verification error', { error: error.message })
    return false
  }
}

/**
 * Parse webhook payload from raw body buffer
 * @param {Buffer|string} rawBody - Raw request body
 * @returns {object} - Parsed JSON payload
 */
function parseWebhookPayload(rawBody) {
  try {
    // Convert buffer to string if needed
    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody
    return JSON.parse(bodyString)
  } catch (error) {
    logger.error('Webhook payload parsing error', { error: error.message })
    throw new Error('Invalid JSON payload')
  }
}

/**
 * ENDPOINT: Moyasar Webhook Handler
 * POST /moyasar
 * 
 * Receives webhook events from Moyasar payment gateway
 * No authentication middleware - uses signature verification
 */
router.post('/moyasar', async (req, res) => {
  let webhookLog = null

  try {
    // =================================================================
    // 1. Extract webhook signature and verify
    // =================================================================
    const signature = req.headers['x-moyasar-signature']
    const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET

    if (!webhookSecret) {
      logger.error('❌ MOYASAR_WEBHOOK_SECRET not configured')
      return res.status(500).json({
        received: false,
        error: 'Webhook secret not configured'
      })
    }

    // Get raw body for signature verification
    const rawBody = req.body
    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody)

    // Verify signature
    const isValidSignature = verifyWebhookSignature(bodyString, signature, webhookSecret)


    if (!isValidSignature) {
      logger.warn('⚠️ Webhook signature verification failed', {
        signature: signature ? signature.substring(0, 16) + '...' : 'missing',
        hasSecret: !!webhookSecret
      })

      // Attempt to parse eventId and eventType for logging
      let parsedPayload = null;
      let eventId = null;
      let eventType = null;
      try {
        const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody);
        parsedPayload = JSON.parse(bodyString);
        eventId = parsedPayload.id || null;
        eventType = parsedPayload.type || 'other';
      } catch (e) {
        // If parsing fails, log as much as possible
        parsedPayload = rawBody;
        eventType = 'other';
      }

      // Log invalid signature webhook
      try {
        const log = await WebhookLog.logWebhook(
          eventId,
          eventType,
          parsedPayload,
          signature,
          false // signature_verified
        );
        await log.markAsFailed('Invalid signature');
        logger.info('🚫 Webhook with invalid signature logged', { logId: log.public_id, eventId, eventType });
      } catch (logErr) {
        logger.error('Failed to log invalid-signature webhook', { error: logErr.message });
      }

      return res.status(401).json({
        received: false,
        error: 'Invalid signature'
      })
    }

    logger.info('✅ Webhook signature verified')

    // =================================================================
    // 2. Parse webhook payload
    // =================================================================
    const payload = parseWebhookPayload(rawBody)
    const eventId = payload.id
    const eventType = payload.type
    const eventData = payload.data

    // Validate id and type fields
    if (typeof eventId !== 'string' || typeof eventType !== 'string' || !eventId || !eventType) {
      logger.warn('⚠️ Webhook payload missing or invalid id/type', { eventId, eventType })
      // Log as failed in WebhookLog
      try {
        const failedLog = await WebhookLog.logWebhook(
          eventId || null,
          eventType || 'other',
          payload,
          signature,
          true // signature_verified (signature was valid)
        );
        await failedLog.markAsFailed('Missing or invalid id/type in webhook payload');
        logger.info('🚫 Webhook with invalid id/type logged', { logId: failedLog.public_id, eventId, eventType });
      } catch (logErr) {
        logger.error('Failed to log invalid-id/type webhook', { error: logErr.message });
      }
      return res.status(400).json({
        received: false,
        error: 'Missing or invalid id/type in webhook payload'
      });
    }

    logger.info('📥 Moyasar webhook received', {
      eventId,
      eventType,
      paymentId: eventData?.id
    })

    // =================================================================
    // 3. Idempotency check - prevent duplicate processing
    // =================================================================
    const existingLog = await WebhookLog.findByEventId(eventId)

    if (existingLog) {
      logger.info('⚠️ Duplicate webhook event detected', {
        eventId,
        status: existingLog.status,
        processedAt: existingLog.processed_at
      })

      await existingLog.markAsDuplicate()

      return res.status(200).json({
        received: true,
        duplicate: true,
        message: 'Event already processed'
      })
    }

    // =================================================================
    // 4. Create webhook log entry
    // =================================================================
    webhookLog = await WebhookLog.logWebhook(
      eventId,
      eventType,
      payload,
      signature,
      true // signature verified
    )

    logger.info('✅ Webhook log created', { logId: webhookLog.public_id })

    // =================================================================
    // 5. Find associated payment record
    // =================================================================
    const moyasarPaymentId = eventData?.id

    if (!moyasarPaymentId) {
      logger.warn('⚠️ Webhook payload missing payment ID', { eventId, eventType })
      await webhookLog.markAsFailed('Payment ID not found in webhook payload')
      return res.status(200).json({
        received: true,
        processed: false,
        error: 'Payment ID missing'
      })
    }

    const payment = await Payment.findOne({
      where: { moyasar_payment_id: moyasarPaymentId }
    })

    if (!payment) {
      logger.warn('⚠️ Payment record not found', {
        moyasarPaymentId,
        eventId,
        eventType
      })
      await webhookLog.markAsFailed('Payment record not found in database')
      // Return 200 OK to acknowledge receipt (payment may not exist yet)
      return res.status(200).json({
        received: true,
        processed: false,
        error: 'Payment not found'
      })
    }

    // Update webhook log with payment reference
    webhookLog.payment_id = payment.public_id
    await webhookLog.save()

    logger.info('✅ Payment record found', {
      paymentId: payment.public_id,
      businessId: payment.business_id,
      subscriptionId: payment.subscription_id
    })

    // =================================================================
    // 6. Process webhook event based on type
    // =================================================================
    let processingResult = { success: false, message: 'Unknown event type' }

    switch (eventType) {
      case 'payment.paid':
        processingResult = await handlePaymentPaid(payment, eventData, webhookLog)
        break

      case 'payment.failed':
        processingResult = await handlePaymentFailed(payment, eventData, webhookLog)
        break

      case 'payment.refunded':
        processingResult = await handlePaymentRefunded(payment, eventData, webhookLog)
        break

      case 'payment.authorized':
        processingResult = await handlePaymentAuthorized(payment, eventData, webhookLog)
        break

      case 'payment.captured':
        processingResult = await handlePaymentCaptured(payment, eventData, webhookLog)
        break

      default:
        logger.warn('⚠️ Unhandled webhook event type', { eventType, eventId })
        processingResult = { success: true, message: 'Event type not handled' }
    }

    // =================================================================
    // 7. Update webhook log status
    // =================================================================
    if (processingResult.success) {
      await webhookLog.markAsProcessed()
      logger.info('✅ Webhook processed successfully', {
        eventId,
        eventType,
        paymentId: payment.public_id,
        result: processingResult.message
      })
    } else {
      await webhookLog.markAsFailed(processingResult.error || 'Processing failed')
      logger.error('❌ Webhook processing failed', {
        eventId,
        eventType,
        error: processingResult.error
      })
    }

    // =================================================================
    // 8. Return 200 OK (Moyasar expects 200 for successful receipt)
    // =================================================================
    return res.status(200).json({
      received: true,
      processed: processingResult.success,
      message: processingResult.message || 'Webhook processed'
    })

  } catch (error) {
    logger.error('❌ Webhook handler error', {
      error: error.message,
      stack: error.stack
    })

    // Update webhook log if available
    if (webhookLog) {
      try {
        await webhookLog.markAsFailed(error.message)
      } catch (logError) {
        logger.error('Failed to update webhook log', { error: logError.message })
      }
    }

    // Return 200 OK even on error to prevent Moyasar retries for unrecoverable errors
    return res.status(200).json({
      received: true,
      processed: false,
      error: 'Internal processing error'
    })
  }
})

/**
 * Handle payment.paid event
 * Activates subscription and generates invoice
 */
async function handlePaymentPaid(payment, eventData, webhookLog) {
  try {
    logger.info('💰 Processing payment.paid event', {
      paymentId: payment.public_id
    })

    // Mark payment as paid
    await payment.markAsPaid(eventData.id, {
      payment_method: eventData.source?.type,
      card_last4: eventData.source?.message,
      moyasar_response: eventData
    })

    // Find associated subscription
    const subscription = await Subscription.findOne({
      where: { public_id: payment.subscription_id }
    })

    if (!subscription) {
      logger.warn('⚠️ No subscription found for payment', {
        paymentId: payment.public_id
      })
      return {
        success: true,
        message: 'Payment marked as paid, but no subscription found'
      }
    }

    // Activate subscription using SubscriptionService
    const activationResult = await SubscriptionService.activateSubscriptionFromPayment(
      payment,
      eventData
    )

    if (!activationResult.success) {
      return {
        success: false,
        error: activationResult.error || 'Failed to activate subscription'
      }
    }

    logger.info('✅ Subscription activated', {
      subscriptionId: subscription.public_id,
      businessId: subscription.business_id
    })

    return {
      success: true,
      message: 'Payment completed and subscription activated',
      subscription: activationResult.subscription,
      invoice: activationResult.invoice
    }

  } catch (error) {
    logger.error('❌ Error handling payment.paid', {
      error: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}

/**
 * Handle payment.failed event
 * Implements retry logic and grace period
 */
async function handlePaymentFailed(payment, eventData, webhookLog) {
  try {
    logger.info('⚠️ Processing payment.failed event', {
      paymentId: payment.public_id
    })

    // Extract failure reason
    const failureReason = eventData.message || eventData.error?.message || 'Payment declined'

    // Mark payment as failed
    await payment.markAsFailed(failureReason)

    // Handle failure using SubscriptionService
    const failureResult = await SubscriptionService.handlePaymentFailureFromWebhook(
      payment,
      failureReason
    )

    if (!failureResult.success) {
      return {
        success: false,
        error: failureResult.error || 'Failed to handle payment failure'
      }
    }

    logger.info('✅ Payment failure handled', {
      paymentId: payment.public_id,
      action: failureResult.action,
      retryCount: failureResult.retryCount
    })

    return {
      success: true,
      message: `Payment failure handled: ${failureResult.action}`,
      action: failureResult.action,
      retryCount: failureResult.retryCount
    }

  } catch (error) {
    logger.error('❌ Error handling payment.failed', {
      error: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}

/**
 * Handle payment.refunded event
 * Processes refunds and cancels subscription if full refund
 */
async function handlePaymentRefunded(payment, eventData, webhookLog) {
  try {
    logger.info('💸 Processing payment.refunded event', {
      paymentId: payment.public_id
    })

    // Extract refund amount
    const refundAmount = eventData.refunded_amount || eventData.amount || 0

    // Process refund using SubscriptionService
    const refundResult = await SubscriptionService.handleRefundFromWebhook(
      payment,
      refundAmount
    )

    if (!refundResult.success) {
      return {
        success: false,
        error: refundResult.error || 'Failed to process refund'
      }
    }

    logger.info('✅ Refund processed', {
      paymentId: payment.public_id,
      refundAmount,
      fullRefund: refundResult.fullRefund
    })

    return {
      success: true,
      message: `Refund processed: ${refundResult.fullRefund ? 'full' : 'partial'}`,
      refundAmount,
      fullRefund: refundResult.fullRefund
    }

  } catch (error) {
    logger.error('❌ Error handling payment.refunded', {
      error: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}

/**
 * Handle payment.authorized event (optional)
 * Payment pre-authorized but not yet captured
 */
async function handlePaymentAuthorized(payment, eventData, webhookLog) {
  try {
    logger.info('🔒 Processing payment.authorized event', {
      paymentId: payment.public_id
    })

    // Update payment metadata with authorization info
    payment.metadata = {
      ...payment.metadata,
      authorized_at: new Date().toISOString(),
      authorization_code: eventData.authorization_code,
      moyasar_response: eventData
    }
    await payment.save()

    logger.info('✅ Payment authorization recorded', {
      paymentId: payment.public_id
    })

    return {
      success: true,
      message: 'Payment authorization recorded'
    }

  } catch (error) {
    logger.error('❌ Error handling payment.authorized', {
      error: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}

/**
 * Handle payment.captured event (optional)
 * Payment captured after authorization
 */
async function handlePaymentCaptured(payment, eventData, webhookLog) {
  try {
    logger.info('✅ Processing payment.captured event', {
      paymentId: payment.public_id
    })

    // Mark payment as paid (captured = paid)
    await payment.markAsPaid(eventData.id, {
      captured_at: new Date().toISOString(),
      payment_method: eventData.source?.type,
      moyasar_response: eventData
    })

    // Activate subscription (same as payment.paid)
    const subscription = await Subscription.findOne({
      where: { public_id: payment.subscription_id }
    })

    if (subscription) {
      const activationResult = await SubscriptionService.activateSubscriptionFromPayment(
        payment,
        eventData
      )

      if (activationResult.success) {
        logger.info('✅ Subscription activated after capture', {
          subscriptionId: subscription.public_id
        })
      }
    }

    return {
      success: true,
      message: 'Payment captured and subscription activated'
    }

  } catch (error) {
    logger.error('❌ Error handling payment.captured', {
      error: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}

// ========================================
// RESEND WEBHOOK HANDLER
// ========================================

/**
 * Verify Resend webhook signature using Resend SDK
 * Uses existing Resend instance or creates one for verification
 */
const verifyResendWebhookSignature = (payload, headers, secret) => {
  try {
    const evt = resend.webhooks.verify({
      payload: (Buffer.isBuffer(payload) || typeof payload === 'string') ? payload : JSON.stringify(payload),
      headers,
      webhookSecret: secret,
    })
    return evt
  } catch (err) {
    throw new Error(`Webhook verification failed: ${err.message}`)
  }
}

/**
 * Resend Webhook Endpoint
 * Path: POST /api/webhooks/resend
 */
router.post('/resend', async (req, res) => {
  const payload = req.body
  const headers = req.headers
  const secret = process.env.RESEND_WEBHOOK_SECRET

  // 1. Validation
  if (!secret) {
    logger.error('RESEND_WEBHOOK_SECRET is not configured')
    return res.status(500).json({ error: 'Webhook configuration error' })
  }

  // 2. Verification
  let event
  try {
    // Extract Svix headers
    const svixHeaders = {
      'svix-id': headers['svix-id'],
      'svix-timestamp': headers['svix-timestamp'],
      'svix-signature': headers['svix-signature'],
    }

    // Verify signature
    // Note: req.body must be raw buffer for verification
    event = verifyResendWebhookSignature(payload, svixHeaders, secret)

  } catch (err) {
    logger.warn('Resend webhook signature verification failed', {
      error: err.message,
      ip: req.ip
    })
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // 3. Idempotency Check
  const { type, data } = event
  const emailId = data.email_id

  if (emailId) {
    try {
      // Check if we've already processed this event or if the state is already final
      // Note: We update the same log entry for different events (sent -> delivered -> opened)
      // So we don't return "duplicate" just because the log exists, but we rely on
      // the event handlers to apply state transitions correctly.
    } catch (err) {
      logger.error('Error checking duplicate webhook', { error: err.message })
    }
  }

  logger.info(`Received Resend webhook: ${type}`, { email_id: emailId })

  // 4. Acknowledge Receipt Immediately
  // We return 200 OK to prevent Resend from retrying while we process
  res.status(200).json({ received: true })

  // 5. Async Processing
  // Process in background to keep response fast
  try {
    switch (type) {
      case 'email.sent':
        await handleEmailSent(data)
        break
      case 'email.delivered':
        await handleEmailDelivered(data)
        break
      case 'email.bounced':
        await handleEmailBounced(data)
        break
      case 'email.opened':
        await handleEmailOpened(data)
        break
      case 'email.clicked':
        await handleEmailClicked(data)
        break
      case 'email.complained':
        await handleEmailComplained(data)
        break
      default:
        logger.info(`Unhandled Resend event type: ${type}`)
    }
  } catch (error) {
    logger.error(`Error processing Resend webhook event ${type}`, {
      email_id: emailId,
      error: error.message
    })
    // No need to return error response as we already sent 200 OK
  }
})

// ----------------------------------------
// Event Handlers
// ----------------------------------------

async function handleEmailSent(data) {
  try {
    const emailId = data.email_id
    if (!emailId) return

    const logEntry = await NotificationLog.findOne({ where: { external_id: emailId } })
    if (!logEntry) {
      logger.warn(`Notification log not found for sent event: ${emailId}`)
      return
    }

    await logEntry.markAsSent(emailId, 'resend')
    logger.info(`Email marked as sent: ${emailId}`)
  } catch (error) {
    throw error
  }
}

async function handleEmailDelivered(data) {
  try {
    const emailId = data.email_id
    if (!emailId) return

    const logEntry = await NotificationLog.findOne({ where: { external_id: emailId } })
    if (!logEntry) {
      logger.warn(`Notification log not found for delivered event: ${emailId}`)
      return
    }

    await logEntry.markAsDelivered(new Date(data.created_at))
    logger.info(`Email marked as delivered: ${emailId}`)
  } catch (error) {
    throw error
  }
}

async function handleEmailBounced(data) {
  try {
    const emailId = data.email_id
    if (!emailId) return

    const logEntry = await NotificationLog.findOne({ where: { external_id: emailId } })
    if (!logEntry) {
      logger.warn(`Notification log not found for bounced event: ${emailId}`)
      return
    }

    const bounceType = data.bounce?.type || 'unknown'
    const bounceMessage = data.bounce?.message || 'Email bounced'
    const errorMessage = `Bounced (${bounceType}): ${bounceMessage}`

    await logEntry.markAsFailed(errorMessage, 'bounced')

    // Explicitly update external_status to bounced if not handled by markAsFailed
    logEntry.external_status = 'bounced'
    await logEntry.save()

    logger.info(`Email marked as bounced: ${emailId}`)
  } catch (error) {
    throw error
  }
}

async function handleEmailOpened(data) {
  try {
    const emailId = data.email_id
    if (!emailId) return

    const logEntry = await NotificationLog.findOne({ where: { external_id: emailId } })
    if (!logEntry) {
      logger.warn(`Notification log not found for opened event: ${emailId}`)
      return
    }

    // Extract device info if available
    const userAgent = data.user_agent
    // Resend doesn't always provide device type explicitly, can implement parser if needed
    // For now passing null for deviceType

    await logEntry.markAsOpened(new Date(data.created_at), null, userAgent)
    logger.info(`Email marked as opened: ${emailId}`)
  } catch (error) {
    throw error
  }
}

async function handleEmailClicked(data) {
  try {
    const emailId = data.email_id
    if (!emailId) return

    const logEntry = await NotificationLog.findOne({ where: { external_id: emailId } })
    if (!logEntry) {
      logger.warn(`Notification log not found for clicked event: ${emailId}`)
      return
    }

    const clickData = {
      link: data.link,
      clicked_at: data.created_at,
      user_agent: data.user_agent
    }

    await logEntry.markAsClicked(clickData)
    logger.info(`Email marked as clicked: ${emailId}`)
  } catch (error) {
    throw error
  }
}

async function handleEmailComplained(data) {
  try {
    const emailId = data.email_id
    if (!emailId) return

    const logEntry = await NotificationLog.findOne({ where: { external_id: emailId } })
    if (!logEntry) {
      logger.warn(`Notification log not found for complained event: ${emailId}`)
      return
    }

    const feedbackType = data.complaint?.complaintFeedbackType || 'spam'

    // Use markAsComplained if available, otherwise markAsFailed
    if (typeof logEntry.markAsComplained === 'function') {
      await logEntry.markAsComplained()
    } else {
      await logEntry.markAsFailed(`Recipient reported as ${feedbackType}`, 'complained')
      logEntry.external_status = 'complained'
      await logEntry.save()
    }

    // TODO: Update customer preferences to unsubscribe (future enhancement)

    logger.info(`Email marked as complained: ${emailId}`)
  } catch (error) {
    throw error
  }
}


export default router
