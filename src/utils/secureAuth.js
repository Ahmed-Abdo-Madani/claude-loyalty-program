// Secure API utilities for authenticated requests
// Handles secure business ID authentication headers

import { endpoints } from '../config/api.js'
import i18n from '../i18n/config.js'
import { setManagerItem, getManagerItem, clearManagerSession } from './managerStorage.js'

/**
 * Get stored authentication data
 * 
 * Authentication Storage Keys:
 * - 'sessionToken' (NOT 'businessSessionToken')
 * - 'businessId' (secure format: biz_*)
 * Always use getSecureAuthHeaders() instead of manual localStorage access
 */
export function getAuthData() {
  return {
    isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
    businessId: localStorage.getItem('businessId'), // Now secure ID (biz_*)
    businessName: localStorage.getItem('businessName'),
    userEmail: localStorage.getItem('userEmail'),
    sessionToken: localStorage.getItem('sessionToken'),
    subscription: JSON.parse(localStorage.getItem('subscription') || 'null'),
    businessStatus: localStorage.getItem('businessStatus') || 'active',
    subscriptionStatus: localStorage.getItem('subscriptionStatus') || 'trial',
    suspensionReason: localStorage.getItem('suspensionReason') || null,
    suspensionDate: localStorage.getItem('suspensionDate') || null
  }
}

/**
 * Set authentication data including business status
 */
export function setAuthData({
  sessionToken,
  businessId,
  businessName,
  userEmail,
  businessStatus,
  subscriptionStatus,
  suspensionReason,
  suspensionDate
}) {
  localStorage.setItem('isAuthenticated', 'true')
  localStorage.setItem('sessionToken', sessionToken)
  localStorage.setItem('businessId', businessId)
  localStorage.setItem('businessName', businessName)
  localStorage.setItem('userEmail', userEmail)
  localStorage.setItem('businessStatus', businessStatus || 'active')
  localStorage.setItem('subscriptionStatus', subscriptionStatus || 'trial')
  localStorage.setItem('suspensionReason', suspensionReason || '')
  localStorage.setItem('suspensionDate', suspensionDate || '')

  console.log('🔒 Authentication data stored with status:', businessStatus)
}

/**
 * Get business status
 */
export function getBusinessStatus() {
  return localStorage.getItem('businessStatus') || 'active'
}

/**
 * Check if business is suspended
 */
export function isSuspended() {
  return getBusinessStatus() === 'suspended'
}

/**
 * Get subscription data from localStorage
 */
export function getSubscriptionData() {
  const subscriptionStr = localStorage.getItem('subscription')
  if (!subscriptionStr) return null

  try {
    return JSON.parse(subscriptionStr)
  } catch (error) {
    console.error('Failed to parse subscription data:', error)
    return null
  }
}

/**
 * Check if the current subscription plan type starts with 'pos_'
 */
export function isPOSPlan() {
  const subscription = getSubscriptionData()
  if (!subscription) return false
  return subscription.plan_type && subscription.plan_type.startsWith('pos_')
}

/**
 * Check if the current subscription plan type starts with 'loyalty_'
 */
export function isLoyaltyPlan() {
  const subscription = getSubscriptionData()
  if (!subscription) return false
  return subscription.plan_type && subscription.plan_type.startsWith('loyalty_')
}

/**
 * Set subscription data in localStorage
 */
