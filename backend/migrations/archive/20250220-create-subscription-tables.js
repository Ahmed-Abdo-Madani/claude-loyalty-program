/**
 * Migration: Create subscription, payments, and invoices tables
 * Purpose: Add subscription management and payment tracking infrastructure
 * Date: 2025-02-20
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
 * UP: Create subscription tables
 */
export async function up(queryInterface, DataTypes) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log('\n📋 Migration: Create subscription, payments, and invoices tables')
    console.log('='.repeat(60))
    
    // =================================================================
    // 1. Create subscriptions table
    // =================================================================
    if (await tableExists(queryInterface, 'subscriptions')) {
      console.log('✅ Table subscriptions already exists - skipping creation')
    } else {
      console.log('\n📝 Creating subscriptions table...')
      await queryInterface.createTable('subscriptions', {
        public_id: {
          type: DataTypes.STRING(50),
          primaryKey: true,
          allowNull: false
        },
        business_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'businesses',
            key: 'public_id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        plan_type: {
          type: DataTypes.ENUM('free', 'professional', 'enterprise'),
          allowNull: false,
          defaultValue: 'free'
        },
        status: {
          type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
          allowNull: false,
          defaultValue: 'trial'
        },
        trial_end_date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        billing_cycle_start: {
          type: DataTypes.DATE,
          allowNull: true
        },
        next_billing_date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: 'SAR'
        },
        moyasar_token: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        payment_method_last4: {
          type: DataTypes.STRING(4),
          allowNull: true
        },
        payment_method_brand: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        cancellation_reason: {
          type: DataTypes.TEXT,
          allowNull: true
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
      console.log('✅ Table subscriptions created')
      
      // Create indexes for subscriptions
      console.log('📝 Creating indexes for subscriptions...')
      await queryInterface.addIndex('subscriptions', ['business_id'], {
        name: 'idx_subscriptions_business_id',
        transaction
      })
      await queryInterface.addIndex('subscriptions', ['status'], {
        name: 'idx_subscriptions_status',
        transaction
      })
      await queryInterface.addIndex('subscriptions', ['next_billing_date'], {
        name: 'idx_subscriptions_next_billing_date',
        transaction
      })
      await queryInterface.addIndex('subscriptions', ['trial_end_date'], {
        name: 'idx_subscriptions_trial_end_date',
        transaction
      })
      console.log('✅ Indexes created for subscriptions')
    }
    
    // =================================================================
    // 2. Create payments table
    // =================================================================
    if (await tableExists(queryInterface, 'payments')) {
      console.log('✅ Table payments already exists - skipping creation')
    } else {
      console.log('\n📝 Creating payments table...')
      await queryInterface.createTable('payments', {
        public_id: {
          type: DataTypes.STRING(50),
          primaryKey: true,
          allowNull: false
        },
        business_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'businesses',
            key: 'public_id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        subscription_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
          references: {
            model: 'subscriptions',
            key: 'public_id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        moyasar_payment_id: {
          type: DataTypes.STRING(255),
          allowNull: true,
          unique: true
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: 'SAR'
        },
        status: {
          type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending'
        },
        payment_method: {
          type: DataTypes.ENUM('card', 'apple_pay', 'stc_pay'),
          allowNull: true
        },
        payment_date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        failure_reason: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        refund_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        },
        refunded_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true
        },
        retry_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        last_retry_at: {
          type: DataTypes.DATE,
          allowNull: true
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
      console.log('✅ Table payments created')
      
      // Create indexes for payments
      console.log('📝 Creating indexes for payments...')
      await queryInterface.addIndex('payments', ['business_id'], {
        name: 'idx_payments_business_id',
        transaction
      })
      await queryInterface.addIndex('payments', ['subscription_id'], {
        name: 'idx_payments_subscription_id',
        transaction
      })
      await queryInterface.addIndex('payments', ['moyasar_payment_id'], {
        name: 'idx_payments_moyasar_payment_id',
        transaction
      })
      await queryInterface.addIndex('payments', ['status'], {
        name: 'idx_payments_status',
        transaction
      })
      await queryInterface.addIndex('payments', ['payment_date'], {
        name: 'idx_payments_payment_date',
        transaction
      })
      await queryInterface.addIndex('payments', ['business_id', 'payment_date'], {
        name: 'idx_payments_business_payment_date',
        transaction
      })
      console.log('✅ Indexes created for payments')
    }
    
    // =================================================================
    // 3. Create invoices table
    // =================================================================
    if (await tableExists(queryInterface, 'invoices')) {
      console.log('✅ Table invoices already exists - skipping creation')
    } else {
      console.log('\n📝 Creating invoices table...')
      await queryInterface.createTable('invoices', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        invoice_number: {
          type: DataTypes.STRING(50),
          unique: true,
          allowNull: false
        },
        business_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'businesses',
            key: 'public_id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        payment_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
          references: {
            model: 'payments',
            key: 'public_id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        subscription_id: {
          type: DataTypes.STRING(50),
          allowNull: true,
          references: {
            model: 'subscriptions',
            key: 'public_id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        tax_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        total_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: 'SAR'
        },
        issued_date: {
          type: DataTypes.DATE,
          allowNull: false
        },
        due_date: {
          type: DataTypes.DATE,
          allowNull: false
        },
        paid_date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM('draft', 'issued', 'paid', 'overdue', 'cancelled'),
          allowNull: false,
          defaultValue: 'draft'
        },
        invoice_data: {
          type: DataTypes.JSON,
          allowNull: true
        },
        pdf_url: {
          type: DataTypes.STRING(500),
          allowNull: true
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
      console.log('✅ Table invoices created')
      
      // Create indexes for invoices
      console.log('📝 Creating indexes for invoices...')
      await queryInterface.addIndex('invoices', ['business_id'], {
        name: 'idx_invoices_business_id',
        transaction
      })
      await queryInterface.addIndex('invoices', ['payment_id'], {
        name: 'idx_invoices_payment_id',
        transaction
      })
      await queryInterface.addIndex('invoices', ['subscription_id'], {
        name: 'idx_invoices_subscription_id',
        transaction
      })
      await queryInterface.addIndex('invoices', ['invoice_number'], {
        name: 'idx_invoices_invoice_number',
        transaction
      })
      await queryInterface.addIndex('invoices', ['status'], {
        name: 'idx_invoices_status',
        transaction
      })
      await queryInterface.addIndex('invoices', ['issued_date'], {
        name: 'idx_invoices_issued_date',
        transaction
      })
      await queryInterface.addIndex('invoices', ['due_date'], {
        name: 'idx_invoices_due_date',
        transaction
      })
      console.log('✅ Indexes created for invoices')
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
 * DOWN: Drop subscription tables
 */
export async function down(queryInterface) {
  const transaction = await sequelize.transaction()
  
  try {
    console.log('\n📋 Rollback: Drop subscription, payments, and invoices tables')
    console.log('='.repeat(60))
    
    // Drop in reverse order to respect foreign key constraints
    const tables = ['invoices', 'payments', 'subscriptions']
    
    for (const table of tables) {
      if (await tableExists(queryInterface, table)) {
        console.log(`\n📝 Dropping ${table} table...`)
        await queryInterface.dropTable(table, { transaction })
        console.log(`✅ Table ${table} dropped`)
      } else {
        console.log(`ℹ️  Table ${table} does not exist - skipping`)
      }
    }
    
    // Drop ENUM types created by these tables
    console.log('\n📝 Cleaning up ENUM types...')
    const enumTypes = [
      'enum_subscriptions_plan_type',
      'enum_subscriptions_status',
      'enum_payments_status',
      'enum_payments_payment_method',
      'enum_invoices_status'
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
