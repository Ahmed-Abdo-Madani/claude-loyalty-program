/**
 * Migration: Create counters table for atomic sequence generation
 * Purpose: Provide database-backed counter sequences for sale_number and receipt_number
 * Date: 2025-02-13
 */

import { Sequelize } from 'sequelize'
import sequelize from '../config/database.js'

const TABLE_NAME = 'counters'

/**
 * Check if table exists
 */
async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables()
  return tables.includes(tableName)
}

/**
 * UP: Create counters table
 */
export async function up(queryInterface, DataTypes) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log(`\n📋 Migration: Create ${TABLE_NAME} table`)
    console.log('=' .repeat(60))
    
    // Check if table already exists
    if (await tableExists(queryInterface, TABLE_NAME)) {
      console.log(`✅ Table ${TABLE_NAME} already exists - skipping creation`)
      await transaction.commit()
      return
    }
    
    // Create counters table
    console.log(`\n📝 Creating ${TABLE_NAME} table...`)
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      counter_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Type of counter (e.g., sale_number, receipt_number)'
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Year for the counter sequence'
      },
      business_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Optional business ID for business-specific counters'
      },
      branch_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Optional branch ID for branch-specific counters'
      },
      last_value: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Last used counter value'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { transaction })
    console.log(`✅ Table ${TABLE_NAME} created`)
    
    // Create unique index to prevent duplicate counters
    console.log('\n📝 Creating unique index on counter_type + year + business_id + branch_id...')
    await queryInterface.addIndex(TABLE_NAME, 
      ['counter_type', 'year', 'business_id', 'branch_id'],
      {
        name: 'idx_counters_unique',
        unique: true,
        transaction
      }
    )
    console.log('✅ Unique index created')
    
    // Create index on counter_type for faster lookups
    console.log('\n📝 Creating index on counter_type...')
    await queryInterface.addIndex(TABLE_NAME,
      ['counter_type'],
      {
        name: 'idx_counters_type',
        transaction
      }
    )
    console.log('✅ Index created')
    
    await transaction.commit()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Migration completed successfully')
    console.log('=' .repeat(60) + '\n')
    
  } catch (error) {
    await transaction.rollback()
    console.error('\n❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  }
}

/**
 * DOWN: Drop counters table
 */
export async function down(queryInterface) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log(`\n📋 Rollback: Drop ${TABLE_NAME} table`)
    console.log('=' .repeat(60))
    
    if (!(await tableExists(queryInterface, TABLE_NAME))) {
      console.log(`ℹ️  Table ${TABLE_NAME} does not exist - skipping`)
      await transaction.commit()
      return
    }
    
    console.log(`\n📝 Dropping ${TABLE_NAME} table...`)
    await queryInterface.dropTable(TABLE_NAME, { transaction })
    console.log(`✅ Table ${TABLE_NAME} dropped`)
    
    await transaction.commit()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Rollback completed successfully')
    console.log('=' .repeat(60) + '\n')
    
  } catch (error) {
    await transaction.rollback()
    console.error('\n❌ Rollback failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  }
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
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
