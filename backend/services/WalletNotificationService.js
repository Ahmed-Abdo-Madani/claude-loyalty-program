/**
 * Wallet Notification Service
 *
 * High-level service for sending push notifications with visible lock-screen alerts
 * 
 * Apple Wallet: Messages appear on pass front (auxiliaryFields) and back (backFields) following Airship best practices
 * Lock-screen notifications: Screen lights up, no sound/vibration, title is Company Name from pass.json
 * Google Wallet: Messages use addMessage API
 *
 * Features:
 * - Rate limiting (10 notifications per pass per 24 hours, configurable via WALLET_NOTIFICATION_DAILY_LIMIT)
 * - Notification history tracking
 * - Multiple notification types (offers, reminders, birthdays, milestones)
 * - Bulk notification sending
 */

import WalletPass from '../models/WalletPass.js'
import { Customer, Business, Offer, CustomerProgress } from '../models/index.js'
import WalletPassService from './WalletPassService.js'
import logger from '../config/logger.js'

class WalletNotificationService {
  /**
   * Send a custom notification message to a wallet pass
   * 
   * For Apple Wallet, the message header appears in auxiliaryFields (triggers lock-screen notification) 
   * and the full message appears in backFields (for persistence).
   * 
   * Notification behavior: Silent visual alert (screen lights up, no sound), title is business name from pass.
   * Users can view full message by flipping pass over.
   *
   * @param {string} walletPassId - The wallet pass ID
   * @param {Object} messageData - Message content
   * @param {string} messageData.header - Message header/title
   * @param {string} messageData.body - Message body text
   * @param {string} messageType - Type of message (offer, reminder, birthday, etc.)
   * @returns {Object} Result with success status and details
   */
  static async sendCustomMessage(walletPassId, messageData, messageType = 'custom') {
    try {
      // Find wallet pass
      const walletPass = await WalletPass.findByPk(walletPassId)

      if (!walletPass) {
        return {
          success: false,
          error: 'Wallet pass not found',
          walletPassId
        }
      }

      // Check if pass is active
      if (!walletPass.isActive()) {
        return {
          success: false,
          error: 'Wallet pass is not active',
          status: walletPass.pass_status,
          walletPassId
        }
      }

      // Check rate limiting (configurable daily limit, default 10)
      if (!walletPass.canSendNotification()) {
        const dailyLimit = parseInt(process.env.WALLET_NOTIFICATION_DAILY_LIMIT || '10')
        logger.warn(`Rate limit reached for wallet pass ${walletPassId}`, {
          notification_count: walletPass.notification_count,
          last_notification_date: walletPass.last_notification_date,
          daily_limit: dailyLimit
        })

        return {
          success: false,
          error: 'Rate limit exceeded',
          message: `Cannot send more than ${dailyLimit} notifications per day to this pass`,
          notification_count: walletPass.notification_count,
          daily_limit: dailyLimit,
          last_notification_date: walletPass.last_notification_date,
          walletPassId
        }
      }

      // Validate message data
      if (!messageData.header || !messageData.body) {
        return {
          success: false,
          error: 'Invalid message data',
          message: 'Both header and body are required',
          walletPassId
        }
      }

      // Send notification based on wallet type
      let result

      if (walletPass.wallet_type === 'google') {
        // Google Wallet - Use addMessage API
        const googleWalletController = (await import('../controllers/realGoogleWalletController.js')).default

        result = await googleWalletController.sendCustomMessage(
          walletPass.wallet_object_id,
          messageData.header,
          messageData.body
        )

      } else if (walletPass.wallet_type === 'apple') {
        // Apple Wallet - Use APNs
        const appleWalletController = (await import('../controllers/appleWalletController.js')).default

        result = await appleWalletController.sendCustomMessage(
          walletPass.wallet_serial,
          messageData.header,
          messageData.body
        )
      } else {
        return {
          success: false,
          error: 'Unsupported wallet type',
          wallet_type: walletPass.wallet_type,
          walletPassId
        }
      }

      // If notification sent successfully, record it
      if (result.success) {
        await walletPass.recordNotification(messageType, messageData)
        await walletPass.updateLastPush()

        logger.info(`✅ Wallet notification sent successfully`, {
          walletPassId,
          wallet_type: walletPass.wallet_type,
          message_type: messageType,
          notification_count: walletPass.notification_count + 1
        })
      }

      return {
        success: result.success,
        walletPassId,
        wallet_type: walletPass.wallet_type,
        message_type: messageType,
        notification_count: walletPass.notification_count,
        result
      }

    } catch (error) {
      logger.error('❌ Failed to send wallet notification', {
        error: error.message,
        stack: error.stack,
        walletPassId,
        messageType
      })

      return {
        success: false,
        error: 'Failed to send notification',
        message: error.message,
        walletPassId
      }
    }
  }

