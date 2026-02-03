import { Sequelize } from 'sequelize';

/**
 * Script to drop the unused loyalty_platform_dev database
 * Run from backend directory: node scripts/drop_old_database.js
 */

// Connect to postgres database (not loyalty_platform_dev) to drop it
const sequelize = new Sequelize({
    database: 'postgres', // Connect to default postgres db
    username: 'postgres',
    password: 'Watashi12Des',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

async function dropOldDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Connected to postgres database');

        // Check if the old database exists
        const [results] = await sequelize.query(`
      SELECT datname FROM pg_database WHERE datname = 'loyalty_platform_dev'
    `);

        if (results.length === 0) {
            console.log('ℹ️ Database loyalty_platform_dev does not exist - nothing to drop');
            return;
        }

        console.log('Found loyalty_platform_dev database - dropping it...');

        // Terminate all connections to the database first
        await sequelize.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'loyalty_platform_dev' AND pid <> pg_backend_pid()
    `);

        // Drop the database
        await sequelize.query('DROP DATABASE loyalty_platform_dev');
        console.log('✅ Successfully dropped loyalty_platform_dev database');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

dropOldDatabase();
