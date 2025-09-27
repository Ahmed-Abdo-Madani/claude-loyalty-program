import pkg from 'pg'
const { Client } = pkg
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config()

async function setupEssentialAdminTables() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'loyalty_platform_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  })

  try {
    await client.connect()
    console.log('🔗 Connected to PostgreSQL database')

    // Create platform_admins table
    console.log('📝 Creating platform_admins table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        status VARCHAR(20) DEFAULT 'active',
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )
    `)

    // Create admin_sessions table
    console.log('📝 Creating admin_sessions table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES platform_admins(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create admin_actions table (for logging)
    console.log('📝 Creating admin_actions table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES platform_admins(id) ON DELETE SET NULL,
        action_type VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        action_data JSONB,
        ip_address INET,
        user_agent TEXT,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create platform_settings table
    console.log('📝 Creating platform_settings table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        updated_by INTEGER REFERENCES platform_admins(id) ON DELETE SET NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Update businesses table to add status column if it doesn't exist
    console.log('📝 Updating businesses table with status column...')
    try {
      await client.query(`
        ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
      `)
      await client.query(`
        ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
      `)
      await client.query(`
        ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS approved_by INTEGER
      `)
    } catch (error) {
      console.log('⚠️  Business table update warning:', error.message)
    }

    // Create indexes
    console.log('📝 Creating indexes...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token)')

    // Check if default admin exists
    const adminCheck = await client.query(`
      SELECT email FROM platform_admins WHERE email = 'admin@loyaltyplatform.com'
    `)

    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating default admin user...')
      
      // Hash password: admin123
      const password = 'admin123'
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)
      
      await client.query(`
        INSERT INTO platform_admins (email, password_hash, full_name, role, status) 
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'admin@loyaltyplatform.com',
        passwordHash,
        'Platform Administrator', 
        'super_admin',
        'active'
      ])
      
      console.log('✅ Default admin created successfully!')
    } else {
      console.log('✅ Default admin already exists')
    }

    // Insert basic platform settings
    console.log('📝 Setting up platform configuration...')
    const settings = [
      ['platform_name', 'Loyalty Platform', 'string', 'Name of the platform', true],
      ['auto_approve_businesses', 'false', 'boolean', 'Whether to auto-approve new business registrations', false],
      ['wallet_integration_enabled', 'true', 'boolean', 'Whether wallet integrations are enabled', true],
      ['support_email', 'support@loyaltyplatform.com', 'string', 'Support contact email', true]
    ]

    for (const [key, value, type, description, isPublic] of settings) {
      await client.query(`
        INSERT INTO platform_settings (setting_key, setting_value, setting_type, description, is_public)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (setting_key) DO NOTHING
      `, [key, value, type, description, isPublic])
    }

    console.log('🎉 Essential admin database setup complete!')
    console.log('')
    console.log('🔑 Admin Login Credentials:')
    console.log('   📧 Email: admin@loyaltyplatform.com')
    console.log('   🔐 Password: admin123')
    console.log('')
    console.log('🌐 Admin Dashboard URL: http://192.168.8.114:3000/admin')

  } catch (error) {
    console.error('❌ Database setup error:', error.message)
    console.error('Full error:', error)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

setupEssentialAdminTables()