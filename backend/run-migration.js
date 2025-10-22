/**
 * Migration Runner Script
 *
 * Safely runs database migrations
 *
 * Usage:
 *   node run-migration.js                    - Run latest migration
 *   node run-migration.js --rollback         - Rollback latest migration
 *   node run-migration.js --migration=NAME   - Run specific migration
 */

import sequelize from './config/database.js'
import logger from './config/logger.js'

// Available migrations
const MIGRATIONS = {
  'customer-name-fields': './migrations/20250113-add-customer-name-fields.js',
  'wallet-notification-tracking': './migrations/20250114-add-wallet-notification-tracking.js',
  'stamp-display-type': './migrations/20250119-add-stamp-display-type.js',
  'apple-web-service-tables': './migrations/20250120-add-apple-web-service-tables.js',
  'manifest-etag': './migrations/20250122-add-manifest-etag-to-wallet-passes.js'
}

// Default migration (latest)
const DEFAULT_MIGRATION = 'manifest-etag'

async function runMigration() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const migrationArg = args.find(arg => arg.startsWith('--migration='))
  const migrationName = migrationArg ? migrationArg.split('=')[1] : DEFAULT_MIGRATION

  if (!MIGRATIONS[migrationName]) {
    logger.error(`❌ Unknown migration: ${migrationName}`)
    logger.info('Available migrations:', Object.keys(MIGRATIONS).join(', '))
    process.exit(1)
  }

  const migrationPath = MIGRATIONS[migrationName]

  logger.info('╔════════════════════════════════════════════════════════════╗')
  logger.info('║  🗄️  Database Migration Runner                             ║')
  logger.info(`║  Migration: ${migrationName.padEnd(43)} ║`)
  logger.info('╚════════════════════════════════════════════════════════════╝')

  try {
    // Connect to database
    logger.info('\n🔌 Connecting to database...')
    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    // Import migration
    logger.info(`\n📦 Loading migration: ${migrationName}`)
    const { up } = await import(migrationPath)

    // Get Sequelize QueryInterface and Sequelize constructor
    const queryInterface = sequelize.getQueryInterface()
    const Sequelize = (await import('sequelize')).default

    // Run migration
    logger.info('\n🚀 Running migration UP...')
    await up(queryInterface, Sequelize)

    logger.info('\n🎉 Migration completed successfully!')

  } catch (error) {
    logger.error('\n❌ Migration failed:', error)
    logger.error('Stack trace:', error.stack)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

// Check for rollback flag
if (process.argv.includes('--rollback')) {
  const args = process.argv.slice(2)
  const migrationArg = args.find(arg => arg.startsWith('--migration='))
  const migrationName = migrationArg ? migrationArg.split('=')[1] : DEFAULT_MIGRATION

  if (!MIGRATIONS[migrationName]) {
    logger.error(`❌ Unknown migration: ${migrationName}`)
    logger.info('Available migrations:', Object.keys(MIGRATIONS).join(', '))
    process.exit(1)
  }

  const migrationPath = MIGRATIONS[migrationName]

  logger.info('╔════════════════════════════════════════════════════════════╗')
  logger.info('║  ⏪ Rolling back migration                                  ║')
  logger.info(`║  Migration: ${migrationName.padEnd(43)} ║`)
  logger.info('╚════════════════════════════════════════════════════════════╝')

  sequelize.authenticate()
    .then(async () => {
      logger.info(`\n📦 Loading migration: ${migrationName}`)
      const { down } = await import(migrationPath)

      // Get Sequelize QueryInterface and Sequelize constructor
      const queryInterface = sequelize.getQueryInterface()
      const Sequelize = (await import('sequelize')).default

      return down(queryInterface, Sequelize)
    })
    .then(() => {
      logger.info('\n✅ Migration rolled back successfully')
      return sequelize.close()
    })
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('\n❌ Rollback failed:', error)
      sequelize.close()
      process.exit(1)
    })
} else {
  runMigration()
}
