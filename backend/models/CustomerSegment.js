import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const CustomerSegment = sequelize.define('CustomerSegment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  segment_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Secure segment ID (seg_*)'
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  // Basic Information
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3B82F6',
    comment: 'Hex color code for segment visualization'
  },
  // Segment Type and Configuration
  type: {
    type: DataTypes.ENUM('static', 'dynamic', 'behavioral', 'demographic', 'engagement'),
    defaultValue: 'dynamic'
  },
  is_predefined: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is a system-defined segment'
  },
  auto_update: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether segment membership updates automatically'
  },
  // Segmentation Criteria
  criteria: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    comment: 'Segmentation rules and conditions'
  },
  // Demographic Criteria
  age_range: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '{ min: 18, max: 65 }'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other', 'any'),
    defaultValue: 'any'
  },
  location_criteria: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'City, region, or geographic filters'
  },
  // Behavioral Criteria
  visit_frequency: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '{ min_visits: 5, period_days: 30 }'
  },
  spending_range: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '{ min_amount: 100, max_amount: 1000 }'
  },
  last_activity_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Days since last activity (for churning customers)'
  },
  // Engagement Criteria
  engagement_score_range: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '{ min_score: 70, max_score: 100 }'
  },
  loyalty_tier: {
    type: DataTypes.ENUM('new', 'bronze', 'silver', 'gold', 'platinum'),
    allowNull: true
  },
  communication_preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Notification channel preferences'
  },
  // Lifecycle and Status
  lifecycle_stages: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of lifecycle stages to include'
  },
  customer_status: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of customer statuses to include'
  },
  // Date-based Criteria
  signup_date_range: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '{ start_date: "2024-01-01", end_date: "2024-12-31" }'
  },
  birthday_month: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Month for birthday segments (1-12)'
  },
  // Advanced Filters
  offer_preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Preferred offer types or categories'
  },
  device_types: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Mobile, desktop, tablet preferences'
  },
  tags_filter: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Required or excluded customer tags'
  },
  // Performance Metrics
  customer_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_calculated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  calculation_status: {
    type: DataTypes.ENUM('pending', 'calculating', 'completed', 'error'),
    defaultValue: 'pending'
  },
  // Usage Statistics
  campaign_usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of campaigns that used this segment'
  },
  avg_engagement_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: 'Average engagement rate for campaigns using this segment'
  },
  avg_conversion_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  // Segment Health
  growth_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: 'Monthly growth rate of segment size'
  },
  churn_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: 'Monthly churn rate from segment'
  },
  last_notification_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of last notification sent to this segment'
  },
  // Settings and Configuration
  refresh_frequency: {
    type: DataTypes.ENUM('real_time', 'hourly', 'daily', 'weekly', 'manual'),
    defaultValue: 'daily'
  },
  exclude_unsubscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  exclude_inactive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Metadata
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'User ID who created the segment'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'customer_segments',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['segment_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['is_predefined']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['last_calculated_at']
    },
    {
      fields: ['customer_count']
    },
    {
      fields: ['last_notification_sent_at']
    }
  ],
  hooks: {
    beforeValidate: async (segment) => {
      if (!segment.segment_id) {
        segment.segment_id = SecureIDGenerator.generateSegmentID()
      }
    }
  }
})

// Instance methods
CustomerSegment.prototype.calculateCustomerCount = async function() {
  // This would integrate with CustomerSegmentationService
  // For now, we'll just mark it as pending calculation
  this.calculation_status = 'pending'
  this.last_calculated_at = new Date()
  await this.save()
  return this
}

CustomerSegment.prototype.getGrowthTrend = function(periodDays = 30) {
  // Calculate growth trend over the specified period
  // This would require historical data tracking
  return {
    current_size: this.customer_count,
    growth_rate: this.growth_rate,
    trend: this.growth_rate > 0 ? 'growing' : this.growth_rate < 0 ? 'declining' : 'stable'
  }
}

CustomerSegment.prototype.getPerformanceMetrics = function() {
  return {
    customer_count: this.customer_count,
    campaign_usage: this.campaign_usage_count,
    avg_engagement: parseFloat(this.avg_engagement_rate),
    avg_conversion: parseFloat(this.avg_conversion_rate),
    growth_rate: parseFloat(this.growth_rate),
    churn_rate: parseFloat(this.churn_rate)
  }
}

