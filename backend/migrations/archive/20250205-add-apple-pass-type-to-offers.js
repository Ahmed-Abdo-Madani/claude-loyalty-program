/**
 * Migration: Add Apple Pass Type to Offers
 * 
 * Adds an ENUM column to the offers table to store Apple Wallet pass style preference.
 * Allows businesses to choose between storeCard (classic loyalty card with strip image)
 * and generic (modern layout with thumbnail image and PDF417 benefits).
 * 
 * Changes:
 * 1. offers table:
 *    - apple_pass_type: ENUM field for Apple Wallet pass style selection
 * 
 * ENUM Values:
 * - 'storeCard': Classic loyalty card with strip image (624x168) - default
 * - 'generic': Modern layout with thumbnail image (180x180) and better field separation
 * 
 * Default Value: 'storeCard' for backward compatibility with existing passes
 * 
 * Rationale:
 * - Enables per-offer configuration of Apple Wallet pass style
 * - storeCard: Traditional layout with rectangular strip banner
 * - generic: Modern layout per Apple's Figure 4-5, more field space with PDF417
 * - Allows A/B testing and gradual migration between pass types
 * - Businesses can optimize pass design based on content complexity
 * 
 * Usage:
 * - Run: node backend/migrations/20250205-add-apple-pass-type-to-offers.js
 * - Rollback: node backend/migrations/20250205-add-apple-pass-type-to-offers.js down
 * - Or via pgAdmin: Copy SQL from comments below
 * 
 * Manual SQL (for pgAdmin):
 * ```sql
 * -- Create ENUM type
 * DO $$ BEGIN
 *   CREATE TYPE apple_pass_type_enum AS ENUM ('storeCard', 'generic');
 * EXCEPTION
 *   WHEN duplicate_object THEN null;
 * END $$;
 * 
 * -- Add column with default value
 * ALTER TABLE offers 
 * ADD COLUMN apple_pass_type apple_pass_type_enum NOT NULL DEFAULT 'storeCard';
 * 
 * -- Add column comment
 * COMMENT ON COLUMN offers.apple_pass_type IS 'Apple Wallet pass style: storeCard (strip image) or generic (thumbnail image)';
 * 
 * -- Verify column
 * SELECT column_name, data_type, column_default, is_nullable
 * FROM information_schema.columns
 * WHERE table_name = 'offers' AND column_name = 'apple_pass_type';
 * 
 * -- View all offers with their Apple pass type
 * SELECT public_id, title, apple_pass_type, barcode_preference FROM offers LIMIT 10;
 * ```
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Starting migration: Add apple_pass_type to offers...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Check if apple_pass_type column exists (idempotency)
    const [applePassTypeColumn] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'offers' AND column_name = 'apple_pass_type' AND table_schema = 'public'`,
      { transaction }
    )

    if (applePassTypeColumn.length > 0) {
      logger.info('⏭️  apple_pass_type column already exists, skipping migration')
      await transaction.commit()
      logger.info('✅ Migration completed (no changes needed)!')
      return
    }

    // Create PostgreSQL ENUM type (idempotent with duplicate_object exception)
    await sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE apple_pass_type_enum AS ENUM ('storeCard', 'generic');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      { transaction }
    )
    logger.info('✅ ENUM type apple_pass_type_enum created (or already exists)')

    // Add column
    await sequelize.query(
      `ALTER TABLE offers 
       ADD COLUMN apple_pass_type apple_pass_type_enum NOT NULL DEFAULT 'storeCard';`,
      { transaction }
    )
    
    // Add column comment
    await sequelize.query(
      `COMMENT ON COLUMN offers.apple_pass_type IS 'Apple Wallet pass style: storeCard (strip image) or generic (thumbnail image)';`,
      { transaction }
    )
    
    logger.info('✅ Added apple_pass_type column to offers table')
    logger.info('  - Type: ENUM(\'storeCard\', \'generic\')')
    logger.info('  - NOT NULL with default value: \'storeCard\'')
    logger.info('  - All existing offers will have apple_pass_type set to \'storeCard\'')
    
    await transaction.commit()
    logger.info('✅ Migration completed successfully!')
  } catch (error) {
    await transaction.rollback()
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Starting rollback: Remove apple_pass_type from offers...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Remove apple_pass_type column
    await sequelize.query(
      `ALTER TABLE offers DROP COLUMN IF EXISTS apple_pass_type`,
      { transaction }
    )
    
    // Drop the ENUM type to avoid orphaning it in PostgreSQL
    await sequelize.query(
      'DROP TYPE IF EXISTS apple_pass_type_enum',
      { transaction }
    )
    
    logger.info('✅ Successfully removed apple_pass_type column from offers table')
    logger.info('✅ Successfully dropped apple_pass_type_enum type')
    
    await transaction.commit()
    logger.info('✅ Rollback completed successfully!')
  } catch (error) {
    await transaction.rollback()
    logger.error('❌ Rollback failed:', error)
    throw error
  }
}

// Direct execution support
if (process.argv[1] === new URL(import.meta.url).pathname) {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')
      
      const command = process.argv[2] || 'up'
      
      if (command === 'up') {
        await up()
      } else if (command === 'down') {
        await down()
      } else {
        logger.error('❌ Invalid command. Use "up" or "down"')
        process.exit(1)
      }
      
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration execution failed:', error)
      await sequelize.close()
      process.exit(1)
    }
  })()
}

export { up, down }
