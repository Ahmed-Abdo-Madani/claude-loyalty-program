import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const Counter = sequelize.define('Counter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  counter_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  branch_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  last_value: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
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
  tableName: 'counters',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['counter_type', 'year', 'business_id', 'branch_id'],
      name: 'idx_counters_unique'
    },
    {
      fields: ['counter_type'],
      name: 'idx_counters_type'
    }
  ]
})

/**
 * Get next counter value with atomic increment using database lock
 * @param {string} counterType - Type of counter (e.g., 'sale_number', 'receipt_number')
 * @param {number} year - Year for the counter
 * @param {object} options - Optional parameters
 * @param {string} options.businessId - Business ID for business-specific counters
 * @param {string} options.branchId - Branch ID for branch-specific counters
 * @param {object} options.transaction - Sequelize transaction
 * @returns {Promise<number>} Next counter value
 */
Counter.getNextValue = async function(counterType, year, options = {}) {
  const { businessId = null, branchId = null, transaction } = options
  
  if (!transaction) {
    throw new Error('Transaction is required for counter operations')
  }
  
  // Find or create counter with lock
  const [counter] = await Counter.findOrCreate({
    where: {
      counter_type: counterType,
      year,
      business_id: businessId,
      branch_id: branchId
    },
    defaults: {
      counter_type: counterType,
      year,
      business_id: businessId,
      branch_id: branchId,
      last_value: 0
    },
    lock: transaction.LOCK.UPDATE,
    transaction
  })
  
  // Increment counter
  counter.last_value += 1
  await counter.save({ transaction })
  
  return counter.last_value
}

export default Counter
