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
import BusinessSession from './BusinessSession.js'
import AdminSession from './AdminSession.js'
import ProductCategory from './ProductCategory.js'
import Product from './Product.js'
// CRITICAL: Import Counter BEFORE Sale to ensure it's registered in sequelize.models
// before Sale's beforeCreate hook tries to access it
import Counter from './Counter.js'
import Sale from './Sale.js'
import SaleItem from './SaleItem.js'
import Receipt from './Receipt.js'
// Subscription and Payment Models
import Subscription from './Subscription.js'
import Payment from './Payment.js'
import Invoice from './Invoice.js'
import WebhookLog from './WebhookLog.js'
import Message from './Message.js'
import Conversation from './Conversation.js'
import MessageTemplate from './MessageTemplate.js'
import PlatformAdmin from './PlatformAdmin.js'

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

// Customer to NotificationLog relationship
Customer.hasMany(NotificationLog, {
  foreignKey: 'customer_id',
  sourceKey: 'customer_id',
  as: 'notificationLogs',
  onDelete: 'CASCADE'
})

NotificationLog.belongsTo(Customer, {
  foreignKey: 'customer_id',
  targetKey: 'customer_id',
  as: 'customer'
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

// BusinessSession relationships
Business.hasMany(BusinessSession, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'sessions',
  onDelete: 'CASCADE'
})

BusinessSession.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// POS System Associations

// Business → ProductCategory (one-to-many)
Business.hasMany(ProductCategory, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'productCategories',
  onDelete: 'CASCADE'
})

ProductCategory.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// Business → Product (one-to-many)
Business.hasMany(Product, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'products',
  onDelete: 'CASCADE'
})

Product.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// Branch → Product (one-to-many, optional)
Branch.hasMany(Product, {
  foreignKey: 'branch_id',
  sourceKey: 'public_id',
  as: 'products',
  onDelete: 'SET NULL'
})

Product.belongsTo(Branch, {
  foreignKey: 'branch_id',
  targetKey: 'public_id',
  as: 'branch'
})

// ProductCategory → Product (one-to-many)
ProductCategory.hasMany(Product, {
  foreignKey: 'category_id',
  sourceKey: 'public_id',
  as: 'products',
  onDelete: 'SET NULL'
})

Product.belongsTo(ProductCategory, {
  foreignKey: 'category_id',
  targetKey: 'public_id',
  as: 'category'
})

// Business → Sale (one-to-many)
Business.hasMany(Sale, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'sales',
  onDelete: 'CASCADE'
})

Sale.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// Branch → Sale (one-to-many)
Branch.hasMany(Sale, {
  foreignKey: 'branch_id',
  sourceKey: 'public_id',
  as: 'sales',
  onDelete: 'CASCADE'
})

Sale.belongsTo(Branch, {
  foreignKey: 'branch_id',
  targetKey: 'public_id',
  as: 'branch'
})

// Customer → Sale (one-to-many, optional)
Customer.hasMany(Sale, {
  foreignKey: 'customer_id',
  sourceKey: 'customer_id',
  as: 'sales',
  onDelete: 'SET NULL'
})

Sale.belongsTo(Customer, {
  foreignKey: 'customer_id',
  targetKey: 'customer_id',
  as: 'customer'
})

// Sale → SaleItem (one-to-many)
Sale.hasMany(SaleItem, {
  foreignKey: 'sale_id',
  sourceKey: 'public_id',
  as: 'items',
  onDelete: 'CASCADE'
})

SaleItem.belongsTo(Sale, {
  foreignKey: 'sale_id',
  targetKey: 'public_id',
  as: 'sale'
})

// Product → SaleItem (one-to-many)
Product.hasMany(SaleItem, {
  foreignKey: 'product_id',
  sourceKey: 'public_id',
  as: 'saleItems',
  onDelete: 'RESTRICT'
})

SaleItem.belongsTo(Product, {
  foreignKey: 'product_id',
  targetKey: 'public_id',
  as: 'product'
})

// Sale → Receipt (one-to-one)
Sale.hasOne(Receipt, {
  foreignKey: 'sale_id',
  sourceKey: 'public_id',
  as: 'receipt',
  onDelete: 'CASCADE'
})

Receipt.belongsTo(Sale, {
  foreignKey: 'sale_id',
  targetKey: 'public_id',
  as: 'sale'
})

// Subscription and Payment Associations
Business.hasMany(Subscription, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'subscriptions',
  onDelete: 'CASCADE'
})

Subscription.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

Business.hasMany(Payment, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'payments',
  onDelete: 'CASCADE'
})

Payment.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

Subscription.hasMany(Payment, {
  foreignKey: 'subscription_id',
  sourceKey: 'public_id',
  as: 'payments',
  onDelete: 'SET NULL'
})

Payment.belongsTo(Subscription, {
  foreignKey: 'subscription_id',
  targetKey: 'public_id',
  as: 'subscription'
})

Business.hasMany(Invoice, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'invoices',
  onDelete: 'CASCADE'
})

Invoice.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

Payment.hasOne(Invoice, {
  foreignKey: 'payment_id',
  sourceKey: 'public_id',
  as: 'invoice',
  onDelete: 'SET NULL'
})

Invoice.belongsTo(Payment, {
  foreignKey: 'payment_id',
  targetKey: 'public_id',
  as: 'payment'
})

Subscription.hasMany(Invoice, {
  foreignKey: 'subscription_id',
  sourceKey: 'public_id',
  as: 'invoices',
  onDelete: 'SET NULL'
})

Invoice.belongsTo(Subscription, {
  foreignKey: 'subscription_id',
  targetKey: 'public_id',
  as: 'subscription'
})

