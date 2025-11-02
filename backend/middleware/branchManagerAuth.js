import jwt from 'jsonwebtoken'
import Branch from '../models/Branch.js'
import logger from '../config/logger.js'

/**
 * Middleware to authenticate branch managers via PIN verification
 * Validates JWT token and attaches branch context to request
 */
export const requireBranchManagerAuth = async (req, res, next) => {
  try {
    const branchId = req.headers['x-branch-id']
    const token = req.headers['x-manager-token']

    if (!branchId || !token) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication credentials'
      })
    }

    // Validate branch ID format
    if (!branchId.startsWith('branch_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format'
      })
    }

    // Find branch
    const branch = await Branch.findOne({
      where: { public_id: branchId }
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      })
    }

    // Verify manager login is enabled
    if (!branch.manager_pin_enabled) {
      return res.status(403).json({
        success: false,
        error: 'Manager login is disabled for this branch'
      })
    }

    // Verify JWT token
    let decoded
    try {
      const jwtSecret = process.env.JWT_SECRET

      if (!jwtSecret) {
        logger.error('❌ CRITICAL: JWT_SECRET not configured for branch manager authentication')
        return res.status(500).json({
          success: false,
          error: 'Server configuration error',
          hint: 'JWT_SECRET environment variable must be set'
        })
      }

      decoded = jwt.verify(token, jwtSecret)
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }

    // Verify token type and branch ID match
    if (decoded.type !== 'branch_manager' || decoded.branchId !== branchId) {
      return res.status(401).json({
        success: false,
        error: 'Token does not match branch'
      })
    }

    // Check token expiration (8 hours)
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({
        success: false,
        error: 'Token has expired'
      })
    }

    // Attach branch to request
    req.branch = branch
    req.branchId = branchId
    req.isManager = true

    logger.info('Branch manager authenticated', {
      branchId,
      branchName: branch.name
    })

    next()
  } catch (error) {
    logger.error('Branch manager auth error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    })
  }
}

/**
 * Generate JWT token for branch manager
 * Token expires in 8 hours (typical shift length)
 */
export const generateManagerToken = (branchId, branchName) => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  const payload = {
    type: 'branch_manager',
    branchId,
    branchName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 hours
  }

  return jwt.sign(payload, jwtSecret)
}

/**
 * Verify and decode manager token
 * Returns decoded payload or null if invalid
 */
export const verifyManagerToken = (token) => {
  try {
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      logger.error('❌ JWT_SECRET not configured')
      return null
    }

    const decoded = jwt.verify(token, jwtSecret)
    
    if (decoded.type !== 'branch_manager') {
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now) {
      return null
    }

    return decoded
  } catch (error) {
    return null
  }
}
