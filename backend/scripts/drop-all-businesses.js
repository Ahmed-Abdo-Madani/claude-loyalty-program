/**
 * Drop All Businesses Script
 * 
 * WARNING: This script will DELETE ALL businesses and their related data:
 * - All offers
 * - All branches
 * - All customers
 * - All customer progress
 * - All wallet passes
 * - All card designs
 * - All device registrations
 * 
 * This action is IRREVERSIBLE in production!
 * Use only for development/testing or to start fresh.
 */

import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
})

async function dropAllBusinesses() {
  console.log('⚠️  DROP ALL BUSINESSES SCRIPT')
  console.log('=' .repeat(50))
  console.log('')
  console.log('⚠️  WARNING: This will permanently delete:')
  console.log('   - All businesses')
  console.log('   - All offers')
  console.log('   - All branches')
  console.log('   - All customers')
  console.log('   - All customer progress')
  console.log('   - All wallet passes')
  console.log('   - All card designs')
  console.log('   - All device registrations')
  console.log('')
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
  console.log('📁 Database:', process.env.DATABASE_URL ? 'Connected' : 'Not configured')
  console.log('')

  try {
    // Test connection
    await sequelize.authenticate()
    console.log('✅ Database connection established')
    console.log('')

    // Get count of businesses before deletion
    const [businessCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM businesses'
    )
    const count = parseInt(businessCount[0].count)

    if (count === 0) {
      console.log('ℹ️  No businesses found in database')
      console.log('✅ Database is already clean')
      return
    }

    console.log(`📊 Found ${count} business(es) to delete`)
    console.log('')

    // Show businesses that will be deleted
    const [businesses] = await sequelize.query(
      'SELECT public_id, business_name, owner_email FROM businesses ORDER BY created_at'
    )

    console.log('📋 Businesses to be deleted:')
    businesses.forEach((business, index) => {
      console.log(`   ${index + 1}. ${business.business_name} (${business.public_id})`)
      console.log(`      Owner: ${business.owner_email}`)
    })
    console.log('')

    // Get related data counts
    const [offerCount] = await sequelize.query('SELECT COUNT(*) as count FROM offers')
    const [customerCount] = await sequelize.query('SELECT COUNT(*) as count FROM customers')
    const [branchCount] = await sequelize.query('SELECT COUNT(*) as count FROM branches')
    const [passCount] = await sequelize.query('SELECT COUNT(*) as count FROM wallet_passes')

    console.log('📊 Related data to be deleted:')
    console.log(`   - ${offerCount[0].count} offer(s)`)
    console.log(`   - ${customerCount[0].count} customer(s)`)
    console.log(`   - ${branchCount[0].count} branch(es)`)
    console.log(`   - ${passCount[0].count} wallet pass(es)`)
    console.log('')

    // Confirmation prompt
    console.log('⏳ Starting deletion in 3 seconds...')
    console.log('   Press Ctrl+C to cancel')
    console.log('')

    await new Promise(resolve => setTimeout(resolve, 3000))

    // Check which tables exist before starting transaction
    console.log('� Checking which tables exist...')
    const tablesToDelete = [
      { name: 'device_registrations', description: 'device registrations' },
      { name: 'device_logs', description: 'device logs' },
      { name: 'wallet_passes', description: 'wallet passes' },
      { name: 'customer_progress', description: 'customer progress' },
      { name: 'customers', description: 'customers' },
      { name: 'offer_card_designs', description: 'offer card designs' },
      { name: 'offers', description: 'offers' },
      { name: 'branches', description: 'branches' },
      { name: 'devices', description: 'devices' },
      { name: 'businesses', description: 'businesses' }
    ]

    const existingTables = []
    for (const table of tablesToDelete) {
      const [result] = await sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table.name}'
        )`
      )
      if (result[0].exists) {
        existingTables.push(table)
      } else {
        console.log(`   ⚠️  Table '${table.name}' does not exist, will skip`)
      }
    }

    console.log(`✅ Found ${existingTables.length} tables to delete`)
    console.log('')

    // Start deletion with transaction
    console.log('🗑️  Starting deletion process...')
    console.log('')

    await sequelize.transaction(async (transaction) => {
      // Delete from existing tables only
      for (const table of existingTables) {
        console.log(`🗑️  Deleting ${table.description}...`)
        await sequelize.query(`DELETE FROM ${table.name}`, { transaction })
      }
    })

    console.log('')
    console.log('✅ All businesses and related data deleted successfully!')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   - Deleted ${count} business(es)`)
    console.log(`   - Deleted ${offerCount[0].count} offer(s)`)
    console.log(`   - Deleted ${customerCount[0].count} customer(s)`)
    console.log(`   - Deleted ${branchCount[0].count} branch(es)`)
    console.log(`   - Deleted ${passCount[0].count} wallet pass(es)`)
    console.log('')
    console.log('✨ Database is now clean and ready for fresh data')

  } catch (error) {
    console.error('')
    console.error('❌ Error:', error.message)
    console.error('')
    if (error.stack) {
      console.error('Stack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

// Run the script
dropAllBusinesses()
  .then(() => {
    console.log('')
    console.log('🎉 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('')
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
