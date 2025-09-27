import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { Op } from 'sequelize'
import PlatformAdmin from '../models/PlatformAdmin.js'
import AdminSession from '../models/AdminSession.js'

class AdminAuthController {
  // Admin login
  static async login(req, res) {
    try {
      const { email, password } = req.body
      const ipAddress = req.ip || req.connection.remoteAddress
      const userAgent = req.get('User-Agent') || 'Unknown'

      console.log('🔐 Admin login attempt:', { email, ipAddress, userAgent })

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        })
      }

      // Find admin by email
      const admin = await PlatformAdmin.findOne({
        where: { email: email.toLowerCase() }
      })
      
      if (!admin) {
        console.log('❌ Admin not found:', email)
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      console.log('👤 Admin found:', { id: admin.id, email: admin.email, status: admin.status })

      // Check admin status
      if (admin.status !== 'active') {
        console.log('❌ Admin account not active:', admin.status)
        return res.status(401).json({
          success: false,
          message: 'Account is not active'
        })
      }

      // Verify password
      console.log('🔑 Verifying password...')
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
      if (!isPasswordValid) {
        console.log('❌ Invalid password for admin:', email)
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      console.log('✅ Password verified successfully')

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
      await AdminSession.create({
        admin_id: admin.id,
        session_token: sessionToken,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true
      })

      // Update last login time
      await admin.update({ last_login_at: new Date() })

      console.log('🎉 Admin login successful:', { adminId: admin.id, sessionToken })

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
      console.error('❌ Admin login error:', error)
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

      console.log('🔓 Admin logout:', { adminId, sessionToken })

      // Deactivate session if token provided
      if (sessionToken) {
        await AdminSession.update(
          { is_active: false },
          { where: { session_token: sessionToken } }
        )
        console.log('✅ Session deactivated')
      }

      res.json({
        success: true,
        message: 'Logout successful'
      })

    } catch (error) {
      console.error('❌ Admin logout error:', error)
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

      // Verify session is still valid
      const session = await AdminSession.findOne({
        where: { 
          session_token,
          admin_id: adminId,
          is_active: true,
          expires_at: { [Op.gt]: new Date() }
        }
      })

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired session'
        })
      }

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
      const admin = await PlatformAdmin.findByPk(adminId)
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        })
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, admin.password_hash)
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        })
      }

      // Hash new password
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds)

      // Update password in database
      await admin.update({ password_hash: newPasswordHash })

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