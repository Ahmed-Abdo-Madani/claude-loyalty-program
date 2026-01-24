/**
 * Migration: Add stamp_display_type to offer_card_designs table
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up() {
    try {
        logger.info('🎨 Adding stamp_display_type to offer_card_designs table...')

        await sequelize.query(`
      ALTER TABLE offer_card_designs 
      ADD COLUMN IF NOT EXISTS stamp_display_type VARCHAR(10) DEFAULT 'icon' 
      CHECK (stamp_display_type IN ('icon', 'logo'));
    `)

        await sequelize.query(`
      COMMENT ON COLUMN offer_card_designs.stamp_display_type IS 'Whether to use emoji icon or business logo for stamps';
    `)

        logger.info('✅ stamp_display_type column added successfully')

    } catch (error) {
        logger.error('❌ Failed to add stamp_display_type column:', error)
        throw error
    }
}

export async function down() {
    try {
        logger.info('🗑️  Dropping stamp_display_type column...')

        await sequelize.query(`
      ALTER TABLE offer_card_designs 
      DROP COLUMN IF EXISTS stamp_display_type;
    `)

        logger.info('✅ stamp_display_type column dropped successfully')

    } catch (error) {
        logger.error('❌ Failed to drop stamp_display_type column:', error)
        throw error
    }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        try {
            await sequelize.authenticate()
            logger.info('✅ Database connection established')
            await up()
            await sequelize.close()
            logger.info('✅ Database connection closed')
            process.exit(0)
        } catch (error) {
            logger.error('❌ Migration failed:', error)
            await sequelize.close()
            process.exit(1)
        }
    })()
}

export default { up, down }
