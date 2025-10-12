import logger from '../config/logger.js'

/**
 * Design Validation Service
 *
 * Validates card designs against Google Wallet and Apple Wallet guidelines:
 * - Color contrast compliance (WCAG standards)
 * - Image specifications
 * - Text length limits
 * - Field requirements
 * - Platform-specific rules
 */
class DesignValidationService {
  /**
   * Validate complete card design
   * @param {object} design - Design configuration
   * @returns {object} { isValid, hasWarnings, hasErrors, errors, warnings }
   */
  static validateDesign(design) {
    const errors = []
    const warnings = []

    // Color validation
    const colorValidation = this.validateColors(design)
    errors.push(...colorValidation.errors)
    warnings.push(...colorValidation.warnings)

    // Contrast validation
    const contrastValidation = this.validateColorContrast(
      design.background_color,
      design.foreground_color
    )
    if (!contrastValidation.isValid) {
      errors.push({
        field: 'color_contrast',
        message: `Low contrast ratio (${contrastValidation.ratio}:1). WCAG AA requires minimum 4.5:1`,
        severity: 'error'
      })
    } else if (contrastValidation.ratio < 7) {
      warnings.push({
        field: 'color_contrast',
        message: `Good contrast (${contrastValidation.ratio}:1) but AAA standard recommends 7:1 for best readability`,
        severity: 'warning'
      })
    }

    // Image validation
    const imageValidation = this.validateImages(design)
    errors.push(...imageValidation.errors)
    warnings.push(...imageValidation.warnings)

    // Field labels validation
    const fieldValidation = this.validateFieldLabels(design.field_labels || {})
    errors.push(...fieldValidation.errors)
    warnings.push(...fieldValidation.warnings)

    // Platform-specific validation
    const googleValidation = this.validateGoogleWalletDesign(design)
    errors.push(...googleValidation.errors)
    warnings.push(...googleValidation.warnings)

    const appleValidation = this.validateAppleWalletDesign(design)
    errors.push(...appleValidation.errors)
    warnings.push(...appleValidation.warnings)

    const isValid = errors.length === 0
    const hasWarnings = warnings.length > 0
    const hasErrors = errors.length > 0

    logger.info(`🔍 Design validation complete: ${isValid ? 'VALID' : 'INVALID'} (${errors.length} errors, ${warnings.length} warnings)`)

    return {
      isValid,
      hasWarnings,
      hasErrors,
      errors,
      warnings,
      summary: {
        totalIssues: errors.length + warnings.length,
        criticalIssues: errors.length,
        nonCriticalIssues: warnings.length
      }
    }
  }

