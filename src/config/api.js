import { getSecureAuthHeaders, secureApiRequest } from '../utils/secureAuth'
import i18n from '../i18n/config.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * API Asset URL Contract (Standardized)
 * 
 * The platform uses a MIXED URL contract for backward compatibility:
 * 
 * 1. Business Profile Logos (businessLogo.url):
 *    - Format: RELATIVE path (e.g., /api/business/public/logo/{businessId}/{filename})
 *    - Source: Legacy business profile upload system
 *    - Storage: uploads/logos/
 *    - Usage: Frontend MUST prepend apiBaseUrl
 *    - Example: apiBaseUrl + businessLogo.url
 * 
 * 2. Card Design Logos (cardDesignLogo.url):
 *    - Format: ABSOLUTE URL (e.g., https://api.madna.me/designs/logos/{filename})
 *    - Source: ImageProcessingService.processLogoComplete()
 *    - Storage: uploads/designs/logos/
 *    - Usage: Use as-is (already includes domain)
 *    - Example: cardDesignLogo.url (no prefix needed)
 * 
 * Frontend Implementation (getLogoUrl):
 * 1. Check if URL starts with http:// or https://
 * 2. If absolute: return URL as-is
 * 3. If relative: prepend apiBaseUrl
 * 
 * Backend Implementation:
 * - Business logos: Return relative proxy paths (e.g., /api/business/public/logo/...)
 * - Card design logos: Return absolute URLs directly from ImageProcessingService
 * - Never wrap absolute URLs with proxy paths (causes double-prefixing)
 * 
 * See: src/pages/CustomerSignup.jsx → getLogoUrl() for reference implementation
 */

// Export for components that need direct access
export const apiBaseUrl = API_BASE_URL

export const endpoints = {
  baseURL: API_BASE_URL,
  appleWallet: `${API_BASE_URL}/api/wallet/apple/generate`,
  googleWallet: `${API_BASE_URL}/api/wallet/google/generate`,
  health: `${API_BASE_URL}/health`,

  // Business Authentication APIs
  businessLogin: `${API_BASE_URL}/api/business/login`,
  businessRegister: `${API_BASE_URL}/api/business/register`,
  businessCategories: `${API_BASE_URL}/api/business/categories`,

  // Business Dashboard APIs
  offers: `${API_BASE_URL}/api/business/offers`,
  branches: `${API_BASE_URL}/api/business/branches`,

  // Dashboard Analytics APIs (generic)
  dashboardAnalytics: `${API_BASE_URL}/api/business/analytics/dashboard`,
  recentActivity: `${API_BASE_URL}/api/business/analytics/activity`,

  // Business-specific authenticated APIs
  myOffers: `${API_BASE_URL}/api/business/my/offers`,
  myBranches: `${API_BASE_URL}/api/business/my/branches`,
  myAnalytics: `${API_BASE_URL}/api/business/my/analytics`,
  myActivity: `${API_BASE_URL}/api/business/my/activity`,

  // Public Customer APIs
  publicOffer: `${API_BASE_URL}/api/business/public/offer`,

  // Progress Scanning APIs
  scanProgress: `${API_BASE_URL}/api/business/scan/progress`,
  scanVerify: `${API_BASE_URL}/api/business/scan/verify`,
  scanHistory: `${API_BASE_URL}/api/business/scan/history`,
  scanAnalytics: `${API_BASE_URL}/api/business/scan/analytics`,
  scanConfirmPrize: `${API_BASE_URL}/api/business/scan/confirm-prize`,

  // Test APIs
  testDualQRFlow: `${API_BASE_URL}/api/business/test/dual-qr-flow`,
  
  // Debug APIs
  debugWalletObject: `${API_BASE_URL}/api/business/debug/wallet-object`,
  createWalletObject: `${API_BASE_URL}/api/business/debug/create-wallet-object`,

  // Customer Management APIs
  customers: `${API_BASE_URL}/api/customers`,
  customerAnalytics: `${API_BASE_URL}/api/customers/analytics/overview`,

  // Notification APIs
  notifications: `${API_BASE_URL}/api/notifications`,
  notificationCampaigns: `${API_BASE_URL}/api/notifications/campaigns`,
  notificationCampaignsPromotional: `${API_BASE_URL}/api/notifications/campaigns/promotional`,
  notificationCampaignUpdate: (campaignId) => `${API_BASE_URL}/api/notifications/campaigns/${campaignId}`,
  notificationCampaignDelete: (campaignId) => `${API_BASE_URL}/api/notifications/campaigns/${campaignId}`,
  notificationCampaignStatus: (campaignId) => `${API_BASE_URL}/api/notifications/campaigns/${campaignId}/status`,
  notificationCampaignSend: (campaignId) => `${API_BASE_URL}/api/notifications/campaigns/${campaignId}/send`,
  notificationLogs: `${API_BASE_URL}/api/notifications/logs`,
  notificationAnalytics: `${API_BASE_URL}/api/notifications/analytics`,

  // Wallet Notification APIs
  walletNotificationOffer: `${API_BASE_URL}/api/notifications/wallet/offer`,
  walletNotificationReminder: `${API_BASE_URL}/api/notifications/wallet/reminder`,
  walletNotificationBirthday: `${API_BASE_URL}/api/notifications/wallet/birthday`,
  walletNotificationMilestone: `${API_BASE_URL}/api/notifications/wallet/milestone`,
  walletNotificationReengagement: `${API_BASE_URL}/api/notifications/wallet/reengagement`,
  walletNotificationBulk: `${API_BASE_URL}/api/notifications/wallet/bulk`,
  walletNotificationCustom: `${API_BASE_URL}/api/notifications/wallet/custom`,

  // Segmentation APIs
  segments: `${API_BASE_URL}/api/segments`,
  segmentsPredefined: `${API_BASE_URL}/api/segments/predefined`,
  segmentsHighValue: `${API_BASE_URL}/api/segments/predefined/high-value`,
  segmentsAtRisk: `${API_BASE_URL}/api/segments/predefined/at-risk`,
  segmentsBirthday: `${API_BASE_URL}/api/segments/predefined/birthday`,
  segmentSendNotification: (segmentId) => `${API_BASE_URL}/api/segments/${segmentId}/send-notification`,

  // Location APIs
  locationBase: `${API_BASE_URL}/api/locations`,
  locations: `${API_BASE_URL}/api/locations`,
  locationSearch: `${API_BASE_URL}/api/locations/search`,
  locationRegions: `${API_BASE_URL}/api/locations/regions`,
  locationValidate: `${API_BASE_URL}/api/locations/validate`,

  // Stamp Icons APIs (read-only)
  stampIcons: `${API_BASE_URL}/api/stamp-icons`,

  // Admin Icon Management APIs
  adminIcons: `${API_BASE_URL}/api/admin/icons`,
  adminIconsCategories: `${API_BASE_URL}/api/admin/icons/categories`,
  adminIconsRegeneratePreviews: `${API_BASE_URL}/api/admin/icons/regenerate-previews`,

  // Branch Manager APIs
  branchManagerLogin: `${API_BASE_URL}/api/branch-manager/login`,
  branchManagerVerify: `${API_BASE_URL}/api/branch-manager/verify`,
  branchManagerScan: `${API_BASE_URL}/api/branch-manager/scan`,
  branchManagerConfirmPrize: `${API_BASE_URL}/api/branch-manager/confirm-prize`,
  branchManagerStats: `${API_BASE_URL}/api/branch-manager/stats/today`,

  // POS - Product Categories APIs
  posCategories: `${API_BASE_URL}/api/pos/categories`,
  posCategoryUpdate: (categoryId) => `${API_BASE_URL}/api/pos/categories/${categoryId}`,
  posCategoryDelete: (categoryId) => `${API_BASE_URL}/api/pos/categories/${categoryId}`,

  // POS - Products APIs
  posProducts: `${API_BASE_URL}/api/pos/products`,
  posProductDetail: (productId) => `${API_BASE_URL}/api/pos/products/${productId}`,
  posProductUpdate: (productId) => `${API_BASE_URL}/api/pos/products/${productId}`,
  posProductDelete: (productId) => `${API_BASE_URL}/api/pos/products/${productId}`,
  posProductStatus: (productId) => `${API_BASE_URL}/api/pos/products/${productId}/status`,

  // POS - Sales APIs (Branch Manager Access)
  posSales: `${API_BASE_URL}/api/pos/sales`,
  posSaleDetail: (saleId) => `${API_BASE_URL}/api/pos/sales/${saleId}`,
  posSaleRefund: (saleId) => `${API_BASE_URL}/api/pos/sales/${saleId}/refund`,
  posSaleCancel: (saleId) => `${API_BASE_URL}/api/pos/sales/${saleId}/cancel`,

  // POS - Manager Access (Branch Manager POS)
  posManagerProducts: `${API_BASE_URL}/api/pos/manager/products`,
  posManagerCategories: `${API_BASE_URL}/api/pos/manager/categories`,

  // POS - Loyalty Integration (Branch Manager Access)
  posLoyaltyValidate: `${API_BASE_URL}/api/pos/loyalty/validate`,

  // POS - Receipts APIs (Branch Manager Access)
  posReceipt: (saleId) => `${API_BASE_URL}/api/receipts/${saleId}`,
  posReceiptPreview: (saleId) => `${API_BASE_URL}/api/receipts/${saleId}/preview`,
  posReceiptPrint: (saleId) => `${API_BASE_URL}/api/receipts/${saleId}/print`,
  posReceiptEmail: (saleId) => `${API_BASE_URL}/api/receipts/${saleId}/email`,
  posReceiptRegenerate: (saleId) => `${API_BASE_URL}/api/receipts/${saleId}/regenerate`,

  // POS - Analytics APIs (Business Dashboard Access)
  posAnalyticsSummary: `${API_BASE_URL}/api/pos/analytics/summary`,
  posAnalyticsTopProducts: `${API_BASE_URL}/api/pos/analytics/top-products`,
  posAnalyticsTrends: `${API_BASE_URL}/api/pos/analytics/sales-trends`,
  posAnalyticsPaymentBreakdown: `${API_BASE_URL}/api/pos/analytics/payment-breakdown`,
  posAnalyticsCategoryPerformance: `${API_BASE_URL}/api/pos/analytics/category-performance`,
  posAnalyticsHourlyDistribution: `${API_BASE_URL}/api/pos/analytics/hourly-distribution`,
  posAnalyticsExport: `${API_BASE_URL}/api/pos/analytics/export`,

  // Analytics Helper Functions
  getOfferAnalytics: (offerId) => `${API_BASE_URL}/api/business/my/offers/${offerId}/analytics`,
  getBranchAnalytics: (branchId) => `${API_BASE_URL}/api/business/my/branches/${branchId}/analytics`,

  // Subscription management endpoints for plan changes and billing
  subscriptionCheckout: `${API_BASE_URL}/api/business/subscription/checkout`,
  subscriptionPaymentCallback: `${API_BASE_URL}/api/business/subscription/payment-callback`,
  subscriptionReactivate: `${API_BASE_URL}/api/business/subscription/reactivate`,
  subscriptionStatus: `${API_BASE_URL}/api/business/subscription/status`,
  subscriptionDetails: `${API_BASE_URL}/api/business/subscription/details`,
  subscriptionUpgrade: `${API_BASE_URL}/api/business/subscription/upgrade`,
  subscriptionDowngrade: `${API_BASE_URL}/api/business/subscription/downgrade`,
  subscriptionCancel: `${API_BASE_URL}/api/business/subscription/cancel`,
  subscriptionPaymentMethod: `${API_BASE_URL}/api/business/subscription/payment-method`,

  // Payment History & Invoice Management
  businessPayments: `${API_BASE_URL}/api/business/payments`,
  businessInvoices: (invoiceId) => `${API_BASE_URL}/api/business/invoices/${invoiceId}`
}

// Secure API helper functions
export const secureApi = {
  // GET request with secure authentication
  async get(endpoint) {
    return await secureApiRequest(endpoint, { method: 'GET' })
  },

  // POST request with secure authentication  
  async post(endpoint, data) {
    return await secureApiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // PUT request with secure authentication
  async put(endpoint, data) {
    return await secureApiRequest(endpoint, {
      method: 'PUT', 
      body: JSON.stringify(data)
    })
  },

  // DELETE request with secure authentication
  async delete(endpoint) {
    return await secureApiRequest(endpoint, { method: 'DELETE' })
  },

  // PATCH request with secure authentication
  async patch(endpoint, data = null) {
    const options = { method: 'PATCH' }
    if (data) {
      options.body = JSON.stringify(data)
    }
    return await secureApiRequest(endpoint, options)
  }
}

// Public API helper functions (no authentication required)
export const publicApi = {
  // GET request with language header
  async get(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ar',
      ...(options.headers || {})
    }
    
    const response = await fetch(endpoint, {
      method: 'GET',
      ...options,
      headers
    })
    
    return response
  },

  // POST request with language header
  async post(endpoint, data, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ar',
      ...(options.headers || {})
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
      headers
    })
    
    return response
  }
}

export default {
  baseURL: API_BASE_URL,
  apiBaseUrl: API_BASE_URL,
  endpoints,
  secureApi,
  publicApi  // NEW: Add publicApi to exports
}