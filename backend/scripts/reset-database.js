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
import logger from '../config/logger.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function resetDatabase() {
    logger.info('╔════════════════════════════════════════════════════════════╗')
    logger.info('║  🗄️  Database Reset Script                                 ║')
    logger.info('║  ⚠️  WARNING: This will DELETE ALL DATA!                   ║')
    logger.info('╚════════════════════════════════════════════════════════════╝')

    try {
        // Connect to database
        logger.info('\n🔌 Connecting to database...')
        await sequelize.authenticate()
        logger.info('✅ Database connection established')

        // Drop all tables
        logger.info('\n🗑️  Dropping all tables...')
        await sequelize.query('DROP SCHEMA public CASCADE', { raw: true })
        await sequelize.query('CREATE SCHEMA public', { raw: true })
        await sequelize.query('GRANT ALL ON SCHEMA public TO postgres', { raw: true })
        await sequelize.query('GRANT ALL ON SCHEMA public TO public', { raw: true })
        logger.info('✅ All tables dropped')

        // Close the connection before running psql
        await sequelize.close()
        logger.info('🔌 Closed Sequelize connection')

        // Use psql to execute the schema file
        logger.info('\n📦 Loading initial schema via psql...')
        const schemaPath = path.join(__dirname, '../migrations/00000000-initial-schema.sql')

        const psqlPath = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe'
        const dbUser = process.env.DB_USER || 'postgres'
        const dbName = process.env.DB_NAME || 'loyalty_program'
        const dbHost = process.env.DB_HOST || 'localhost'
        const dbPort = process.env.DB_PORT || '5432'

        const command = `"${psqlPath}" -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -f "${schemaPath}"`

        logger.info(`� Executing: psql -f ${path.basename(schemaPath)}`)

        const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
        const { stdout, stderr } = await execAsync(command, { env, maxBuffer: 10 * 1024 * 1024 })

        if (stderr && !stderr.includes('NOTICE') && !stderr.includes('does not exist, skipping')) {
            logger.warn('⚠️  psql warnings:', stderr)
        }

        logger.info('✅ Initial schema applied successfully')

        logger.info('\n🎉 Database reset completed successfully!')
        logger.info('📊 Initial schema has been applied')

    } catch (error) {
        logger.error('\n❌ Database reset failed:', error.message)
        if (error.stderr) {
            logger.error('Error details:', error.stderr)
        }
        logger.error('Stack trace:', error.stack)
        process.exit(1)
    }
}

resetDatabase()
