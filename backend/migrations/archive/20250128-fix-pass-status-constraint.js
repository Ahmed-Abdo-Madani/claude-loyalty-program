import { Sequelize } from 'sequelize'
import logger from '../config/logger.js'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Migration: Fix pass_status CHECK constraint
 * 
 * ⚠️ USAGE INSTRUCTIONS:
 * 
 * This migration is ONLY for UPGRADING existing databases that already ran the
 * 20250127-add-pass-lifecycle-fields.js migration BEFORE the CHECK constraint fix
 * was added to it.
 * 
 * FOR FRESH DATABASE INSTALLATIONS:
 * - Do NOT run this migration
 * - The lifecycle migration (20250127) now includes the CHECK constraint fix
 * - Running this migration on fresh databases is redundant but harmless
 * 
 * FOR EXISTING DATABASES BEING UPGRADED:
 * - Run this migration AFTER running the lifecycle migration
 * - This fixes databases that already have the ENUM updated but not the constraint
 * - Order: gender → branch-manager → pass-lifecycle → pass-status-constraint
 * 
 * Purpose: Update the wallet_passes table CHECK constraint to include 'completed' state
 * 
 * Issue: The initial lifecycle migration added 'completed' to the ENUM type but didn't
 * update the table CHECK constraint, causing prize confirmation to fail with:
 * "new row for relation "wallet_passes" violates check constraint"
 * 
 * Solution: Drop old constraint and recreate with all enum values dynamically fetched
 * from pg_enum to future-proof against future state additions.
 */

// Database configuration - mirrors config/database.js for production compatibility
const env = process.env.NODE_ENV || 'development'
let sequelize

if (env === 'production' && process.env.DATABASE_URL) {
  // Production: Use DATABASE_URL with SSL (Render.com, Heroku, etc.)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  })
} else {
  // Development/staging: Use discrete environment variables
  sequelize = new Sequelize(
    process.env.DB_NAME || 'loyalty_platform_dev',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      dialectOptions: {
        ssl: env === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    }
  )
}

/**
 * Up Migration: Add 'completed' state to CHECK constraint
 */
export async function up() {
  let transaction
  
  try {
    transaction = await sequelize.transaction()
    
    logger.info('🚀 Starting migration: Fix pass_status CHECK constraint')

    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    // Check if pass_status column is an enum type
    const [columnInfo] = await sequelize.query(`
      SELECT udt_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'wallet_passes' AND column_name = 'pass_status'
    `, { transaction })

    if (!columnInfo || columnInfo.length === 0) {
      throw new Error('pass_status column not found in wallet_passes table')
    }

    const dataType = columnInfo[0].data_type
    const enumTypeName = columnInfo[0].udt_name

    if (dataType !== 'USER-DEFINED') {
      logger.warn(`⚠️  pass_status is not an ENUM type (current type: ${dataType})`)
      logger.warn('⚠️  Skipping constraint fix - run lifecycle migration first')
      logger.info('ℹ️  To fix: Run npm run migrate:pass-lifecycle first')
      if (transaction) await transaction.rollback()
      return // Exit function, not process
    }

    // Fetch current enum values from the database to future-proof the constraint
    const [enumValues] = await sequelize.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = '${enumTypeName}'
      ORDER BY e.enumsortorder
    `, { transaction })

    if (!enumValues || enumValues.length === 0) {
      throw new Error(`Could not fetch enum values for type: ${enumTypeName}`)
    }

    // Escape single quotes in enum labels to prevent SQL injection
    const allowedStates = enumValues.map(row => `'${row.enumlabel.replace(/'/g, "''")}'`).join(', ')
    logger.info(`📋 Fetched enum values from database: ${allowedStates}`)

    // Drop and recreate constraint in a single transaction
    await sequelize.query(
      'ALTER TABLE wallet_passes DROP CONSTRAINT IF EXISTS wallet_passes_pass_status_check',
      { transaction }
    )
    logger.info('✅ Dropped old pass_status CHECK constraint')

    await sequelize.query(`
      ALTER TABLE wallet_passes 
      ADD CONSTRAINT wallet_passes_pass_status_check 
      CHECK (pass_status IN (${allowedStates}))
    `, { transaction })
    logger.info('✅ Created new pass_status CHECK constraint with all enum values')

    // Commit transaction
    await transaction.commit()
    logger.info('✅ Transaction committed')

    // Verify constraint (outside transaction)
    const [results] = await sequelize.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'wallet_passes'::regclass 
        AND conname = 'wallet_passes_pass_status_check'
    `)

    if (results && results.length > 0) {
      logger.info('✅ Constraint verification:', results[0])
    } else {
      logger.warn('⚠️ Could not verify constraint (it may still be correct)')
    }

    logger.info('✅ Migration completed successfully')
  } catch (error) {
    if (transaction) await transaction.rollback()
    logger.error('❌ Migration failed, transaction rolled back:', error)
    logger.error('Stack trace:', error.stack)
    throw error
  } finally {
    await sequelize.close()
    logger.info('✅ Database connection closed')
  }
}

/**
 * Down Migration: Remove 'completed' state from CHECK constraint
 */
export async function down() {
  let transaction
  
  try {
    transaction = await sequelize.transaction()
    
    logger.info('🔄 Starting rollback: Restore original pass_status CHECK constraint')

    await sequelize.authenticate()
    logger.info('✅ Database connection established')

    // Drop and recreate constraint in a single transaction
    await sequelize.query(
      'ALTER TABLE wallet_passes DROP CONSTRAINT IF EXISTS wallet_passes_pass_status_check',
      { transaction }
    )
    logger.info('✅ Dropped pass_status CHECK constraint')

    await sequelize.query(`
      ALTER TABLE wallet_passes 
      ADD CONSTRAINT wallet_passes_pass_status_check 
      CHECK (pass_status IN ('active', 'expired', 'revoked', 'deleted'))
    `, { transaction })
    logger.info('✅ Restored original pass_status CHECK constraint')
    logger.warn('⚠️ Prize confirmation will fail again (completed state not allowed)')

    await transaction.commit()
    logger.info('✅ Transaction committed')
    logger.info('✅ Rollback completed successfully')
  } catch (error) {
    if (transaction) await transaction.rollback()
    logger.error('❌ Rollback failed, transaction rolled back:', error)
    logger.error('Stack trace:', error.stack)
    throw error
  } finally {
    await sequelize.close()
    logger.info('✅ Database connection closed')
  }
}

// Run migration if called directly
if (process.argv[2] === 'down') {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')
      await down()
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration script failed:', error)
      process.exit(1)
    }
  })()
} else {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')
      await up()
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration script failed:', error)
      process.exit(1)
    }
  })()
}
