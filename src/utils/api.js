import { endpoints } from '../config/api.js'

class ApiService {
  static getAuthHeaders() {
    const sessionToken = localStorage.getItem('sessionToken')
    const businessId = localStorage.getItem('businessId')

    console.log('🔑 Auth Headers Check:', { sessionToken: !!sessionToken, businessId })

    if (sessionToken && businessId) {
      return {
        'x-session-token': sessionToken,
        'x-business-id': businessId
      }
    }
    console.log('❌ Missing auth data - redirecting to login')
    return {}
  }

  static async request(url, options = {}) {
    try {
      console.log('🌐 API Request:', url, options.method || 'GET')
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ API Error:', response.status, data.message)
        throw new Error(data.message || 'API request failed')
      }

      console.log('✅ API Success:', url, data.success)
      return data
    } catch (error) {
      console.error('🚨 API Request Failed:', error)
      throw error
    }
  }

  static async authenticatedRequest(url, options = {}) {
    const authHeaders = this.getAuthHeaders()
    return this.request(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      }
    })
  }

  // Offers API methods
  static async getOffers() {
    return this.request(endpoints.offers)
  }

  static async getOffer(id) {
    return this.request(`${endpoints.offers}/${id}`)
  }

  static async createOffer(offerData) {
    return this.request(endpoints.offers, {
      method: 'POST',
      body: JSON.stringify(offerData)
    })
  }

  static async updateOffer(id, offerData) {
    return this.request(`${endpoints.offers}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(offerData)
    })
  }

  static async deleteOffer(id) {
    return this.request(`${endpoints.offers}/${id}`, {
      method: 'DELETE'
    })
  }

  static async toggleOfferStatus(id) {
    return this.request(`${endpoints.offers}/${id}/status`, {
      method: 'PATCH'
    })
  }

  // Branches API methods
  static async getBranches() {
    return this.request(endpoints.branches)
  }

  static async getBranch(id) {
    return this.request(`${endpoints.branches}/${id}`)
  }

  static async createBranch(branchData) {
    return this.request(endpoints.branches, {
      method: 'POST',
      body: JSON.stringify(branchData)
    })
  }

  static async updateBranch(id, branchData) {
    return this.request(`${endpoints.branches}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData)
    })
  }

  static async deleteBranch(id) {
    return this.request(`${endpoints.branches}/${id}`, {
      method: 'DELETE'
    })
  }

  static async toggleBranchStatus(id) {
    return this.request(`${endpoints.branches}/${id}/status`, {
      method: 'PATCH'
    })
  }

  // Dashboard Analytics API methods (generic - fallback)
  static async getDashboardAnalytics() {
    return this.request(endpoints.dashboardAnalytics)
  }

  static async getRecentActivity() {
    return this.request(endpoints.recentActivity)
  }

  // Business-specific authenticated API methods
  static async getMyOffers() {
    return this.authenticatedRequest(endpoints.myOffers)
  }

  static async getMyBranches() {
    return this.authenticatedRequest(endpoints.myBranches)
  }

  static async getMyAnalytics() {
    return this.authenticatedRequest(endpoints.myAnalytics)
  }

  static async getMyActivity() {
    return this.authenticatedRequest(endpoints.myActivity)
  }

  // Authenticated CRUD operations for offers
  static async createMyOffer(offerData) {
    return this.authenticatedRequest(endpoints.myOffers, {
      method: 'POST',
      body: JSON.stringify(offerData)
    })
  }

  static async updateMyOffer(id, offerData) {
    return this.authenticatedRequest(`${endpoints.myOffers}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(offerData)
    })
  }

  static async deleteMyOffer(id) {
    return this.authenticatedRequest(`${endpoints.myOffers}/${id}`, {
      method: 'DELETE'
    })
  }

  static async toggleMyOfferStatus(id) {
    return this.authenticatedRequest(`${endpoints.myOffers}/${id}/status`, {
      method: 'PATCH'
    })
  }

  // Authenticated CRUD operations for branches
  static async createMyBranch(branchData) {
    return this.authenticatedRequest(endpoints.myBranches, {
      method: 'POST',
      body: JSON.stringify(branchData)
    })
  }

  static async updateMyBranch(id, branchData) {
    return this.authenticatedRequest(`${endpoints.myBranches}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData)
    })
  }

  static async deleteMyBranch(id) {
    return this.authenticatedRequest(`${endpoints.myBranches}/${id}`, {
      method: 'DELETE'
    })
  }

  static async toggleMyBranchStatus(id) {
    return this.authenticatedRequest(`${endpoints.myBranches}/${id}/status`, {
      method: 'PATCH'
    })
  }

  // Public Customer API methods
  static async getPublicOffer(id) {
    return this.request(`${endpoints.publicOffer}/${id}`)
  }
}

export default ApiService