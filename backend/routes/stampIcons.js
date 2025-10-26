import express from 'express'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../config/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()
// Go up one level from routes/ to app root (Docker: /app/routes/ -> /app/)
const ICONS_BASE_PATH = process.env.ICONS_PATH || join(__dirname, '..', 'uploads', 'icons', 'stamps')

/**
 * GET /api/stamp-icons
 * List all available stamp icons
 * 
 * Query params:
 *   - category: Filter by category (optional)
 * 
 * Response format (CANONICAL - do not nest in data.data):
 *   {
 *     success: true,
 *     icons: [...],           // Flat array of icon objects
 *     categories: [...],      // Flat array of category objects
 *     version: "1.0.0",       // Manifest version string
 *     total: 12               // Total count of icons (filtered or all)
 *   }
 */
router.get('/', (req, res) => {
  try {
    const { category } = req.query
    const manifestPath = join(ICONS_BASE_PATH, 'manifest.json')

    if (!existsSync(manifestPath)) {
      logger.error('Stamp icons manifest not found at:', manifestPath)
      return res.status(500).json({
        success: false,
        error: 'Stamp icons manifest not found',
        message: 'Please ensure manifest.json exists in uploads/icons/stamps/'
      })
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    let icons = manifest.icons || []
    if (category) {
      icons = icons.filter(icon => icon.category === category)
      logger.info(`📋 Filtered ${icons.length} icons for category: ${category}`)
    }

    logger.info(`✅ Served ${icons.length} stamp icon(s)`)

    res.json({
      success: true,
      icons,
      categories: manifest.categories || [],
      version: manifest.version,
      total: icons.length
    })
  } catch (error) {
    logger.error('❌ Failed to load stamp icons:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to load stamp icons',
      message: error.message
    })
  }
})

/**
 * GET /api/stamp-icons/:id
 * Get specific icon metadata
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const manifestPath = join(ICONS_BASE_PATH, 'manifest.json')

    if (!existsSync(manifestPath)) {
      return res.status(500).json({
        success: false,
        error: 'Stamp icons manifest not found'
      })
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    const icon = manifest.icons.find(i => i.id === id)

    if (!icon) {
      logger.warn(`⚠️ Icon not found: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Icon not found',
        message: `No icon with ID '${id}' found in manifest`
      })
    }

    logger.info(`✅ Served icon metadata: ${id}`)

    res.json({
      success: true,
      icon
    })
  } catch (error) {
    logger.error('❌ Failed to load icon:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to load icon',
      message: error.message
    })
  }
})

/**
 * GET /api/stamp-icons/:id/preview
 * Serve icon preview image (PNG)
 */
router.get('/:id/preview', (req, res) => {
  try {
    const { id } = req.params
    const manifestPath = join(ICONS_BASE_PATH, 'manifest.json')

    logger.info(`📥 Preview request for icon: ${id}`)
    logger.info(`📁 Base path: ${ICONS_BASE_PATH}`)
    logger.info(`📄 Manifest path: ${manifestPath}`)

    if (!existsSync(manifestPath)) {
      logger.error(`❌ Manifest not found at: ${manifestPath}`)
      return res.status(500).json({
        success: false,
        error: 'Stamp icons manifest not found'
      })
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    const icon = manifest.icons.find(i => i.id === id)

    if (!icon) {
      logger.warn(`⚠️ Icon not found in manifest: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Icon not found'
      })
    }

    logger.info(`✅ Icon found in manifest:`, { 
      id: icon.id, 
      name: icon.name,
      previewFile: icon.previewFile,
      filledFile: icon.filledFile
    })

    // Check if icon has required fields (legacy format validation)
    if (!icon.previewFile && !icon.filledFile && !icon.fileName) {
      logger.error(`❌ Icon missing required file fields: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Icon configuration incomplete',
        message: `Icon '${id}' is missing file information (previewFile, filledFile, or fileName)`
      })
    }

    // Try to find the preview file
    const previewFileName = icon.previewFile || `${id}-preview.png`
    const previewPath = join(ICONS_BASE_PATH, 'previews', previewFileName)
    logger.info(`🔍 Looking for preview at: ${previewPath}`)

    if (!existsSync(previewPath)) {
      logger.warn(`⚠️ Preview image not found at: ${previewPath}`)
      // Return the filled SVG as fallback
      const svgFileName = icon.filledFile || icon.fileName || `${id}-filled.svg`
      const filledSvgPath = join(ICONS_BASE_PATH, svgFileName)
      logger.info(`🔍 Looking for SVG fallback at: ${filledSvgPath}`)
      
      if (existsSync(filledSvgPath)) {
        logger.info(`🔄 Serving filled SVG as fallback for preview: ${id}`)
        res.setHeader('Content-Type', 'image/svg+xml')
        res.setHeader('Cache-Control', 'public, max-age=86400')
        return res.sendFile(filledSvgPath)
      }

      logger.error(`❌ Neither preview nor SVG found for: ${id}`)
      return res.status(404).json({
        success: false,
        error: 'Preview image not found',
        message: `Neither preview file '${previewFileName}' nor SVG file '${svgFileName}' exist for icon '${id}'`
      })
    }

    logger.info(`✅ Serving preview image: ${id} from ${previewPath}`)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.sendFile(previewPath)
  } catch (error) {
    logger.error('❌ Failed to load preview:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to load preview',
      message: error.message
    })
  }
})

export default router
