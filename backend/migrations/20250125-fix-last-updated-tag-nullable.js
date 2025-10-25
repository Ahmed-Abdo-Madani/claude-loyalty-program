/**
 * Migration: Fix last_updated_tag Column to Allow NULL for Google Wallet Passes
 *
 * Date: 2025-01-25
 *
 * PROBLEM:
 * Google Wallet pass generation was failing in production with error:
 * "null value in column "last_updated_tag" of relation "wallet_passes" violates not-null constraint"
 *
 * ROOT CAUSE:
 * - Production database has a NOT NULL constraint on last_updated_tag column
 * - This constraint is NOT present in the original migration files
 * - The field is Apple Wallet-specific (used by Apple Web Service Protocol)
 * - Google Wallet passes should have NULL for this field
 * - Schema drift between migration files and production database
 *
 * IMPACT:
 * - Severity: CRITICAL
 * - Google Wallet pass generation: 100% failure rate
 * - Apple Wallet: Not affected
 * - All new customers unable to add passes to Google Wallet
 *
 * SOLUTION:
 * Remove NOT NULL constraint from last_updated_tag column to allow NULL values
 * for Google Wallet passes, since this field is only used by Apple Web Service Protocol.
 *
 * REFERENCES:
 * - Original migration: backend/migrations/20250120-add-apple-web-service-tables.js
 * - Model definition: backend/models/WalletPass.js (line 105-109)
 * - Service logic: backend/services/WalletPassService.js (line 64)
 * - Error logs: browser-console-output-11.log
 */

import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'

export const up = async (queryInterface, Sequelize) => {
  try {
    logger.info('🔄 Migration: Fixing last_updated_tag column to allow NULL for Google Wallet passes')
    logger.info('   Background: This field is Apple Wallet-specific and should be NULL for Google Wallet passes')

    // Step 1: Remove NOT NULL constraint from last_updated_tag column
    logger.info('   Step 1/3: Removing NOT NULL constraint from last_updated_tag column...')
    await queryInterface.sequelize.query(`
      ALTER TABLE wallet_passes
      ALTER COLUMN last_updated_tag DROP NOT NULL;
    `)
    logger.info('   ✅ NOT NULL constraint removed')

    // Step 2: Add column comment documenting Apple-specific usage
    logger.info('   Step 2/3: Adding documentation comment to column...')
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN wallet_passes.last_updated_tag IS
      'Update tag for tracking pass changes (Unix timestamp). Apple Wallet only - NULL for Google Wallet passes. Used by Apple Web Service Protocol passesUpdatedSince endpoint.';
    `)
    logger.info('   ✅ Column comment added')

    // Step 3: Verify the change
    logger.info('   Step 3/3: Verifying column is now nullable...')
    const [results] = await queryInterface.sequelize.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallet_passes'
        AND column_name = 'last_updated_tag';
    `)

    if (results && results.length > 0 && results[0].is_nullable === 'YES') {
      logger.info('   ✅ Verification successful: Column is now nullable')
      logger.info('   ✅ Migration completed successfully!')
      logger.info('')
      logger.info('   📋 Next steps:')
      logger.info('      1. Test Google Wallet pass generation')
      logger.info('      2. Verify Apple Wallet passes still work')
      logger.info('      3. Monitor error logs for constraint violations')
    } else {
      logger.error('   ❌ Verification failed: Column is still NOT NULL')
      throw new Error('Migration verification failed - column is still NOT NULL')
    }

  } catch (error) {
    logger.error('❌ Migration failed:', error.message)
    logger.error('   Error details:', error)
    throw error
  }
}

export const down = async (queryInterface, Sequelize) => {
  try {
    logger.info('🔄 Rolling back: Adding NOT NULL constraint back to last_updated_tag column')
    logger.warn('   ⚠️ WARNING: This will break Google Wallet pass generation!')

    // Step 1: Backfill NULL values for Google Wallet passes before adding NOT NULL constraint
    logger.info('   Step 1/2: Backfilling NULL values with default value for Google Wallet passes...')
    const [updateResult] = await queryInterface.sequelize.query(`
      UPDATE wallet_passes
      SET last_updated_tag = '0'
      WHERE wallet_type = 'google' AND last_updated_tag IS NULL;
    `)
    logger.info(`   ✅ Backfilled ${updateResult.rowCount || 0} Google Wallet passes with default value '0'`)

    // Step 2: Add NOT NULL constraint back
    logger.info('   Step 2/2: Adding NOT NULL constraint back to column...')
    await queryInterface.sequelize.query(`
      ALTER TABLE wallet_passes
      ALTER COLUMN last_updated_tag SET NOT NULL;
    `)
    logger.info('   ✅ NOT NULL constraint added back')
    logger.info('   ✅ Rollback completed')
    logger.warn('   ⚠️ Google Wallet pass generation will now fail again!')

  } catch (error) {
    logger.error('❌ Rollback failed:', error.message)
    logger.error('   Error details:', error)
    throw error
  }
}

// Standalone execution script for production
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  (async () => {
    try {
      logger.info('🚀 Running migration: 20250125-fix-last-updated-tag-nullable')
      logger.info('   Target: wallet_passes table')
      logger.info('   Action: Remove NOT NULL constraint from last_updated_tag column')
      logger.info('')

      // Get database connection
      const { sequelize, queryInterface } = await getDatabase()

      // Authenticate connection
      await sequelize.authenticate()
      logger.info('✅ Database connection established')
      logger.info('')

      // Run migration
      await up(queryInterface, sequelize.Sequelize)

      logger.info('')
      logger.info('========================================')
      logger.info('✅ Migration completed successfully!')
      logger.info('========================================')
      logger.info('')
      logger.info('📋 Verification steps:')
      logger.info('   1. Run: SELECT is_nullable FROM information_schema.columns WHERE table_name = \'wallet_passes\' AND column_name = \'last_updated_tag\';')
      logger.info('      Expected result: YES')
      logger.info('   2. Test Google Wallet pass generation')
      logger.info('   3. Verify Apple Wallet passes still work')
      logger.info('   4. Monitor error logs for 24 hours')
      logger.info('')

      await sequelize.close()
      process.exit(0)

    } catch (error) {
      logger.error('')
      logger.error('========================================')
      logger.error('❌ Migration failed!')
      logger.error('========================================')
      logger.error('Error:', error.message)
      logger.error('Stack:', error.stack)
      logger.error('')
      logger.error('📋 Troubleshooting:')
      logger.error('   1. Check database connection')
      logger.error('   2. Verify wallet_passes table exists')
      logger.error('   3. Check database permissions')
      logger.error('   4. Review error logs above')
      logger.error('')

      process.exit(1)
    }
  })()
}
