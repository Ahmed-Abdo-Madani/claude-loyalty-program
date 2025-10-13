import { OfferCardDesign, Offer, Business } from '../models/index.js'
import logger from '../config/logger.js'
import { Op } from 'sequelize'
import { getTemplateById } from '../constants/cardDesignTemplates.js'

/**
 * Card Design Service
 *
 * Handles all business logic for offer card designs including:
 * - CRUD operations
 * - Design validation
 * - Template management
 * - Business statistics
 */
class CardDesignService {
  /**
   * Create a new card design for an offer
   * @param {string} offerId - Offer public ID (off_*)
   * @param {object} designData - Design configuration
   * @returns {Promise<OfferCardDesign>}
   */
  static async createDesign(offerId, designData) {
    try {
      logger.info(`🎨 Creating card design for offer: ${offerId}`)

      // Validate offer exists
      const offer = await Offer.findByPk(offerId)
      if (!offer) {
        throw new Error(`Offer ${offerId} not found`)
      }

      // Check if design already exists
      const existingDesign = await OfferCardDesign.findByOfferId(offerId)
      if (existingDesign) {
        throw new Error(`Design already exists for offer ${offerId}. Use update instead.`)
      }

      // Create design
      const design = await OfferCardDesign.create({
        offer_id: offerId,
        business_id: offer.business_id,
        ...designData
      })

      logger.info(`✅ Card design created: ID ${design.id} for offer ${offerId}`)
      return design

    } catch (error) {
      logger.error(`❌ Failed to create card design for offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Update an existing card design
   * @param {string} offerId - Offer public ID
   * @param {object} updates - Fields to update
   * @returns {Promise<OfferCardDesign>}
   */
  static async updateDesign(offerId, updates) {
    try {
      logger.info(`🎨 Updating card design for offer: ${offerId}`)

      const design = await OfferCardDesign.findByOfferId(offerId)
      if (!design) {
        throw new Error(`No design found for offer ${offerId}`)
      }

      // Check if this is a significant change (increment version)
      const significantFields = ['background_color', 'foreground_color', 'logo_url', 'hero_image_url']
      const hasSignificantChange = significantFields.some(field =>
        updates[field] && updates[field] !== design[field]
      )

      if (hasSignificantChange) {
        updates.version = (design.version || 1) + 1
        logger.info(`📈 Incrementing design version to ${updates.version}`)
      }

      // Mark as custom if user changed values
      if (!design.is_custom && Object.keys(updates).length > 0) {
        updates.is_custom = true
        logger.info(`✏️ Marking design as custom`)
      }

      // Update design
      await design.update(updates)

      logger.info(`✅ Card design updated: ID ${design.id}`)
      return design

    } catch (error) {
      logger.error(`❌ Failed to update card design for offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Get card design by offer ID
   * @param {string} offerId - Offer public ID
   * @param {boolean} includeRelations - Include offer and business data
   * @returns {Promise<OfferCardDesign|null>}
   */
  static async getDesignByOffer(offerId, includeRelations = false) {
    try {
      const options = {
        where: { offer_id: offerId }
      }

      if (includeRelations) {
        options.include = [
          {
            model: Offer,
            as: 'offer',
            attributes: ['public_id', 'title', 'description', 'type', 'stamps_required']
          },
          {
            model: Business,
            as: 'business',
            attributes: ['public_id', 'business_name', 'logo_url']
          }
        ]
      }

      const design = await OfferCardDesign.findOne(options)

      if (design) {
        logger.info(`✅ Found card design for offer ${offerId}`)
      } else {
        logger.info(`ℹ️ No card design found for offer ${offerId}`)
      }

      return design

    } catch (error) {
      logger.error(`❌ Failed to get card design for offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Get all card designs for a business
   * @param {string} businessId - Business public ID
   * @param {object} options - Query options (limit, offset, filter)
   * @returns {Promise<{designs: OfferCardDesign[], total: number}>}
   */
  static async getDesignsByBusiness(businessId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        validationStatus = null,
        templateId = null
      } = options

      const where = { business_id: businessId }

      if (validationStatus) {
        where.validation_status = validationStatus
      }

      if (templateId) {
        where.template_id = templateId
      }

      const { rows: designs, count: total } = await OfferCardDesign.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Offer,
            as: 'offer',
            attributes: ['public_id', 'title', 'type', 'status']
          }
        ]
      })

      logger.info(`✅ Found ${designs.length} card designs for business ${businessId} (total: ${total})`)
      return { designs, total }

    } catch (error) {
      logger.error(`❌ Failed to get card designs for business ${businessId}:`, error)
      throw error
    }
  }

  /**
   * Delete a card design
   * @param {string} offerId - Offer public ID
   * @returns {Promise<boolean>}
   */
  static async deleteDesign(offerId) {
    try {
      logger.info(`🗑️ Deleting card design for offer: ${offerId}`)

      const design = await OfferCardDesign.findByOfferId(offerId)
      if (!design) {
        logger.warn(`⚠️ No design found for offer ${offerId}`)
        return false
      }

      await design.destroy()

      logger.info(`✅ Card design deleted for offer ${offerId}`)
      return true

    } catch (error) {
      logger.error(`❌ Failed to delete card design for offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Apply a template to an offer
   * @param {string} offerId - Offer public ID
   * @param {string} templateId - Template ID
   * @param {object} templateConfig - Template configuration
   * @returns {Promise<OfferCardDesign>}
   */
  static async applyTemplate(offerId, templateId, templateConfig) {
    try {
      logger.info(`🎨 Applying template ${templateId} to offer ${offerId}`)

      const offer = await Offer.findByPk(offerId)
      if (!offer) {
        throw new Error(`Offer ${offerId} not found`)
      }

      // Load template config if not provided
      let config = templateConfig
      if (!config || Object.keys(config).length === 0) {
        const template = getTemplateById(templateId)
        if (!template) {
          throw new Error(`Template ${templateId} not found`)
        }
        config = template.config
        logger.info(`📋 Loaded config from template: ${template.name}`)
      }

      const existingDesign = await OfferCardDesign.findByOfferId(offerId)

      const designData = {
        ...config,
        template_id: templateId,
        is_custom: false,  // Mark as non-custom (from template)
        version: existingDesign ? (existingDesign.version + 1) : 1
      }

      let design
      if (existingDesign) {
        // Update existing design
        design = await this.updateDesign(offerId, designData)
      } else {
        // Create new design
        design = await this.createDesign(offerId, designData)
      }

      logger.info(`✅ Template ${templateId} applied to offer ${offerId}`)
      return design

    } catch (error) {
      logger.error(`❌ Failed to apply template ${templateId} to offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Get or create default design for an offer
   * Used for backward compatibility when no design exists
   * @param {string} offerId - Offer public ID
   * @returns {Promise<object>} Design configuration (not saved to DB)
   */
  static async getOrCreateDefaultDesign(offerId) {
    try {
      // Try to get existing design
      const existingDesign = await this.getDesignByOffer(offerId)
      if (existingDesign) {
        return existingDesign.toJSON()
      }

      // Return default design (not saved to DB)
      logger.info(`ℹ️ Returning default design for offer ${offerId} (not saved)`)

      const offer = await Offer.findByPk(offerId, {
        include: [{
          model: Business,
          as: 'business',
          attributes: ['public_id', 'business_name', 'logo_url']
        }]
      })

      if (!offer) {
        throw new Error(`Offer ${offerId} not found`)
      }

      return {
        offer_id: offerId,
        business_id: offer.business_id,
        background_color: '#3B82F6',
        foreground_color: '#FFFFFF',
        label_color: '#E0F2FE',
        stamp_icon: '⭐',
        progress_display_style: 'bar',
        field_labels: {},
        google_wallet_config: {},
        apple_wallet_config: {},
        logo_url: offer.business?.logo_url || null,
        logo_google_url: offer.business?.logo_url || null,
        logo_apple_url: offer.business?.logo_url || null,
        hero_image_url: null,
        template_id: 'default',
        is_custom: false,
        version: 1,
        validation_status: 'pending',
        validation_errors: [],
        isDefault: true  // Flag to indicate this is a default design
      }

    } catch (error) {
      logger.error(`❌ Failed to get or create default design for offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Mark design as applied (updates last_applied_at timestamp)
   * @param {string} offerId - Offer public ID
   * @returns {Promise<OfferCardDesign>}
   */
  static async markDesignAsApplied(offerId) {
    try {
      const design = await OfferCardDesign.findByOfferId(offerId)
      if (!design) {
        logger.warn(`⚠️ No design found for offer ${offerId} to mark as applied`)
        return null
      }

      await design.markAsApplied()
      logger.info(`✅ Marked design as applied for offer ${offerId}`)
      return design

    } catch (error) {
      logger.error(`❌ Failed to mark design as applied for offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Get business statistics for card designs
   * @param {string} businessId - Business public ID
   * @returns {Promise<object>}
   */
  static async getBusinessStats(businessId) {
    try {
      const stats = await OfferCardDesign.getBusinessStats(businessId)
      logger.info(`✅ Retrieved design stats for business ${businessId}`)
      return stats

    } catch (error) {
      logger.error(`❌ Failed to get design stats for business ${businessId}:`, error)
      throw error
    }
  }

  /**
   * Validate design compliance with wallet platform guidelines
   * @param {string} offerId - Offer public ID
   * @returns {Promise<{isValid: boolean, warnings: Array, errors: Array}>}
   */
  static async validateDesign(offerId) {
    try {
      const design = await OfferCardDesign.findByOfferId(offerId)
      if (!design) {
        throw new Error(`No design found for offer ${offerId}`)
      }

      const errors = []
      const warnings = []

      // Color validation
      const hexRegex = /^#[0-9A-F]{6}$/i
      if (!hexRegex.test(design.background_color)) {
        errors.push({ field: 'background_color', message: 'Invalid hex color format' })
      }
      if (!hexRegex.test(design.foreground_color)) {
        errors.push({ field: 'foreground_color', message: 'Invalid hex color format' })
      }
      if (!hexRegex.test(design.label_color)) {
        errors.push({ field: 'label_color', message: 'Invalid hex color format' })
      }

      // Image size validation (if URLs exist, they should be valid)
      if (design.logo_url && !design.logo_google_url) {
        warnings.push({ field: 'logo_google_url', message: 'Google Wallet logo not processed' })
      }
      if (design.logo_url && !design.logo_apple_url) {
        warnings.push({ field: 'logo_apple_url', message: 'Apple Wallet logo not processed' })
      }

      // File size warnings
      if (design.logo_file_size && design.logo_file_size > 200000) {
        warnings.push({ field: 'logo_file_size', message: 'Logo file size exceeds 200KB recommendation' })
      }
      if (design.hero_file_size && design.hero_file_size > 500000) {
        warnings.push({ field: 'hero_file_size', message: 'Hero image file size exceeds 500KB recommendation' })
      }

      // Update validation status
      const validationStatus = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid'
      await design.update({
        validation_status: validationStatus,
        validation_errors: [...errors, ...warnings]
      })

      logger.info(`✅ Design validation complete for offer ${offerId}: ${validationStatus}`)

      return {
        isValid: validationStatus === 'valid',
        hasWarnings: warnings.length > 0,
        hasErrors: errors.length > 0,
        errors,
        warnings
      }

    } catch (error) {
      logger.error(`❌ Failed to validate design for offer ${offerId}:`, error)
      throw error
    }
  }

  /**
   * Duplicate design from one offer to another
   * @param {string} sourceOfferId - Source offer public ID
   * @param {string} targetOfferId - Target offer public ID
   * @returns {Promise<OfferCardDesign>}
   */
  static async duplicateDesign(sourceOfferId, targetOfferId) {
    try {
      logger.info(`📋 Duplicating design from ${sourceOfferId} to ${targetOfferId}`)

      const sourceDesign = await this.getDesignByOffer(sourceOfferId)
      if (!sourceDesign) {
        throw new Error(`No design found for source offer ${sourceOfferId}`)
      }

      const targetOffer = await Offer.findByPk(targetOfferId)
      if (!targetOffer) {
        throw new Error(`Target offer ${targetOfferId} not found`)
      }

      // Create new design with same configuration
      const designData = sourceDesign.toJSON()
      delete designData.id
      delete designData.offer_id
      delete designData.last_applied_at
      delete designData.created_at
      delete designData.updated_at
      designData.offer_id = targetOfferId
      designData.business_id = targetOffer.business_id
      designData.version = 1  // Reset version for new offer

      const newDesign = await this.createDesign(targetOfferId, designData)

      logger.info(`✅ Design duplicated to offer ${targetOfferId}`)
      return newDesign

    } catch (error) {
      logger.error(`❌ Failed to duplicate design from ${sourceOfferId} to ${targetOfferId}:`, error)
      throw error
    }
  }
}

export default CardDesignService
