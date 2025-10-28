/**
 * Expire Completed Passes Script
 * 
 * Daily cron job to automatically expire wallet passes that have been completed
 * for more than the configured threshold (default: 30 days).
 * 
 * This script should be run once per day (recommended: 2 AM local time) via:
 * - Cron job: 0 2 * * * node backend/scripts/expire-completed-passes.js
 * - npm script: npm run expire-passes
 * - Render cron job: Configure in render.yaml or dashboard
 * 
 * Usage:
 * - Normal run: node backend/scripts/expire-completed-passes.js
 * - Dry run (no changes): node backend/scripts/expire-completed-passes.js --dry-run
 * - Custom threshold: node backend/scripts/expire-completed-passes.js --days 45
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'
import PassLifecycleService from '../services/PassLifecycleService.js'

// Parse command-line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const daysIndex = args.indexOf('--days')
const daysAfterCompletion = daysIndex !== -1 ? parseInt(args[daysIndex + 1]) : 30

async function expireCompletedPasses() {
  try {
    await sequelize.authenticate()
    logger.info('✅ Database connection established')
    
    const mode = isDryRun ? 'DRY RUN' : 'PRODUCTION'
    logger.info(`🔄 Starting pass expiration script (${mode} mode)`)
    logger.info(`⏱️ Threshold: ${daysAfterCompletion} days after completion`)
    
    // Get passes eligible for expiration
    const result = await PassLifecycleService.expireAllCompletedPasses(
      daysAfterCompletion,
      isDryRun
    )
    
    logger.info('✅ Expiration results:', {
      totalExpired: result.expired.length,
      totalNotified: result.notified.length,
      totalErrors: result.errors.length
    })
    
    // Log details of expired passes
    if (result.expired.length > 0) {
      logger.info(`✅ Expired ${result.expired.length} passes:`)
      result.expired.forEach(pass => {
        logger.info(`  - Pass ${pass.wallet_serial || pass.wallet_object_id} (Customer: ${pass.customer_id}, Offer: ${pass.offer_id})`)
      })
    }
    
    // Log notification successes
    if (result.notified.length > 0) {
      logger.info(`📲 Sent ${result.notified.length} expiration notifications`)
    }
    
    // Log errors
    if (result.errors.length > 0) {
      logger.error(`❌ ${result.errors.length} errors occurred:`)
      result.errors.forEach(error => {
        logger.error(`  - ${error.message}`)
      })
    }
    
    if (isDryRun) {
      logger.info('🔍 DRY RUN - No changes were made to the database')
    }
    
    // Cleanup old expired passes (90 days after expiration)
    logger.info('🧹 Running cleanup for old expired passes...')
    const cleanupResult = await PassLifecycleService.cleanupExpiredPasses(90, isDryRun)
    
    logger.info('✅ Cleanup results:', {
      totalCleaned: cleanupResult.cleaned.length,
      totalErrors: cleanupResult.errors.length
    })
    
    if (cleanupResult.cleaned.length > 0) {
      logger.info(`🗑️ Soft-deleted ${cleanupResult.cleaned.length} old passes`)
    }
    
    if (cleanupResult.errors.length > 0) {
      logger.error(`❌ ${cleanupResult.errors.length} cleanup errors occurred`)
    }
    
    await sequelize.close()
    logger.info('✅ Database connection closed')
    logger.info('✅ Pass expiration script completed successfully')
    
    process.exit(0)
    
  } catch (error) {
    logger.error('❌ Pass expiration script failed:', error)
    
    try {
      await sequelize.close()
    } catch (closeError) {
      logger.error('❌ Failed to close database connection:', closeError)
    }
    
    process.exit(1)
  }
}

// Add script execution info
logger.info('========================================')
logger.info('🎯 Wallet Pass Expiration Script')
logger.info('========================================')
logger.info(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'PRODUCTION (live changes)'}`)
logger.info(`Threshold: ${daysAfterCompletion} days after completion`)
logger.info(`Started at: ${new Date().toISOString()}`)
logger.info('========================================')

// Run the script
expireCompletedPasses()
