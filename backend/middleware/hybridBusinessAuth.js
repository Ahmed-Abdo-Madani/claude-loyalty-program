/**
 * 🔒 HYBRID BUSINESS AUTHENTICATION MIDDLEWARE
 * Supports both legacy integer IDs and new secure IDs during migration
 */

import { Business, BusinessSession } from '../models/index.js'
import logger from '../config/logger.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import SubscriptionService from '../services/SubscriptionService.js'

/**
 * Helper function to check if route is a suspended account route
 * @param {object} req - Express request object
 * @returns {boolean} - True if route is reactivation endpoint
 */
const isSuspendedAccountRoute = (req) => {
  const path = req.path || req.originalUrl
  return path.includes('/subscription/reactivate')
}

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

    // Only support secure ID format
    if (!SecureIDGenerator.validateSecureID(businessId, 'business')) {
      logger.warn('Invalid business ID format', {
        providedId: businessId
      })
      
      return res.status(400).json({
        success: false,
        message: 'Invalid business ID format',
        code: 'INVALID_BUSINESS_ID'
      })
    }

    business = await Business.findOne({
      where: { public_id: businessId }
    })
    
    if (!business) {
      logger.warn('Business not found', {
        businessId: businessId.substring(0, 8) + '...'
      })
      
      return res.status(401).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      })
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Authenticated business via secure ID', {
        businessId: businessId.substring(0, 8) + '...',
        businessName: business.business_name
      })
    }

    // Check business status
    if (business.status === 'suspended') {
      // Allow suspended businesses to access reactivation endpoint only
      if (isSuspendedAccountRoute(req)) {
        logger.info('Suspended business accessing reactivation endpoint', {
          businessId: business.public_id,
          path: req.path,
          suspensionReason: business.suspension_reason
        })
        
        // Allow through to reactivation endpoint
        req.business = business
        req.businessId = business.public_id
        return next()
      }
      
      // Block access to all other routes for suspended businesses
      logger.warn('Suspended business attempting to access restricted route', {
        businessId: business.public_id,
        path: req.path,
        suspensionReason: business.suspension_reason
      })
      
      return res.status(403).json({
        success: false,
        message: 'Account suspended due to payment failure',
        code: 'ACCOUNT_SUSPENDED',
        suspension_reason: business.suspension_reason,
        suspension_date: business.suspension_date,
        reactivation_required: true,
        reactivation_url: '/subscription/reactivate'
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

    // Validate session token against business
    try {
      const session = await BusinessSession.findOne({
        where: {
          session_token: sessionToken,
          business_id: business.public_id,
          is_active: true
        }
      })

      if (!session) {
        logger.warn('Session not found or inactive', {
          businessId: business.public_id,
          hasSessionToken: !!sessionToken
        })
        
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired session',
          code: 'SESSION_INVALID'
        })
      }

      // Check session expiration
      if (session.expires_at && session.expires_at < new Date()) {
        logger.warn('Session expired', {
          businessId: business.public_id,
          expiredAt: session.expires_at
        })
        
        return res.status(401).json({
          success: false,
          message: 'Session has expired',
          code: 'SESSION_EXPIRED'
        })
      }

      // Update session last_used_at timestamp
      await session.update({ last_used_at: new Date() })

      logger.debug('Session validated', {
        businessId: business.public_id,
        sessionId: session.id
      })

      // Attach session to request for downstream use
      req.session = session

    } catch (sessionError) {
      logger.error('Session validation error', {
        error: sessionError.message,
        stack: sessionError.stack,
        businessId: business.public_id,
        errorCode: sessionError.code
      })
      
      const response = {
        success: false,
        message: 'Session validation failed',
        code: 'SESSION_ERROR'
      }
      
      // Add debugging hint in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        response.hint = 'Check business_sessions schema – missing columns (ip_address, user_agent) or incorrect data types. Run migration: 20250202-create-or-sync-business-sessions.js'
        response.error = sessionError.message
      }
      
      return res.status(500).json(response)
    }
    
    // Attach business to request with secure ID only
    req.business = business
    req.businessId = business.public_id
    
    next()
  } catch (error) {
    logger.error('Business authentication failed', {
      error: error.message,
      stack: error.stack,
      headers: {
        'x-session-token': !!req.headers['x-session-token'],
        'x-business-id': req.headers['x-business-id']
      },
      errorCode: error.code
    })
    
    const response = {
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    }
    
    // Add debugging hint in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      response.hint = 'Common causes: business_sessions table missing, schema mismatch, or invalid business_id format'
      response.error = error.message
    }
    
    res.status(500).json(response)
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

