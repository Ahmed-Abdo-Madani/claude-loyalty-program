/**
 * Migration: Add Device Logs Table
 *
 * Purpose: Create device_logs table for storing error logs from Apple Wallet PassKit devices
 *
 * Creates:
 * 1. device_logs table - Store error messages, warnings, and info logs from devices
 *
 * This table is used by the Apple Web Service Protocol's /v1/log endpoint
 * to help debug pass issues and monitor device behavior.
 *
 * Usage:
 *   node backend/migrations/20250127-add-device-logs-table.js
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up() {
  try {
    logger.info('📝 Creating device_logs table...')

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS device_logs (
        id SERIAL PRIMARY KEY,

        -- Associated device (optional, may not always be identifiable)
        device_id INTEGER,

        -- Log message from PassKit
        log_message TEXT NOT NULL,

        -- Log severity level
        log_level VARCHAR(20) NOT NULL DEFAULT 'error',

        -- Device user agent string
        user_agent VARCHAR(500),

        -- Client IP address
        ip_address VARCHAR(50),

        -- Additional context (headers, request info)
        metadata JSONB,

        -- When log was received
        logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        -- Foreign key constraint (SET NULL on device deletion)
        CONSTRAINT fk_device_logs_device
          FOREIGN KEY (device_id)
          REFERENCES devices(id)
          ON DELETE SET NULL
      );
    `)

    logger.info('📇 Creating indexes on device_logs table...')
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_device_logs_device ON device_logs(device_id);
      CREATE INDEX IF NOT EXISTS idx_device_logs_logged_at ON device_logs(logged_at);
      CREATE INDEX IF NOT EXISTS idx_device_logs_level ON device_logs(log_level);
    `)

    logger.info('✅ device_logs table created successfully')
    logger.info('📊 Table structure:')
    logger.info('   - device_id: Optional link to devices table')
    logger.info('   - log_message: Error/warning message from PassKit')
    logger.info('   - log_level: error, warn, or info')
    logger.info('   - user_agent: HTTP User-Agent from device')
    logger.info('   - ip_address: Client IP for tracking')
    logger.info('   - metadata: Additional request context')
    logger.info('   - logged_at: Timestamp of log receipt')

  } catch (error) {
    logger.error('❌ Failed to create device_logs table:', error)
    throw error
  }
}

export async function down() {
  try {
    logger.info('🗑️  Dropping device_logs table...')

    await sequelize.query(`
      DROP TABLE IF EXISTS device_logs CASCADE;
    `)

    logger.info('✅ device_logs table removed successfully')

  } catch (error) {
    logger.error('❌ Failed to drop device_logs table:', error)
    throw error
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')

      await up()

      logger.info('🎉 Migration completed successfully')
      logger.info('')
      logger.info('📝 Next steps:')
      logger.info('   1. DeviceLog model is already created')
      logger.info('   2. /v1/log endpoint can now store logs in database')
      logger.info('   3. Consider setting up log retention policy')
      logger.info('')
      
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration failed:', error)
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(1)
    }
  })()
}