  /**
   * Send promotional offer notification to customer's wallet passes
   *
   * @param {string} customerId - Customer ID
   * @param {string} offerId - Offer ID
   * @param {Object} offerDetails - Offer information
   * @returns {Object} Results for all wallet passes
   */
  static async sendOfferNotification(customerId, offerId, offerDetails) {
    try {
      // Find all active wallet passes for this customer and offer
      const walletPasses = await WalletPass.findByCustomerAndOffer(customerId, offerId)

      if (walletPasses.length === 0) {
        return {
          success: false,
          error: 'No active wallet passes found',
          customerId,
          offerId
        }
      }

      // Prepare message
      const messageData = {
        header: offerDetails.title || 'Special Offer!',
        body: offerDetails.description || 'Check out our latest offer in your wallet pass.'
      }

      // Send to all wallet passes
      const results = []
      for (const walletPass of walletPasses) {
        const result = await this.sendCustomMessage(walletPass.id, messageData, 'offer')
        results.push(result)
      }

      const successCount = results.filter(r => r.success).length

      return {
        success: successCount > 0,
        total_passes: walletPasses.length,
        successful: successCount,
        failed: walletPasses.length - successCount,
        results,
        customerId,
        offerId
      }

    } catch (error) {
      logger.error('❌ Failed to send offer notification', {
        error: error.message,
        customerId,
        offerId
      })

      return {
        success: false,
        error: 'Failed to send offer notification',
        message: error.message,
        customerId,
        offerId
      }
    }
  }

  /**
   * Send progress reminder notification ("You're almost there!")
   *
   * @param {string} customerId - Customer ID
   * @param {string} offerId - Offer ID
   * @returns {Object} Results for all wallet passes
   */
  static async sendProgressReminder(customerId, offerId) {
    try {
      // Get customer progress
      const progress = await CustomerProgress.findOne({
        where: {
          customer_id: customerId,
          offer_id: offerId,
          is_completed: false
        },
        include: [
          {
            model: Offer,
            as: 'offer',
            attributes: ['title', 'description', 'reward_type', 'reward_description']
          }
        ]
      })

      if (!progress) {
        return {
          success: false,
          error: 'No active progress found',
          customerId,
          offerId
        }
      }

      const remaining = progress.getRemainingStamps()
      const percentage = progress.getProgressPercentage()

      // Only send if customer is close to completion (>= 50%)
      if (percentage < 50) {
        return {
          success: false,
          error: 'Customer not close enough to completion',
          message: 'Progress reminders only sent when >= 50% complete',
          progress: percentage,
          customerId,
          offerId
        }
      }

      // Prepare message
      const messageData = {
        header: `You're ${percentage}% there!`,
        body: `Only ${remaining} more visit${remaining > 1 ? 's' : ''} until you earn your ${progress.offer?.reward_type || 'reward'}!`
      }

      // Find wallet passes
      const walletPasses = await WalletPass.findByCustomerAndOffer(customerId, offerId)

      if (walletPasses.length === 0) {
        return {
          success: false,
          error: 'No active wallet passes found',
          customerId,
          offerId
        }
      }

      // Send to all wallet passes
      const results = []
      for (const walletPass of walletPasses) {
        const result = await this.sendCustomMessage(walletPass.id, messageData, 'reminder')
        results.push(result)
      }

      const successCount = results.filter(r => r.success).length

      return {
        success: successCount > 0,
        total_passes: walletPasses.length,
        successful: successCount,
        failed: walletPasses.length - successCount,
        progress: {
          current_stamps: progress.current_stamps,
          max_stamps: progress.max_stamps,
          percentage,
          remaining
        },
        results,
        customerId,
        offerId
      }

    } catch (error) {
      logger.error('❌ Failed to send progress reminder', {
        error: error.message,
        customerId,
        offerId
      })

      return {
        success: false,
        error: 'Failed to send progress reminder',
        message: error.message,
        customerId,
        offerId
      }
    }
  }

