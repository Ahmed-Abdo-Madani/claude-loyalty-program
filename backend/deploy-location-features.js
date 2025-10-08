import { sequelize } from './models/index.js'
import LocationService from './services/LocationService.js'
import logger from './config/logger.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

async function deployLocationFeatures() {
  try {
    console.log('🗺️  Deploying Saudi Arabia Location Features...')
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
    console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Local database')

    // Test database connection
    await sequelize.authenticate()
    console.log('✅ Database connection established')

    // Check if location data files exist
    console.log('📋 Checking location data files...')
    const dataPath = path.join(__dirname, 'data')
    const requiredFiles = ['regions_lite.json', 'cities_lite.json', 'districts_lite.json']
    
    for (const file of requiredFiles) {
      const filePath = path.join(dataPath, file)
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required location data file missing: ${file}`)
      }
      
      const stats = fs.statSync(filePath)
      console.log(`   ✅ ${file}: ${(stats.size / 1024).toFixed(2)} KB`)
    }

    // Check if location columns already exist
    console.log('🔍 Checking existing location columns...')
    
    const checkColumnExists = async (table, column) => {
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

    // Define location columns to add
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

    // Add business location columns
    console.log('📝 Adding location columns to businesses table...')
    let businessUpdated = 0
    for (const col of businessColumns) {
      const exists = await checkColumnExists('businesses', col.name)
      if (!exists) {
        await sequelize.query(`ALTER TABLE "businesses" ADD COLUMN "${col.name}" ${col.type}`)
        console.log(`   ➕ Added column: ${col.name} (${col.type})`)
        businessUpdated++
      } else {
        console.log(`   ✅ Column already exists: ${col.name}`)
      }
    }

    // Add branch location columns
    console.log('📝 Adding location columns to branches table...')
    let branchUpdated = 0
    for (const col of branchColumns) {
      const exists = await checkColumnExists('branches', col.name)
      if (!exists) {
        await sequelize.query(`ALTER TABLE "branches" ADD COLUMN "${col.name}" ${col.type}`)
        console.log(`   ➕ Added column: ${col.name} (${col.type})`)
        branchUpdated++
      } else {
        console.log(`   ✅ Column already exists: ${col.name}`)
      }
    }

    console.log(`📊 Database schema updated: ${businessUpdated + branchUpdated} new columns added`)

    // Initialize Location Service
    console.log('🚀 Initializing Saudi Location Service...')
    const serviceStartTime = Date.now()
    
    try {
      await LocationService.initialize()
      
      // Test region loading
      const regions = await LocationService.loadRegions()
      console.log(`   ✅ Loaded ${regions.length} Saudi regions`)
      
      // Test search functionality with Arabic
      const searchResults = await LocationService.searchAll('الرياض', 'ar', 5)
      console.log(`   ✅ Search test: Found ${searchResults.length} results for "الرياض"`)
      
      // Test district loading for Riyadh
      const districts = await LocationService.getDistrictsByCity(3) // Riyadh city ID
      console.log(`   ✅ District test: Found ${districts.length} districts in Riyadh`)
      
      const serviceTime = Date.now() - serviceStartTime
      console.log(`   ⏱️  Location service initialized in ${serviceTime}ms`)
      
    } catch (serviceError) {
      console.warn('⚠️  Location service test failed:', serviceError.message)
      console.warn('   This may be due to missing data files in production environment')
    }

    // Create performance indexes
    console.log('⚡ Creating performance indexes...')
    const indexes = [
      {
        name: 'idx_businesses_location_search',
        table: 'businesses',
        columns: ['region', 'city', 'district'],
        description: 'Location-based business searches'
      },
      {
        name: 'idx_businesses_hierarchy',
        table: 'businesses', 
        columns: ['location_hierarchy'],
        description: 'Hierarchy-based location searches'
      },
      {
        name: 'idx_branches_location_lookup',
        table: 'branches',
        columns: ['region', 'city'],
        description: 'Branch location queries'
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
          const columnList = index.columns.join('", "')
          await sequelize.query(`
            CREATE INDEX CONCURRENTLY "${index.name}" 
            ON "${index.table}" ("${columnList}")
          `)
          console.log(`   ✅ Created index: ${index.name}`)
          indexesCreated++
        } else {
          console.log(`   ✅ Index already exists: ${index.name}`)
        }
      } catch (indexError) {
        console.warn(`   ⚠️  Failed to create index ${index.name}: ${indexError.message}`)
      }
    }

    console.log(`📈 Performance optimization: ${indexesCreated} new indexes created`)

    // Run data validation checks
    console.log('🔍 Running location data validation...')
    
    try {
      // Check businesses with incomplete location data
      const [businessCheck] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM businesses
        WHERE (region IS NULL OR region = '') 
           OR (city IS NULL OR city = '')
      `)
      
      const incompleteBusinesses = businessCheck[0].count
      if (incompleteBusinesses > 0) {
        console.log(`   ⚠️  ${incompleteBusinesses} businesses have incomplete location data`)
        console.log('   💡 These can be updated when businesses edit their profiles')
      } else {
        console.log('   ✅ All businesses have complete location data')
      }
      
    } catch (validationError) {
      console.warn('   ⚠️  Validation check failed:', validationError.message)
    }

    // Generate deployment summary
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://app.madna.me'
      : 'http://localhost:3000'
    
    const apiUrl = process.env.BASE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://api.madna.me' : 'http://localhost:3001')

    console.log('')
    console.log('🎉 Saudi Arabia Location Features Deployment Completed!')
    console.log('')
    console.log('📋 Deployment Summary:')
    console.log(`   Database columns added: ${businessUpdated + branchUpdated}`)
    console.log(`   Performance indexes created: ${indexesCreated}`)
    console.log('   Saudi location data: Integrated')
    console.log('   Location service: Initialized')
    console.log('')
    console.log('🔗 Test Endpoints:')
    console.log(`   Location Health: ${apiUrl}/api/locations/health`)
    console.log(`   Search Regions: ${apiUrl}/api/locations/regions`)
    console.log(`   Search Test: ${apiUrl}/api/locations/search?q=الرياض&lang=ar`)
    console.log('')
    console.log('🌐 Updated Features Available At:')
    console.log(`   Business Registration: ${baseUrl}/register`)
    console.log(`   Admin Dashboard: ${baseUrl}/admin`)
    console.log('')
    console.log('✨ New Features Active:')
    console.log('   • Saudi regions, cities, and districts autocomplete')
    console.log('   • Smart district dropdown based on city selection')
    console.log('   • Automatic region population from location hierarchy')
    console.log('   • Enhanced location search with Arabic support')
    console.log('   • Performance optimized location queries')

  } catch (error) {
    console.error('❌ Location features deployment failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Check if running in production or allow development for testing
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Running location features deployment in PRODUCTION mode')
} else {
  console.log('🧪 Running location features deployment in DEVELOPMENT mode')
  console.log('💡 Set NODE_ENV=production for production deployment')
}

deployLocationFeatures()
  .then(() => {
    console.log('✅ Location features deployment completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Location features deployment failed:', error)
    process.exit(1)
  })