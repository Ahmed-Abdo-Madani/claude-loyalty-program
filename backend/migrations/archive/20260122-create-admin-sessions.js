
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_sessions', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'platform_admins',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        session_token: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip_address: {
            type: DataTypes.INET,
            allowNull: true
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    })

    // Indexes
    await queryInterface.addIndex('admin_sessions', ['admin_id'], { name: 'idx_admin_sessions_admin_id' })
    await queryInterface.addIndex('admin_sessions', ['session_token'], { name: 'idx_admin_sessions_token' })
    await queryInterface.addIndex('admin_sessions', ['expires_at'], { name: 'idx_admin_sessions_expires_at' })
    await queryInterface.addIndex('admin_sessions', ['is_active'], { name: 'idx_admin_sessions_is_active' })
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_sessions')
}
