import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('businesses')

    await queryInterface.sequelize.transaction(async (t) => {
        if (!tableInfo.reset_password_token) {
            await queryInterface.addColumn('businesses', 'reset_password_token', {
                type: Sequelize.STRING(255),
                allowNull: true
            }, { transaction: t })
        }

        if (!tableInfo.reset_password_expires) {
            await queryInterface.addColumn('businesses', 'reset_password_expires', {
                type: Sequelize.DATE,
                allowNull: true
            }, { transaction: t })
        }
    })
}

export async function down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('businesses')

    await queryInterface.sequelize.transaction(async (t) => {
        if (tableInfo.reset_password_token) {
            await queryInterface.removeColumn('businesses', 'reset_password_token', { transaction: t })
        }

        if (tableInfo.reset_password_expires) {
            await queryInterface.removeColumn('businesses', 'reset_password_expires', { transaction: t })
        }
    })
}
