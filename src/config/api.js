const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

console.log('🔧 API Base URL:', API_BASE_URL)

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

  // Test APIs
  testDualQR: `${API_BASE_URL}/api/business/test/dual-qr-flow`,
  
  // Debug APIs
  debugWalletObject: `${API_BASE_URL}/api/business/debug/wallet-object`,
  createWalletObject: `${API_BASE_URL}/api/business/debug/create-wallet-object`
}

export default {
  baseURL: API_BASE_URL,
  endpoints
}