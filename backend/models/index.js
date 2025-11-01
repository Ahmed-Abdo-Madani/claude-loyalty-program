import sequelize from '../config/database.js'
import logger from '../config/logger.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import Business from './Business.js'
import Offer from './Offer.js'
import CustomerProgress from './CustomerProgress.js'
import Branch from './Branch.js'
import Customer from './Customer.js'
import NotificationCampaign from './NotificationCampaign.js'
import NotificationLog from './NotificationLog.js'
import CustomerSegment from './CustomerSegment.js'
import WalletPass from './WalletPass.js'
import OfferCardDesign from './OfferCardDesign.js'
import Device from './Device.js'
import DeviceRegistration from './DeviceRegistration.js'
import AutoEngagementConfigModel from './AutoEngagementConfig.js'

const AutoEngagementConfig = AutoEngagementConfigModel(sequelize)

// Define SECURE model associations using public_id fields
Business.hasMany(Offer, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',  // Use secure ID
  as: 'offers',
  onDelete: 'CASCADE'
})

Business.hasMany(Branch, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',  // Use secure ID
  as: 'branches',
  onDelete: 'CASCADE'
})

Branch.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',  // Use secure ID
  as: 'business'
})

Offer.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',  // Use secure ID
  as: 'business'
})

Business.hasMany(CustomerProgress, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',  // Use secure ID
  as: 'customerProgress',
  onDelete: 'CASCADE'
})

CustomerProgress.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',  // Use secure ID
  as: 'business'
})

Offer.hasMany(CustomerProgress, {
  foreignKey: 'offer_id',
  sourceKey: 'public_id',  // Use secure ID
  as: 'customerProgress',
  onDelete: 'CASCADE'
})

CustomerProgress.belongsTo(Offer, {
  foreignKey: 'offer_id',
  targetKey: 'public_id',  // Use secure ID
  as: 'offer'
})

// Customer model relationships
Business.hasMany(Customer, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'customers',
  onDelete: 'CASCADE'
})

Customer.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// Customer to CustomerProgress relationship
Customer.hasMany(CustomerProgress, {
  foreignKey: 'customer_id',
  sourceKey: 'customer_id',
  as: 'progress'
})

CustomerProgress.belongsTo(Customer, {
  foreignKey: 'customer_id',
  targetKey: 'customer_id',
  as: 'customer'
})

// Notification Campaign relationships
Business.hasMany(NotificationCampaign, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'notificationCampaigns',
  onDelete: 'CASCADE'
})

NotificationCampaign.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// Notification Log relationships
Business.hasMany(NotificationLog, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'notificationLogs',
  onDelete: 'CASCADE'
})

NotificationLog.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

NotificationCampaign.hasMany(NotificationLog, {
  foreignKey: 'campaign_id',
  sourceKey: 'campaign_id',
  as: 'logs',
  onDelete: 'CASCADE'
})

NotificationLog.belongsTo(NotificationCampaign, {
  foreignKey: 'campaign_id',
  targetKey: 'campaign_id',
  as: 'campaign'
})

// Customer Segment relationships
Business.hasMany(CustomerSegment, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'customerSegments',
  onDelete: 'CASCADE'
})

CustomerSegment.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// WalletPass relationships
Customer.hasMany(WalletPass, {
  foreignKey: 'customer_id',
  sourceKey: 'customer_id',
  as: 'walletPasses',
  onDelete: 'CASCADE'
})

WalletPass.belongsTo(Customer, {
  foreignKey: 'customer_id',
  targetKey: 'customer_id',
  as: 'customer'
})

CustomerProgress.hasMany(WalletPass, {
  foreignKey: 'progress_id',
  sourceKey: 'id',
  as: 'walletPasses',
  onDelete: 'CASCADE'
})

WalletPass.belongsTo(CustomerProgress, {
  foreignKey: 'progress_id',
  targetKey: 'id',
  as: 'progress'
})

Business.hasMany(WalletPass, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'walletPasses',
  onDelete: 'CASCADE'
})

WalletPass.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

Offer.hasMany(WalletPass, {
  foreignKey: 'offer_id',
  sourceKey: 'public_id',
  as: 'walletPasses',
  onDelete: 'CASCADE'
})

WalletPass.belongsTo(Offer, {
  foreignKey: 'offer_id',
  targetKey: 'public_id',
  as: 'offer'
})

// OfferCardDesign relationships
Offer.hasOne(OfferCardDesign, {
  foreignKey: 'offer_id',
  sourceKey: 'public_id',
  as: 'cardDesign',
  onDelete: 'CASCADE'
})

OfferCardDesign.belongsTo(Offer, {
  foreignKey: 'offer_id',
  targetKey: 'public_id',
  as: 'offer'
})

Business.hasMany(OfferCardDesign, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'cardDesigns',
  onDelete: 'CASCADE'
})

OfferCardDesign.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// Device and DeviceRegistration relationships (Apple Web Service Protocol)
Device.hasMany(DeviceRegistration, {
  foreignKey: 'device_id',
  sourceKey: 'id',
  as: 'registrations',
  onDelete: 'CASCADE'
})

