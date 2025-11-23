import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const Payment = sequelize.define('Payment', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generatePaymentID(),
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
  subscription_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'subscriptions',
      key: 'public_id'
    }
  },
  moyasar_payment_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Moyasar transaction ID'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Payment amount in SAR'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'SAR',
    comment: 'Currency code (ISO 4217)'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Payment status'
  },
  payment_method: {
    type: DataTypes.ENUM('card', 'apple_pay', 'stc_pay'),
    allowNull: true,
    comment: 'Payment method used'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when payment was completed'
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for payment failure'
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Amount refunded (if applicable)'
  },
  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when refund was processed'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional payment details (card info, receipt URL, etc.)'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of retry attempts for failed payments'
  },
  last_retry_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of last retry attempt'
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
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['business_id']
    },
    {
      fields: ['subscription_id']
    },
    {
      fields: ['moyasar_payment_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_date']
    },
    {
      fields: ['business_id', 'payment_date'],
      name: 'business_payment_date_idx'
    }
  ]
})

// Instance Methods
Payment.prototype.isPaid = function() {
  return this.status === 'paid'
}

Payment.prototype.isFailed = function() {
  return this.status === 'failed'
}

Payment.prototype.canRetry = function() {
  return this.status === 'failed' && this.retry_count < 3
}

Payment.prototype.markAsPaid = async function(moyasarPaymentId = null, metadata = null) {
  this.status = 'paid'
  this.payment_date = new Date()
  if (moyasarPaymentId) {
    this.moyasar_payment_id = moyasarPaymentId
  }
  if (metadata) {
    this.metadata = metadata
  }
  await this.save()
}

Payment.prototype.markAsFailed = async function(reason = null) {
  this.status = 'failed'
  if (reason) {
    this.failure_reason = reason
  }
  await this.save()
}

Payment.prototype.incrementRetry = async function() {
  this.retry_count += 1
  this.last_retry_at = new Date()
  await this.save()
}

Payment.prototype.processRefund = async function(amount = null) {
  this.status = 'refunded'
  this.refund_amount = amount || this.amount
  this.refunded_at = new Date()
  await this.save()
}

export default Payment
