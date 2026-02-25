import bcrypt from 'bcryptjs'
import sequelize from '../config/database.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

// Helper to generate secure ID like the model does
const generateBusinessID = () => {
    return 'biz_' + crypto.randomBytes(8).toString('hex')
}

async function createTestPosBusiness() {
    try {
        await sequelize.authenticate()
        console.log('Connected to database')

        const email = 'testpos@madna.me'
        const password = 'Password@123'
        const businessName = 'Test POS Business'
        const plan = 'pos_business'

        const [existing] = await sequelize.query(`SELECT id, public_id FROM businesses WHERE email = ?`, {
            replacements: [email]
        })

        if (existing && existing.length > 0) {
            console.log('Business already exists. Updating plan to POS...')
            await sequelize.query(`
        UPDATE businesses 
        SET current_plan = ?, status = 'active', is_verified = true, approved_at = NOW()
        WHERE email = ?
      `, {
                replacements: [plan, email]
            })
            console.log(`Updated business: ${existing[0].public_id} with plan ${plan}`)
            process.exit(0)
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const publicId = generateBusinessID()

        await sequelize.query(`
      INSERT INTO businesses (
        public_id, email, password_hash, business_name, status, 
        current_plan, is_verified, approved_at, menu_display_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())
    `, {
            replacements: [
                publicId, email, passwordHash, businessName, 'active',
                plan, true, 'grid'
            ]
        })

        console.log(`Created new business: ${publicId} with plan ${plan}`)
        console.log(`Email: ${email} | Password: ${password}`)
        process.exit(0)
    } catch (err) {
        console.error('Error creating test business:', err)
        process.exit(1)
    }
}

createTestPosBusiness()
