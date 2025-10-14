/**
 * Migration: Add Wallet Pass Notification Tracking Fields
 *
 * Adds fields to wallet_passes table for tracking push notification history and rate limiting
 * Supports Google Wallet's 3-per-day notification limit
 *
 * New fields:
 * - notification_count: Number of notifications sent today (resets daily)
 * - last_notification_date: Last time a notification was sent
 * - notification_history: JSONB array of recent notifications (last 30 days)
 */

import { DataTypes } from 'sequelize'

export async function up() {
  const { sequelize } = await import('../config/database.js')

  try {
    console.log('🔧 Starting migration: Add wallet pass notification tracking fields...')

    // Check if columns already exist
    const [existingColumns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'wallet_passes'
      AND column_name IN ('notification_count', 'last_notification_date', 'notification_history');
    `)

    if (existingColumns.length > 0) {
      console.log('⚠️ Some notification tracking columns already exist:', existingColumns.map(c => c.column_name))
      console.log('✅ Skipping migration (columns already exist)')
      return
    }

    // Add notification tracking fields
    await sequelize.query(`
      ALTER TABLE wallet_passes
      ADD COLUMN notification_count INTEGER DEFAULT 0,
      ADD COLUMN last_notification_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN notification_history JSONB DEFAULT '[]'::jsonb;
    `)

    console.log('✅ Added notification tracking columns')

    // Add comments for documentation
    await sequelize.query(`
      COMMENT ON COLUMN wallet_passes.notification_count IS 'Number of notifications sent today (resets daily)';
      COMMENT ON COLUMN wallet_passes.last_notification_date IS 'Last time a notification was sent';
      COMMENT ON COLUMN wallet_passes.notification_history IS 'History of notifications sent (last 30 days)';
    `)

    console.log('✅ Added column comments')

    // Create index for efficient rate limit queries
    await sequelize.query(`
      CREATE INDEX idx_wallet_passes_notification_date
      ON wallet_passes (last_notification_date)
      WHERE last_notification_date IS NOT NULL;
    `)

    console.log('✅ Created notification date index')

    console.log('🎉 Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

export async function down() {
  const { sequelize } = await import('../config/database.js')

  try {
    console.log('🔧 Rolling back migration: Remove wallet pass notification tracking fields...')

    // Drop index
    await sequelize.query(`
      DROP INDEX IF EXISTS idx_wallet_passes_notification_date;
    `)

    console.log('✅ Dropped notification date index')

    // Remove columns
    await sequelize.query(`
      ALTER TABLE wallet_passes
      DROP COLUMN IF EXISTS notification_count,
      DROP COLUMN IF EXISTS last_notification_date,
      DROP COLUMN IF EXISTS notification_history;
    `)

    console.log('✅ Removed notification tracking columns')
    console.log('🎉 Rollback completed successfully!')

  } catch (error) {
    console.error('❌ Rollback failed:', error)
    throw error
  }
}

export default { up, down }
