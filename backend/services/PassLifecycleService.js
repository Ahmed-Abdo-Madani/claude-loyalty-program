import WalletPass from '../models/WalletPass.js'
import CustomerProgress from '../models/CustomerProgress.js'
import logger from '../config/logger.js'
import sequelize from '../config/database.js'
import { Op } from 'sequelize'
import appleWalletController from '../controllers/appleWalletController.js'
import googleWalletController from '../controllers/realGoogleWalletController.js'

/**
 * Service to handle wallet pass lifecycle management and expiration
 * Centralizes pass expiration, state management, and cleanup operations
 */
class PassLifecycleService {
  /**
   * Schedule a pass for expiration
   * @param {string} customerId - Customer ID
   * @param {string} offerId - Offer ID
   * @param {number} daysUntilExpiration - Days until pass expires (default 30)
   * @returns {Promise<number>} - Number of passes scheduled
   */
  static async schedulePassExpiration(customerId, offerId, daysUntilExpiration = 30) {
    try {
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + daysUntilExpiration)

      const passes = await WalletPass.findAll({
        where: {
          customer_id: customerId,
          offer_id: offerId,
          pass_status: 'active'
        }
      })

      let scheduled = 0
      for (const pass of passes) {
        pass.scheduled_expiration_at = expirationDate
        await pass.save()
        scheduled++
      }

      logger.info('Passes scheduled for expiration', {
        customerId,
        offerId,
        scheduled,
        expirationDate
      })

      return scheduled
    } catch (error) {
      logger.error('Failed to schedule pass expiration:', error)
      throw error
    }
  }

  /**
   * Expire a completed pass
   * @param {number} passId - Wallet pass primary key ID
   * @returns {Promise<Object>} - Result of expiration
   */
  static async expireCompletedPass(passId) {
    const transaction = await sequelize.transaction()

    try {
      const pass = await WalletPass.findByPk(passId, { transaction })

      if (!pass) {
        throw new Error('Wallet pass not found')
      }

      if (pass.pass_status !== 'active' && pass.pass_status !== 'completed') {
        logger.warn('Pass already expired or revoked', { passId, status: pass.pass_status })
        await transaction.rollback()
        return { success: false, reason: 'Pass already expired' }
      }

      // Find associated progress separately (no association defined yet)
      const progress = await CustomerProgress.findOne({
        where: {
          customer_id: pass.customer_id,
          offer_id: pass.offer_id
        },
        transaction
      })

      if (!progress || !progress.is_completed) {
        logger.warn('Cannot expire pass: progress not completed', { passId })
        await transaction.rollback()
        return { success: false, reason: 'Progress not completed' }
      }

      // Mark pass as expired
      pass.pass_status = 'expired'
      await pass.save({ transaction })

      await transaction.commit()

      // Send push notification to wallet (triggers device update)
      // Important: Do this AFTER commit to avoid holding transaction open
      try {
        if (pass.wallet_type === 'apple' && pass.wallet_serial) {
          logger.info('Regenerating Apple pass with voided flag for expiration', {
            serial: pass.wallet_serial,
            passId
          })

          // Fetch customer, offer, and progress data for pass regeneration
          const Customer = (await import('../models/Customer.js')).default
          const Offer = (await import('../models/Offer.js')).default
          
          const customer = await Customer.findOne({
            where: { public_id: pass.customer_id }
          })
          const offer = await Offer.findOne({
            where: { public_id: pass.offer_id }
          })

          if (customer && offer) {
            // Prepare data for createPassJson
            const customerData = {
              customerId: customer.public_id,
              firstName: customer.first_name,
              lastName: customer.last_name
            }
            const offerData = {
              offerId: offer.public_id,
              businessId: offer.business_id,
              businessName: offer.business_name || 'Business',
              title: offer.title,
              stampsRequired: offer.max_stamps,
              rewardDescription: offer.reward_description
            }
            const progressData = {
              stampsEarned: progress.current_stamps || 0
            }

            // Regenerate pass JSON with voided flag
            const updatedPassData = appleWalletController.createPassJson(
              customerData,
              offerData,
              progressData,
              null, // design
              pass.wallet_serial,
              pass.authentication_token,
              pass // existingPass with pass_status='expired' triggers voided flag
            )

            // Update pass_data_json in database
            await pass.update({ pass_data_json: updatedPassData })
            logger.info('✅ Updated pass_data_json with voided flag')
          }

          // Send APNs push notification
          logger.info('Sending Apple Wallet push notification for expiration', {
            serial: pass.wallet_serial
          })
          await pass.sendPushNotification()
          
        } else if (pass.wallet_type === 'google' && pass.wallet_object_id) {
          logger.info('Expiring Google Wallet pass', {
            objectId: pass.wallet_object_id
          })
          // Call expirePass method which sets state: 'EXPIRED' and sends notification
          await googleWalletController.expirePass(pass.wallet_object_id)
        }
      } catch (pushError) {
        // Non-critical: Log but don't fail the overall expiration
        logger.warn('Failed to send wallet push notification', {
          error: pushError.message,
          passId,
          walletType: pass.wallet_type
        })
      }

      logger.info('Pass expired successfully', {
        passId,
        customerId: pass.customer_id,
        offerId: pass.offer_id
      })

      return { success: true, pass }
    } catch (error) {
      await transaction.rollback()
      logger.error('Failed to expire pass:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Expire all completed passes older than specified days
   * @param {number} daysAfterCompletion - Days after completion to expire (default 30)
   * @param {boolean} isDryRun - If true, only report what would be expired without making changes
   * @returns {Promise<Object>} - Summary of expiration results
   */
  static async expireAllCompletedPasses(daysAfterCompletion = 30, isDryRun = false) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysAfterCompletion)

      // Find all passes that need expiration
      // Query CustomerProgress for completed items older than cutoff
      const completedProgress = await CustomerProgress.findAll({
        where: {
          is_completed: true,
          reward_fulfilled_at: {
            [Op.lte]: cutoffDate
          }
        }
      })

      // Find corresponding passes
      const passesToExpire = []
      for (const progress of completedProgress) {
        const passes = await WalletPass.findAll({
          where: {
            customer_id: progress.customer_id,
            offer_id: progress.offer_id,
            pass_status: {
              [Op.in]: ['active', 'completed']
            }
          }
        })
        passesToExpire.push(...passes)
      }

      const results = {
        expired: [],
        notified: [],
        errors: []
      }

      if (isDryRun) {
        logger.info(`🔍 DRY RUN: Would expire ${passesToExpire.length} passes`)
        results.expired = passesToExpire.map(p => ({
          id: p.id,
          customer_id: p.customer_id,
          offer_id: p.offer_id,
          wallet_serial: p.wallet_serial,
          wallet_object_id: p.wallet_object_id
        }))
        return results
      }

      for (const pass of passesToExpire) {
        const result = await this.expireCompletedPass(pass.id)
        if (result.success) {
          results.expired.push({
            id: pass.id,
            customer_id: pass.customer_id,
            offer_id: pass.offer_id,
            wallet_serial: pass.wallet_serial,
            wallet_object_id: pass.wallet_object_id
          })
        } else {
          results.errors.push({
            passId: pass.id,
            message: result.reason || result.error
          })
        }
      }

      logger.info('Bulk pass expiration complete', {
        total: passesToExpire.length,
        expired: results.expired.length,
        errors: results.errors.length
      })

      return results
    } catch (error) {
      logger.error('Failed to expire completed passes:', error)
      throw error
    }
  }

  /**
   * Clean up expired passes (soft delete)
   * @param {number} daysAfterExpiration - Days after expiration to cleanup (default 90)
   * @param {boolean} isDryRun - If true, only report what would be cleaned without making changes
   * @returns {Promise<Object>} - Cleanup results
   */
  static async cleanupExpiredPasses(daysAfterExpiration = 90, isDryRun = false) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysAfterExpiration)

      const passesToClean = await WalletPass.findAll({
        where: {
          pass_status: 'expired',
          updated_at: {
            [Op.lte]: cutoffDate
          }
        }
      })

      const results = {
        cleaned: [],
        errors: []
      }

      if (isDryRun) {
        logger.info(`🔍 DRY RUN: Would clean up ${passesToClean.length} passes`)
        results.cleaned = passesToClean.map(p => ({
          id: p.id,
          customer_id: p.customer_id,
          offer_id: p.offer_id
        }))
        return results
      }

      for (const pass of passesToClean) {
        try {
          pass.pass_status = 'deleted'
          pass.deleted_at = new Date()
          await pass.save()
          results.cleaned.push({
            id: pass.id,
            customer_id: pass.customer_id,
            offer_id: pass.offer_id
          })
        } catch (error) {
          results.errors.push({
            passId: pass.id,
            message: error.message
          })
        }
      }

      logger.info('Expired passes cleaned up', { cleaned: results.cleaned.length })

      return results
    } catch (error) {
      logger.error('Failed to cleanup expired passes:', error)
      throw error
    }
  }

  /**
   * Send completion notification to wallet
   * @param {string} walletPassId - Wallet pass ID
   * @param {string} message - Notification message
   * @returns {Promise<Object>} - Notification result
   */
  static async sendCompletionNotification(walletPassId, message) {
    try {
      const pass = await WalletPass.findByPk(walletPassId)

      if (!pass) {
        throw new Error('Wallet pass not found')
      }

      // Send platform-specific notification
      // NOTE: Respect rate limits (3/day for Google Wallet, 10/day for Apple)
      let sent = false

      if (pass.wallet_type === 'apple' && pass.wallet_serial) {
        logger.info('Sending Apple Wallet completion notification', {
          serial: pass.wallet_serial,
          message
        })
        // Use the model's sendPushNotification method
        await pass.sendPushNotification()
        sent = true
      } else if (pass.wallet_type === 'google' && pass.wallet_object_id) {
        logger.info('Sending Google Wallet completion notification', {
          objectId: pass.wallet_object_id,
          message
        })
        // For Google Wallet, update the pass to trigger notification
        // The updateLoyaltyObject will send push notification automatically
        await googleWalletController.updateLoyaltyObject(pass.wallet_object_id, {
          // Just trigger an update - the pass data should reflect completion
          textModulesData: [{
            header: 'Status',
            body: message || 'Reward completed!'
          }]
        })
        sent = true
      }

      logger.info('Completion notification sent', {
        walletPassId,
        platform: pass.wallet_type,
        sent
      })

      return { success: true, sent }
    } catch (error) {
      logger.error('Failed to send completion notification:', error)
      return { success: false, error: error.message }
    }
  }
}

export default PassLifecycleService
