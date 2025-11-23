/**
 * Migration: Add grace_period_end field to subscriptions table
 * 
 * Purpose: Store explicit grace period end date after max payment failures
 * This enables proper grace period tracking independent of retry logic
 * 
 * Run: node backend/migrations/20250121-add-grace-period-end-to-subscriptions.js
 */

import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up(queryInterface, Sequelize) {
  logger.info('🔄 Adding grace_period_end column to subscriptions table')

  await queryInterface.addColumn('subscriptions', 'grace_period_end', {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'End date of grace period after payment failures'
  })

  logger.info('✅ grace_period_end column added successfully')
}

export async function down(queryInterface, Sequelize) {
  logger.info('🔄 Removing grace_period_end column from subscriptions table')

  await queryInterface.removeColumn('subscriptions', 'grace_period_end')

  logger.info('✅ grace_period_end column removed successfully')
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('🚀 Running migration: add-grace-period-end-to-subscriptions')

  try {
    const queryInterface = sequelize.getQueryInterface()
    await up(queryInterface, sequelize.Sequelize)
    
    logger.info('🎉 Migration completed successfully')
    await sequelize.close()
    process.exit(0)
  } catch (error) {
    logger.error('❌ Migration failed', {
      error: error.message,
      stack: error.stack
    })
    await sequelize.close()
    process.exit(1)
  }
}
