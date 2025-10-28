/**
 * Migration: Add Branch Manager Authentication Fields
 * 
 * Adds fields to branches table to support PIN-based authentication for branch managers
 * 
 * Fields added:
 * - manager_pin: Bcrypt-hashed PIN (4-6 digits)
 * - manager_pin_enabled: Feature flag to enable/disable manager access per branch
 * - manager_last_login: Timestamp tracking last successful login
 * 
 * Usage:
 * - Run: node backend/migrations/20250127-add-branch-manager-auth.js
 * - Or via pgAdmin: Copy SQL from this file
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Starting migration: Add branch manager authentication fields...')
  
  try {
    // Add manager_pin column
    await queryInterface.addColumn('branches', 'manager_pin', {
      type: sequelize.Sequelize.STRING(255),
      allowNull: true,
      comment: 'Bcrypt-hashed PIN for branch manager authentication (4-6 digits)'
    })
    logger.info('✅ Added manager_pin column')
    
    // Add manager_pin_enabled column
    await queryInterface.addColumn('branches', 'manager_pin_enabled', {
      type: sequelize.Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether manager PIN authentication is enabled for this branch'
    })
    logger.info('✅ Added manager_pin_enabled column')
    
    // Add manager_last_login column
    await queryInterface.addColumn('branches', 'manager_last_login', {
      type: sequelize.Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last successful manager login'
    })
    logger.info('✅ Added manager_last_login column')
    
    logger.info('✅ Migration completed successfully!')
    
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Rolling back migration: Remove branch manager authentication fields...')
  
  try {
    await queryInterface.removeColumn('branches', 'manager_last_login')
    logger.info('✅ Removed manager_last_login column')
    
    await queryInterface.removeColumn('branches', 'manager_pin_enabled')
    logger.info('✅ Removed manager_pin_enabled column')
    
    await queryInterface.removeColumn('branches', 'manager_pin')
    logger.info('✅ Removed manager_pin column')
    
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
