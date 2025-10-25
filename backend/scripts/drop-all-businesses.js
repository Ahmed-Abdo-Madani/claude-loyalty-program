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

    // Start deletion with transaction
    console.log('🗑️  Starting deletion process...')
    console.log('')

    await sequelize.transaction(async (transaction) => {
      // Delete in correct order to respect foreign key constraints
      
      // 1. Delete device registrations (references wallet_passes and devices)
      console.log('🗑️  Deleting device registrations...')
      await sequelize.query('DELETE FROM device_registrations', { transaction })
      
      // 2. Delete device logs
      console.log('🗑️  Deleting device logs...')
      await sequelize.query('DELETE FROM device_logs', { transaction })
      
      // 3. Delete wallet passes (references customers and offers)
      console.log('🗑️  Deleting wallet passes...')
      await sequelize.query('DELETE FROM wallet_passes', { transaction })
      
      // 4. Delete customer progress (references customers and offers)
      console.log('🗑️  Deleting customer progress...')
      await sequelize.query('DELETE FROM customer_progress', { transaction })
      
      // 5. Delete customers (references offers)
      console.log('🗑️  Deleting customers...')
      await sequelize.query('DELETE FROM customers', { transaction })
      
      // 6. Delete card designs (references offers)
      console.log('🗑️  Deleting offer card designs...')
      await sequelize.query('DELETE FROM offer_card_designs', { transaction })
      
      // 7. Delete offers (references businesses and branches)
      console.log('🗑️  Deleting offers...')
      await sequelize.query('DELETE FROM offers', { transaction })
      
      // 8. Delete branches (references businesses)
      console.log('🗑️  Deleting branches...')
      await sequelize.query('DELETE FROM branches', { transaction })
      
      // 9. Delete devices (no foreign key dependencies)
      console.log('🗑️  Deleting devices...')
      await sequelize.query('DELETE FROM devices', { transaction })
      
      // 10. Finally delete businesses
      console.log('🗑️  Deleting businesses...')
      await sequelize.query('DELETE FROM businesses', { transaction })
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
