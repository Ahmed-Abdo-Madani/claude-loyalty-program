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
   * Generate a secure product ID
   * @returns {string} Product ID in format: prod_[20chars]
   */
  static generateProductID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `prod_${randomString}`
  }

  /**
   * Generate a secure category ID
   * @returns {string} Category ID in format: cat_[20chars]
   */
  static generateCategoryID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `cat_${randomString}`
  }

  /**
   * Generate a secure sale ID
   * @returns {string} Sale ID in format: sale_[20chars]
   */
  static generateSaleID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `sale_${randomString}`
  }

  /**
   * Generate a secure subscription ID
   * @returns {string} Subscription ID in format: sub_[20chars]
   */
  static generateSubscriptionID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `sub_${randomString}`
  }

  /**
   * Generate a secure payment ID
   * @returns {string} Payment ID in format: pay_[20chars]
   */
  static generatePaymentID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `pay_${randomString}`
  }

  /**
   * Generate a secure invoice ID
   * @returns {string} Invoice ID in format: inv_[20chars]
   */
  static generateInvoiceID() {
    const randomBytes = crypto.randomBytes(12)
    const randomString = randomBytes.toString('hex').substring(0, 20)
    return `inv_${randomString}`
  }

  /**
   * Generate a secure webhook log ID
   * @returns {string} Webhook log ID in format: whl_[16chars]
   */
  static generateWebhookLogID() {
    const randomBytes = crypto.randomBytes(10)
    const randomString = randomBytes.toString('hex').substring(0, 16)
    return `whl_${randomString}`
  }

  /**
   * Validate if an ID follows secure format
   * @param {string} id - The ID to validate
   * @param {string} type - The expected type (business, offer, customer, branch, product, category, sale)
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
      auto_engagement_config: /^aec_[a-f0-9]{20}$/,
      product: /^prod_[a-f0-9]{20}$/,
      category: /^cat_[a-f0-9]{20}$/,
      sale: /^sale_[a-f0-9]{20}$/,
      subscription: /^sub_[a-f0-9]{20}$/,
      payment: /^pay_[a-f0-9]{20}$/,
      invoice: /^inv_[a-f0-9]{20}$/,
      webhook_log: /^whl_[a-f0-9]{16}$/
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
    if (id.startsWith('prod_')) return 'product'
    if (id.startsWith('cat_')) return 'category'
    if (id.startsWith('sale_')) return 'sale'
    if (id.startsWith('sub_')) return 'subscription'
    if (id.startsWith('pay_')) return 'payment'
    if (id.startsWith('inv_')) return 'invoice'
    if (id.startsWith('whl_')) return 'webhook_log'

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
      auto_engagement_config: this.generateAutoEngagementConfigID,
      product: this.generateProductID,
      category: this.generateCategoryID,
      sale: this.generateSaleID,
      subscription: this.generateSubscriptionID,
      payment: this.generatePaymentID,
      invoice: this.generateInvoiceID,
      webhook_log: this.generateWebhookLogID
    };

    const generator = generators[type]
    if (!generator) {
      throw new Error(`Invalid type: ${type}. Must be one of: business, offer, customer, branch, campaign, segment, product, category, sale, subscription, payment, invoice, webhook_log`)
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
  generateProductID,
  generateCategoryID,
  generateSaleID,
  generateSubscriptionID,
  generatePaymentID,
  generateInvoiceID,
  generateWebhookLogID,
  validateSecureID,
  getIDType,
  generateBatch
} = SecureIDGenerator