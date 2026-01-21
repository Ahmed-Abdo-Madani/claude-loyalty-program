#!/usr/bin/env node

/**
 * 🔒 STANDALONE MIGRATION SCRIPT
 * Adds secure ID columns without depending on existing models
 * Run this first to prepare the database for security migration
 */

import pg from 'pg'
import crypto from 'crypto'

const { Client } = pg

// Database configuration (adjust as needed)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'loyalty_platform_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
}

// Secure ID generator (standalone version)
function generateSecureID(type) {
  const prefixes = {
    business: 'biz_',
    offer: 'off_',
    customer: 'cust_',
    branch: 'branch_'
  }
  
  const lengths = {
    business: 26,
    offer: 26,
    customer: 20,
    branch: 20
  }
  
  const randomBytes = crypto.randomBytes(16)
  const randomString = randomBytes.toString('hex').substring(0, lengths[type])
  return prefixes[type] + randomString
}

async function runStandaloneMigration() {
  const client = new Client(dbConfig)
  
  try {
    console.log('🔒 Starting Standalone Security Migration...')
    console.log(`📡 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
    
    await client.connect()
    console.log('✅ Database connected')
    
    // Check if tables exist
    const checkTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('businesses', 'offers', 'branches', 'customer_progress')
    `
    
    const tablesResult = await client.query(checkTablesQuery)
    const existingTables = tablesResult.rows.map(row => row.table_name)
    console.log(`📋 Found tables: ${existingTables.join(', ')}`)
    
    if (existingTables.length === 0) {
      console.log('❌ No tables found. Please run the application first to create tables.')
      return
    }
    
    // 1. Add secure ID columns (if they don't exist)
    console.log('1️⃣  Adding secure ID columns...')
    
    const migrations = [
      {
        table: 'businesses',
        check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'public_id'`,
        add: `ALTER TABLE businesses ADD COLUMN public_id VARCHAR(50) UNIQUE`
      },
      {
        table: 'offers',
        check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'public_id'`,
        add: `ALTER TABLE offers ADD COLUMN public_id VARCHAR(50) UNIQUE`
      },
      {
        table: 'branches',
        check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'public_id'`,
        add: `ALTER TABLE branches ADD COLUMN public_id VARCHAR(50) UNIQUE`
      },
      {
        table: 'customer_progress',
        check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_progress' AND column_name = 'secure_customer_id'`,
        add: `ALTER TABLE customer_progress ADD COLUMN secure_customer_id VARCHAR(50)`
      }
    ]
    
    for (const migration of migrations) {
      try {
        const checkResult = await client.query(migration.check)
        if (checkResult.rows.length === 0) {
          await client.query(migration.add)
          console.log(`✅ Added secure ID column to ${migration.table}`)
        } else {
          console.log(`⏭️  Column already exists in ${migration.table}`)
        }
      } catch (error) {
        console.log(`⚠️  Failed to add column to ${migration.table}: ${error.message}`)
      }
    }
    
    // 2. Create indexes
    console.log('2️⃣  Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_businesses_public_id ON businesses(public_id)',
      'CREATE INDEX IF NOT EXISTS idx_offers_public_id ON offers(public_id)',
      'CREATE INDEX IF NOT EXISTS idx_branches_public_id ON branches(public_id)',
      'CREATE INDEX IF NOT EXISTS idx_customer_progress_secure_customer_id ON customer_progress(secure_customer_id)'
    ]
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery)
        console.log(`✅ Created index`)
      } catch (error) {
        console.log(`⚠️  Index creation failed: ${error.message}`)
      }
    }
    
    // 3. Populate secure IDs for existing records
    console.log('3️⃣  Populating secure IDs...')
    
    // Businesses
    const businessesResult = await client.query('SELECT id FROM businesses WHERE public_id IS NULL')
    console.log(`📊 Found ${businessesResult.rows.length} businesses without secure IDs`)
    
    for (const business of businessesResult.rows) {
      const publicId = generateSecureID('business')
      await client.query('UPDATE businesses SET public_id = $1 WHERE id = $2', [publicId, business.id])
    }
    console.log(`✅ Generated secure IDs for ${businessesResult.rows.length} businesses`)
    
    // Offers
    const offersResult = await client.query('SELECT id FROM offers WHERE public_id IS NULL')
    console.log(`📊 Found ${offersResult.rows.length} offers without secure IDs`)
    
    for (const offer of offersResult.rows) {
      const publicId = generateSecureID('offer')
      await client.query('UPDATE offers SET public_id = $1 WHERE id = $2', [publicId, offer.id])
    }
    console.log(`✅ Generated secure IDs for ${offersResult.rows.length} offers`)
    
    // Branches (if table exists)
    if (existingTables.includes('branches')) {
      const branchesResult = await client.query('SELECT id FROM branches WHERE public_id IS NULL')
      console.log(`📊 Found ${branchesResult.rows.length} branches without secure IDs`)
      
      for (const branch of branchesResult.rows) {
        const publicId = generateSecureID('branch')
        await client.query('UPDATE branches SET public_id = $1 WHERE id = $2', [publicId, branch.id])
      }
      console.log(`✅ Generated secure IDs for ${branchesResult.rows.length} branches`)
    }
    
    // Customer Progress
    if (existingTables.includes('customer_progress')) {
      const progressResult = await client.query('SELECT id, customer_id FROM customer_progress WHERE secure_customer_id IS NULL')
      console.log(`📊 Found ${progressResult.rows.length} progress records without secure customer IDs`)
      
      for (const progress of progressResult.rows) {
        let secureCustomerId
        
        // If customer_id is already secure format, use it
        if (progress.customer_id && progress.customer_id.startsWith('cust_')) {
          secureCustomerId = progress.customer_id
        } else {
          secureCustomerId = generateSecureID('customer')
        }
        
        await client.query('UPDATE customer_progress SET secure_customer_id = $1 WHERE id = $2', [secureCustomerId, progress.id])
      }
      console.log(`✅ Generated secure customer IDs for ${progressResult.rows.length} progress records`)
    }
    
    // 4. Verification
    console.log('4️⃣  Verifying migration...')
    
    const verifyQueries = [
      { name: 'Businesses', query: 'SELECT COUNT(*) as total, COUNT(public_id) as secure FROM businesses' },
      { name: 'Offers', query: 'SELECT COUNT(*) as total, COUNT(public_id) as secure FROM offers' }
    ]
    
    if (existingTables.includes('branches')) {
      verifyQueries.push({ name: 'Branches', query: 'SELECT COUNT(*) as total, COUNT(public_id) as secure FROM branches' })
    }
    
    if (existingTables.includes('customer_progress')) {
      verifyQueries.push({ name: 'Customer Progress', query: 'SELECT COUNT(*) as total, COUNT(secure_customer_id) as secure FROM customer_progress' })
    }
    
    for (const verify of verifyQueries) {
      const result = await client.query(verify.query)
      const row = result.rows[0]
      console.log(`📊 ${verify.name}: ${row.secure}/${row.total} have secure IDs`)
    }
    
    // 5. Show samples
    console.log('5️⃣  Sample secure IDs:')
    
    const sampleBusiness = await client.query('SELECT id, public_id, business_name FROM businesses LIMIT 1')
    if (sampleBusiness.rows.length > 0) {
      const b = sampleBusiness.rows[0]
      console.log(`   Business: "${b.business_name}" → ${b.public_id}`)
    }
    
    const sampleOffer = await client.query('SELECT id, public_id, title FROM offers LIMIT 1')
    if (sampleOffer.rows.length > 0) {
      const o = sampleOffer.rows[0]
      console.log(`   Offer: "${o.title}" → ${o.public_id}`)
    }
    
    console.log('🎉 Standalone migration completed successfully!')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('   1. Update application code to use hybrid authentication')
    console.log('   2. Update API endpoints to accept both ID formats')
    console.log('   3. Implement JWT-based QR codes')
    console.log('   4. Test the application with new secure IDs')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code) {
      console.error(`   Error code: ${error.code}`)
    }
    process.exit(1)
  } finally {
    await client.end()
    console.log('📡 Database connection closed')
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStandaloneMigration()
}

export default runStandaloneMigration