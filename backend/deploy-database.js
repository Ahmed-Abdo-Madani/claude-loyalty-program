import { syncDatabase, seedDatabase } from './models/index.js'
import { Business } from './models/index.js'
import bcrypt from 'bcryptjs'
import logger from './config/logger.js'
import dotenv from 'dotenv'

dotenv.config()

async function deployProductionDatabase() {
  try {
    console.log('🚀 Setting up Production Database for Madna Loyalty Platform...')
    console.log('🌍 Environment:', process.env.NODE_ENV)
    console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Not configured')

    // Sync database schema (create tables if they don't exist)
    await syncDatabase(false) // Don't force recreate in production
    console.log('✅ Database schema synchronized')

    // Check if we need to seed initial data
    const businessCount = await Business.count()
    if (businessCount === 0) {
      console.log('🌱 No businesses found, creating initial demo account...')

      // Create initial admin business account
      const adminBusiness = await Business.create({
        email: 'super_admin@madna.me',
        password_hash: await bcrypt.hash('MadnaAdmin2024!', 10),
        business_name: 'Madna Platform Admin',
        business_name_ar: 'إدارة منصة مدنا',
        phone: '+966 11 000-0000',
        business_type: 'Platform Management',
        license_number: 'MADNA-ADMIN-001',
        description: 'Madna Loyalty Platform Administrative Account',
        region: 'Central Region',
        city: 'الرياض - Riyadh',
        address: 'Madna Platform Headquarters',
        owner_name: 'Platform Administrator',
        owner_name_ar: 'مدير المنصة',
        owner_id: 'ADMIN001',
        owner_phone: '+966 11 000-0000',
        owner_email: 'super_admin@madna.me',
        status: 'active',
        approved_at: new Date(),
        approved_by: 'system',
        total_branches: 1,
        total_offers: 0,
        active_offers: 0
      })

      console.log(`✅ Admin account created: ${adminBusiness.email}`)
      console.log(`🔑 Business ID: ${adminBusiness.public_id}`)

      // Create a demo business for testing
      const demoBusiness = await Business.create({
        email: 'demo@madna.me',
        password_hash: await bcrypt.hash('Demo123!', 10),
        business_name: 'مطعم مدنا التجريبي - Madna Demo Restaurant',
        business_name_ar: 'مطعم مدنا التجريبي',
        phone: '+966 11 123-4567',
        business_type: 'Restaurant & Cafe',
        license_number: 'MADNA-DEMO-001',
        description: 'Demo restaurant for Madna loyalty platform',
        region: 'Central Region',
        city: 'الرياض - Riyadh',
        address: 'Demo Street, Riyadh',
        owner_name: 'محمد الدمو - Mohammed Al-Demo',
        owner_name_ar: 'محمد الدمو',
        owner_id: 'DEMO001',
        owner_phone: '+966 11 123-4567',
        owner_email: 'demo@madna.me',
        status: 'active',
        approved_at: new Date(),
        approved_by: adminBusiness.public_id,
        total_branches: 1,
        total_offers: 0,
        active_offers: 0
      })

      console.log(`✅ Demo account created: ${demoBusiness.email}`)
      console.log(`🔑 Business ID: ${demoBusiness.public_id}`)

    } else {
      console.log(`📊 Database already contains ${businessCount} businesses`)
    }

    console.log('🎉 Production database deployment completed!')
    console.log('')
    console.log('📋 Production Credentials:')
    console.log('   Admin: super_admin@madna.me / MadnaAdmin2024!')
    console.log('   Demo:  demo@madna.me / Demo123!')
    console.log('')
    console.log('🔗 API Endpoints:')
    console.log('   Health: https://api.madna.me/health')
    console.log('   Login:  https://api.madna.me/api/business/login')
    console.log('   Dashboard: https://app.madna.me')

  } catch (error) {
    console.error('❌ Production database deployment failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Check if running in production
if (process.env.NODE_ENV === 'production') {
  deployProductionDatabase()
    .then(() => {
      console.log('✅ Production deployment completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Production deployment failed:', error)
      process.exit(1)
    })
} else {
  console.log('⚠️  This script should only be run in production environment')
  console.log('Set NODE_ENV=production to run database deployment')
  process.exit(1)
}