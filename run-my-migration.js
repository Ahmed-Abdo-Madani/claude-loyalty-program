import sequelize from './backend/config/database.js'
import { up } from './backend/migrations/20260202-add-social-media-links.js'

async function runSpecificMigration() {
    try {
        console.log('Running migration against:', process.env.DB_NAME)
        await up()
        console.log('Done!')
    } catch (error) {
        console.error('Migration failed:', error)
    } finally {
        process.exit()
    }
}

runSpecificMigration()
