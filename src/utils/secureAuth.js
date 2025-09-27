// Secure API utilities for authenticated requests
// Handles secure business ID authentication headers

/**
 * Get stored authentication data
 */
export function getAuthData() {
  return {
    isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
    businessId: localStorage.getItem('businessId'), // Now secure ID (biz_*)
    businessName: localStorage.getItem('businessName'),
    userEmail: localStorage.getItem('userEmail'),
    sessionToken: localStorage.getItem('sessionToken')
  }
}

/**
 * Get secure authentication headers for API requests
 */
export function getSecureAuthHeaders() {
  const { sessionToken, businessId } = getAuthData()
  
  if (!sessionToken || !businessId) {
    console.warn('⚠️ Missing authentication data for secure headers')
    return {
      'Content-Type': 'application/json'
    }
  }

  return {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
    'x-business-id': businessId // Secure business ID (biz_*)
  }
}

/**
 * Make authenticated API request with secure headers
 */
export async function secureApiRequest(url, options = {}) {
  const headers = {
    ...getSecureAuthHeaders(),
    ...(options.headers || {})
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  // Handle authentication failures
  if (response.status === 401) {
    console.warn('🔒 Authentication failed - redirecting to login')
    // Clear invalid auth data
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('businessId')
    localStorage.removeItem('sessionToken')
    // Redirect to login
    window.location.href = '/auth?mode=signin'
    throw new Error('Authentication failed')
  }

  return response
}

/**
 * Logout user and clear secure authentication data
 */
export function logout() {
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('businessId')
  localStorage.removeItem('businessName')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('sessionToken')
  
  console.log('🔒 User logged out - secure data cleared')
  window.location.href = '/auth?mode=signin'
}

/**
 * Check if user is authenticated with valid secure credentials
 */
export function isAuthenticated() {
  const { isAuthenticated, businessId, sessionToken } = getAuthData()
  
  // Verify we have secure business ID format
  const hasSecureBusinessId = businessId && businessId.startsWith('biz_')
  
  return isAuthenticated && hasSecureBusinessId && sessionToken
}

/**
 * Validate secure business ID format
 */
export function validateSecureBusinessId(businessId) {
  if (!businessId) return false
  return businessId.startsWith('biz_') && businessId.length >= 20
}

/**
 * Validate secure offer ID format  
 */
export function validateSecureOfferId(offerId) {
  if (!offerId) return false
  return offerId.startsWith('off_') && offerId.length >= 20
}

/**
 * Validate secure branch ID format  
 */
export function validateSecureBranchId(branchId) {
  if (!branchId) return false
  return branchId.startsWith('branch_') && branchId.length >= 20
}

/**
 * Validate secure customer ID format  
 */
export function validateSecureCustomerId(customerId) {
  if (!customerId) return false
  return customerId.startsWith('cust_') && customerId.length >= 20
}

/**
 * Get secure business ID from localStorage
 */
export function getSecureBusinessId() {
  return localStorage.getItem('businessId')
}

export default {
  getAuthData,
  getSecureAuthHeaders,
  secureApiRequest,
  logout,
  isAuthenticated,
  validateSecureBusinessId,
  validateSecureOfferId,
  validateSecureBranchId,
  validateSecureCustomerId,
  getSecureBusinessId
}