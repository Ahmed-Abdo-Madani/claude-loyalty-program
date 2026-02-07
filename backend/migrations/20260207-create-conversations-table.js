
export async function up(queryInterface, Sequelize) {
    // Check if table exists first to support idempotency
    const tableExists = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.conversations');"
    );

    // If to_regclass returns a value, the table exists
    if (tableExists[0][0].to_regclass) {
        console.log('Conversations table already exists, skipping creation.');
        return;
    }

    await queryInterface.createTable('conversations', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        conversation_id: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true
        },
        business_id: {
            type: Sequelize.STRING(50),
            allowNull: false,
            references: {
                model: 'businesses',
                key: 'public_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        admin_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'platform_admins',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        },
        subject: {
            type: Sequelize.STRING(500),
            allowNull: false
        },
        status: {
            type: Sequelize.ENUM('open', 'closed', 'archived'),
            defaultValue: 'open'
        },
        last_message_at: {
            type: Sequelize.DATE,
            allowNull: true
        },
        unread_count_admin: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        },
        unread_count_business: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        },
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    });

    // Add indexes
    await queryInterface.addIndex('conversations', ['business_id']);
    await queryInterface.addIndex('conversations', ['admin_id']);
    await queryInterface.addIndex('conversations', ['status']);
    await queryInterface.addIndex('conversations', ['last_message_at']);
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('conversations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_conversations_status";');
}

export default { up, down }
