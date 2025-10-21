/**
 * Run the Apple Wallet Pass Cleanup Migration
 *
 * This script executes the cleanup migration to remove old Apple Wallet passes
 * with mismatched authentication tokens.
 *
 * Usage:
 *   node backend/migrations/run-cleanup-migration.js
 */

import { up } from './20250121-cleanup-old-apple-wallet-passes.js'

console.log('🚀 Running Apple Wallet Pass Cleanup Migration...')
console.log('=' .repeat(60))
console.log('')

try {
  await up()
  console.log('')
  console.log('=' .repeat(60))
  console.log('✅ Migration completed successfully!')
  process.exit(0)
} catch (error) {
  console.error('')
  console.error('=' .repeat(60))
  console.error('❌ Migration failed!')
  console.error('Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
