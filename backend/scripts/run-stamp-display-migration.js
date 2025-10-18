import sequelize from '../config/database.js'

async function runMigration() {
  try {
    console.log('🔄 Running stamp_display_type migration...')

    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'offer_card_designs'
      AND column_name = 'stamp_display_type'
    `)

    if (results.length > 0) {
      console.log('✅ Column stamp_display_type already exists')
      process.exit(0)
    }

    // Add the column
    await sequelize.query(`
      ALTER TABLE offer_card_designs
      ADD COLUMN stamp_display_type VARCHAR(10) NOT NULL DEFAULT 'icon'
    `)

    console.log('✅ Column stamp_display_type added successfully')

    // Add CHECK constraint
    try {
      await sequelize.query(`
        ALTER TABLE offer_card_designs
        ADD CONSTRAINT check_stamp_display_type
        CHECK (stamp_display_type IN ('icon', 'logo'))
      `)
      console.log('✅ CHECK constraint added successfully')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  CHECK constraint already exists')
      } else {
        throw error
      }
    }

    console.log('✨ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()
