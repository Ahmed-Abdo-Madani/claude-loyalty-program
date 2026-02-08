export const up = async (queryInterface, Sequelize) => {
    // Add scanner_access_enabled column if it doesn't exist
    const tableInfo = await queryInterface.describeTable('branches');
    if (!tableInfo.scanner_access_enabled) {
        await queryInterface.addColumn('branches', 'scanner_access_enabled', {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            allowNull: false
        })
    }
}

export const down = async (queryInterface, Sequelize) => {
    // Remove scanner_access_enabled column
    await queryInterface.removeColumn('branches', 'scanner_access_enabled')
}
