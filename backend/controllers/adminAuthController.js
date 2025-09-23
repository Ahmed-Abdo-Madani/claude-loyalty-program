import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Mock database operations (replace with actual database queries)
const mockDb = {
  // Find admin by email
  async findAdminByEmail(email) {
    // In production, this would be a database query
    const mockAdmin = {
      id: 1,
      email: 'admin@loyaltyplatform.com',
      password_hash: '$2b$10$jU2Plk9YVQA87C6hM.u8Tuxh1/Zn7k/cwzKH5doan1i6nkzRieS1e', // admin123
      full_name: 'Platform Administrator',
      role: 'super_admin',
      status: 'active'
    }

    if (email === mockAdmin.email) {
      return mockAdmin
    }
    return null
  },

  // Create admin session
  async createSession(adminId, sessionToken, expiresAt, ipAddress, userAgent) {
    // In production, this would insert into admin_sessions table
    console.log(`Session created for admin ${adminId}: ${sessionToken}`)
    return {
      id: Date.now(),
      admin_id: adminId,
      session_token: sessionToken,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_active: true,
      created_at: new Date()
    }
  },

  // Update admin last login
  async updateLastLogin(adminId) {
    // In production, this would update the platform_admins table
    console.log(`Updated last login for admin ${adminId}`)
  },

  // Find session by token
  async findSessionByToken(token) {
    // In production, this would query admin_sessions table
    // For now, we'll just validate the JWT token
    return null
  },

  // Deactivate session
  async deactivateSession(token) {
    // In production, this would update admin_sessions table
    console.log(`Deactivated session: ${token}`)
  },

  // Log admin action
  async logAdminAction(adminId, actionType, targetType, targetId, actionData, ipAddress, userAgent) {
    // In production, this would insert into admin_actions table
    console.log(`Admin action logged: ${actionType} by admin ${adminId}`)
  }
}

class AdminAuthController {
  // Admin login
  static async login(req, res) {
    try {
      const { email, password } = req.body
      const ipAddress = req.ip || req.connection.remoteAddress
      const userAgent = req.get('User-Agent') || 'Unknown'

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        })
      }

      // Find admin by email
      const admin = await mockDb.findAdminByEmail(email.toLowerCase())
      if (!admin) {
        // Log failed login attempt
        await mockDb.logAdminAction(
          null, 'login_failed', 'admin', null,
          { email, reason: 'admin_not_found' },
          ipAddress, userAgent
        )

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // Check admin status
      if (admin.status !== 'active') {
        await mockDb.logAdminAction(
          admin.id, 'login_failed', 'admin', admin.id,
          { reason: 'account_inactive', status: admin.status },
          ipAddress, userAgent
        )

        return res.status(401).json({
          success: false,
          message: 'Account is not active'
        })
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
      if (!isPasswordValid) {
        await mockDb.logAdminAction(
          admin.id, 'login_failed', 'admin', admin.id,
          { reason: 'invalid_password' },
          ipAddress, userAgent
        )

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // Generate JWT token
      const tokenPayload = {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      }

      const accessToken = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || 'your-admin-jwt-secret',
        { expiresIn: '8h' }
      )

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

      // Create session record
      await mockDb.createSession(admin.id, sessionToken, expiresAt, ipAddress, userAgent)

      // Update last login time
      await mockDb.updateLastLogin(admin.id)

      // Log successful login
      await mockDb.logAdminAction(
        admin.id, 'login_success', 'admin', admin.id,
        { ip_address: ipAddress },
        ipAddress, userAgent
      )

      // Return success response
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role
          },
          access_token: accessToken,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        }
      })

    } catch (error) {
      console.error('Admin login error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      })
    }
  }

  // Admin logout
  static async logout(req, res) {
    try {
      const sessionToken = req.headers['x-session-token']
      const adminId = req.admin?.adminId
      const ipAddress = req.ip || req.connection.remoteAddress
      const userAgent = req.get('User-Agent') || 'Unknown'

      // Deactivate session if token provided
      if (sessionToken) {
        await mockDb.deactivateSession(sessionToken)
      }

      // Log logout action
      if (adminId) {
        await mockDb.logAdminAction(
          adminId, 'logout', 'admin', adminId,
          { session_token: sessionToken },
          ipAddress, userAgent
        )
      }

      res.json({
        success: true,
        message: 'Logout successful'
      })

    } catch (error) {
      console.error('Admin logout error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      })
    }
  }

  // Verify token and get admin info
  static async verifyToken(req, res) {
    try {
      const admin = req.admin

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        })
      }

      res.json({
        success: true,
        data: {
          admin: {
            id: admin.adminId,
            email: admin.email,
            role: admin.role
          }
        }
      })

    } catch (error) {
      console.error('Token verification error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during token verification'
      })
    }
  }

  // Refresh access token
  static async refreshToken(req, res) {
    try {
      const { session_token } = req.body
      const adminId = req.admin?.adminId

      if (!session_token || !adminId) {
        return res.status(400).json({
          success: false,
          message: 'Session token and admin ID are required'
        })
      }

      // In production, verify session is still valid in database
      const session = await mockDb.findSessionByToken(session_token)

      // Generate new access token
      const tokenPayload = {
        adminId: req.admin.adminId,
        email: req.admin.email,
        role: req.admin.role,
        type: 'admin'
      }

      const newAccessToken = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || 'your-admin-jwt-secret',
        { expiresIn: '8h' }
      )

      res.json({
        success: true,
        data: {
          access_token: newAccessToken,
          expires_in: '8h'
        }
      })

    } catch (error) {
      console.error('Token refresh error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during token refresh'
      })
    }
  }

  // Change admin password
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body
      const adminId = req.admin?.adminId
      const ipAddress = req.ip || req.connection.remoteAddress
      const userAgent = req.get('User-Agent') || 'Unknown'

      // Validate input
      if (!current_password || !new_password) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        })
      }

      if (new_password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        })
      }

      // Find current admin
      const admin = await mockDb.findAdminByEmail(req.admin.email)
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        })
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, admin.password_hash)
      if (!isCurrentPasswordValid) {
        await mockDb.logAdminAction(
          adminId, 'password_change_failed', 'admin', adminId,
          { reason: 'invalid_current_password' },
          ipAddress, userAgent
        )

        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        })
      }

      // Hash new password
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds)

      // In production, update password in database
      console.log(`Password updated for admin ${adminId}`)

      // Log password change
      await mockDb.logAdminAction(
        adminId, 'password_changed', 'admin', adminId,
        { changed_at: new Date().toISOString() },
        ipAddress, userAgent
      )

      res.json({
        success: true,
        message: 'Password changed successfully'
      })

    } catch (error) {
      console.error('Password change error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error during password change'
      })
    }
  }
}

export default AdminAuthController