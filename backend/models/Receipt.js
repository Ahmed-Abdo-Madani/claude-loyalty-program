import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import Counter from './Counter.js'

const Receipt = sequelize.define('Receipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  sale_id: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'public_id'
    }
  },
  receipt_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  format: {
    type: DataTypes.ENUM('thermal', 'a4', 'digital'),
    allowNull: false
  },
  content_json: {
    type: DataTypes.JSON,
    allowNull: false
  },
  printed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  email_recipient: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  print_count: {
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
  tableName: 'receipts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['sale_id']
    },
    {
      fields: ['receipt_number']
    },
    {
      fields: ['printed_at']
    }
  ],
  hooks: {
    beforeCreate: async (receipt, options) => {
      // Auto-generate receipt_number using database-backed counter with lock
      const currentYear = new Date().getFullYear()
      
      // Get transaction from options (required for atomic counter increment)
      const transaction = options.transaction
      if (!transaction) {
        throw new Error('Transaction is required for receipt creation to ensure atomic counter increment')
      }
      
      // Get next counter value with database lock
      const nextNumber = await Counter.getNextValue('receipt_number', currentYear, {
        businessId: null, // Global counter
        branchId: null,
        transaction
      })
      
      // Format with leading zeros (5 digits)
      const formattedNumber = String(nextNumber).padStart(5, '0')
      receipt.receipt_number = `RCP-${currentYear}-${formattedNumber}`
    }
  }
})

// Instance methods
Receipt.prototype.markAsPrinted = async function() {
  this.printed_at = new Date()
  this.print_count += 1
  await this.save()
  return this
}

Receipt.prototype.markAsEmailed = async function(email) {
  this.emailed_at = new Date()
  this.email_recipient = email
  await this.save()
  return this
}

Receipt.prototype.canReprint = function() {
  // Business rule: Allow reprints within 24 hours
  if (!this.printed_at) {
    return true
  }
  
  const printDate = new Date(this.printed_at)
  const now = new Date()
  const hoursDifference = (now - printDate) / (1000 * 60 * 60)
  
  return hoursDifference <= 24
}

export default Receipt
