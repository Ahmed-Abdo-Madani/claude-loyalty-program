'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Add email_notification_sent
            await queryInterface.addColumn('messages', 'email_notification_sent', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false
            }, { transaction });

            // Add email_notification_sent_at
            await queryInterface.addColumn('messages', 'email_notification_sent_at', {
                type: Sequelize.DATE,
                allowNull: true
            }, { transaction });

            // Add email_notification_status
            await queryInterface.addColumn('messages', 'email_notification_status', {
                type: Sequelize.ENUM('pending', 'sent', 'failed', 'bounced'),
                allowNull: true
            }, { transaction });

            // Add unsubscribe_token
            await queryInterface.addColumn('messages', 'unsubscribe_token', {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true
            }, { transaction });

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.removeColumn('messages', 'email_notification_sent', { transaction });
            await queryInterface.removeColumn('messages', 'email_notification_sent_at', { transaction });
            await queryInterface.removeColumn('messages', 'email_notification_status', { transaction });
            await queryInterface.removeColumn('messages', 'unsubscribe_token', { transaction });

            // We might want to drop the ENUM type as well if it was created
            await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_email_notification_status";', { transaction });

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
};