  /**
   * Validate color formats
   * @param {object} design - Design configuration
   * @returns {object} { errors, warnings }
   */
  static validateColors(design) {
    const errors = []
    const warnings = []
    const hexRegex = /^#[0-9A-F]{6}$/i

    const colorFields = ['background_color', 'foreground_color', 'label_color']

    colorFields.forEach(field => {
      const color = design[field]
      if (!color) {
        errors.push({
          field,
          message: `${field} is required`,
          severity: 'error'
        })
      } else if (!hexRegex.test(color)) {
        errors.push({
          field,
          message: `${field} must be in hex format (#RRGGBB)`,
          severity: 'error'
        })
      }
    })

    // Check for very similar colors (might be confusing)
    if (design.background_color && design.foreground_color) {
      const similarity = this.calculateColorSimilarity(
        design.background_color,
        design.foreground_color
      )
      if (similarity > 0.9) {
        warnings.push({
          field: 'color_similarity',
          message: 'Background and foreground colors are very similar - may cause visibility issues',
          severity: 'warning'
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Validate color contrast (WCAG compliance)
   * @param {string} bgColor - Background color (#RRGGBB)
   * @param {string} fgColor - Foreground color (#RRGGBB)
   * @returns {object} { isValid, ratio, level }
   */
  static validateColorContrast(bgColor, fgColor) {
    try {
      const ratio = this.calculateContrastRatio(bgColor, fgColor)

      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
      // WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
      const wcagAA = ratio >= 4.5
      const wcagAAA = ratio >= 7

      return {
        isValid: wcagAA,
        ratio: ratio.toFixed(2),
        level: wcagAAA ? 'AAA' : wcagAA ? 'AA' : 'Fail',
        meetsAA: wcagAA,
        meetsAAA: wcagAAA
      }

    } catch (error) {
      logger.error('❌ Failed to calculate contrast ratio:', error)
      return {
        isValid: false,
        ratio: 0,
        level: 'Error'
      }
    }
  }

  /**
   * Calculate contrast ratio between two colors
   * @param {string} color1 - Hex color
   * @param {string} color2 - Hex color
   * @returns {number} Contrast ratio
   */
  static calculateContrastRatio(color1, color2) {
    const luminance1 = this.getRelativeLuminance(color1)
    const luminance2 = this.getRelativeLuminance(color2)

    const lighter = Math.max(luminance1, luminance2)
    const darker = Math.min(luminance1, luminance2)

    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * Get relative luminance of a color
   * @param {string} hexColor - Hex color
   * @returns {number} Relative luminance
   */
  static getRelativeLuminance(hexColor) {
    const rgb = this.hexToRgb(hexColor)

    const rsRGB = rgb.r / 255
    const gsRGB = rgb.g / 255
    const bsRGB = rgb.b / 255

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color (#RRGGBB)
   * @returns {object} { r, g, b }
   */
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  /**
   * Calculate color similarity (0-1, where 1 is identical)
   * @param {string} color1 - Hex color
   * @param {string} color2 - Hex color
   * @returns {number} Similarity score
   */
  static calculateColorSimilarity(color1, color2) {
    const rgb1 = this.hexToRgb(color1)
    const rgb2 = this.hexToRgb(color2)

    const rDiff = Math.abs(rgb1.r - rgb2.r) / 255
    const gDiff = Math.abs(rgb1.g - rgb2.g) / 255
    const bDiff = Math.abs(rgb1.b - rgb2.b) / 255

    const avgDiff = (rDiff + gDiff + bDiff) / 3

    return 1 - avgDiff
  }

  /**
   * Validate image specifications
   * @param {object} design - Design configuration
   * @returns {object} { errors, warnings }
   */
  static validateImages(design) {
    const errors = []
    const warnings = []

    // Logo validation
    if (design.logo_url) {
      if (!design.logo_google_url) {
        warnings.push({
          field: 'logo_google_url',
          message: 'Google Wallet logo not processed. Upload logo to auto-generate',
          severity: 'warning'
        })
      }

      if (!design.logo_apple_url) {
        warnings.push({
          field: 'logo_apple_url',
          message: 'Apple Wallet logo not processed. Upload logo to auto-generate',
          severity: 'warning'
        })
      }
    }

    // File size validation
    if (design.logo_file_size) {
      const logoSizeKB = design.logo_file_size / 1024
      if (logoSizeKB > 200) {
        warnings.push({
          field: 'logo_file_size',
          message: `Logo file size (${logoSizeKB.toFixed(2)}KB) exceeds 200KB recommendation`,
          severity: 'warning'
        })
      }
    }

    if (design.hero_file_size) {
      const heroSizeKB = design.hero_file_size / 1024
      if (heroSizeKB > 500) {
        warnings.push({
          field: 'hero_file_size',
          message: `Hero image file size (${heroSizeKB.toFixed(2)}KB) exceeds 500KB recommendation`,
          severity: 'warning'
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Validate field labels
   * @param {object} fieldLabels - Custom field labels
   * @returns {object} { errors, warnings }
   */
  static validateFieldLabels(fieldLabels) {
    const errors = []
    const warnings = []

    const maxLengths = {
      progress: 30,
      reward: 50,
      location: 40,
      customer_name: 40,
      terms: 500
    }

    Object.entries(fieldLabels).forEach(([field, label]) => {
      if (typeof label !== 'string') {
        errors.push({
          field: `field_labels.${field}`,
          message: `Label for ${field} must be a string`,
          severity: 'error'
        })
        return
      }

      const maxLength = maxLengths[field] || 50
      if (label.length > maxLength) {
        warnings.push({
          field: `field_labels.${field}`,
          message: `Label "${label}" exceeds recommended length of ${maxLength} characters (${label.length} chars)`,
          severity: 'warning'
        })
      }
    })

    return { errors, warnings }
  }

  /**
   * Validate Google Wallet specific requirements
   * @param {object} design - Design configuration
   * @returns {object} { errors, warnings }
   */
  static validateGoogleWalletDesign(design) {
    const errors = []
    const warnings = []

    // Logo requirements
    if (design.logo_google_url) {
      // Google Wallet displays logos in a circular mask
      // Minimum: 660x660px
      warnings.push({
        field: 'google_wallet',
        message: 'Ensure logo looks good in circular shape (Google Wallet uses circular mask)',
        severity: 'info'
      })
    }

    // Background color
    if (design.background_color) {
      // Very dark or very light backgrounds might not work well
      const luminance = this.getRelativeLuminance(design.background_color)
      if (luminance < 0.01) {
        warnings.push({
          field: 'background_color',
          message: 'Very dark background might not display well on all devices',
          severity: 'warning'
        })
      }
    }

    // Text length in Google Wallet
    if (design.google_wallet_config?.programDetails && design.google_wallet_config.programDetails.length > 100) {
      warnings.push({
        field: 'google_wallet_config.programDetails',
        message: 'Program details exceed 100 characters - may be truncated on small screens',
        severity: 'warning'
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate Apple Wallet specific requirements
   * @param {object} design - Design configuration
   * @returns {object} { errors, warnings }
   */
  static validateAppleWalletDesign(design) {
    const errors = []
    const warnings = []

    // Logo requirements
    if (design.logo_apple_url) {
      // Apple Wallet uses rectangular logo (160x50px for 1x)
      warnings.push({
        field: 'apple_wallet',
        message: 'Ensure logo is readable at small size (160x50px on standard displays)',
        severity: 'info'
      })
    }

    // Color format (Apple Wallet uses RGB, but we convert from hex)
    // No validation needed as we handle conversion

    // Field character limits
    if (design.apple_wallet_config) {
      const config = design.apple_wallet_config

      if (config.logoText && config.logoText.length > 20) {
        warnings.push({
          field: 'apple_wallet_config.logoText',
          message: 'Logo text exceeds 20 characters - may be truncated',
          severity: 'warning'
        })
      }

      if (config.description && config.description.length > 100) {
        warnings.push({
          field: 'apple_wallet_config.description',
          message: 'Description exceeds 100 characters - may be truncated',
          severity: 'warning'
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Suggest improved color based on contrast requirements
   * @param {string} bgColor - Background color
   * @param {string} targetColor - Color to adjust
   * @returns {string} Suggested color
   */
  static suggestBetterContrast(bgColor, targetColor) {
    const bgLuminance = this.getRelativeLuminance(bgColor)

    // If background is dark, suggest lighter foreground
    // If background is light, suggest darker foreground
    if (bgLuminance < 0.5) {
      return '#FFFFFF'  // White for dark backgrounds
    } else {
      return '#000000'  // Black for light backgrounds
    }
  }

  /**
   * Get validation summary as human-readable string
   * @param {object} validationResult - Result from validateDesign()
   * @returns {string}
   */
  static getValidationSummary(validationResult) {
    const { isValid, errors, warnings } = validationResult

    if (isValid && warnings.length === 0) {
      return '✅ Design is fully compliant with all wallet platform guidelines'
    }

    if (isValid && warnings.length > 0) {
      return `✅ Design is valid with ${warnings.length} minor warning${warnings.length > 1 ? 's' : ''}`
    }

    return `❌ Design has ${errors.length} error${errors.length > 1 ? 's' : ''} that must be fixed`
  }
}

export default DesignValidationService
