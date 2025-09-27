/**
 * 🔒 HYBRID BUSINESS AUTHENTICATION MIDDLEWARE
 * Supports both legacy integer IDs and new secure IDs during migration
 */

import { Business } from '../models/index.js'
import logger from '../config/logger.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

/**
 * Enhanced authentication middleware that supports both ID formats
 */
export const requireBusinessAuth = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token']
    const businessId = req.headers['x-business-id']

    if (!sessionToken || !businessId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'MISSING_AUTH_HEADERS'
      })
    }

    let business = null

    // Try secure ID format first (future-proof)
    if (SecureIDGenerator.validateSecureID(businessId, 'business')) {
      business = await Business.findOne({
        where: { public_id: businessId }
      })
      
      if (business) {
        logger.debug('Authenticated business via secure ID', {
          businessId: businessId.substring(0, 8) + '...',
          businessName: business.business_name
        })
      }
    } else {
      // Fall back to legacy integer ID
      const legacyId = parseInt(businessId)
      if (!isNaN(legacyId) && legacyId > 0) {
        business = await Business.findByPk(legacyId)
        
        if (business) {
          logger.debug('Authenticated business via legacy ID', {
            legacyId,
            businessId: business.public_id || 'not-generated',
            businessName: business.business_name
          })
        }
      }
    }

    if (!business) {
      logger.warn('Business not found', {
        providedId: businessId,
        idType: SecureIDGenerator.validateSecureID(businessId, 'business') ? 'secure' : 'legacy'
      })
      
      return res.status(401).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      })
    }

    if (business.status !== 'active') {
      logger.warn('Business account not active', {
        businessId: business.public_id || business.id,
        status: business.status,
        businessName: business.business_name
      })
      
      return res.status(401).json({
        success: false,
        message: `Business account is ${business.status}`,
        code: 'BUSINESS_INACTIVE'
      })
    }

    // TODO: Validate session token against business
    // For now, we trust the token if business exists and is active
    
    // Attach business to request with both ID formats available
    req.business = business
    req.businessId = business.public_id || business.id  // Prefer secure ID
    req.legacyBusinessId = business.id  // Always available for internal queries
    
    next()
  } catch (error) {
    logger.error('Business authentication failed', {
      error: error.message,
      stack: error.stack,
      headers: {
        'x-session-token': !!req.headers['x-session-token'],
        'x-business-id': req.headers['x-business-id']
      }
    })
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    })
  }
}

/**
 * Optional middleware to migrate legacy business to secure ID
 */
export const migrateBusinessIdIfNeeded = async (req, res, next) => {
  try {
    if (req.business && !req.business.public_id) {
      logger.info('Generating secure ID for legacy business', {
        legacyId: req.business.id,
        businessName: req.business.business_name
      })
      
      const publicId = SecureIDGenerator.generateBusinessID()
      await req.business.update({ public_id: publicId })
      
      // Update request data
      req.businessId = publicId
      
      logger.info('Generated secure ID for business', {
        legacyId: req.business.id,
        publicId: publicId.substring(0, 8) + '...',
        businessName: req.business.business_name
      })
    }
    
    next()
  } catch (error) {
    logger.error('Failed to migrate business to secure ID', {
      error: error.message,
      businessId: req.business?.id
    })
    
    // Don't fail the request, just log and continue
    next()
  }
}

/**
 * Lightweight authentication for public endpoints
 * Only validates that business exists and is active
 */
export const validateBusinessExists = async (req, res, next) => {
  try {
    const { businessId } = req.params
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID required',
        code: 'MISSING_BUSINESS_ID'
      })
    }
    
    let business = null
    
    // Try secure ID format first
    if (SecureIDGenerator.validateSecureID(businessId, 'business')) {
      business = await Business.findOne({
        where: { public_id: businessId },
        attributes: ['id', 'public_id', 'business_name', 'status']
      })
    } else {
      // Fall back to legacy integer ID
      const legacyId = parseInt(businessId)
      if (!isNaN(legacyId) && legacyId > 0) {
        business = await Business.findByPk(legacyId, {
          attributes: ['id', 'public_id', 'business_name', 'status']
        })
      }
    }
    
    if (!business || business.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Business not found or inactive',
        code: 'BUSINESS_NOT_FOUND'
      })
    }
    
    req.business = business
    req.businessId = business.public_id || business.id
    req.legacyBusinessId = business.id
    
    next()
  } catch (error) {
    logger.error('Business validation failed', {
      error: error.message,
      businessId: req.params.businessId
    })
    
    res.status(500).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR'
    })
  }
}

/**
 * Utility function to get business by either ID format
 */
export const findBusinessByAnyId = async (businessId) => {
  if (!businessId) return null
  
  // Try secure ID first
  if (SecureIDGenerator.validateSecureID(businessId, 'business')) {
    return await Business.findOne({
      where: { public_id: businessId }
    })
  }
  
  // Try legacy ID
  const legacyId = parseInt(businessId)
  if (!isNaN(legacyId) && legacyId > 0) {
    return await Business.findByPk(legacyId)
  }
  
  return null
}

export default {
  requireBusinessAuth,
  migrateBusinessIdIfNeeded,
  validateBusinessExists,
  findBusinessByAnyId
}