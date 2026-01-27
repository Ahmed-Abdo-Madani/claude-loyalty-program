/**
 * Migration: Add POS Access Enabled to Branches
 * 
 * Adds a field to branches table to allow granular control over POS access
 * independent of the branch's overall status.
 * 
 * Fields added:
 * - pos_access_enabled: Boolean flag to enable/disable POS access per branch
 * 
 * Usage:
 * - Run: node backend/migrations/20260126-add-pos-access-enabled-to-branches.js
 * - Rollback: node backend/migrations/20260126-add-pos-access-enabled-to-branches.js down
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
    const queryInterface = sequelize.getQueryInterface()

    logger.info('🔄 Starting migration: Add pos_access_enabled to branches...')

    try {
        // Check if pos_access_enabled column exists
        const [posAccessEnabledColumn] = await sequelize.query(
            `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'branches' AND column_name = 'pos_access_enabled'`
        )

        if (posAccessEnabledColumn.length === 0) {
            await queryInterface.addColumn('branches', 'pos_access_enabled', {
                type: sequelize.Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether POS access is enabled for this branch (independent of branch status)'
            })
            logger.info('✅ Added pos_access_enabled column')
        } else {
            logger.info('⏭️  pos_access_enabled column already exists, skipping')
        }

        logger.info('✅ Migration completed successfully!')

    } catch (error) {
        logger.error('❌ Migration failed:', error)
        throw error
    }
}

async function down() {
    const queryInterface = sequelize.getQueryInterface()

    logger.info('🔄 Rolling back migration: Remove pos_access_enabled from branches...')

    try {
        // Check if pos_access_enabled column exists
        const [posAccessEnabledColumn] = await sequelize.query(
            `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'branches' AND column_name = 'pos_access_enabled'`
        )

        if (posAccessEnabledColumn.length > 0) {
            await queryInterface.removeColumn('branches', 'pos_access_enabled')
            logger.info('✅ Removed pos_access_enabled column')
        } else {
            logger.info('⏭️  pos_access_enabled column does not exist, skipping')
        }

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