DeviceRegistration.belongsTo(Device, {
  foreignKey: 'device_id',
  targetKey: 'id',
  as: 'device'
})

WalletPass.hasMany(DeviceRegistration, {
  foreignKey: 'wallet_pass_id',
  sourceKey: 'id',
  as: 'deviceRegistrations',
  onDelete: 'CASCADE'
})

DeviceRegistration.belongsTo(WalletPass, {
  foreignKey: 'wallet_pass_id',
  targetKey: 'id',
  as: 'walletPass'
})

// AutoEngagementConfig relationships
Business.hasOne(AutoEngagementConfig, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'autoEngagementConfig',
  onDelete: 'CASCADE'
})

AutoEngagementConfig.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// Export models and sequelize instance
export {
  sequelize,
  Business,
  Offer,
  CustomerProgress,
  Branch,
  Customer,
  NotificationCampaign,
  NotificationLog,
  CustomerSegment,
  WalletPass,
  OfferCardDesign,
  Device,
  DeviceRegistration,
  AutoEngagementConfig
}

// Sync database (create tables) - SECURE VERSION
export async function syncDatabase(force = false) {
  try {
    logger.info('🔄 Syncing SECURE database schema...')

    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    await sequelize.sync({ force })

    if (force) {
      logger.warn('⚠️  Database tables recreated with SECURE schema (all data lost)')
    } else {
      logger.info('✅ SECURE database tables synchronized')
    }

    logger.info('🎉 SECURE database sync completed!')

  } catch (error) {
    logger.error('❌ SECURE database sync failed', { error: error.message, stack: error.stack })
    throw error
  }
}

// Initialize database with SECURE sample data
export async function seedDatabase() {
  try {
    logger.info('🌱 Seeding database with SECURE sample data...')

    // Check if data already exists
    const businessCount = await Business.count()
    if (businessCount > 0) {
      logger.info('📊 Database already contains data, skipping seed')
      return
    }

    // Create sample business with secure ID
    const sampleBusiness = await Business.create({
      email: 'demo@loyaltyplatform.sa',
      password_hash: '$2b$10$examplehashedpassword', // Should be properly hashed
      business_name: 'مطعم الأمل التجريبي - Demo Al-Amal Restaurant',
      business_name_ar: 'مطعم الأمل التجريبي',
      phone: '+966 11 123-4567',
      business_type: 'Restaurant & Cafe',
      license_number: 'CR-DEMO-123456',
      description: 'Restaurant demo for loyalty platform',
      region: 'Central Region',
      city: 'الرياض - Riyadh',
      address: 'Demo Street, Riyadh',
      owner_name: 'محمد الأحمد - Mohammed Al-Ahmed',
      owner_name_ar: 'محمد الأحمد',
      owner_id: 'DEMO123456',
      owner_phone: '+966 11 123-4567',
      owner_email: 'demo@loyaltyplatform.sa',
      status: 'active',
      approved_at: new Date(),
      approved_by: 'admin_secure_id_example',
      total_branches: 1,
      total_offers: 1,
      active_offers: 1
    })

    // Create sample offer with secure ID
    const sampleOffer = await Offer.create({
      business_id: sampleBusiness.public_id, // Using secure business ID
      title: '🥙 اشترِ 8 شاورما واحصل على 1 مجاناً - Buy 8 Shawarma, Get 1 FREE',
      description: 'اجمع 8 أختام واحصل على شاورما مجانية! Collect 8 stamps for a free shawarma!',
      branch: 'جميع الفروع - All Branches',
      type: 'stamps',
      stamps_required: 8,
      status: 'active',
      is_time_limited: false,
      customers: 0,
      redeemed: 0
    })

    // Create sample customer progress with secure IDs
    const sampleCustomerId = SecureIDGenerator.generateCustomerID()
    await CustomerProgress.create({
      customer_id: sampleCustomerId,
      offer_id: sampleOffer.public_id, // Using secure offer ID
      business_id: sampleBusiness.public_id, // Using secure business ID
      current_stamps: 3,
      max_stamps: 8,
      customer_name: 'أحمد محمد - Ahmed Mohammed',
      customer_phone: '+966 50 123-4567',
      first_scan_date: new Date(),
      last_scan_date: new Date(),
      total_scans: 3
    })

    logger.info(`✅ Sample business created: ${sampleBusiness.business_name} (ID: ${sampleBusiness.public_id})`)
    logger.info(`✅ Sample offer created: ${sampleOffer.title} (ID: ${sampleOffer.public_id})`)
    logger.info(`✅ Sample customer progress created: ${sampleCustomerId}`)
    logger.info('🎉 SECURE database seeded successfully!')

  } catch (error) {
    logger.error('❌ SECURE database seeding failed', { error: error.message, stack: error.stack })
    throw error
  }
}

export default {
  sequelize,
  Business,
  Offer,
  CustomerProgress,
  Branch,
  Customer,
  NotificationCampaign,
  NotificationLog,
  CustomerSegment,
  WalletPass,
  OfferCardDesign,
  Device,
  DeviceRegistration,
  AutoEngagementConfig,
  syncDatabase,
  seedDatabase
}