/**
 * Middleware to check if trial period has expired
 * Must be used after requireBusinessAuth
 */
export const checkTrialExpiration = async (req, res, next) => {
  try {
    const business = req.business

    if (!business) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'MISSING_BUSINESS'
      })
    }

    // Check if business is on trial
    if (business.isOnTrial && business.isOnTrial()) {
      // Check if trial has expired
      if (business.isTrialExpired && business.isTrialExpired()) {
        const daysExpired = Math.floor((new Date() - new Date(business.trial_ends_at)) / (1000 * 60 * 60 * 24))
        
        logger.warn('Trial period expired', {
          business_id: business.public_id,
          trial_ends_at: business.trial_ends_at,
          days_expired: daysExpired
        })

        return res.status(403).json({
          success: false,
          message: 'Trial period has expired. Please upgrade your subscription.',
          code: 'TRIAL_EXPIRED',
          trial_ends_at: business.trial_ends_at,
          days_expired: daysExpired
        })
      }
    }

    next()
  } catch (error) {
    logger.error('Trial expiration check error', {
      error: error.message,
      stack: error.stack,
      business_id: req.business?.public_id
    })
    
    res.status(500).json({
      success: false,
      message: 'Trial expiration check failed',
      code: 'TRIAL_CHECK_ERROR'
    })
  }
}

/**
 * Middleware factory to check subscription limits
 * Must be used after requireBusinessAuth for authenticated routes
 * For 'customers' limit type, can also derive business ID from offer in request body
 * @param {string} limitType - Type of limit: 'offers', 'customers', 'posOperations', 'locations'
 */
export const checkSubscriptionLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      // Get business ID from req.business (set by requireBusinessAuth)
      let businessId = req.business?.public_id

      // For customer signup route without auth, derive business ID from offer
      if (!businessId && limitType === 'customers' && req.body?.offerId) {
        const { Offer } = await import('../models/index.js')
        const offer = await Offer.findOne({ 
          where: { public_id: req.body.offerId },
          attributes: ['public_id', 'business_id']
        })
        
        if (offer) {
          businessId = offer.business_id
          logger.debug('Resolved business ID from offer for customer limit check', {
            offerId: req.body.offerId,
            businessId
          })
        }
      }

      if (!businessId) {
        logger.warn('No business ID found for limit check', {
          limitType,
          route: req.path,
          hasReqBusiness: !!req.business,
          hasOfferId: !!req.body?.offerId
        })
        
        // Skip limit check if no business context
        return next()
      }

      // Check subscription limits
      const limitCheck = await SubscriptionService.checkSubscriptionLimits(businessId, limitType)

      if (!limitCheck.allowed) {
        logger.warn('Subscription limit exceeded', {
          business_id: businessId,
          limit_type: limitType,
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: limitCheck.plan
        })

        return res.status(403).json({
          success: false,
          message: limitCheck.message,
          code: 'LIMIT_EXCEEDED',
          current_plan: limitCheck.plan,
          limit_type: limitType,
          current_usage: limitCheck.current,
          limit: limitCheck.limit,
          upgrade_prompt: `You've reached the ${limitType} limit for your ${limitCheck.plan} plan. Upgrade to continue.`
        })
      }

      logger.debug('Subscription limit check passed', {
        business_id: businessId,
        limit_type: limitType,
        current: limitCheck.current,
        limit: limitCheck.limit
      })

      next()
    } catch (error) {
      logger.error('Subscription limit check error', {
        error: error.message,
        stack: error.stack,
        limit_type: limitType,
        business_id: req.business?.public_id
      })
      
      // Don't block on limit check errors in development
      if (process.env.NODE_ENV === 'production') {
        res.status(500).json({
          success: false,
          message: 'Subscription limit check failed',
          code: 'LIMIT_CHECK_ERROR'
        })
      } else {
        // In development, log and continue
        logger.warn('Skipping limit check due to error in development mode')
        next()
      }
    }
  }
}

export default {
  requireBusinessAuth,
  migrateBusinessIdIfNeeded,
  validateBusinessExists,
  findBusinessByAnyId,
  checkTrialExpiration,
  checkSubscriptionLimit
}