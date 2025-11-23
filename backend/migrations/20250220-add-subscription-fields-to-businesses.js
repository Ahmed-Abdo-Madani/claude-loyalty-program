/**
 * Migration: Add subscription fields to businesses table
 * Purpose: Add subscription tracking fields to existing businesses
 * Date: 2025-02-20
 */

import { Sequelize } from 'sequelize'
import sequelize from '../config/database.js'

const TABLE_NAME = 'businesses'

/**
 * Check if column exists
 */
async function columnExists(queryInterface, tableName, columnName) {
  const tableDescription = await queryInterface.describeTable(tableName)
  return tableDescription[columnName] !== undefined
}

/**
 * UP: Add subscription fields to businesses table
 */
export async function up(queryInterface, DataTypes) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log('\n📋 Migration: Add subscription fields to businesses table')
    console.log('='.repeat(60))
    
    // =================================================================
    // 1. Add current_plan column
    // =================================================================
    if (await columnExists(queryInterface, TABLE_NAME, 'current_plan')) {
      console.log('✅ Column current_plan already exists - skipping')
    } else {
      console.log('\n📝 Adding current_plan column...')
      await queryInterface.addColumn(TABLE_NAME, 'current_plan', {
        type: DataTypes.ENUM('free', 'professional', 'enterprise'),
        allowNull: false,
        defaultValue: 'free',
        after: 'logo_file_size'
      }, { transaction })
      console.log('✅ Column current_plan added')
      
      // Set default value for existing businesses
      console.log('📝 Setting current_plan to "free" for existing businesses...')
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE_NAME} SET current_plan = 'free' WHERE current_plan IS NULL`,
        { transaction }
      )
      console.log('✅ Default values set')
    }
    
    // =================================================================
    // 2. Add subscription_status column
    // =================================================================
    if (await columnExists(queryInterface, TABLE_NAME, 'subscription_status')) {
      console.log('✅ Column subscription_status already exists - skipping')
    } else {
      console.log('\n📝 Adding subscription_status column...')
      await queryInterface.addColumn(TABLE_NAME, 'subscription_status', {
        type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'trial',
        after: 'current_plan'
      }, { transaction })
      console.log('✅ Column subscription_status added')
      
      // Set default value for existing businesses
      console.log('📝 Setting subscription_status to "trial" for existing businesses...')
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE_NAME} SET subscription_status = 'trial' WHERE subscription_status IS NULL`,
        { transaction }
      )
      console.log('✅ Default values set')
    }
    
    // =================================================================
    // 3. Add trial_ends_at column
    // =================================================================
    if (await columnExists(queryInterface, TABLE_NAME, 'trial_ends_at')) {
      console.log('✅ Column trial_ends_at already exists - skipping')
    } else {
      console.log('\n📝 Adding trial_ends_at column...')
      await queryInterface.addColumn(TABLE_NAME, 'trial_ends_at', {
        type: DataTypes.DATE,
        allowNull: true,
        after: 'subscription_status'
      }, { transaction })
      console.log('✅ Column trial_ends_at added')
      
      // Set trial_ends_at to 7 days from now for existing businesses
      console.log('📝 Setting trial_ends_at to 7 days from now for existing businesses...')
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE_NAME} SET trial_ends_at = NOW() + INTERVAL '7 days' WHERE trial_ends_at IS NULL`,
        { transaction }
      )
      console.log('✅ Trial end dates set')
    }
    
    // =================================================================
    // 4. Add subscription_started_at column
    // =================================================================
    if (await columnExists(queryInterface, TABLE_NAME, 'subscription_started_at')) {
      console.log('✅ Column subscription_started_at already exists - skipping')
    } else {
      console.log('\n📝 Adding subscription_started_at column...')
      await queryInterface.addColumn(TABLE_NAME, 'subscription_started_at', {
        type: DataTypes.DATE,
        allowNull: true,
        after: 'trial_ends_at'
      }, { transaction })
      console.log('✅ Column subscription_started_at added')
    }
    
    // =================================================================
    // 5. Create indexes
    // =================================================================
    console.log('\n📝 Creating indexes...')
    
    try {
      // Index on subscription_status
      const statusIndexExists = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_subscription_status'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      
      if (statusIndexExists.length === 0) {
        await queryInterface.addIndex(TABLE_NAME, ['subscription_status'], {
          name: 'idx_businesses_subscription_status',
          transaction
        })
        console.log('✅ Index on subscription_status created')
      } else {
        console.log('✅ Index on subscription_status already exists')
      }
    } catch (error) {
      console.log('⚠️  Index on subscription_status may already exist:', error.message)
    }
    
    try {
      // Index on trial_ends_at
      const trialIndexExists = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_trial_ends_at'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      
      if (trialIndexExists.length === 0) {
        await queryInterface.addIndex(TABLE_NAME, ['trial_ends_at'], {
          name: 'idx_businesses_trial_ends_at',
          transaction
        })
        console.log('✅ Index on trial_ends_at created')
      } else {
        console.log('✅ Index on trial_ends_at already exists')
      }
    } catch (error) {
      console.log('⚠️  Index on trial_ends_at may already exist:', error.message)
    }
    
    try {
      // Composite index on current_plan + subscription_status
      const compositeIndexExists = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_plan_status'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      
      if (compositeIndexExists.length === 0) {
        await queryInterface.addIndex(TABLE_NAME, ['current_plan', 'subscription_status'], {
          name: 'idx_businesses_plan_status',
          transaction
        })
        console.log('✅ Composite index on current_plan + subscription_status created')
      } else {
        console.log('✅ Composite index on current_plan + subscription_status already exists')
      }
    } catch (error) {
      console.log('⚠️  Composite index may already exist:', error.message)
    }
    
    await transaction.commit()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Migration completed successfully')
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    await transaction.rollback()
    console.error('\n❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  }
}

/**
 * DOWN: Remove subscription fields from businesses table
 */
export async function down(queryInterface) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log('\n📋 Rollback: Remove subscription fields from businesses table')
    console.log('='.repeat(60))
    
    // Remove indexes first
    const indexes = [
      'idx_businesses_plan_status',
      'idx_businesses_trial_ends_at',
      'idx_businesses_subscription_status'
    ]
    
    for (const indexName of indexes) {
      try {
        console.log(`\n📝 Removing index ${indexName}...`)
        await queryInterface.removeIndex(TABLE_NAME, indexName, { transaction })
        console.log(`✅ Index ${indexName} removed`)
      } catch (error) {
        console.log(`ℹ️  Index ${indexName} does not exist or already removed`)
      }
    }
    
    // Remove columns
    const columns = [
      'subscription_started_at',
      'trial_ends_at',
      'subscription_status',
      'current_plan'
    ]
    
    for (const column of columns) {
      if (await columnExists(queryInterface, TABLE_NAME, column)) {
        console.log(`\n📝 Removing column ${column}...`)
        await queryInterface.removeColumn(TABLE_NAME, column, { transaction })
        console.log(`✅ Column ${column} removed`)
      } else {
        console.log(`ℹ️  Column ${column} does not exist - skipping`)
      }
    }
    
    // Drop ENUM types created by these columns
    console.log('\n📝 Cleaning up ENUM types...')
    const enumTypes = [
      'enum_businesses_current_plan',
      'enum_businesses_subscription_status'
    ]
    
    for (const enumType of enumTypes) {
      try {
        console.log(`📝 Dropping ENUM type ${enumType}...`)
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS ${enumType} CASCADE`,
          { transaction }
        )
        console.log(`✅ ENUM type ${enumType} dropped`)
      } catch (error) {
        console.log(`ℹ️  ENUM type ${enumType} does not exist or already removed: ${error.message}`)
      }
    }
    
    await transaction.commit()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Rollback completed successfully')
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    await transaction.rollback()
    console.error('\n❌ Rollback failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  }
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  try {
    console.log('Starting migration execution...')
    await up(sequelize.getQueryInterface(), Sequelize.DataTypes)
    console.log('Migration completed. Closing database connection...')
    await sequelize.close()
    console.log('Database connection closed.')
    process.exit(0)
  } catch (error) {
    console.error('Migration execution failed:', error)
    await sequelize.close()
    process.exit(1)
  }
}
