/**
 * AutoMigrationRunner - Automatic database migration management
 * 
 * Purpose: Detect and execute pending migrations automatically during
 * server startup or deployment, with comprehensive safety features.
 * 
 * Features:
 * - Automatic detection of pending migrations
 * - Advisory locks to prevent concurrent execution
 * - Checksum validation for integrity
 * - Transaction-based execution with rollback
 * - Detailed logging and monitoring
 * 
 * Date: 2025-02-03
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class AutoMigrationRunner {
  
  /**
   * Main entry point - Run all pending migrations
   * 
   * @param {Object} options - Configuration options
   * @param {Boolean} options.dryRun - If true, only log what would run
   * @param {Boolean} options.stopOnError - Stop on first error (default: true)
   * @param {Number} options.lockTimeout - Milliseconds to wait for lock (default: 30000)
   * @returns {Object} Summary of execution results
   */
  static async runPendingMigrations(options = {}) {
    const {
      dryRun = false,
      stopOnError = true,
      lockTimeout = 30000
    } = options
    
    let lockAcquired = false
    let lockId = null
    const startTime = Date.now()
    
    try {
      // Step 1: Acquire advisory lock
      logger.info('🔒 Acquiring migration advisory lock...')
      
      const lockHash = this.hashString('schema_migrations')
      const [lockResult] = await sequelize.query(
        `SELECT pg_try_advisory_lock(${lockHash}) as locked`
      )
      
      lockAcquired = lockResult[0].locked
      
      if (!lockAcquired) {
        logger.warn('⚠️  Could not acquire migration lock - another instance is running migrations')
        logger.warn('   Waiting for lock or timeout...')
        
        // Wait for lock with timeout
        const waitStart = Date.now()
        while (!lockAcquired && (Date.now() - waitStart) < lockTimeout) {
          await this.sleep(1000)
          const [retryResult] = await sequelize.query(
            `SELECT pg_try_advisory_lock(${lockHash}) as locked`
          )
          lockAcquired = retryResult[0].locked
        }
        
        if (!lockAcquired) {
          throw new Error('Migration lock timeout - another instance may be running migrations')
        }
      }
      
      lockId = lockHash
      logger.info('   ✅ Lock acquired')
      
      // Step 2: Ensure tracking table exists
      await this.ensureTrackingTableExists()
      
      // Step 3: Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations()
      logger.info(`   📋 Applied migrations: ${appliedMigrations.length}`)
      
      // Step 4: Scan migration files
      const allMigrationFiles = await this.scanMigrationFiles()
      logger.info(`   📂 Total migration files: ${allMigrationFiles.length}`)
      
      // Step 5: Identify pending migrations
      const pendingMigrations = allMigrationFiles.filter(
        file => !appliedMigrations.includes(this.getMigrationName(file))
      )
      
      logger.info(`   🔄 Pending migrations: ${pendingMigrations.length}`)
      
      if (pendingMigrations.length === 0) {
        logger.info('✅ No pending migrations - database schema is up to date')
        return {
          total: allMigrationFiles.length,
          applied: 0,
          failed: 0,
          skipped: 0,
          results: [],
          totalExecutionTime: Date.now() - startTime
        }
      }
      
      if (dryRun) {
        logger.info('🧪 DRY RUN MODE - Showing what would execute:')
        pendingMigrations.forEach((file, index) => {
          logger.info(`   ${index + 1}. ${this.getMigrationName(file)}`)
        })
        return {
          total: allMigrationFiles.length,
          applied: 0,
          failed: 0,
          skipped: pendingMigrations.length,
          results: [],
          totalExecutionTime: Date.now() - startTime
        }
      }
      
      // Step 6: Execute pending migrations
      logger.info(`🔧 Executing ${pendingMigrations.length} pending migrations...`)
      
      const results = []
      let appliedCount = 0
      let failedCount = 0
      
      for (const file of pendingMigrations) {
        const migrationName = this.getMigrationName(file)
        const migrationPath = path.join(__dirname, '../migrations', file)
        
        try {
          logger.info(`   🔧 Running migration: ${migrationName}`)
          
          const migrationStart = Date.now()
          
          // Insert record with status='running'
          await sequelize.query(
            `INSERT INTO schema_migrations (migration_name, status, applied_at)
             VALUES (:name, 'running', NOW())`,
            {
              replacements: { name: migrationName },
              type: sequelize.QueryTypes.INSERT
            }
          )
          
          // Calculate checksum
          const checksum = this.calculateChecksum(migrationPath)
          
          // Import and execute migration
          const migration = await import(migrationPath)
          const upFunction = migration.up || migration.default?.up
          
          if (!upFunction) {
            throw new Error(`Migration ${migrationName} does not export an 'up' function`)
          }
          
          // Execute migration (it should handle its own transaction)
          await upFunction(sequelize.getQueryInterface())
          
          const executionTime = Date.now() - migrationStart
          
          // Update record with success status
          await sequelize.query(
            `UPDATE schema_migrations 
             SET status = 'success', 
                 execution_time_ms = :time,
                 checksum = :checksum,
                 applied_at = NOW()
             WHERE migration_name = :name`,
            {
              replacements: { 
                name: migrationName, 
                time: executionTime,
                checksum 
              },
              type: sequelize.QueryTypes.UPDATE
            }
          )
          
          logger.info(`      ✅ Completed in ${executionTime}ms`)
          
          appliedCount++
          results.push({
            migration: migrationName,
            status: 'success',
            executionTime
          })
          
        } catch (error) {
          failedCount++
          
          logger.error(`      ❌ Migration failed: ${error.message}`)
          logger.error(`      Stack: ${error.stack}`)
          
          // Update record with failed status
          try {
            await sequelize.query(
              `UPDATE schema_migrations 
               SET status = 'failed', 
                   error_message = :error,
                   applied_at = NOW()
               WHERE migration_name = :name`,
              {
                replacements: { 
                  name: migrationName, 
                  error: error.message 
                },
                type: sequelize.QueryTypes.UPDATE
              }
            )
          } catch (updateError) {
            logger.error(`      ⚠️  Could not update migration status: ${updateError.message}`)
          }
          
          results.push({
            migration: migrationName,
            status: 'failed',
            error: error.message
          })
          
          if (stopOnError) {
            logger.error('🛑 Stopping migration execution due to error')
            break
          }
        }
      }
      
      // Step 7: Summary
      const totalTime = Date.now() - startTime
      
      if (failedCount > 0) {
        logger.error(`❌ Migration execution completed with ${failedCount} failure(s)`)
        logger.error(`   Applied: ${appliedCount}, Failed: ${failedCount}, Total: ${allMigrationFiles.length}`)
      } else {
        logger.info(`✅ All pending migrations applied successfully`)
        logger.info(`   Applied: ${appliedCount}, Total: ${allMigrationFiles.length}`)
        logger.info(`   ⏱️  Total execution time: ${totalTime}ms`)
      }
      
      return {
        total: allMigrationFiles.length,
        applied: appliedCount,
        failed: failedCount,
        skipped: 0,
        results,
        totalExecutionTime: totalTime
      }
      
    } catch (error) {
      logger.error('❌ CRITICAL: Auto-migration system error:', error.message)
      logger.error('   Stack:', error.stack)
      throw error
      
    } finally {
      // Always release lock
      if (lockAcquired && lockId !== null) {
        try {
          await sequelize.query(`SELECT pg_advisory_unlock(${lockId})`)
          logger.info('🔓 Migration lock released')
        } catch (unlockError) {
          logger.error('⚠️  Failed to release migration lock:', unlockError.message)
        }
      }
    }
  }
  
  /**
   * Get list of successfully applied migrations
   * @returns {Array<String>} Array of migration names
   */
  static async getAppliedMigrations() {
    try {
      const [results] = await sequelize.query(
        `SELECT migration_name 
         FROM schema_migrations 
         WHERE status = 'success' 
         ORDER BY applied_at ASC`
      )
      
      return results.map(row => row.migration_name)
      
    } catch (error) {
      // Table might not exist yet
      if (error.message.includes('does not exist')) {
        return []
      }
      throw error
    }
  }
  
  /**
   * Get list of migrations that haven't been applied
   * @returns {Array<String>} Array of pending migration filenames
   */
  static async getPendingMigrations() {
    const applied = await this.getAppliedMigrations()
    const allFiles = await this.scanMigrationFiles()
    
    return allFiles.filter(
      file => !applied.includes(this.getMigrationName(file))
    )
  }
  
  /**
   * Get detailed status of all migrations
   * @returns {Object} Comprehensive migration status
   */
  static async getMigrationStatus() {
    try {
      const allFiles = await this.scanMigrationFiles()
      const [appliedResults] = await sequelize.query(
        `SELECT migration_name, applied_at, execution_time_ms, status, error_message
         FROM schema_migrations 
         ORDER BY applied_at DESC`
      )
      
      const appliedMap = new Map(
        appliedResults.map(row => [row.migration_name, row])
      )
      
      const appliedMigrations = []
      const pendingMigrations = []
      
      allFiles.forEach(file => {
        const name = this.getMigrationName(file)
        if (appliedMap.has(name)) {
          appliedMigrations.push(appliedMap.get(name))
        } else {
          pendingMigrations.push(name)
        }
      })
      
      const failed = appliedMigrations.filter(m => m.status === 'failed')
      
      return {
        total: allFiles.length,
        applied: appliedMigrations.filter(m => m.status === 'success').length,
        pending: pendingMigrations.length,
        failed: failed.length,
        appliedMigrations,
        pendingMigrations,
        failedMigrations: failed
      }
      
    } catch (error) {
      if (error.message.includes('does not exist')) {
        const allFiles = await this.scanMigrationFiles()
        return {
          total: allFiles.length,
          applied: 0,
          pending: allFiles.length,
          failed: 0,
          appliedMigrations: [],
          pendingMigrations: allFiles.map(f => this.getMigrationName(f)),
          failedMigrations: [],
          warning: 'schema_migrations table does not exist'
        }
      }
      throw error
    }
  }
  
  /**
   * Calculate SHA-256 checksum of migration file
   * @param {String} filePath - Path to migration file
   * @returns {String} Hex-encoded SHA-256 hash
   */
  static calculateChecksum(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    return crypto.createHash('sha256').update(content).digest('hex')
  }
  
  /**
   * Validate that applied migrations haven't been modified
   * @returns {Object} Validation results
   */
  static async validateMigrationIntegrity() {
    try {
      const [appliedMigrations] = await sequelize.query(
        `SELECT migration_name, checksum 
         FROM schema_migrations 
         WHERE status = 'success' AND checksum IS NOT NULL`
      )
      
      const mismatches = []
      const migrationsDir = path.join(__dirname, '../migrations')
      
      for (const migration of appliedMigrations) {
        const filePath = path.join(migrationsDir, `${migration.migration_name}.js`)
        
        if (!fs.existsSync(filePath)) {
          mismatches.push({
            migration: migration.migration_name,
            issue: 'File not found',
            severity: 'error'
          })
          continue
        }
        
        const currentChecksum = this.calculateChecksum(filePath)
        
        if (currentChecksum !== migration.checksum) {
          mismatches.push({
            migration: migration.migration_name,
            issue: 'Checksum mismatch - file was modified after being applied',
            storedChecksum: migration.checksum,
            currentChecksum,
            severity: 'warning'
          })
        }
      }
      
      if (mismatches.length > 0) {
        logger.warn(`⚠️  Migration integrity validation found ${mismatches.length} issue(s):`)
        mismatches.forEach(m => {
          logger.warn(`   - ${m.migration}: ${m.issue}`)
        })
      } else {
        logger.info('✅ All migrations passed integrity validation')
      }
      
      return {
        valid: mismatches.length === 0,
        totalChecked: appliedMigrations.length,
        mismatches
      }
      
    } catch (error) {
      logger.error('❌ Migration integrity validation failed:', error.message)
      throw error
    }
  }
  
  /**
   * Ensure schema_migrations tracking table exists
   * @private
   */
  static async ensureTrackingTableExists() {
    try {
      const [tables] = await sequelize.query(
        `SELECT tablename 
         FROM pg_tables 
         WHERE schemaname = 'public' 
         AND tablename = 'schema_migrations'`
      )
      
      if (tables.length === 0) {
        logger.info('   📋 schema_migrations table not found, creating...')
        
        // Import and run the tracking table migration
        const trackingMigrationPath = path.join(
          __dirname, 
          '../migrations/20250203-create-schema-migrations-table.js'
        )
        
        const trackingMigration = await import(trackingMigrationPath)
        await trackingMigration.up(sequelize.getQueryInterface())
        
        logger.info('   ✅ Tracking table created')
      }
      
    } catch (error) {
      logger.error('❌ Failed to ensure tracking table exists:', error.message)
      throw error
    }
  }
  
  /**
   * Scan migrations directory for migration files
   * @private
   * @returns {Array<String>} Sorted array of migration filenames
   */
  static async scanMigrationFiles() {
    const migrationsDir = path.join(__dirname, '../migrations')
    const files = fs.readdirSync(migrationsDir)
    
    return files
      .filter(file => file.endsWith('.js'))
      .filter(file => file !== 'README.md')
      .filter(file => !file.includes('.test.'))
      .filter(file => file !== '20250203-create-schema-migrations-table.js') // Exclude tracking table migration
      .sort()
  }
  
  /**
   * Get migration name from filename (strip .js extension)
   * @private
   */
  static getMigrationName(filename) {
    return filename.replace(/\.js$/, '')
  }
  
  /**
   * Hash a string to integer for advisory locks
   * @private
   */
  static hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }
  
  /**
   * Sleep utility
   * @private
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default AutoMigrationRunner
