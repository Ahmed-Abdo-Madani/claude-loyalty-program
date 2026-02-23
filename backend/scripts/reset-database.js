/**
 * Database Reset Script
 * 
 * Drops all data and runs the initial schema migration
 * 
 * Usage:
 *   node backend/scripts/reset-database.js
 * 
 * WARNING: This will DELETE ALL DATA in the database!
 */

import sequelize from '../config/database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function resetDatabase() {
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  🗄️  Database Reset Script                                 ║')
    console.log('║  ⚠️  WARNING: This will DELETE ALL DATA!                   ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    try {
        // Connect to database
        console.log('\n🔌 Connecting to database...')
        await sequelize.authenticate()
        console.log('✅ Database connection established')

        // Drop all tables
        console.log('\n🗑️  Dropping all tables...')

        // Terminate hanging connections first to prevent locks
        console.log('🔪 Terminating other connections to avoid database locks...')
        await sequelize.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = current_database() AND pid <> pg_backend_pid()
        `, { raw: true }).catch(err => console.log('   Note: Could not terminate some connections. Check permissions.'));

        await sequelize.query('DROP SCHEMA public CASCADE', { raw: true })
        await sequelize.query('CREATE SCHEMA public', { raw: true })
        await sequelize.query('GRANT ALL ON SCHEMA public TO postgres', { raw: true })
        await sequelize.query('GRANT ALL ON SCHEMA public TO public', { raw: true })
        console.log('✅ All tables dropped')

        // Close the connection before running psql
        await sequelize.close()
        console.log('🔌 Closed Sequelize connection')

        // Use psql to execute the schema file
        console.log('\n📦 Loading initial schema via psql...')
        const schemaPath = path.join(__dirname, '../migrations/00000000-initial-schema.sql')

        const psqlPath = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe'
        if (!fs.existsSync(psqlPath)) {
            console.warn(`\n⚠️  psql.exe not found at ${psqlPath}`);
            console.warn('⚠️  Please provide the correct path to your PostgreSQL installation in reset-database.js (line 62).');
            console.warn('⚠️  The schema has been DROPPED, but the initial schema file has NOT been loaded.');
            process.exit(1);
        }

        const dbUser = process.env.DB_USER || 'postgres'
        const dbName = process.env.DB_NAME || 'loyalty_program'
        const dbHost = process.env.DB_HOST || 'localhost'
        const dbPort = process.env.DB_PORT || '5432'

        const command = `"${psqlPath}" -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -f "${schemaPath}"`

        console.log(`🚀 Executing: psql -f ${path.basename(schemaPath)}`)

        const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
        const { stdout, stderr } = await execAsync(command, { env, maxBuffer: 10 * 1024 * 1024 })

        if (stderr && !stderr.includes('NOTICE') && !stderr.includes('does not exist, skipping')) {
            console.warn('⚠️  psql warnings:', stderr)
        }

        console.log('✅ Initial schema applied successfully')

        console.log('\n🎉 Database reset completed successfully!')
        console.log('📊 Initial schema has been applied')

    } catch (error) {
        console.error('\n❌ Database reset failed:')
        console.error(error.message || error)
        if (error.stderr) {
            console.error('\nError stderr details:', error.stderr)
        }
        if (error.stack) {
            console.error('\nStack trace:', error.stack)
        }
        process.exit(1)
    }
}

resetDatabase()
