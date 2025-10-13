/**
 * Migration Runner Script
 *
 * Safely runs the customer name fields migration
 */

import { up, down } from './migrations/20250113-add-customer-name-fields.js'
import sequelize from './config/database.js'
import logger from './config/logger.js'

async function runMigration() {
  logger.info('╔════════════════════════════════════════════════════════════╗')
  logger.info('║  🗄️  Database Migration Runner                             ║')
  logger.info('║  Migration: Add Customer Name Fields                      ║')
  logger.info('╚════════════════════════════════════════════════════════════╝')

  try {
    // Connect to database
    logger.info('\n🔌 Connecting to database...')
    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    // Check if first_name column already exists
    logger.info('\n🔍 Checking if columns exist...')
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'customers'
        AND column_name = 'first_name'
      );
    `)

    const columnsExist = results[0].exists

    if (columnsExist) {
      logger.warn('⚠️  first_name column already exists')
      logger.info('\n✅ Skipping migration (columns already added)')
      process.exit(0)
    }

    // Run migration
    logger.info('\n🚀 Running migration UP...')
    await up()

    // Verify columns were created
    logger.info('\n🔍 Verifying column creation...')
    const [verifyResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('first_name', 'last_name')
      ORDER BY column_name;
    `)

    if (verifyResults.length === 2) {
      logger.info('✅ Columns created successfully')
      logger.info(`📊 Added columns: ${verifyResults.map(r => r.column_name).join(', ')}`)
      logger.info('\n🎉 Migration completed successfully!')
    } else {
      logger.error('❌ Columns were not created. Check logs above for errors.')
      process.exit(1)
    }

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
  logger.info('╔════════════════════════════════════════════════════════════╗')
  logger.info('║  ⏪ Rolling back migration                                  ║')
  logger.info('╚════════════════════════════════════════════════════════════╝')

  sequelize.authenticate()
    .then(() => down())
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
