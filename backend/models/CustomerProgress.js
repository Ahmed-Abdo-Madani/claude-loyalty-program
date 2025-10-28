import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const CustomerProgress = sequelize.define('CustomerProgress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Secure customer ID (cust_*)'
  },
  offer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'offers',
      key: 'public_id'
    }
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  current_stamps: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  max_stamps: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  is_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rewards_claimed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reward_fulfilled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the reward was physically given to customer by branch manager'
  },
  fulfilled_by_branch: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'branches',
      key: 'public_id'
    },
    comment: 'Branch ID that fulfilled the reward'
  },
  fulfillment_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes from branch manager about prize fulfillment'
  },
  last_scan_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  wallet_pass_serial: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Unique identifier for wallet pass'
  },
  // Customer metadata
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  customer_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Analytics tracking
  total_scans: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  first_scan_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'customer_progress',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['customer_id', 'offer_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['offer_id']
    },
    {
      fields: ['is_completed']
    }
  ]
})

// Instance methods
CustomerProgress.prototype.addStamp = async function(incrementBy = 1) {
  const wasCompleted = this.is_completed

  this.current_stamps = Math.min(this.current_stamps + incrementBy, this.max_stamps)
  this.last_scan_date = new Date()
  this.total_scans = (this.total_scans || 0) + 1

  if (!this.first_scan_date) {
    this.first_scan_date = new Date()
  }

  // Check if completed
  if (!wasCompleted && this.current_stamps >= this.max_stamps) {
    this.is_completed = true
    this.completed_at = new Date()
  }

  await this.save()

  // Update Customer table metrics
  try {
    const { Customer } = await import('./index.js')

    // Increment total stamps and visits
    await Customer.increment(
      {
        total_stamps_earned: incrementBy,
        total_visits: 1  // Each scan = 1 visit
      },
      {
        where: { customer_id: this.customer_id },
        silent: true  // Don't trigger hooks
      }
    )

    // Update last activity date
    await Customer.update(
      { last_activity_date: new Date() },
      {
        where: { customer_id: this.customer_id },
        silent: true
      }
    )
  } catch (error) {
    console.error('⚠️ Failed to update Customer table metrics:', error.message)
    // Don't throw - progress already saved successfully
  }

  return this
}

CustomerProgress.prototype.claimReward = async function(branchId = null, notes = null) {
  if (!this.is_completed) {
    throw new Error('Cannot claim reward: progress not completed')
  }

  this.rewards_claimed = (this.rewards_claimed || 0) + 1
  
  // Set fulfillment tracking
  if (branchId) {
    this.reward_fulfilled_at = new Date()
    this.fulfilled_by_branch = branchId
    this.fulfillment_notes = notes
  }

  // Reset progress for next reward cycle
  this.current_stamps = 0
  this.is_completed = false
  this.completed_at = null

  await this.save()

  // Update Customer table reward count
  try {
    const { Customer } = await import('./index.js')

    // Increment total rewards claimed
    await Customer.increment(
      { total_rewards_claimed: 1 },
      {
        where: { customer_id: this.customer_id },
        silent: true
      }
    )

    // Update last activity date
    await Customer.update(
      { last_activity_date: new Date() },
      {
        where: { customer_id: this.customer_id },
        silent: true
      }
    )
  } catch (error) {
    console.error('⚠️ Failed to update Customer table reward count:', error.message)
    // Don't throw - progress already saved successfully
  }

  return this
}

CustomerProgress.prototype.markRewardFulfilled = async function(branchId, notes = null) {
  if (!this.is_completed) {
    throw new Error('Cannot mark reward fulfilled: progress not completed')
  }
  
  this.reward_fulfilled_at = new Date()
  this.fulfilled_by_branch = branchId
  this.fulfillment_notes = notes
  
  await this.save()
  
  return this
}

CustomerProgress.prototype.getProgressPercentage = function() {
  if (this.max_stamps === 0) return 0
  return Math.round((this.current_stamps / this.max_stamps) * 100)
}

CustomerProgress.prototype.getRemainingStamps = function() {
  return Math.max(0, this.max_stamps - this.current_stamps)
}

CustomerProgress.prototype.canClaimReward = function() {
  return this.is_completed && this.current_stamps >= this.max_stamps
}

CustomerProgress.prototype.getDaysToComplete = function() {
  if (!this.first_scan_date || this.is_completed) return null

  const daysSinceFirst = Math.floor((new Date() - this.first_scan_date) / (1000 * 60 * 60 * 24))
  if (daysSinceFirst === 0 || this.current_stamps <= 1) return null

  const averageStampsPerDay = this.current_stamps / daysSinceFirst
  const remainingStamps = this.getRemainingStamps()

  return Math.ceil(remainingStamps / averageStampsPerDay)
}

export default CustomerProgress