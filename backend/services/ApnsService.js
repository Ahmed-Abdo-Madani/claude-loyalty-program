/**
 * Apple Push Notification Service (APNs) for Wallet Pass Updates
 *
 * This service handles sending push notifications to iOS devices
 * to trigger Apple Wallet pass updates when stamp progress changes.
 *
 * Technical Details:
 * - Uses APNs HTTP/2 protocol via 'apn' npm package
 * - Sends empty payload notifications (Apple Wallet spec requirement)
 * - Device receives notification, fetches updated pass from webServiceURL
 * - Topic format: Pass Type ID (e.g., pass.me.madna.api)
 *
 * Requirements:
 * - APNs certificate (.p12 file) from Apple Developer Portal
 * - Pass Type ID certificate
 * - Valid push tokens from device registrations
 */

import apn from 'apn'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../config/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ApnsService {
  constructor() {
    this.provider = null
    this.isConfigured = false
    this.initialize()
  }

  /**
   * Initialize APNs provider with certificates
   */
  initialize() {
    try {
      // Check if APNs topic is configured
      const topic = process.env.APNS_TOPIC || process.env.APPLE_PASS_TYPE_ID
      const certPassword = process.env.APNS_CERT_PASSWORD || process.env.APPLE_PASS_CERTIFICATE_PASSWORD
      const isProduction = process.env.APNS_PRODUCTION === 'true'

      if (!topic) {
        logger.warn('⚠️ APNs not configured - missing APNS_TOPIC or APPLE_PASS_TYPE_ID')
        logger.info('   APNs push notifications will not be sent')
        return
      }

      let options = null
      let certSource = ''

      // Option 1: Load from environment variable (base64 encoded) - for production/Render
      // Reuse APPLE_PASS_CERTIFICATE_BASE64 since it's the same certificate
      if (process.env.APPLE_PASS_CERTIFICATE_BASE64) {
        try {
          const certBuffer = Buffer.from(process.env.APPLE_PASS_CERTIFICATE_BASE64, 'base64')
          options = {
            pfx: certBuffer,
            passphrase: certPassword || '',
            production: isProduction
          }
          certSource = 'environment variable (APPLE_PASS_CERTIFICATE_BASE64)'
          logger.info('✅ APNs certificate loaded from environment variable')
        } catch (error) {
          logger.error('❌ Failed to decode APNs certificate from environment variable:', error.message)
          return
        }
      }
      // Option 2: Load from file path - for local development
      else if (process.env.APNS_CERT_PATH) {
        const certPath = process.env.APNS_CERT_PATH
        const fullCertPath = path.resolve(path.join(__dirname, '..', certPath))

        if (fs.existsSync(fullCertPath)) {
          options = {
            pfx: fs.readFileSync(fullCertPath),
            passphrase: certPassword || '',
            production: isProduction
          }
          certSource = `file (${fullCertPath})`
          logger.info('✅ APNs certificate loaded from file')
        } else {
          logger.warn(`⚠️ APNs certificate not found at: ${fullCertPath}`)
          logger.info('   APNs push notifications will not be sent')
          return
        }
      } else {
        logger.warn('⚠️ APNs certificate not configured')
        logger.info('   Set APPLE_PASS_CERTIFICATE_BASE64 (production) or APNS_CERT_PATH (local)')
        logger.info('   APNs push notifications will not be sent')
        return
      }

      // Initialize APNs provider
      this.provider = new apn.Provider(options)
      this.topic = topic
      this.isConfigured = true

      logger.info('✅ APNs service initialized successfully', {
        topic,
        production: isProduction,
        certificateSource: certSource
      })

    } catch (error) {
      logger.error('❌ Failed to initialize APNs service:', {
        error: error.message,
        stack: error.stack
      })
      this.isConfigured = false
    }
  }

  /**
   * Send pass update notification to a device
   *
   * @param {string} pushToken - APNs device push token
   * @param {object} options - Optional notification options
   * @returns {Promise<object>} - Result with success status
   */
  async sendPassUpdateNotification(pushToken, options = {}) {
    try {
      if (!this.isConfigured) {
        logger.warn('⚠️ APNs not configured - notification not sent', {
          pushToken: pushToken?.substring(0, 16) + '...'
        })
        return {
          success: false,
          error: 'APNs not configured',
          sent: 0,
          failed: 0
        }
      }

      if (!pushToken) {
        logger.warn('⚠️ No push token provided')
        return {
          success: false,
          error: 'No push token provided',
          sent: 0,
          failed: 0
        }
      }

      // Create notification
      // IMPORTANT: Apple Wallet requires EMPTY payload for pass updates
      // The device will fetch the updated pass from webServiceURL
      const notification = new apn.Notification()
      notification.topic = this.topic
      notification.payload = {} // Empty payload is required!
      notification.pushType = 'background' // Background update
      notification.priority = 5 // APNs priority (5 = normal, 10 = immediate)

      logger.info('📤 Sending APNs pass update notification...', {
        pushToken: pushToken.substring(0, 16) + '...',
        topic: this.topic
      })

      // Send notification
      const result = await this.provider.send(notification, pushToken)

      // Check result
      if (result.sent && result.sent.length > 0) {
        logger.info('✅ APNs notification sent successfully', {
          sent: result.sent.length,
          failed: result.failed.length
        })
        return {
          success: true,
          sent: result.sent.length,
          failed: result.failed.length,
          details: result
        }
      } else if (result.failed && result.failed.length > 0) {
        const failureReason = result.failed[0]?.response?.reason || 'Unknown error'
        logger.error('❌ APNs notification failed', {
          reason: failureReason,
          pushToken: pushToken.substring(0, 16) + '...',
          failedCount: result.failed.length
        })
        return {
          success: false,
          error: failureReason,
          sent: 0,
          failed: result.failed.length,
          details: result
        }
      } else {
        logger.warn('⚠️ APNs notification result unclear', result)
        return {
          success: false,
          error: 'Unclear result',
          sent: 0,
          failed: 0,
          details: result
        }
      }

    } catch (error) {
      logger.error('❌ Failed to send APNs notification:', {
        error: error.message,
        stack: error.stack,
        pushToken: pushToken?.substring(0, 16) + '...'
      })
      return {
        success: false,
        error: error.message,
        sent: 0,
        failed: 1
      }
    }
  }

  /**
   * Send pass update notifications to multiple devices
   *
   * @param {string[]} pushTokens - Array of APNs device push tokens
   * @returns {Promise<object>} - Result with success counts
   */
  async sendPassUpdateNotificationBatch(pushTokens) {
    try {
      if (!this.isConfigured) {
        logger.warn('⚠️ APNs not configured - batch notifications not sent')
        return {
          success: false,
          error: 'APNs not configured',
          totalSent: 0,
          totalFailed: pushTokens.length
        }
      }

      if (!pushTokens || pushTokens.length === 0) {
        logger.warn('⚠️ No push tokens provided for batch')
        return {
          success: true,
          totalSent: 0,
          totalFailed: 0
        }
      }

      logger.info(`📤 Sending batch APNs notifications to ${pushTokens.length} devices...`)

      // Create notification
      const notification = new apn.Notification()
      notification.topic = this.topic
      notification.payload = {} // Empty payload for pass update
      notification.pushType = 'background'
      notification.priority = 5

      // Send to all tokens
      const result = await this.provider.send(notification, pushTokens)

      const totalSent = result.sent?.length || 0
      const totalFailed = result.failed?.length || 0

      logger.info('✅ APNs batch notifications completed', {
        totalDevices: pushTokens.length,
        sent: totalSent,
        failed: totalFailed,
        successRate: ((totalSent / pushTokens.length) * 100).toFixed(1) + '%'
      })

      // Log failures for debugging
      if (result.failed && result.failed.length > 0) {
        result.failed.forEach((failure, index) => {
          logger.warn(`⚠️ APNs notification failed for device ${index + 1}`, {
            reason: failure.response?.reason,
            status: failure.status,
            device: failure.device?.substring(0, 16) + '...'
          })
        })
      }

      return {
        success: totalSent > 0,
        totalSent,
        totalFailed,
        details: result
      }

    } catch (error) {
      logger.error('❌ Failed to send APNs batch notifications:', {
        error: error.message,
        stack: error.stack,
        tokenCount: pushTokens?.length || 0
      })
      return {
        success: false,
        error: error.message,
        totalSent: 0,
        totalFailed: pushTokens?.length || 0
      }
    }
  }

  /**
   * Shutdown APNs provider gracefully
   */
  async shutdown() {
    if (this.provider) {
      logger.info('🔌 Shutting down APNs provider...')
      await this.provider.shutdown()
      logger.info('✅ APNs provider shut down successfully')
    }
  }

  /**
   * Check if APNs service is properly configured
   * @returns {boolean}
   */
  isReady() {
    return this.isConfigured
  }
}

// Export singleton instance
export default new ApnsService()
