/**
 * Color Utilities for Card Design
 * WCAG contrast calculation, color conversion, validation
 * Phase 2 - Frontend Components
 */

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color (#RRGGBB or #RGB)
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Handle 3-digit hex
  let r, g, b
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16)
    g = parseInt(cleanHex[1] + cleanHex[1], 16)
    b = parseInt(cleanHex[2] + cleanHex[2], 16)
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16)
    g = parseInt(cleanHex.substring(2, 4), 16)
    b = parseInt(cleanHex.substring(4, 6), 16)
  }

  return { r, g, b }
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color (#RRGGBB)
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Convert hex to RGB string for Apple Wallet
 * @param {string} hex - Hex color
 * @returns {string} RGB string "rgb(r,g,b)"
 */
export function hexToRgbString(hex) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Validate hex color format
 * @param {string} hex - Color to validate
 * @returns {boolean}
 */
export function isValidHex(hex) {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

/**
 * Get relative luminance for WCAG contrast calculation
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Relative luminance (0-1)
 */
function getRelativeLuminance(r, g, b) {
  // Convert to 0-1 range
  const [rs, gs, bs] = [r, g, b].map(c => {
    const sRGB = c / 255
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  })

  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate WCAG contrast ratio between two colors
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  const luminance1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const luminance2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Validate color contrast against WCAG standards
 * @param {string} bgColor - Background color (hex)
 * @param {string} fgColor - Foreground/text color (hex)
 * @returns {{isValid: boolean, ratio: number, level: string, meetsAA: boolean, meetsAAA: boolean}}
 */
export function validateColorContrast(bgColor, fgColor) {
  const ratio = calculateContrastRatio(bgColor, fgColor)

  // WCAG 2.1 standards for normal text
  const meetsAA = ratio >= 4.5   // Minimum for AA compliance
  const meetsAAA = ratio >= 7.0  // Enhanced AAA compliance

  return {
    isValid: meetsAA,
    ratio: parseFloat(ratio.toFixed(2)),
    level: meetsAAA ? 'AAA' : meetsAA ? 'AA' : 'Fail',
    meetsAA,
    meetsAAA,
    message: meetsAAA
      ? 'Excellent contrast (AAA)'
      : meetsAA
      ? 'Good contrast (AA)'
      : 'Poor contrast - not accessible'
  }
}

/**
 * Adjust color brightness
 * @param {string} hex - Hex color
 * @param {number} percent - Brightness adjustment (-100 to 100)
 * @returns {string} Adjusted hex color
 */
export function adjustBrightness(hex, percent) {
  const { r, g, b } = hexToRgb(hex)

  const adjust = (value) => {
    const adjusted = value + (value * percent / 100)
    return Math.max(0, Math.min(255, adjusted))
  }

  return rgbToHex(adjust(r), adjust(g), adjust(b))
}

/**
 * Get contrasting text color (black or white) for a background
 * @param {string} bgColor - Background color (hex)
 * @returns {string} '#FFFFFF' or '#000000'
 */
export function getContrastingTextColor(bgColor) {
  const { r, g, b } = hexToRgb(bgColor)
  const luminance = getRelativeLuminance(r, g, b)

  // Use white text on dark backgrounds, black on light
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

/**
 * Generate a complementary color
 * @param {string} hex - Base color (hex)
 * @returns {string} Complementary hex color
 */
export function getComplementaryColor(hex) {
  const { r, g, b } = hexToRgb(hex)

  // Rotate 180 degrees on color wheel (invert)
  return rgbToHex(255 - r, 255 - g, 255 - b)
}

/**
 * Lighten a color by a percentage
 * @param {string} hex - Hex color
 * @param {number} percent - Lightening percentage (0-100)
 * @returns {string} Lightened hex color
 */
export function lightenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex)

  const lighten = (value) => {
    const amount = (255 - value) * (percent / 100)
    return Math.round(value + amount)
  }

  return rgbToHex(lighten(r), lighten(g), lighten(b))
}

/**
 * Darken a color by a percentage
 * @param {string} hex - Hex color
 * @param {number} percent - Darkening percentage (0-100)
 * @returns {string} Darkened hex color
 */
export function darkenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex)

  const darken = (value) => {
    return Math.round(value * (1 - percent / 100))
  }

  return rgbToHex(darken(r), darken(g), darken(b))
}

/**
 * Generate a color palette from a base color
 * @param {string} baseColor - Base hex color
 * @returns {{primary: string, light: string, lighter: string, dark: string, darker: string}}
 */
export function generatePalette(baseColor) {
  return {
    primary: baseColor,
    lighter: lightenColor(baseColor, 30),
    light: lightenColor(baseColor, 15),
    dark: darkenColor(baseColor, 15),
    darker: darkenColor(baseColor, 30)
  }
}

/**
 * Suggest accessible foreground color for a background
 * @param {string} bgColor - Background color (hex)
 * @param {string} preferredColor - Preferred foreground color (hex)
 * @returns {{color: string, isOriginal: boolean, reason: string}}
 */
export function suggestAccessibleForeground(bgColor, preferredColor) {
  const contrast = validateColorContrast(bgColor, preferredColor)

  if (contrast.meetsAA) {
    return {
      color: preferredColor,
      isOriginal: true,
      reason: `Original color has good contrast (${contrast.ratio}:1)`
    }
  }

  // Try white
  const whiteContrast = validateColorContrast(bgColor, '#FFFFFF')
  if (whiteContrast.meetsAA) {
    return {
      color: '#FFFFFF',
      isOriginal: false,
      reason: `White provides better contrast (${whiteContrast.ratio}:1)`
    }
  }

  // Try black
  const blackContrast = validateColorContrast(bgColor, '#000000')
  if (blackContrast.meetsAA) {
    return {
      color: '#000000',
      isOriginal: false,
      reason: `Black provides better contrast (${blackContrast.ratio}:1)`
    }
  }

  // Return contrasting color as fallback
  const contrastingColor = getContrastingTextColor(bgColor)
  return {
    color: contrastingColor,
    isOriginal: false,
    reason: 'Using high-contrast alternative'
  }
}

/**
 * Predefined color presets for common industries
 */
export const colorPresets = {
  coffee: {
    name: 'Coffee Shop',
    colors: ['#6F4E37', '#8B4513', '#A0522D', '#3E2723', '#795548']
  },
  restaurant: {
    name: 'Restaurant',
    colors: ['#DC2626', '#EF4444', '#F97316', '#EA580C', '#C2410C']
  },
  retail: {
    name: 'Retail',
    colors: ['#2563EB', '#3B82F6', '#60A5FA', '#1D4ED8', '#1E40AF']
  },
  beauty: {
    name: 'Beauty & Wellness',
    colors: ['#EC4899', '#F472B6', '#A855F7', '#C026D3', '#DB2777']
  },
  fitness: {
    name: 'Fitness',
    colors: ['#F97316', '#FB923C', '#EA580C', '#DC2626', '#EF4444']
  },
  professional: {
    name: 'Professional',
    colors: ['#1E40AF', '#1E3A8A', '#312E81', '#1F2937', '#111827']
  }
}

export default {
  hexToRgb,
  rgbToHex,
  hexToRgbString,
  isValidHex,
  calculateContrastRatio,
  validateColorContrast,
  adjustBrightness,
  getContrastingTextColor,
  getComplementaryColor,
  lightenColor,
  darkenColor,
  generatePalette,
  suggestAccessibleForeground,
  colorPresets
}
