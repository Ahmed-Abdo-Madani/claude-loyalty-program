/**
 * Initialize Platform Admin and Approve Business Accounts
 * 
 * This script:
 * 1. Creates platform admin tables if they don't exist
 * 2. Creates a default super admin account
 * 3. Lists all pending business accounts
 * 4. Approves all pending business accounts
 * 
 * Usage:
 *   node backend/scripts/init-admin-approve-businesses.js
 */

import pkg from 'pg'
const { Client } = pkg
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: './backend/.env' })

async function initializeAdminAndApproveBusinesses() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'loyalty_program',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    })

    try {
        await client.connect()
        console.log('🔗 Connected to PostgreSQL database')
        console.log('')

        // ============================================
        // STEP 1: Create Platform Admin Tables
        // ============================================
        console.log('📝 Step 1: Setting up platform admin tables...')

        await client.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES platform_admins(id)
      )
    `)
        console.log('   ✅ platform_admins table ready')

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
        console.log('   ✅ admin_sessions table ready')

        // Create indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email)')
        await client.query('CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token)')
        console.log('   ✅ Indexes created')
        console.log('')

        // ============================================
        // STEP 2: Create Default Super Admin
        // ============================================
        console.log('👤 Step 2: Creating default super admin account...')

        const adminCheck = await client.query(`
      SELECT id, email, full_name, role FROM platform_admins WHERE email = 'toni91994@gmail.com'
    `)

        let adminId
        if (adminCheck.rows.length === 0) {
            const password = 'Watashi12Des'
            const saltRounds = 10
            const passwordHash = await bcrypt.hash(password, saltRounds)

            const result = await client.query(`
        INSERT INTO platform_admins (email, password_hash, full_name, role, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, full_name, role
      `, [
                'toni91994@gmail.com',
                passwordHash,
                'Platform Administrator',
                'super_admin',
                'active'
            ])

            adminId = result.rows[0].id
            console.log('   ✅ Super admin created successfully!')
            console.log(`      ID: ${result.rows[0].id}`)
            console.log(`      Email: ${result.rows[0].email}`)
            console.log(`      Name: ${result.rows[0].full_name}`)
            console.log(`      Role: ${result.rows[0].role}`)
        } else {
            adminId = adminCheck.rows[0].id
            console.log('   ✅ Super admin already exists')
            console.log(`      ID: ${adminCheck.rows[0].id}`)
            console.log(`      Email: ${adminCheck.rows[0].email}`)
            console.log(`      Name: ${adminCheck.rows[0].full_name}`)
            console.log(`      Role: ${adminCheck.rows[0].role}`)
        }
        console.log('')

        // ============================================
        // STEP 3: List Pending Businesses
        // ============================================
        console.log('📋 Step 3: Checking for pending business accounts...')

        const pendingBusinesses = await client.query(`
      SELECT public_id, business_name, email, created_at, status
      FROM businesses
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `)

        if (pendingBusinesses.rows.length === 0) {
            console.log('   ℹ️  No pending business accounts found')
        } else {
            console.log(`   📊 Found ${pendingBusinesses.rows.length} pending business account(s):`)
            console.log('')
            pendingBusinesses.rows.forEach((business, index) => {
                console.log(`   ${index + 1}. ${business.business_name}`)
                console.log(`      ID: ${business.public_id}`)
                console.log(`      Email: ${business.email}`)
                console.log(`      Created: ${business.created_at}`)
                console.log(`      Status: ${business.status}`)
                console.log('')
            })
        }

        // ============================================
        // STEP 4: Approve All Pending Businesses
        // ============================================
        if (pendingBusinesses.rows.length > 0) {
            console.log('✅ Step 4: Approving all pending business accounts...')

            const approvalResult = await client.query(`
        UPDATE businesses
        SET 
          status = 'active',
          approved_at = CURRENT_TIMESTAMP,
          approved_by = $1,
          is_verified = true
        WHERE status = 'pending'
        RETURNING public_id, business_name, email
      `, [adminId])

            console.log(`   ✅ Approved ${approvalResult.rows.length} business account(s):`)
            approvalResult.rows.forEach((business, index) => {
                console.log(`   ${index + 1}. ${business.business_name} (${business.email})`)
            })
        } else {
            console.log('✅ Step 4: No businesses to approve')
        }
        console.log('')

        // ============================================
        // Summary
        // ============================================
        console.log('═══════════════════════════════════════════════════════════')
        console.log('🎉 Initialization Complete!')
        console.log('═══════════════════════════════════════════════════════════')
        console.log('')
        console.log('🔑 Admin Login Credentials:')
        console.log('   📧 Email: toni91994@gmail.com')
        console.log('   🔐 Password: Watashi12Des')
        console.log('')
        console.log('🌐 Admin Dashboard URL:')
        console.log('   http://localhost:3000/admin')
        console.log('')

        // Show current business statistics
        const businessStats = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM businesses
      GROUP BY status
      ORDER BY status
    `)

        console.log('📊 Business Account Statistics:')
        if (businessStats.rows.length === 0) {
            console.log('   No business accounts found')
        } else {
            businessStats.rows.forEach(stat => {
                console.log(`   ${stat.status}: ${stat.count}`)
            })
        }
        console.log('')

    } catch (error) {
        console.error('❌ Error:', error.message)
        console.error('Full error:', error)
        process.exit(1)
    } finally {
        await client.end()
        console.log('🔌 Database connection closed')
    }
}

initializeAdminAndApproveBusinesses()
