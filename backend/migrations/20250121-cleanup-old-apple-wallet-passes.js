/**
 * Migration: Clean Up Old Apple Wallet Passes
 *
 * PURPOSE:
 * Remove old Apple Wallet passes that were created before the authentication token
 * consistency fix (2025-10-21). These passes have mismatched authentication tokens
 * causing "Invalid authentication token" errors when users try to delete them.
 *
 * WHAT THIS DOES:
 * 1. Identifies Apple Wallet passes created before 2025-10-21
 * 2. Marks them as 'deleted' status (soft delete - preserves data)
 * 3. Deletes associated device registrations to stop unregister attempts
 * 4. Logs count of affected passes
 *
 * WHY SAFE:
 * - Only affects Apple Wallet passes (Google Wallet unaffected)
 * - Soft delete (data preserved, can be restored if needed)
 * - Users will need to re-add passes by scanning QR code again
 * - New passes will have correct authentication tokens
 *
 * IMPACT:
 * - Eliminates "Invalid authentication token" errors in production logs
 * - Clean slate for Apple Wallet with proper authentication
 * - Old passes on user devices will appear as expired/deleted
 */

import { DataTypes } from 'sequelize'

export async function up() {
  const { sequelize } = await import('../config/database.js')

  try {
    console.log('🔧 Starting migration: Clean up old Apple Wallet passes...')

    // Cutoff date: Before authentication token fix was deployed
    const cutoffDate = '2025-10-21 16:00:00+00'

    console.log(`📅 Cutoff date: Passes created before ${cutoffDate}`)

    // 1. Find old Apple Wallet passes
    const [oldPasses] = await sequelize.query(`
      SELECT id, wallet_serial, customer_id, offer_id, created_at
      FROM wallet_passes
      WHERE wallet_type = 'apple'
      AND pass_status = 'active'
      AND created_at < :cutoffDate
      ORDER BY created_at DESC;
    `, {
      replacements: { cutoffDate }
    })

    if (oldPasses.length === 0) {
      console.log('✅ No old Apple Wallet passes found. Nothing to clean up.')
      return
    }

    console.log(`📊 Found ${oldPasses.length} old Apple Wallet passes to clean up:`)
    oldPasses.forEach((pass, index) => {
      console.log(`   ${index + 1}. Serial: ${pass.wallet_serial?.substring(0, 40)}...`)
      console.log(`      Customer: ${pass.customer_id}, Offer: ${pass.offer_id}`)
      console.log(`      Created: ${pass.created_at}`)
    })

    // 2. Mark passes as deleted (soft delete)
    const [updateResult] = await sequelize.query(`
      UPDATE wallet_passes
      SET pass_status = 'deleted',
          updated_at = NOW()
      WHERE wallet_type = 'apple'
      AND pass_status = 'active'
      AND created_at < :cutoffDate
      RETURNING id;
    `, {
      replacements: { cutoffDate }
    })

    console.log(`✅ Marked ${updateResult.length} Apple Wallet passes as deleted`)

    // 3. Delete associated device registrations
    // This prevents iOS devices from trying to unregister with old auth tokens
    const passIds = oldPasses.map(p => p.id)

    if (passIds.length > 0) {
      const [deleteResult] = await sequelize.query(`
        DELETE FROM device_registrations
        WHERE wallet_pass_id IN (:passIds)
        RETURNING id;
      `, {
        replacements: { passIds }
      })

      console.log(`✅ Deleted ${deleteResult.length} device registrations`)
    }

    // 4. Summary
    console.log('')
    console.log('📊 Migration Summary:')
    console.log(`   - Apple Wallet passes deleted: ${updateResult.length}`)
    console.log(`   - Device registrations removed: ${passIds.length > 0 ? deleteResult.length : 0}`)
    console.log(`   - Status: All old passes marked as 'deleted'`)
    console.log('')
    console.log('ℹ️  Impact on users:')
    console.log('   - Old passes on devices will appear as expired/deleted')
    console.log('   - Users can get new passes by scanning QR code again')
    console.log('   - New passes will have correct authentication tokens')
    console.log('   - No more "Invalid authentication token" errors')
    console.log('')
    console.log('🎉 Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

export async function down() {
  const { sequelize } = await import('../config/database.js')

  try {
    console.log('🔧 Rolling back migration: Restore old Apple Wallet passes...')

    // Cutoff date (same as up())
    const cutoffDate = '2025-10-21 16:00:00+00'

    // Restore passes to active status
    // Note: Device registrations were deleted, so they won't be restored
    const [restoreResult] = await sequelize.query(`
      UPDATE wallet_passes
      SET pass_status = 'active',
          updated_at = NOW()
      WHERE wallet_type = 'apple'
      AND pass_status = 'deleted'
      AND created_at < :cutoffDate
      RETURNING id;
    `, {
      replacements: { cutoffDate }
    })

    console.log(`✅ Restored ${restoreResult.length} Apple Wallet passes to active status`)
    console.log('⚠️  Note: Device registrations were NOT restored (they were deleted)')
    console.log('⚠️  Users will need to re-add passes to their devices')
    console.log('🎉 Rollback completed successfully!')

  } catch (error) {
    console.error('❌ Rollback failed:', error)
    throw error
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const { default: sequelize } = await import('../config/database.js')
    
    try {
      await sequelize.authenticate()
      console.log('✅ Database connection established')
      
      if (process.argv[2] === 'down') {
        await down()
      } else {
        await up()
      }
      
      await sequelize.close()
      console.log('✅ Database connection closed')
      process.exit(0)
    } catch (error) {
      console.error('❌ Migration script failed:', error)
      await sequelize.close()
      console.log('✅ Database connection closed')
      process.exit(1)
    }
  })()
}

export default { up, down }
