/**
 * Deploy Migrations Script
 * 
 * Purpose: Execute pending database migrations during Render.com's preDeploy phase
 * This ensures database schema is updated before new code goes live (zero-downtime)
 * 
 * Exit Codes:
 * - 0: Success (all migrations applied or no pending migrations)
 * - 1: Failure (migration failed, database connection failed, or validation error)
 * 
 * Usage:
 * - Automatic: Called by Render's preDeployCommand in render.yaml
 * - Manual: node backend/scripts/deploy-migrations.js
 * - Dry-run: node backend/scripts/deploy-migrations.js --dry-run
 * 
 * Date: 2025-02-03
 */

import AutoMigrationRunner from '../services/AutoMigrationRunner.js'
import logger from '../config/logger.js'
import sequelize from '../config/database.js'

// Script timeout (5 minutes - Render's default is 10 minutes)
const SCRIPT_TIMEOUT = 5 * 60 * 1000

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  
  try {
    // Log deployment context
    logger.info('🚀 Render.com Pre-Deploy: Running database migrations')
    logger.info(`   📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    
    // Mask database URL for security
    const dbUrl = process.env.DATABASE_URL || 'not set'
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':***@')
    logger.info(`   🔗 Database: ${maskedUrl}`)
    
    // Log Render metadata if available
    if (process.env.RENDER_GIT_COMMIT) {
      logger.info(`   📦 Commit: ${process.env.RENDER_GIT_COMMIT.substring(0, 7)}`)
    }
    if (process.env.RENDER_SERVICE_ID) {
      logger.info(`   🔧 Service: ${process.env.RENDER_SERVICE_ID}`)
    }
    
    logger.info(`   ⏰ Timestamp: ${new Date().toISOString()}`)
    
    if (isDryRun) {
      logger.info('   🧪 DRY RUN MODE - No changes will be made')
    }
    
    // Validate environment
    if (!process.env.DATABASE_URL) {
      logger.error('❌ DATABASE_URL environment variable is not set')
      logger.error('   Cannot proceed without database connection')
      process.exit(1)
    }
    
    // Test database connection
    logger.info('🔌 Testing database connection...')
    
    try {
      await sequelize.authenticate()
      logger.info('   ✅ Database connection successful')
    } catch (error) {
      logger.error('❌ Database connection failed:', error.message)
      logger.error('   Ensure DATABASE_URL is correct and database is accessible')
      process.exit(1)
    }
    
    // Run auto-migrations with longer timeout for preDeploy
    logger.info('🔄 Checking for pending database migrations...')
    
    const result = await AutoMigrationRunner.runPendingMigrations({
      stopOnError: true,
      lockTimeout: 60000, // 60 seconds for preDeploy (longer than startup)
      dryRun: isDryRun
    })
    
    // Handle results
    if (result.failed > 0) {
      logger.error('❌ DEPLOYMENT BLOCKED: Migration failures detected')
      logger.error(`   Applied: ${result.applied}, Failed: ${result.failed}, Total: ${result.total}`)
      logger.error('   Fix the failed migrations and retry deployment')
      logger.error('   Failed migrations:')
      
      result.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          logger.error(`   - ${r.migration}: ${r.error}`)
        })
      
      await sequelize.close()
      process.exit(1)
      
    } else if (result.applied > 0) {
      logger.info('✅ Auto-migrations completed successfully')
      logger.info(`   📊 Applied: ${result.applied}, Total: ${result.total}`)
      logger.info(`   ⏱️  Total execution time: ${result.totalExecutionTime}ms`)
      logger.info('🎉 Pre-deploy migrations completed - deployment can proceed')
      
    } else if (result.skipped > 0) {
      logger.info('🧪 DRY RUN: Would apply the following migrations:')
      const pending = await AutoMigrationRunner.getPendingMigrations()
      pending.forEach((migration, index) => {
        logger.info(`   ${index + 1}. ${migration}`)
      })
      logger.info('   Run without --dry-run to execute migrations')
      
    } else {
      logger.info('✅ No pending migrations - database schema is up to date')
      logger.info('🎉 Pre-deploy check completed - deployment can proceed')
    }
    
    // Close database connection
    await sequelize.close()
    
    // Exit with success
    process.exit(0)
    
  } catch (error) {
    logger.error('❌ CRITICAL: Pre-deploy migration script failed')
    logger.error(`   Error: ${error.message}`)
    logger.error(`   Stack: ${error.stack}`)
    logger.error('🛑 DEPLOYMENT BLOCKED: Fix the error and retry')
    
    // Remediation steps
    logger.error('')
    logger.error('📋 Remediation steps:')
    logger.error('   1. Review the error message above')
    logger.error('   2. Fix the migration file or database issue')
    logger.error('   3. Test locally: npm run migrate:auto:dry-run')
    logger.error('   4. Commit and push the fix')
    logger.error('   5. Render will automatically retry deployment')
    
    try {
      await sequelize.close()
    } catch (closeError) {
      logger.error('   ⚠️  Could not close database connection:', closeError.message)
    }
    
    process.exit(1)
  }
}

// Set script timeout
setTimeout(() => {
  logger.error('❌ TIMEOUT: Migration script exceeded 5 minute limit')
  logger.error('   This may indicate a stuck migration or slow database')
  logger.error('   Check database performance and migration complexity')
  process.exit(1)
}, SCRIPT_TIMEOUT)

// Run main function
main().catch(error => {
  logger.error('❌ Unhandled error in deploy-migrations script:', error)
  process.exit(1)
})
