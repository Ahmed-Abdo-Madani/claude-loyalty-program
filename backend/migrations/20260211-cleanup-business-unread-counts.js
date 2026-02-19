import { DataTypes } from 'sequelize'

export default {
    up: async (queryInterface, Sequelize) => {
        // Safe Update: Only initialize to 0 if NULL. Do NOT overwrite existing data.
        await queryInterface.sequelize.query(`
            UPDATE conversations 
            SET unread_count_business = 0
            WHERE unread_count_business IS NULL
        `);

        // Add column comment if supported by dialect (Postgres supports it)
        try {
            await queryInterface.sequelize.query(`
                COMMENT ON COLUMN conversations.unread_count_business IS 'DEPRECATED: Businesses receive emails, not inbox notifications'
            `);
        } catch (error) {
            // Log but don't fail if DB doesn't support comments or specific syntax
            console.warn('Could not add column comment:', error.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // We don't restore the unread counts as that historic data is lost/irrelevant
        // We can remove the comment though
        try {
            await queryInterface.sequelize.query(`
                COMMENT ON COLUMN conversations.unread_count_business IS NULL
            `);
        } catch (error) {
            console.warn('Could not remove column comment:', error.message);
        }
    }
}
