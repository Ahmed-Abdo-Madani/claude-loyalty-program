import sequelize from '../config/database.js'
import { QueryTypes } from 'sequelize'
import logger from '../config/logger.js'

/**
 * Migration: Add first_name and last_name columns to customers table
 *
 * This migration:
 * 1. Adds first_name and last_name columns to customers table
 * 2. Migrates existing 'name' data to first_name/last_name (if name column exists)
 * 3. Removes the old 'name' column (it becomes a VIRTUAL field in the model)
 */

export async function up() {
  const transaction = await sequelize.transaction()

  try {
    logger.info('🔄 Starting migration: Add first_name and last_name to customers')

    // Check if customers table exists
    const [tables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname='public' AND tablename='customers'
    `, { transaction })

    if (tables.length === 0) {
      logger.info('⏭️ Customers table does not exist yet - skipping migration')
      await transaction.commit()
      return
    }

    // Check if first_name column already exists
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='customers' AND column_name='first_name'
    `, { transaction })

    if (columns.length > 0) {
      logger.info('✅ first_name column already exists - skipping migration')
      await transaction.commit()
      return
    }

    // Step 1: Add first_name and last_name columns
    logger.info('📝 Adding first_name and last_name columns...')
    await sequelize.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)
    `, { transaction, type: QueryTypes.RAW })

    // Step 2: Check if old 'name' column exists and migrate data
    const [nameColumn] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='customers' AND column_name='name'
    `, { transaction })

    if (nameColumn.length > 0) {
      logger.info('🔄 Migrating data from name column to first_name/last_name...')

      // Split existing names into first and last (simple split on space)
      await sequelize.query(`
        UPDATE customers
        SET
          first_name = CASE
            WHEN name IS NOT NULL AND position(' ' IN name) > 0
            THEN TRIM(SUBSTRING(name FROM 1 FOR position(' ' IN name) - 1))
            ELSE name
          END,
          last_name = CASE
            WHEN name IS NOT NULL AND position(' ' IN name) > 0
            THEN TRIM(SUBSTRING(name FROM position(' ' IN name) + 1))
            ELSE NULL
          END
        WHERE name IS NOT NULL
      `, { transaction, type: QueryTypes.UPDATE })

      // Drop the old name column since it's now a VIRTUAL field in the model
      logger.info('🗑️ Removing old name column (now VIRTUAL in model)...')
      await sequelize.query(`
        ALTER TABLE customers DROP COLUMN IF EXISTS name
      `, { transaction, type: QueryTypes.RAW })
    }

    await transaction.commit()
    logger.info('✅ Migration completed: first_name and last_name columns added')

  } catch (error) {
    await transaction.rollback()
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

export async function down() {
  const transaction = await sequelize.transaction()

  try {
    logger.info('🔄 Rolling back migration: Remove first_name and last_name')

    // Re-add name column
    await sequelize.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS name VARCHAR(255)
    `, { transaction, type: QueryTypes.RAW })

    // Combine first_name and last_name back into name
    await sequelize.query(`
      UPDATE customers
      SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
      WHERE first_name IS NOT NULL OR last_name IS NOT NULL
    `, { transaction, type: QueryTypes.UPDATE })

    // Drop first_name and last_name columns
    await sequelize.query(`
      ALTER TABLE customers
      DROP COLUMN IF EXISTS first_name,
      DROP COLUMN IF EXISTS last_name
    `, { transaction, type: QueryTypes.RAW })

    await transaction.commit()
    logger.info('✅ Migration rolled back successfully')

  } catch (error) {
    await transaction.rollback()
    logger.error('❌ Rollback failed:', error)
    throw error
  }
}

// Allow running migration directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await up()
      await sequelize.close()
      console.log('✅ Database connection closed')
      process.exit(0)
    } catch (error) {
      console.error('Migration failed:', error)
      await sequelize.close()
      console.log('✅ Database connection closed')
      process.exit(1)
    }
  })()
}
