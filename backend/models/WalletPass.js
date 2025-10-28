import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const WalletPass = sequelize.define('WalletPass', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Relationships
  customer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'customers',
      key: 'customer_id'
    },
    comment: 'Customer ID (cust_*)'
  },
  progress_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customer_progress',
      key: 'id'
    },
    comment: 'Customer progress record ID'
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    },
    comment: 'Business ID (biz_*)'
  },
  offer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'offers',
      key: 'public_id'
    },
    comment: 'Offer ID (off_*)'
  },
  // Wallet Type & Identifiers
  wallet_type: {
    type: DataTypes.ENUM('apple', 'google'),
    allowNull: false,
    comment: 'Type of wallet: apple or google'
  },
  wallet_serial: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Apple Wallet pass serial number'
  },
  wallet_object_id: {
    type: DataTypes.STRING(200),
    allowNull: true,
    unique: true,
    comment: 'Google Wallet object ID (e.g., 3388000000023017940.cust_xxx_off_xxx)'
  },
  // Status
  pass_status: {
    type: DataTypes.ENUM('active', 'completed', 'expired', 'revoked', 'deleted'),
    defaultValue: 'active',
    comment: 'Current status of the wallet pass'
  },
  // Metadata
  device_info: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Device/platform information'
  },
  last_updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time this pass was updated via push notification'
  },
  // Notification tracking
  notification_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of notifications sent today (resets daily)'
  },
  last_notification_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time a notification was sent'
  },
  notification_history: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'History of notifications sent (last 30 days)'
  },
  // Apple Web Service Protocol fields
  authentication_token: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true,
    comment: 'Authentication token for Apple Web Service Protocol (Apple Wallet only)'
  },
  last_updated_tag: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Update tag for tracking pass changes (Unix timestamp). Apple Wallet only - NULL for Google Wallet passes. Used by Apple Web Service Protocol passesUpdatedSince endpoint.'
  },
  manifest_etag: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'ETag computed from manifest hash for HTTP caching (Apple Wallet only)'
  },
  pass_data_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Complete pass.json structure for regeneration (Apple Wallet only)'
  },
  // Pass Lifecycle fields
  scheduled_expiration_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this pass should expire (typically 30 days after completion)'
  },
  expiration_notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether customer has been notified about impending expiration'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp (for expired passes after 90 days)'
  }
}, {
  tableName: 'wallet_passes',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['customer_id', 'offer_id', 'wallet_type'],
      name: 'unique_customer_offer_wallet'
    },
    {
      fields: ['customer_id'],
      name: 'idx_wallet_passes_customer'
    },
    {
      fields: ['progress_id'],
      name: 'idx_wallet_passes_progress'
    },
    {
      fields: ['business_id'],
      name: 'idx_wallet_passes_business'
    },
    {
      fields: ['wallet_type'],
      name: 'idx_wallet_passes_wallet_type'
    },
    {
      fields: ['pass_status'],
      name: 'idx_wallet_passes_status'
    },
    {
      fields: ['authentication_token'],
      name: 'idx_wallet_passes_auth_token'
    },
    {
      fields: ['last_updated_tag'],
      name: 'idx_wallet_passes_updated_tag'
    }
  ]
})

// Instance methods
WalletPass.prototype.isActive = function() {
  return this.pass_status === 'active'
}

WalletPass.prototype.markExpired = async function() {
  this.pass_status = 'expired'
  await this.save()
  return this
}

WalletPass.prototype.revoke = async function() {
  this.pass_status = 'revoked'
  await this.save()
  return this
}

WalletPass.prototype.updateLastPush = async function() {
  this.last_updated_at = new Date()
  // Also update the last_updated_tag for Apple Web Service Protocol
  if (this.wallet_type === 'apple') {
    this.last_updated_tag = Math.floor(Date.now() / 1000).toString()
  }
  await this.save()
  return this
}

// ========== APPLE WEB SERVICE PROTOCOL METHODS ==========

/**
 * Generate authentication token for Apple Web Service Protocol
 * Token is unique per pass and used for authentication in web service endpoints
 * @returns {string} 32-character authentication token
 */
