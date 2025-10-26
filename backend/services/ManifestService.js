import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../config/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Service for managing the stamp icons manifest.json file
 * Provides safe read/write operations with validation and atomic updates
 */
class ManifestService {
  constructor() {
    // Use ICONS_PATH from env or default to backend/uploads/icons/stamps
    const basePath = process.env.ICONS_PATH || path.join(__dirname, '../uploads/icons/stamps')
    this.iconsPath = basePath
    this.manifestPath = path.join(basePath, 'manifest.json')
    this.lockFile = path.join(basePath, '.manifest.lock')
    this.manifestCache = null
    this.cacheTimestamp = null
    this.cacheTTL = 5000 // Cache for 5 seconds
    
    console.log('🔧 [ManifestService] Constructor called')
    console.log('🔧 [ManifestService] ICONS_PATH env:', process.env.ICONS_PATH)
    console.log('🔧 [ManifestService] Base path:', basePath)
    console.log('🔧 [ManifestService] Manifest path:', this.manifestPath)
    console.log('🔧 [ManifestService] Lock file:', this.lockFile)
    
    logger.info('ManifestService initialized', { 
      manifestPath: this.manifestPath,
      lockFile: this.lockFile 
    })
  }

  /**
   * Read and parse manifest.json
   * Auto-migrates legacy manifests by defaulting version and categories
   * @param {boolean} _skipWrite - Internal flag to prevent recursion
   * @returns {Object} Parsed manifest data
   */
  readManifest(_skipWrite = false) {
    try {
      // Check cache first
      if (this.manifestCache && this.cacheTimestamp && 
          (Date.now() - this.cacheTimestamp) < this.cacheTTL) {
        logger.debug('Returning cached manifest')
        return this.manifestCache
      }

      // Check if manifest file exists
      if (!fs.existsSync(this.manifestPath)) {
        logger.warn('Manifest file not found, returning default structure', { 
          manifestPath: this.manifestPath 
        })
        return this.getDefaultManifest()
      }

      // Read and parse manifest
      const content = fs.readFileSync(this.manifestPath, 'utf8')
      console.log('📄 [ManifestService] Reading manifest from:', this.manifestPath)
      console.log('📄 [ManifestService] Content length:', content.length)
      console.log('📄 [ManifestService] Raw content:', content.substring(0, 200) + '...')
      
      logger.info('Reading manifest', { 
        manifestPath: this.manifestPath, 
        contentLength: content.length 
      })
      
      const manifest = JSON.parse(content)
      console.log('📄 [ManifestService] Parsed manifest:', JSON.stringify(manifest, null, 2))
      console.log('📄 [ManifestService] Has version:', manifest.version)
      console.log('📄 [ManifestService] Has categories:', manifest.categories, 'isArray:', Array.isArray(manifest.categories))
      console.log('📄 [ManifestService] Has icons:', manifest.icons, 'isArray:', Array.isArray(manifest.icons))
      
      let needsMigration = false
      
      // Auto-migrate: Default version to 1 if missing
      if (!manifest.version && manifest.version !== 0) {
        console.log('⚠️ [ManifestService] Manifest missing version, defaulting to 1')
        logger.warn('Manifest missing version, defaulting to 1')
        manifest.version = 1
        needsMigration = true
      }
      
      // Auto-migrate: Default categories to empty array if missing
      if (!Array.isArray(manifest.categories)) {
        console.log('⚠️ [ManifestService] Manifest missing categories array, initializing to empty')
        logger.warn('Manifest missing categories array, initializing to empty')
        manifest.categories = []
        needsMigration = true
      }
      
      // Auto-migrate: Generate categories from existing icons if categories is empty
      if (manifest.categories.length === 0 && Array.isArray(manifest.icons) && manifest.icons.length > 0) {
        console.log('⚠️ [ManifestService] Categories empty, generating from icons...')
        const uniqueCategories = new Set()
        manifest.icons.forEach(icon => {
          if (icon.category) {
            uniqueCategories.add(icon.category)
          }
        })
        
        // Create category objects from unique category IDs
        let order = 1
        uniqueCategories.forEach(categoryId => {
          // Capitalize first letter for display name
          const name = categoryId.charAt(0).toUpperCase() + categoryId.slice(1)
          manifest.categories.push({
            id: categoryId,
            name: name,
            order: order++
          })
        })
        
        console.log(`✅ [ManifestService] Generated ${manifest.categories.length} categories from icons:`, manifest.categories.map(c => c.id))
        needsMigration = true
      }
      
      // Auto-migrate: Default icons to empty array if missing
      if (!Array.isArray(manifest.icons)) {
        console.log('⚠️ [ManifestService] Manifest missing icons array, initializing to empty')
        logger.warn('Manifest missing icons array, initializing to empty')
        manifest.icons = []
        needsMigration = true
      }
      
      console.log('📄 [ManifestService] Migration needed:', needsMigration)
      console.log('📄 [ManifestService] Skip write:', _skipWrite)

      // Validate normalized manifest structure
      const validation = this.validateManifest(manifest)
      console.log('📄 [ManifestService] Validation result:', validation)
      
      if (validation.errors) {
        console.error('❌ [ManifestService] Invalid manifest structure after normalization:', validation.errors)
        logger.error('Invalid manifest structure after normalization:', validation.errors)
        throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`)
      }

      // Persist normalized manifest if migration occurred
      if (needsMigration && !_skipWrite) {
        console.log('🔄 [ManifestService] Persisting auto-migration...')
        logger.info('Auto-migrating legacy manifest', { 
          version: manifest.version,
          categoriesCount: manifest.categories.length,
          iconsCount: manifest.icons.length
        })
        
        // Add migration timestamp
        manifest.lastUpdated = new Date().toISOString()
        console.log('🔄 [ManifestService] Added lastUpdated:', manifest.lastUpdated)
        
        this._writeManifestSync(manifest)
        console.log('✅ [ManifestService] Auto-migration persisted successfully')
      } else if (needsMigration && _skipWrite) {
        console.log('⏭️ [ManifestService] Migration needed but skipping write (_skipWrite=true)')
      } else {
        console.log('✅ [ManifestService] No migration needed, returning existing manifest')
      }
      
      console.log('📄 [ManifestService] Final manifest:', {
        version: manifest.version,
        categoriesCount: manifest.categories?.length || 0,
        iconsCount: manifest.icons?.length || 0,
        hasLastUpdated: !!manifest.lastUpdated
      })

      // Update cache
      this.manifestCache = manifest
      this.cacheTimestamp = Date.now()

      logger.debug('Manifest read successfully', { 
        iconsCount: manifest.icons?.length || 0,
        categoriesCount: manifest.categories?.length || 0
      })

      return manifest
    } catch (error) {
      logger.error('Error reading manifest:', error)
      throw new Error(`Failed to read manifest: ${error.message}`)
    }
  }

  /**
   * Internal synchronous write for migration (avoids recursion)
   * @param {Object} manifestData - Manifest data to write
   * @private
   */
  _writeManifestSync(manifestData) {
    try {
      console.log('💾 [ManifestService] Starting synchronous write...')
      console.log('💾 [ManifestService] Target path:', this.manifestPath)
      console.log('💾 [ManifestService] Data to write:', JSON.stringify(manifestData, null, 2).substring(0, 300) + '...')
      
      // Write directly (no lock needed for migration)
      const tempPath = `${this.manifestPath}.tmp`
      console.log('💾 [ManifestService] Writing to temp file:', tempPath)
      fs.writeFileSync(tempPath, JSON.stringify(manifestData, null, 2), 'utf8')
      
      console.log('💾 [ManifestService] Renaming temp file to manifest...')
      fs.renameSync(tempPath, this.manifestPath)
      
      // Clear cache
      this.manifestCache = null
      this.cacheTimestamp = null
      
      console.log('✅ [ManifestService] Synchronous write complete')
      logger.debug('Manifest written synchronously', { path: this.manifestPath })
    } catch (error) {
      console.error('❌ [ManifestService] Error writing manifest synchronously:', error)
      logger.error('Error writing manifest synchronously:', error)
      // Don't throw - allow read to continue with normalized in-memory version
    }
  }

  /**
   * Write manifest.json atomically
   * @param {Object} manifestData - Manifest data to write
   */
  async writeManifest(manifestData) {
    try {
      // Validate manifest before writing
      const validation = this.validateManifest(manifestData)
      if (validation.errors) {
        throw new Error(`Invalid manifest data: ${validation.errors.join(', ')}`)
      }

      // Update version and timestamp
      manifestData.version = (manifestData.version || 0) + 1
      manifestData.lastUpdated = new Date().toISOString()

      // Acquire lock (now async)
      await this.acquireLock()

      try {
        // Write to temporary file first
        const tempPath = `${this.manifestPath}.tmp`
        fs.writeFileSync(tempPath, JSON.stringify(manifestData, null, 2), 'utf8')

        // Atomic rename
        fs.renameSync(tempPath, this.manifestPath)

        // Clear cache
        this.manifestCache = null
        this.cacheTimestamp = null

        logger.info('Manifest written successfully', {
          version: manifestData.version,
          iconsCount: manifestData.icons?.length || 0
        })
      } finally {
        // Always release lock
        this.releaseLock()
      }
    } catch (error) {
      logger.error('Error writing manifest:', error)
      throw new Error(`Failed to write manifest: ${error.message}`)
    }
  }

  /**
   * Add new icon to manifest
   * @param {Object} iconData - Icon data to add
   * @returns {Object} Updated manifest
   */
  async addIcon(iconData) {
    try {
      // Validate icon data
      if (!iconData.id || !iconData.name || !iconData.category) {
        throw new Error('Icon must have id, name, and category')
      }

      const manifest = this.readManifest()

      // Check for duplicate ID
      const existingIcon = manifest.icons.find(icon => icon.id === iconData.id)
      if (existingIcon) {
        throw new Error(`Icon with ID '${iconData.id}' already exists`)
      }

      // Add icon with both new and legacy format fields for backwards compatibility
      const newIcon = {
        id: iconData.id,
        name: iconData.name,
        category: iconData.category,
        description: iconData.description || '',
        variants: iconData.variants || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Add legacy format fields for backwards compatibility with stampIcons routes
      if (iconData.variants && iconData.variants.includes('filled')) {
        newIcon.fileName = `${iconData.id}-filled.svg`
        newIcon.filledFile = `${iconData.id}-filled.svg`
        newIcon.previewFile = `${iconData.id}.png`
      }
      
      manifest.icons.push(newIcon)

      // Write manifest
      await this.writeManifest(manifest)

      logger.info('Icon added to manifest', { iconId: iconData.id })
      return manifest
    } catch (error) {
      logger.error('Error adding icon to manifest:', error)
      throw error
    }
  }

  /**
   * Update existing icon in manifest
   * @param {string} iconId - Icon ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated icon data
   */
  async updateIcon(iconId, updates) {
    try {
      const manifest = this.readManifest()

      // Find icon
      const iconIndex = manifest.icons.findIndex(icon => icon.id === iconId)
      if (iconIndex === -1) {
        throw new Error(`Icon with ID '${iconId}' not found`)
      }

      // Merge updates
      const icon = manifest.icons[iconIndex]
      manifest.icons[iconIndex] = {
        ...icon,
        ...updates,
        id: icon.id, // Prevent ID changes
        updatedAt: new Date().toISOString()
      }

      // Write manifest
      await this.writeManifest(manifest)

      logger.info('Icon updated in manifest', { iconId, updates })
      return manifest.icons[iconIndex]
    } catch (error) {
      logger.error('Error updating icon in manifest:', error)
      throw error
    }
  }

  /**
   * Delete icon from manifest
   * @param {string} iconId - Icon ID to delete
   * @returns {Object} Deleted icon data
   */
  async deleteIcon(iconId) {
    try {
      const manifest = this.readManifest()

      // Find icon
      const iconIndex = manifest.icons.findIndex(icon => icon.id === iconId)
      if (iconIndex === -1) {
        throw new Error(`Icon with ID '${iconId}' not found`)
      }

      // Remove icon
      const deletedIcon = manifest.icons.splice(iconIndex, 1)[0]

      // Write manifest
      await this.writeManifest(manifest)

      logger.info('Icon deleted from manifest', { iconId })
      return deletedIcon
    } catch (error) {
      logger.error('Error deleting icon from manifest:', error)
      throw error
    }
  }

  /**
   * Get list of categories with icon counts
   * @returns {Array} Categories with counts
   */
  getCategories() {
    try {
      const manifest = this.readManifest()

      // Count icons per category
      const categoryCounts = {}
      manifest.icons.forEach(icon => {
        categoryCounts[icon.category] = (categoryCounts[icon.category] || 0) + 1
      })

      // Add counts to categories
      const categories = manifest.categories.map(cat => ({
        ...cat,
        iconCount: categoryCounts[cat.id] || 0
      }))

      return categories
    } catch (error) {
      logger.error('Error getting categories:', error)
      throw error
    }
  }

  /**
   * Add new category to manifest
   * @param {Object} categoryData - Category data
   * @returns {Object} Updated manifest
   */
  async addCategory(categoryData) {
    try {
      // Validate category data
      if (!categoryData.id || !categoryData.name) {
        throw new Error('Category must have id and name')
      }

      const manifest = this.readManifest()

      // Check for duplicate ID
      const existingCategory = manifest.categories.find(cat => cat.id === categoryData.id)
      if (existingCategory) {
        throw new Error(`Category with ID '${categoryData.id}' already exists`)
      }

      // Compute order if not provided: max existing order + 1
      let order = categoryData.order
      if (order === undefined || order === null) {
        const maxOrder = manifest.categories.reduce((max, cat) => Math.max(max, cat.order || 0), 0)
        order = maxOrder + 1
        logger.info('Auto-computed order for category', { categoryId: categoryData.id, order })
      }

      // Add category
      manifest.categories.push({
        id: categoryData.id,
        name: categoryData.name,
        order
      })

      // Sort categories by order
      manifest.categories.sort((a, b) => a.order - b.order)

      // Write manifest
      await this.writeManifest(manifest)

      logger.info('Category added to manifest', { categoryId: categoryData.id, order })
      return manifest
    } catch (error) {
      logger.error('Error adding category to manifest:', error)
      throw error
    }
  }

  /**
   * Validate manifest structure
   * @param {Object} manifestData - Manifest data to validate
   * @returns {Object} Validation result with errors array or null
   */
  /**
   * Validate manifest structure
   * Softened to allow caller to supply defaults for version/categories
   * Only throws on missing required icon/category subfields
   * @param {Object} manifestData - Manifest data to validate
   * @returns {Object} Validation result with errors array or null
   */
  validateManifest(manifestData) {
    const errors = []

    // Soften: Don't require version or categories at top level
    // Caller (readManifest) should default these before validation
    
    // Validate icons array structure (if present)
    if (!Array.isArray(manifestData.icons)) {
      errors.push('Icons must be an array')
    } else {
      // Validate each icon entry has required fields
      manifestData.icons.forEach((icon, index) => {
        if (!icon.id) {
          errors.push(`Icon at index ${index} missing required field: id`)
        }
        if (!icon.name) {
          errors.push(`Icon at index ${index} missing required field: name`)
        }
        if (!icon.category) {
          errors.push(`Icon at index ${index} missing required field: category`)
        }
        // Softened: Don't require variants array - legacy manifests don't have it
        // if (!Array.isArray(icon.variants)) {
        //   errors.push(`Icon at index ${index} missing or invalid variants array`)
        // }
      })
    }

    // Validate categories array structure (if present)
    if (manifestData.categories !== undefined && !Array.isArray(manifestData.categories)) {
      errors.push('Categories must be an array if provided')
    } else if (Array.isArray(manifestData.categories)) {
      // Validate each category entry has required fields
      manifestData.categories.forEach((cat, index) => {
        if (typeof cat !== 'object' || cat === null) {
          errors.push(`Category at index ${index} must be an object`)
        } else {
          if (!cat.id) {
            errors.push(`Category at index ${index} missing required field: id`)
          }
          if (!cat.name) {
            errors.push(`Category at index ${index} missing required field: name`)
          }
        }
      })
    }

    return errors.length > 0 ? { errors } : { errors: null }
  }

  /**
   * Get default manifest structure
   * @returns {Object} Default manifest
   */
  getDefaultManifest() {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      icons: [],
      categories: [
        { id: 'food-beverage', name: 'Food & Beverage', order: 0 },
        { id: 'retail', name: 'Retail', order: 1 },
        { id: 'services', name: 'Services', order: 2 },
        { id: 'entertainment', name: 'Entertainment', order: 3 },
        { id: 'health', name: 'Health & Wellness', order: 4 },
        { id: 'other', name: 'Other', order: 5 }
      ]
    }
  }

  /**
   * Acquire lock for manifest operations (async, non-blocking)
   */
  async acquireLock() {
    const maxRetries = 50
    const retryDelay = 100 // ms

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to create lock file
        fs.writeFileSync(this.lockFile, process.pid.toString(), { flag: 'wx' })
        logger.debug('Lock acquired')
        return
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Lock file exists, check if stale
          try {
            const lockContent = fs.readFileSync(this.lockFile, 'utf8')
            const lockAge = Date.now() - fs.statSync(this.lockFile).mtimeMs

            // If lock is older than 5 seconds, consider it stale
            if (lockAge > 5000) {
              logger.warn('Stale lock detected, removing', { pid: lockContent, age: lockAge })
              fs.unlinkSync(this.lockFile)
              continue
            }
          } catch (readError) {
            // Lock file disappeared, try again
            continue
          }

          // Async wait and retry (non-blocking)
          const sleep = retryDelay * (i + 1)
          logger.debug(`Lock held by another process, retrying in ${sleep}ms`)
          
          // Use Promise-based setTimeout for non-blocking wait
          await new Promise(resolve => setTimeout(resolve, sleep))
        } else {
          throw error
        }
      }
    }

    throw new Error('Failed to acquire lock after maximum retries')
  }

  /**
   * Release lock
   */
  releaseLock() {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile)
        logger.debug('Lock released')
      }
    } catch (error) {
      logger.error('Error releasing lock:', error)
    }
  }
}

// Export singleton instance
export default new ManifestService()
