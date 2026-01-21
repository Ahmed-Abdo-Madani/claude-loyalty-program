
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('platform_admins', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        full_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('super_admin', 'admin', 'support'),
            defaultValue: 'admin'
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'suspended'),
            defaultValue: 'active'
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'platform_admins',
                key: 'id'
            }
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    })

    // Indexes
    await queryInterface.addIndex('platform_admins', ['email'], {
        name: 'idx_platform_admins_email'
    })

    await queryInterface.addIndex('platform_admins', ['status'], {
        name: 'idx_platform_admins_status'
    })
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('platform_admins')
}
