
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    const table = 'businesses'
    // using STRING instead of ENUM to avoid type creation complexity in raw addColumn
    await queryInterface.addColumn(table, 'location_type', { type: DataTypes.STRING(50), allowNull: true })
}

export async function down(queryInterface, Sequelize) {
    // Not implemented
}
