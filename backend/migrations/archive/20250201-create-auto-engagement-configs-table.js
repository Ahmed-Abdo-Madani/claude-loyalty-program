/**
 * Migration: Create auto_engagement_configs table
 * 
 * Creates the auto_engagement_configs table required by the AutoEngagementConfig model.
 * This table stores business-level configuration for automated re-engagement campaigns
 * that target inactive customers.
 * 
 * Features:
 * - One configuration per business (enforced by UNIQUE constraint on business_id)
 * - Configurable inactivity threshold (1-365 days)
 * - Multi-channel messaging support (wallet, email, sms)
 * - Execution tracking (last_run_at, last_run_status, last_run_error)
 * - Performance metrics (total_customers_notified)
 * 
 * Related:
 * - Model: backend/models/AutoEngagementConfig.js
 * - Service: backend/services/AutoEngagementService.js
 * - Cron: Daily execution scheduled in server.js
 * 
 * @date 2025-02-01
 */

import { DataTypes } from 'sequelize'

/**
 * Apply migration: Create auto_engagement_configs table
 */
export async function up() {
  console.log('🔧 Starting migration: Create auto_engagement_configs table...')
  
  // Dynamic import of sequelize instance
  const { default: sequelize } = await import('../config/database.js')
  const queryInterface = sequelize.getQueryInterface()
  
  const transaction = await sequelize.transaction()
  
  try {
    // ========================================
    // 1. Check if table already exists (defensive programming)
    // ========================================
    console.log('   📋 Checking if auto_engagement_configs table already exists...')
    
    const [existingTables] = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = 'auto_engagement_configs'`,
      { transaction }
    )
    
    if (existingTables.length > 0) {
      console.log('   ⚠️  Table auto_engagement_configs already exists, skipping creation')
      await transaction.commit()
      console.log('🎉 Migration completed successfully (table already existed)!')
      return
    }
    
    // ========================================
    // 2. Create auto_engagement_configs table
    // ========================================
    console.log('   📝 Creating auto_engagement_configs table...')
    
    await queryInterface.createTable('auto_engagement_configs', {
      // Primary key (internal)
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Internal primary key'
      },
      
      // Secure public ID (format: aec_[20 random chars])
      config_id: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        comment: 'Secure public identifier for the config'
      },
      
      // Business association (one config per business)
      business_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Business this config belongs to (secure ID format biz_*)'
      },
      
      // Configuration settings
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether auto-engagement is active for this business'
      },
      
      inactivity_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7,
        comment: 'Days of inactivity before triggering re-engagement (1-365)'
      },
      
      // Message template (JSONB for i18n support)
      message_template: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          header: 'We miss you!',
          body: 'Come back and earn rewards with us!'
        },
        comment: 'Notification message template with header and body fields'
      },
      
      // Communication channels (JSONB array)
      channels: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: ['wallet'],
        comment: 'Notification channels to use (wallet, email, sms)'
      },
      
      // Execution tracking
      last_run_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last auto-engagement execution'
      },
      
      last_run_status: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Status of last run (success, failed, running)'
      },
      
      last_run_error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if last run failed'
      },
      
      // Performance metrics
      total_customers_notified: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Cumulative count of customers notified via auto-engagement'
      },
      
      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Record creation timestamp'
      },
      
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Record last update timestamp'
      }
    }, { transaction })
    
    console.log('   ✅ Table created successfully')
    
    // ========================================
    // 3. Add CHECK constraints
    // ========================================
    console.log('   🔒 Adding CHECK constraints...')
    
    // Validate inactivity_days range
    await sequelize.query(
      `ALTER TABLE auto_engagement_configs 
       ADD CONSTRAINT check_inactivity_days 
       CHECK (inactivity_days >= 1 AND inactivity_days <= 365)`,
      { transaction }
    )
    
    // Validate last_run_status values
    await sequelize.query(
      `ALTER TABLE auto_engagement_configs 
       ADD CONSTRAINT check_last_run_status 
       CHECK (last_run_status IS NULL OR last_run_status IN ('success', 'failed', 'running'))`,
      { transaction }
    )
    
    console.log('   ✅ CHECK constraints added')
    
    // ========================================
    // 4. Add foreign key constraint
    // ========================================
    console.log('   🔗 Adding foreign key constraint to businesses table...')
    
    await sequelize.query(
      `ALTER TABLE auto_engagement_configs 
       ADD CONSTRAINT fk_auto_engagement_business 
       FOREIGN KEY (business_id) 
       REFERENCES businesses(public_id) 
       ON DELETE CASCADE`,
      { transaction }
    )
    
    console.log('   ✅ Foreign key constraint added')
    
    // ========================================
    // 5. Create indexes for query performance
    // ========================================
    console.log('   📊 Creating indexes...')
    
    // Unique index on config_id (for lookups by secure ID)
    await sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_engagement_config_id 
       ON auto_engagement_configs(config_id)`,
      { transaction }
    )
    
    // Unique index on business_id (enforces one config per business)
    await sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_engagement_business_id 
       ON auto_engagement_configs(business_id)`,
      { transaction }
    )
    
    // Index on enabled (for daily cron job query)
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_auto_engagement_enabled 
       ON auto_engagement_configs(enabled) 
       WHERE enabled = true`,
      { transaction }
    )
    
    // Index on last_run_at (for scheduling logic)
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_auto_engagement_last_run 
       ON auto_engagement_configs(last_run_at)`,
      { transaction }
    )
    
    console.log('   ✅ Indexes created')
    
    // ========================================
    // 6. Add column comments for documentation
    // ========================================
    console.log('   📝 Adding column comments...')
    
    const comments = [
      ['id', 'Internal primary key'],
      ['config_id', 'Secure public identifier (format: aec_[20chars])'],
      ['business_id', 'Foreign key to businesses.public_id (one config per business)'],
      ['enabled', 'Whether auto-engagement is active for this business'],
      ['inactivity_days', 'Days of customer inactivity before triggering re-engagement (1-365)'],
      ['message_template', 'JSONB notification template with header and body fields (supports i18n)'],
      ['channels', 'JSONB array of notification channels (wallet, email, sms)'],
      ['last_run_at', 'Timestamp of last auto-engagement execution by cron job'],
      ['last_run_status', 'Status of last execution (success, failed, running)'],
      ['last_run_error', 'Error message if last execution failed (for debugging)'],
      ['total_customers_notified', 'Cumulative count of customers notified via auto-engagement'],
      ['created_at', 'Record creation timestamp'],
      ['updated_at', 'Record last update timestamp']
    ]
    
    for (const [column, comment] of comments) {
      await sequelize.query(
        `COMMENT ON COLUMN auto_engagement_configs.${column} IS '${comment}'`,
        { transaction }
      )
    }
    
    // Table-level comment
    await sequelize.query(
      `COMMENT ON TABLE auto_engagement_configs IS 
       'Auto-engagement configuration for businesses. Used by AutoEngagementService to automatically notify inactive customers. One config per business.'`,
      { transaction }
    )
    
    console.log('   ✅ Comments added')
    
    // ========================================
    // 7. Verify table creation
    // ========================================
    console.log('   ✅ Verifying table structure...')
    
    const [verifyTable] = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_name = 'auto_engagement_configs'`,
      { transaction }
    )
    
    if (verifyTable.length === 0) {
      throw new Error('Table verification failed: auto_engagement_configs not found')
    }
    
    const [columns] = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'auto_engagement_configs' 
       ORDER BY ordinal_position`,
      { transaction }
    )
    
    console.log(`   ✅ Table verified with ${columns.length} columns`)
    
    // ========================================
    // Commit transaction
    // ========================================
    await transaction.commit()
    console.log('🎉 Migration completed successfully!')
    console.log('   Table: auto_engagement_configs')
    console.log(`   Columns: ${columns.length}`)
    console.log('   Indexes: 4 (config_id, business_id, enabled, last_run_at)')
    console.log('   Constraints: 3 (FK to businesses, inactivity_days range, last_run_status values)')
    
  } catch (error) {
    // Rollback on any error
    await transaction.rollback()
    console.error('❌ Migration failed:', error.message)
    console.error('   Stack trace:', error.stack)
    throw error
  }
}

/**
 * Rollback migration: Drop auto_engagement_configs table
 */
export async function down() {
  console.log('🔧 Starting rollback: Drop auto_engagement_configs table...')
  
  const { default: sequelize } = await import('../config/database.js')
  const queryInterface = sequelize.getQueryInterface()
  
  const transaction = await sequelize.transaction()
  
  try {
    // Check if table exists before dropping
    const [existingTables] = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = 'auto_engagement_configs'`,
      { transaction }
    )
    
    if (existingTables.length === 0) {
      console.log('   ⚠️  Table auto_engagement_configs does not exist, nothing to drop')
      await transaction.commit()
      console.log('🎉 Rollback completed successfully (table did not exist)!')
      return
    }
    
    // Drop indexes (must drop before dropping table)
    console.log('   🗑️  Dropping indexes...')
    await sequelize.query(
      `DROP INDEX IF EXISTS idx_auto_engagement_config_id CASCADE`,
      { transaction }
    )
    await sequelize.query(
      `DROP INDEX IF EXISTS idx_auto_engagement_business_id CASCADE`,
      { transaction }
    )
    await sequelize.query(
      `DROP INDEX IF EXISTS idx_auto_engagement_enabled CASCADE`,
      { transaction }
    )
    await sequelize.query(
      `DROP INDEX IF EXISTS idx_auto_engagement_last_run CASCADE`,
      { transaction }
    )
    console.log('   ✅ Indexes dropped')
    
    // Drop foreign key constraint
    console.log('   🗑️  Dropping foreign key constraint...')
    await sequelize.query(
      `ALTER TABLE auto_engagement_configs DROP CONSTRAINT IF EXISTS fk_auto_engagement_business CASCADE`,
      { transaction }
    )
    console.log('   ✅ Foreign key constraint dropped')
    
    // Drop table
    console.log('   🗑️  Dropping table...')
    await queryInterface.dropTable('auto_engagement_configs', { transaction })
    console.log('   ✅ Table dropped')
    
    await transaction.commit()
    console.log('🎉 Rollback completed successfully!')
    
  } catch (error) {
    await transaction.rollback()
    console.error('❌ Rollback failed:', error.message)
    console.error('   Stack trace:', error.stack)
    throw error
  }
}

// Allow running migration directly via node
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const command = process.argv[2] || 'up'
  
  if (command === 'up') {
    await up()
    process.exit(0)
  } else if (command === 'down') {
    await down()
    process.exit(0)
  } else {
    console.error('❌ Invalid command. Use: node migration.js [up|down]')
    process.exit(1)
  }
}
