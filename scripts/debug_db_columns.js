import sequelize from '../backend/config/database.js';

async function checkColumns() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const queryInterface = sequelize.getQueryInterface();
        const tableDesc = await queryInterface.describeTable('businesses');

        console.log('Columns in businesses table:');
        console.log(Object.keys(tableDesc).join(', '));

        if (tableDesc.menu_phone) {
            console.log('✅ menu_phone column EXISTS');
        } else {
            console.log('❌ menu_phone column does NOT exist');
        }
    } catch (error) {
        console.error('Error checking columns:', error);
    } finally {
        await sequelize.close();
    }
}

checkColumns();
