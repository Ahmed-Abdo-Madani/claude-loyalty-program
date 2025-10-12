import { DataTypes, Op } from 'sequelize'
import sequelize from '../config/database.js'

const OfferCardDesign = sequelize.define('OfferCardDesign', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // Relationships
  offer_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,  // One design per offer (MVP - will relax for A/B testing)
    references: {
      model: 'offers',
      key: 'public_id'
    },
    comment: 'Offer ID (off_*) - one design per offer'
  },
  business_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'public_id'
    },
    comment: 'Business ID (biz_*)'
  },

  // Visual Design Assets
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Original uploaded logo URL'
  },
  logo_google_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Processed logo for Google Wallet (circular, 660x660px min)'
  },
  logo_apple_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Processed logo for Apple Wallet (rectangular, 160x50px)'
  },
  hero_image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Full-width banner image (1032x336px optimal)'
  },

  // Color Scheme (Hex format #RRGGBB)
  background_color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#3B82F6',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    },
    comment: 'Background color in hex format'
  },
  foreground_color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#FFFFFF',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    },
    comment: 'Foreground/text color in hex format'
  },
  label_color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#E0F2FE',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    },
    comment: 'Label color in hex format'
  },

  // Layout Preferences
  stamp_icon: {
    type: DataTypes.STRING(10),
    defaultValue: '⭐',
    comment: 'Emoji or symbol representing each stamp'
  },
  progress_display_style: {
    type: DataTypes.ENUM('bar', 'grid', 'circular'),
    defaultValue: 'bar',
    comment: 'How progress is visually displayed'
  },

  // Field Customization (JSONB)
  field_labels: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Custom labels for wallet pass fields (e.g., {"progress": "Stamps Collected"})'
  },

  // Platform-Specific Overrides
  google_wallet_config: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Platform-specific settings for Google Wallet'
  },
  apple_wallet_config: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Platform-specific settings for Apple Wallet'
  },

  // Template & Versioning
  template_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Reference to template used (e.g., coffee_classic)'
  },
  is_custom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True if user customized beyond template'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Design version number (incremented on significant changes)'
  },

  // Validation & Compliance
  contrast_score: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'WCAG contrast ratio between background and foreground'
  },
  validation_status: {
    type: DataTypes.ENUM('valid', 'warning', 'error', 'pending'),
    defaultValue: 'pending',
    comment: 'Design compliance status'
  },
  validation_errors: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'List of validation errors or warnings'
  },

  // Asset Metadata
  logo_file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Logo file size in bytes'
  },
  hero_file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Hero image file size in bytes'
  },

  // Timestamps
  last_applied_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this design was last used to generate a wallet pass'
  }
}, {
  tableName: 'offer_card_designs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['offer_id'],
      name: 'unique_offer_design'
    },
    {
      fields: ['business_id'],
      name: 'idx_offer_card_designs_business'
    },
    {
      fields: ['template_id'],
      name: 'idx_offer_card_designs_template'
    },
    {
      fields: ['validation_status'],
      name: 'idx_offer_card_designs_validation'
    },
    {
      fields: [['created_at', 'DESC']],
      name: 'idx_offer_card_designs_created'
    }
  ]
})

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * Check if design is valid and ready to use
 * @returns {boolean}
 */
OfferCardDesign.prototype.isValid = function() {
  return this.validation_status === 'valid'
}

/**
 * Check if design has warnings but is still usable
 * @returns {boolean}
 */
OfferCardDesign.prototype.hasWarnings = function() {
  return this.validation_status === 'warning'
}

/**
 * Check if design has critical errors
 * @returns {boolean}
 */
OfferCardDesign.prototype.hasErrors = function() {
  return this.validation_status === 'error'
}

/**
 * Mark design as applied (update last_applied_at timestamp)
 */
OfferCardDesign.prototype.markAsApplied = async function() {
  this.last_applied_at = new Date()
  await this.save()
  return this
}

/**
 * Increment version number (call when significant changes are made)
 */
OfferCardDesign.prototype.incrementVersion = async function() {
  this.version = (this.version || 1) + 1
  await this.save()
  return this
}

/**
 * Check if design has any uploaded images
 * @returns {boolean}
 */
