
import { Business } from './models/index.js';
import sequelize from './config/database.js';

async function checkBusinesses() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const businesses = await Business.findAll({
            attributes: ['public_id', 'business_name', 'email']
        });

        console.log('Businesses found:', businesses.map(b => b.toJSON()));

        const specificBusiness = await Business.findByPk('Hahhauu');
        console.log("Business with ID 'Hahhauu':", specificBusiness ? specificBusiness.toJSON() : 'Not found');

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkBusinesses();