  /**
   * Send birthday notification to customer
   *
   * @param {string} customerId - Customer ID
   * @param {string} businessId - Business ID
   * @returns {Object} Results for all wallet passes
   */
  static async sendBirthdayNotification(customerId, businessId) {
    try {
      // Get customer and business details
      const customer = await Customer.findOne({
        where: { customer_id: customerId }
      })

      const business = await Business.findByPk(businessId)

      if (!customer || !business) {
        return {
          success: false,
          error: 'Customer or business not found',
          customerId,
          businessId
        }
      }

      // Prepare birthday message
      const messageData = {
        header: `Happy Birthday, ${customer.first_name || 'Friend'}! 🎉`,
        body: `Celebrate with us! Visit ${business.business_name} for a special birthday surprise.`
      }

      // Find all active wallet passes for this customer and business
      const walletPasses = await WalletPass.findAll({
        where: {
          customer_id: customerId,
          business_id: businessId,
          pass_status: 'active'
        }
      })

      if (walletPasses.length === 0) {
        return {
          success: false,
          error: 'No active wallet passes found',
          customerId,
          businessId
        }
      }

      // Send to all wallet passes
      const results = []
      for (const walletPass of walletPasses) {
        const result = await this.sendCustomMessage(walletPass.id, messageData, 'birthday')
        results.push(result)
      }

      const successCount = results.filter(r => r.success).length

      return {
        success: successCount > 0,
        total_passes: walletPasses.length,
        successful: successCount,
        failed: walletPasses.length - successCount,
        results,
        customerId,
        businessId
      }

    } catch (error) {
      logger.error('❌ Failed to send birthday notification', {
        error: error.message,
        customerId,
        businessId
      })

      return {
        success: false,
        error: 'Failed to send birthday notification',
        message: error.message,
        customerId,
        businessId
      }
    }
  }

  /**
   * Send milestone achievement notification
   *
   * @param {string} customerId - Customer ID
   * @param {string} businessId - Business ID
   * @param {Object} milestone - Milestone details
   * @returns {Object} Results for all wallet passes
   */
  static async sendMilestoneNotification(customerId, businessId, milestone) {
    try {
      const customer = await Customer.findOne({
        where: { customer_id: customerId }
      })

      if (!customer) {
        return {
          success: false,
          error: 'Customer not found',
          customerId
        }
      }

      // Prepare milestone message
      const messageData = {
        header: milestone.title || 'Milestone Achievement! 🎊',
        body: milestone.message || `Congratulations ${customer.first_name || 'Friend'}! You've reached a new milestone.`
      }

      // Find all active wallet passes for this customer and business
      const walletPasses = await WalletPass.findAll({
        where: {
          customer_id: customerId,
          business_id: businessId,
          pass_status: 'active'
        }
      })

      if (walletPasses.length === 0) {
        return {
          success: false,
          error: 'No active wallet passes found',
          customerId,
          businessId
        }
      }

      // Send to all wallet passes
      const results = []
      for (const walletPass of walletPasses) {
        const result = await this.sendCustomMessage(walletPass.id, messageData, 'milestone')
        results.push(result)
      }

      const successCount = results.filter(r => r.success).length

      return {
        success: successCount > 0,
        total_passes: walletPasses.length,
        successful: successCount,
        failed: walletPasses.length - successCount,
        milestone,
        results,
        customerId,
        businessId
      }

    } catch (error) {
      logger.error('❌ Failed to send milestone notification', {
        error: error.message,
        customerId,
        businessId
      })

      return {
        success: false,
        error: 'Failed to send milestone notification',
        message: error.message,
        customerId,
        businessId
      }
    }
  }

