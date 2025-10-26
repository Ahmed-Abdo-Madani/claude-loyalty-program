/**
 * List All Businesses Script
 * Usage: node backend/scripts/list-businesses.js
 */

import sequelize from '../config/database.js'
import Business from '../models/Business.js'

async function listBusinesses() {
  try {
    console.log('📋 Fetching all businesses...\n')
    
    const businesses = await Business.findAll({
      attributes: ['public_id', 'email', 'business_name', 'phone', 'created_at'],
      order: [['created_at', 'DESC']]
    })

    if (businesses.length === 0) {
      console.log('No businesses found in database.')
      process.exit(0)
    }

    console.log(`Found ${businesses.length} business(es):\n`)
    console.log('━'.repeat(100))
    
    businesses.forEach((business, index) => {
      console.log(`\n${index + 1}. ${business.business_name}`)
      console.log(`   ID:      ${business.public_id}`)
      console.log(`   Email:   ${business.email}`)
      console.log(`   Phone:   ${business.phone || 'N/A'}`)
      console.log(`   Created: ${new Date(business.created_at).toLocaleString()}`)
    })
    
    console.log('\n' + '━'.repeat(100))
    console.log(`\nTotal: ${businesses.length} business(es)`)
    console.log('\nℹ️  To reset a password, run:')
    console.log('   node backend/scripts/reset-business-password.js <email> <new-password>')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error listing businesses:', error)
    process.exit(1)
  }
}

listBusinesses()
