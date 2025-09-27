import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import logger from '../config/logger.js'

/**
 * Secure QR Service for JWT-based QR tokens
 * Replaces plain JSON QR codes with encrypted JWT tokens
 */
class SecureQRService {
  static QR_SECRET = process.env.QR_JWT_SECRET || crypto.randomBytes(64).toString('hex')
  static DEFAULT_ALGORITHM = 'HS256'
  
  /**
   * Generate a secure QR token for customer progress scanning
   * @param {string} customerId - Secure customer ID
   * @param {string} businessId - Secure business ID  
   * @param {string} offerId - Secure offer ID
   * @param {string} expiresIn - Token expiration (e.g., '24h', '7d')
   * @returns {string} JWT token for QR code
   */
  static generateCustomerQR(customerId, businessId, offerId, expiresIn = '24h') {
    try {
      const payload = {
        cid: customerId,
        bid: businessId, 
        oid: offerId,
        iat: Math.floor(Date.now() / 1000),
        type: 'customer_scan',
        v: 1 // Version for future migration compatibility
      }

      const token = jwt.sign(payload, this.QR_SECRET, {
        algorithm: this.DEFAULT_ALGORITHM,
        expiresIn
      })

      logger.debug('Generated customer QR token', {
        customerId: customerId.substring(0, 8) + '...',
        businessId: businessId.substring(0, 8) + '...',
        offerId: offerId.substring(0, 8) + '...',
        expiresIn
      })

      return token
    } catch (error) {
      logger.error('Failed to generate customer QR token', {
        error: error.message,
        customerId: customerId?.substring(0, 8) + '...',
        businessId: businessId?.substring(0, 8) + '...',
        offerId: offerId?.substring(0, 8) + '...'
      })
      throw new Error('QR token generation failed')
    }
  }

  /**
   * Validate and decode a customer QR token
   * @param {string} token - JWT token from QR code
   * @returns {Object} Validation result with decoded data
   */
  static validateCustomerQR(token) {
    try {
      const decoded = jwt.verify(token, this.QR_SECRET, {
        algorithms: [this.DEFAULT_ALGORITHM]
      })

      // Validate token structure
      if (decoded.type !== 'customer_scan' || !decoded.cid || !decoded.bid || !decoded.oid) {
        throw new Error('Invalid token structure')
      }

      logger.debug('Validated customer QR token', {
        customerId: decoded.cid.substring(0, 8) + '...',
        businessId: decoded.bid.substring(0, 8) + '...',
        offerId: decoded.oid.substring(0, 8) + '...',
        issuedAt: new Date(decoded.iat * 1000).toISOString()
      })

      return {
        isValid: true,
        customerId: decoded.cid,
        businessId: decoded.bid,
        offerId: decoded.oid,
        issuedAt: decoded.iat,
        version: decoded.v || 1
      }
    } catch (error) {
      logger.warn('QR token validation failed', {
        error: error.message,
        token: token?.substring(0, 50) + '...'
      })

      return {
        isValid: false,
        error: error.message
      }
    }
  }

  /**
   * Generate a secure QR token for offer signup
   * @param {string} businessId - Secure business ID
   * @param {string} offerId - Secure offer ID
   * @param {string} expiresIn - Token expiration (e.g., '30d')
   * @returns {string} JWT token for offer signup QR
   */
  static generateOfferSignupQR(businessId, offerId, expiresIn = '30d') {
    try {
      const payload = {
        bid: businessId,
        oid: offerId,
        iat: Math.floor(Date.now() / 1000),
        type: 'offer_signup',
        v: 1
      }

      const token = jwt.sign(payload, this.QR_SECRET, {
        algorithm: this.DEFAULT_ALGORITHM,
        expiresIn
      })

      logger.debug('Generated offer signup QR token', {
        businessId: businessId.substring(0, 8) + '...',
        offerId: offerId.substring(0, 8) + '...',
        expiresIn
      })

      return token
    } catch (error) {
      logger.error('Failed to generate offer signup QR token', {
        error: error.message,
        businessId: businessId?.substring(0, 8) + '...',
        offerId: offerId?.substring(0, 8) + '...'
      })
      throw new Error('Offer signup QR token generation failed')
    }
  }

