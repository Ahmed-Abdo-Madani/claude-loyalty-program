import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
    await queryInterface.addColumn('auto_engagement_configs', 'last_manual_run_at', {
        type: DataTypes.DATE,
        allowNull: true,
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('auto_engagement_configs', 'last_manual_run_at');
}
