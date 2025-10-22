/**
 * Migration: Add manifest_etag Column to wallet_passes
 *
 * Purpose: Enable ETag-based HTTP caching for Apple Wallet pass updates
 *
 * Adds:
 * - manifest_etag: VARCHAR(32) - ETag computed from manifest hash for HTTP caching
 *
 * Background:
 * The manifest_etag field stores a deterministic hash computed from the pass manifest
 * (which includes SHA-1 hashes of pass.json and all image files). This enables
 * reliable HTTP caching via If-None-Match header, which is more robust than
 * Last-Modified header across servers and timezones.
 *
 * Implementation:
 * - The ETag is computed in appleWalletController.computeManifestETag()
 * - Format: SHA-256 hash of sorted manifest entries, first 16 chars, quoted
 * - Example: "abc123def4567890"
 * - Used by GET /v1/passes/{passTypeId}/{serialNumber} endpoint
 *
 * Usage:
 *   node backend/migrations/20250122-add-manifest-etag-to-wallet-passes.js
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up() {
  try {
    logger.info('🔖 Adding manifest_etag column to wallet_passes table...')

    // ========== ADD manifest_etag COLUMN ==========
    logger.info('📝 Adding manifest_etag column...')
    await sequelize.query(`
      ALTER TABLE wallet_passes 
      ADD COLUMN IF NOT EXISTS manifest_etag VARCHAR(32) NULL;
    `)

    // Add comment to column for documentation
    await sequelize.query(`
      COMMENT ON COLUMN wallet_passes.manifest_etag IS 
      'ETag computed from manifest hash for HTTP caching (Apple Wallet only)';
    `)

    logger.info('✅ manifest_etag column added successfully')

    // ========== ADD INDEX ==========
    // Index on manifest_etag for faster lookups (useful if querying by ETag)
    logger.info('📇 Creating index on manifest_etag...')
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_manifest_etag 
      ON wallet_passes(manifest_etag);
    `)

    logger.info('✅ Index created successfully')

    // ========== VERIFY CHANGES ==========
    logger.info('🔍 Verifying column exists...')
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallet_passes' 
        AND column_name = 'manifest_etag';
    `)

    if (results.length > 0) {
      logger.info('✅ Verification successful:', results[0])
    } else {
      throw new Error('Column manifest_etag not found after migration')
    }

    logger.info('✅ Migration completed successfully')

  } catch (error) {
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

export async function down() {
  try {
    logger.info('⏪ Rolling back manifest_etag column...')

    // Drop index first
    logger.info('🗑️  Dropping index on manifest_etag...')
    await sequelize.query(`
      DROP INDEX IF EXISTS idx_wallet_passes_manifest_etag;
    `)

    // Drop column
    logger.info('🗑️  Dropping manifest_etag column...')
    await sequelize.query(`
      ALTER TABLE wallet_passes 
      DROP COLUMN IF EXISTS manifest_etag;
    `)

    logger.info('✅ Rollback completed successfully')

  } catch (error) {
    logger.error('❌ Rollback failed:', error)
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
      logger.info('   1. Verify WalletPass model has manifest_etag field (STRING(32))')
      logger.info('   2. Test pass generation to ensure ETag is computed and stored')
      logger.info('   3. Test GET /v1/passes endpoint with If-None-Match header')
      logger.info('   4. Monitor 304 Not Modified responses in production')
      logger.info('')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration failed:', error)
      process.exit(1)
    }
  })()
}
