import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import bcrypt from 'bcryptjs'

const Branch = sequelize.define('Branch', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateBranchID(),
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'UPDATED: Now stores street name only (not full address). Use region/city/district for location hierarchy.'
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'City name from Saudi location service'
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Saudi Arabia region (e.g., Riyadh Region, Makkah Region)'
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'District/neighborhood within the city (e.g., Al-Malaz, Al-Olaya)'
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'DEPRECATED: No longer used. Replaced by region/city/district fields from Saudi location service.'
  },
  zip_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'DEPRECATED: No longer used in Saudi Arabia location system.'
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Saudi Arabia'
  },
  // Location metadata from Saudi location service
  location_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'ID from Saudi location data service'
  },
  location_type: {
    type: DataTypes.ENUM('region', 'city', 'district'),
    allowNull: true,
    comment: 'Type of location selected (region, city, or district)'
  },
  location_hierarchy: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Full location hierarchy (e.g., "Riyadh Region - Riyadh City - Al-Malaz District")'
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
  manager_pin: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Hashed PIN for branch manager authentication (4-6 digits)'
  },
  manager_pin_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether branch manager PIN login is enabled'
  },
  manager_last_login: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time branch manager logged in'
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

Branch.prototype.verifyManagerPin = async function(pin) {
  if (!this.manager_pin || !this.manager_pin_enabled) {
    return false
  }
  
  const isValid = await bcrypt.compare(pin, this.manager_pin)
  
  if (isValid) {
    this.manager_last_login = new Date()
    await this.save()
  }
  
  return isValid
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