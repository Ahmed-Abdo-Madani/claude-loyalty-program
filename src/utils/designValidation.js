/**
 * Design Validation Utilities
 * Frontend validation helpers for card designs
 * Phase 2 - Frontend Components
 */

import { validateColorContrast, isValidHex } from './colorUtils'

/**
 * Validate image file
 * @param {File} file - Image file to validate
 * @param {object} options - Validation options
 * @returns {{isValid: boolean, errors: Array<string>}}
 */
export function validateImageFile(file, options = {}) {
  const {
    maxSizeMB = 5,
    allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'],
    minWidth = 0,
    minHeight = 0
  } = options

  const errors = []

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`)
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > maxSizeMB) {
    errors.push(`File size (${fileSizeMB.toFixed(2)}MB) exceeds ${maxSizeMB}MB limit`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate logo image for Google Wallet
 * @param {File} file - Logo file
 * @returns {{isValid: boolean, errors: Array<string>, warnings: Array<string>}}
 */
export function validateGoogleLogo(file) {
  const errors = []
  const warnings = []

  // Basic file validation
  const fileValidation = validateImageFile(file, {
    maxSizeMB: 5,
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg']
  })

  if (!fileValidation.isValid) {
    errors.push(...fileValidation.errors)
  }

  // Google Wallet prefers square logos (660x660px min)
  // This will be checked after image loads
  warnings.push('Logo will be cropped to a circle for Google Wallet')

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate logo image for Apple Wallet
 * @param {File} file - Logo file
 * @returns {{isValid: boolean, errors: Array<string>, warnings: Array<string>}}
 */
export function validateAppleLogo(file) {
  const errors = []
  const warnings = []

  // Basic file validation
  const fileValidation = validateImageFile(file, {
    maxSizeMB: 5,
    allowedTypes: ['image/png']
  })

  if (!fileValidation.isValid) {
    errors.push(...fileValidation.errors)
  }

  // Apple Wallet requires PNG
  if (file.type !== 'image/png') {
    warnings.push('Apple Wallet works best with PNG format')
  }

  warnings.push('Logo will be resized to 320x100px for Apple Wallet')

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate hero/banner image
 * @param {File} file - Hero image file
 * @returns {{isValid: boolean, errors: Array<string>, warnings: Array<string>}}
 */
export function validateHeroImage(file) {
  const errors = []
  const warnings = []

  // Basic file validation
  const fileValidation = validateImageFile(file, {
    maxSizeMB: 10,
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg']
  })

  if (!fileValidation.isValid) {
    errors.push(...fileValidation.errors)
  }

  warnings.push('Hero image will be resized to 1032x336px')

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate color scheme
 * @param {object} colors - Color configuration
 * @returns {{isValid: boolean, errors: Array<string>, warnings: Array<string>}}
 */
export function validateColorScheme(colors) {
  const { background_color, foreground_color, label_color } = colors
  const errors = []
  const warnings = []

  // Validate hex format
  if (!isValidHex(background_color)) {
    errors.push('Invalid background color format')
  }
  if (!isValidHex(foreground_color)) {
    errors.push('Invalid foreground color format')
  }
  if (label_color && !isValidHex(label_color)) {
    errors.push('Invalid label color format')
  }

  // If all colors are valid, check contrast
  if (errors.length === 0) {
    // Check background vs foreground contrast
    const bgFgContrast = validateColorContrast(background_color, foreground_color)
    if (!bgFgContrast.meetsAA) {
      errors.push(
        `Poor contrast between background and foreground (${bgFgContrast.ratio}:1). ` +
        'Minimum 4.5:1 required for accessibility (WCAG AA)'
      )
    } else if (!bgFgContrast.meetsAAA) {
      warnings.push(
        `Contrast is acceptable (${bgFgContrast.ratio}:1 - AA level) but could be improved. ` +
        'AAA level requires 7:1 for enhanced accessibility'
      )
    }

    // Check background vs label contrast
    if (label_color) {
      const bgLabelContrast = validateColorContrast(background_color, label_color)
      if (!bgLabelContrast.meetsAA) {
        warnings.push(
          `Low contrast between background and labels (${bgLabelContrast.ratio}:1). ` +
          'Consider using a lighter or darker label color'
        )
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate text field length
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {string} fieldName - Field name for error messages
 * @returns {{isValid: boolean, errors: Array<string>}}
 */
export function validateTextLength(text, maxLength, fieldName = 'Text') {
  const errors = []

  if (text && text.length > maxLength) {
    errors.push(`${fieldName} is too long (${text.length}/${maxLength} characters)`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate entire card design
 * @param {object} design - Card design object
 * @returns {{isValid: boolean, hasWarnings: boolean, hasErrors: boolean, errors: Array, warnings: Array}}
 */
export function validateCardDesign(design) {
  const errors = []
  const warnings = []

  // Validate required fields
  if (!design.background_color) {
    errors.push('Background color is required')
  }
  if (!design.foreground_color) {
    errors.push('Foreground color is required')
  }

  // Validate color scheme
  if (design.background_color && design.foreground_color) {
    const colorValidation = validateColorScheme({
      background_color: design.background_color,
      foreground_color: design.foreground_color,
      label_color: design.label_color
    })
    errors.push(...colorValidation.errors)
    warnings.push(...colorValidation.warnings)
  }

  // Validate stamp icon (should be a single emoji/character)
  if (design.stamp_icon && design.stamp_icon.length > 10) {
    warnings.push('Stamp icon is too long. Use a single emoji or short text')
  }

  // Validate progress display style
  const validProgressStyles = ['bar', 'grid', 'circular']
  if (design.progress_display_style && !validProgressStyles.includes(design.progress_display_style)) {
    errors.push(`Invalid progress display style. Must be one of: ${validProgressStyles.join(', ')}`)
  }

  // Check for images (recommendations)
  if (!design.logo_url && !design.logo_google_url && !design.logo_apple_url) {
    warnings.push('No logo uploaded. Consider adding a logo for better branding')
  }

  if (!design.hero_image_url) {
    warnings.push('No hero image. A banner image makes your card more visually appealing')
  }

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    hasErrors: errors.length > 0,
    errors,
    warnings
  }
}

/**
 * Get validation status icon and color
 * @param {boolean} isValid - Whether validation passed
 * @param {boolean} hasWarnings - Whether there are warnings
 * @returns {{icon: string, color: string, bgColor: string}}
 */
export function getValidationStatusUI(isValid, hasWarnings) {
  if (!isValid) {
    return {
      icon: '❌',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Invalid'
    }
  }

  if (hasWarnings) {
    return {
      icon: '⚠️',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Warnings'
    }
  }

  return {
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Valid'
  }
}

/**
 * Check if design is ready for production
 * @param {object} design - Card design object
 * @param {object} validation - Validation results
 * @returns {{ready: boolean, blockers: Array<string>}}
 */
export function isDesignProductionReady(design, validation) {
  const blockers = []

  // Must have no errors
  if (validation.hasErrors) {
    blockers.push(...validation.errors)
  }

  // Must have at least one logo
  if (!design.logo_url && !design.logo_google_url && !design.logo_apple_url) {
    blockers.push('At least one logo is required for production')
  }

  // Must have valid colors with good contrast
  if (design.background_color && design.foreground_color) {
    const contrast = validateColorContrast(design.background_color, design.foreground_color)
    if (!contrast.meetsAA) {
      blockers.push('Color contrast does not meet accessibility standards')
    }
  }

  return {
    ready: blockers.length === 0,
    blockers
  }
}

export default {
  validateImageFile,
  validateGoogleLogo,
  validateAppleLogo,
  validateHeroImage,
  validateColorScheme,
  validateTextLength,
  validateCardDesign,
  getValidationStatusUI,
  isDesignProductionReady
}
