import express from 'express'
import AdminAuthController from '../controllers/adminAuthController.js'
import AdminBusinessController from '../controllers/adminBusinessController.js'
import AdminAnalyticsController from '../controllers/adminAnalyticsController.js'
import AdminIconsController from '../controllers/adminIconsController.js'
import {
  requireAdmin,
  requireSuperAdmin,
  requireAdminOrSuper,
  logAdminAction,
  handleAdminAuthError
} from '../middleware/adminAuth.js'
import { iconUpload, handleIconUploadError, validateUploadedSVGs } from '../middleware/iconUpload.js'

const router = express.Router()

// Apply admin auth error handler
router.use(handleAdminAuthError)

// =================
// AUTHENTICATION ROUTES (no auth required)
// =================

// Admin login
router.post('/auth/login', AdminAuthController.login)

// Admin logout (requires token to log the action)
router.post('/auth/logout', AdminAuthController.logout)

// =================
// AUTHENTICATED ROUTES (require admin token)
// =================

// Verify token and get admin info
router.get('/auth/verify', requireAdmin(), AdminAuthController.verifyToken)

// Refresh access token
router.post('/auth/refresh', requireAdmin(), AdminAuthController.refreshToken)

// Change password
router.put('/auth/password', requireAdmin(), AdminAuthController.changePassword)

// =================
// BUSINESS MANAGEMENT ROUTES
// =================

// Get all businesses with filtering and pagination
router.get('/businesses',
  requireAdminOrSuper,
  logAdminAction('view_businesses', 'business'),
  AdminBusinessController.getBusinesses
)

// Get business statistics
router.get('/businesses/stats',
  requireAdminOrSuper,
  logAdminAction('view_business_stats', 'system'),
  AdminBusinessController.getBusinessStats
)

// Get single business details
router.get('/businesses/:id',
  requireAdminOrSuper,
  logAdminAction('view_business_details', 'business'),
  AdminBusinessController.getBusinessById
)

// Update business status (approve, suspend, etc.)
router.put('/businesses/:id/status',
  requireAdminOrSuper,
  logAdminAction('update_business_status', 'business'),
  AdminBusinessController.updateBusinessStatus
)

// Delete business (super admin only)
router.delete('/businesses/:id',
  requireSuperAdmin,
  logAdminAction('delete_business', 'business'),
  AdminBusinessController.deleteBusiness
)

// Bulk operations on businesses (admin or super admin)
router.post('/businesses/bulk-update',
  requireAdminOrSuper,
  logAdminAction('bulk_update_businesses', 'business'),
  AdminBusinessController.bulkUpdateBusinesses
)

// =================
// ANALYTICS ROUTES
// =================

// Platform overview dashboard
router.get('/analytics/overview',
  requireAdmin(),
  logAdminAction('view_platform_overview', 'analytics'),
  AdminAnalyticsController.getPlatformOverview
)

// Business growth analytics
router.get('/analytics/growth',
  requireAdmin(),
  logAdminAction('view_growth_analytics', 'analytics'),
  AdminAnalyticsController.getBusinessGrowth
)

// Wallet integration analytics
router.get('/analytics/wallet',
  requireAdmin(),
  logAdminAction('view_wallet_analytics', 'analytics'),
  AdminAnalyticsController.getWalletAnalytics
)

// Top performing businesses
router.get('/analytics/top-businesses',
  requireAdmin(),
  logAdminAction('view_top_businesses', 'analytics'),
  AdminAnalyticsController.getTopBusinesses
)

// System health metrics
router.get('/analytics/system-health',
  requireAdmin(),
  logAdminAction('view_system_health', 'system'),
  AdminAnalyticsController.getSystemHealth
)

// Revenue analytics (admin or super admin only)
router.get('/analytics/revenue',
  requireAdminOrSuper,
  logAdminAction('view_revenue_analytics', 'analytics'),
  AdminAnalyticsController.getRevenueAnalytics
)

// Support analytics
router.get('/analytics/support',
  requireAdmin(),
  logAdminAction('view_support_analytics', 'analytics'),
  AdminAnalyticsController.getSupportAnalytics
)