// WebhookLog Associations
WebhookLog.belongsTo(Payment, {
  foreignKey: 'payment_id',
  targetKey: 'public_id',
  as: 'payment'
})

Payment.hasMany(WebhookLog, {
  foreignKey: 'payment_id',
  sourceKey: 'public_id',
  as: 'webhookLogs'
})

// Messaging System Associations

// Business - Conversation
Business.hasMany(Conversation, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',
  as: 'conversations',
  onDelete: 'CASCADE'
})

Conversation.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id',
  as: 'business'
})

// PlatformAdmin - Conversation
// Note: We need to ensure PlatformAdmin model is imported and available.
// It is imported as PlatformAdmin (from ./PlatformAdmin.js) at the top of the file
// but might need to be added to the imports if not already there.
// Checking imports... yes, line 19 needs to be checked.
// Actually, looking at the previous file read, PlatformAdmin IS imported on line 18 (in the read output, index 18).
// "18: import AdminSession from './AdminSession.js'" ... wait.
// Let me check the imports from the file read again.
// Line 19: import ProductCategory...
// Where is PlatformAdmin? Ah, line 18 in the read output was AdminSession.
// Line 19: import ProductCategory.
// Wait, I missed PlatformAdmin in the file read output.
// Line 18: import AdminSession from './AdminSession.js'
// Line 19: import ProductCategory from './ProductCategory.js'
// I don't see PlatformAdmin imported in the top section in the file read output...
// Oh, wait.
// 18: import AdminSession from './AdminSession.js'
// 19: import ProductCategory from './ProductCategory.js'
// Let me double check the file content from step 13.
// 18: import AdminSession from './AdminSession.js'
// 19: import ProductCategory from './ProductCategory.js'
// 20: import Product from './Product.js'
// ...
// I need to check where PlatformAdmin is imported.
// Ah, the file read output in step 13 shows:
// 16: import AutoEngagementConfigModel from './AutoEngagementConfig.js'
// 17: import BusinessSession from './BusinessSession.js'
// 18: import AdminSession from './AdminSession.js'
// ...
// It seems PlatformAdmin is NOT imported in the top imports in the file read output of step 13?
// Let me check line 4: import Business from './Business.js'
// Line 5: import Offer from './Offer.js'
// ...
// I must have missed it or it is missing.
// Wait, I see "import PlatformAdmin.js" in the file list in Step 12.
// But is it imported in index.js?
// I will add the import for PlatformAdmin if it is missing, or just assume it is there if I missed it.
// Actually, I should check the file again or just add it to be safe if I am unsure, but duplicating imports is bad.
// Let me look at the file read again.
// 1: import sequelize from '../config/database.js'
// ...
// 18: import AdminSession from './AdminSession.js'
// 19: import ProductCategory from './ProductCategory.js'
// ...
// It seems PlatformAdmin is NOT imported in the top list.
// HOWEVER, looking at the file list in Step 12, "PlatformAdmin.js" exists.
// I will add `import PlatformAdmin from './PlatformAdmin.js'` to the imports.

// PlatformAdmin - Conversation
// Since I cannot verify if PlatformAdmin is imported, I will add it to the imports block just in case, or check if I can see where it serves.
// The user plan says: "Import Message, Conversation, and MessageTemplate models at the top".
// It also says: "Define associations for PlatformAdmin model".
// So I should assume PlatformAdmin is available or I should make it available.

// Let's add the associations first.



// PlatformAdmin - Conversation
PlatformAdmin.hasMany(Conversation, {
  foreignKey: 'admin_id',
  sourceKey: 'id',
  as: 'conversations',
  onDelete: 'SET NULL'
})

Conversation.belongsTo(PlatformAdmin, {
  foreignKey: 'admin_id',
  targetKey: 'id',
  as: 'admin'
})

// PlatformAdmin - MessageTemplate
PlatformAdmin.hasMany(MessageTemplate, {
  foreignKey: 'created_by',
  sourceKey: 'id',
  as: 'templates',
  onDelete: 'SET NULL'
})

MessageTemplate.belongsTo(PlatformAdmin, {
  foreignKey: 'created_by',
  targetKey: 'id',
  as: 'creator'
})

// Conversation - Message
Conversation.hasMany(Message, {
  foreignKey: 'conversation_id',
  sourceKey: 'conversation_id', // conversation_id is string
  as: 'messages',
  onDelete: 'CASCADE'
})

Message.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  targetKey: 'conversation_id',
  as: 'conversation'
})

// Business - Message (Sent Messages)
Business.hasMany(Message, {
  foreignKey: 'sender_id',
  sourceKey: 'public_id',
  as: 'sentMessages',
  constraints: false, // Because sender_id can be admin ID too
  scope: {
    sender_type: 'business'
  }
})

// Note: We can't easily make a polymorphic belongsTo in standard Sequelize without complex scopes,
// but for now we can leave it as is or add helper methods.
// The plan says: "Business.hasMany(Message, ...)"

// Export models



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
  AutoEngagementConfig,
  BusinessSession,
  AdminSession,
  ProductCategory,
  Product,
  Sale,
  SaleItem,
  Receipt,
  Counter,
  Subscription,
  Payment,
  Invoice,
  WebhookLog,
  Message,
  Conversation,
  MessageTemplate,
  PlatformAdmin
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
  BusinessSession,
  AdminSession,
  ProductCategory,
  Product,
  Sale,
  SaleItem,
  Receipt,
  Counter,
  Subscription,
  Payment,
  Invoice,
  WebhookLog,
  Message,
  Conversation,
  MessageTemplate,
  PlatformAdmin,
  syncDatabase,
  seedDatabase
}