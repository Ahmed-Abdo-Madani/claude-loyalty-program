/**
 * Migration: Create webhook_logs table
 * Purpose: Add webhook event tracking and audit logging for Moyasar webhooks
 * Date: 2025-02-21
 */

import { Sequelize } from 'sequelize'
import sequelize from '../config/database.js'

/**
 * Check if table exists
 */
async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables()
  return tables.includes(tableName)
}

/**
 * Check if index exists
 */
async function indexExists(queryInterface, tableName, indexName) {
  try {
    const [results] = await queryInterface.sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = '${tableName}' 
      AND indexname = '${indexName}'
    `)
    return results.length > 0
  } catch (error) {
    return false
  }
}

/**
 * UP: Create webhook_logs table
 */
export async function up(queryInterface, DataTypes) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log('\n📋 Migration: Create webhook_logs table')
    console.log('='.repeat(60))
    
    // =================================================================
    // 1. Create webhook_logs table
    // =================================================================
    if (await tableExists(queryInterface, 'webhook_logs')) {
      console.log('✅ Table webhook_logs already exists - skipping creation')
    } else {
      console.log('\n📝 Creating webhook_logs table...')
      await queryInterface.createTable('webhook_logs', {
        public_id: {
          type: DataTypes.STRING(50),
          primaryKey: true,
          allowNull: false
        },
        webhook_event_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          comment: 'Moyasar event ID for idempotency checks'
        },
        event_type: {
          type: DataTypes.STRING(50),
          allowNull: false,
          comment: 'Type of webhook event received'
        },
        payment_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
          references: {
            model: 'payments',
            key: 'public_id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          comment: 'Associated payment record (if applicable)'
        },
        moyasar_payment_id: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Moyasar payment ID from webhook payload'
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'received',
          comment: 'Processing status of webhook'
        },
        payload: {
          type: DataTypes.JSONB,
          allowNull: false,
          comment: 'Full webhook payload from Moyasar'
        },
        signature: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'HMAC signature from webhook headers'
        },
        signature_verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether signature verification passed'
        },
        processing_error: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Error message if processing failed'
        },
        processed_at: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp when webhook was successfully processed'
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
      console.log('✅ Table webhook_logs created')
      
      // Add CHECK constraint for event_type enum
      console.log('📝 Adding CHECK constraint for event_type...')
      await queryInterface.sequelize.query(`
        ALTER TABLE webhook_logs 
        ADD CONSTRAINT webhook_logs_event_type_check 
        CHECK (event_type IN (
          'payment.paid', 
          'payment.failed', 
          'payment.refunded', 
          'payment.authorized', 
          'payment.captured', 
          'other'
        ))
      `, { transaction })
      console.log('✅ CHECK constraint added for event_type')
      
      // Add CHECK constraint for status enum
      console.log('📝 Adding CHECK constraint for status...')
      await queryInterface.sequelize.query(`
        ALTER TABLE webhook_logs 
        ADD CONSTRAINT webhook_logs_status_check 
        CHECK (status IN ('received', 'processed', 'failed', 'duplicate'))
      `, { transaction })
      console.log('✅ CHECK constraint added for status')
    }
    
    // =================================================================
    // 2. Create indexes
    // =================================================================
    console.log('\n📝 Creating indexes for webhook_logs...')
    
    const indexes = [
      {
        name: 'webhook_logs_event_id_idx',
        fields: ['webhook_event_id'],
        unique: true
      },
      {
        name: 'webhook_logs_moyasar_payment_id_idx',
        fields: ['moyasar_payment_id']
      },
      {
        name: 'webhook_logs_event_type_idx',
        fields: ['event_type']
      },
      {
        name: 'webhook_logs_status_idx',
        fields: ['status']
      },
      {
        name: 'webhook_logs_created_at_idx',
        fields: ['created_at']
      },
      {
        name: 'webhook_logs_payment_id_idx',
        fields: ['payment_id']
      }
    ]
    
    for (const index of indexes) {
      if (await indexExists(queryInterface, 'webhook_logs', index.name)) {
        console.log(`✅ Index ${index.name} already exists - skipping`)
      } else {
        await queryInterface.addIndex('webhook_logs', index.fields, {
          name: index.name,
          unique: index.unique || false,
          transaction
        })
        console.log(`✅ Index ${index.name} created`)
      }
    }
    
    // =================================================================
    // 3. Add foreign key constraint
    // =================================================================
    console.log('\n📝 Adding foreign key constraint...')
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE webhook_logs 
        ADD CONSTRAINT fk_webhook_logs_payment 
        FOREIGN KEY (payment_id) 
        REFERENCES payments(public_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
      `, { transaction })
      console.log('✅ Foreign key constraint added')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Foreign key constraint already exists - skipping')
      } else {
        throw error
      }
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
 * DOWN: Drop webhook_logs table
 */
export async function down(queryInterface) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log('\n📋 Rollback: Drop webhook_logs table')
    console.log('='.repeat(60))
    
    if (await tableExists(queryInterface, 'webhook_logs')) {
      console.log('\n📝 Dropping webhook_logs table...')
      await queryInterface.dropTable('webhook_logs', { 
        cascade: true, 
        transaction 
      })
      console.log('✅ Table webhook_logs dropped')
    } else {
      console.log('ℹ️  Table webhook_logs does not exist - skipping')
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
