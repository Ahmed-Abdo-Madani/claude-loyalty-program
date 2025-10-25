/**
 * Migration: Update stamp_display_type from ('icon', 'logo') to ('svg', 'logo')
 *
 * This migration replaces the emoji-based stamp system with an SVG icon library.
 *
 * Steps:
 * 1. Drop old check constraints
 * 2. Update existing 'icon' values to 'svg'
 * 3. Add new constraint allowing ('svg', 'logo')
 * 4. Set default values for new designs
 *
 * Usage:
 *   node backend/migrations/update-stamp-display-to-svg.js
 *
 * Date: 2025-10-25
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })

const { Pool } = pg

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'loyalty_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function runMigration() {
  const client = await pool.connect()

  try {
    console.log('🚀 Starting stamp_display_type migration...\n')

    // Begin transaction
    await client.query('BEGIN')

    // Step 1: Drop existing constraints
    console.log('Step 1: Dropping old constraints...')

    // Check and drop check_stamp_display_type
    const checkConstraint1 = await client.query(`
      SELECT 1 FROM pg_constraint
      WHERE conname = 'check_stamp_display_type'
      AND conrelid = 'offer_card_designs'::regclass
    `)

    if (checkConstraint1.rows.length > 0) {
      await client.query(`
        ALTER TABLE offer_card_designs
        DROP CONSTRAINT check_stamp_display_type
      `)
      console.log('  ✓ Dropped constraint: check_stamp_display_type')
    } else {
      console.log('  → Constraint check_stamp_display_type does not exist, skipping')
    }

    // Check and drop offer_card_designs_stamp_display_type_check
    const checkConstraint2 = await client.query(`
      SELECT 1 FROM pg_constraint
      WHERE conname = 'offer_card_designs_stamp_display_type_check'
      AND conrelid = 'offer_card_designs'::regclass
    `)

    if (checkConstraint2.rows.length > 0) {
      await client.query(`
        ALTER TABLE offer_card_designs
        DROP CONSTRAINT offer_card_designs_stamp_display_type_check
      `)
      console.log('  ✓ Dropped constraint: offer_card_designs_stamp_display_type_check')
    }

    // Step 2: Update existing 'icon' values to 'svg'
    console.log('\nStep 2: Updating existing data...')
    const updateResult = await client.query(`
      UPDATE offer_card_designs
      SET stamp_display_type = 'svg'
      WHERE stamp_display_type = 'icon'
    `)
    console.log(`  ✓ Updated ${updateResult.rowCount} row(s) from 'icon' to 'svg'`)

    // Step 3: Ensure column is VARCHAR(10)
    console.log('\nStep 3: Updating column type...')
    await client.query(`
      ALTER TABLE offer_card_designs
      ALTER COLUMN stamp_display_type TYPE VARCHAR(10)
    `)
    console.log('  ✓ Changed stamp_display_type to VARCHAR(10)')

    // Step 4: Add new constraint
    console.log('\nStep 4: Adding new constraint...')
    await client.query(`
      ALTER TABLE offer_card_designs
      ADD CONSTRAINT check_stamp_display_type
      CHECK (stamp_display_type IN ('svg', 'logo'))
    `)
    console.log("  ✓ Added new constraint allowing ('svg', 'logo')")

    // Step 5: Update column comment
    console.log('\nStep 5: Updating column documentation...')
    await client.query(`
      COMMENT ON COLUMN offer_card_designs.stamp_icon IS
      'SVG icon identifier (e.g., coffee-01, gift-01) for stamp visualization. Used when stamp_display_type is ''svg''.'
    `)
    console.log('  ✓ Updated stamp_icon column comment')

    // Step 6: Set default values
    console.log('\nStep 6: Setting default values...')
    await client.query(`
      ALTER TABLE offer_card_designs
      ALTER COLUMN stamp_display_type SET DEFAULT 'logo'
    `)
    console.log("  ✓ Set default stamp_display_type to 'logo'")

    await client.query(`
      ALTER TABLE offer_card_designs
      ALTER COLUMN stamp_icon SET DEFAULT 'coffee-01'
    `)
    console.log("  ✓ Set default stamp_icon to 'coffee-01'")

    // Commit transaction
    await client.query('COMMIT')

    // Success summary
    console.log('\n========================================')
    console.log('✅ Migration completed successfully!')
    console.log('========================================')
    console.log('Summary:')
    console.log('  - Old constraints dropped')
    console.log(`  - ${updateResult.rowCount} existing design(s) migrated`)
    console.log('  - New constraint allows: svg, logo')
    console.log('  - Default display type: logo')
    console.log('  - Default icon: coffee-01')
    console.log('========================================\n')

    process.exit(0)

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK')

    console.error('\n========================================')
    console.error('❌ Migration failed!')
    console.error('========================================')
    console.error('Error:', error.message)
    console.error('========================================\n')

    process.exit(1)

  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
runMigration()
