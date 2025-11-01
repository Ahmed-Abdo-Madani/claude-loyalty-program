import crypto from 'crypto'

/**
 * Secure ID Generator for Business & Offer IDs
 * Generates cryptographically secure, non-enumerable identifiers
 * 
 * Format:
 * - Business: biz_[26 chars] (e.g., biz_2JqK8xN3mP4rL9fE6wH1vY)
 * - Offer: off_[26 chars] (e.g., off_KmP9xR2nQ8vL5jF7wE1sT4)
 * - Customer: cust_[20 chars] (e.g., cust_Rk8N2pL5mF3qW9vE)
 */
class SecureIDGenerator {
  /**
   * Generate a secure business ID
   * @returns {string} Business ID in format: biz_[26chars]
   */
  static generateBusinessID() {
    const randomBytes = crypto.randomBytes(16)
    const randomString = randomBytes.toString('hex').substring(0, 26)
    return `biz_${randomString}`
  }

  /**
   * Generate a secure offer ID
   * @returns {string} Offer ID in format: off_[26chars]
   */
  static generateOfferID() {
    const randomBytes = crypto.randomBytes(16)
    const randomString = randomBytes.toString('hex').substring(0, 26)
    return `off_${randomString}`
  }

  /**
   * Generate a secure customer ID
   * @returns {string} Customer ID in format: cust_[20chars]
   */
  static generateCustomerID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `cust_${randomString}`
  }

  /**
   * Generate a secure branch ID
   * @returns {string} Branch ID in format: branch_[20chars]
   */
  static generateBranchID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `branch_${randomString}`
  }

  /**
   * Generate a secure campaign ID
   * @returns {string} Campaign ID in format: camp_[20chars]
   */
  static generateCampaignID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `camp_${randomString}`
  }

  /**
   * Generate a secure segment ID
   * @returns {string} Segment ID in format: seg_[20chars]
   */
  static generateSegmentID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `seg_${randomString}`
  }

  /**
   * Generate a secure auto-engagement config ID
   * @returns {string} Auto-engagement config ID in format: aec_[20chars]
   */
  static generateAutoEngagementConfigID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `aec_${randomString}`
  }

  /**
   * Validate if an ID follows secure format
   * @param {string} id - The ID to validate
   * @param {string} type - The expected type (business, offer, customer, branch)
   * @returns {boolean} Whether the ID is valid
   */
  static validateSecureID(id, type) {
    if (!id || typeof id !== 'string') return false

    const patterns = {
      business: /^biz_[a-f0-9]{26}$/,
      offer: /^off_[a-f0-9]{26}$/,
      customer: /^cust_[a-f0-9]{20}$/,
      branch: /^branch_[a-f0-9]{20}$/,
      campaign: /^camp_[a-f0-9]{20}$/,
      segment: /^seg_[a-f0-9]{20}$/,
      auto_engagement_config: /^aec_[a-f0-9]{20}$/
    };

    return patterns[type]?.test(id) || false
  }

  /**
   * Extract type from secure ID
   * @param {string} id - The secure ID
   * @returns {string|null} The type or null if invalid
   */
  static getIDType(id) {
    if (!id || typeof id !== 'string') return null

    if (id.startsWith('biz_')) return 'business'
    if (id.startsWith('off_')) return 'offer'
    if (id.startsWith('cust_')) return 'customer'
    if (id.startsWith('branch_')) return 'branch'
    if (id.startsWith('camp_')) return 'campaign'
    if (id.startsWith('seg_')) return 'segment'
    if (id.startsWith('aec_')) return 'auto_engagement_config'

    return null
  }

  /**
   * Generate a batch of unique IDs (useful for testing)
   * @param {string} type - The type of ID to generate
   * @param {number} count - Number of IDs to generate
   * @returns {string[]} Array of unique IDs
   */
  static generateBatch(type, count = 10) {
    const generators = {
      business: this.generateBusinessID,
      offer: this.generateOfferID,
      customer: this.generateCustomerID,
      branch: this.generateBranchID,
      campaign: this.generateCampaignID,
      segment: this.generateSegmentID,
      auto_engagement_config: this.generateAutoEngagementConfigID
    };

    const generator = generators[type]
    if (!generator) {
      throw new Error(`Invalid type: ${type}. Must be one of: business, offer, customer, branch, campaign, segment`)
    }

    const ids = new Set()
    while (ids.size < count) {
      ids.add(generator())
    }

    return Array.from(ids)
  }
}

export default SecureIDGenerator

// Export individual functions for convenience
export const {
  generateBusinessID,
  generateOfferID,
  generateCustomerID,
  generateBranchID,
  generateCampaignID,
  generateSegmentID,
  generateAutoEngagementConfigID,
  validateSecureID,
  getIDType,
  generateBatch
} = SecureIDGenerator