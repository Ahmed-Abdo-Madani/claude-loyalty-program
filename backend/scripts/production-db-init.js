#!/usr/bin/env node

/**
 * 🚀 PRODUCTION DATABASE INITIALIZATION SCRIPT
 * 
 * This script initializes the production database with all the latest changes
 * since the last deployment. It includes:
 * 
 * 1. Location metadata columns (district, location_id, location_type, location_hierarchy)
 * 2. Database schema validation
 * 3. Data integrity checks
 * 4. Location service verification
 * 5. Performance monitoring
 * 
 * Usage:
 *   NODE_ENV=production node backend/scripts/production-db-init.js
 *   
 * Prerequisites:
 *   - PostgreSQL database accessible
 *   - Environment variables set (DB_HOST, DB_USER, DB_PASSWORD, etc.)
 *   - Location data files present (regions_lite.json, cities_lite.json, districts_lite.json)
 * 
 * Created: October 8, 2025
 * Author: AI Assistant (Claude)
 */

import { sequelize } from '../config/database.js'
import { syncDatabase } from '../models/index.js'
import LocationService from '../services/LocationService.js'
import logger from '../config/logger.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

class ProductionDatabaseInitializer {
  constructor() {
    this.startTime = Date.now()
    this.results = {
      steps: [],
      errors: [],
      warnings: [],
      performance: {}
    }
  }

  /**
   * Log step with timing
   */
  logStep(step, status, details = null) {
    const timestamp = new Date().toISOString()
    const elapsed = Date.now() - this.startTime
    
    const stepInfo = {
      step,
      status,
      timestamp,
      elapsed,
      details
    }
    
    this.results.steps.push(stepInfo)
    
    const statusIcon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : status === 'error' ? '❌' : '🔄'
    logger.info(`${statusIcon} ${step} (${elapsed}ms)`, details)
  }

  /**
   * Check environment and prerequisites
   */
  async checkPrerequisites() {
    this.logStep('Checking Prerequisites', 'running')
    
    try {
      // Check Node.js version
      const nodeVersion = process.version
      if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20') && !nodeVersion.startsWith('v22')) {
        this.results.warnings.push(`Node.js version ${nodeVersion} may not be supported. Recommended: v18+ or v20+`)
      }
      
      // Check environment variables
      const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
      const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
      
      if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
      }
      
      // Check location data files
      const dataPath = path.join(__dirname, '../data')
      const requiredFiles = ['regions_lite.json', 'cities_lite.json', 'districts_lite.json']
      
