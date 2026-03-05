/**
 * Migration: Add color column to customer_segments table
 */

export const up = async (queryInterface, Sequelize) => {
    // Check if column exists to make migration idempotent
    const tableInfo = await queryInterface.describeTable('customer_segments')
    if (!tableInfo.color) {
        await queryInterface.addColumn('customer_segments', 'color', {
            type: Sequelize.STRING(7),
            allowNull: true,
            defaultValue: '#3B82F6',
            comment: 'Hex color code for segment visualization'
        })
    }

    // Also check if type enum needs updating? No, just adding color.
}

export const down = async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('customer_segments')
    if (tableInfo.color) {
        await queryInterface.removeColumn('customer_segments', 'color')
    }
}
