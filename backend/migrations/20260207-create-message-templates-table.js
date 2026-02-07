
export async function up(queryInterface, Sequelize) {
    // Check if table exists first
    const tableExists = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.message_templates');"
    );

    if (tableExists[0][0].to_regclass) {
        console.log('Message Templates table already exists, skipping creation.');
        return;
    }

    await queryInterface.createTable('message_templates', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        template_id: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true
        },
        template_name: {
            type: Sequelize.STRING(255),
            allowNull: false
        },
        category: {
            type: Sequelize.ENUM('inquiry', 'response', 'notification', 'announcement', 'support'),
            allowNull: false
        },
        subject_template: {
            type: Sequelize.STRING(500),
            allowNull: false
        },
        body_template: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        variables: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        is_active: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
        },
        created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'platform_admins',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        },
        usage_count: {
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
    await queryInterface.addIndex('message_templates', ['category']);
    await queryInterface.addIndex('message_templates', ['is_active']);
    await queryInterface.addIndex('message_templates', ['created_by']);
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('message_templates');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_message_templates_category";');
}

export default { up, down }