// Comprehensive analytics report
router.get('/analytics/report',
  requireAdmin(),
  logAdminAction('generate_analytics_report', 'analytics'),
  AdminAnalyticsController.getAnalyticsReport
)

// Export analytics data (admin or super admin only)
router.get('/analytics/export',
  requireAdminOrSuper,
  logAdminAction('export_analytics', 'analytics'),
  AdminAnalyticsController.exportAnalytics
)

// =================
// SYSTEM ADMINISTRATION ROUTES (Super Admin Only)
// =================

// Platform settings management (future implementation)
router.get('/settings', requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Platform settings endpoint - to be implemented',
    data: { settings: [] }
  })
})

router.put('/settings/:key', requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Platform setting update endpoint - to be implemented'
  })
})

// Admin management (future implementation)
router.get('/admins', requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin management endpoint - to be implemented',
    data: { admins: [] }
  })
})

router.post('/admins', requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Create admin endpoint - to be implemented'
  })
})

// Activity logs
router.get('/logs/activities', requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin activity logs endpoint - to be implemented',
    data: { activities: [] }
  })
})

// System maintenance
router.post('/system/maintenance', requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'System maintenance endpoint - to be implemented'
  })
})

// =================
// ICON MANAGEMENT ROUTES (Super Admin Only)
// =================

// Upload new icon
router.post('/icons',
  requireSuperAdmin,
  logAdminAction('upload_icon', 'icon'),
  iconUpload.fields([
    { name: 'filled', maxCount: 1 },
    { name: 'stroke', maxCount: 1 }
  ]),
  handleIconUploadError,
  validateUploadedSVGs,
  AdminIconsController.uploadIcon
)

// Update icon
router.put('/icons/:id',
  requireSuperAdmin,
  logAdminAction('update_icon', 'icon'),
  iconUpload.fields([
    { name: 'filled', maxCount: 1 },
    { name: 'stroke', maxCount: 1 }
  ]),
  handleIconUploadError,
  validateUploadedSVGs,
  AdminIconsController.updateIcon
)

// Delete icon
router.delete('/icons/:id',
  requireSuperAdmin,
  logAdminAction('delete_icon', 'icon'),
  AdminIconsController.deleteIcon
)

// Get categories
router.get('/icons/categories',
  requireSuperAdmin,
  logAdminAction('view_icon_categories', 'icon'),
  AdminIconsController.getCategories
)

// Add category
router.post('/icons/categories',
  requireSuperAdmin,
  logAdminAction('add_icon_category', 'icon'),
  AdminIconsController.addCategory
)

// Regenerate previews
router.post('/icons/regenerate-previews',
  requireSuperAdmin,
  logAdminAction('regenerate_icon_previews', 'system'),
  AdminIconsController.regeneratePreviews
)

// =================
// SUPPORT ROUTES (future implementation)
// =================

// Support tickets management
router.get('/support/tickets', requireAdmin(), (req, res) => {
  res.json({
    success: true,
    message: 'Support tickets endpoint - to be implemented',
    data: { tickets: [] }
  })
})

router.get('/support/tickets/:id', requireAdmin(), (req, res) => {
  res.json({
    success: true,
    message: 'Support ticket details endpoint - to be implemented'
  })
})

router.put('/support/tickets/:id', requireAdmin(), (req, res) => {
  res.json({
    success: true,
    message: 'Update support ticket endpoint - to be implemented'
  })
})

// =================
// HEALTH CHECK
// =================

// Admin API health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is healthy',
    timestamp: new Date().toISOString(),
    service: 'admin-api',
    version: '1.0.0'
  })
})

// =================
// 404 HANDLER FOR ADMIN ROUTES
// =================

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Admin API endpoint not found',
    path: req.originalUrl,
    available_endpoints: [
      'POST /api/admin/auth/login',
      'GET /api/admin/businesses',
      'GET /api/admin/analytics/overview',
      'POST /api/admin/icons',
      'PUT /api/admin/icons/:id',
      'DELETE /api/admin/icons/:id',
      'GET /api/admin/health'
    ]
  })
})

export default router