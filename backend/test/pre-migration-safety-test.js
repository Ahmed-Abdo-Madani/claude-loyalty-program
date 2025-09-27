#!/usr/bin/env node

/**
 * 🧪 PRE-MIGRATION SAFETY TEST
 * Verifies database structure and creates test data if needed
 * Run this BEFORE the actual migration to ensure safety
 */

import { sequelize } from '../config/database.js'
import { syncDatabase, seedDatabase } from '../models/index.js'
import logger from '../config/logger.js'

async function runPreMigrationTest() {
  try {
    logger.info('🧪 Running Pre-Migration Safety Tests...')
    
    // 1. Test database connection
    logger.info('1️⃣  Testing database connection...')
    await sequelize.authenticate()
    logger.info('✅ Database connection successful')
    
    // 2. Check current schema
    logger.info('2️⃣  Checking current database schema...')
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    const tableNames = tables.map(t => t.table_name)
    logger.info(`📋 Existing tables: ${tableNames.join(', ')}`)
    
    const requiredTables = ['businesses', 'offers', 'branches', 'customer_progress']
    const missingTables = requiredTables.filter(t => !tableNames.includes(t))
    
    if (missingTables.length > 0) {
      logger.warn(`⚠️  Missing tables: ${missingTables.join(', ')}`)
      logger.info('🔧 Creating missing tables...')
      await syncDatabase(false)  // Don't force, just sync
      logger.info('✅ Tables created')
    }
    
    // 3. Check if we have test data
    logger.info('3️⃣  Checking for existing data...')
    const [businessCount] = await sequelize.query('SELECT COUNT(*) as count FROM businesses')
    const [offerCount] = await sequelize.query('SELECT COUNT(*) as count FROM offers')
    
    logger.info(`📊 Current data: ${businessCount[0].count} businesses, ${offerCount[0].count} offers`)
    
    if (businessCount[0].count === 0) {
      logger.info('🌱 No data found, seeding database...')
      await seedDatabase()
      logger.info('✅ Test data seeded')
    }
    
    // 4. Check current column structure
    logger.info('4️⃣  Analyzing current schema...')
    const [businessCols] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'businesses'
      ORDER BY ordinal_position
    `)
    
    const [offerCols] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'offers'
      ORDER BY ordinal_position
    `)
    
    logger.info('📋 Business table columns:')
    businessCols.forEach(col => {
      logger.info(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
    
    logger.info('📋 Offer table columns:')
    offerCols.forEach(col => {
      logger.info(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
    
    // 5. Check if secure columns already exist
    const hasBusinessPublicId = businessCols.some(col => col.column_name === 'public_id')
    const hasOfferPublicId = offerCols.some(col => col.column_name === 'public_id')
    
    logger.info('5️⃣  Checking migration status...')
    logger.info(`   Business public_id exists: ${hasBusinessPublicId ? '✅' : '❌'}`)
    logger.info(`   Offer public_id exists: ${hasOfferPublicId ? '✅' : '❌'}`)
    
    if (hasBusinessPublicId && hasOfferPublicId) {
      logger.warn('⚠️  Migration columns already exist!')
      
      // Check if they're populated
      const [businessSecure] = await sequelize.query(`
        SELECT COUNT(*) as total, COUNT(public_id) as secure 
        FROM businesses
      `)
      const [offerSecure] = await sequelize.query(`
        SELECT COUNT(*) as total, COUNT(public_id) as secure 
        FROM offers
      `)
      
      logger.info(`📊 Secure ID population:`)
      logger.info(`   Businesses: ${businessSecure[0].secure}/${businessSecure[0].total}`)
      logger.info(`   Offers: ${offerSecure[0].secure}/${offerSecure[0].total}`)
      
      if (businessSecure[0].secure === businessSecure[0].total && 
          offerSecure[0].secure === offerSecure[0].total) {
        logger.info('✅ Migration appears to be complete!')
        return { migrationNeeded: false, status: 'complete' }
      } else {
        logger.info('🔄 Migration partially complete')
        return { migrationNeeded: true, status: 'partial' }
      }
    }
    
    // 6. Final safety check
    logger.info('6️⃣  Final safety check...')
    const [sampleBusiness] = await sequelize.query(`
      SELECT id, business_name, email, status 
      FROM businesses 
      LIMIT 1
    `)
    
    const [sampleOffer] = await sequelize.query(`
      SELECT id, title, business_id, status 
      FROM offers 
      LIMIT 1
    `)
    
    if (sampleBusiness.length > 0) {
      logger.info(`📋 Sample business: ${sampleBusiness[0].business_name} (ID: ${sampleBusiness[0].id})`)
    }
    
    if (sampleOffer.length > 0) {
      logger.info(`📋 Sample offer: ${sampleOffer[0].title} (ID: ${sampleOffer[0].id})`)
    }
    
    logger.info('✅ Pre-migration tests passed!')
    logger.info('🚀 Ready for migration')
    
    return { 
      migrationNeeded: true, 
      status: 'ready',
      businessCount: businessCount[0].count,
      offerCount: offerCount[0].count
    }
    
  } catch (error) {
    logger.error('❌ Pre-migration test failed', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPreMigrationTest()
    .then((result) => {
      logger.info(`✅ Pre-migration test completed: ${result.status}`)
      if (result.migrationNeeded) {
        logger.info('🔄 Run the migration script next')
      } else {
        logger.info('✨ No migration needed')
      }
      process.exit(0)
    })
    .catch((error) => {
      logger.error('❌ Pre-migration test failed', error)
      process.exit(1)
    })
}

export default runPreMigrationTest