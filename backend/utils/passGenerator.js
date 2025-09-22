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