export function setSubscriptionData(subscriptionData) {
  if (!subscriptionData) {
    localStorage.removeItem('subscription')
    return
  }

  try {
    localStorage.setItem('subscription', JSON.stringify(subscriptionData))
    console.log('🔒 Subscription data stored')
  } catch (error) {
    console.error('Failed to store subscription data:', error)
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

  // Handle trial expiration or plan limits
  if (response.status === 403) {
    const clonedResponse = response.clone()
    const data = await clonedResponse.json().catch(() => ({}))

    if (data.code === 'TRIAL_EXPIRED') {
      console.warn('🔒 Trial period expired')

      // Store trial expiration state
      localStorage.setItem('trialExpired', 'true')
      localStorage.setItem('trialExpirationData', JSON.stringify({
        trial_ends_at: data.trial_ends_at,
        days_expired: data.days_expired,
        message: data.message
      }))

      // Dispatch custom event to trigger modal
      window.dispatchEvent(new CustomEvent('trialExpired', {
        detail: data
      }))

      // Re-throw to allow component-level handling
      throw new Error('TRIAL_EXPIRED')
    }

    if (data.code === 'PLAN_LIMIT_REACHED' || data.code === 'LIMIT_EXCEEDED') {
      console.warn('🔒 Plan limit reached:', data.limitType)
      const error = new Error(data.message || 'Plan limit reached')
      error.code = data.code
      error.limitType = data.limitType
      error.limits = data.limits
      throw error
    }
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
  localStorage.removeItem('subscription')
  localStorage.removeItem('businessStatus')
  localStorage.removeItem('subscriptionStatus')
  localStorage.removeItem('suspensionReason')
  localStorage.removeItem('suspensionDate')

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

/**
 * Update business and subscription status after payment operations
 * Comment 1: Helper to keep post-login flows consistent with login-time state
 */
export function updateStatusAfterPayment({ businessStatus, subscriptionStatus, subscriptionData }) {
  if (businessStatus) {
    localStorage.setItem('businessStatus', businessStatus)
  }
  if (subscriptionStatus) {
    localStorage.setItem('subscriptionStatus', subscriptionStatus)
  }
  if (subscriptionData) {
    setSubscriptionData(subscriptionData)
  }

  // Clear suspension fields if reactivated
  if (businessStatus === 'active') {
    localStorage.removeItem('suspensionReason')
    localStorage.removeItem('suspensionDate')
  }

  console.log('🔒 Status updated after payment', { businessStatus, subscriptionStatus })
}

export function isTrialExpired() {
  return localStorage.getItem('trialExpired') === 'true'
}

export function getTrialExpirationData() {
  const data = localStorage.getItem('trialExpirationData')
  return data ? JSON.parse(data) : null
}

export function clearTrialExpiration() {
  localStorage.removeItem('trialExpired')
  localStorage.removeItem('trialExpirationData')
}

export default {
  getAuthData,
  setAuthData,
  getSecureAuthHeaders,
  secureApiRequest,
  logout,
  isAuthenticated,
  validateSecureBusinessId,
  validateSecureOfferId,
  validateSecureBranchId,
  validateSecureCustomerId,
  getSecureBusinessId,
  getSubscriptionData,
  setSubscriptionData,
  getBusinessStatus,
  isSuspended,
  updateStatusAfterPayment,
  isTrialExpired,
  getTrialExpirationData,
  clearTrialExpiration,
  isPOSPlan,
  isLoyaltyPlan,
  isManagerAuthenticatedAsync
}
// ============================================
// Branch Manager Authentication Functions
// ============================================

/**
 * Get stored manager authentication data
 */
export async function getManagerAuthData() {
  return {
    isAuthenticated: (await getManagerItem('managerAuthenticated')) === 'true',
    branchId: await getManagerItem('managerBranchId'),
    branchName: await getManagerItem('managerBranchName'),
    managerToken: await getManagerItem('managerToken')
  }
}

/**
 * Get manager authentication headers for API requests
 */
export async function getManagerAuthHeaders() {
  const { managerToken, branchId } = await getManagerAuthData()

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
export async function isManagerAuthenticatedAsync() {
  const { isAuthenticated, branchId, managerToken } = await getManagerAuthData()

  if (!isAuthenticated || !branchId || !managerToken) {
    return false
  }

  // Validate branch ID format
  if (!branchId.startsWith('branch_')) {
    return false
  }

  const timestampStr = await getManagerItem('managerLoginTimestamp');
  const timestamp = parseInt(timestampStr, 10);

  if (!timestampStr || isNaN(timestamp)) {
    await clearManagerSession();
    return false;
  }

  const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
  if (Date.now() - timestamp > SESSION_TTL_MS) {
    await clearManagerSession();
    return false;
  }

  return true
}

export const isManagerAuthenticated = isManagerAuthenticatedAsync;

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
      await setManagerItem('managerAuthenticated', 'true')
      await setManagerItem('managerToken', data.token)
      await setManagerItem('managerBranchId', data.branch.id)
      await setManagerItem('managerBranchName', data.branch.name)
      await setManagerItem('managerLoginTimestamp', Date.now().toString())

      return { success: true }
    } else {
      return {
        success: false,
        error: data.error || 'Login failed',
        errorCode: data.errorCode,
        businessContact: data.businessContact
      }
    }
  } catch (error) {
    console.error('Manager login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

/**
 * Logout manager
 */
export async function managerLogout() {
  await clearManagerSession();
}

/**
 * Make authenticated manager API request
 */
export async function managerApiRequest(url, options = {}) {
  const headers = {
    ...(await getManagerAuthHeaders()),
    ...(options.headers || {})
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 401) {
    await managerLogout()
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

