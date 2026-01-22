/**
 * Migration Runner Script
 *
 * Safely runs database migrations
 *
 * Usage:
 *   node backend/run-migration.js <migration-file-name>
 *   node backend/run-migration.js 20250131-add-notification-campaign-fields.js
 *
 * Legacy Usage (still supported):
 *   node run-migration.js --migration=NAME   - Run specific migration by alias
 *   node run-migration.js --rollback         - Rollback latest migration
 */

import sequelize from './config/database.js'
import logger from './config/logger.js'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Legacy migration aliases (for backward compatibility)
const MIGRATIONS = {
  'customer-name-fields': './migrations/20250113-add-customer-name-fields.js',
  'wallet-notification-tracking': './migrations/20250114-add-wallet-notification-tracking.js',
  'stamp-display-type': './migrations/20250119-add-stamp-display-type.js',
  'apple-web-service-tables': './migrations/20250120-add-apple-web-service-tables.js',
  'manifest-etag': './migrations/20250122-add-manifest-etag-to-wallet-passes.js',
  'notification-campaign-fields': './migrations/20250131-add-notification-campaign-fields.js'
}

// Default migration (latest)
const DEFAULT_MIGRATION = 'notification-campaign-fields'

async function runMigration() {
  // Parse command line arguments
  const args = process.argv.slice(2)

  let migrationFile
  let migrationPath

  // Check if first argument is a migration filename (new behavior)
  if (args.length > 0 && !args[0].startsWith('--')) {
    migrationFile = args[0]
    migrationPath = path.join(__dirname, 'migrations', migrationFile)

    // Validate file exists
    if (!fs.existsSync(migrationPath)) {
      logger.error(`❌ Migration file not found: ${migrationPath}`)
      logger.info('Available migration files:')
      const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
        .filter(f => f.endsWith('.js'))
      migrationFiles.forEach(f => logger.info(`  - ${f}`))
      process.exit(1)
    }
  } else {
    // Legacy behavior: use --migration=NAME flag
    const migrationArg = args.find(arg => arg.startsWith('--migration='))
    const migrationName = migrationArg ? migrationArg.split('=')[1] : DEFAULT_MIGRATION

    if (!MIGRATIONS[migrationName]) {
      logger.error(`❌ Unknown migration alias: ${migrationName}`)
      logger.info('Available migration aliases:', Object.keys(MIGRATIONS).join(', '))
      process.exit(1)
    }

    migrationFile = migrationName
    migrationPath = path.join(__dirname, MIGRATIONS[migrationName])
  }

  logger.info('╔════════════════════════════════════════════════════════════╗')
  logger.info('║  🗄️  Database Migration Runner                             ║')
  logger.info(`║  Migration: ${migrationFile.substring(0, 43).padEnd(43)} ║`)
  logger.info('╚════════════════════════════════════════════════════════════╝')

  try {
    // Connect to database
    logger.info('\n🔌 Connecting to database...')
    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    // Import migration
    logger.info(`\n📦 Loading migration: ${migrationFile}`)
    const migration = await import(pathToFileURL(migrationPath).href)

    // Handle both default export and named exports
    const upFunction = migration.default?.up || migration.up

    if (!upFunction) {
      logger.error('❌ Migration file missing up() function')
      process.exit(1)
    }

    // Run migration
    logger.info('\n🚀 Running migration UP...')
    await upFunction(sequelize.getQueryInterface(), sequelize.Sequelize)

    logger.info('\n🎉 Migration completed successfully!')

  } catch (error) {
    logger.error('\n❌ Migration failed:', error)
    if (error.message && error.message.includes('does not exist')) {
      logger.error('💡 Hint: Check table/column names in the migration')
    }
    if (error.message && error.message.includes('already exists')) {
      logger.error('💡 Hint: Column/index may already exist - check database schema')
    }
    logger.error('Stack trace:', error.stack)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

// Check for rollback flag
if (process.argv.includes('--rollback')) {
  const args = process.argv.slice(2)

  let migrationFile
  let migrationPath

  // Check if first non-flag argument is a migration filename
  const fileArg = args.find(arg => !arg.startsWith('--'))
  if (fileArg) {
    migrationFile = fileArg
    migrationPath = path.join(__dirname, 'migrations', migrationFile)

    // Validate file exists
    if (!fs.existsSync(migrationPath)) {
      logger.error(`❌ Migration file not found: ${migrationPath}`)
      process.exit(1)
    }
  } else {
    // Legacy behavior: use --migration=NAME flag
    const migrationArg = args.find(arg => arg.startsWith('--migration='))
    const migrationName = migrationArg ? migrationArg.split('=')[1] : DEFAULT_MIGRATION

    if (!MIGRATIONS[migrationName]) {
      logger.error(`❌ Unknown migration alias: ${migrationName}`)
      logger.info('Available migration aliases:', Object.keys(MIGRATIONS).join(', '))
      process.exit(1)
    }

    migrationFile = migrationName
    migrationPath = path.join(__dirname, MIGRATIONS[migrationName])
  }

  logger.info('╔════════════════════════════════════════════════════════════╗')
  logger.info('║  ⏪ Rolling back migration                                  ║')
  logger.info(`║  Migration: ${migrationFile.substring(0, 43).padEnd(43)} ║`)
  logger.info('╚════════════════════════════════════════════════════════════╝')

  sequelize.authenticate()
    .then(async () => {
      logger.info(`\n📦 Loading migration: ${migrationFile}`)
      const migration = await import(pathToFileURL(migrationPath).href)

      // Handle both default export and named exports
      const downFunction = migration.default?.down || migration.down

      if (!downFunction) {
        logger.error('❌ Migration file missing down() function')
        process.exit(1)
      }

      return downFunction(sequelize.getQueryInterface(), sequelize.Sequelize)
    })
    .then(() => {
      logger.info('\n✅ Migration rolled back successfully')
      return sequelize.close()
    })
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('\n❌ Rollback failed:', error.message)
      logger.error('Stack trace:', error.stack)
      sequelize.close()
      process.exit(1)
    })
} else {
  runMigration()
}
