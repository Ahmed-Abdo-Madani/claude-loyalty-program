
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('customer_progress', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customer_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            references: {
                model: 'customers',
                key: 'customer_id' // Assuming customers table has customer_id unique key
            },
            onDelete: 'CASCADE'
        },
        offer_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            references: {
                model: 'offers',
                key: 'public_id'
            },
            onDelete: 'CASCADE'
        },
        business_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            references: {
                model: 'businesses',
                key: 'public_id'
            },
            onDelete: 'CASCADE'
        },
        current_stamps: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        max_stamps: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        is_completed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        rewards_claimed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        reward_fulfilled_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        fulfilled_by_branch: {
            type: DataTypes.STRING(50),
            allowNull: true,
            references: {
                model: 'branches',
                key: 'public_id'
            }
        },
        fulfillment_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        last_scan_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        wallet_pass_serial: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true
        },
        customer_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        customer_phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        customer_email: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        total_scans: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        first_scan_date: {
            type: DataTypes.DATE,
            allowNull: true
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
        },
        secure_customer_id: {
            type: DataTypes.STRING(50),
            allowNull: true
        }
    })

    // Indexes
    await queryInterface.addIndex('customer_progress', {
        unique: true,
        fields: ['customer_id', 'offer_id'],
        name: 'unique_customer_offer_progress'
    })

    await queryInterface.addIndex('customer_progress', ['business_id'])
    await queryInterface.addIndex('customer_progress', ['offer_id'])
    await queryInterface.addIndex('customer_progress', ['is_completed'])
    await queryInterface.addIndex('customer_progress', ['secure_customer_id'])
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('customer_progress')
}
