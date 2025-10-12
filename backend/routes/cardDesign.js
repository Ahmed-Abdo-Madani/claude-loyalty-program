import express from 'express'
import multer from 'multer'
import CardDesignService from '../services/CardDesignService.js'
import ImageProcessingService from '../services/ImageProcessingService.js'
import DesignValidationService from '../services/DesignValidationService.js'
import { requireBusinessAuth } from '../middleware/hybridBusinessAuth.js'
import logger from '../config/logger.js'

const router = express.Router()

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024  // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'))
    }
  }
})

// ============================================================================
// Design CRUD Operations
// ============================================================================

/**
 * GET /api/card-design/offer/:offerId
 * Get card design for an offer
 */
router.get('/offer/:offerId', requireBusinessAuth, async (req, res) => {
  try {
    const { offerId } = req.params
    const { includeRelations } = req.query

    logger.info(`📖 GET card design for offer: ${offerId}`)

    const design = await CardDesignService.getDesignByOffer(
      offerId,
      includeRelations === 'true'
    )

    if (!design) {
      // Return default design for backward compatibility
      const defaultDesign = await CardDesignService.getOrCreateDefaultDesign(offerId)
      return res.json({
        success: true,
        data: defaultDesign,
        isDefault: true,
        message: 'Using default design (no custom design saved)'
      })
    }

    res.json({
      success: true,
      data: design,
      isDefault: false
    })

  } catch (error) {
    logger.error('❌ Failed to get card design:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/card-design/offer/:offerId
 * Create or update card design for an offer
 */
router.post('/offer/:offerId', requireBusinessAuth, async (req, res) => {
  try {
    const { offerId } = req.params
    const designData = req.body

    logger.info(`💾 Create/Update card design for offer: ${offerId}`)

    // Check if design exists
    const existingDesign = await CardDesignService.getDesignByOffer(offerId)

    let design
    if (existingDesign) {
      // Update existing design
      design = await CardDesignService.updateDesign(offerId, designData)
      logger.info(`✅ Card design updated for offer ${offerId}`)
    } else {
      // Create new design
      design = await CardDesignService.createDesign(offerId, designData)
      logger.info(`✅ Card design created for offer ${offerId}`)
    }

    // Validate design
    const validation = await CardDesignService.validateDesign(offerId)

    res.json({
      success: true,
      data: design,
      validation,
      message: existingDesign ? 'Design updated successfully' : 'Design created successfully'
    })

  } catch (error) {
    logger.error('❌ Failed to save card design:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/card-design/offer/:offerId
 * Delete card design for an offer
 */
router.delete('/offer/:offerId', requireBusinessAuth, async (req, res) => {
  try {
    const { offerId } = req.params

    logger.info(`🗑️ Delete card design for offer: ${offerId}`)

    const deleted = await CardDesignService.deleteDesign(offerId)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      })
    }

    res.json({
      success: true,
      message: 'Design deleted successfully'
    })

  } catch (error) {
    logger.error('❌ Failed to delete card design:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/card-design/business/:businessId
 * Get all card designs for a business
 */
router.get('/business/:businessId', requireBusinessAuth, async (req, res) => {
  try {
    const { businessId } = req.params
    const { limit, offset, validationStatus, templateId } = req.query

    logger.info(`📖 GET card designs for business: ${businessId}`)

    const result = await CardDesignService.getDesignsByBusiness(businessId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      validationStatus,
      templateId
    })

    res.json({
      success: true,
      data: result.designs,
      total: result.total,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    })

  } catch (error) {
    logger.error('❌ Failed to get business card designs:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ============================================================================
// Image Upload & Processing
// ============================================================================

/**
 * POST /api/card-design/upload/logo
 * Upload and process logo for wallet passes
 */
router.post('/upload/logo', requireBusinessAuth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    logger.info(`📤 Processing logo upload: ${req.file.originalname}`)

    // Validate image
    const validation = await ImageProcessingService.validateImage(req.file.buffer, {
      minWidth: 200,
      minHeight: 200,
      maxSizeBytes: 5 * 1024 * 1024  // 5MB
    })

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Image validation failed',
        details: validation.errors
      })
    }

    // Process logo for both platforms
    const processedLogos = await ImageProcessingService.processLogoComplete(
      req.file.buffer,
      req.file.originalname
    )

    // Extract dominant color for auto-suggestion
    const dominantColor = await ImageProcessingService.extractDominantColor(req.file.buffer)

    res.json({
      success: true,
      data: {
        original: processedLogos.original,
        google: processedLogos.google,
        apple: processedLogos.apple,
        suggestedColor: dominantColor,
        metadata: validation.metadata
      },
      message: 'Logo processed successfully'
    })

  } catch (error) {
    logger.error('❌ Logo upload failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/card-design/upload/hero
 * Upload and process hero image
 */
router.post('/upload/hero', requireBusinessAuth, upload.single('hero'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    logger.info(`📤 Processing hero image upload: ${req.file.originalname}`)

    // Validate image
    const validation = await ImageProcessingService.validateImage(req.file.buffer, {
      minWidth: 500,
      minHeight: 200,
      maxSizeBytes: 10 * 1024 * 1024  // 10MB for hero images
    })

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Image validation failed',
        details: validation.errors
      })
    }

    // Process hero image
    const processedHero = await ImageProcessingService.processHeroImage(
      req.file.buffer,
      req.file.originalname
    )

    res.json({
      success: true,
      data: processedHero,
      message: 'Hero image processed successfully'
    })

  } catch (error) {
    logger.error('❌ Hero image upload failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ============================================================================
// Validation
// ============================================================================

/**
 * POST /api/card-design/validate
 * Validate a design configuration (before saving)
 */
router.post('/validate', requireBusinessAuth, async (req, res) => {
  try {
    const designData = req.body

    logger.info('🔍 Validating card design...')

    const validation = DesignValidationService.validateDesign(designData)

    res.json({
      success: true,
      validation,
      message: validation.isValid ? 'Design is valid' : 'Design has validation errors'
    })

  } catch (error) {
    logger.error('❌ Design validation failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/card-design/validate-contrast
 * Check color contrast ratio
 */
router.post('/validate-contrast', requireBusinessAuth, async (req, res) => {
  try {
    const { backgroundColor, foregroundColor } = req.body

    if (!backgroundColor || !foregroundColor) {
      return res.status(400).json({
        success: false,
        error: 'backgroundColor and foregroundColor are required'
      })
    }

    logger.info(`🎨 Checking contrast: ${backgroundColor} vs ${foregroundColor}`)

    const contrastResult = DesignValidationService.validateColorContrast(
      backgroundColor,
      foregroundColor
    )

    res.json({
      success: true,
      data: contrastResult,
      message: contrastResult.isValid
        ? `Good contrast (${contrastResult.ratio}:1, ${contrastResult.level})`
        : `Low contrast (${contrastResult.ratio}:1) - improve for better readability`
    })

  } catch (error) {
    logger.error('❌ Contrast validation failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ============================================================================
// Templates
// ============================================================================

/**
 * GET /api/card-design/templates
 * Get available design templates
 */
router.get('/templates', requireBusinessAuth, async (req, res) => {
  try {
    logger.info('📚 Getting design templates...')

    // Define built-in templates
    const templates = [
      {
        id: 'coffee_classic',
        name: 'Coffee Shop Classic',
        description: 'Perfect for coffee shops and cafes',
        industry: 'coffee',
        config: {
          background_color: '#6F4E37',
          foreground_color: '#FFFFFF',
          label_color: '#FFF8DC',
          stamp_icon: '☕',
          progress_display_style: 'grid'
        },
        preview_image: '/templates/coffee-classic.png'
      },
      {
        id: 'restaurant_rewards',
        name: 'Restaurant Rewards',
        description: 'Elegant design for restaurants',
        industry: 'restaurant',
        config: {
          background_color: '#DC2626',
          foreground_color: '#FFFFFF',
          label_color: '#FEE2E2',
          stamp_icon: '🍽️',
          progress_display_style: 'bar'
        },
        preview_image: '/templates/restaurant-rewards.png'
      },
      {
        id: 'retail_rewards',
        name: 'Retail Rewards',
        description: 'Professional design for retail stores',
        industry: 'retail',
        config: {
          background_color: '#2563EB',
          foreground_color: '#FFFFFF',
          label_color: '#BFDBFE',
          stamp_icon: '🛍️',
          progress_display_style: 'bar'
        },
        preview_image: '/templates/retail-rewards.png'
      },
      {
        id: 'beauty_wellness',
        name: 'Beauty & Wellness',
        description: 'Stylish design for beauty salons and spas',
        industry: 'beauty',
        config: {
          background_color: '#EC4899',
          foreground_color: '#FFFFFF',
          label_color: '#FCE7F3',
          stamp_icon: '💆',
          progress_display_style: 'circular'
        },
        preview_image: '/templates/beauty-wellness.png'
      },
      {
        id: 'fitness_gym',
        name: 'Fitness & Gym',
        description: 'Energetic design for fitness centers',
        industry: 'fitness',
        config: {
          background_color: '#F97316',
          foreground_color: '#FFFFFF',
          label_color: '#FFEDD5',
          stamp_icon: '💪',
          progress_display_style: 'grid'
        },
        preview_image: '/templates/fitness-gym.png'
      },
      {
        id: 'professional_default',
        name: 'Professional Default',
        description: 'Clean, professional design for any business',
        industry: 'general',
        config: {
          background_color: '#1E40AF',
          foreground_color: '#FFFFFF',
          label_color: '#DBEAFE',
          stamp_icon: '⭐',
          progress_display_style: 'bar'
        },
        preview_image: '/templates/professional-default.png'
      },
      // Phase 3: Additional Templates
      {
        id: 'hotel_hospitality',
        name: 'Hotel & Hospitality',
        description: 'Luxurious design for hotels and hospitality',
        industry: 'hotel',
        config: {
          background_color: '#7C3AED',
          foreground_color: '#FFFFFF',
          label_color: '#EDE9FE',
          stamp_icon: '🏨',
          progress_display_style: 'bar'
        },
        preview_image: '/templates/hotel-hospitality.png'
      },
      {
        id: 'auto_service',
        name: 'Auto Service',
        description: 'Bold design for car washes and auto shops',
        industry: 'automotive',
        config: {
          background_color: '#0891B2',
          foreground_color: '#FFFFFF',
          label_color: '#CFFAFE',
          stamp_icon: '🚗',
          progress_display_style: 'grid'
        },
        preview_image: '/templates/auto-service.png'
      },
      {
        id: 'food_delivery',
        name: 'Food Delivery',
        description: 'Fresh design for food delivery services',
        industry: 'food',
        config: {
          background_color: '#EAB308',
          foreground_color: '#FFFFFF',
          label_color: '#FEF3C7',
          stamp_icon: '🍕',
          progress_display_style: 'bar'
        },
        preview_image: '/templates/food-delivery.png'
      },
      {
        id: 'pet_services',
        name: 'Pet Services',
        description: 'Playful design for pet shops and grooming',
        industry: 'pets',
        config: {
          background_color: '#10B981',
          foreground_color: '#FFFFFF',
          label_color: '#D1FAE5',
          stamp_icon: '🐾',
          progress_display_style: 'grid'
        },
        preview_image: '/templates/pet-services.png'
      }
    ]

    res.json({
      success: true,
      data: templates,
      total: templates.length
    })

  } catch (error) {
    logger.error('❌ Failed to get templates:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/card-design/apply-template/:offerId
 * Apply a template to an offer
 */
router.post('/apply-template/:offerId', requireBusinessAuth, async (req, res) => {
  try {
    const { offerId } = req.params
    const { templateId, templateConfig } = req.body

    if (!templateId || !templateConfig) {
      return res.status(400).json({
        success: false,
        error: 'templateId and templateConfig are required'
      })
    }

    logger.info(`🎨 Applying template ${templateId} to offer ${offerId}`)

    const design = await CardDesignService.applyTemplate(
      offerId,
      templateId,
      templateConfig
    )

    res.json({
      success: true,
      data: design,
      message: 'Template applied successfully'
    })

  } catch (error) {
    logger.error('❌ Failed to apply template:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ============================================================================
// Utility Routes
// ============================================================================

/**
 * POST /api/card-design/duplicate/:sourceOfferId/:targetOfferId
 * Duplicate design from one offer to another
 */
router.post('/duplicate/:sourceOfferId/:targetOfferId', requireBusinessAuth, async (req, res) => {
  try {
    const { sourceOfferId, targetOfferId } = req.params

    logger.info(`📋 Duplicating design from ${sourceOfferId} to ${targetOfferId}`)

    const design = await CardDesignService.duplicateDesign(sourceOfferId, targetOfferId)

    res.json({
      success: true,
      data: design,
      message: 'Design duplicated successfully'
    })

  } catch (error) {
    logger.error('❌ Failed to duplicate design:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/card-design/stats/:businessId
 * Get design statistics for a business
 */
router.get('/stats/:businessId', requireBusinessAuth, async (req, res) => {
  try {
    const { businessId } = req.params

    logger.info(`📊 Getting design stats for business: ${businessId}`)

    const stats = await CardDesignService.getBusinessStats(businessId)

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    logger.error('❌ Failed to get design stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Error handler for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB for logos, 10MB for hero images.'
      })
    }
  }
  next(error)
})

export default router
