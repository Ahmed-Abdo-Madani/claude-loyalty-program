import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

/**
 * DeviceRegistration Model
 *
 * Junction table for many-to-many relationship between devices and wallet passes.
 * Tracks which devices are registered to receive updates for which passes.
 *
 * Apple Web Service Protocol Flow:
 * 1. Device installs pass → POST /v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}
 * 2. Backend creates DeviceRegistration entry
 * 3. When pass updates → Backend sends push notification to all registered devices
 * 4. Device requests updated pass → GET /v1/passes/{passTypeId}/{serialNumber}
 * 5. Device deletes pass → DELETE /v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}
 * 6. Backend removes DeviceRegistration entry
 *
 * Key Features:
 * - One device can be registered to multiple passes (e.g., multiple loyalty cards)
 * - One pass can be registered to multiple devices (e.g., one customer with iPhone and iPad)
 * - Tracks last_checked_at for analytics (how often device checks for updates)
 */
const DeviceRegistration = sequelize.define('DeviceRegistration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Foreign key to devices table
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id'
    },
    comment: 'Reference to device record'
  },
  // Foreign key to wallet_passes table
  wallet_pass_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wallet_passes',
      key: 'id'
    },
    comment: 'Reference to wallet pass record'
  },
  // When this registration was created (device added pass to wallet)
  registered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When device registered for this pass'
  },
  // Last time device checked for updates for this pass
  // Updated by GET /v1/devices/{deviceId}/registrations/{passTypeId}?passesUpdatedSince={tag}
  last_checked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Last time device checked for pass updates'
  }
}, {
  tableName: 'device_registrations',
  timestamps: false, // Using custom timestamp fields
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['device_id', 'wallet_pass_id'],
      name: 'unique_device_wallet_pass'
    },
    {
      fields: ['device_id'],
      name: 'idx_device_registrations_device'
    },
    {
      fields: ['wallet_pass_id'],
      name: 'idx_device_registrations_wallet_pass'
    },
    {
      fields: ['last_checked_at'],
      name: 'idx_device_registrations_last_checked'
    }
  ]
})

// ========== INSTANCE METHODS ==========

/**
 * Update last_checked_at timestamp
 */
DeviceRegistration.prototype.updateLastChecked = async function() {
  this.last_checked_at = new Date()
  await this.save()
  return this
}

/**
 * Check if registration is recent (within last 7 days)
 */
DeviceRegistration.prototype.isRecent = function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return this.registered_at > sevenDaysAgo
}

/**
 * Check if device actively checks for updates (checked in last 24 hours)
 */
DeviceRegistration.prototype.isActivelyChecking = function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return this.last_checked_at > oneDayAgo
}

// ========== CLASS METHODS ==========

/**
 * Register device for pass updates
 * @param {number} deviceId - Device ID
 * @param {number} walletPassId - Wallet pass ID
 * @returns {Promise<DeviceRegistration>}
 */
DeviceRegistration.registerDevice = async function(deviceId, walletPassId) {
  const [registration, created] = await this.findOrCreate({
    where: {
      device_id: deviceId,
      wallet_pass_id: walletPassId
    },
    defaults: {
      registered_at: new Date(),
      last_checked_at: new Date()
    }
  })

  // Update last_checked_at if already registered
  if (!created) {
    await registration.updateLastChecked()
  }

  return registration
}

/**
 * Unregister device from pass updates
 * @param {number} deviceId - Device ID
 * @param {number} walletPassId - Wallet pass ID
 * @returns {Promise<boolean>} True if registration was deleted
 */
DeviceRegistration.unregisterDevice = async function(deviceId, walletPassId) {
  const result = await this.destroy({
    where: {
      device_id: deviceId,
      wallet_pass_id: walletPassId
    }
  })
  return result > 0
}

/**
 * Get all devices registered for a specific pass
 * @param {number} walletPassId - Wallet pass ID
 * @returns {Promise<DeviceRegistration[]>}
 */
DeviceRegistration.getDevicesForPass = async function(walletPassId) {
  return await this.findAll({
    where: { wallet_pass_id: walletPassId },
    include: [{
      model: sequelize.models.Device,
      as: 'device',
      attributes: ['id', 'push_token', 'device_library_identifier', 'device_info', 'last_seen_at']
    }],
    order: [['registered_at', 'DESC']]
  })
}

/**
 * Get all passes registered for a specific device
 * @param {number} deviceId - Device ID
 * @returns {Promise<DeviceRegistration[]>}
 */
DeviceRegistration.getPassesForDevice = async function(deviceId) {
  return await this.findAll({
    where: { device_id: deviceId },
    include: [{
      model: sequelize.models.WalletPass,
      as: 'walletPass'
    }],
    order: [['registered_at', 'DESC']]
  })
}

/**
 * Get all passes updated since a given tag for a device
 * @param {number} deviceId - Device ID
 * @param {string} passTypeId - Pass type identifier
 * @param {string} updatesSinceTag - Unix timestamp or ISO date
 * @returns {Promise<string[]>} Array of serial numbers
 */
DeviceRegistration.getUpdatedPassesForDevice = async function(deviceId, passTypeId, updatesSinceTag) {
  // Query registrations with wallet passes that have been updated since the given tag
  const registrations = await this.findAll({
    where: { device_id: deviceId },
    include: [{
      model: sequelize.models.WalletPass,
      as: 'walletPass',
      where: {
        wallet_type: 'apple',
        pass_status: 'active',
        last_updated_tag: {
          [sequelize.Sequelize.Op.gt]: updatesSinceTag || '0'
        }
      },
      required: true
    }]
  })

  // Extract serial numbers
  return registrations
    .map(reg => reg.walletPass.wallet_serial)
    .filter(serial => serial !== null)
}

/**
 * Clean up stale registrations (not checked in 90+ days)
 * @returns {Promise<number>} Number of registrations deleted
 */
DeviceRegistration.cleanupStaleRegistrations = async function() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const result = await this.destroy({
    where: {
      last_checked_at: {
        [sequelize.Sequelize.Op.lt]: ninetyDaysAgo
      }
    }
  })
  return result
}

export default DeviceRegistration
