import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

/**
 * Device Model
 *
 * Represents an iOS device registered to receive Apple Wallet pass updates.
 * Each device is uniquely identified by its device_library_identifier (provided by PassKit).
 *
 * Used for:
 * - Storing device push tokens for APNs notifications
 * - Tracking device-to-pass registrations (many-to-many via device_registrations)
 * - Managing device lifecycle (registration, updates, unregistration)
 */
const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Apple Device Library Identifier
  // Unique identifier provided by PassKit (iOS Wallet app)
  // Format: Alphanumeric string, typically 40 characters
  device_library_identifier: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique device identifier from PassKit'
  },
  // APNs Push Token
  // Token for sending push notifications to this device
  // Provided by device during registration
  push_token: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Apple Push Notification service token'
  },
  // Device Metadata (JSONB)
  // Stores additional device information:
  // - user_agent: HTTP User-Agent string (use this for device lookup, NOT a separate column)
  // - platform: 'iOS'
  // - os_version: iOS version (e.g., '17.2')
  // - device_model: iPhone model (e.g., 'iPhone14,2')
  // 
  // ⚠️ IMPORTANT: user_agent is stored in this JSONB column, not as a separate column
  // To query by user_agent: sequelize.where(sequelize.cast(sequelize.json('device_info.user_agent'), 'text'), 'Safari...')
  device_info: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Device metadata (user agent, iOS version, etc.)'
  },
  // Last time this device was seen (any API call)
  last_seen_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Last time device made a request to web service'
  }
}, {
  tableName: 'devices',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['device_library_identifier'],
      name: 'idx_devices_library_id'
    },
    {
      fields: ['push_token'],
      name: 'idx_devices_push_token'
    },
    {
      fields: ['last_seen_at'],
      name: 'idx_devices_last_seen'
    }
  ]
})

// ========== INSTANCE METHODS ==========

/**
 * Update device's last seen timestamp
 */
Device.prototype.updateLastSeen = async function() {
  this.last_seen_at = new Date()
  await this.save()
  return this
}

/**
 * Update device's push token (if changed)
 */
Device.prototype.updatePushToken = async function(newPushToken) {
  if (this.push_token !== newPushToken) {
    this.push_token = newPushToken
    await this.save()
  }
  return this
}

/**
 * Check if device is active (seen in last 30 days)
 */
Device.prototype.isActive = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return this.last_seen_at > thirtyDaysAgo
}

// ========== CLASS METHODS ==========

/**
 * Find or create device by device_library_identifier
 * @param {string} deviceLibraryId - Device library identifier from PassKit
 * @param {string} pushToken - APNs push token
 * @param {object} deviceInfo - Additional device metadata
 * @returns {Promise<Device>}
 */
Device.findOrCreateDevice = async function(deviceLibraryId, pushToken, deviceInfo = {}) {
  const [device, created] = await this.findOrCreate({
    where: { device_library_identifier: deviceLibraryId },
    defaults: {
      push_token: pushToken,
      device_info: deviceInfo,
      last_seen_at: new Date()
    }
  })

  // Update push token if device already existed
  if (!created && device.push_token !== pushToken) {
    await device.updatePushToken(pushToken)
  }

  // Update last seen
  if (!created) {
    await device.updateLastSeen()
  }

  return device
}

/**
 * Get all active devices (seen in last 30 days)
 * @returns {Promise<Device[]>}
 */
Device.getActiveDevices = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return await this.findAll({
    where: {
      last_seen_at: {
        [sequelize.Sequelize.Op.gte]: thirtyDaysAgo
      }
    },
    order: [['last_seen_at', 'DESC']]
  })
}

/**
 * Clean up inactive devices (not seen in 90+ days)
 * @returns {Promise<number>} Number of devices deleted
 */
Device.cleanupInactiveDevices = async function() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const result = await this.destroy({
    where: {
      last_seen_at: {
        [sequelize.Sequelize.Op.lt]: ninetyDaysAgo
      }
    }
  })
  return result
}

export default Device
