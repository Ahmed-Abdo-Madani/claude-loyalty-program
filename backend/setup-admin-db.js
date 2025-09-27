import pkg from 'pg'
const { Client } = pkg
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function setupAdminDatabase() {
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

    // Check if admin tables already exist
    const checkTablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%admin%' OR table_name LIKE 'platform_%')
    `)

    console.log('📊 Checking existing admin tables...')
    if (checkTablesResult.rows.length > 0) {
      console.log('✅ Found existing admin tables:')
      checkTablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
    } else {
      console.log('❌ No admin tables found - creating them...')
      
      // Read and execute admin schema
      const schemaPath = path.join(__dirname, '..', 'database-admin-schema.sql')
      const schemaSql = fs.readFileSync(schemaPath, 'utf8')
      
      // Execute the schema (split by semicolons and execute each statement)
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      console.log(`📝 Executing ${statements.length} SQL statements...`)
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        if (stmt.trim()) {
          try {
            await client.query(stmt)
            console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`)
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.log(`   ⚠️  Statement ${i + 1} error: ${error.message}`)
            }
          }
        }
      }
      
      console.log('🎉 Admin database setup complete!')
    }

    // Verify admin user exists
    const adminCheck = await client.query(`
      SELECT email, full_name, role FROM platform_admins 
      WHERE email = 'admin@loyaltyplatform.com'
    `)

    if (adminCheck.rows.length > 0) {
      const admin = adminCheck.rows[0]
      console.log('✅ Default admin user found:')
      console.log(`   📧 Email: ${admin.email}`)
      console.log(`   👤 Name: ${admin.full_name}`)
      console.log(`   🔐 Role: ${admin.role}`)
      console.log(`   🔑 Password: admin123`)
    } else {
      console.log('❌ Default admin user not found!')
    }

    console.log('🔒 Admin login credentials:')
    console.log('   📧 Email: admin@loyaltyplatform.com')
    console.log('   🔑 Password: admin123')

  } catch (error) {
    console.error('❌ Database setup error:', error.message)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

setupAdminDatabase()