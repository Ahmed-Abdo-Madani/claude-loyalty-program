import bcrypt from 'bcryptjs'

// Test the admin password hash
const testPassword = 'admin123'
const correctHash = '$2b$10$jU2Plk9YVQA87C6hM.u8Tuxh1/Zn7k/cwzKH5doan1i6nkzRieS1e'

console.log('🔐 Testing Admin Password Hash...')
console.log('Password:', testPassword)
console.log('Hash:', correctHash)

const isValid = bcrypt.compareSync(testPassword, correctHash)
console.log('✅ Hash validation result:', isValid)

if (isValid) {
  console.log('🎉 SUCCESS: The password hash is correct!')
  console.log('📋 Admin Login Credentials:')
  console.log('   Email: admin@loyaltyplatform.com')
  console.log('   Password: admin123')
} else {
  console.log('❌ ERROR: The password hash is incorrect!')
}