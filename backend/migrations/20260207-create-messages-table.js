
export async function up(queryInterface, Sequelize) {
    // Check if table exists first
    const tableExists = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.messages');"
    );

    if (tableExists[0][0].to_regclass) {
        console.log('Messages table already exists, skipping creation.');
        return;
    }

    await queryInterface.createTable('messages', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        message_id: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true
        },
        conversation_id: {
            type: Sequelize.STRING(50),
            allowNull: false,
            references: {
                model: 'conversations',
                key: 'conversation_id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        sender_type: {
            type: Sequelize.ENUM('admin', 'business'),
            allowNull: false
        },
        sender_id: {
            type: Sequelize.STRING(50),
            allowNull: false
        },
        recipient_id: {
            type: Sequelize.STRING(50),
            allowNull: false
        },
        subject: {
            type: Sequelize.STRING(500),
            allowNull: true
        },
        message_body: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        message_type: {
            type: Sequelize.ENUM('inquiry', 'response', 'notification'),
            allowNull: false
        },
        status: {
            type: Sequelize.ENUM('sent', 'read', 'archived'),
            defaultValue: 'sent'
        },
        attachments: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: []
        },
        read_at: {
            type: Sequelize.DATE,
            allowNull: true
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
    await queryInterface.addIndex('messages', ['conversation_id']);
    await queryInterface.addIndex('messages', ['sender_id']);
    await queryInterface.addIndex('messages', ['recipient_id']);
    await queryInterface.addIndex('messages', ['status']);
    await queryInterface.addIndex('messages', ['created_at']);
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('messages');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_sender_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_message_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_status";');
}

export default { up, down }