OfferCardDesign.prototype.hasImages = function() {
  return !!(this.logo_url || this.hero_image_url)
}

/**
 * Check if design uses a template
 * @returns {boolean}
 */
OfferCardDesign.prototype.isFromTemplate = function() {
  return !!this.template_id
}

/**
 * Get validation summary
 * @returns {object} { isValid, hasWarnings, hasErrors, errorCount }
 */
OfferCardDesign.prototype.getValidationSummary = function() {
  return {
    isValid: this.isValid(),
    hasWarnings: this.hasWarnings(),
    hasErrors: this.hasErrors(),
    errorCount: Array.isArray(this.validation_errors) ? this.validation_errors.length : 0,
    errors: this.validation_errors || []
  }
}

/**
 * Convert hex color to RGB format for Apple Wallet
 * @param {string} hexColor - Hex color (e.g., '#3B82F6')
 * @returns {string} RGB format (e.g., 'rgb(59, 130, 246)')
 */
OfferCardDesign.prototype.hexToRgb = function(hexColor) {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Get colors formatted for Apple Wallet (RGB)
 * @returns {object} { backgroundColor, foregroundColor, labelColor }
 */
OfferCardDesign.prototype.getAppleWalletColors = function() {
  return {
    backgroundColor: this.hexToRgb(this.background_color),
    foregroundColor: this.hexToRgb(this.foreground_color),
    labelColor: this.hexToRgb(this.label_color)
  }
}

/**
 * Get colors formatted for Google Wallet (Hex)
 * @returns {object} { hexBackgroundColor }
 */
OfferCardDesign.prototype.getGoogleWalletColors = function() {
  return {
    hexBackgroundColor: this.background_color
  }
}

// ============================================================================
// Static Methods
// ============================================================================

/**
 * Find design by offer ID
 * @param {string} offerId - Offer public ID (off_*)
 * @returns {Promise<OfferCardDesign|null>}
 */
OfferCardDesign.findByOfferId = async function(offerId) {
  return await this.findOne({
    where: { offer_id: offerId }
  })
}

/**
 * Find all designs for a business
 * @param {string} businessId - Business public ID (biz_*)
 * @returns {Promise<OfferCardDesign[]>}
 */
OfferCardDesign.findByBusinessId = async function(businessId) {
  return await this.findAll({
    where: { business_id: businessId },
    order: [['created_at', 'DESC']]
  })
}

/**
 * Find designs using a specific template
 * @param {string} templateId - Template ID
 * @returns {Promise<OfferCardDesign[]>}
 */
OfferCardDesign.findByTemplate = async function(templateId) {
  return await this.findAll({
    where: { template_id: templateId },
    order: [['created_at', 'DESC']]
  })
}

/**
 * Count designs by validation status
 * @param {string} businessId - Business public ID (optional)
 * @returns {Promise<object>} { valid, warning, error, pending }
 */
OfferCardDesign.countByValidationStatus = async function(businessId = null) {
  const where = businessId ? { business_id: businessId } : {}

  const counts = await this.findAll({
    where,
    attributes: [
      'validation_status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['validation_status'],
    raw: true
  })

  const result = { valid: 0, warning: 0, error: 0, pending: 0 }
  counts.forEach(row => {
    result[row.validation_status] = parseInt(row.count)
  })

  return result
}

/**
 * Get design statistics for a business
 * @param {string} businessId - Business public ID
 * @returns {Promise<object>}
 */
OfferCardDesign.getBusinessStats = async function(businessId) {
  const totalDesigns = await this.count({
    where: { business_id: businessId }
  })

  const customDesigns = await this.count({
    where: {
      business_id: businessId,
      is_custom: true
    }
  })

  const designsWithImages = await this.count({
    where: {
      business_id: businessId,
      [sequelize.Op.or]: [
        { logo_url: { [sequelize.Op.ne]: null } },
        { hero_image_url: { [sequelize.Op.ne]: null } }
      ]
    }
  })

  const validationCounts = await this.countByValidationStatus(businessId)

  return {
    totalDesigns,
    customDesigns,
    templateDesigns: totalDesigns - customDesigns,
    designsWithImages,
    validationStatus: validationCounts
  }
}

export default OfferCardDesign