CustomerSegment.prototype.updatePerformanceMetrics = async function(metrics) {
  if (metrics.engagement_rate !== undefined) {
    this.avg_engagement_rate = metrics.engagement_rate
  }
  if (metrics.conversion_rate !== undefined) {
    this.avg_conversion_rate = metrics.conversion_rate
  }
  if (metrics.growth_rate !== undefined) {
    this.growth_rate = metrics.growth_rate
  }
  if (metrics.churn_rate !== undefined) {
    this.churn_rate = metrics.churn_rate
  }

  await this.save()
  return this
}

CustomerSegment.prototype.incrementUsage = async function() {
  this.campaign_usage_count += 1
  await this.save()
  return this
}

CustomerSegment.prototype.updateLastNotificationSent = async function() {
  this.last_notification_sent_at = new Date()
  await this.save()
  return this
}

CustomerSegment.prototype.isEligible = function(customer) {
  // Basic eligibility check based on criteria
  // This is a simplified version - full implementation would be in CustomerSegmentationService

  if (!this.is_active) return false

  // Check lifecycle stage
  if (this.lifecycle_stages && this.lifecycle_stages.length > 0) {
    if (!this.lifecycle_stages.includes(customer.lifecycle_stage)) return false
  }

  // Check customer status
  if (this.customer_status && this.customer_status.length > 0) {
    if (!this.customer_status.includes(customer.status)) return false
  }

  // Check engagement score
  if (this.engagement_score_range) {
    const customerScore = customer.getEngagementScore()
    if (customerScore < this.engagement_score_range.min_score ||
        customerScore > this.engagement_score_range.max_score) {
      return false
    }
  }

  // Check last activity
  if (this.last_activity_days !== null) {
    if (!customer.last_activity_date) return false
    const daysSinceActivity = Math.floor((new Date() - customer.last_activity_date) / (1000 * 60 * 60 * 24))
    if (daysSinceActivity > this.last_activity_days) return false
  }

  return true
}

// Static methods for predefined segments
CustomerSegment.createPredefinedSegments = async function(businessId) {
  const predefinedSegments = [
    {
      business_id: businessId,
      name: 'Inactive 7 Days',
      description: 'Customers who haven\'t visited in the last 7 days',
      type: 'behavioral',
      is_predefined: true,
      auto_update: true,
      color: '#F59E0B',
      last_activity_days: 7,
      customer_status: ['active', 'churning']
    },
    {
      business_id: businessId,
      name: 'Inactive 14 Days',
      description: 'Customers who haven\'t visited in the last 14 days',
      type: 'behavioral',
      is_predefined: true,
      auto_update: true,
      color: '#F97316',
      last_activity_days: 14,
      customer_status: ['active', 'churning']
    },
    {
      business_id: businessId,
      name: 'Inactive 30 Days',
      description: 'Customers who haven\'t visited in the last 30 days',
      type: 'behavioral',
      is_predefined: true,
      auto_update: true,
      color: '#EF4444',
      last_activity_days: 30,
      customer_status: ['active', 'churning', 'inactive']
    },
    {
      business_id: businessId,
      name: 'New Customers',
      description: 'Recently acquired customers (1-2 visits)',
      type: 'demographic',
      is_predefined: true,
      auto_update: true,
      color: '#3B82F6',
      lifecycle_stages: ['new_customer'],
      visit_frequency: { min_visits: 1, max_visits: 2 }
    },
    {
      business_id: businessId,
      name: 'Repeat Customers',
      description: 'Customers with 3-9 visits',
      type: 'behavioral',
      is_predefined: true,
      auto_update: true,
      color: '#10B981',
      lifecycle_stages: ['repeat_customer'],
      visit_frequency: { min_visits: 3, max_visits: 9 }
    },
    {
      business_id: businessId,
      name: 'VIP Customers',
      description: 'High-value customers with 10+ visits or high lifetime value',
      type: 'behavioral',
      is_predefined: true,
      auto_update: true,
      color: '#8B5CF6',
      lifecycle_stages: ['loyal_customer', 'vip_customer'],
      visit_frequency: { min_visits: 10 },
      spending_range: { min_amount: 500 },
      customer_status: ['active', 'vip']
    }
  ]

  const createdSegments = []
  for (const segmentData of predefinedSegments) {
    try {
      const segment = await this.create(segmentData)
      createdSegments.push(segment)
    } catch (error) {
      console.error(`Failed to create predefined segment: ${segmentData.name}`, error)
    }
  }

  return createdSegments
}

export default CustomerSegment