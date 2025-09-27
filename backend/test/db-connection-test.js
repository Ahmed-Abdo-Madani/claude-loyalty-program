#!/usr/bin/env node

/**
 * 🔍 DATABASE CONNECTION TEST
 * Simple test to check if we can connect to the database
 */

console.log('🔍 Testing database connection...')

try {
  // Try to import pg
  const pg = await import('pg')
  const { Client } = pg.default
  
  console.log('✅ PostgreSQL module loaded')
  
  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'loyalty_platform_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  }
  
  console.log(`📡 Attempting connection to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
  console.log(`👤 User: ${dbConfig.user}`)
  
  const client = new Client(dbConfig)
  
  await client.connect()
  console.log('✅ Database connection successful!')
  
  // Check if tables exist
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `)
  
  console.log(`📋 Found ${result.rows.length} tables:`)
  result.rows.forEach(row => {
    console.log(`   - ${row.table_name}`)
  })
  
  await client.end()
  console.log('✅ Database test completed successfully!')
  
} catch (error) {
  console.error('❌ Database test failed:')
  console.error(`   Error: ${error.message}`)
  
  if (error.code === 'ECONNREFUSED') {
    console.error('   💡 Solution: Make sure PostgreSQL is running')
  } else if (error.code === '28P01') {
    console.error('   💡 Solution: Check database username/password')
  } else if (error.code === '3D000') {
    console.error('   💡 Solution: Create the database first')
  }
  
  process.exit(1)
}