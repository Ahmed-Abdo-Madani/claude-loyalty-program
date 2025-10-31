import LocationService from '../services/LocationService.js'
import logger from '../config/logger.js'
import { getLocalizedMessage } from '../middleware/languageMiddleware.js'

class LocationController {
  /**
   * Search all location types
   * GET /api/locations/search?q=query&lang=ar&limit=10
   */
  static async searchAll(req, res) {
    try {
      const language = req.locale || req.query.lang || 'ar'
      const { q: query, limit = 10 } = req.query

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: [],
          message: getLocalizedMessage('validation.queryMinLength', req.locale)
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
        error: getLocalizedMessage('server.locationSearchFailed', req.locale),
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
      const language = req.locale || req.query.lang || 'ar'
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
        error: getLocalizedMessage('server.failedToLoadRegions', req.locale),
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
      const language = req.locale || req.query.lang || 'ar'
      const { search } = req.query

      if (!regionId) {
        return res.status(400).json({
          success: false,
          error: getLocalizedMessage('validation.regionIdRequired', req.locale)
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
        error: getLocalizedMessage('server.failedToLoadCities', req.locale),
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
      const language = req.locale || req.query.lang || 'ar'
      const { search } = req.query

      if (!cityId) {
        return res.status(400).json({
          success: false,
          error: getLocalizedMessage('validation.cityIdRequired', req.locale)
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
        error: getLocalizedMessage('server.failedToLoadDistricts', req.locale),
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
      const language = req.locale || req.query.lang || 'ar'

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
            error: getLocalizedMessage('validation.invalidLocationType', req.locale)
          })
      }

      if (!location) {
        return res.status(404).json({
          success: false,
          error: getLocalizedMessage('notFound.location', req.locale, { type }),
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
        error: getLocalizedMessage('server.failedToLoadLocation', req.locale),
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
      const language = req.locale || req.query.lang || 'ar'

      const validation = LocationService.validateLocation(location)
      
      if (!validation.valid) {
        // Check if validation returned an errorKey (new format)
        const errorMessage = validation.errorKey 
          ? getLocalizedMessage(validation.errorKey, req.locale, validation.params)
          : validation.error // Fallback to old format if service not yet updated
        
        return res.status(400).json({
          success: false,
          error: getLocalizedMessage('validation.invalidLocationData', req.locale),
          message: errorMessage,
          data: location
        })
      }

      // Get full location details if valid
      const hierarchy = await LocationService.getLocationHierarchy(location, language)
      
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
        error: getLocalizedMessage('server.locationValidationFailed', req.locale),
        message: error.message
      })
    }
  }
}

export default LocationController