  /**
   * Send re-engagement notification to inactive customers
   *
   * @param {string} customerId - Customer ID
   * @param {string} businessId - Business ID
   * @param {Object} incentive - Re-engagement incentive details
   * @returns {Object} Results for all wallet passes
   */
  static async sendReengagementNotification(customerId, businessId, incentive = {}) {
    try {
      const customer = await Customer.findOne({
        where: { customer_id: customerId }
      })

      const business = await Business.findByPk(businessId)

      if (!customer || !business) {
        return {
          success: false,
          error: 'Customer or business not found',
          customerId,
          businessId
        }
      }

      // Prepare re-engagement message
      const messageData = {
        header: incentive.header || `We miss you, ${customer.first_name || 'Friend'}! 💙`,
        body: incentive.body || `Come back to ${business.business_name}! We have something special waiting for you.`
      }

      // Find all active wallet passes for this customer and business
      const walletPasses = await WalletPass.findAll({
        where: {
          customer_id: customerId,
          business_id: businessId,
          pass_status: 'active'
        }
      })

      if (walletPasses.length === 0) {
        return {
          success: false,
          error: 'No active wallet passes found',
          customerId,
          businessId
        }
      }

      // Send to all wallet passes
      const results = []
      for (const walletPass of walletPasses) {
        const result = await this.sendCustomMessage(walletPass.id, messageData, 'reengagement')
        results.push(result)
      }

      const successCount = results.filter(r => r.success).length

      return {
        success: successCount > 0,
        total_passes: walletPasses.length,
        successful: successCount,
        failed: walletPasses.length - successCount,
        results,
        customerId,
        businessId
      }

    } catch (error) {
      logger.error('❌ Failed to send re-engagement notification', {
        error: error.message,
        customerId,
        businessId
      })

      return {
        success: false,
        error: 'Failed to send re-engagement notification',
        message: error.message,
        customerId,
        businessId
      }
    }
  }

  /**
   * Send bulk notifications to multiple customers
   *
   * @param {string} businessId - Business ID
   * @param {Array<string>} customerIds - Array of customer IDs
   * @param {Object} messageData - Message content
   * @param {string} messageType - Type of message
   * @returns {Object} Bulk operation results
   */
  static async sendBulkNotifications(businessId, customerIds, messageData, messageType = 'bulk') {
    try {
      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        return {
          success: false,
          error: 'Invalid customer IDs',
          message: 'customerIds must be a non-empty array'
        }
      }

      logger.info(`Starting bulk notification send`, {
        businessId,
        total_customers: customerIds.length,
        message_type: messageType
      })

      const results = {
        total_customers: customerIds.length,
        successful_customers: 0,
        failed_customers: 0,
        total_passes: 0,
        successful_passes: 0,
        failed_passes: 0,
        details: []
      }

      // Process each customer
      for (const customerId of customerIds) {
        try {
          // Find all active wallet passes for this customer and business
          const walletPasses = await WalletPass.findAll({
            where: {
              customer_id: customerId,
              business_id: businessId,
              pass_status: 'active'
            }
          })

          if (walletPasses.length === 0) {
            results.failed_customers++
            results.details.push({
              customerId,
              success: false,
              error: 'No active wallet passes found'
            })
            continue
          }

          results.total_passes += walletPasses.length
          let customerSuccessful = false

          // Send to all wallet passes for this customer
          for (const walletPass of walletPasses) {
            const result = await this.sendCustomMessage(walletPass.id, messageData, messageType)

            if (result.success) {
              results.successful_passes++
              customerSuccessful = true
            } else {
              results.failed_passes++
            }
          }

          if (customerSuccessful) {
            results.successful_customers++
          } else {
            results.failed_customers++
          }

          results.details.push({
            customerId,
            success: customerSuccessful,
            passes_sent: walletPasses.length
          })

        } catch (customerError) {
          logger.error('Error sending notification to customer', {
            customerId,
            error: customerError.message
          })

          results.failed_customers++
          results.details.push({
            customerId,
            success: false,
            error: customerError.message
          })
        }
      }

      logger.info(`Bulk notification send completed`, {
        businessId,
        ...results
      })

      return {
        success: results.successful_customers > 0,
        ...results,
        businessId,
        message_type: messageType
      }

    } catch (error) {
      logger.error('❌ Failed to send bulk notifications', {
        error: error.message,
        businessId
      })

      return {
        success: false,
        error: 'Failed to send bulk notifications',
        message: error.message,
        businessId
      }
    }
  }
}

export default WalletNotificationService
