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
export async function up() {
  try {
    console.log('\n📋 Migration: Add subscription fields to businesses table')
    console.log('='.repeat(60))
    
    // =================================================================
    // 1. Add current_plan column
    // =================================================================
    const [currentPlanExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${TABLE_NAME}' 
      AND column_name = 'current_plan'
    `)
    
    if (currentPlanExists.length > 0) {
      console.log('✅ Column current_plan already exists - skipping')
    } else {
      console.log('\n📝 Creating ENUM type for current_plan...')
      await sequelize.query(`
        CREATE TYPE enum_businesses_current_plan AS ENUM ('free', 'professional', 'enterprise')
      `)
      
      console.log('📝 Adding current_plan column...')
      await sequelize.query(`
        ALTER TABLE ${TABLE_NAME} 
        ADD COLUMN current_plan enum_businesses_current_plan NOT NULL DEFAULT 'free'
      `)
      console.log('✅ Column current_plan added')
    }
    
    // =================================================================
    // 2. Add subscription_status column
    // =================================================================
    const [subscriptionStatusExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${TABLE_NAME}' 
      AND column_name = 'subscription_status'
    `)
    
    if (subscriptionStatusExists.length > 0) {
      console.log('✅ Column subscription_status already exists - skipping')
    } else {
      console.log('\n📝 Creating ENUM type for subscription_status...')
      await sequelize.query(`
        CREATE TYPE enum_businesses_subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired')
      `)
      
      console.log('📝 Adding subscription_status column...')
      await sequelize.query(`
        ALTER TABLE ${TABLE_NAME} 
        ADD COLUMN subscription_status enum_businesses_subscription_status NOT NULL DEFAULT 'trial'
      `)
      console.log('✅ Column subscription_status added')
    }
    
    // =================================================================
    // 3. Add trial_ends_at column
    // =================================================================
    const [trialEndsExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${TABLE_NAME}' 
      AND column_name = 'trial_ends_at'
    `)
    
    if (trialEndsExists.length > 0) {
      console.log('✅ Column trial_ends_at already exists - skipping')
    } else {
      console.log('\n📝 Adding trial_ends_at column...')
      await sequelize.query(`
        ALTER TABLE ${TABLE_NAME} 
        ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE
      `)
      console.log('✅ Column trial_ends_at added')
      
      // Set trial_ends_at to 7 days from now for existing businesses
      console.log('📝 Setting trial_ends_at to 7 days from now for existing businesses...')
      await sequelize.query(`
        UPDATE ${TABLE_NAME} 
        SET trial_ends_at = NOW() + INTERVAL '7 days' 
        WHERE trial_ends_at IS NULL
      `)
      console.log('✅ Trial end dates set')
    }
    
    // =================================================================
    // 4. Add subscription_started_at column
    // =================================================================
    const [subscriptionStartedExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${TABLE_NAME}' 
      AND column_name = 'subscription_started_at'
    `)
    
    if (subscriptionStartedExists.length > 0) {
      console.log('✅ Column subscription_started_at already exists - skipping')
    } else {
      console.log('\n📝 Adding subscription_started_at column...')
      await sequelize.query(`
        ALTER TABLE ${TABLE_NAME} 
        ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE
      `)
      console.log('✅ Column subscription_started_at added')
    }
    
    // =================================================================
    // 5. Create indexes
    // =================================================================
    console.log('\n📝 Creating indexes...')
    
    // Index on subscription_status
    const [statusIndexExists] = await sequelize.query(`
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_subscription_status'
    `)
    
    if (statusIndexExists.length === 0) {
      await sequelize.query(`
        CREATE INDEX idx_businesses_subscription_status ON ${TABLE_NAME} (subscription_status)
      `)
      console.log('✅ Index on subscription_status created')
    } else {
      console.log('✅ Index on subscription_status already exists')
    }
    
    // Index on trial_ends_at
    const [trialIndexExists] = await sequelize.query(`
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_trial_ends_at'
    `)
    
    if (trialIndexExists.length === 0) {
      await sequelize.query(`
        CREATE INDEX idx_businesses_trial_ends_at ON ${TABLE_NAME} (trial_ends_at)
      `)
      console.log('✅ Index on trial_ends_at created')
    } else {
      console.log('✅ Index on trial_ends_at already exists')
    }
    
    // Composite index on current_plan + subscription_status
    const [compositeIndexExists] = await sequelize.query(`
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_businesses_plan_status'
    `)
    
    if (compositeIndexExists.length === 0) {
      await sequelize.query(`
        CREATE INDEX idx_businesses_plan_status ON ${TABLE_NAME} (current_plan, subscription_status)
      `)
      console.log('✅ Composite index on current_plan + subscription_status created')
    } else {
      console.log('✅ Composite index on current_plan + subscription_status already exists')
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Migration completed successfully')
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  }
}

/**
 * DOWN: Remove subscription fields from businesses table
 */
export async function down() {
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
      const [indexExists] = await sequelize.query(`
        SELECT 1 FROM pg_indexes WHERE indexname = '${indexName}'
      `)
      
      if (indexExists.length > 0) {
        console.log(`\n📝 Removing index ${indexName}...`)
        await sequelize.query(`DROP INDEX IF EXISTS ${indexName}`)
        console.log(`✅ Index ${indexName} removed`)
      } else {
        console.log(`ℹ️  Index ${indexName} does not exist - skipping`)
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
      const [columnExists] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${TABLE_NAME}' 
        AND column_name = '${column}'
      `)
      
      if (columnExists.length > 0) {
        console.log(`\n📝 Removing column ${column}...`)
        await sequelize.query(`ALTER TABLE ${TABLE_NAME} DROP COLUMN ${column}`)
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
        await sequelize.query(`DROP TYPE IF EXISTS ${enumType} CASCADE`)
        console.log(`✅ ENUM type ${enumType} dropped`)
      } catch (error) {
        console.log(`ℹ️  ENUM type ${enumType} does not exist or already removed: ${error.message}`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Rollback completed successfully')
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
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
