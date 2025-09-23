import jwt from 'jsonwebtoken'

// Mock database operations for admin verification
const mockDb = {
  async findAdminById(adminId) {
    // In production, this would query the platform_admins table
    const mockAdmin = {
      id: 1,
      email: 'admin@loyaltyplatform.com',
      full_name: 'Platform Administrator',
      role: 'super_admin',
      status: 'active'
    }

    if (adminId === mockAdmin.id) {
      return mockAdmin
    }
    return null
  },

  async findActiveSession(sessionToken) {
    // In production, this would query admin_sessions table
    // For now, we'll just check if session token exists
    return sessionToken ? { is_active: true, admin_id: 1 } : null
  }
}

// Middleware to verify admin JWT token
export const verifyAdminToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_MISSING'
      })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-admin-jwt-secret')
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError.message)

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      })
    }

    // Check if token is for admin
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'NOT_ADMIN_TOKEN'
      })
    }

    // Verify admin still exists and is active
    const admin = await mockDb.findAdminById(decoded.adminId)
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found',
        code: 'ADMIN_NOT_FOUND'
      })
    }

    if (admin.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Admin account is not active',
        code: 'ADMIN_INACTIVE'
      })
    }

    // Add admin info to request object
    req.admin = {
      adminId: admin.id,
      email: admin.email,
      fullName: admin.full_name,
      role: admin.role
    }

    next()

  } catch (error) {
    console.error('Admin token verification error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    })
  }
}

// Middleware to check admin role permissions
export const requireAdminRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const admin = req.admin

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        })
      }

      // If no specific roles required, allow any authenticated admin
      if (allowedRoles.length === 0) {
        return next()
      }

      // Check if admin has required role
      if (!allowedRoles.includes(admin.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required_roles: allowedRoles,
          current_role: admin.role
        })
      }

      next()

    } catch (error) {
      console.error('Role verification error:', error)
      return res.status(500).json({
        success: false,
        message: 'Internal server error during role verification',
        code: 'ROLE_CHECK_ERROR'
      })
    }
  }
}

// Middleware to verify session token (optional additional security)
export const verifyAdminSession = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token']

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Session token is required',
        code: 'SESSION_TOKEN_MISSING'
      })
    }

    // Verify session is active
    const session = await mockDb.findActiveSession(sessionToken)
    if (!session || !session.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      })
    }

    // Add session info to request
    req.session = session

    next()

  } catch (error) {
    console.error('Session verification error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error during session verification',
      code: 'SESSION_ERROR'
    })
  }
}

// Combined middleware for full admin authentication
export const requireAdmin = (requiredRoles = []) => {
  return [
    verifyAdminToken,
    requireAdminRole(requiredRoles)
  ]
}

// Super admin only middleware
export const requireSuperAdmin = requireAdmin(['super_admin'])

// Admin or Super Admin middleware
export const requireAdminOrSuper = requireAdmin(['admin', 'super_admin'])

// Support staff access (all roles)
export const requireAnyAdmin = requireAdmin([])

// Middleware to log admin actions
export const logAdminAction = (actionType, targetType = null) => {
  return (req, res, next) => {
    // Store action info for later logging
    req.adminAction = {
      actionType,
      targetType,
      targetId: req.params.id || req.params.businessId || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      requestData: {
        method: req.method,
        url: req.originalUrl,
        body: req.method !== 'GET' ? req.body : undefined
      }
    }

    next()
  }
}

// Error handler for admin auth errors
export const handleAdminAuthError = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token format',
      code: 'TOKEN_MALFORMED'
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED'
    })
  }

  // Pass other errors to default error handler
  next(err)
}

export default {
  verifyAdminToken,
  requireAdminRole,
  verifyAdminSession,
  requireAdmin,
  requireSuperAdmin,
  requireAdminOrSuper,
  requireAnyAdmin,
  logAdminAction,
  handleAdminAuthError
}