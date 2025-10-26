import ManifestService from '../services/ManifestService.js'
import { generatePreview, normalizeSVGDimensions } from '../utils/generateIconPreviews.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../config/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Helper: Generate a unique slugified icon ID from a name
 * @param {string} name - Icon name or filename
 * @param {Array} existingIcons - Array of existing icons from manifest
 * @returns {string} - Unique slug (e.g., "coffee-cup", "coffee-cup-02")
 */
function generateUniqueIconId(name, existingIcons = []) {
  // Remove file extension if present
  const baseName = name.replace(/\.(svg|png|jpg)$/i, '')
  
  // Slugify: lowercase, replace spaces/underscores with hyphens, remove non-alphanumeric except hyphens
  let slug = baseName
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
  
  // Ensure slug is not empty
  if (!slug) {
    slug = 'icon'
  }
  
  // Check for conflicts and append numeric suffix if needed
  const existingIds = existingIcons.map(icon => icon.id)
  let uniqueSlug = slug
  let counter = 2
  
  while (existingIds.includes(uniqueSlug)) {
    uniqueSlug = `${slug}-${String(counter).padStart(2, '0')}`
    counter++
  }
  
  return uniqueSlug
}

/**
 * Controller for admin icon management operations
 */
class AdminIconsController {
  /**
   * Upload new icon
   * POST /api/admin/icons
   */
  async uploadIcon(req, res) {
    try {
      logger.info('Upload icon request received', {
        adminId: req.admin?.id,
        body: req.body,
        files: req.files ? Object.keys(req.files) : []
      })

      // Extract metadata (ID is now auto-generated)
      const { name, category, description } = req.body

      // Validate required fields (removed id requirement)
      if (!name || !category) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Icon name and category are required'
        })
      }

      // Validate category exists in manifest
      const manifest = ManifestService.readManifest()
      const validCategories = manifest.categories.map(cat => cat.id)
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_CATEGORY',
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        })
      }

      // Check if at least filled variant is provided
      if (!req.files || !req.files.filled) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILLED_VARIANT',
          message: 'Filled variant SVG file is required'
        })
      }

      // Auto-generate unique ID from name
      const id = generateUniqueIconId(name, manifest.icons || [])
      logger.info('Generated unique icon ID', { originalName: name, generatedId: id })

      // Determine available variants and rename uploaded files to use generated ID
      const variants = []
      const iconsDir = path.join(__dirname, '../uploads/icons/stamps')
      
      if (req.files.filled) {
        const oldPath = req.files.filled[0].path
        const newPath = path.join(iconsDir, `${id}-filled.svg`)
        fs.renameSync(oldPath, newPath)
        req.files.filled[0].path = newPath // Update path for later use
        variants.push('filled')
        logger.info('Renamed filled variant', { from: oldPath, to: newPath })
      }
      
      if (req.files.stroke) {
        const oldPath = req.files.stroke[0].path
        const newPath = path.join(iconsDir, `${id}-stroke.svg`)
        fs.renameSync(oldPath, newPath)
        req.files.stroke[0].path = newPath // Update path for later use
        variants.push('stroke')
        logger.info('Renamed stroke variant', { from: oldPath, to: newPath })
      }

      // Generate preview from filled variant
      const filledPath = req.files.filled[0].path
      const previewDir = path.join(__dirname, '../uploads/icons/stamps/previews')
      const previewPath = path.join(previewDir, `${id}.png`)

      // Ensure preview directory exists
      if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true })
      }

      // Generate preview from filled variant (50x50 with transparent background)
      // Note: generatePreview also normalizes the SVG and saves it back
      const previewGenerated = await generatePreview(filledPath, previewPath, { size: 50 })
      if (previewGenerated) {
        logger.info('Preview generated successfully', { iconId: id, previewPath, size: '50x50' })
      } else {
        logger.error('Failed to generate preview', { iconId: id, filledPath })
        // Continue with upload even if preview generation fails
      }

      // Add icon to manifest
      const iconData = {
        id,
        name,
        category,
        description: description || '',
        variants
      }

      try {
        await ManifestService.addIcon(iconData)
        logger.info('Icon added to manifest successfully', { iconId: id })
      } catch (manifestError) {
        // If manifest update fails, clean up uploaded files
        logger.error('Failed to update manifest:', manifestError)
        
        // Delete uploaded files
        if (req.files.filled) {
          try {
            fs.unlinkSync(req.files.filled[0].path)
          } catch (e) {
            logger.error('Error deleting filled variant:', e)
          }
        }
        if (req.files.stroke) {
          try {
            fs.unlinkSync(req.files.stroke[0].path)
          } catch (e) {
            logger.error('Error deleting stroke variant:', e)
          }
        }
        if (fs.existsSync(previewPath)) {
          try {
            fs.unlinkSync(previewPath)
          } catch (e) {
            logger.error('Error deleting preview:', e)
          }
        }

        throw manifestError
      }

      return res.status(201).json({
        success: true,
        data: {
          ...iconData,
          previewUrl: `/uploads/icons/stamps/previews/${id}.png`
        },
        message: 'Icon uploaded successfully'
      })
    } catch (error) {
      logger.error('Error uploading icon:', error)
      return res.status(500).json({
        success: false,
        error: 'UPLOAD_FAILED',
        message: error.message || 'Failed to upload icon'
      })
    }
  }

  /**
   * Update existing icon
   * PUT /api/admin/icons/:id
   */
  async updateIcon(req, res) {
    try {
      const iconId = req.params.id
      logger.info('Update icon request received', {
        adminId: req.admin?.id,
        iconId,
        body: req.body,
        files: req.files ? Object.keys(req.files) : []
      })

      // Get current manifest to verify icon exists
      const manifest = ManifestService.readManifest()
      const existingIcon = manifest.icons.find(icon => icon.id === iconId)

      if (!existingIcon) {
        return res.status(404).json({
          success: false,
          error: 'ICON_NOT_FOUND',
          message: `Icon with ID '${iconId}' not found`
        })
      }

      // Extract updates
      const { name, category, description } = req.body
      const updates = {}

      if (name) updates.name = name
      if (category) {
        // Validate category exists in manifest
        const validCategories = manifest.categories.map(cat => cat.id)
        if (!validCategories.includes(category)) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_CATEGORY',
            message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
          })
        }
        updates.category = category
      }
      if (description !== undefined) updates.description = description

      // Handle file updates
      if (req.files && Object.keys(req.files).length > 0) {
        const variants = [...existingIcon.variants]

        // Update filled variant
        if (req.files.filled) {
          const oldFilledPath = path.join(__dirname, '../uploads/icons/stamps', `${iconId}-filled.svg`)
          const newFilledPath = req.files.filled[0].path

          // Delete old file if exists
          if (fs.existsSync(oldFilledPath)) {
            fs.unlinkSync(oldFilledPath)
          }

          if (!variants.includes('filled')) {
            variants.push('filled')
          }
        }

        // Update stroke variant
        if (req.files.stroke) {
          const oldStrokePath = path.join(__dirname, '../uploads/icons/stamps', `${iconId}-stroke.svg`)
          const newStrokePath = req.files.stroke[0].path

          // Delete old file if exists
          if (fs.existsSync(oldStrokePath)) {
            fs.unlinkSync(oldStrokePath)
          }

          if (!variants.includes('stroke')) {
            variants.push('stroke')
          }
        }

        updates.variants = variants

        // Regenerate preview if filled variant was updated
        if (req.files.filled) {
          const filledPath = path.join(__dirname, '../uploads/icons/stamps', `${iconId}-filled.svg`)
          const previewPath = path.join(__dirname, '../uploads/icons/stamps/previews', `${iconId}.png`)

          const previewGenerated = await generatePreview(filledPath, previewPath, { size: 50 })
          if (previewGenerated) {
            logger.info('Preview regenerated successfully', { iconId, size: '50x50' })
          } else {
            logger.error('Failed to regenerate preview', { iconId, filledPath })
            // Continue with update even if preview generation fails
          }
        }
      }

      // Update manifest
      const updatedIcon = ManifestService.updateIcon(iconId, updates)

      return res.status(200).json({
        success: true,
        data: {
          ...updatedIcon,
          previewUrl: `/uploads/icons/stamps/previews/${iconId}.png`
        },
        message: 'Icon updated successfully'
      })
    } catch (error) {
      logger.error('Error updating icon:', error)
      return res.status(500).json({
        success: false,
        error: 'UPDATE_FAILED',
        message: error.message || 'Failed to update icon'
      })
    }
  }

  /**
   * Delete icon
   * DELETE /api/admin/icons/:id
   */
  async deleteIcon(req, res) {
    try {
      const iconId = req.params.id
      logger.info('Delete icon request received', {
        adminId: req.admin?.id,
        iconId
      })

      // Get icon data before deletion
      const manifest = ManifestService.readManifest()
      const icon = manifest.icons.find(i => i.id === iconId)

      if (!icon) {
        return res.status(404).json({
          success: false,
          error: 'ICON_NOT_FOUND',
          message: `Icon with ID '${iconId}' not found`
        })
      }

      // Delete files
      const iconsDir = path.join(__dirname, '../uploads/icons/stamps')
      const previewsDir = path.join(__dirname, '../uploads/icons/stamps/previews')

      // Delete SVG files
      const filledPath = path.join(iconsDir, `${iconId}-filled.svg`)
      const strokePath = path.join(iconsDir, `${iconId}-stroke.svg`)
      const previewPath = path.join(previewsDir, `${iconId}.png`)

      let deletedFiles = []
      let failedDeletes = []

      // Delete filled variant
      if (fs.existsSync(filledPath)) {
        try {
          fs.unlinkSync(filledPath)
          deletedFiles.push('filled.svg')
        } catch (error) {
          logger.error('Error deleting filled variant:', error)
          failedDeletes.push('filled.svg')
        }
      }

      // Delete stroke variant
      if (fs.existsSync(strokePath)) {
        try {
          fs.unlinkSync(strokePath)
          deletedFiles.push('stroke.svg')
        } catch (error) {
          logger.error('Error deleting stroke variant:', error)
          failedDeletes.push('stroke.svg')
        }
      }

      // Delete preview
      if (fs.existsSync(previewPath)) {
        try {
          fs.unlinkSync(previewPath)
          deletedFiles.push('preview.png')
        } catch (error) {
          logger.error('Error deleting preview:', error)
          failedDeletes.push('preview.png')
        }
      }

      // Remove from manifest
      ManifestService.deleteIcon(iconId)

      logger.info('Icon deleted successfully', {
        iconId,
        deletedFiles,
        failedDeletes
      })

      return res.status(200).json({
        success: true,
        data: {
          iconId,
          deletedFiles,
          failedDeletes
        },
        message: 'Icon deleted successfully'
      })
    } catch (error) {
      logger.error('Error deleting icon:', error)
      return res.status(500).json({
        success: false,
        error: 'DELETE_FAILED',
        message: error.message || 'Failed to delete icon'
      })
    }
  }

  /**
   * Get icon categories
   * GET /api/admin/icons/categories
   */
  async getCategories(req, res) {
    try {
      logger.info('Get categories request received', {
        adminId: req.admin?.id
      })

      const categories = ManifestService.getCategories()

      return res.status(200).json({
        success: true,
        data: categories
      })
    } catch (error) {
      logger.error('Error getting categories:', error)
      return res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: error.message || 'Failed to get categories'
      })
    }
  }

  /**
   * Add new category
   * POST /api/admin/icons/categories
   */
  async addCategory(req, res) {
    try {
      // Normalize payload - if only name is provided, generate ID from it
      let categoryId = req.body.id || req.body.categoryId
      const categoryName = req.body.name
      let categoryOrder = req.body.order ? parseInt(req.body.order, 10) : undefined

      // If no ID provided, generate from name
      if (!categoryId && categoryName) {
        const manifest = ManifestService.readManifest()
        // Use same slugification logic as icon IDs
        categoryId = generateUniqueIconId(categoryName, manifest.categories || [])
        logger.info('Generated category ID from name', { name: categoryName, id: categoryId })
      }

      logger.info('Add category request received', {
        adminId: req.admin?.id,
        categoryId,
        categoryName,
        categoryOrder
      })

      if (!categoryId || !categoryName) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Category name is required'
        })
      }

      // Validate ID format
      if (!/^[a-z0-9-]+$/.test(categoryId)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ID_FORMAT',
          message: 'Category ID must contain only lowercase letters, numbers, and hyphens'
        })
      }

      // Auto-compute order if not provided
      if (categoryOrder === undefined) {
        const manifest = ManifestService.readManifest()
        const maxOrder = manifest.categories.reduce((max, cat) => Math.max(max, cat.order || 0), 0)
        categoryOrder = maxOrder + 1
        logger.info('Auto-computed category order', { categoryId, order: categoryOrder })
      }

      const manifest = ManifestService.addCategory({ 
        id: categoryId, 
        name: categoryName, 
        order: categoryOrder 
      })

      logger.info('Category added successfully', { 
        id: categoryId, 
        name: categoryName, 
        order: categoryOrder 
      })

      return res.status(201).json({
        success: true,
        data: { id: categoryId, name: categoryName, order: categoryOrder },
        message: 'Category added successfully'
      })
    } catch (error) {
      logger.error('Error adding category:', error)
      return res.status(500).json({
        success: false,
        error: 'ADD_FAILED',
        message: error.message || 'Failed to add category'
      })
    }
  }

  /**
   * Regenerate all preview images
   * POST /api/admin/icons/regenerate-previews
   */
  async regeneratePreviews(req, res) {
    try {
      logger.info('Regenerate previews request received', {
        adminId: req.admin?.id
      })

      const manifest = ManifestService.readManifest()
      const iconsDir = path.join(__dirname, '../uploads/icons/stamps')
      const previewsDir = path.join(__dirname, '../uploads/icons/stamps/previews')

      // Ensure preview directory exists
      if (!fs.existsSync(previewsDir)) {
        fs.mkdirSync(previewsDir, { recursive: true })
      }

      let successCount = 0
      let failureCount = 0
      const failures = []

      for (const icon of manifest.icons) {
        const filledPath = path.join(iconsDir, `${icon.id}-filled.svg`)
        const previewPath = path.join(previewsDir, `${icon.id}.png`)

        if (!fs.existsSync(filledPath)) {
          logger.warn('Filled variant not found for icon:', icon.id)
          failureCount++
          failures.push({ iconId: icon.id, reason: 'Filled variant not found' })
          continue
        }

        const previewGenerated = await generatePreview(filledPath, previewPath, { size: 50 })
        if (previewGenerated) {
          successCount++
        } else {
          logger.error('Error generating preview for icon:', icon.id)
          failureCount++
          failures.push({ iconId: icon.id, reason: 'Preview generation failed' })
        }
      }

      logger.info('Preview regeneration complete', {
        total: manifest.icons.length,
        success: successCount,
        failures: failureCount
      })

      return res.status(200).json({
        success: true,
        data: {
          total: manifest.icons.length,
          successCount,
          failureCount,
          failures
        },
        message: `Regenerated ${successCount} of ${manifest.icons.length} previews`
      })
    } catch (error) {
      logger.error('Error regenerating previews:', error)
      return res.status(500).json({
        success: false,
        error: 'REGENERATE_FAILED',
        message: error.message || 'Failed to regenerate previews'
      })
    }
  }
}

export default new AdminIconsController()
