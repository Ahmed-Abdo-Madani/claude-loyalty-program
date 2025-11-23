import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import logger from '../config/logger.js'

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    comment: 'Auto-generated invoice number (INV-YYYY-NNNNN)'
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  payment_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'payments',
      key: 'public_id'
    }
  },
  subscription_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'subscriptions',
      key: 'public_id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Invoice amount before tax'
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'VAT amount (15%)'
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Total amount (amount + tax_amount)'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'SAR',
    comment: 'Currency code (ISO 4217)'
  },
  issued_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when invoice was issued'
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Invoice due date'
  },
  paid_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when invoice was paid'
  },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'paid', 'overdue', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Invoice status'
  },
  invoice_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Complete invoice details (business info, line items, etc.)'
  },
  pdf_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL to generated PDF invoice'
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
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['business_id']
    },
    {
      fields: ['payment_id']
    },
    {
      fields: ['subscription_id']
    },
    {
      fields: ['invoice_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['issued_date']
    },
    {
      fields: ['due_date']
    }
  ],
  hooks: {
    // CRITICAL: Use beforeValidate to auto-generate invoice_number
    // This runs BEFORE validation to avoid "cannot be null" errors
    beforeValidate: async (invoice, options) => {
      try {
        // Auto-generate invoice_number using database-backed counter with lock
        // Format: INV-{YEAR}-{5-digit-sequence}
        if (!invoice.invoice_number && invoice.business_id) {
          // TRANSACTION REQUIREMENT: All Invoice.create() calls MUST include a transaction
          const transaction = options.transaction
          if (!transaction) {
            logger.error('❌ Invoice.beforeValidate: Transaction required for invoice_number generation')
            throw new Error('Transaction required for invoice creation')
          }

          // Access Counter model via Sequelize registry to avoid initialization issues
          const CounterModel = sequelize.models.Counter
          
          if (!CounterModel) {
            const error = new Error('Counter model not initialized in Sequelize registry. Check models/index.js initialization order.')
            logger.error('❌ Invoice.beforeValidate: Counter model missing', {
              businessId: invoice.business_id,
              availableModels: Object.keys(sequelize.models),
              error: error.message
            })
            throw error
          }
          
          if (typeof CounterModel.getNextValue !== 'function') {
            const error = new Error('Counter.getNextValue method is not defined')
            logger.error('❌ Invoice.beforeValidate: Counter.getNextValue not available', {
              businessId: invoice.business_id,
              counterModelMethods: Object.getOwnPropertyNames(CounterModel),
              error: error.message
            })
            throw error
          }

          // Get current year
          const year = new Date().getFullYear()

          logger.debug('Generating invoice_number:', {
            businessId: invoice.business_id,
            year: year,
            transactionActive: !!transaction
          })

          // Get next counter value with database lock
          const nextValue = await CounterModel.getNextValue('invoice_number', year, {
            businessId: invoice.business_id,
            transaction
          })

          // Format invoice number: INV-2025-00001
          invoice.invoice_number = `INV-${year}-${String(nextValue).padStart(5, '0')}`

          logger.debug(`📋 Generated invoice_number: ${invoice.invoice_number}`)
        }

        // Auto-calculate tax and total if not provided
        if (invoice.amount && !invoice.tax_amount) {
          const taxAmount = parseFloat(invoice.amount) * 0.15
          // Round to 2 decimal places using numeric operation
          invoice.tax_amount = Math.round(taxAmount * 100) / 100
        }
        
        if (invoice.amount && invoice.tax_amount && !invoice.total_amount) {
          const totalAmount = parseFloat(invoice.amount) + parseFloat(invoice.tax_amount)
          // Round to 2 decimal places using numeric operation
          invoice.total_amount = Math.round(totalAmount * 100) / 100
        }
      } catch (error) {
        logger.error('❌ Invoice.beforeValidate error:', error)
        throw error
      }
    }
  }
})

// Instance Methods
Invoice.prototype.isOverdue = function() {
  if (this.status === 'paid' || this.status === 'cancelled') return false
  return new Date(this.due_date) < new Date()
}

Invoice.prototype.markAsPaid = async function(paidDate = null) {
  this.status = 'paid'
  this.paid_date = paidDate || new Date()
  await this.save()
}

Invoice.prototype.markAsOverdue = async function() {
  if (this.status !== 'paid' && this.status !== 'cancelled') {
    this.status = 'overdue'
    await this.save()
  }
}

Invoice.prototype.calculateTax = function() {
  const taxAmount = parseFloat(this.amount) * 0.15
  // Round to 2 decimal places and return as number
  return Math.round(taxAmount * 100) / 100
}

Invoice.prototype.generatePDF = async function() {
  // Placeholder for future PDF generation implementation
  logger.info(`📄 PDF generation requested for invoice: ${this.invoice_number}`)
  throw new Error('PDF generation not yet implemented')
}

export default Invoice
