import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import logger from '../config/logger.js'
import SubscriptionService from '../services/SubscriptionService.js'

const Business = sequelize.define('Business', {
  public_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => SecureIDGenerator.generateBusinessID()
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
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
    allowNull: true,
    comment: 'Saudi Arabia region (e.g., Riyadh Region, Makkah Region)'
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'City name from Saudi location service'
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'District/neighborhood within the city (e.g., Al-Malaz, Al-Olaya)'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'UPDATED: Now stores street name only (not full address). Use region/city/district for location hierarchy.'
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
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  profile_completion: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'suspended', 'inactive'),
    defaultValue: 'active', // AUTO-APPROVAL: Businesses are auto-approved upon registration
    comment: 'Business account status'
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
    type: DataTypes.STRING(50),  // Can be admin's secure ID
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
  },
  // Logo fields for business branding
  logo_filename: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Original filename of uploaded logo'
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Accessible URL path to logo file'
  },
  logo_uploaded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when logo was uploaded'
  },
  logo_file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  },
  // Menu display settings
  menu_display_mode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'grid',
    validate: {
      isIn: {
        args: [['grid', 'list', 'pdf']],
        msg: 'menu_display_mode must be one of: grid, list, pdf'
      }
    },
    comment: 'Controls how the public menu is displayed: grid (default), list, or pdf'
  },
  menu_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Phone number specifically for the public menu display'
  },
  menu_pdf_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Accessible URL path to PDF menu file'
  },
  menu_pdf_filename: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Original filename of uploaded PDF'
  },
  menu_pdf_uploaded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when PDF was uploaded'
  },
  // Social Media Links
  facebook_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Facebook page or profile URL'
  },
  instagram_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Instagram profile URL'
  },
  twitter_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Twitter/X profile URL'
  },
  snapchat_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Snapchat profile URL'
  },
  current_plan: {
    type: DataTypes.ENUM(
      'free',
      'professional',
      'enterprise',
      'loyalty_starter',
      'loyalty_growth',
      'loyalty_professional',
      'pos_business',
      'pos_enterprise',
      'pos_premium'
    ),
    allowNull: false,
    defaultValue: 'free',
    comment: 'Current subscription plan'
  },
  subscription_status: {
    type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
    allowNull: false,
    defaultValue: 'trial',
    comment: 'Current subscription status'
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Trial period end date (7 days from registration)'
  },
  subscription_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when paid subscription started'
  }
}, {
  tableName: 'businesses',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})

// Instance methods for secure business management
Business.prototype.updateStatus = async function (status, reason = null, adminId = null) {
  this.status = status
  this.last_activity_at = new Date()

  if (status === 'active' && !this.approved_at) {
    this.approved_at = new Date()
    this.approved_by = adminId // Now stores admin's secure ID
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

// Calculate business analytics with secure associations
Business.prototype.getAnalytics = async function () {
  // These associations will work with secure IDs
  const offers = await this.getOffers()
  const branches = await this.getBranches()
  const customerProgress = await this.getCustomerProgress()

  return {
    totalOffers: offers?.length || this.total_offers || 0,
    activeOffers: offers?.filter(o => o.status === 'active').length || this.active_offers || 0,
    totalBranches: branches?.length || this.total_branches || 0,
    totalCustomers: customerProgress?.length || this.total_customers || 0,
    totalRedemptions: this.total_redemptions || 0,
    conversionRate: this.calculateOverallConversionRate()
  }
}

// New method for conversion rate calculation
Business.prototype.calculateOverallConversionRate = function () {
  if (this.total_customers === 0) return 0
  return ((this.total_redemptions / this.total_customers) * 100).toFixed(2)
}

// Subscription management methods
Business.prototype.isOnTrial = function () {
  return this.subscription_status === 'trial' && this.trial_ends_at && new Date(this.trial_ends_at) > new Date()
}

Business.prototype.isTrialExpired = function () {
  return this.trial_ends_at && new Date(this.trial_ends_at) < new Date()
}

Business.prototype.hasActiveSubscription = function () {
  return this.subscription_status === 'active'
}

Business.prototype.canAccessFeature = function (feature) {
  try {
    const plan = SubscriptionService.getPlanDefinition(this.current_plan)
    return plan.features.includes(feature)
  } catch (error) {
    logger.error('Error checking feature access', { plan: this.current_plan, feature, error: error.message })
    return false
  }
}

Business.prototype.getRemainingTrialDays = function () {
  if (!this.trial_ends_at) return 0
  const now = new Date()
  const trialEnd = new Date(this.trial_ends_at)
  const diffTime = trialEnd - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

Business.prototype.getPlanLimits = function () {
  try {
    const plan = SubscriptionService.getPlanDefinition(this.current_plan)
    return plan.limits
  } catch (error) {
    logger.error('Error getting plan limits', { plan: this.current_plan, error: error.message })
    // Fallback to free plan limits if plan not found/error
    try {
      return SubscriptionService.getPlanDefinition('free').limits
    } catch (fallbackError) {
      return { offers: 1, customers: 100, posOperations: 20, locations: 1 }
    }
  }
}

export default Business