      for (const file of requiredFiles) {
        const filePath = path.join(dataPath, file)
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required location data file missing: ${file}`)
        }
        
        // Check file size
        const stats = fs.statSync(filePath)
        if (stats.size === 0) {
          throw new Error(`Location data file is empty: ${file}`)
        }
        
        this.logStep(`Verified location data file: ${file}`, 'success', { 
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          lastModified: stats.mtime.toISOString()
        })
      }
      
      this.logStep('Prerequisites Check', 'success', {
        nodeVersion,
        environment: process.env.NODE_ENV || 'development',
        database: `${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`
      })
      
    } catch (error) {
      this.results.errors.push(error.message)
      this.logStep('Prerequisites Check', 'error', { error: error.message })
      throw error
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    this.logStep('Testing Database Connection', 'running')
    
    try {
      await sequelize.authenticate()
      
      // Get database info
      const [dbInfo] = await sequelize.query(`
        SELECT 
          version() as version,
          current_database() as database,
          current_user as user,
          inet_server_addr() as host,
          inet_server_port() as port
      `)
      
      this.logStep('Database Connection', 'success', dbInfo[0])
      
    } catch (error) {
      this.results.errors.push(`Database connection failed: ${error.message}`)
      this.logStep('Database Connection', 'error', { error: error.message })
      throw error
    }
  }

  /**
   * Check if column exists in table
   */
  async columnExists(table, column) {
    const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = :table
        AND column_name = :column
        AND table_schema = 'public'
    `
    const [results] = await sequelize.query(query, {
      replacements: { table, column }
    })
    return results.length > 0
  }

  /**
   * Add location metadata columns
   */
  async addLocationColumns() {
    this.logStep('Adding Location Metadata Columns', 'running')
    
    try {
      const businessTable = 'businesses'
      const branchTable = 'branches'
      
      // Define columns to add
      const businessColumns = [
        { name: 'district', type: 'VARCHAR(100)', description: 'Business district name' },
        { name: 'location_id', type: 'VARCHAR(50)', description: 'Location service ID reference' },
        { name: 'location_type', type: "VARCHAR(20)", description: 'Location type (city, district, region)' },
        { name: 'location_hierarchy', type: 'VARCHAR(500)', description: 'Full location hierarchy string' }
      ]

      const branchColumns = [
        { name: 'region', type: 'VARCHAR(100)', description: 'Branch region name' },
        { name: 'district', type: 'VARCHAR(100)', description: 'Branch district name' },
        { name: 'location_id', type: 'VARCHAR(50)', description: 'Location service ID reference' },
        { name: 'location_type', type: "VARCHAR(20)", description: 'Location type (city, district, region)' },
        { name: 'location_hierarchy', type: 'VARCHAR(500)', description: 'Full location hierarchy string' }
      ]
      
      // Add business columns
      let businessUpdated = 0
      for (const col of businessColumns) {
        const exists = await this.columnExists(businessTable, col.name)
        if (!exists) {
          await sequelize.query(`ALTER TABLE "${businessTable}" ADD COLUMN "${col.name}" ${col.type}`)
          this.logStep(`Added column ${col.name} to ${businessTable}`, 'success', { 
            type: col.type,
            description: col.description
          })
          businessUpdated++
        } else {
          this.logStep(`Column ${col.name} already exists in ${businessTable}`, 'success')
        }
      }
      
      // Add branch columns
      let branchUpdated = 0
      for (const col of branchColumns) {
        const exists = await this.columnExists(branchTable, col.name)
        if (!exists) {
          await sequelize.query(`ALTER TABLE "${branchTable}" ADD COLUMN "${col.name}" ${col.type}`)
          this.logStep(`Added column ${col.name} to ${branchTable}`, 'success', { 
            type: col.type,
            description: col.description
          })
          branchUpdated++
        } else {
          this.logStep(`Column ${col.name} already exists in ${branchTable}`, 'success')
        }
      }
      
      this.logStep('Location Columns Migration', 'success', {
        businessColumnsAdded: businessUpdated,
        branchColumnsAdded: branchUpdated,
        totalColumnsAdded: businessUpdated + branchUpdated
      })
      
    } catch (error) {
      this.results.errors.push(`Location columns migration failed: ${error.message}`)
      this.logStep('Location Columns Migration', 'error', { error: error.message })
      throw error
    }
  }

  /**
   * Verify database schema
   */
  async verifySchema() {
    this.logStep('Verifying Database Schema', 'running')
    
    try {
      // Sync models with database (non-destructive)
      await syncDatabase(false)
      
      // Check table existence
      const [tables] = await sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      
      const tableNames = tables.map(t => t.table_name)
      const expectedTables = ['businesses', 'branches', 'offers', 'customer_progress']
      const missingTables = expectedTables.filter(table => !tableNames.includes(table))
      
      if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(', ')}`)
      }
      
      // Check column counts
      const columnCounts = {}
      for (const table of expectedTables) {
        const [columns] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_name = :table
            AND table_schema = 'public'
        `, { replacements: { table } })
        
        columnCounts[table] = columns[0].count
      }
      
