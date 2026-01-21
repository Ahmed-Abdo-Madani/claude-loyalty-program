
import sequelize from '../config/database.js'
import { DataTypes } from 'sequelize'

console.log('--- MIGRATION FILE LOADED ---');

export async function up() {
    console.log('--- STARTING UP MIGRATION ---');
    try {
        const queryInterface = sequelize.getQueryInterface();
        console.log('--- GOT QUERY INTERFACE ---');
        const tableInfo = await queryInterface.describeTable('subscriptions');
        console.log('--- TABLE DESCRIBED ---');

        // Add columns if they don't exist
        if (!tableInfo.lemon_squeezy_subscription_id) {
            console.log('Adding lemon_squeezy_subscription_id...');
            await queryInterface.addColumn('subscriptions', 'lemon_squeezy_subscription_id', {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Subscription ID from Lemon Squeezy'
            });
        }

        if (!tableInfo.lemon_squeezy_customer_id) {
            console.log('Adding lemon_squeezy_customer_id...');
            await queryInterface.addColumn('subscriptions', 'lemon_squeezy_customer_id', {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Customer ID from Lemon Squeezy'
            });
        }

        if (!tableInfo.lemon_squeezy_variant_id) {
            console.log('Adding lemon_squeezy_variant_id...');
            await queryInterface.addColumn('subscriptions', 'lemon_squeezy_variant_id', {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Variant ID representing the plan'
            });
        }

        if (!tableInfo.lemon_squeezy_status) {
            console.log('Adding lemon_squeezy_status...');
            await queryInterface.addColumn('subscriptions', 'lemon_squeezy_status', {
                type: DataTypes.STRING(50),
                allowNull: true,
                comment: 'Raw status from Lemon Squeezy'
            });
        }
        console.log('--- MIGRATION COMPLETE ---');
    } catch (error) {
        console.error('!!! MIGRATION ERROR !!!', error);
        throw error;
    }
}

export async function down() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('subscriptions');

        if (tableInfo.lemon_squeezy_subscription_id) {
            await queryInterface.removeColumn('subscriptions', 'lemon_squeezy_subscription_id');
        }
        if (tableInfo.lemon_squeezy_customer_id) {
            await queryInterface.removeColumn('subscriptions', 'lemon_squeezy_customer_id');
        }
        if (tableInfo.lemon_squeezy_variant_id) {
            await queryInterface.removeColumn('subscriptions', 'lemon_squeezy_variant_id');
        }
        if (tableInfo.lemon_squeezy_status) {
            await queryInterface.removeColumn('subscriptions', 'lemon_squeezy_status');
        }
    } catch (error) {
        console.error('!!! ROLLBACK ERROR !!!', error);
        throw error;
    }
}
