export const up = async (queryInterface, Sequelize) => {
    // Add scanner_access_enabled column
    await queryInterface.addColumn('branches', 'scanner_access_enabled', {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether scanner access is enabled for this branch'
    })
}

export const down = async (queryInterface, Sequelize) => {
    // Remove scanner_access_enabled column
    await queryInterface.removeColumn('branches', 'scanner_access_enabled')
}