  /**
   * Validate and decode an offer signup QR token
   * @param {string} token - JWT token from offer QR code
   * @returns {Object} Validation result with decoded data
   */
  static validateOfferSignupQR(token) {
    try {
      const decoded = jwt.verify(token, this.QR_SECRET, {
        algorithms: [this.DEFAULT_ALGORITHM]
      })

      // Validate token structure
      if (decoded.type !== 'offer_signup' || !decoded.bid || !decoded.oid) {
        throw new Error('Invalid offer signup token structure')
      }

      logger.debug('Validated offer signup QR token', {
        businessId: decoded.bid.substring(0, 8) + '...',
        offerId: decoded.oid.substring(0, 8) + '...',
        issuedAt: new Date(decoded.iat * 1000).toISOString()
      })

      return {
        isValid: true,
        businessId: decoded.bid,
        offerId: decoded.oid,
        issuedAt: decoded.iat,
        version: decoded.v || 1
      }
    } catch (error) {
      logger.warn('Offer signup QR token validation failed', {
        error: error.message,
        token: token?.substring(0, 50) + '...'
      })

      return {
        isValid: false,
        error: error.message
      }
    }
  }

  /**
   * Generate a temporary access token for business scanner apps
   * @param {string} businessId - Secure business ID
   * @param {string} expiresIn - Token expiration (e.g., '8h')
   * @returns {string} JWT token for business scanner
   */
  static generateBusinessScannerToken(businessId, expiresIn = '8h') {
    try {
      const payload = {
        bid: businessId,
        iat: Math.floor(Date.now() / 1000),
        type: 'business_scanner',
        v: 1
      }

      const token = jwt.sign(payload, this.QR_SECRET, {
        algorithm: this.DEFAULT_ALGORITHM,
        expiresIn
      })

      logger.info('Generated business scanner token', {
        businessId: businessId.substring(0, 8) + '...',
        expiresIn
      })

      return token
    } catch (error) {
      logger.error('Failed to generate business scanner token', {
        error: error.message,
        businessId: businessId?.substring(0, 8) + '...'
      })
      throw new Error('Business scanner token generation failed')
    }
  }

  /**
   * Validate any QR token and return its type and data
   * @param {string} token - JWT token to validate
   * @returns {Object} Universal validation result
   */
  static validateAnyQRToken(token) {
    try {
      const decoded = jwt.verify(token, this.QR_SECRET, {
        algorithms: [this.DEFAULT_ALGORITHM]
      })

      const result = {
        isValid: true,
        type: decoded.type,
        issuedAt: decoded.iat,
        version: decoded.v || 1
      }

      // Add type-specific data
      switch (decoded.type) {
        case 'customer_scan':
          Object.assign(result, {
            customerId: decoded.cid,
            businessId: decoded.bid,
            offerId: decoded.oid
          })
          break
        case 'offer_signup':
          Object.assign(result, {
            businessId: decoded.bid,
            offerId: decoded.oid
          })
          break
        case 'business_scanner':
          Object.assign(result, {
            businessId: decoded.bid
          })
          break
        default:
          throw new Error(`Unknown token type: ${decoded.type}`)
      }

      logger.debug('Validated QR token', {
        type: decoded.type,
        version: decoded.v || 1
      })

      return result
    } catch (error) {
      logger.warn('Universal QR token validation failed', {
        error: error.message,
        token: token?.substring(0, 50) + '...'
      })

      return {
        isValid: false,
        error: error.message
      }
    }
  }

  /**
   * Check if QR JWT secret is properly configured
   * @returns {boolean} Whether QR service is properly configured
   */
  static isConfigured() {
    const hasSecret = !!this.QR_SECRET && this.QR_SECRET.length >= 32
    
    if (!hasSecret) {
      logger.error('QR JWT secret not properly configured', {
        hasEnvVar: !!process.env.QR_JWT_SECRET,
        secretLength: this.QR_SECRET?.length || 0
      })
    }

    return hasSecret
  }

  /**
   * Get service configuration status
   * @returns {Object} Configuration details
   */
  static getStatus() {
    return {
      configured: this.isConfigured(),
      algorithm: this.DEFAULT_ALGORITHM,
      secretLength: this.QR_SECRET?.length || 0,
      hasEnvSecret: !!process.env.QR_JWT_SECRET
    }
  }
}

export default SecureQRService

// Export individual methods for convenience
export const {
  generateCustomerQR,
  validateCustomerQR,
  generateOfferSignupQR,
  validateOfferSignupQR,
  generateBusinessScannerToken,
  validateAnyQRToken,
  isConfigured,
  getStatus
} = SecureQRService