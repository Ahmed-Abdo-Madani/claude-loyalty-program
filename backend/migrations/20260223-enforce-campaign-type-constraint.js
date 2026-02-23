import { Sequelize } from 'sequelize';

export default {
    up: async (queryInterface, Sequelize) => {
        console.log('🔄 Enforcing check_campaign_type constraint on notification_campaigns...');

        // 1. Drop existing constraint if it exists (using CASCADE to handle any dependencies)
        try {
            await queryInterface.sequelize.query(`
                ALTER TABLE notification_campaigns 
                DROP CONSTRAINT IF EXISTS check_campaign_type CASCADE;
            `);
            console.log('✅ Dropped existing check_campaign_type constraint (if any)');
        } catch (error) {
            console.warn('⚠️ Could not drop existing constraint:', error.message);
        }

        // 2. Add the proper constraint using IN syntax
        try {
            await queryInterface.sequelize.query(`
                ALTER TABLE notification_campaigns 
                ADD CONSTRAINT check_campaign_type 
                CHECK (campaign_type IN ('lifecycle', 'promotional', 'transactional', 'new_offer_announcement', 'custom_promotion', 'seasonal_campaign'));
            `);
            console.log('✅ Added check_campaign_type constraint with perfect IN syntax mapping to column');
        } catch (error) {
            console.error('❌ Failed to add constraint:', error.message);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Drop the constraint
        await queryInterface.sequelize.query(`
            ALTER TABLE notification_campaigns 
            DROP CONSTRAINT IF EXISTS check_campaign_type CASCADE;
        `);
    }
};
