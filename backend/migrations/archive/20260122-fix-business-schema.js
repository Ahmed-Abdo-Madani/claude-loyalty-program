
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    const table = 'businesses'

    // Add missing columns
    await queryInterface.addColumn(table, 'business_name_ar', { type: DataTypes.STRING(255), allowNull: true })
    await queryInterface.addColumn(table, 'business_type', { type: DataTypes.STRING(100), allowNull: true })
    await queryInterface.addColumn(table, 'license_number', { type: DataTypes.STRING(50), allowNull: true })
    await queryInterface.addColumn(table, 'description', { type: DataTypes.TEXT, allowNull: true })

    // Location
    await queryInterface.addColumn(table, 'region', { type: DataTypes.STRING(100), allowNull: true })
    await queryInterface.addColumn(table, 'city', { type: DataTypes.STRING(100), allowNull: true })
    await queryInterface.addColumn(table, 'district', { type: DataTypes.STRING(100), allowNull: true })
    await queryInterface.addColumn(table, 'address', { type: DataTypes.TEXT, allowNull: true })
    await queryInterface.addColumn(table, 'location_id', { type: DataTypes.STRING(50), allowNull: true })
    await queryInterface.addColumn(table, 'location_hierarchy', { type: DataTypes.STRING(500), allowNull: true })

    // Owner
    await queryInterface.addColumn(table, 'owner_name', { type: DataTypes.STRING(255), allowNull: true })
    await queryInterface.addColumn(table, 'owner_name_ar', { type: DataTypes.STRING(255), allowNull: true })
    await queryInterface.addColumn(table, 'owner_id', { type: DataTypes.STRING(20), allowNull: true })
    await queryInterface.addColumn(table, 'owner_phone', { type: DataTypes.STRING(20), allowNull: true })
    await queryInterface.addColumn(table, 'owner_email', { type: DataTypes.STRING(255), allowNull: true })

    // Status & Approval
    // Note: 'status' enum might need to be created if not exists, but here we use string for safety as explicit enum creation can be tricky in raw query vs sequelize
    await queryInterface.addColumn(table, 'status', { type: DataTypes.STRING(20), defaultValue: 'pending' })
    await queryInterface.addColumn(table, 'suspension_reason', { type: DataTypes.TEXT, allowNull: true })
    await queryInterface.addColumn(table, 'suspension_date', { type: DataTypes.DATE, allowNull: true })
    await queryInterface.addColumn(table, 'approved_at', { type: DataTypes.DATE, allowNull: true })
    await queryInterface.addColumn(table, 'approved_by', { type: DataTypes.STRING(50), allowNull: true })
    await queryInterface.addColumn(table, 'last_activity_at', { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') })

    // Stats
    await queryInterface.addColumn(table, 'total_branches', { type: DataTypes.INTEGER, defaultValue: 0 })
    await queryInterface.addColumn(table, 'total_offers', { type: DataTypes.INTEGER, defaultValue: 0 })
    await queryInterface.addColumn(table, 'active_offers', { type: DataTypes.INTEGER, defaultValue: 0 })
    await queryInterface.addColumn(table, 'total_customers', { type: DataTypes.INTEGER, defaultValue: 0 })
    await queryInterface.addColumn(table, 'total_redemptions', { type: DataTypes.INTEGER, defaultValue: 0 })

    // Logo
    await queryInterface.addColumn(table, 'logo_filename', { type: DataTypes.STRING(255), allowNull: true })
    await queryInterface.addColumn(table, 'logo_url', { type: DataTypes.STRING(500), allowNull: true })
    await queryInterface.addColumn(table, 'logo_uploaded_at', { type: DataTypes.DATE, allowNull: true })
    await queryInterface.addColumn(table, 'logo_file_size', { type: DataTypes.INTEGER, allowNull: true })
}

export async function down(queryInterface, Sequelize) {
    // Not implemented for rescue migration
}
