import { sequelize } from './models/index.js'
import PlatformAdmin from './models/PlatformAdmin.js'
import AdminSession from './models/AdminSession.js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

async function initializePlatformAdmin() {
  try {
    console.log('🔐 Initializing Platform Admin System...')
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development')

    // Test database connection
    await sequelize.authenticate()
    console.log('✅ Database connection established')

    // Sync PlatformAdmin and AdminSession tables
    console.log('📋 Creating platform admin tables...')
    await PlatformAdmin.sync({ force: false }) // Create if doesn't exist, don't alter
    await AdminSession.sync({ force: false })
    console.log('✅ Platform admin tables synchronized')

    // Check if super admin exists
    const existingAdmin = await PlatformAdmin.findOne({
      where: { email: 'super_admin@madna.me' }
    })

    if (existingAdmin) {
      console.log('ℹ️  Super admin already exists:', existingAdmin.email)
      console.log('   Role:', existingAdmin.role)
      console.log('   Status:', existingAdmin.status)
      return
    }

    // Create super admin account
    console.log('👤 Creating super admin account...')
    const passwordHash = await bcrypt.hash('MadnaAdmin2024!', 12)

    const superAdmin = await PlatformAdmin.create({
      email: 'super_admin@madna.me',
      password_hash: passwordHash,
      full_name: 'Madna Platform Administrator',
      role: 'super_admin',
      status: 'active',
      created_by: null
    })

    console.log('✅ Super admin created successfully!')
    console.log('   ID:', superAdmin.id)
    console.log('   Email:', superAdmin.email)
    console.log('   Role:', superAdmin.role)
    console.log('')
    console.log('🔑 Admin Login Credentials:')
    console.log('   Email: super_admin@madna.me')
    console.log('   Password: MadnaAdmin2024!')
    console.log('')
    console.log('🔗 Login URL:')
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://app.madna.me'
      : 'http://localhost:3000'
    console.log('   Frontend: ' + baseUrl + '/admin/login')
    console.log('   API: ' + (process.env.BASE_URL || 'http://localhost:3001') + '/api/admin/auth/login')
    console.log('')
    console.log('🎉 Platform admin initialization completed!')

  } catch (error) {
    console.error('❌ Admin initialization failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run initialization
initializePlatformAdmin()
  .then(() => {
    console.log('✅ Admin initialization successful')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  })
