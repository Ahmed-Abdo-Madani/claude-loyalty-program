
import sequelize from './config/database.js';

async function checkBusinesses() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const [results, metadata] = await sequelize.query("SELECT public_id, business_name, email FROM businesses");

        console.log('Businesses found:', results);

        const [specificBusiness, meta] = await sequelize.query("SELECT * FROM businesses WHERE public_id = 'Hahhauu'");
        console.log("Business with ID 'Hahhauu':", specificBusiness.length > 0 ? specificBusiness[0] : 'Not found');

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        // We need to clear the interval in database.js to exit cleanly, or just exit process
        process.exit(0);
    }
}

checkBusinesses();
