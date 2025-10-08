import LocationService from '../services/LocationService.js'
import logger from '../config/logger.js'

class LocationController {
  /**
   * Search all location types
   * GET /api/locations/search?q=query&lang=ar&limit=10
   */
  static async searchAll(req, res) {
    try {
      const { q: query, lang: language = 'ar', limit = 10 } = req.query

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: [],
          message: 'Query must be at least 2 characters'
        })
      }

      const results = await LocationService.searchAll(query, language, parseInt(limit))
      
      // Enhance results with hierarchy info
      const enhancedResults = await Promise.all(
        results.map(async (location) => {
          const hierarchy = await LocationService.getLocationHierarchy(location, language)
          return {
            ...location,
            hierarchy,
            displayText: hierarchy || location[language === 'ar' ? 'name_ar' : 'name_en']
          }
        })
      )

      logger.info(`🔍 Location search: "${query}" (${language}) - ${enhancedResults.length} results`)

      res.json({
        success: true,
        data: enhancedResults,
        query,
        language,
        count: enhancedResults.length
      })
    } catch (error) {
      logger.error('❌ Location search failed:', error)
      res.status(500).json({
        success: false,
        error: 'Location search failed',
        message: error.message
      })
    }
  }

  /**
   * Get all regions
   * GET /api/locations/regions
   */
  static async getRegions(req, res) {
    try {
      const { lang: language = 'ar' } = req.query
      const regions = await LocationService.loadRegions()
      
      logger.info(`📍 Retrieved ${regions.length} regions`)

      res.json({
        success: true,
        data: regions,
        count: regions.length
      })
    } catch (error) {
      logger.error('❌ Failed to get regions:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to load regions',
        message: error.message
      })
    }
  }

  /**
   * Get cities by region
   * GET /api/locations/regions/:regionId/cities
   */
  static async getCitiesByRegion(req, res) {
    try {
      const { regionId } = req.params
      const { lang: language = 'ar', search } = req.query

      if (!regionId) {
        return res.status(400).json({
          success: false,
          error: 'Region ID is required'
        })
      }

      let cities
      if (search) {
        cities = await LocationService.searchCities(search, parseInt(regionId), language)
      } else {
        cities = await LocationService.getCitiesByRegion(parseInt(regionId))
      }
      
      logger.info(`🏙️ Retrieved ${cities.length} cities for region ${regionId}`)

      res.json({
        success: true,
        data: cities,
        regionId: parseInt(regionId),
        count: cities.length
      })
    } catch (error) {
      logger.error('❌ Failed to get cities:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to load cities',
        message: error.message
      })
    }
  }

  /**
   * Get districts by city
   * GET /api/locations/cities/:cityId/districts
   */
  static async getDistrictsByCity(req, res) {
    try {
      const { cityId } = req.params
      const { lang: language = 'ar', search } = req.query

      if (!cityId) {
        return res.status(400).json({
          success: false,
          error: 'City ID is required'
        })
      }

      let districts
      if (search) {
        districts = await LocationService.searchDistricts(search, parseInt(cityId), language)
      } else {
        districts = await LocationService.getDistrictsByCity(parseInt(cityId))
      }
      
      logger.info(`🏘️ Retrieved ${districts.length} districts for city ${cityId}`)

      res.json({
        success: true,
        data: districts,
        cityId: parseInt(cityId),
        count: districts.length
      })
    } catch (error) {
      logger.error('❌ Failed to get districts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to load districts',
        message: error.message
      })
    }
  }

  /**
   * Get location by ID and type
   * GET /api/locations/:type/:id
   */
  static async getLocationById(req, res) {
    try {
      const { type, id } = req.params
      const { lang: language = 'ar' } = req.query

      let location
      switch (type) {
        case 'region':
          location = await LocationService.getRegionById(parseInt(id))
          break
        case 'city':
          location = await LocationService.getCityById(parseInt(id))
          break
        case 'district':
          location = await LocationService.getDistrictById(parseInt(id))
          break
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid location type. Must be: region, city, or district'
          })
      }

      if (!location) {
        return res.status(404).json({
          success: false,
          error: `${type} not found`,
          id: parseInt(id)
        })
      }

      // Add hierarchy information
      const hierarchy = await LocationService.getLocationHierarchy({ ...location, type }, language)
      
      res.json({
        success: true,
        data: {
          ...location,
          type,
          hierarchy
        }
      })
    } catch (error) {
      logger.error('❌ Failed to get location by ID:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to load location',
        message: error.message
      })
    }
  }

  /**
   * Validate location data
   * POST /api/locations/validate
   */
  static async validateLocation(req, res) {
    try {
      const location = req.body

      const validation = LocationService.validateLocation(location)
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid location data',
          message: validation.error,
          data: location
        })
      }

      // Get full location details if valid
      const hierarchy = await LocationService.getLocationHierarchy(location, req.query.lang || 'ar')
      
      res.json({
        success: true,
        data: {
          ...location,
          hierarchy,
          valid: true
        }
      })
    } catch (error) {
      logger.error('❌ Location validation failed:', error)
      res.status(500).json({
        success: false,
        error: 'Location validation failed',
        message: error.message
      })
    }
  }
}

export default LocationController