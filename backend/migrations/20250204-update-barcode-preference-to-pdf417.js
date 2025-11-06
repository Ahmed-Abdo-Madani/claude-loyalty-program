/**
 * Migration: Update Barcode Preference to PDF417
 * 
 * Updates all existing offers from QR_CODE to PDF417 barcode format to leverage
 * improved Apple Wallet pass layout. PDF417's rectangular format (Figure 4-5 in
 * Apple Wallet Developer Guide) provides better field separation for secondary
 * and auxiliary fields, allowing more customer information (tiers, stamps,
 * completion status) to be displayed prominently.
 * 
 * Changes:
 * 1. offers table:
 *    - UPDATE barcode_preference from 'QR_CODE' to 'PDF417' for all existing offers
 * 
 * Rationale:
 * - PDF417 barcodes provide rectangular layout enabling better field separation
 * - Secondary fields appear to the right of PDF417 (vs below QR codes)
 * - Auxiliary fields get more space below the barcode
 * - Improved visual hierarchy for loyalty card information
 * - Better use of available space in Apple Wallet passes
 * 
 * Safety:
 * - Idempotent: Safe to run multiple times (checks for QR_CODE offers first)
 * - Transactional: All-or-nothing update with automatic rollback on error
 * - Verification: Confirms no QR_CODE offers remain after update
 * - Rollback: down() function available to revert to QR_CODE if needed
 * 
 * Usage:
 * - Run: node backend/migrations/20250204-update-barcode-preference-to-pdf417.js
 * - Rollback: node backend/migrations/20250204-update-barcode-preference-to-pdf417.js down
 * - Or via pgAdmin: Copy SQL from comments below
 * 
 * Manual SQL (for pgAdmin):
 * ```sql
 * -- Check current distribution
 * SELECT barcode_preference, COUNT(*) as count
 * FROM offers
 * GROUP BY barcode_preference;
 * 
 * -- Update all QR_CODE offers to PDF417
 * UPDATE offers 
 * SET barcode_preference = 'PDF417' 
 * WHERE barcode_preference = 'QR_CODE';
 * 
 * -- Verify update (should return 0)
 * SELECT COUNT(*) as remaining_qr_code
 * FROM offers
 * WHERE barcode_preference = 'QR_CODE';
 * 
 * -- View all offers with their new barcode preference
 * SELECT public_id, title, barcode_preference 
 * FROM offers 
 * LIMIT 20;
 * ```
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Starting migration: Update barcode_preference to PDF417...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Check if barcode_preference column exists (prerequisite check)
    const [columnCheck] = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'offers' 
       AND column_name = 'barcode_preference' 
       AND table_schema = 'public'`,
      { transaction }
    )
    
    if (columnCheck.length === 0) {
      const errorMsg = '❌ Column barcode_preference does not exist in offers table. Please run migration 20250203-add-barcode-preference-to-offers.js first.'
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
    
    logger.info('✅ Prerequisite check passed: barcode_preference column exists')
    
    // Idempotency check: Count offers with QR_CODE
    const [qrCodeOffers] = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM offers 
       WHERE barcode_preference = 'QR_CODE'`,
      { transaction }
    )
    
    const qrCodeCount = parseInt(qrCodeOffers[0].count, 10)
    logger.info(`📊 Found ${qrCodeCount} offers with QR_CODE barcode preference`)
    
    if (qrCodeCount === 0) {
      logger.info('⏭️  No QR_CODE offers found, migration already complete or no offers exist')
      await transaction.commit()
      logger.info('✅ Migration completed (no changes needed)!')
      return
    }
    
    // Execute UPDATE to change QR_CODE to PDF417
    const [updateResult, metadata] = await sequelize.query(
      `UPDATE offers 
       SET barcode_preference = 'PDF417' 
       WHERE barcode_preference = 'QR_CODE'`,
      { transaction }
    )
    
    // Get actual row count from metadata (Postgres returns it in metadata.rowCount)
    const actualRowCount = metadata?.rowCount || 0
    logger.info(`✅ Updated ${actualRowCount} offers to PDF417 barcode format`)
    logger.info('  - Offers now use rectangular PDF417 layout')
    logger.info('  - Improved field separation in Apple Wallet passes')
    logger.info('  - Better display of loyalty tiers and progress')
    
    // Verification query: Ensure no QR_CODE offers remain
    const [remainingQrCode] = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM offers 
       WHERE barcode_preference = 'QR_CODE'`,
      { transaction }
    )
    
    const remainingCount = parseInt(remainingQrCode[0].count, 10)
    
    if (remainingCount === 0) {
      logger.info('✅ Verification passed: 0 QR_CODE offers remain')
    } else {
      throw new Error(`Verification failed: ${remainingCount} QR_CODE offers still exist`)
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
  
  logger.info('🔄 Starting rollback: Revert barcode_preference to QR_CODE...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Count offers with PDF417 before rollback
    const [pdf417Offers] = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM offers 
       WHERE barcode_preference = 'PDF417'`,
      { transaction }
    )
    
    const pdf417Count = parseInt(pdf417Offers[0].count, 10)
    logger.info(`📊 Found ${pdf417Count} offers with PDF417 barcode preference`)
    
    if (pdf417Count === 0) {
      logger.info('⏭️  No PDF417 offers found, rollback not needed')
      await transaction.commit()
      logger.info('✅ Rollback completed (no changes needed)!')
      return
    }
    
    // Execute UPDATE to revert PDF417 to QR_CODE
    await sequelize.query(
      `UPDATE offers 
       SET barcode_preference = 'QR_CODE' 
       WHERE barcode_preference = 'PDF417'`,
      { transaction }
    )
    
    logger.info(`✅ Reverted ${pdf417Count} offers back to QR_CODE barcode format`)
    logger.info('  - Offers now use square QR code layout')
    
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
