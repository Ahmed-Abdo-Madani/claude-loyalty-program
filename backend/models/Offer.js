import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  public_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Public-facing unique identifier for URLs and QR codes'
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
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
  // Additional offer settings
  max_redemptions_per_customer: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  terms_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // QR and tracking
  qr_code_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // Analytics
  total_scans: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  conversion_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  }
}, {
  tableName: 'offers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})

// Static method to generate public ID
Offer.generatePublicId = function(title, businessId) {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)

  // Create prefix from title (first 4 chars, alphanumeric only)
  const titlePrefix = title.toLowerCase().replace(/[^a-z0-9]/g, '').substr(0, 4) || 'ofr'

  // Use last 2 digits of business ID for uniqueness
  const businessSuffix = (businessId % 100).toString().padStart(2, '0')

  return `${titlePrefix}_${businessSuffix}_${timestamp}_${random}`
}

// Instance methods
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