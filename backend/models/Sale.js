import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import Counter from './Counter.js'

const Sale = sequelize.define('Sale', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateSaleID(),
    allowNull: false
  },
  sale_number: {
    type: DataTypes.STRING(50),
    unique: true,
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
      fields: ['sale_number']
    },
    {
      fields: ['business_id', 'sale_date'],
      name: 'business_sale_date_idx'
    }
  ],
  hooks: {
    beforeCreate: async (sale, options) => {
      // Auto-generate sale_number using database-backed counter with lock
      const currentYear = new Date().getFullYear()
      
      // Get transaction from options (required for atomic counter increment)
      const transaction = options.transaction
      if (!transaction) {
        throw new Error('Transaction is required for sale creation to ensure atomic counter increment')
      }
      
      // Get next counter value with database lock
      const nextNumber = await Counter.getNextValue('sale_number', currentYear, {
        businessId: sale.business_id,
        branchId: null, // Global counter per business
        transaction
      })
      
      // Format with leading zeros (5 digits)
      const formattedNumber = String(nextNumber).padStart(5, '0')
      sale.sale_number = `SALE-${currentYear}-${formattedNumber}`
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
