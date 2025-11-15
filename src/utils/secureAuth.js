// Secure API utilities for authenticated requests
// Handles secure business ID authentication headers

import { endpoints } from '../config/api.js'
import i18n from '../i18n/config.js'

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
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ar'  // NEW: Include language preference
    }
  }

  return {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
    'x-business-id': businessId, // Secure business ID (biz_*)
    'Accept-Language': i18n.language || 'ar'  // NEW: Include language preference
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
// ============================================
// Branch Manager Authentication Functions
// ============================================

/**
 * Get stored manager authentication data
 */
export function getManagerAuthData() {
  return {
    isAuthenticated: localStorage.getItem('managerAuthenticated') === 'true',
    branchId: localStorage.getItem('managerBranchId'),
    branchName: localStorage.getItem('managerBranchName'),
    managerToken: localStorage.getItem('managerToken')
  }
}

/**
 * Get manager authentication headers for API requests
 */
export function getManagerAuthHeaders() {
  const { managerToken, branchId } = getManagerAuthData()
  
  if (!managerToken || !branchId) {
    console.warn('⚠️ Missing manager authentication data')
    return {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'ar'  // NEW: Include language preference
    }
  }

  return {
    'Content-Type': 'application/json',
    'x-manager-token': managerToken,
    'x-branch-id': branchId,
    'Accept-Language': i18n.language || 'ar'  // NEW: Include language preference
  }
}

/**
 * Check if manager is authenticated
 */
export function isManagerAuthenticated() {
  const { isAuthenticated, branchId, managerToken } = getManagerAuthData()
  
  if (!isAuthenticated || !branchId || !managerToken) {
    return false
  }

  // Validate branch ID format
  if (!branchId.startsWith('branch_')) {
    return false
  }

  return true
}

/**
 * Login manager
 */
export async function managerLogin(branchId, pin) {
  try {
    // Use centralized endpoint configuration
    const response = await fetch(endpoints.branchManagerLogin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ branchId, pin })
    })

    const data = await response.json()

    if (data.success && data.token) {
      localStorage.setItem('managerAuthenticated', 'true')
      localStorage.setItem('managerToken', data.token)
      localStorage.setItem('managerBranchId', data.branch.id)
      localStorage.setItem('managerBranchName', data.branch.name)

      return { success: true }
    } else {
      return { success: false, error: data.error || 'Login failed' }
    }
  } catch (error) {
    console.error('Manager login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

/**
 * Logout manager
 */
export function managerLogout() {
  localStorage.removeItem('managerAuthenticated')
  localStorage.removeItem('managerToken')
  localStorage.removeItem('managerBranchId')
  localStorage.removeItem('managerBranchName')
}

/**
 * Make authenticated manager API request
 */
export async function managerApiRequest(url, options = {}) {
  const headers = {
    ...getManagerAuthHeaders(),
    ...(options.headers || {})
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 401) {
    managerLogout()
    window.location.href = '/branch-manager-login'
    throw new Error('Authentication expired')
  }

  return response
}

/**
 * Update branch manager PIN immediately
 * @param {string} branchId - Branch public ID
 * @param {string} pin - 4-6 digit PIN
 * @returns {Promise<{success: boolean, code: string, message?: string}>}
 */
export async function updateBranchManagerPin(branchId, pin) {
  // Validate PIN format client-side
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return {
      success: false,
      code: 'PIN_FORMAT_INVALID'
    }
  }

  if (!branchId) {
    return {
      success: false,
      code: 'BRANCH_ID_REQUIRED'
    }
  }

  try {
    const response = await secureApiRequest(`${endpoints.myBranches}/${branchId}/manager-pin`, {
      method: 'PUT',
      body: JSON.stringify({ manager_pin: pin })
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle specific error status codes
      switch (response.status) {
        case 400:
          return { success: false, code: 'PIN_FORMAT_INVALID', message: data.error }
        case 401:
          return { success: false, code: 'SESSION_EXPIRED' }
        case 404:
          return { success: false, code: 'BRANCH_NOT_FOUND' }
        case 500:
          return { success: false, code: 'SERVER_ERROR' }
        default:
          return { success: false, code: 'PIN_SAVE_FAILED', message: data.error }
      }
    }

    return {
      success: true,
      code: 'PIN_SAVED_SUCCESS'
    }
  } catch (error) {
    console.error('Error updating branch manager PIN:', error)
    
    // Handle network errors
    if (error.message === 'Failed to fetch' || error.message === 'Network request failed') {
      return {
        success: false,
        code: 'NETWORK_ERROR'
      }
    }

    return {
      success: false,
      code: 'PIN_SAVE_FAILED',
      message: error.message
    }
  }
}

