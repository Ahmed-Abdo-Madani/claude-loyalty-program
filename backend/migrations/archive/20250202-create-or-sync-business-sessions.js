/**
 * =====================================================
 * Migration: Create or Sync business_sessions table
 * =====================================================
 * Date: 2025-02-02
 * Purpose: Ensure business_sessions table exists with all required columns
 * 
 * This migration handles two scenarios:
 * 1. Table doesn't exist: Creates it with full schema from BusinessSession model
 * 2. Table exists: Adds any missing columns (ip_address, user_agent, etc.)
 * 
 * Related Files:
 * - backend/models/BusinessSession.js
 * - backend/middleware/hybridBusinessAuth.js
 * - backend/routes/business.js
 * 
 * Addresses:
 * - Schema drift from manual table creation
 * - Missing audit columns (ip_address, user_agent)
 * - Ensures indexes and foreign keys are present
 * =====================================================
 */

import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
  console.log('🔧 Starting business_sessions table sync migration...')
  
  const transaction = await queryInterface.sequelize.transaction()
  
  try {
    // ========================================
    // 1. Check if table exists
    // ========================================
    const [tables] = await queryInterface.sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = 'business_sessions'`,
      { transaction }
    )
    
    const tableExists = tables.length > 0
    
    if (!tableExists) {
      // ========================================
      // 2. Create table if it doesn't exist
      // ========================================
      console.log('   📋 Table does not exist, creating business_sessions...')
      
      await queryInterface.createTable('business_sessions', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        business_id: {
          type: DataTypes.STRING(50),
          allowNull: false,
          references: {
            model: 'businesses',
            key: 'public_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to businesses.public_id (secure ID format: biz_*)'
        },
        session_token: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          comment: 'Unique session identifier returned on login'
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: 'Session expiration timestamp (typically 30 days from creation)'
        },
        ip_address: {
          type: DataTypes.INET,
          allowNull: true,
          comment: 'IP address of the client when session was created (audit trail)'
        },
        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'User agent string of the client (audit trail)'
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Flag to revoke sessions without deleting records'
        },
        last_used_at: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.literal('NOW()'),
          comment: 'Updated on each successful authentication to track activity'
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()')
        }
      }, { transaction })
      
      console.log('   ✅ Table created successfully')
      
      // Create indexes
      await queryInterface.addIndex('business_sessions', ['business_id'], {
        name: 'idx_business_sessions_business_id',
        transaction
      })
      
      await queryInterface.addIndex('business_sessions', ['session_token'], {
        name: 'idx_business_sessions_token',
        transaction
      })
      
      await queryInterface.addIndex('business_sessions', ['is_active'], {
        name: 'idx_business_sessions_active',
        transaction
      })
      
      await queryInterface.addIndex('business_sessions', ['expires_at'], {
        name: 'idx_business_sessions_expires_at',
        transaction
      })
      
      // Compound index for validation query
      await queryInterface.addIndex(
        'business_sessions',
        ['session_token', 'business_id', 'is_active'],
        {
          name: 'idx_business_sessions_validation',
          where: { is_active: true },
          transaction
        }
      )
      
      console.log('   ✅ Indexes created: 5 total')
      
    } else {
      // ========================================
      // 3. Table exists - Add missing columns
      // ========================================
      console.log('   📋 Table exists, checking for missing columns...')
      
      // Get existing columns
      const [columns] = await queryInterface.sequelize.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'business_sessions'`,
        { transaction }
      )
      
      const existingColumns = columns.map(col => col.column_name)
      
      // Add ip_address if missing
      if (!existingColumns.includes('ip_address')) {
        console.log('   ➕ Adding column: ip_address')
        await queryInterface.addColumn('business_sessions', 'ip_address', {
          type: DataTypes.INET,
          allowNull: true,
          comment: 'IP address of the client when session was created (audit trail)'
        }, { transaction })
      }
      
      // Add user_agent if missing
      if (!existingColumns.includes('user_agent')) {
        console.log('   ➕ Adding column: user_agent')
        await queryInterface.addColumn('business_sessions', 'user_agent', {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'User agent string of the client (audit trail)'
        }, { transaction })
      }
      
      // Add last_used_at if missing
      if (!existingColumns.includes('last_used_at')) {
        console.log('   ➕ Adding column: last_used_at')
        await queryInterface.addColumn('business_sessions', 'last_used_at', {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.literal('NOW()'),
          comment: 'Updated on each successful authentication to track activity'
        }, { transaction })
      }
      
      // Add is_active if missing
      if (!existingColumns.includes('is_active')) {
        console.log('   ➕ Adding column: is_active')
        await queryInterface.addColumn('business_sessions', 'is_active', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Flag to revoke sessions without deleting records'
        }, { transaction })
      }
      
      // Add expires_at if missing
      if (!existingColumns.includes('expires_at')) {
        console.log('   ➕ Adding column: expires_at')
        await queryInterface.addColumn('business_sessions', 'expires_at', {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW() + INTERVAL '30 days'"),
          comment: 'Session expiration timestamp (typically 30 days from creation)'
        }, { transaction })
      }
      
      // ========================================
      // 4. Ensure indexes exist
      // ========================================
      console.log('   🔍 Checking indexes...')
      
      const [indexes] = await queryInterface.sequelize.query(
        `SELECT indexname 
         FROM pg_indexes 
         WHERE tablename = 'business_sessions'`,
        { transaction }
      )
      
      const existingIndexes = indexes.map(idx => idx.indexname)
      
      // Add missing indexes
      if (!existingIndexes.includes('idx_business_sessions_business_id')) {
        await queryInterface.addIndex('business_sessions', ['business_id'], {
          name: 'idx_business_sessions_business_id',
          transaction
        })
        console.log('   ✅ Added index: idx_business_sessions_business_id')
      }
      
      if (!existingIndexes.includes('idx_business_sessions_token')) {
        await queryInterface.addIndex('business_sessions', ['session_token'], {
          name: 'idx_business_sessions_token',
          transaction
        })
        console.log('   ✅ Added index: idx_business_sessions_token')
      }
      
      if (!existingIndexes.includes('idx_business_sessions_active')) {
        await queryInterface.addIndex('business_sessions', ['is_active'], {
          name: 'idx_business_sessions_active',
          transaction
        })
        console.log('   ✅ Added index: idx_business_sessions_active')
      }
      
      if (!existingIndexes.includes('idx_business_sessions_expires_at')) {
        await queryInterface.addIndex('business_sessions', ['expires_at'], {
          name: 'idx_business_sessions_expires_at',
          transaction
        })
        console.log('   ✅ Added index: idx_business_sessions_expires_at')
      }
      
      if (!existingIndexes.includes('idx_business_sessions_validation')) {
        await queryInterface.addIndex(
          'business_sessions',
          ['session_token', 'business_id', 'is_active'],
          {
            name: 'idx_business_sessions_validation',
            where: { is_active: true },
            transaction
          }
        )
        console.log('   ✅ Added index: idx_business_sessions_validation')
      }
      
      console.log('   ✅ Schema sync complete')
    }
    
    await transaction.commit()
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    await transaction.rollback()
    console.error('❌ Migration failed:', error)
    throw error
  }
}

