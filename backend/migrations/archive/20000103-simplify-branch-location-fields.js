/**
 * Migration: Simplify Branch Location Fields
 *
 * Purpose: Mark deprecated fields (state, zip_code) and set defaults for district field
 *
 * Changes:
 * 1. Add comments to deprecated columns (state, zip_code) in branches and businesses tables
 * 2. Set default values for district field (use city name if district is NULL)
 * 3. No destructive changes - keeps old columns for backward compatibility
 *
 * Rollback: This migration is non-destructive. Old columns remain intact.
 * Future: Can drop state/zip_code columns in a later migration after data verification
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up() {
  const queryInterface = sequelize.getQueryInterface()

  try {
    logger.info('🔄 Running migration: 005-simplify-branch-location-fields')

    // Step 1: Add comments to deprecated columns in branches table
    logger.info('📝 Adding deprecation comments to branches table...')
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN branches.state IS 'DEPRECATED: No longer used. Replaced by region/city/district fields from Saudi location service.';
    `)
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN branches.zip_code IS 'DEPRECATED: No longer used in Saudi Arabia location system.';
    `)
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN branches.address IS 'UPDATED: Now stores street name only (not full address). Use region/city/district for location hierarchy.';
    `)
    logger.info('✅ Branches table comments updated')

    // Step 2: Add comments to deprecated columns in businesses table
    logger.info('📝 Adding deprecation comments to businesses table...')
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN businesses.address IS 'UPDATED: Now stores street name only (not full address). Use region/city/district for location hierarchy.';
    `)
    logger.info('✅ Businesses table comments updated')

    // Step 3: Set default values for district field if NULL
    logger.info('📝 Setting default district values where NULL...')

    // For branches: Set district = city where district is NULL and city is not NULL
    const [branchesUpdated] = await queryInterface.sequelize.query(`
      UPDATE branches
      SET district = city
      WHERE district IS NULL AND city IS NOT NULL;
    `)
    logger.info(`✅ Updated ${branchesUpdated.rowCount || 0} branch records with default district values`)

    // For businesses: Set district = city where district is NULL and city is not NULL
    const [businessesUpdated] = await queryInterface.sequelize.query(`
      UPDATE businesses
      SET district = city
      WHERE district IS NULL AND city IS NOT NULL;
    `)
    logger.info(`✅ Updated ${businessesUpdated.rowCount || 0} business records with default district values`)

    // Step 4: Log summary
    logger.info('🎉 Migration 005 completed successfully!')
    logger.info('📊 Summary:')
    logger.info('  - Deprecated fields marked: state, zip_code')
    logger.info('  - Address field usage updated: now stores street name only')
    logger.info(`  - Branches updated: ${branchesUpdated.rowCount || 0}`)
    logger.info(`  - Businesses updated: ${businessesUpdated.rowCount || 0}`)

  } catch (error) {
    logger.error('❌ Migration 005 failed:', error)
    throw error
  }
}

export async function down() {
  const queryInterface = sequelize.getQueryInterface()

  try {
    logger.info('⏪ Rolling back migration: 005-simplify-branch-location-fields')

    // Remove comments (set to NULL)
    logger.info('📝 Removing deprecation comments from branches table...')
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN branches.state IS NULL;
    `)
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN branches.zip_code IS NULL;
    `)
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN branches.address IS NULL;
    `)

    logger.info('📝 Removing deprecation comments from businesses table...')
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN businesses.address IS NULL;
    `)

    // Note: We do NOT revert the district values because we don't know what they were before
    logger.warn('⚠️ District values are NOT reverted to NULL (data preserved)')

    logger.info('✅ Migration 005 rolled back successfully')

  } catch (error) {
    logger.error('❌ Migration 005 rollback failed:', error)
    throw error
  }
}

export default { up, down }
