import { getSecureAuthHeaders, secureApiRequest } from '../utils/secureAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

console.log('🔧 API Base URL:', API_BASE_URL)

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
  branchManagerStats: `${API_BASE_URL}/api/branch-manager/stats/today`
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

export default {
  baseURL: API_BASE_URL,
  apiBaseUrl: API_BASE_URL,
  endpoints,
  secureApi
}