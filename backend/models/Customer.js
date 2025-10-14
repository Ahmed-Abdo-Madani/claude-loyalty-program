import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
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
  // Basic Information
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  name: {
    type: DataTypes.VIRTUAL,
    get() {
      const firstName = this.getDataValue('first_name') || ''
      const lastName = this.getDataValue('last_name') || ''
      const fullName = `${firstName} ${lastName}`.trim()
      return fullName || 'Unknown Customer'
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Customer Status and Lifecycle
  status: {
    type: DataTypes.ENUM('new', 'active', 'inactive', 'churning', 'vip'),
    defaultValue: 'new'
  },
  lifecycle_stage: {
    type: DataTypes.ENUM('prospect', 'new_customer', 'repeat_customer', 'loyal_customer', 'vip_customer'),
    defaultValue: 'prospect'
  },
  // Engagement Metrics
  total_visits: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_stamps_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_rewards_claimed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_lifetime_value: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  average_days_between_visits: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Activity Tracking
  first_visit_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_activity_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_scan_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Preferences and Settings
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      email_notifications: true,
      sms_notifications: true,
      push_notifications: true,
      birthday_offers: true,
      promotional_offers: true
    }
  },
  // Communication Preferences
  preferred_language: {
    type: DataTypes.ENUM('en', 'ar'),
    defaultValue: 'en'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Riyadh'
  },
  // Segmentation Fields
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  custom_fields: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  // Marketing Metrics
  acquisition_source: {
    type: DataTypes.ENUM('organic', 'referral', 'social', 'advertising', 'in_store', 'other'),
    defaultValue: 'organic'
  },
  referral_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Privacy and Compliance
  consent_marketing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  consent_data_processing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  gdpr_consent_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Notes and Comments
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'customers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['customer_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['email']
    },
    {
      fields: ['phone']
    },
    {
      fields: ['status']
    },
    {
      fields: ['lifecycle_stage']
    },
    {
      fields: ['last_activity_date']
    }
  ],
  // Add hooks for automatic secure ID generation
  hooks: {
    beforeCreate: async (customer) => {
      if (!customer.customer_id) {
        customer.customer_id = SecureIDGenerator.generateCustomerID()
      }
    }
  }
})

// Instance methods
Customer.prototype.getEngagementScore = function() {
  // Calculate engagement score based on various factors
  let score = 0

  // Recency (last activity within 30 days = +30 points)
  if (this.last_activity_date) {
    const daysSinceLastActivity = Math.floor((new Date() - this.last_activity_date) / (1000 * 60 * 60 * 24))
    if (daysSinceLastActivity <= 7) score += 30
    else if (daysSinceLastActivity <= 30) score += 20
    else if (daysSinceLastActivity <= 90) score += 10
  }

  // Frequency (visits per month)
  if (this.total_visits > 0 && this.first_visit_date) {
    const monthsSinceFirst = Math.max(1, Math.floor((new Date() - this.first_visit_date) / (1000 * 60 * 60 * 24 * 30)))
    const visitsPerMonth = this.total_visits / monthsSinceFirst
    if (visitsPerMonth >= 8) score += 25
    else if (visitsPerMonth >= 4) score += 20
    else if (visitsPerMonth >= 2) score += 15
    else if (visitsPerMonth >= 1) score += 10
  }

  // Monetary value (rewards claimed)
  if (this.total_rewards_claimed >= 5) score += 20
  else if (this.total_rewards_claimed >= 3) score += 15
  else if (this.total_rewards_claimed >= 1) score += 10

  // Engagement actions (stamps earned)
  if (this.total_stamps_earned >= 50) score += 15
  else if (this.total_stamps_earned >= 20) score += 10
  else if (this.total_stamps_earned >= 10) score += 5

  // Preference engagement (notifications enabled)
  if (this.preferences?.email_notifications) score += 5
  if (this.preferences?.sms_notifications) score += 5
  if (this.preferences?.push_notifications) score += 5

  return Math.min(100, score) // Cap at 100
}

Customer.prototype.getChurnRisk = function() {
  if (!this.last_activity_date) return 'high'

  const daysSinceLastActivity = Math.floor((new Date() - this.last_activity_date) / (1000 * 60 * 60 * 24))

  if (daysSinceLastActivity <= 7) return 'low'
  if (daysSinceLastActivity <= 30) return 'medium'
  if (daysSinceLastActivity <= 90) return 'high'
  return 'critical'
}

Customer.prototype.updateLifecycleStage = async function() {
  let newStage = 'prospect'

  if (this.total_visits === 0) {
    newStage = 'prospect'
  } else if (this.total_visits === 1) {
    newStage = 'new_customer'
  } else if (this.total_visits <= 5) {
    newStage = 'repeat_customer'
  } else if (this.total_rewards_claimed >= 3 || this.total_visits >= 10) {
    newStage = 'loyal_customer'
  }

  // VIP criteria: high lifetime value or very frequent visits
  if (this.total_lifetime_value >= 500 || this.total_visits >= 20) {
    newStage = 'vip_customer'
    this.status = 'vip'
  }

  this.lifecycle_stage = newStage
  await this.save()
  return this
}

Customer.prototype.isEligibleForBirthdayOffer = function() {
  if (!this.date_of_birth || !this.preferences?.birthday_offers) return false

  const today = new Date()
  const birthday = new Date(this.date_of_birth)

  // Check if birthday is within the next 7 days
  birthday.setFullYear(today.getFullYear())
  if (birthday < today) {
    birthday.setFullYear(today.getFullYear() + 1)
  }

  const daysUntilBirthday = Math.floor((birthday - today) / (1000 * 60 * 60 * 24))
  return daysUntilBirthday >= 0 && daysUntilBirthday <= 7
}

Customer.prototype.canReceiveNotification = function(channel) {
  const preferences = this.preferences || {}

  switch (channel) {
    case 'email':
      return preferences.email_notifications && this.email && this.consent_marketing
    case 'sms':
      return preferences.sms_notifications && this.phone && this.consent_marketing
    case 'push':
      return preferences.push_notifications && this.consent_marketing
    case 'wallet':
      return true // Wallet notifications are always allowed for existing customers
    default:
      return false
  }
}

// Auto-update lifecycle stage based on customer activity metrics
Customer.prototype.updateLifecycleStage = async function() {
  let newStage = this.lifecycle_stage

  // Determine lifecycle stage based on activity
  if (this.total_visits === 0) {
    newStage = 'prospect'
  } else if (this.total_visits === 1) {
    newStage = 'new_customer'
  } else if (this.total_visits <= 5) {
    newStage = 'repeat_customer'
  } else if (this.total_rewards_claimed >= 3 || this.total_visits >= 10) {
    newStage = 'loyal_customer'
  }

  // VIP status overrides other stages
  if (this.total_lifetime_value >= 500 || this.total_visits >= 20) {
    newStage = 'vip_customer'
  }

  // Only update if stage has changed
  if (newStage !== this.lifecycle_stage) {
    this.lifecycle_stage = newStage
    await this.save()
    console.log(`✨ Customer ${this.customer_id} lifecycle updated: ${this.lifecycle_stage} → ${newStage}`)
  }

  return newStage
}

export default Customer