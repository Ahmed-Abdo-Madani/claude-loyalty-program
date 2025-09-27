import sequelize from '../config/database.js'
import logger from '../config/logger.js'
import Business from './Business.js'
import Offer from './Offer.js'
import CustomerProgress from './CustomerProgress.js'
import Branch from './Branch.js'

// Define model associations
Business.hasMany(Offer, {
  foreignKey: 'business_id',
  as: 'offers',
  onDelete: 'CASCADE'
})

Business.hasMany(Branch, {
  foreignKey: 'business_id',
  as: 'branches',
  onDelete: 'CASCADE'
})

Branch.belongsTo(Business, {
  foreignKey: 'business_id',
  as: 'business'
})

Offer.belongsTo(Business, {
  foreignKey: 'business_id',
  as: 'business'
})

Business.hasMany(CustomerProgress, {
  foreignKey: 'business_id',
  as: 'customerProgress',
  onDelete: 'CASCADE'
})

CustomerProgress.belongsTo(Business, {
  foreignKey: 'business_id',
  as: 'business'
})

Offer.hasMany(CustomerProgress, {
  foreignKey: 'offer_id',
  as: 'customerProgress',
  onDelete: 'CASCADE'
})

CustomerProgress.belongsTo(Offer, {
  foreignKey: 'offer_id',
  as: 'offer'
})

// Export models and sequelize instance
export {
  sequelize,
  Business,
  Offer,
  CustomerProgress,
  Branch
}

// Sync database (create tables) - only for development
export async function syncDatabase(force = false) {
  try {
    logger.info('🔄 Syncing database...')

    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    await sequelize.sync({ force })

    if (force) {
      logger.warn('⚠️  Database tables recreated (all data lost)')
    } else {
      logger.info('✅ Database tables synchronized')
    }

    logger.info('🎉 Database sync completed!')

  } catch (error) {
    logger.error('❌ Database sync failed', { error: error.message, stack: error.stack })
    throw error
  }
}

// Initialize database with sample data
export async function seedDatabase() {
  try {
    logger.info('🌱 Seeding database with sample data...')

    // Check if data already exists
    const businessCount = await Business.count()
    if (businessCount > 0) {
      logger.info('📊 Database already contains data, skipping seed')
      return
    }

    // Create sample business
    const sampleBusiness = await Business.create({
      email: 'demo@loyaltyplatform.sa',
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
      password: 'demo123', // In production, this should be hashed
      status: 'active',
      approved_at: new Date(),
      approved_by: 1,
      total_branches: 1,
      total_offers: 1,
      active_offers: 1
    })

    // Create sample offer
    const sampleOffer = await Offer.create({
      business_id: sampleBusiness.id,
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

    logger.info(`✅ Sample business created: ${sampleBusiness.business_name} (ID: ${sampleBusiness.id})`)
    logger.info(`✅ Sample offer created: ${sampleOffer.title} (ID: ${sampleOffer.id})`)
    logger.info('🎉 Database seeded successfully!')

  } catch (error) {
    logger.error('❌ Database seeding failed', { error: error.message, stack: error.stack })
    throw error
  }
}

export default {
  sequelize,
  Business,
  Offer,
  CustomerProgress,
  Branch,
  syncDatabase,
  seedDatabase
}