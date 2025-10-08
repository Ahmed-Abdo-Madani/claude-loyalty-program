import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../config/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class LocationService {
  static data = {
    regions: null,
    cities: null,
    districts: null,
    loaded: {
      regions: false,
      cities: false,
      districts: false
    }
  }

  /**
   * Initialize location data - load regions immediately, others on demand
   */
  static async initialize() {
    try {
      await this.loadRegions()
      logger.info('✅ LocationService initialized successfully')
    } catch (error) {
      logger.error('❌ LocationService initialization failed:', error)
      throw error
    }
  }

  /**
   * Load regions data (small dataset - 13 regions)
   */
  static async loadRegions() {
    if (this.data.loaded.regions) {
      return this.data.regions
    }

    try {
      const dataPath = path.join(__dirname, '../data/regions_lite.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      this.data.regions = JSON.parse(rawData)
      this.data.loaded.regions = true
      
      logger.info(`📍 Loaded ${this.data.regions.length} regions`)
      return this.data.regions
    } catch (error) {
      logger.error('❌ Failed to load regions data:', error)
      throw error
    }
  }

  /**
   * Load cities data (large dataset - ~27k cities)
   */
  static async loadCities() {
    if (this.data.loaded.cities) {
      return this.data.cities
    }

    try {
      const dataPath = path.join(__dirname, '../data/cities_lite.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      this.data.cities = JSON.parse(rawData)
      this.data.loaded.cities = true
      
      logger.info(`🏙️ Loaded ${this.data.cities.length} cities`)
      return this.data.cities
    } catch (error) {
      logger.error('❌ Failed to load cities data:', error)
      throw error
    }
  }

  /**
   * Load districts data (very large dataset - ~26k districts)
   */
  static async loadDistricts() {
    if (this.data.loaded.districts) {
      return this.data.districts
    }

    try {
      const dataPath = path.join(__dirname, '../data/districts_lite.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      this.data.districts = JSON.parse(rawData)
      this.data.loaded.districts = true
      
      logger.info(`🏘️ Loaded ${this.data.districts.length} districts`)
      return this.data.districts
    } catch (error) {
      logger.error('❌ Failed to load districts data:', error)
      throw error
    }
  }

  /**
   * Search all location types with smart filtering
   */
  static async searchAll(query, language = 'ar', maxResults = 10) {
    if (!query || query.length < 2) {
      return []
    }

    const results = []
    
    try {
      // Search regions
      const regionResults = await this.searchRegions(query, language, 3)
      results.push(...regionResults.map(r => ({ ...r, type: 'region' })))

      // Search cities
      const cityResults = await this.searchCities(query, null, language, 4)
      results.push(...cityResults.map(c => ({ ...c, type: 'city' })))

      // Only load districts if we need more results
      if (results.length < maxResults) {
        const districtResults = await this.searchDistricts(query, null, language, maxResults - results.length)
        results.push(...districtResults.map(d => ({ ...d, type: 'district' })))
      }

      // Sort by relevance (exact matches first)
      const searchField = language === 'ar' ? 'name_ar' : 'name_en'
      results.sort((a, b) => {
        const aExact = a[searchField].toLowerCase() === query.toLowerCase()
        const bExact = b[searchField].toLowerCase() === query.toLowerCase()
        
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        const aStarts = a[searchField].toLowerCase().startsWith(query.toLowerCase())
        const bStarts = b[searchField].toLowerCase().startsWith(query.toLowerCase())
        
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        
        return 0
      })

      return results.slice(0, maxResults)
    } catch (error) {
      logger.error('❌ Search failed:', error)
      return []
    }
  }

  /**
   * Search regions
   */
  static async searchRegions(query, language = 'ar', maxResults = 10) {
    await this.loadRegions()
    return this.performSearch(this.data.regions, query, language, maxResults)
  }

  /**
   * Search cities (optionally filtered by region)
   */
  static async searchCities(query, regionId = null, language = 'ar', maxResults = 10) {
    await this.loadCities()
    
    let cities = this.data.cities
    if (regionId) {
      cities = cities.filter(city => city.region_id === regionId)
    }
    
    return this.performSearch(cities, query, language, maxResults)
  }

  /**
   * Search districts (optionally filtered by city)
   */
  static async searchDistricts(query, cityId = null, language = 'ar', maxResults = 10) {
    await this.loadDistricts()
    
    let districts = this.data.districts
    if (cityId) {
      districts = districts.filter(district => district.city_id === cityId)
    }
    
    return this.performSearch(districts, query, language, maxResults)
  }

  /**
   * Core search algorithm
   */
  static performSearch(data, query, language, maxResults) {
    if (!query || query.length < 2) {
      return []
    }

    const searchField = language === 'ar' ? 'name_ar' : 'name_en'
    const queryLower = query.toLowerCase()
    const results = []

    // Search strategies in order of relevance
    const strategies = [
      // 1. Exact match
      (item) => item[searchField].toLowerCase() === queryLower,
      // 2. Starts with
      (item) => item[searchField].toLowerCase().startsWith(queryLower),
      // 3. Contains
      (item) => item[searchField].toLowerCase().includes(queryLower)
    ]

    for (const strategy of strategies) {
      for (const item of data) {
        if (results.length >= maxResults) break
        
        if (strategy(item) && !results.find(r => r[`${item.region_id ? 'region' : item.city_id ? 'city' : 'district'}_id`] === item[`${item.region_id ? 'region' : item.city_id ? 'city' : 'district'}_id`])) {
          results.push(item)
        }
      }
      if (results.length >= maxResults) break
    }

    return results
  }

  /**
   * Get location by ID
   */
  static async getRegionById(regionId) {
    await this.loadRegions()
    return this.data.regions.find(r => r.region_id === regionId) || null
  }

  static async getCityById(cityId) {
    await this.loadCities()
    return this.data.cities.find(c => c.city_id === cityId) || null
  }

  static async getDistrictById(districtId) {
    await this.loadDistricts()
    return this.data.districts.find(d => d.district_id === districtId) || null
  }

  /**
   * Get cities by region
   */
  static async getCitiesByRegion(regionId) {
    await this.loadCities()
    return this.data.cities.filter(c => c.region_id === regionId)
  }

  /**
   * Get districts by city
   */
  static async getDistrictsByCity(cityId) {
    await this.loadDistricts()
    return this.data.districts.filter(d => d.city_id === cityId)
  }

  /**
   * Format location hierarchy for display
   */
  static async getLocationHierarchy(location, language = 'ar') {
    if (!location) return ''

    const parts = []
    
    if (location.type === 'district' && location.district_id) {
      const district = await this.getDistrictById(location.district_id)
      const city = await this.getCityById(location.city_id)
      const region = await this.getRegionById(location.region_id)
      
      const nameField = language === 'ar' ? 'name_ar' : 'name_en'
      
      if (district) parts.push(district[nameField])
      if (city) parts.push(city[nameField])
      if (region) parts.push(region[nameField])
    } else if (location.type === 'city' && location.city_id) {
      const city = await this.getCityById(location.city_id)
      const region = await this.getRegionById(location.region_id)
      
      const nameField = language === 'ar' ? 'name_ar' : 'name_en'
      
      if (city) parts.push(city[nameField])
      if (region) parts.push(region[nameField])
    } else if (location.type === 'region' && location.region_id) {
      const region = await this.getRegionById(location.region_id)
      
      const nameField = language === 'ar' ? 'name_ar' : 'name_en'
      
      if (region) parts.push(region[nameField])
    }

    return parts.join('، ')
  }

  /**
   * Validate location data
   */
  static validateLocation(location) {
    if (!location || !location.type) {
      return { valid: false, error: 'Location type is required' }
    }

    const requiredFields = {
      region: ['region_id'],
      city: ['region_id', 'city_id'],
      district: ['region_id', 'city_id', 'district_id']
    }

    const required = requiredFields[location.type] || []
    const missing = required.filter(field => !location[field])

    if (missing.length > 0) {
      return { valid: false, error: `Missing required fields: ${missing.join(', ')}` }
    }

    return { valid: true }
  }
}

export default LocationService