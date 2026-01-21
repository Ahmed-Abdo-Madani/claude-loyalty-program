#!/usr/bin/env node

/**
 * 🔒 PHASE 1: CAUTIOUS DATABASE MIGRATION
 * Adds secure ID columns alongside existing integer IDs
 * This allows for gradual migration with zero downtime
 */

import { sequelize } from '../config/database.js'
import logger from '../config/logger.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

async function runCautiousMigration() {
  try {
    logger.info('🚀 Starting Cautious Security Migration - Phase 1')
    logger.info('⚠️  This migration adds secure ID columns WITHOUT dropping existing data')

    // 1. Add secure ID columns to existing tables
    logger.info('1️⃣  Adding secure ID columns...')
    
    const queries = [
      // Add public_id to businesses table (if not exists)
      `ALTER TABLE businesses 
       ADD COLUMN IF NOT EXISTS public_id VARCHAR(50) UNIQUE;`,
      
      // Add public_id to offers table (if not exists) 
      `ALTER TABLE offers 
       ADD COLUMN IF NOT EXISTS public_id VARCHAR(50) UNIQUE;`,
       
      // Add public_id to branches table (if not exists)
      `ALTER TABLE branches 
       ADD COLUMN IF NOT EXISTS public_id VARCHAR(50) UNIQUE;`,
       
      // Update customer_progress to use VARCHAR customer_id
      `ALTER TABLE customer_progress 
       ADD COLUMN IF NOT EXISTS secure_customer_id VARCHAR(50);`,
       
      // Add indexes for performance
      `CREATE INDEX IF NOT EXISTS idx_businesses_public_id ON businesses(public_id);`,
      `CREATE INDEX IF NOT EXISTS idx_offers_public_id ON offers(public_id);`,
      `CREATE INDEX IF NOT EXISTS idx_branches_public_id ON branches(public_id);`,
      `CREATE INDEX IF NOT EXISTS idx_customer_progress_secure_customer_id ON customer_progress(secure_customer_id);`
    ]

    for (const query of queries) {
      await sequelize.query(query)
      logger.info(`✅ Executed: ${query.split('\n')[0].trim()}...`)
    }

    // 2. Populate secure IDs for existing records
    logger.info('2️⃣  Populating secure IDs for existing records...')
    
    // Populate businesses
    const [businesses] = await sequelize.query(
      'SELECT id FROM businesses WHERE public_id IS NULL'
    )
    
    for (const business of businesses) {
      const publicId = SecureIDGenerator.generateBusinessID()
      await sequelize.query(
        'UPDATE businesses SET public_id = ? WHERE id = ?',
        { replacements: [publicId, business.id] }
      )
    }
    logger.info(`✅ Generated secure IDs for ${businesses.length} businesses`)

    // Populate offers
    const [offers] = await sequelize.query(
      'SELECT id FROM offers WHERE public_id IS NULL'
    )
    
    for (const offer of offers) {
      const publicId = SecureIDGenerator.generateOfferID()
      await sequelize.query(
        'UPDATE offers SET public_id = ? WHERE id = ?',
        { replacements: [publicId, offer.id] }
      )
    }
    logger.info(`✅ Generated secure IDs for ${offers.length} offers`)

    // Populate branches
    const [branches] = await sequelize.query(
      'SELECT id FROM branches WHERE public_id IS NULL'
    )
    
    for (const branch of branches) {
      const publicId = SecureIDGenerator.generateBranchID()
      await sequelize.query(
        'UPDATE branches SET public_id = ? WHERE id = ?',
        { replacements: [publicId, branch.id] }
      )
    }
    logger.info(`✅ Generated secure IDs for ${branches.length} branches`)

    // Populate customer progress secure IDs
    const [customerProgress] = await sequelize.query(
      'SELECT id, customer_id FROM customer_progress WHERE secure_customer_id IS NULL'
    )
    
    for (const progress of customerProgress) {
      let secureCustomerId
      
      // If customer_id is already secure format, use it
      if (progress.customer_id && progress.customer_id.startsWith('cust_')) {
        secureCustomerId = progress.customer_id
      } else {
        // Generate new secure customer ID
        secureCustomerId = SecureIDGenerator.generateCustomerID()
      }
      
      await sequelize.query(
        'UPDATE customer_progress SET secure_customer_id = ? WHERE id = ?',
        { replacements: [secureCustomerId, progress.id] }
      )
    }
    logger.info(`✅ Generated secure customer IDs for ${customerProgress.length} progress records`)

    // 3. Verify migration success
    logger.info('3️⃣  Verifying migration...')
    
    const [businessCount] = await sequelize.query(
      'SELECT COUNT(*) as total, COUNT(public_id) as secure FROM businesses'
    )
    const [offerCount] = await sequelize.query(
      'SELECT COUNT(*) as total, COUNT(public_id) as secure FROM offers'
    )
    const [branchCount] = await sequelize.query(
      'SELECT COUNT(*) as total, COUNT(public_id) as secure FROM branches'
    )
    const [progressCount] = await sequelize.query(
      'SELECT COUNT(*) as total, COUNT(secure_customer_id) as secure FROM customer_progress'
    )

    logger.info(`📊 Migration Results:`)
    logger.info(`   Businesses: ${businessCount[0].secure}/${businessCount[0].total} have secure IDs`)
    logger.info(`   Offers: ${offerCount[0].secure}/${offerCount[0].total} have secure IDs`)
    logger.info(`   Branches: ${branchCount[0].secure}/${branchCount[0].total} have secure IDs`)
    logger.info(`   Customer Progress: ${progressCount[0].secure}/${progressCount[0].total} have secure IDs`)

    // 4. Show sample secure IDs
    logger.info('4️⃣  Sample secure IDs:')
    const [sampleBusiness] = await sequelize.query(
      'SELECT id, public_id, business_name FROM businesses LIMIT 1'
    )
    const [sampleOffer] = await sequelize.query(
      'SELECT id, public_id, title FROM offers LIMIT 1'
    )
    
    if (sampleBusiness.length > 0) {
      logger.info(`   Business: ${sampleBusiness[0].business_name} → ${sampleBusiness[0].public_id}`)
    }
    if (sampleOffer.length > 0) {
      logger.info(`   Offer: ${sampleOffer[0].title} → ${sampleOffer[0].public_id}`)
    }

    logger.info('🎉 Phase 1 Migration completed successfully!')
    logger.info('📋 Next Steps:')
    logger.info('   1. Update API endpoints to accept both integer and secure IDs')
    logger.info('   2. Update frontend to use secure IDs for new records')
    logger.info('   3. Implement JWT-based QR codes')
    logger.info('   4. Gradually phase out integer IDs')
    
  } catch (error) {
    logger.error('❌ Migration failed', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCautiousMigration()
    .then(async () => {
      logger.info('✅ Migration completed')
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(0)
    })
    .catch(async (error) => {
      logger.error('❌ Migration failed', error)
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(1)
    })
}

export default runCautiousMigration