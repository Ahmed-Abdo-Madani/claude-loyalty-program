import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const Subscription = sequelize.define('Subscription', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateSubscriptionID(),
    allowNull: false
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  plan_type: {
    type: DataTypes.ENUM('free', 'professional', 'enterprise'),
    allowNull: false,
    defaultValue: 'free',
    comment: 'Subscription plan type'
  },
  status: {
    type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
    allowNull: false,
    defaultValue: 'trial',
    comment: 'Current subscription status'
  },
  trial_end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Trial period end date'
  },
  billing_cycle_start: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Start date of current billing cycle'
  },
  next_billing_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Next billing date for subscription renewal'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Subscription amount in SAR'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'SAR',
    comment: 'Currency code (ISO 4217)'
  },
  moyasar_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Moyasar stored payment method token'
  },
  payment_method_last4: {
    type: DataTypes.STRING(4),
    allowNull: true,
    comment: 'Last 4 digits of payment card'
  },
  payment_method_brand: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Payment card brand (Visa, Mastercard, etc.)'
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when subscription was cancelled'
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for subscription cancellation'
  },
  grace_period_end: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'End date of grace period after payment failures'
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
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['business_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['next_billing_date']
    },
    {
      fields: ['trial_end_date']
    }
  ]
})

// Instance Methods
Subscription.prototype.isActive = function() {
  return this.status === 'active' || this.status === 'trial'
}

Subscription.prototype.isTrial = function() {
  return this.status === 'trial' && this.trial_end_date && new Date(this.trial_end_date) > new Date()
}

Subscription.prototype.isExpired = function() {
  if (this.status === 'trial' && this.trial_end_date) {
    return new Date(this.trial_end_date) < new Date()
  }
  return this.status === 'expired'
}

Subscription.prototype.canUpgrade = function() {
  if (this.plan_type === 'enterprise') return false
  return this.isActive()
}

Subscription.prototype.canDowngrade = function() {
  if (this.plan_type === 'free') return false
  return this.isActive()
}

Subscription.prototype.calculateProration = function(newPlanAmount) {
  // Guard against missing billing dates
  if (!this.billing_cycle_start || !this.next_billing_date) return 0
  
  const now = new Date()
  const cycleStart = new Date(this.billing_cycle_start)
  const cycleEnd = new Date(this.next_billing_date)
  
  // Guard against invalid date ranges
  if (cycleEnd <= cycleStart) return 0
  
  const totalDays = Math.ceil((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24))
  
  // Guard against zero or negative day cycles
  if (totalDays <= 0) return 0
  
  const remainingDays = Math.max(0, Math.ceil((cycleEnd - now) / (1000 * 60 * 60 * 24)))
  
  // Normalize and validate current amount
  const currentAmount = parseFloat(this.amount)
  if (isNaN(currentAmount)) return 0
  
  // Normalize and validate new plan amount
  const normalizedNewAmount = parseFloat(newPlanAmount)
  if (isNaN(normalizedNewAmount)) return 0
  
  const currentPlanDailyRate = currentAmount / totalDays
  const newPlanDailyRate = normalizedNewAmount / totalDays
  
  const unusedCredit = currentPlanDailyRate * remainingDays
  const newPlanCost = newPlanDailyRate * remainingDays
  
  return Math.max(0, newPlanCost - unusedCredit)
}

Subscription.prototype.markAsCancelled = async function(reason = null) {
  this.status = 'cancelled'
  this.cancelled_at = new Date()
  if (reason) {
    this.cancellation_reason = reason
  }
  await this.save()
}

export default Subscription
