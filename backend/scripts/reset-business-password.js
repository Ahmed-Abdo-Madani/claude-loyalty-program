/**
 * Reset Business Password Script
 * Usage: node backend/scripts/reset-business-password.js <email> <new-password>
 */

import bcrypt from 'bcrypt'
import sequelize from '../config/database.js'
import Business from '../models/Business.js'

async function resetPassword(email, newPassword) {
  try {
    console.log('🔍 Looking for business with email:', email)
    
    const business = await Business.findOne({
      where: { email }
    })

    if (!business) {
      console.error('❌ Business not found with email:', email)
      process.exit(1)
    }

    console.log('✅ Business found:')
    console.log('   ID:', business.public_id)
    console.log('   Name:', business.business_name)
    console.log('   Email:', business.email)

    // Hash new password
    console.log('\n🔒 Hashing new password...')
    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(newPassword, salt)

    // Update password
    console.log('💾 Updating password in database...')
    await business.update({ password_hash })

    console.log('✅ Password reset successfully!')
    console.log('\n📋 New credentials:')
    console.log('   Email:', business.email)
    console.log('   Password:', newPassword)
    console.log('\n⚠️  Save these credentials securely and delete this output!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error resetting password:', error)
    process.exit(1)
  }
}

// Parse command line arguments
const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Usage: node backend/scripts/reset-business-password.js <email> <new-password>')
  console.error('Example: node backend/scripts/reset-business-password.js test@example.com NewPass123!')
  process.exit(1)
}

resetPassword(email, newPassword)
