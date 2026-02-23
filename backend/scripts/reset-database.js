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
        const dbUser = process.env.DB_USER || 'postgres'
        await sequelize.query(`GRANT ALL ON SCHEMA public TO "${dbUser}"`, { raw: true })
        await sequelize.query('GRANT ALL ON SCHEMA public TO public', { raw: true })
        console.log('✅ All tables dropped')

        // Replace psql block with internal query execution logic from initial-schema.js
        console.log('\n📦 Loading initial schema via Sequelize...')
        const schemaPath = path.join(__dirname, '../migrations/00000000-initial-schema.sql')

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Migration SQL file not found: ${schemaPath}`)
        }

        const sqlContent = fs.readFileSync(schemaPath, 'utf8')
        const lines = sqlContent.split(/\r?\n/)

        const statements = []
        let currentStatement = ''
        let inDollarBlock = false
        let dollarTag = ''

        for (let line of lines) {
            let trimmed = line.trim()

            // Skip psql meta-commands and comments if not in block
            if (!inDollarBlock && (trimmed.startsWith('\\') || trimmed.startsWith('--'))) continue

            // Skip OWNER TO statements entirely (Portability)
            if (!inDollarBlock && trimmed.toUpperCase().includes('OWNER TO')) continue

            // Skip search_path reset
            if (!inDollarBlock && trimmed.includes("set_config('search_path', '', false)")) continue

            if (!trimmed && !inDollarBlock) continue

            currentStatement += line + '\n'

            // Check for dollar blocks
            if (!inDollarBlock) {
                const match = trimmed.match(/\$[a-zA-Z0-9_]*\$/)
                if (match) {
                    inDollarBlock = true
                    dollarTag = match[0]
                }
            } else {
                if (trimmed.includes(dollarTag)) {
                    inDollarBlock = false
                    dollarTag = ''
                }
            }

            // End of statement
            if (!inDollarBlock && trimmed.endsWith(';')) {
                const stmt = currentStatement.trim()
                if (stmt && stmt !== ';') {
                    // SKIP if it contains schema_migrations (managed by AutoMigrationRunner)
                    if (!stmt.toLowerCase().includes('schema_migrations')) {
                        statements.push(stmt)
                    } else {
                        console.log(`   ⏭️ Skipping schema_migrations related statement`)
                    }
                }
                currentStatement = ''
            }
        }

        if (currentStatement.trim() && currentStatement.trim() !== ';') {
            if (!currentStatement.toLowerCase().includes('schema_migrations')) {
                statements.push(currentStatement.trim())
            }
        }

        console.log(`📋 Executing ${statements.length} SQL statements...`)

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i]
            try {
                await sequelize.query(statement)
                if (i % 100 === 0 && i > 0) {
                    console.log(`   ⏳ Progress: ${i}/${statements.length} statements...`)
                }
            } catch (error) {
                // Check for "already exists" errors (tables, functions, types, constraints, etc.)
                const isAlreadyExistsError =
                    error.message.includes('already exists') ||
                    error.message.includes('duplicate key value violates unique constraint') ||
                    error.message.includes('multiple primary keys');

                if (isAlreadyExistsError) {
                    console.log(`   ⚠️  Skipping statement (entity already exists): ${error.message.split('\n')[0]}`)
                    continue
                }

                console.error(`❌ Failure in statement ${i}:`)
                console.error(statement.substring(0, 500) + '...')
                throw error
            }
        }

        console.log('✅ Initial schema applied successfully')

        console.log('\n🎉 Database reset completed successfully!')
        console.log('📊 Initial schema has been applied')

    } catch (error) {
        console.error('\n❌ Database reset failed:')
        console.error(error)
        console.error(error.original)
        if (error.stderr) {
            console.error('\nError stderr details:', error.stderr)
        }
        if (error.stack) {
            console.error('\nStack trace:', error.stack)
        }
        try {
            await sequelize.close()
        } catch (closeError) {
            console.error('⚠️ Could not close database connection:', closeError.message)
        }
        process.exit(1)
    } finally {
        try {
            await sequelize.close()
        } catch (closeError) {
            // Ignore if already closed or error handling it
        }
    }
}

resetDatabase()
