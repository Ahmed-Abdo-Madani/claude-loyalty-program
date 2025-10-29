import bcrypt from 'bcryptjs'
import PlatformAdmin from '../models/PlatformAdmin.js'
import sequelize from '../config/database.js'

async function createPlatformAdmin() {
  try {
    console.log('🔧 Creating platform admin account...')
    
    // Admin credentials
    const adminEmail = 'admin@madna.me'
    const adminPassword = 'Admin@2025'
    const fullName = 'Platform Administrator'
    
    // Check if admin already exists
    const existingAdmin = await PlatformAdmin.findOne({
      where: { email: adminEmail }
    })
    
    if (existingAdmin) {
      console.log('⚠️  Platform admin account already exists!')
      console.log('📧 Email:', adminEmail)
      console.log('🆔 Admin ID:', existingAdmin.id)
      console.log('👤 Name:', existingAdmin.full_name)
      console.log('🔑 Role:', existingAdmin.role)
      return
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    
    // Create platform admin account
    const admin = await PlatformAdmin.create({
      email: adminEmail,
      password_hash: passwordHash,
      full_name: fullName,
      role: 'super_admin',
      status: 'active'
    })
    
    console.log('✅ Platform admin account created successfully!')
    console.log('')
    console.log('📋 Admin Credentials:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:    ', adminEmail)
    console.log('🔑 Password: ', adminPassword)
    console.log('🆔 Admin ID: ', admin.id)
    console.log('👤 Name:     ', fullName)
    console.log('🔐 Role:     ', admin.role)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('⚠️  IMPORTANT: Change this password after first login!')
    console.log('🌐 Login at: http://localhost:3000/admin/login')
    
  } catch (error) {
    console.error('❌ Error creating platform admin account:', error)
  } finally {
    await sequelize.close()
  }
}

createPlatformAdmin()