      this.logStep('Database Schema Verification', 'success', {
        tablesFound: tableNames.length,
        expectedTables: expectedTables.length,
        columnCounts
      })
      
    } catch (error) {
      this.results.errors.push(`Schema verification failed: ${error.message}`)
      this.logStep('Database Schema Verification', 'error', { error: error.message })
      throw error
    }
  }

  /**
   * Initialize and test location service
   */
  async initializeLocationService() {
    this.logStep('Initializing Location Service', 'running')
    
    try {
      const serviceStartTime = Date.now()
      
      // Initialize location service
      await LocationService.initialize()
      
      // Test region loading
      const regions = await LocationService.loadRegions()
      
      // Test search functionality
      const searchResults = await LocationService.searchAll('الرياض', 'ar', 5)
      
      // Test district loading for a known city
      const districts = await LocationService.getDistrictsByCity(3) // Riyadh city ID
      
      const serviceTime = Date.now() - serviceStartTime
      
      this.logStep('Location Service Initialization', 'success', {
        regionsLoaded: regions.length,
        searchResultsCount: searchResults.length,
        districtsFound: districts.length,
        initializationTime: serviceTime
      })
      
      // Store performance metrics
      this.results.performance.locationService = {
        initializationTime: serviceTime,
        regionsCount: regions.length,
        searchResponseTime: serviceTime
      }
      
    } catch (error) {
      this.results.errors.push(`Location service initialization failed: ${error.message}`)
      this.logStep('Location Service Initialization', 'error', { error: error.message })
      throw error
    }
  }

  /**
   * Run data integrity checks
   */
  async runDataIntegrityChecks() {
    this.logStep('Running Data Integrity Checks', 'running')
    
    try {
      // Check for businesses with incomplete location data
      const [businessesWithoutLocation] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM businesses
        WHERE region IS NULL OR city IS NULL
      `)
      
      // Check for orphaned customer progress records
      const [orphanedProgress] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM customer_progress cp
        LEFT JOIN businesses b ON cp.business_id = b.public_id
        WHERE b.public_id IS NULL
      `)
      
      // Check for offers without businesses
      const [orphanedOffers] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM offers o
        LEFT JOIN businesses b ON o.business_id = b.public_id
        WHERE b.public_id IS NULL
      `)
      
      const integrityIssues = {
        businessesWithoutLocation: businessesWithoutLocation[0].count,
        orphanedProgress: orphanedProgress[0].count,
        orphanedOffers: orphanedOffers[0].count
      }
      
      let status = 'success'
      if (integrityIssues.orphanedProgress > 0 || integrityIssues.orphanedOffers > 0) {
        status = 'warning'
        this.results.warnings.push('Found orphaned records that may need cleanup')
      }
      
      if (integrityIssues.businessesWithoutLocation > 0) {
        this.results.warnings.push(`${integrityIssues.businessesWithoutLocation} businesses have incomplete location data`)
      }
      
      this.logStep('Data Integrity Checks', status, integrityIssues)
      
    } catch (error) {
      this.results.errors.push(`Data integrity checks failed: ${error.message}`)
      this.logStep('Data Integrity Checks', 'error', { error: error.message })
      throw error
    }
  }

  /**
   * Create database indexes for performance
   */
  async createPerformanceIndexes() {
    this.logStep('Creating Performance Indexes', 'running')
    
    try {
      const indexes = [
        {
          name: 'idx_businesses_region_city',
          table: 'businesses',
          columns: ['region', 'city'],
          description: 'Location-based business queries'
        },
        {
          name: 'idx_businesses_location_hierarchy',
          table: 'businesses', 
          columns: ['location_hierarchy'],
          description: 'Hierarchy-based searches'
        },
        {
          name: 'idx_branches_location',
          table: 'branches',
          columns: ['region', 'city', 'district'],
          description: 'Branch location queries'
        },
        {
          name: 'idx_customer_progress_business_lookup',
          table: 'customer_progress',
          columns: ['business_id', 'offer_id'],
          description: 'Customer progress lookups'
        }
      ]
      
      let indexesCreated = 0
      for (const index of indexes) {
        try {
          // Check if index exists
          const [existingIndex] = await sequelize.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = :table AND indexname = :name
          `, { replacements: { table: index.table, name: index.name } })
          
          if (existingIndex.length === 0) {
            const columnList = index.columns.join(', ')
            await sequelize.query(`
              CREATE INDEX CONCURRENTLY "${index.name}" 
              ON "${index.table}" (${columnList})
            `)
            
            this.logStep(`Created index ${index.name}`, 'success', {
              table: index.table,
              columns: index.columns,
              description: index.description
            })
            indexesCreated++
          } else {
            this.logStep(`Index ${index.name} already exists`, 'success')
          }
        } catch (indexError) {
          this.results.warnings.push(`Failed to create index ${index.name}: ${indexError.message}`)
          this.logStep(`Index ${index.name}`, 'warning', { error: indexError.message })
        }
      }
      
      this.logStep('Performance Indexes', 'success', { 
        indexesCreated,
        totalIndexes: indexes.length
      })
      
    } catch (error) {
      this.results.errors.push(`Index creation failed: ${error.message}`)
      this.logStep('Performance Indexes', 'error', { error: error.message })
      // Don't throw - indexes are optional for basic functionality
    }
  }

  /**
   * Generate initialization report
   */
  generateReport() {
    const totalTime = Date.now() - this.startTime
    const successfulSteps = this.results.steps.filter(s => s.status === 'success').length
    const totalSteps = this.results.steps.length
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: `${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`,
      execution: {
        totalTimeMs: totalTime,
        totalTimeSeconds: (totalTime / 1000).toFixed(2),
        stepsCompleted: `${successfulSteps}/${totalSteps}`,
        successRate: `${((successfulSteps / totalSteps) * 100).toFixed(1)}%`
      },
      results: this.results,
      status: this.results.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS'
    }
    
    return report
  }

  /**
   * Main initialization routine
   */
  async run() {
    logger.info('🚀 Starting Production Database Initialization...')
    
    try {
      await this.checkPrerequisites()
      await this.testDatabaseConnection()
      await this.addLocationColumns()
      await this.verifySchema()
      await this.initializeLocationService()
      await this.runDataIntegrityChecks()
      await this.createPerformanceIndexes()
      
      const report = this.generateReport()
      
      // Write report to file
      const reportPath = path.join(__dirname, '../../production-db-init-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      
      logger.info('✅ Production Database Initialization Complete!', {
        totalTime: report.execution.totalTimeSeconds + 's',
        status: report.status,
        reportPath
      })
      
      if (report.results.warnings.length > 0) {
        logger.warn(`⚠️ ${report.results.warnings.length} warnings during initialization:`)
        report.results.warnings.forEach(warning => logger.warn(`   - ${warning}`))
      }
      
      return report
      
    } catch (error) {
      const report = this.generateReport()
      report.status = 'FAILED'
      report.fatalError = error.message
      
      logger.error('❌ Production Database Initialization Failed!', {
        error: error.message,
        totalErrors: report.results.errors.length
      })
      
      // Write failure report
      const reportPath = path.join(__dirname, '../../production-db-init-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      
      throw error
    } finally {
      // Close database connection
      try {
        await sequelize.close()
      } catch (closeError) {
        logger.warn('Warning: Could not close database connection:', closeError.message)
      }
    }
  }
}

// Run the initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const initializer = new ProductionDatabaseInitializer()
  
  initializer.run()
    .then(report => {
      console.log('\n🎉 Initialization completed successfully!')
      console.log(`📊 Report saved to: production-db-init-report.json`)
      console.log(`⏱️  Total time: ${report.execution.totalTimeSeconds}s`)
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Initialization failed:', error.message)
      console.log('📊 Failure report saved to: production-db-init-report.json')
      process.exit(1)
    })
}

export default ProductionDatabaseInitializer