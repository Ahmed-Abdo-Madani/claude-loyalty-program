export const up = async (queryInterface, Sequelize) => {
    // Add notification_preferences to platform_admins
    const adminTableInfo = await queryInterface.describeTable('platform_admins');
    if (!adminTableInfo.notification_preferences) {
        await queryInterface.addColumn('platform_admins', 'notification_preferences', {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {
                email_notifications: true,
                new_inquiries: true,
                urgent_messages: true,
                daily_digest: false
            }
        });
    }

    // Add notification_preferences to businesses
    const businessTableInfo = await queryInterface.describeTable('businesses');
    if (!businessTableInfo.notification_preferences) {
        await queryInterface.addColumn('businesses', 'notification_preferences', {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {
                email_notifications: true,
                message_notifications: true,
                inquiry_responses: true,
                admin_announcements: true
            }
        });
    }
};

export const down = async (queryInterface, Sequelize) => {
    // Check if column exists before trying to remove to avoid errors during rollback
    const adminTableInfo = await queryInterface.describeTable('platform_admins');
    if (adminTableInfo.notification_preferences) {
        await queryInterface.removeColumn('platform_admins', 'notification_preferences');
    }

    const businessTableInfo = await queryInterface.describeTable('businesses');
    if (businessTableInfo.notification_preferences) {
        await queryInterface.removeColumn('businesses', 'notification_preferences');
    }
};

export default { up, down };
