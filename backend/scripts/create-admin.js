import bcrypt from 'bcryptjs'
import { Business } from '../models/index.js'
import sequelize from '../config/database.js'

async function createAdminAccount() {
  try {
    console.log('🔧 Creating platform admin account...')
    
    // Admin credentials
    const adminEmail = 'admin@madna.me'
    const adminPassword = 'Admin@2025'
    const businessName = 'Platform Admin'
    
    // Check if admin already exists
    const existingAdmin = await Business.findOne({
      where: { email: adminEmail }
    })
    
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!')
      console.log('📧 Email:', adminEmail)
      console.log('🆔 Business ID:', existingAdmin.public_id)
      return
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    
    // Create admin business account
    const admin = await Business.create({
      email: adminEmail,
      password_hash: passwordHash,
      business_name: businessName,
      business_name_ar: 'مدير المنصة',
      phone: '+966500000000',
      business_type: 'Platform Administration',
      region: 'Riyadh Region',
      city: 'Riyadh',
      district: 'Al-Olaya',
      address: 'Platform Admin Office',
      status: 'active',
      subscription_tier: 'enterprise',
      is_verified: true
    })
    
    console.log('✅ Admin account created successfully!')
    console.log('')
    console.log('📋 Admin Credentials:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:    ', adminEmail)
    console.log('🔑 Password: ', adminPassword)
    console.log('🆔 Business ID:', admin.public_id)
    console.log('👤 Name:     ', businessName)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('⚠️  IMPORTANT: Change this password after first login!')
    console.log('🌐 Login at: http://localhost:3000')
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error)
  } finally {
    await sequelize.close()
  }
}

createAdminAccount()
