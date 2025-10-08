import { endpoints } from '../config/api'

class LocationService {
  static cache = {
    searches: new Map(),
    regions: null,
    lastClearTime: Date.now()
  }

  static CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  static MAX_CACHE_SIZE = 100

  /**
   * Clear cache if it's too old or too large
   */
  static clearCacheIfNeeded() {
    const now = Date.now()
    
    // Clear if cache is too old
    if (now - this.cache.lastClearTime > this.CACHE_DURATION) {
      this.cache.searches.clear()
      this.cache.lastClearTime = now
    }
    
    // Clear if cache is too large
    if (this.cache.searches.size > this.MAX_CACHE_SIZE) {
      this.cache.searches.clear()
    }
  }

  /**
   * Search all location types with caching
   */
  static async searchAll(query, language = 'ar', maxResults = 10) {
    if (!query || query.length < 2) {
      return []
    }

    // Create cache key
    const cacheKey = `${query}-${language}-${maxResults}`
    
    this.clearCacheIfNeeded()
    
    // Check cache first
    if (this.cache.searches.has(cacheKey)) {
      return this.cache.searches.get(cacheKey)
    }

    try {
      const response = await fetch(
        `${endpoints.locationSearch}?q=${encodeURIComponent(query)}&lang=${language}&limit=${maxResults}`
      )
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Cache the results
        this.cache.searches.set(cacheKey, data.data)
        return data.data
      } else {
        throw new Error(data.message || 'Search failed')
      }
    } catch (error) {
      console.warn('❌ Location search failed, using fallback:', error.message)
      
      // Fallback: return mock data for development
      return this.getMockSearchResults(query, language, maxResults)
    }
  }

  /**
   * Fallback mock search results for development
   */
  static getMockSearchResults(query, language = 'ar', maxResults = 10) {
    const mockData = [
      {
        id: 'region_riyadh',
        type: 'region',
        name_ar: 'منطقة الرياض',
        name_en: 'Riyadh Region',
        hierarchy: 'منطقة الرياض - Riyadh Region'
      },
      {
        id: 'city_riyadh',
        type: 'city', 
        name_ar: 'الرياض',
        name_en: 'Riyadh',
        hierarchy: 'منطقة الرياض - الرياض - Riyadh Region - Riyadh City'
      },
      {
        id: 'district_olaya',
        type: 'district',
        name_ar: 'حي العليا',
        name_en: 'Al-Olaya District',
        hierarchy: 'منطقة الرياض - الرياض - حي العليا - Riyadh Region - Riyadh City - Al-Olaya District'
      },
      {
        id: 'region_makkah',
        type: 'region',
        name_ar: 'منطقة مكة المكرمة',
        name_en: 'Makkah Region',
        hierarchy: 'منطقة مكة المكرمة - Makkah Region'
      },
      {
        id: 'city_jeddah',
        type: 'city',
        name_ar: 'جدة',
        name_en: 'Jeddah',
        hierarchy: 'منطقة مكة المكرمة - جدة - Makkah Region - Jeddah City'
      }
    ]

    const searchTerm = query.toLowerCase()
    const results = mockData.filter(item => {
      const nameAr = (item.name_ar || '').toLowerCase()
      const nameEn = (item.name_en || '').toLowerCase()
      return nameAr.includes(searchTerm) || nameEn.includes(searchTerm)
    })

    return results.slice(0, maxResults)
  }

  /**
   * Get all regions
   */
  static async getRegions(language = 'ar') {
    // Use cache if available
    if (this.cache.regions) {
      return this.cache.regions
    }

    try {
      const response = await fetch(`${endpoints.locationRegions}?lang=${language}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load regions: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        this.cache.regions = data.data
        return data.data
      } else {
        throw new Error(data.message || 'Failed to load regions')
      }
    } catch (error) {
      console.error('❌ Failed to load regions:', error)
      return []
    }
  }

  /**
   * Get cities by region
   */
  static async getCitiesByRegion(regionId, language = 'ar') {
    try {
      const response = await fetch(`${endpoints.locations}/regions/${regionId}/cities?lang=${language}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load cities: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        return data.data
      } else {
        throw new Error(data.message || 'Failed to load cities')
      }
    } catch (error) {
      console.error('❌ Failed to load cities:', error)
      return []
    }
  }

  /**
   * Get districts by city
   */
  static async getDistrictsByCity(cityId, language = 'ar') {
    try {
      const response = await fetch(`${endpoints.locations}/cities/${cityId}/districts?lang=${language}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load districts: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        return data.data
      } else {
        throw new Error(data.message || 'Failed to load districts')
      }
    } catch (error) {
      console.error('❌ Failed to load districts:', error)
      return []
    }
  }

  /**
   * Validate location data
   */
  static async validateLocation(location, language = 'ar') {
    try {
      const response = await fetch(`${endpoints.locationValidate}?lang=${language}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(location)
      })
      
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('❌ Location validation failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Format location for display
   */
  static formatLocationDisplay(location, language = 'ar') {
    if (!location) return ''
    
    if (location.hierarchy) {
      return location.hierarchy
    }
    
    const nameField = language === 'ar' ? 'name_ar' : 'name_en'
    return location[nameField] || location.displayText || ''
  }

  /**
   * Get location type icon
   */
  static getLocationIcon(type) {
    const icons = {
      region: '🗺️',
      city: '🏙️',
      district: '📍'
    }
    return icons[type] || '📍'
  }

  /**
   * Debounced search function
   */
  static debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  /**
   * Create debounced search function
   */
  static createDebouncedSearch(callback, delay = 300) {
    return this.debounce(async (query, language) => {
      if (query.length >= 2) {
        const results = await this.searchAll(query, language)
        callback(results)
      } else {
        callback([])
      }
    }, delay)
  }
}

export default LocationService