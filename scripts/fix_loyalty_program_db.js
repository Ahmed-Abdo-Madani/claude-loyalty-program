import { Sequelize } from 'sequelize';

// Connect DIRECTLY to loyalty_program database (the one the app uses)
const sequelize = new Sequelize({
    database: 'loyalty_program',
    username: 'postgres',
    password: 'Watashi12Des',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

async function addColumnDirectly() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database: loyalty_program');

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

        // Verify
        const [verify] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'businesses' AND column_name = 'menu_phone'
    `);
        console.log('Verification:', verify.length > 0 ? '✅ Column exists' : '❌ Column missing');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

addColumnDirectly();
