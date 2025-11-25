import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import logger from '../config/logger.js'

const Sale = sequelize.define('Sale', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateSaleID(),
    allowNull: false
  },
  sale_number: {
    type: DataTypes.STRING(50),
    allowNull: false
    // NOTE: Uniqueness enforced via composite index (business_id, sale_number) below
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  branch_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'branches',
      key: 'public_id'
    }
  },
  customer_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'customers',
      key: 'customer_id'
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'card', 'gift_offer', 'mixed'),
    allowNull: false
  },
  payment_details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('completed', 'cancelled', 'refunded'),
    defaultValue: 'completed',
    allowNull: false
  },
  sale_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  loyalty_discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  loyalty_redeemed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  created_by_manager: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  tableName: 'sales',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['business_id']
    },
    {
      fields: ['branch_id']
    },
    {
      fields: ['customer_id']
    },
    {
      fields: ['sale_date']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_method']
    },
    {
      unique: true,
      fields: ['business_id', 'sale_number'],
      name: 'unique_business_sale_number'
    },
    {
      fields: ['business_id', 'sale_date'],
      name: 'business_sale_date_idx'
    }
  ],
  hooks: {
    // CRITICAL: Use beforeValidate instead of beforeCreate
    // Sequelize runs validation BEFORE beforeCreate, so we must set sale_number
    // before validation to avoid "cannot be null" errors
    beforeValidate: async (sale, options) => {
      try {
        // CRITICAL: Auto-generate sale_number using database-backed counter with lock
        // 
        // TRANSACTION REQUIREMENT:
        // All Sale.create() calls MUST include a transaction option to ensure:
        // 1. Atomic counter increment (prevents duplicate sale numbers)
        // 2. Proper rollback on sale creation failure
        // 3. Database lock on counter table during increment
        //
        // Usage Pattern:
        //   const transaction = await sequelize.transaction()
        //   try {
        //     const sale = await Sale.create({ ... }, { transaction })
        //     await transaction.commit()
        //   } catch (error) {
        //     await transaction.rollback()
        //     throw error
        //   }
        //
        // This applies to:
        // - POS sale creation endpoints
        // - Seed scripts (if created in the future)
        // - Test helpers that create sales
        // - Any administrative tools that generate sales
        
        const currentYear = new Date().getFullYear()
        
        // Get transaction from options (required for atomic counter increment)
        const transaction = options.transaction
        if (!transaction) {
          const error = new Error('Transaction is required for sale creation to ensure atomic counter increment')
          logger.error('Sale creation failed - missing transaction:', {
            businessId: sale.business_id,
            branchId: sale.branch_id,
            error: error.message
          })
          throw error
        }
        
        // Access Counter model via Sequelize registry to avoid initialization issues
        const CounterModel = sequelize.models.Counter
        
        if (!CounterModel) {
          throw new Error('Counter model not initialized in Sequelize registry. Check models/index.js initialization order.')
        }
        
        if (typeof CounterModel.getNextValue !== 'function') {
          throw new Error('Counter.getNextValue method is not defined')
        }
        
        logger.debug('Generating sale_number:', {
          businessId: sale.business_id,
          branchId: sale.branch_id,
          year: currentYear,
          transactionActive: !!transaction
        })
        
        // Get next counter value with database lock
        const nextNumber = await CounterModel.getNextValue('sale_number', currentYear, {
          businessId: sale.business_id,
          branchId: null, // Global counter per business
          transaction
        })
        
        // Format with leading zeros (5 digits)
        const formattedNumber = String(nextNumber).padStart(5, '0')
        sale.sale_number = `SALE-${currentYear}-${formattedNumber}`
        
        logger.info('Sale number generated successfully:', {
          businessId: sale.business_id,
          year: currentYear,
          sequenceNumber: nextNumber,
          saleNumber: sale.sale_number
        })
        
      } catch (hookError) {
        // Log detailed error context for debugging
        logger.error('Failed to generate sale_number:', {
          businessId: sale.business_id,
          branchId: sale.branch_id,
          year: new Date().getFullYear(),
          transactionState: options.transaction ? 'active' : 'missing',
          errorMessage: hookError.message,
          errorStack: hookError.stack
        })
        
        // Rethrow with clear, actionable error message
        throw new Error(`Sale number generation failed: ${hookError.message}`)
      }
    }
  }
})

// Instance methods
Sale.prototype.calculateTotals = async function() {
  const SaleItem = sequelize.models.SaleItem
  const items = await SaleItem.findAll({
    where: { sale_id: this.public_id }
  })
  
  let subtotal = 0
  let taxAmount = 0
  
  items.forEach(item => {
    subtotal += parseFloat(item.subtotal)
    taxAmount += parseFloat(item.tax_amount)
  })
  
  this.subtotal = subtotal
  this.tax_amount = taxAmount
  this.total_amount = subtotal + taxAmount - parseFloat(this.discount_amount)
  
  await this.save()
  return this
}

Sale.prototype.canRefund = function() {
  if (this.status !== 'completed') {
    return false
  }
  
  // Check if sale is within refund window (e.g., 30 days)
  const refundWindowDays = 30
  const saleDate = new Date(this.sale_date)
  const now = new Date()
  const daysDifference = (now - saleDate) / (1000 * 60 * 60 * 24)
  
  return daysDifference <= refundWindowDays
}

Sale.prototype.markAsRefunded = async function(options = {}) {
  this.status = 'refunded'
  await this.save(options)
  return this
}

Sale.prototype.markAsCancelled = async function(options = {}) {
  this.status = 'cancelled'
  await this.save(options)
  return this
}

export default Sale
