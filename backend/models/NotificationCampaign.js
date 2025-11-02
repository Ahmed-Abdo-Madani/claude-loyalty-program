import { DataTypes, Op } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const NotificationCampaign = sequelize.define('NotificationCampaign', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  campaign_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Secure campaign ID (camp_*)'
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  // Campaign Basic Info
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Campaign Type and Channel
  type: {
    type: DataTypes.ENUM('manual', 'automated', 'scheduled'),
    allowNull: false,
    defaultValue: 'manual'
  },
  campaign_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    validate: {
      isIn: {
        args: [['lifecycle', 'promotional', 'transactional', 'new_offer_announcement', 'custom_promotion', 'seasonal_campaign']],
        msg: 'campaign_type must be one of: lifecycle, promotional, transactional, new_offer_announcement, custom_promotion, seasonal_campaign'
      }
    },
    comment: 'Specific campaign category for promotional and marketing campaigns'
  },
  channels: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['email'],
    comment: 'Array of channels: email, sms, push, wallet'
  },
  // Campaign Status
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'cancelled'),
    defaultValue: 'draft'
  },
  // Targeting and Segmentation
  target_type: {
    type: DataTypes.ENUM('all_customers', 'segment', 'individual', 'custom_filter'),
    defaultValue: 'all_customers'
  },
  target_segment_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Reference to customer segment if target_type is segment'
  },
  target_customer_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of customer IDs for individual targeting'
  },
  target_criteria: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Custom filtering criteria for dynamic targeting'
  },
  linked_offer_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'offers',
      key: 'public_id'
    },
    comment: 'Optional offer ID for tracking conversions from campaign'
  },
  // Message Content
  message_template: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    comment: 'Template content for each channel'
  },
  personalization_fields: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Fields to personalize in the message'
  },
  // Scheduling
  send_immediately: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Riyadh'
  },
  // Automation Triggers (for automated campaigns)
  trigger_type: {
    type: DataTypes.ENUM('birthday', 'progress_milestone', 'reward_completion', 'inactivity', 'new_customer', 'custom'),
    allowNull: true
  },
  trigger_conditions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Conditions that trigger automated campaign'
  },
  // A/B Testing
  is_ab_test: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ab_test_split: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    comment: 'Percentage split for A/B test (0-100)'
  },
  ab_test_variant: {
    type: DataTypes.ENUM('A', 'B'),
    allowNull: true
  },
  ab_test_parent_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Parent campaign ID for A/B test variants'
  },
  // Performance Tracking
  total_recipients: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_sent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_delivered: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_opened: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_clicked: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_converted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_failed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Campaign Timing
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Budget and Costs (for paid channels like SMS)
  budget_limit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  cost_per_message: {
    type: DataTypes.DECIMAL(6, 4),
    defaultValue: 0.0000
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  // Settings and Preferences
  frequency_cap: {
    type: DataTypes.JSON,
    defaultValue: {
      max_per_day: 1,
      max_per_week: 3,
      max_per_month: 10
    }
  },
  unsubscribe_handling: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Metadata
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'User ID who created the campaign'
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'notification_campaigns',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['campaign_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['trigger_type']
    },
    {
      fields: ['scheduled_at']
    },
    {
      fields: ['started_at']
    },
    {
      fields: ['campaign_type']
    },
    {
      fields: ['linked_offer_id']
    }
  ],
  hooks: {
    beforeValidate: async (campaign) => {
      if (!campaign.campaign_id) {
        campaign.campaign_id = SecureIDGenerator.generateCampaignID()
      }
    }
  }
})

// Instance methods
NotificationCampaign.prototype.getDeliveryRate = function() {
  if (this.total_sent === 0) return 0
  return Math.round((this.total_delivered / this.total_sent) * 100)
}

NotificationCampaign.prototype.getOpenRate = function() {
  if (this.total_delivered === 0) return 0
  return Math.round((this.total_opened / this.total_delivered) * 100)
}

NotificationCampaign.prototype.getClickRate = function() {
  if (this.total_opened === 0) return 0
  return Math.round((this.total_clicked / this.total_opened) * 100)
}

NotificationCampaign.prototype.getConversionRate = function() {
  if (this.total_delivered === 0) return 0
  return Math.round((this.total_converted / this.total_delivered) * 100)
}

NotificationCampaign.prototype.getROI = function() {
  if (this.total_cost === 0) return 0
  // Assuming average conversion value of 50 SAR
  const averageConversionValue = 50
  const totalRevenue = this.total_converted * averageConversionValue
  return Math.round(((totalRevenue - this.total_cost) / this.total_cost) * 100)
}

NotificationCampaign.prototype.getConversionMetrics = async function() {
  // Dynamic ESM imports
  const { default: NotificationLog } = await import('./NotificationLog.js')
  
  // Fetch conversion data from NotificationLog
  const conversions = await NotificationLog.findAll({
    where: {
      campaign_id: this.campaign_id,
      status: 'converted'
    },
    attributes: ['customer_id', 'converted_at', 'conversion_value', 'created_at']
  })
  
  const conversionCount = conversions.length
  const conversionRate = this.total_delivered > 0 
    ? Math.round((conversionCount / this.total_delivered) * 100) 
    : 0
  
  // Calculate average time to conversion
  let avgTimeToConvert = 0
  if (conversionCount > 0) {
    const totalTime = conversions.reduce((sum, log) => {
      const sentTime = new Date(log.created_at).getTime()
      const convertTime = new Date(log.converted_at).getTime()
      return sum + (convertTime - sentTime)
    }, 0)
    avgTimeToConvert = Math.round(totalTime / conversionCount / (1000 * 60 * 60)) // hours
  }
  
  // If linked offer exists, fetch offer redemption data
  let offerRedemptions = 0
  if (this.linked_offer_id) {
    const { default: CustomerProgress } = await import('./CustomerProgress.js')
    offerRedemptions = await CustomerProgress.count({
      where: {
        offer_id: this.linked_offer_id,
        is_completed: true,
        updated_at: {
          [Op.gte]: this.started_at || this.created_at
        }
      }
    })
  }
  
  return {
    conversions: conversionCount,
    conversion_rate: conversionRate,
    avg_time_to_convert: avgTimeToConvert,
    offer_redemptions: offerRedemptions
  }
}

NotificationCampaign.prototype.canSend = function() {
  return this.status === 'active' &&
         (!this.scheduled_at || this.scheduled_at <= new Date()) &&
         (!this.budget_limit || this.total_cost < this.budget_limit)
}

NotificationCampaign.prototype.updateStats = async function(stats) {
  // Update campaign statistics
  this.total_sent += stats.sent || 0
  this.total_delivered += stats.delivered || 0
  this.total_opened += stats.opened || 0
  this.total_clicked += stats.clicked || 0
  this.total_converted += stats.converted || 0
  this.total_failed += stats.failed || 0
  this.total_cost += stats.cost || 0

  await this.save()
  return this
}

NotificationCampaign.prototype.markAsStarted = async function() {
  this.status = 'active'
  this.started_at = new Date()
  await this.save()
  return this
}

NotificationCampaign.prototype.markAsCompleted = async function() {
  this.status = 'completed'
  this.completed_at = new Date()
  await this.save()
  return this
}

export default NotificationCampaign