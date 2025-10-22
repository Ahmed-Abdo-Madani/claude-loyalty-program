/**
 * DeviceLog Model
 * 
 * Stores error logs from Apple Wallet PassKit devices
 * Used for debugging pass issues and monitoring device behavior
 */

import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const DeviceLog = sequelize.define('DeviceLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'devices',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'Associated device (if identifiable)'
  },
  log_message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Error message from PassKit'
  },
  log_level: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'error',
    comment: 'Log severity: error, warn, info'
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Device user agent string'
  },
  ip_address: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Client IP address'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional context (headers, request info)'
  },
  logged_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When log was received'
  }
}, {
  tableName: 'device_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['device_id']
    },
    {
      fields: ['logged_at']
    },
    {
      fields: ['log_level']
    }
  ]
})

/**
 * Log a message from a device
 */
DeviceLog.logMessage = async function(logMessage, options = {}) {
  const {
    deviceId = null,
    logLevel = 'error',
    userAgent = null,
    ipAddress = null,
    metadata = null
  } = options

  return await this.create({
    device_id: deviceId,
    log_message: logMessage,
    log_level: logLevel,
    user_agent: userAgent,
    ip_address: ipAddress,
    metadata,
    logged_at: new Date()
  })
}

/**
 * Get recent logs (last 100 by default)
 */
DeviceLog.getRecentLogs = async function(limit = 100, filters = {}) {
  const where = {}
  
  if (filters.deviceId) {
    where.device_id = filters.deviceId
  }
  
  if (filters.logLevel) {
    where.log_level = filters.logLevel
  }
  
  if (filters.since) {
    where.logged_at = { [sequelize.Sequelize.Op.gte]: filters.since }
  }

  return await this.findAll({
    where,
    order: [['logged_at', 'DESC']],
    limit,
    include: [
      {
        model: sequelize.models.Device,
        as: 'device',
        attributes: ['device_library_identifier', 'push_token', 'last_seen_at']
      }
    ]
  })
}

/**
 * Delete old logs (retention policy)
 */
DeviceLog.deleteOldLogs = async function(daysToKeep = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const deleted = await this.destroy({
    where: {
      logged_at: {
        [sequelize.Sequelize.Op.lt]: cutoffDate
      }
    }
  })

  return deleted
}

export default DeviceLog
