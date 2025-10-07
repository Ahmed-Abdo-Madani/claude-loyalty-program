/**
 * Database Reinitialization Script for Render.com Production
 *
 * This script will:
 * 1. Drop all existing tables
 * 2. Recreate schema with wallet_passes support
 * 3. Seed with admin credentials and test data
 *
 * Usage:
 *   node scripts/reinitialize-production-db.js
 *
 * WARNING: This will delete ALL data in the database!
 */

import { syncDatabase, seedDatabase } from '../models/index.js'
import { Business, Offer, Customer, CustomerProgress, WalletPass } from '../models/index.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import logger from '../config/logger.js'
import bcrypt from 'bcryptjs'

async function reinitializeDatabase() {
  try {
    logger.info('🚨 ==========================================')
    logger.info('🚨 DATABASE REINITIALIZATION STARTING')
    logger.info('🚨 ==========================================')
    logger.info('⚠️  WARNING: This will DELETE ALL DATA!')
    logger.info('')

    // Step 1: Sync database with force=true (drops and recreates all tables)
    logger.info('📦 Step 1: Dropping and recreating all tables...')
    await syncDatabase(true) // force = true

    logger.info('✅ Database schema recreated successfully')
    logger.info('')

    // Step 2: Create admin business account
    logger.info('👤 Step 2: Creating admin business account...')

    const adminPassword = await bcrypt.hash('MadnaAdmin2024!', 10)

    const adminBusiness = await Business.create({
      email: 'super_admin@madna.me',
      password_hash: adminPassword,
      business_name: 'Madna Loyalty Platform - منصة مدنا للولاء',
      business_name_ar: 'منصة مدنا للولاء',
      phone: '+966 11 123-4567',
      business_type: 'Restaurant & Cafe',
      license_number: 'CR-MADNA-2024',
      description: 'Madna Loyalty Platform - Production Admin Account',
      region: 'Central Region',
      city: 'الرياض - Riyadh',
      address: 'Riyadh, Saudi Arabia',
      owner_name: 'Madna Admin - مدير مدنا',
      owner_name_ar: 'مدير مدنا',
      owner_id: 'MADNA-ADMIN',
      owner_phone: '+966 11 123-4567',
      owner_email: 'super_admin@madna.me',
      status: 'active',
      approved_at: new Date(),
      approved_by: 'system_admin',
      total_branches: 1,
      total_offers: 2,
      active_offers: 2
    })

    logger.info(`✅ Admin business created: ${adminBusiness.business_name} (${adminBusiness.public_id})`)
    logger.info(`📧 Login: super_admin@madna.me / MadnaAdmin2024!`)
    logger.info('')

    // Step 3: Create test offers
    logger.info('🎁 Step 3: Creating test offers...')

    const offer1 = await Offer.create({
      business_id: adminBusiness.public_id,
      title: 'اشترِ 5 واحصل على 1 مجاناً - Buy 5 Get 1 Free',
      description: 'اجمع 5 أختام واحصل على منتج مجاني! Collect 5 stamps for a free item!',
      branch: 'جميع الفروع - All Branches',
      type: 'stamps',
      stamps_required: 5,
      status: 'active',
      is_time_limited: false,
      customers: 0,
      redeemed: 0
    })

    const offer2 = await Offer.create({
      business_id: adminBusiness.public_id,
      title: '☕ قهوة مجانية بعد 10 زيارات - Free Coffee After 10 Visits',
      description: 'زُرنا 10 مرات واحصل على قهوة مجاناً! Visit 10 times for free coffee!',
      branch: 'جميع الفروع - All Branches',
      type: 'stamps',
      stamps_required: 10,
      status: 'active',
      is_time_limited: false,
      customers: 0,
      redeemed: 0
    })

    logger.info(`✅ Offer 1 created: ${offer1.title} (${offer1.public_id})`)
    logger.info(`✅ Offer 2 created: ${offer2.title} (${offer2.public_id})`)
    logger.info('')

    // Step 4: Create test customers with wallet passes
    logger.info('👥 Step 4: Creating test customers...')

    // Customer 1: Google Wallet user
    const customer1 = await Customer.create({
      customer_id: SecureIDGenerator.generateCustomerID(),
      business_id: adminBusiness.public_id,
      name: 'أحمد محمد - Ahmed Mohammed (Test)',
      phone: '+966 50 123 4567',
      email: 'ahmed.test@example.com',
      status: 'active',
      lifecycle_stage: 'new_customer',
      total_visits: 0,
      total_stamps_earned: 0,
      total_rewards_claimed: 0,
      total_lifetime_value: 0,
      first_visit_date: new Date(),
      last_activity_date: new Date(),
      acquisition_source: 'in_store',
      preferred_language: 'ar'
    })

    const progress1 = await CustomerProgress.create({
      customer_id: customer1.customer_id,
      offer_id: offer1.public_id,
      business_id: adminBusiness.public_id,
      current_stamps: 2,
      max_stamps: 5,
      is_completed: false,
      wallet_pass_serial: `LP-${SecureIDGenerator.generateCustomerID().slice(-8).toUpperCase()}`
    })

    // Create Google Wallet pass for customer 1
    await WalletPass.create({
      customer_id: customer1.customer_id,
      progress_id: progress1.id,
      business_id: adminBusiness.public_id,
      offer_id: offer1.public_id,
      wallet_type: 'google',
      wallet_object_id: `3388000000023017940.${customer1.customer_id}_${offer1.public_id}`,
      pass_status: 'active',
      device_info: { created_by: 'initialization_script' }
    })

    logger.info(`✅ Customer 1 (Google Wallet): ${customer1.name} (${customer1.customer_id})`)
    logger.info(`   Progress: ${progress1.current_stamps}/${progress1.max_stamps} stamps`)

    // Customer 2: Apple Wallet user
    const customer2 = await Customer.create({
      customer_id: SecureIDGenerator.generateCustomerID(),
      business_id: adminBusiness.public_id,
      name: 'فاطمة سالم - Fatima Salem (Test)',
      phone: '+966 55 987 6543',
      email: 'fatima.test@example.com',
      status: 'active',
      lifecycle_stage: 'repeat_customer',
      total_visits: 0,
      total_stamps_earned: 0,
      total_rewards_claimed: 0,
      total_lifetime_value: 0,
      first_visit_date: new Date(),
      last_activity_date: new Date(),
      acquisition_source: 'in_store',
      preferred_language: 'ar'
    })

    const progress2 = await CustomerProgress.create({
      customer_id: customer2.customer_id,
      offer_id: offer2.public_id,
      business_id: adminBusiness.public_id,
      current_stamps: 7,
      max_stamps: 10,
      is_completed: false,
      wallet_pass_serial: `LP-${SecureIDGenerator.generateCustomerID().slice(-8).toUpperCase()}`
    })

    // Create Apple Wallet pass for customer 2
    await WalletPass.create({
      customer_id: customer2.customer_id,
      progress_id: progress2.id,
      business_id: adminBusiness.public_id,
      offer_id: offer2.public_id,
      wallet_type: 'apple',
      wallet_serial: `${customer2.customer_id}-${offer2.public_id}-${Date.now()}`,
      pass_status: 'active',
      device_info: { created_by: 'initialization_script' }
    })

    logger.info(`✅ Customer 2 (Apple Wallet): ${customer2.name} (${customer2.customer_id})`)
    logger.info(`   Progress: ${progress2.current_stamps}/${progress2.max_stamps} stamps`)

    // Customer 3: User with BOTH wallets
    const customer3 = await Customer.create({
      customer_id: SecureIDGenerator.generateCustomerID(),
      business_id: adminBusiness.public_id,
      name: 'عبدالله خالد - Abdullah Khalid (Test)',
      phone: '+966 56 456 7890',
      email: 'abdullah.test@example.com',
      status: 'vip',
      lifecycle_stage: 'loyal_customer',
      total_visits: 0,
      total_stamps_earned: 0,
      total_rewards_claimed: 0,
      total_lifetime_value: 0,
      first_visit_date: new Date(),
      last_activity_date: new Date(),
      acquisition_source: 'in_store',
      preferred_language: 'en'
    })

    const progress3 = await CustomerProgress.create({
      customer_id: customer3.customer_id,
      offer_id: offer1.public_id,
      business_id: adminBusiness.public_id,
      current_stamps: 4,
      max_stamps: 5,
      is_completed: false,
      wallet_pass_serial: `LP-${SecureIDGenerator.generateCustomerID().slice(-8).toUpperCase()}`
    })

    // Create BOTH Apple and Google wallet passes for customer 3
    await WalletPass.create({
      customer_id: customer3.customer_id,
      progress_id: progress3.id,
      business_id: adminBusiness.public_id,
      offer_id: offer1.public_id,
      wallet_type: 'google',
      wallet_object_id: `3388000000023017940.${customer3.customer_id}_${offer1.public_id}`,
      pass_status: 'active',
      device_info: { created_by: 'initialization_script' }
    })

    await WalletPass.create({
      customer_id: customer3.customer_id,
      progress_id: progress3.id,
      business_id: adminBusiness.public_id,
      offer_id: offer1.public_id,
      wallet_type: 'apple',
      wallet_serial: `${customer3.customer_id}-${offer1.public_id}-${Date.now()}`,
      pass_status: 'active',
      device_info: { created_by: 'initialization_script' }
    })

    logger.info(`✅ Customer 3 (BOTH wallets): ${customer3.name} (${customer3.customer_id})`)
    logger.info(`   Progress: ${progress3.current_stamps}/${progress3.max_stamps} stamps`)
    logger.info(`   Has Apple Wallet ✅ + Google Wallet ✅`)
    logger.info('')

    // Step 5: Summary
    logger.info('📊 Database Reinitialization Summary:')
    logger.info('=====================================')
    logger.info(`✅ Businesses: 1`)
    logger.info(`✅ Offers: 2`)
    logger.info(`✅ Customers: 3`)
    logger.info(`✅ Customer Progress: 3`)
    logger.info(`✅ Wallet Passes: 4 (1 Google, 1 Apple, 2 Both)`)
    logger.info('')
    logger.info('🔑 Admin Login Credentials:')
    logger.info('   Email: admin@loyaltyplatform.sa')
    logger.info('   Password: admin123')
    logger.info('')
    logger.info('🎉 Database reinitialization completed successfully!')

  } catch (error) {
    logger.error('❌ Database reinitialization failed:', error)
    throw error
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  reinitializeDatabase()
    .then(() => {
      logger.info('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export default reinitializeDatabase
