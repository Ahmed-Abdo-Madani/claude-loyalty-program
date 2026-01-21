
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction()
    try {
        console.log('🔧 Starting migration: Add customer_id to customers table...')

        const tableInfo = await queryInterface.describeTable('customers')
        if (!tableInfo.customer_id) {
            console.log('➕ Adding customer_id column to customers...')
            await queryInterface.addColumn('customers', 'customer_id', {
                type: DataTypes.STRING(50),
                allowNull: true, // Allow null initially to avoid errors with existing data
                unique: true
            }, { transaction })

            console.log('✅ Added customer_id column')

            // Add index
            await queryInterface.addIndex('customers', ['customer_id'], {
                transaction,
                unique: true,
                name: 'idx_customers_customer_id'
            })
        } else {
            console.log('⚠️  customer_id column already exists, skipping...')
        }

        await transaction.commit()
        console.log('✅ Migration completed successfully')
    } catch (error) {
        await transaction.rollback()
        console.error('❌ Migration failed:', error)
        throw error
    }
}

export async function down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction()
    try {
        await queryInterface.removeColumn('customers', 'customer_id', { transaction })
        await transaction.commit()
    } catch (error) {
        await transaction.rollback()
        throw error
    }
}
