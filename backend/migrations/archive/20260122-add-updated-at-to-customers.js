
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    const table = 'customers'
    const columns = await queryInterface.describeTable(table)

    if (!columns.updated_at) {
        await queryInterface.addColumn(table, 'updated_at', {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        })
    }
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('customers', 'updated_at')
}
