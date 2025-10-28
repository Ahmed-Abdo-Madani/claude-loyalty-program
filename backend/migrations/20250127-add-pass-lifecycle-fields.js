/**
 * Migration: Add Pass Lifecycle Fields
 * 
 * ⚠️ USAGE INSTRUCTIONS:
 * 
 * This migration is for ALL database installations (fresh and existing).
 * 
 * FOR FRESH DATABASE INSTALLATIONS:
 * - This migration now includes the CHECK constraint fix
 * - Do NOT run the separate 20250128-fix-pass-status-constraint.js migration
 * - The constraint will be created correctly with all enum values
 * 
 * FOR EXISTING DATABASES BEING UPGRADED:
 * - If you already ran this migration BEFORE the CHECK constraint fix was added:
 *   * You MUST also run 20250128-fix-pass-status-constraint.js
 *   * That fixes databases where the enum was updated but constraint wasn't
 * - If running this migration for the first time (after fix was added):
 *   * The constraint will be created correctly
 *   * No need to run the separate constraint fix migration
 * 
 * Adds fields to support automated pass expiration and soft deletion
 * 
 * Changes:
 * 1. wallet_passes table:
 *    - scheduled_expiration_at: When pass should expire (30 days after completion)
 *    - expiration_notified: Whether customer has been notified
 *    - deleted_at: Soft delete timestamp (90 days after expiration)
 *    - pass_status: Add 'completed' state to enum AND update CHECK constraint
 * 
 * 2. customer_progress table:
 *    - reward_fulfilled_at: When prize was physically given to customer
 *    - fulfilled_by_branch: Which branch fulfilled the reward
 *    - fulfillment_notes: Optional notes from branch manager
 * 
 * Usage:
 * - Run: node backend/migrations/20250127-add-pass-lifecycle-fields.js
 * - Or via pgAdmin: Copy SQL from this file
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Starting migration: Add pass lifecycle fields...')
  
  try {
    // === WALLET_PASSES TABLE ===
    
    // Add scheduled_expiration_at column
    await queryInterface.addColumn('wallet_passes', 'scheduled_expiration_at', {
      type: sequelize.Sequelize.DATE,
      allowNull: true,
      comment: 'When this pass should expire (typically 30 days after completion)'
    })
    logger.info('✅ Added scheduled_expiration_at column to wallet_passes')
    
    // Add expiration_notified column
    await queryInterface.addColumn('wallet_passes', 'expiration_notified', {
      type: sequelize.Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether customer has been notified about impending expiration'
    })
    logger.info('✅ Added expiration_notified column to wallet_passes')
    
    // Add deleted_at column
    await queryInterface.addColumn('wallet_passes', 'deleted_at', {
      type: sequelize.Sequelize.DATE,
      allowNull: true,
      comment: 'Soft delete timestamp (for expired passes after 90 days)'
    })
    logger.info('✅ Added deleted_at column to wallet_passes')
    
    // Update pass_status enum to include 'completed'
    // Use dynamic query to find actual enum type name
    try {
      const [enumType] = await sequelize.query(`
        SELECT t.typname
        FROM pg_type t
        JOIN pg_attribute a ON a.atttypid = t.oid
        JOIN pg_class c ON c.oid = a.attrelid
        WHERE c.relname = 'wallet_passes' 
          AND a.attname = 'pass_status'
          AND t.typtype = 'e'
        LIMIT 1;
      `)
      
      if (enumType && enumType.length > 0 && enumType[0].typname) {
        const enumTypeName = enumType[0].typname
        
        // Check if 'completed' value already exists
        const [hasCompleted] = await sequelize.query(`
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'completed' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumTypeName}')
        `)
        
        if (!hasCompleted || hasCompleted.length === 0) {
          await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE 'completed'`)
          logger.info(`✅ Added "completed" value to ${enumTypeName} enum`)
        } else {
          logger.info(`⏭️  "completed" enum value already exists in ${enumTypeName}`)
        }
      } else {
        logger.warn('⏭️  pass_status column is not an enum type, skipping enum modification')
      }
    } catch (enumError) {
      logger.warn(`⚠️  Could not modify pass_status enum: ${enumError.message}`)
      // Non-critical error, continue with migration
    }
    
    // Update CHECK constraint to include 'completed' state
    // Note: This is for FRESH database installations. For upgrading existing databases
    // that already ran this migration, use the dedicated 20250128-fix-pass-status-constraint.js
    const constraintTransaction = await sequelize.transaction()
    try {
      // Fetch current enum values to future-proof the constraint
      const [enumValues] = await sequelize.query(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = (
          SELECT udt_name::text
          FROM information_schema.columns
          WHERE table_name = 'wallet_passes' AND column_name = 'pass_status'
        )
        ORDER BY e.enumsortorder
      `, { transaction: constraintTransaction })

      if (enumValues && enumValues.length > 0) {
        const allowedStates = enumValues.map(row => `'${row.enumlabel}'`).join(', ')
        logger.info(`📋 Fetched enum values: ${allowedStates}`)

        await sequelize.query(
          'ALTER TABLE wallet_passes DROP CONSTRAINT IF EXISTS wallet_passes_pass_status_check',
          { transaction: constraintTransaction }
        )
        logger.info('✅ Dropped old pass_status CHECK constraint')
        
        await sequelize.query(`
          ALTER TABLE wallet_passes 
          ADD CONSTRAINT wallet_passes_pass_status_check 
          CHECK (pass_status IN (${allowedStates}))
        `, { transaction: constraintTransaction })
        logger.info('✅ Created new pass_status CHECK constraint with all enum values')

        await constraintTransaction.commit()
      } else {
        await constraintTransaction.rollback()
        logger.warn('⚠️ Could not fetch enum values, skipping constraint update')
      }
    } catch (constraintError) {
      await constraintTransaction.rollback()
      logger.warn(`⚠️ Could not update CHECK constraint: ${constraintError.message}`)
      logger.warn('This is non-critical if your database does not use CHECK constraints')
    }
    
    // === CUSTOMER_PROGRESS TABLE ===
    
    // Add reward_fulfilled_at column
    await queryInterface.addColumn('customer_progress', 'reward_fulfilled_at', {
      type: sequelize.Sequelize.DATE,
      allowNull: true,
      comment: 'When prize was physically given to customer'
    })
    logger.info('✅ Added reward_fulfilled_at column to customer_progress')
    
    // Add fulfilled_by_branch column
    // Only add foreign key if branches table exists
    try {
      const [branchesExists] = await sequelize.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'branches'
        LIMIT 1;
      `)
      
      if (branchesExists && branchesExists.length > 0) {
        await queryInterface.addColumn('customer_progress', 'fulfilled_by_branch', {
          type: sequelize.Sequelize.STRING(50),
          allowNull: true,
          references: {
            model: 'branches',
            key: 'public_id'
          },
          comment: 'Which branch fulfilled the reward (branch_*)'
        })
        logger.info('✅ Added fulfilled_by_branch column with foreign key to customer_progress')
      } else {
        await queryInterface.addColumn('customer_progress', 'fulfilled_by_branch', {
          type: sequelize.Sequelize.STRING(50),
          allowNull: true,
          comment: 'Which branch fulfilled the reward (branch_*)'
        })
        logger.info('✅ Added fulfilled_by_branch column to customer_progress (no FK - branches table not found)')
      }
    } catch (branchError) {
      logger.warn(`⚠️  Error checking branches table: ${branchError.message}`)
      // Add column without foreign key as fallback
      await queryInterface.addColumn('customer_progress', 'fulfilled_by_branch', {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        comment: 'Which branch fulfilled the reward (branch_*)'
      })
      logger.info('✅ Added fulfilled_by_branch column to customer_progress (no FK)')
    }
    
    // Add fulfillment_notes column
    await queryInterface.addColumn('customer_progress', 'fulfillment_notes', {
      type: sequelize.Sequelize.TEXT,
      allowNull: true,
      comment: 'Optional notes from branch manager about prize fulfillment'
    })
    logger.info('✅ Added fulfillment_notes column to customer_progress')
    
    logger.info('✅ Migration completed successfully!')
    
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Rolling back migration: Remove pass lifecycle fields...')
  
  try {
    // Remove customer_progress columns
    await queryInterface.removeColumn('customer_progress', 'fulfillment_notes')
    logger.info('✅ Removed fulfillment_notes column from customer_progress')
    
    await queryInterface.removeColumn('customer_progress', 'fulfilled_by_branch')
    logger.info('✅ Removed fulfilled_by_branch column from customer_progress')
    
    await queryInterface.removeColumn('customer_progress', 'reward_fulfilled_at')
    logger.info('✅ Removed reward_fulfilled_at column from customer_progress')
    
    // Remove wallet_passes columns
    await queryInterface.removeColumn('wallet_passes', 'deleted_at')
    logger.info('✅ Removed deleted_at column from wallet_passes')
    
    await queryInterface.removeColumn('wallet_passes', 'expiration_notified')
    logger.info('✅ Removed expiration_notified column from wallet_passes')
    
    await queryInterface.removeColumn('wallet_passes', 'scheduled_expiration_at')
    logger.info('✅ Removed scheduled_expiration_at column from wallet_passes')
    
    // Note: Cannot remove enum value from PostgreSQL enum type without recreating it
    // Manual intervention required if 'completed' state needs to be removed
    logger.warn('⚠️ Cannot automatically remove "completed" from pass_status enum - manual intervention required')
    
    logger.info('✅ Rollback completed successfully!')
    
  } catch (error) {
    logger.error('❌ Rollback failed:', error)
    throw error
  }
}

// Run migration if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')
      
      const command = process.argv[2]
      
      if (command === 'down') {
        await down()
      } else {
        await up()
      }
      
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(0)
      
    } catch (error) {
      logger.error('❌ Migration script failed:', error)
      process.exit(1)
    }
  })()
}

export { up, down }
