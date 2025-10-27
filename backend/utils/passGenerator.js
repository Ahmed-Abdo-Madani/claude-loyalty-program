export class PassGenerator {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001'
  }

  validatePassData(customerData, offerData, progressData) {
    const errors = []

    // Validate customer data
    if (!customerData?.customerId) errors.push('Customer ID required')
    if (!customerData?.firstName) errors.push('Customer first name required')
    if (!customerData?.lastName) errors.push('Customer last name required')

    // Validate offer data
    if (!offerData?.offerId) errors.push('Offer ID required')
    if (!offerData?.businessName) errors.push('Business name required')
    if (!offerData?.title) errors.push('Offer title required')

    // Validate progress data
    if (typeof progressData?.stampsEarned !== 'number') errors.push('Stamps earned must be a number')
    if (typeof offerData?.stampsRequired !== 'number') errors.push('Stamps required must be a number')

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  generateSerialNumber(customerId, offerId) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${customerId.slice(-6)}-${offerId.slice(-6)}-${timestamp}-${random}`.toUpperCase()
  }

  calculateProgress(stampsEarned, stampsRequired) {
    const earned = stampsEarned || 0
    const required = stampsRequired || 10
    const percentage = Math.min(Math.round((earned / required) * 100), 100)
    const remaining = Math.max(required - earned, 0)

    return {
      earned,
      required,
      percentage,
      remaining,
      isComplete: earned >= required
    }
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  sanitizeBusinessName(businessName) {
    // Remove special characters for file names
    return businessName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()
  }

  generateQRData(customerId, offerId) {
    // Generate QR code data for POS scanning
    return JSON.stringify({
      customerId,
      offerId,
      timestamp: new Date().toISOString(),
      type: 'loyalty_scan'
    })
  }
}

/**
 * Sanitizes a filename by removing non-ASCII characters and special characters
 * Ensures the result is safe for use in HTTP headers (RFC 7230 compliance)
 * 
 * @param {string} input - The input string to sanitize
 * @param {Object} options - Configuration options
 * @param {number} options.maxLength - Maximum length of the sanitized filename (default: 50)
 * @param {string} options.fallback - Fallback string if result is empty (default: 'file')
 * @param {boolean} options.preserveSpaces - Whether to keep spaces or replace with hyphens (default: false)
 * @returns {string} ASCII-safe filename string
 */
export function sanitizeFilename(input, options = {}) {
  const {
    maxLength = 50,
    fallback = 'file',
    preserveSpaces = false
  } = options

  if (!input || typeof input !== 'string') {
    return fallback
  }

  let sanitized = input.trim()

  // Remove non-ASCII characters (only keep \x00-\x7F range)
  sanitized = sanitized.replace(/[^\x00-\x7F]/g, '')

  // Replace spaces with hyphens unless preserveSpaces is true
  if (!preserveSpaces) {
    sanitized = sanitized.replace(/\s+/g, '-')
  }

  // Remove special characters except hyphens and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9-_]/g, '')

  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-')

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '')

  // Truncate to maxLength
  sanitized = sanitized.substring(0, maxLength)

  // Return fallback if result is empty
  return sanitized || fallback
}

/**
 * Create a Content-Disposition header value with ASCII-safe filename
 * Complies with RFC 7230 HTTP/1.1 header field value requirements
 * @param {string} filename - The base filename (without extension)
 * @param {Object} options - Configuration options
 * @param {string} options.extension - File extension (e.g., 'pkpass')
 * @param {string} options.fallback - Fallback filename if sanitization produces empty string
 * @param {number} options.maxLength - Maximum filename length (default: 50)
 * @returns {string} - Content-Disposition header value with ASCII-safe filename
 */
export function createContentDispositionHeader(filename, options = {}) {
  const {
    extension = '',
    maxLength = 50,
    fallback = 'file'
  } = options

  // Use fallback immediately if filename is null/undefined
  if (!filename) {
    filename = fallback
  }

  // Create ASCII-safe version
  const sanitized = sanitizeFilename(filename, { maxLength, fallback })

  // Add extension if provided
  const ext = extension ? `.${extension}` : ''

  // Return ASCII-only format (RFC 7230 compliant)
  return `attachment; filename="${sanitized}${ext}"`
}
