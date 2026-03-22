import express from 'express'
import AdminAuthController from '../controllers/adminAuthController.js'
import AdminBusinessController from '../controllers/adminBusinessController.js'
import AdminAnalyticsController from '../controllers/adminAnalyticsController.js'
import AdminEmailStatsController from '../controllers/adminEmailStatsController.js'
import AdminIconsController from '../controllers/adminIconsController.js'
import AdminMessagingController from '../controllers/adminMessagingController.js'
import AdminMessagingAnalyticsController from '../controllers/adminMessagingAnalyticsController.js'
import AdminSettingsController from '../controllers/adminSettingsController.js'
import AdminMigrationController from '../controllers/adminMigrationController.js'
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

router.get('/analytics/page-views',
  requireAdmin(),
  logAdminAction('view_page_view_analytics', 'analytics'),
  AdminAnalyticsController.getPageViewStats
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

// Email analytics routes
router.get('/analytics/email/stats',
  requireAdmin(),
  logAdminAction('view_email_stats', 'analytics'),
  AdminEmailStatsController.getEmailStats
)

router.get('/analytics/email/usage',
  requireAdmin(),
  logAdminAction('view_email_usage', 'analytics'),
  AdminEmailStatsController.getEmailUsage
)

router.get('/analytics/email/health',
  requireAdmin(),
  logAdminAction('view_email_health', 'analytics'),
  AdminEmailStatsController.getEmailHealth
)

// =================
// MESSAGING ROUTES
// =================

// Get all conversations
router.get('/messages/conversations',
  requireAdminOrSuper,
  logAdminAction('view_conversations', 'messaging'),
  AdminMessagingController.getConversations
)

// Get conversation by ID with messages
router.get('/messages/conversations/:id',
  requireAdminOrSuper,
  logAdminAction('view_conversation_details', 'messaging'),
  AdminMessagingController.getConversationById
)

// Send message to business
router.post('/messages/send',
  requireAdminOrSuper,
  logAdminAction('send_message', 'messaging'),
  AdminMessagingController.sendMessage
)

// Mark message as read
router.patch('/messages/:id/read',
  requireAdminOrSuper,
  logAdminAction('mark_message_read', 'messaging'),
  AdminMessagingController.markAsRead
)

// Update conversation status
router.patch('/messages/conversations/:id/status',
  requireAdminOrSuper,
  logAdminAction('update_conversation_status', 'messaging'),
  AdminMessagingController.updateConversationStatus
)

// Create message template
router.post('/messages/templates',
  requireAdminOrSuper,
  logAdminAction('create_message_template', 'messaging'),
  AdminMessagingController.createTemplate
)

// Get message templates
router.get('/messages/templates',
  requireAdminOrSuper,
  logAdminAction('view_message_templates', 'messaging'),
  AdminMessagingController.getTemplates
)

// Messaging Analytics Routes
router.get('/messages/analytics/stats',
  requireAdminOrSuper,
  logAdminAction('view_messaging_stats', 'analytics'),
  AdminMessagingAnalyticsController.getMessagingStats
)

router.get('/messages/analytics/response-times',
  requireAdminOrSuper,
  logAdminAction('view_response_time_metrics', 'analytics'),
  AdminMessagingAnalyticsController.getResponseTimeMetrics
)

router.get('/messages/analytics/trends',
  requireAdminOrSuper,
  logAdminAction('view_conversation_trends', 'analytics'),
  AdminMessagingAnalyticsController.getConversationTrends
)

router.get('/messages/analytics/status-distribution',
  requireAdminOrSuper,
  logAdminAction('view_status_distribution', 'analytics'),
  AdminMessagingAnalyticsController.getConversationStatusDistribution
)

router.get('/messages/analytics/active-businesses',
  requireAdminOrSuper,
  logAdminAction('view_active_businesses', 'analytics'),
  AdminMessagingAnalyticsController.getMostActiveBusinesses
)

router.get('/messages/analytics/export',
  requireAdminOrSuper,
  logAdminAction('export_messaging_history', 'analytics'),
  AdminMessagingAnalyticsController.exportMessagingHistory
)

// Unread count endpoint
router.get('/messages/unread-count',
  requireAdminOrSuper,
  AdminMessagingController.getUnreadCount
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
// SETTINGS ROUTES
// =================

// Get notification preferences
router.get('/settings/notifications',
  requireAdmin(),
  logAdminAction('view_notification_preferences', 'settings'),
  AdminSettingsController.getNotificationPreferences
)

// Update notification preferences
router.put('/settings/notifications',
  requireAdmin(),
  logAdminAction('update_notification_preferences', 'settings'),
  AdminSettingsController.updateNotificationPreferences
)

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

// =================
// MIGRATION MANAGEMENT ROUTES
// =================

router.get('/migrations',
  requireSuperAdmin,
  logAdminAction('view_migration_status', 'system'),
  AdminMigrationController.getMigrationStatus
)

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
      'GET /api/admin/messages/conversations',
      'PUT /api/admin/icons/:id',
      'DELETE /api/admin/icons/:id',
      'GET /api/admin/health',
      'GET /api/admin/migrations'
    ]
  })
})

export default router