export async function down(queryInterface) {
  console.log('⚠️  Rolling back business_sessions table...')
  
  const transaction = await queryInterface.sequelize.transaction()
  
  try {
    // Query existing indexes first
    const [indexes] = await queryInterface.sequelize.query(
      `SELECT indexname 
       FROM pg_indexes 
       WHERE tablename = 'business_sessions'`,
      { transaction }
    )
    
    const existingIndexes = indexes.map(idx => idx.indexname)
    
    // Drop indexes only if they exist
    if (existingIndexes.includes('idx_business_sessions_validation')) {
      await queryInterface.removeIndex('business_sessions', 'idx_business_sessions_validation', { transaction })
    }
    
    if (existingIndexes.includes('idx_business_sessions_expires_at')) {
      await queryInterface.removeIndex('business_sessions', 'idx_business_sessions_expires_at', { transaction })
    }
    
    if (existingIndexes.includes('idx_business_sessions_active')) {
      await queryInterface.removeIndex('business_sessions', 'idx_business_sessions_active', { transaction })
    }
    
    if (existingIndexes.includes('idx_business_sessions_token')) {
      await queryInterface.removeIndex('business_sessions', 'idx_business_sessions_token', { transaction })
    }
    
    if (existingIndexes.includes('idx_business_sessions_business_id')) {
      await queryInterface.removeIndex('business_sessions', 'idx_business_sessions_business_id', { transaction })
    }
    
    // Drop table
    await queryInterface.dropTable('business_sessions', { transaction })
    
    await transaction.commit()
    console.log('✅ Rollback complete')
    
  } catch (error) {
    await transaction.rollback()
    console.error('❌ Rollback failed:', error)
    throw error
  }
}
