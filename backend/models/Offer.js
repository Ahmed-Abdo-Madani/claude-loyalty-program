import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

const Offer = sequelize.define('Offer', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateOfferID()
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  branch: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'All Branches'
  },
  type: {
    type: DataTypes.ENUM('stamps', 'points', 'discount'),
    defaultValue: 'stamps'
  },
  stamps_required: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: 1,
      max: 50
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'inactive', 'expired'),
    defaultValue: 'active'
  },
  is_time_limited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  customers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  redeemed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  max_redemptions_per_customer: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  terms_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  qr_code_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  total_scans: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  conversion_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  loyalty_tiers: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'Customizable tier/medal system configuration for perpetual loyalty passes'
  },
  barcode_preference: {
    type: DataTypes.ENUM('QR_CODE', 'PDF417'),
    allowNull: false,
    defaultValue: 'PDF417',
    comment: 'Barcode format for wallet passes (QR_CODE or PDF417)'
  },
  apple_pass_type: {
    type: DataTypes.ENUM('storeCard', 'generic'),
    allowNull: false,
    defaultValue: 'storeCard',
    comment: 'Apple Wallet pass style: storeCard (strip image, classic loyalty card) or generic (thumbnail image, modern layout with PDF417 benefits)'
  }
}, {
  tableName: 'offers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})

// Instance methods for secure offers
Offer.prototype.incrementCustomers = async function() {
  this.customers = (this.customers || 0) + 1
  await this.save()
  return this
}

Offer.prototype.incrementRedemptions = async function() {
  this.redeemed = (this.redeemed || 0) + 1
  await this.save()
  return this
}

Offer.prototype.calculateConversionRate = function() {
  if (this.customers === 0) return 0
  return ((this.redeemed / this.customers) * 100).toFixed(2)
}

Offer.prototype.isActive = function() {
  if (this.status !== 'active') return false

  if (this.is_time_limited) {
    const now = new Date()
    if (this.start_date && now < this.start_date) return false
    if (this.end_date && now > this.end_date) return false
  }

  return true
}

Offer.prototype.isExpired = function() {
  if (!this.is_time_limited || !this.end_date) return false
  return new Date() > this.end_date
}

export default Offer