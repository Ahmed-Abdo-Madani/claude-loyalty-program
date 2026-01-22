import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function up(queryInterface, Sequelize) {
    console.log('🔄 Executing initial schema dump with robust statement splitting...')

    const sqlPath = path.join(__dirname, '00000000-initial-schema.sql')

    if (!fs.existsSync(sqlPath)) {
        throw new Error(`Migration SQL file not found: ${sqlPath}`)
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
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
                // SKIP if it contains schema_migrations (handled by AutoMigrationRunner)
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
            await queryInterface.sequelize.query(statement)
            if (i % 100 === 0 && i > 0) {
                console.log(`   ⏳ Progress: ${i}/${statements.length} statements...`)
            }
        } catch (error) {
            console.error(`❌ Failure in statement ${i}:`)
            console.error(statement.substring(0, 500) + '...')
            console.error(`Error: ${error.message}`)
            throw error
        }
    }

    console.log('✅ Initial schema applied successfully')
}

export async function down(queryInterface, Sequelize) {
    console.log('⚠️  This is a baseline migration. To revert, drop the database.')
}
