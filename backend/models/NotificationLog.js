import { DataTypes, Op } from 'sequelize'
import sequelize from '../config/database.js'
import crypto from 'crypto'

const NotificationLog = sequelize.define('NotificationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // References
  campaign_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'notification_campaigns',
      key: 'campaign_id'
    }
  },
  customer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Secure customer ID (cust_*)'
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  // Notification Details
  notification_type: {
    type: DataTypes.ENUM('campaign', 'trigger', 'manual', 'system'),
    defaultValue: 'campaign'
  },
  channel: {
    type: DataTypes.ENUM('email', 'sms', 'push', 'wallet', 'in_app'),
    allowNull: false
  },
  // Message Content
  subject: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  message_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_template_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Recipient Information
  recipient_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  recipient_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  recipient_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Delivery Status and Tracking
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed', 'bounced', 'unsubscribed'),
    defaultValue: 'pending'
  },
  // Timestamps for tracking delivery pipeline
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  opened_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clicked_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  converted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Provider and External IDs
  provider: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Email/SMS provider used'
  },
  external_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Provider-specific message ID'
  },
  external_status: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Provider-specific status'
  },
  // Error Handling
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  error_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  max_retries: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  // Cost Tracking
  cost: {
    type: DataTypes.DECIMAL(6, 4),
    defaultValue: 0.0000
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'SAR'
  },
  // Personalization and Context
  personalization_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Data used for message personalization'
  },
  context_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context about when/why message was sent'
  },
  // A/B Testing
  ab_test_variant: {
    type: DataTypes.ENUM('A', 'B'),
    allowNull: true
  },
  // Interaction Tracking
  click_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Details about links clicked'
  },
  conversion_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Details about conversion action'
  },
  // Device and Location (for analytics)
  device_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  location: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Geographic location data'
  },
  // Delivery Quality Metrics
  delivery_latency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken to deliver (in seconds)'
  },
  open_latency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken to open after delivery (in seconds)'
  },
  // Compliance and Privacy
  unsubscribe_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  gdpr_consent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'notification_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['campaign_id']
    },
    {
      fields: ['customer_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['channel']
    },
    {
      fields: ['status']
    },
    {
      fields: ['sent_at']
    },
    {
      fields: ['delivered_at']
    },
    {
      fields: ['external_id']
    },
    {
      fields: ['unsubscribe_token']
    },
    {
      fields: ['created_at']
    }
  ]
})

// Instance methods
NotificationLog.prototype.markAsSent = async function(externalId = null, provider = null) {
  this.status = 'sent'
  this.sent_at = new Date()
  if (externalId) this.external_id = externalId
  if (provider) this.provider = provider
  await this.save()
  return this
}

NotificationLog.prototype.markAsDelivered = async function(deliveredAt = null) {
  this.status = 'delivered'
  this.delivered_at = deliveredAt || new Date()

  // Calculate delivery latency
  if (this.sent_at) {
    this.delivery_latency = Math.floor((this.delivered_at - this.sent_at) / 1000)
  }

  await this.save()
  return this
}

NotificationLog.prototype.markAsOpened = async function(openedAt = null, deviceType = null, userAgent = null) {
  this.status = 'opened'
  this.opened_at = openedAt || new Date()

  if (deviceType) this.device_type = deviceType
  if (userAgent) this.user_agent = userAgent

  // Calculate open latency
  if (this.delivered_at) {
    this.open_latency = Math.floor((this.opened_at - this.delivered_at) / 1000)
  }

  await this.save()
  return this
}

NotificationLog.prototype.markAsClicked = async function(clickData = null) {
  this.status = 'clicked'
  this.clicked_at = new Date()

  if (clickData) this.click_data = clickData

  await this.save()
  return this
}

NotificationLog.prototype.markAsConverted = async function(conversionData = null) {
  this.status = 'converted'
  this.converted_at = new Date()

  if (conversionData) this.conversion_data = conversionData

  await this.save()
  return this
}

NotificationLog.prototype.markAsFailed = async function(errorMessage, errorCode = null) {
  this.status = 'failed'
  this.failed_at = new Date()
  this.error_message = errorMessage
  if (errorCode) this.error_code = errorCode

  await this.save()
  return this
}

NotificationLog.prototype.shouldRetry = function() {
  return this.status === 'failed' &&
         this.retry_count < this.max_retries &&
         !['bounced', 'unsubscribed'].includes(this.external_status)
}

NotificationLog.prototype.incrementRetry = async function() {
  this.retry_count += 1
  this.status = 'pending'
  await this.save()
  return this
}

NotificationLog.prototype.generateUnsubscribeToken = function() {
  if (!this.unsubscribe_token) {
    this.unsubscribe_token = crypto
      .createHash('sha256')
      .update(`${this.id}-${this.customer_id}-${Date.now()}`)
      .digest('hex')
  }
  return this.unsubscribe_token
}

// Static methods
NotificationLog.getDeliveryStats = async function(campaignId = null, businessId = null, dateRange = null) {
  const whereClause = {}

  if (campaignId) whereClause.campaign_id = campaignId
  if (businessId) whereClause.business_id = businessId

  if (dateRange) {
    whereClause.created_at = {
      [Op.between]: [dateRange.start, dateRange.end]
    }
  }

  const logs = await this.findAll({ where: whereClause })

  const stats = {
    total: logs.length,
    sent: logs.filter(log => ['sent', 'delivered', 'opened', 'clicked', 'converted'].includes(log.status)).length,
    delivered: logs.filter(log => ['delivered', 'opened', 'clicked', 'converted'].includes(log.status)).length,
    opened: logs.filter(log => ['opened', 'clicked', 'converted'].includes(log.status)).length,
    clicked: logs.filter(log => ['clicked', 'converted'].includes(log.status)).length,
    converted: logs.filter(log => log.status === 'converted').length,
    failed: logs.filter(log => log.status === 'failed').length,
    bounced: logs.filter(log => log.external_status === 'bounced').length
  }

  // Calculate rates
  stats.delivery_rate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0
  stats.open_rate = stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0
  stats.click_rate = stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0
  stats.conversion_rate = stats.delivered > 0 ? Math.round((stats.converted / stats.delivered) * 100) : 0

  return stats
}

export default NotificationLog