WalletPass.generateAuthToken = function(customerId, offerId) {
  const crypto = require('crypto')
  const data = `${customerId}:${offerId}:${Date.now()}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)
}

/**
 * Update the pass data and increment update tag
 * This triggers push notifications to registered devices
 * @param {object} passData - Complete pass.json structure
 */
WalletPass.prototype.updatePassData = async function(passData) {
  if (this.wallet_type !== 'apple') {
    throw new Error('updatePassData is only for Apple Wallet passes')
  }

  this.pass_data_json = passData
  this.last_updated_tag = Math.floor(Date.now() / 1000).toString()
  this.last_updated_at = new Date()

  await this.save()
  return this
}

/**
 * Get authentication token (or generate if missing)
 */
WalletPass.prototype.getAuthenticationToken = async function() {
  if (!this.authentication_token) {
    this.authentication_token = WalletPass.generateAuthToken(this.customer_id, this.offer_id)
    await this.save()
  }
  return this.authentication_token
}

/**
 * Find pass by authentication token
 * @param {string} authToken - Authentication token
 * @returns {Promise<WalletPass|null>}
 */
WalletPass.findByAuthToken = async function(authToken) {
  return await this.findOne({
    where: {
      authentication_token: authToken,
      wallet_type: 'apple',
      pass_status: 'active'
    }
  })
}

/**
 * Find pass by serial number
 * @param {string} serialNumber - Apple Wallet serial number
 * @returns {Promise<WalletPass|null>}
 */
WalletPass.findBySerialNumber = async function(serialNumber) {
  return await this.findOne({
    where: {
      wallet_serial: serialNumber,
      wallet_type: 'apple',
      pass_status: 'active'
    }
  })
}

/**
 * Send APNs push notification to all registered devices for this pass
 * This triggers iOS devices to fetch the updated pass from webServiceURL
 * @returns {Promise<object>} - Result with success counts
 */
WalletPass.prototype.sendPushNotification = async function() {
  try {
    // Only Apple Wallet passes support push notifications
    if (this.wallet_type !== 'apple') {
      return {
        success: false,
        error: 'Push notifications only supported for Apple Wallet',
        sent: 0,
        failed: 0
      }
    }

    // Import ApnsService and DeviceRegistration
    const ApnsService = (await import('../services/ApnsService.js')).default
    const DeviceRegistration = (await import('./DeviceRegistration.js')).default

    // Check if APNs is configured
    if (!ApnsService.isReady()) {
      return {
        success: false,
        error: 'APNs not configured',
        sent: 0,
        failed: 0
      }
    }

    // Get all registered devices for this pass
    const registrations = await DeviceRegistration.getDevicesForPass(this.id)

    if (!registrations || registrations.length === 0) {
      return {
        success: true,
        message: 'No registered devices',
        sent: 0,
        failed: 0
      }
    }

    // Extract push tokens from device associations
    const pushTokens = registrations
      .map(reg => reg.device?.push_token)
      .filter(token => !!token)

    if (pushTokens.length === 0) {
      return {
        success: false,
        error: 'No valid push tokens found',
        sent: 0,
        failed: 0,
        totalRegistrations: registrations.length
      }
    }

    // Send push notifications to all devices
    const result = await ApnsService.sendPassUpdateNotificationBatch(pushTokens)

    // Update last push timestamp
    await this.updateLastPush()

    return result

  } catch (error) {
    const logger = (await import('../config/logger.js')).default
    logger.error('❌ Failed to send push notification for pass:', {
      error: error.message,
      passId: this.id,
      serialNumber: this.wallet_serial
    })
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 0
    }
  }
}

// Static methods
WalletPass.findByCustomerAndOffer = async function(customerId, offerId) {
  return await this.findAll({
    where: {
      customer_id: customerId,
      offer_id: offerId,
      pass_status: 'active'
    }
  })
}

WalletPass.getCustomerWalletTypes = async function(customerId, offerId) {
  const wallets = await this.findByCustomerAndOffer(customerId, offerId)
  return wallets.map(w => w.wallet_type)
}

WalletPass.hasWalletType = async function(customerId, offerId, walletType) {
  const count = await this.count({
    where: {
      customer_id: customerId,
      offer_id: offerId,
      wallet_type: walletType,
      pass_status: 'active'
    }
  })
  return count > 0
}

// Notification rate limiting - Check if can send notification
WalletPass.prototype.canSendNotification = function() {
  if (!this.last_notification_date) return true

  const today = new Date().setHours(0, 0, 0, 0)
  const lastNotificationDay = new Date(this.last_notification_date).setHours(0, 0, 0, 0)

  // Reset count if new day
  if (today > lastNotificationDay) return true

  // Check daily notification limit (configurable via environment variable, default 10 for production)
  const DAILY_NOTIFICATION_LIMIT = parseInt(process.env.WALLET_NOTIFICATION_DAILY_LIMIT || '10')
  return this.notification_count < DAILY_NOTIFICATION_LIMIT
}

// Record notification sent
WalletPass.prototype.recordNotification = async function(messageType, messageData) {
  const now = new Date()
  const today = now.setHours(0, 0, 0, 0)
  const lastNotificationDay = this.last_notification_date
    ? new Date(this.last_notification_date).setHours(0, 0, 0, 0)
    : 0

  // Reset count if new day
  if (today > lastNotificationDay) {
    this.notification_count = 0
  }

  this.notification_count += 1
  this.last_notification_date = new Date()

  // Add to history (keep last 30 days)
  const history = this.notification_history || []
  history.push({
    type: messageType,
    header: messageData.header,
    body: messageData.body,
    sent_at: new Date(),
    count: this.notification_count
  })

  // Keep only last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  this.notification_history = history.filter(h => new Date(h.sent_at) > thirtyDaysAgo)

  await this.save()
}

/**
 * Schedule pass expiration
 * @param {number} daysFromNow - Days from now when pass should expire (default: 30)
 */
WalletPass.prototype.scheduleExpiration = async function(daysFromNow = 30) {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + daysFromNow)
  
  this.scheduled_expiration_at = expirationDate
  this.expiration_notified = false
  
  await this.save()
  return this.scheduled_expiration_at
}

/**
 * Mark pass as completed (when customer redeems reward)
 */
WalletPass.prototype.markCompleted = async function() {
  this.pass_status = 'completed'
  
  // Schedule expiration 30 days from now
  await this.scheduleExpiration(30)
  
  await this.save()
}

export default WalletPass
