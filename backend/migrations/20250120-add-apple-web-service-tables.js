/**
 * Migration: Add Apple Web Service Protocol Support
 *
 * Purpose: Enable dynamic pass updates and push notifications for Apple Wallet
 *
 * Creates:
 * 1. devices table - Store iOS device identifiers and push tokens
 * 2. device_registrations table - Many-to-many relationship (device ↔ pass)
 * 3. Adds fields to wallet_passes table:
 *    - authentication_token: Unique token per pass for web service authentication
 *    - last_updated_tag: Unix timestamp for tracking pass updates
 *    - pass_data_json: Complete pass.json structure for regeneration
 *
 * Apple Web Service Protocol requires:
 * - Device registration tracking
 * - Authentication token validation
 * - Update tag comparison for "passesUpdatedSince" queries
 * - Pass data storage for regeneration
 *
 * Usage:
 *   node migrations/20250120-add-apple-web-service-tables.js
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up() {
  try {
    logger.info('🍎 Adding Apple Web Service Protocol tables and fields...')

    // ========== TABLE 1: devices ==========
    logger.info('📱 Creating devices table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,

        -- Apple Device Library Identifier (unique per device)
        device_library_identifier VARCHAR(100) NOT NULL UNIQUE,

        -- APNs push token (for sending push notifications)
        push_token VARCHAR(200) NOT NULL,

        -- Device metadata (user agent, iOS version, etc.)
        device_info JSONB DEFAULT '{}',

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    logger.info('📇 Creating indexes on devices table...')
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_devices_library_id ON devices(device_library_identifier);
      CREATE INDEX IF NOT EXISTS idx_devices_push_token ON devices(push_token);
      CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen_at);
    `)

    // ========== TABLE 2: device_registrations ==========
    logger.info('🔗 Creating device_registrations table (many-to-many)...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS device_registrations (
        id SERIAL PRIMARY KEY,

        -- Foreign keys
        device_id INTEGER NOT NULL,
        wallet_pass_id INTEGER NOT NULL,

        -- Registration metadata
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Foreign key constraints
        CONSTRAINT fk_device_registrations_device
          FOREIGN KEY (device_id)
          REFERENCES devices(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_device_registrations_wallet_pass
          FOREIGN KEY (wallet_pass_id)
          REFERENCES wallet_passes(id)
          ON DELETE CASCADE,

        -- Unique constraint: one registration per device-pass combination
        CONSTRAINT unique_device_wallet_pass
          UNIQUE (device_id, wallet_pass_id)
      );
    `)

    logger.info('📇 Creating indexes on device_registrations table...')
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_device_registrations_device ON device_registrations(device_id);
      CREATE INDEX IF NOT EXISTS idx_device_registrations_wallet_pass ON device_registrations(wallet_pass_id);
      CREATE INDEX IF NOT EXISTS idx_device_registrations_last_checked ON device_registrations(last_checked_at);
    `)

    // ========== UPDATE wallet_passes TABLE ==========
    logger.info('🔐 Adding authentication_token column to wallet_passes...')
    await sequelize.query(`
      ALTER TABLE wallet_passes
      ADD COLUMN IF NOT EXISTS authentication_token VARCHAR(64) UNIQUE;
    `)

    logger.info('🏷️  Adding last_updated_tag column to wallet_passes...')
    await sequelize.query(`
      ALTER TABLE wallet_passes
      ADD COLUMN IF NOT EXISTS last_updated_tag VARCHAR(50);
    `)

    logger.info('📄 Adding pass_data_json column to wallet_passes...')
    await sequelize.query(`
      ALTER TABLE wallet_passes
      ADD COLUMN IF NOT EXISTS pass_data_json JSONB;
    `)

    logger.info('📇 Creating index on authentication_token...')
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_auth_token ON wallet_passes(authentication_token);
    `)

    logger.info('📇 Creating index on last_updated_tag...')
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_updated_tag ON wallet_passes(last_updated_tag);
    `)

    // ========== BACKFILL EXISTING DATA ==========
    logger.info('🔄 Backfilling authentication tokens for existing Apple Wallet passes...')

    // Generate authentication tokens for existing Apple Wallet passes
    // Token format: base64(customer_id:offer_id:timestamp)[:16]
    await sequelize.query(`
      UPDATE wallet_passes
      SET authentication_token = SUBSTRING(
        encode(
          convert_to(customer_id || ':' || offer_id || ':' || EXTRACT(EPOCH FROM created_at)::TEXT, 'UTF8'),
          'base64'
        ),
        1, 32
      ),
      last_updated_tag = EXTRACT(EPOCH FROM COALESCE(last_updated_at, updated_at, created_at))::TEXT
      WHERE wallet_type = 'apple'
        AND authentication_token IS NULL;
    `)

    logger.info('✅ Apple Web Service Protocol tables created successfully')
    logger.info('📊 Summary:')
    logger.info('   - devices table: Store iOS device info and push tokens')
    logger.info('   - device_registrations table: Track device-to-pass relationships')
    logger.info('   - wallet_passes updates: authentication_token, last_updated_tag, pass_data_json')

  } catch (error) {
    logger.error('❌ Failed to create Apple Web Service tables:', error)
    throw error
  }
}

export async function down() {
  try {
    logger.info('🗑️  Rolling back Apple Web Service Protocol tables...')

    logger.info('🗑️  Dropping device_registrations table...')
    await sequelize.query(`
      DROP TABLE IF EXISTS device_registrations CASCADE;
    `)

    logger.info('🗑️  Dropping devices table...')
    await sequelize.query(`
      DROP TABLE IF EXISTS devices CASCADE;
    `)

    logger.info('🗑️  Removing columns from wallet_passes...')
    await sequelize.query(`
      ALTER TABLE wallet_passes
      DROP COLUMN IF EXISTS authentication_token,
      DROP COLUMN IF EXISTS last_updated_tag,
      DROP COLUMN IF EXISTS pass_data_json;
    `)

    logger.info('✅ Apple Web Service Protocol tables removed successfully')

  } catch (error) {
    logger.error('❌ Failed to rollback Apple Web Service tables:', error)
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
      logger.info('   1. Update WalletPass model to include new fields')
      logger.info('   2. Create Device and DeviceRegistration models')
      logger.info('   3. Implement Apple Web Service Protocol endpoints')
      logger.info('   4. Update appleWalletController to add webServiceURL')
      logger.info('')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration failed:', error)
      process.exit(1)
    }
  })()
}
