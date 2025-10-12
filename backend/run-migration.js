/**
 * Migration Runner Script
 *
 * Safely runs the offer_card_designs table migration
 */

import { up, down } from './migrations/006-create-offer-card-designs-table.js'
import sequelize from './config/database.js'
import logger from './config/logger.js'

async function runMigration() {
  logger.info('╔════════════════════════════════════════════════════════════╗')
  logger.info('║  🗄️  Database Migration Runner                             ║')
  logger.info('║  Migration: 006-create-offer-card-designs-table           ║')
  logger.info('╚════════════════════════════════════════════════════════════╝')

  try {
    // Connect to database
    logger.info('\n🔌 Connecting to database...')
    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    // Check if table already exists
    logger.info('\n🔍 Checking if table exists...')
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'offer_card_designs'
      );
    `)

    const tableExists = results[0].exists

    if (tableExists) {
      logger.warn('⚠️  Table offer_card_designs already exists')
      logger.info('\nOptions:')
      logger.info('  1. Skip migration (table already exists)')
      logger.info('  2. Drop and recreate (WARNING: data loss)')
      logger.info('\nTo drop and recreate, run: node backend/run-migration.js --force')

      if (process.argv.includes('--force')) {
        logger.warn('\n⚠️  --force flag detected. Dropping table...')
        await down()
        logger.info('✅ Table dropped')
      } else {
        logger.info('\n✅ Skipping migration (use --force to recreate)')
        process.exit(0)
      }
    }

    // Run migration
    logger.info('\n🚀 Running migration UP...')
    await up()

    // Verify table was created
    logger.info('\n🔍 Verifying table creation...')
    const [verifyResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'offer_card_designs'
      );
    `)

    if (verifyResults[0].exists) {
      logger.info('✅ Table created successfully')

      // Get column count
      const [columns] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'offer_card_designs';
      `)

      logger.info(`📊 Table has ${columns[0].count} columns`)

      // Get index count
      const [indexes] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE tablename = 'offer_card_designs';
      `)

      logger.info(`📇 Table has ${indexes[0].count} indexes`)

      logger.info('\n🎉 Migration completed successfully!')
    } else {
      logger.error('❌ Table was not created. Check logs above for errors.')
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
