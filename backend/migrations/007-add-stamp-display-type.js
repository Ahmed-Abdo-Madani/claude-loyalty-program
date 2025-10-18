/**
 * Migration: Add stamp_display_type column to offer_card_designs
 *
 * Adds a field to control whether stamps are displayed as:
 * - 'icon': Using the selected emoji (⭐, ☕, etc.)
 * - 'logo': Using the business logo repeated as stamps
 *
 * This field is already being used in the frontend CardDesignEditor
 * but was missing from the database schema.
 */

import logger from '../config/logger.js'

export const up = async (queryInterface, Sequelize) => {
  try {
    logger.info('🔄 Migration 007: Adding stamp_display_type column...')

    // Add stamp_display_type column
    await queryInterface.addColumn('offer_card_designs', 'stamp_display_type', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'icon',
      comment: 'Whether to use emoji icon or business logo for stamps (icon|logo)'
    })

    // Add check constraint to ensure only valid values
    await queryInterface.sequelize.query(`
      ALTER TABLE offer_card_designs
      ADD CONSTRAINT check_stamp_display_type
      CHECK (stamp_display_type IN ('icon', 'logo'));
    `)

    logger.info('✅ Migration 007: stamp_display_type column added successfully')
    logger.info('   - Default value: icon')
    logger.info('   - Allowed values: icon, logo')
    logger.info('   - Constraint: check_stamp_display_type')

  } catch (error) {
    logger.error('❌ Migration 007 failed:', error)
    throw error
  }
}

export const down = async (queryInterface, Sequelize) => {
  try {
    logger.info('🔄 Rolling back Migration 007...')

    // Remove constraint first
    await queryInterface.sequelize.query(`
      ALTER TABLE offer_card_designs
      DROP CONSTRAINT IF EXISTS check_stamp_display_type;
    `)

    // Remove column
    await queryInterface.removeColumn('offer_card_designs', 'stamp_display_type')

    logger.info('✅ Migration 007 rolled back successfully')

  } catch (error) {
    logger.error('❌ Migration 007 rollback failed:', error)
    throw error
  }
}
