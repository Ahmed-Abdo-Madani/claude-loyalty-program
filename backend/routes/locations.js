import express from 'express'
import LocationController from '../controllers/locationController.js'
import logger from '../config/logger.js'

const router = express.Router()

// Middleware to log location API calls
router.use((req, res, next) => {
  logger.info(`📍 Location API: ${req.method} ${req.path}`, {
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined
  })
  next()
})

/**
 * Search all location types
 * GET /api/locations/search?q=الرياض&lang=ar&limit=10
 */
router.get('/search', LocationController.searchAll)

/**
 * Get all regions
 * GET /api/locations/regions
 */
router.get('/regions', LocationController.getRegions)

/**
 * Get cities by region
 * GET /api/locations/regions/:regionId/cities
 */
router.get('/regions/:regionId/cities', LocationController.getCitiesByRegion)

/**
 * Get districts by city
 * GET /api/locations/cities/:cityId/districts
 */
router.get('/cities/:cityId/districts', LocationController.getDistrictsByCity)

/**
 * Get specific location by type and ID
 * GET /api/locations/region/1
 * GET /api/locations/city/3
 * GET /api/locations/district/10100003001
 */
router.get('/:type/:id', LocationController.getLocationById)

/**
 * Validate location data
 * POST /api/locations/validate
 */
router.post('/validate', LocationController.validateLocation)

/**
 * Health check for location service
 * GET /api/locations/health
 */
router.get('/health', async (req, res) => {
  try {
    // Quick test to ensure data can be loaded
    const regions = await import('../services/LocationService.js')
    const regionCount = (await regions.default.loadRegions()).length
    
    res.json({
      success: true,
      service: 'LocationService',
      status: 'healthy',
      data: {
        regions_loaded: regionCount > 0,
        region_count: regionCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('❌ Location service health check failed:', error)
    res.status(503).json({
      success: false,
      service: 'LocationService',
      status: 'unhealthy',
      error: error.message
    })
  }
})

export default router