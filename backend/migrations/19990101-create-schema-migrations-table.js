/**
 * Migration: Create schema_migrations tracking table
 * 
 * Purpose: Track which migrations have been applied to prevent duplicate execution
 * and provide migration history for the automatic migration system.
 * 
 * This is the foundation migration for the auto-migration system.
 * Must be run first before enabling automatic migrations.
 * 
 * Date: 2025-02-03
 */

import { Sequelize } from 'sequelize'

export async function up(queryInterface) {
  console.log('🔧 Creating schema_migrations tracking table...')
  
  const transaction = await queryInterface.sequelize.transaction()
  
  try {
    // Check if table already exists (idempotent)
    const [tables] = await queryInterface.sequelize.query(
      `SELECT tablename 
       FROM pg_tables 
       WHERE schemaname = 'public' 
       AND tablename = 'schema_migrations'`,
      { transaction }
    )
    
    if (tables.length > 0) {
      console.log('⚠️  Table schema_migrations already exists, skipping creation')
      await transaction.commit()
      return
    }
    
    // Create the tracking table
    await queryInterface.createTable('schema_migrations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      migration_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Filename without .js extension'
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
        comment: 'When migration was applied'
      },
      execution_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'How long the migration took to execute'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'success',
        validate: {
          isIn: [['success', 'failed', 'running']]
        },
        comment: 'Migration execution status'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if migration failed'
      },
      checksum: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'SHA-256 hash of migration file content for integrity validation'
      }
    }, { transaction })
    
    console.log('   ✅ Table created successfully')
    
    // Create indexes
    await queryInterface.addIndex('schema_migrations', ['migration_name'], {
      name: 'idx_schema_migrations_name',
      unique: true,
      transaction
    })
    console.log('   ✅ Added unique index: idx_schema_migrations_name')
    
    await queryInterface.addIndex('schema_migrations', ['applied_at'], {
      name: 'idx_schema_migrations_applied_at',
      transaction
    })
    console.log('   ✅ Added index: idx_schema_migrations_applied_at')
    
    await queryInterface.addIndex('schema_migrations', ['status'], {
      name: 'idx_schema_migrations_status',
      transaction
    })
    console.log('   ✅ Added index: idx_schema_migrations_status')
    
    // Add CHECK constraint for status values
    await queryInterface.sequelize.query(
      `ALTER TABLE schema_migrations 
       ADD CONSTRAINT check_schema_migrations_status 
       CHECK (status IN ('success','failed','running'))`,
      { transaction }
    )
    console.log('   ✅ Added CHECK constraint: check_schema_migrations_status')
    
    // Add table comment
    await queryInterface.sequelize.query(
      `COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations for automatic migration system'`,
      { transaction }
    )
    
    await transaction.commit()
    console.log('✅ Schema migrations tracking table created successfully!')
    console.log('   📊 Columns: 7 (id, migration_name, applied_at, execution_time_ms, status, error_message, checksum)')
    console.log('   📇 Indexes: 3 (name, applied_at, status)')
    console.log('   🔒 Constraints: 1 (check_schema_migrations_status)')
    
  } catch (error) {
    await transaction.rollback()
    console.error('❌ Failed to create schema_migrations table:', error.message)
    console.error('   Stack:', error.stack)
    throw error
  }
}

export async function down(queryInterface) {
  console.log('⚠️  Rolling back schema_migrations table...')
  console.log('⚠️  WARNING: This will lose all migration history!')
  
  const transaction = await queryInterface.sequelize.transaction()
  
  try {
    // Drop indexes first
    await queryInterface.removeIndex('schema_migrations', 'idx_schema_migrations_status', { transaction })
    console.log('   ✅ Dropped index: idx_schema_migrations_status')
    
    await queryInterface.removeIndex('schema_migrations', 'idx_schema_migrations_applied_at', { transaction })
    console.log('   ✅ Dropped index: idx_schema_migrations_applied_at')
    
    await queryInterface.removeIndex('schema_migrations', 'idx_schema_migrations_name', { transaction })
    console.log('   ✅ Dropped index: idx_schema_migrations_name')
    
    // Drop table
    await queryInterface.dropTable('schema_migrations', { cascade: true, transaction })
    console.log('   ✅ Table dropped')
    
    await transaction.commit()
    console.log('✅ Rollback complete - schema_migrations table removed')
    
  } catch (error) {
    await transaction.rollback()
    console.error('❌ Rollback failed:', error.message)
    throw error
  }
}
