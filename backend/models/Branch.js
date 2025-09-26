import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  manager_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'closed'),
    defaultValue: 'inactive'
  },
  // Analytics fields for branch performance tracking
  customers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  active_offers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  monthly_revenue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  // Location data
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  // Operating hours (JSON field)
  operating_hours: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'branches',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})

// Instance methods
Branch.prototype.isOpen = function() {
  return this.status === 'active'
}

Branch.prototype.incrementCustomers = async function() {
  this.customers = (this.customers || 0) + 1
  await this.save()
  return this
}

Branch.prototype.updateActiveOffers = async function(count) {
  this.active_offers = count
  await this.save()
  return this
}

export default Branch