import sequelize from '../backend/config/database.js';

async function addColumnDirectly() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database:', sequelize.config.database);
        console.log('Host:', sequelize.config.host);
        console.log('Port:', sequelize.config.port);

        // Check if column exists using raw SQL
        const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'businesses' AND column_name = 'menu_phone'
    `);

        if (results.length > 0) {
            console.log('✅ menu_phone column already exists in businesses table');
        } else {
            console.log('❌ menu_phone column does NOT exist - Adding it now...');
            await sequelize.query(`
        ALTER TABLE businesses ADD COLUMN menu_phone VARCHAR(20)
      `);
            console.log('✅ menu_phone column added successfully!');
        }

        // Verify by listing all columns
        const [allColumns] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'businesses' ORDER BY ordinal_position
    `);
        console.log('\nAll columns in businesses table:');
        allColumns.forEach(col => console.log('  -', col.column_name));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

addColumnDirectly();
