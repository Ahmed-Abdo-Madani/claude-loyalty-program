/**
 * WebhookLog Model
 * 
 * Stores Moyasar webhook events for tracking, debugging, and audit purposes
 * Provides idempotency checks and comprehensive event logging
 */

import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const WebhookLog = sequelize.define('WebhookLog', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateWebhookLogID(),
    allowNull: false
  },
  webhook_event_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Moyasar event ID for idempotency checks'
  },
  event_type: {
    type: DataTypes.ENUM(
      'payment.paid',
      'payment.failed',
      'payment.refunded',
      'payment.authorized',
      'payment.captured',
      'other'
    ),
    allowNull: false,
    comment: 'Type of webhook event received'
  },
  payment_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'payments',
      key: 'public_id'
    },
    onDelete: 'SET NULL',
    comment: 'Associated payment record (if applicable)'
  },
  moyasar_payment_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Moyasar payment ID from webhook payload'
  },
  status: {
    type: DataTypes.ENUM('received', 'processed', 'failed', 'duplicate'),
    allowNull: false,
    defaultValue: 'received',
    comment: 'Processing status of webhook'
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Full webhook payload from Moyasar'
  },
  signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'HMAC signature from webhook headers'
  },
  signature_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether signature verification passed'
  },
  processing_error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if processing failed'
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when webhook was successfully processed'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'webhook_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['webhook_event_id'],
      unique: true,
      name: 'webhook_logs_event_id_idx'
    },
    {
      fields: ['moyasar_payment_id'],
      name: 'webhook_logs_moyasar_payment_id_idx'
    },
    {
      fields: ['event_type'],
      name: 'webhook_logs_event_type_idx'
    },
    {
      fields: ['status'],
      name: 'webhook_logs_status_idx'
    },
    {
      fields: ['created_at'],
      name: 'webhook_logs_created_at_idx'
    },
    {
      fields: ['payment_id'],
      name: 'webhook_logs_payment_id_idx'
    }
  ]
})

/**
 * Mark webhook as successfully processed
 */
WebhookLog.prototype.markAsProcessed = async function() {
  this.status = 'processed'
  this.processed_at = new Date()
  await this.save()
}

/**
 * Mark webhook as failed with error message
 * @param {string} error - Error message or error object
 */
WebhookLog.prototype.markAsFailed = async function(error) {
  this.status = 'failed'
  this.processing_error = typeof error === 'string' ? error : error.message || String(error)
  await this.save()
}

/**
 * Mark webhook as duplicate (already processed)
 */
WebhookLog.prototype.markAsDuplicate = async function() {
  this.status = 'duplicate'
  await this.save()
}

/**
 * Check if webhook has been processed
 * @returns {boolean}
 */
WebhookLog.prototype.isProcessed = function() {
  return this.status === 'processed'
}

/**
 * Check if webhook is a duplicate
 * @returns {boolean}
 */
WebhookLog.prototype.isDuplicate = function() {
  return this.status === 'duplicate'
}

/**
 * Log a webhook event
 * @param {string} eventId - Moyasar event ID
 * @param {string} eventType - Event type (payment.paid, etc.)
 * @param {object} payload - Full webhook payload
 * @param {string} signature - HMAC signature from headers
 * @param {boolean} verified - Whether signature was verified
 * @returns {Promise<WebhookLog>}
 */
WebhookLog.logWebhook = async function(eventId, eventType, payload, signature = null, verified = false) {
  // Extract payment ID from payload if available
  const moyasarPaymentId = payload?.data?.id || null

  return await this.create({
    webhook_event_id: eventId,
    event_type: eventType,
    moyasar_payment_id: moyasarPaymentId,
    payload,
    signature,
    signature_verified: verified,
    status: 'received'
  })
}

/**
 * Find webhook log by Moyasar event ID (for idempotency checks)
 * @param {string} eventId - Moyasar event ID
 * @returns {Promise<WebhookLog|null>}
 */
WebhookLog.findByEventId = async function(eventId) {
  return await this.findOne({
    where: { webhook_event_id: eventId }
  })
}

/**
 * Get recent webhook logs for monitoring
 * @param {number} limit - Number of logs to retrieve
 * @returns {Promise<WebhookLog[]>}
 */
WebhookLog.getRecentWebhooks = async function(limit = 50) {
  return await this.findAll({
    order: [['created_at', 'DESC']],
    limit,
    include: [
      {
        model: sequelize.models.Payment,
        as: 'payment',
        attributes: ['public_id', 'moyasar_payment_id', 'amount', 'status', 'payment_date']
      }
    ]
  })
}

export default WebhookLog
