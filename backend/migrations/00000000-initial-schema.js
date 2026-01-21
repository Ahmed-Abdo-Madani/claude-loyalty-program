
import { exec } from 'child_process'
import util from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = util.promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function up(queryInterface, Sequelize) {
    console.log('🔄 Executing initial schema dump via psql pipe...')

    const sqlPath = path.join(__dirname, '00000000-initial-schema.sql')

    // Command to filter and pipe SQL to dockerized psql
    const command = `sed -e '/^\\\\/d' -e '/schema_migrations/d' "${sqlPath}" | docker exec -i loyalty_postgres psql -U loyalty_user -d loyalty_program`

    try {
        const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 }) // 10MB buffer

        // Log output sparingly
        if (stderr) {
            // psql prints notices to stderr, which is fine
            console.log('📝 psql output/notices:')
            console.log(stderr.split('\n').slice(0, 5).join('\n') + '...')
        }

        console.log('✅ Initial schema applied successfully via psql')
    } catch (error) {
        console.error('❌ Failed to execute psql command:', error)
        if (error.stdout) console.log(error.stdout)
        if (error.stderr) console.error(error.stderr)
        throw error
    }
}

export async function down(queryInterface, Sequelize) {
    console.log('⚠️  This is a baseline migration. To revert, drop the database.')
}
