import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  business_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  business_name_ar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  business_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  license_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  owner_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  owner_name_ar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  owner_id: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  owner_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  owner_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'suspended', 'inactive'),
    defaultValue: 'pending'
  },
  suspension_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  suspension_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  last_activity_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  total_branches: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_offers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  active_offers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_customers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_redemptions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'businesses',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})

// Instance methods for business status management
Business.prototype.updateStatus = async function(status, reason = null, adminId = null) {
  this.status = status
  this.last_activity_at = new Date()

  if (status === 'active' && !this.approved_at) {
    this.approved_at = new Date()
    this.approved_by = adminId
  }

  if (status === 'suspended') {
    this.suspension_date = new Date()
    if (reason) {
      this.suspension_reason = reason
    }
  }

  await this.save()
  return this
}

// Calculate business analytics and performance metrics
Business.prototype.getAnalytics = async function() {
  // Note: These associations will be defined after all models are created
  // const offers = await this.getOffers()
  // const branches = await this.getBranches()
  // const customers = await this.getCustomers()

  return {
    totalOffers: this.total_offers || 0,
    activeOffers: this.active_offers || 0,
    totalBranches: this.total_branches || 0,
    totalCustomers: this.total_customers || 0,
    totalRedemptions: this.total_redemptions || 0
  }
}

export default Business