
export async function up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
        const tableInfo = await queryInterface.describeTable('messages');

        if (!tableInfo.email_notification_sent) {
            await queryInterface.addColumn('messages', 'email_notification_sent', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false
            }, { transaction });
        }

        if (!tableInfo.email_notification_sent_at) {
            await queryInterface.addColumn('messages', 'email_notification_sent_at', {
                type: Sequelize.DATE,
                allowNull: true
            }, { transaction });
        }

        if (!tableInfo.email_notification_status) {
            await queryInterface.addColumn('messages', 'email_notification_status', {
                type: Sequelize.ENUM('pending', 'sent', 'failed', 'bounced'),
                allowNull: true
            }, { transaction });
        }

        if (!tableInfo.unsubscribe_token) {
            await queryInterface.addColumn('messages', 'unsubscribe_token', {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true
            }, { transaction });
        }

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

export async function down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
        const tableInfo = await queryInterface.describeTable('messages');

        if (tableInfo.email_notification_sent) {
            await queryInterface.removeColumn('messages', 'email_notification_sent', { transaction });
        }
        if (tableInfo.email_notification_sent_at) {
            await queryInterface.removeColumn('messages', 'email_notification_sent_at', { transaction });
        }
        if (tableInfo.email_notification_status) {
            await queryInterface.removeColumn('messages', 'email_notification_status', { transaction });
        }
        if (tableInfo.unsubscribe_token) {
            await queryInterface.removeColumn('messages', 'unsubscribe_token', { transaction });
        }

        // Clean up ENUM if needed, though often safer to leave it
        // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_email_notification_status";', { transaction });

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}
