import sequelize from './config/database.js';

async function clearLocks() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Clearing all advisory locks...');
        await sequelize.query('SELECT pg_advisory_unlock_all()');
        console.log('Locks cleared successfully.');
    } catch (error) {
        console.error('Error clearing locks:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

clearLocks();
