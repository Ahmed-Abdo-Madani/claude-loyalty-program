/**
 * Migration: Add Barcode Preference to Offers
 * 
 * Adds an ENUM column to the offers table to store barcode format preference
 * for wallet passes (Apple Wallet and Google Wallet).
 * 
 * Changes:
 * 1. offers table:
 *    - barcode_preference: ENUM field for barcode format selection
 * 
 * ENUM Values:
 * - 'QR_CODE': QR Code format (default, standard for most wallet passes)
 * - 'PDF417': PDF417 barcode format (used for airline boarding passes, event tickets)
 * 
 * Default Value: 'QR_CODE' for backward compatibility with existing offers
 * 
 * Usage:
 * - Run: node backend/migrations/20250203-add-barcode-preference-to-offers.js
 * - Or: npm run migrate:barcode-preference
 * - Or via pgAdmin: Copy SQL from comments below
 * 
 * Manual SQL (for pgAdmin):
 * ```sql
 * -- Create ENUM type
 * DO $$ BEGIN
 *   CREATE TYPE enum_offers_barcode_preference AS ENUM ('QR_CODE', 'PDF417');
 * EXCEPTION
 *   WHEN duplicate_object THEN null;
 * END $$;
 * 
 * -- Add column with default value
 * ALTER TABLE offers 
 * ADD COLUMN barcode_preference enum_offers_barcode_preference NOT NULL DEFAULT 'QR_CODE';
 * 
 * -- Add column comment
 * COMMENT ON COLUMN offers.barcode_preference IS 'Barcode format for wallet passes (QR_CODE or PDF417)';
 * 
 * -- Verify column
 * SELECT column_name, data_type, column_default, is_nullable
 * FROM information_schema.columns
 * WHERE table_name = 'offers' AND column_name = 'barcode_preference';
 * 
 * -- View all offers with their barcode preference
 * SELECT public_id, title, barcode_preference FROM offers LIMIT 10;
 * ```
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Starting migration: Add barcode_preference to offers...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Create PostgreSQL ENUM type (idempotent with duplicate_object exception)
    await sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE enum_offers_barcode_preference AS ENUM ('QR_CODE', 'PDF417');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      { transaction }
    )
    logger.info('✅ ENUM type enum_offers_barcode_preference created (or already exists)')

    // Check if barcode_preference column exists
    const [barcodePreferenceColumn] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'offers' AND column_name = 'barcode_preference' AND table_schema = 'public'`,
      { transaction }
    )

    if (barcodePreferenceColumn.length === 0) {
      // Column doesn't exist, add it
      await sequelize.query(
        `ALTER TABLE offers 
         ADD COLUMN barcode_preference enum_offers_barcode_preference NOT NULL DEFAULT 'QR_CODE';`,
        { transaction }
      )
      
      // Add column comment
      await sequelize.query(
        `COMMENT ON COLUMN offers.barcode_preference IS 'Barcode format for wallet passes (QR_CODE or PDF417)';`,
        { transaction }
      )
      
      logger.info('✅ Added barcode_preference column to offers table')
      logger.info('  - Type: ENUM(\'QR_CODE\', \'PDF417\')')
      logger.info('  - NOT NULL with default value: \'QR_CODE\'')
      logger.info('  - All existing offers will have barcode_preference set to \'QR_CODE\'')
    } else {
      logger.info('⏭️  barcode_preference column already exists, verifying constraints...')
      
      // Query column properties to verify NOT NULL and default value
      const [columnProperties] = await sequelize.query(
        `SELECT is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'offers' AND column_name = 'barcode_preference' AND table_schema = 'public'`,
        { transaction }
      )
      
      if (columnProperties.length > 0) {
        const { is_nullable, column_default } = columnProperties[0]
        let constraintsUpdated = false
        
        // Fix NOT NULL constraint if column is nullable
        if (is_nullable === 'YES') {
          await sequelize.query(
            `ALTER TABLE offers ALTER COLUMN barcode_preference SET NOT NULL;`,
            { transaction }
          )
          logger.info('✅ Applied NOT NULL constraint to barcode_preference column')
          constraintsUpdated = true
        }
        
        // Fix default value if missing or incorrect
        if (!column_default || !column_default.includes('QR_CODE')) {
          await sequelize.query(
            `ALTER TABLE offers ALTER COLUMN barcode_preference SET DEFAULT 'QR_CODE';`,
            { transaction }
          )
          logger.info('✅ Applied DEFAULT \'QR_CODE\' to barcode_preference column')
          constraintsUpdated = true
        }
        
        if (!constraintsUpdated) {
          logger.info('✅ Column constraints already correct (NOT NULL, DEFAULT \'QR_CODE\')')
        }
      }
    }
    
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
  
  logger.info('🔄 Starting rollback: Remove barcode_preference from offers...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Remove barcode_preference column
    await queryInterface.removeColumn('offers', 'barcode_preference', { transaction })
    
    // Drop the ENUM type to avoid orphaning it in PostgreSQL
    await sequelize.query(
      'DROP TYPE IF EXISTS enum_offers_barcode_preference',
      { transaction }
    )
    
    logger.info('✅ Successfully removed barcode_preference column from offers table')
    logger.info('✅ Successfully dropped enum_offers_barcode_preference type')
    
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
