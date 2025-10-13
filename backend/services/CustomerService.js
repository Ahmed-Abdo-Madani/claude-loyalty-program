import { CustomerProgress, Offer, Business, Customer } from '../models/index.js'
import { Op } from 'sequelize'
import crypto from 'crypto'
import logger from '../config/logger.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

class CustomerService {
  // Customer management
  static async createCustomer(customerData) {
    try {
      // Generate secure customer ID if not provided
      if (!customerData.customer_id) {
        customerData.customer_id = SecureIDGenerator.generateCustomerID()
      }

      // Validate customer ID format
      if (!customerData.customer_id.startsWith('cust_')) {
        throw new Error(`Invalid customer ID format: ${customerData.customer_id}. Must start with cust_`)
      }

      // Validate and sanitize acquisition_source
      const validSources = ['organic', 'referral', 'social', 'advertising', 'in_store', 'other']
      const acquisitionSource = customerData.acquisition_source || 'in_store'
      const sanitizedSource = validSources.includes(acquisitionSource) ? acquisitionSource : 'other'

      // Create customer record
      const customer = await Customer.create({
        customer_id: customerData.customer_id,
        business_id: customerData.business_id,
        first_name: customerData.first_name || null,
        last_name: customerData.last_name || null,
        phone: customerData.phone || null,
        email: customerData.email || null,
        date_of_birth: customerData.date_of_birth || null,
        status: customerData.status || 'new',
        lifecycle_stage: customerData.lifecycle_stage || 'new_customer',
        total_visits: 0,
        total_stamps_earned: 0,
        total_rewards_claimed: 0,
        total_lifetime_value: 0,
        first_visit_date: new Date(),
        last_activity_date: new Date(),
        acquisition_source: sanitizedSource,
        preferred_language: customerData.preferred_language || 'en'
      })

      logger.info(`✅ Customer created via API: ${customer.customer_id}`)
      return customer
    } catch (error) {
      logger.error('❌ createCustomer failed:', error)
      throw error
    }
  }

  static async findOrCreateCustomer(customerId, businessId, customerData = {}) {
    try {
      // Validate customer ID format
      let validCustomerId = customerId

      // If customer ID doesn't match cust_* format, generate a new one
      if (!customerId || !customerId.startsWith('cust_')) {
        logger.warn(`⚠️ Invalid customer ID format: ${customerId}. Generating new secure ID.`)
        validCustomerId = SecureIDGenerator.generateCustomerID()
      }

      // Try to find existing customer
      let customer = await Customer.findOne({
        where: {
          customer_id: validCustomerId,
          business_id: businessId
        }
      })

      // If not found, create new customer
      if (!customer) {
        logger.info(`✨ Creating new customer: ${validCustomerId}`)

        // Validate and sanitize acquisition_source
        const validSources = ['organic', 'referral', 'social', 'advertising', 'in_store', 'other']
        const acquisitionSource = customerData.source || 'in_store'
        const sanitizedSource = validSources.includes(acquisitionSource) ? acquisitionSource : 'other'

        customer = await Customer.create({
          customer_id: validCustomerId,
          business_id: businessId,
          first_name: customerData.firstName || customerData.first_name || 'Guest',
          last_name: customerData.lastName || customerData.last_name || 'Customer',
          phone: customerData.phone || null,
          email: customerData.email || null,
          status: 'new',
          lifecycle_stage: 'new_customer',
          total_visits: 0,
          total_stamps_earned: 0,
          total_rewards_claimed: 0,
          total_lifetime_value: 0,
          first_visit_date: new Date(),
          last_activity_date: new Date(),
          acquisition_source: sanitizedSource,
          preferred_language: customerData.language || 'en'
        })

        logger.info(`✅ Customer created successfully: ${customer.customer_id}`)
      } else {
        logger.info(`♻️ Found existing customer: ${customer.customer_id}`)
      }

      return customer
    } catch (error) {
      logger.error('❌ findOrCreateCustomer failed:', error)
      throw error
    }
  }

  // Customer progress management
  static async findCustomerProgress(customerId, offerId) {
    return await CustomerProgress.findOne({
      where: {
        customer_id: customerId,
        offer_id: offerId
      },
      include: ['offer', 'business']
    })
  }

  static async createCustomerProgress(customerId, offerId, businessId, customerData = {}) {
    try {
      // STEP 1: Ensure customer exists in database (fixes foreign key constraint)
      const customer = await this.findOrCreateCustomer(customerId, businessId, customerData)

      // STEP 2: Get offer details
      const offer = await Offer.findByPk(offerId)
      if (!offer) {
        throw new Error(`Offer with ID ${offerId} not found`)
      }

      // STEP 3: Create progress record (now safe - customer exists)
      const progressData = {
        customer_id: customer.customer_id, // Use verified customer ID from database
        offer_id: offerId,
        business_id: businessId,
        max_stamps: offer.stamps_required,
        current_stamps: 0,
        customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null,
        customer_phone: customer.phone || customerData.phone || null,
        customer_email: customer.email || customerData.email || null,
        wallet_pass_serial: this.generateWalletPassSerial()
      }

      const progress = await CustomerProgress.create(progressData)

      // STEP 4: Increment offer customer count
      await offer.increment('customers')

      logger.info(`✅ Customer progress created: ${customer.customer_id} → ${offerId}`)

      return progress
    } catch (error) {
      logger.error('❌ createCustomerProgress failed:', error)
      throw error
    }
  }

  static async updateCustomerProgress(customerId, offerId, stampsToAdd = 1) {
    const progress = await this.findCustomerProgress(customerId, offerId)
    if (!progress) {
      throw new Error('Customer progress not found')
    }

    await progress.addStamp(stampsToAdd)
    return progress
  }

  static async claimReward(customerId, offerId) {
    const progress = await this.findCustomerProgress(customerId, offerId)
    if (!progress) {
      throw new Error('Customer progress not found')
    }

    if (!progress.canClaimReward()) {
      throw new Error('Reward cannot be claimed - progress not completed')
    }

    await progress.claimReward()
    
    // Increment offer redemption count
    if (progress.offer) {
      await progress.offer.increment('redeemed')
    }
    
    return progress
  }

  // Customer token management for QR code scanning
  static encodeCustomerToken(customerId, businessId, timestamp = Date.now()) {
    const tokenData = `${customerId}:${businessId}:${timestamp}`
    return Buffer.from(tokenData).toString('base64')
  }

  static decodeCustomerToken(customerToken) {
    try {
      const decoded = Buffer.from(customerToken, 'base64').toString('utf8')
      const [customerId, businessId, timestamp] = decoded.split(':')
      
      return {
        customerId: customerId,
        businessId: businessId, // Keep as string for secure business IDs
        timestamp: parseInt(timestamp),
        isValid: true
      }
    } catch (error) {
      return {
        customerId: null,
        businessId: null,
        timestamp: null,
        isValid: false,
        error: error.message
      }
    }
  }

  // Offer verification for QR code validation
  static generateOfferHash(offerId, businessId) {
    const data = `${offerId}:${businessId}:loyalty-platform`
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 8)
  }

  static verifyOfferHash(offerId, businessId, providedHash) {
    const expectedHash = this.generateOfferHash(offerId, businessId)
    return expectedHash === providedHash
  }

  // Scan transaction recording
  static async recordScanTransaction(customerId, offerId, businessId, metadata = {}) {
    // For now, we'll store this as a simple log
    // In the future, you might want a separate ScanTransaction model
    const scanData = {
      customerId,
      offerId,
      businessId,
      timestamp: new Date(),
      metadata
    }
    
    // You could store this in a separate table or log file
    logger.debug('📊 Scan recorded', scanData)
    
    return scanData
  }

  // Analytics and reporting
  static async getCustomersByBusiness(businessId) {
    return await CustomerProgress.findAll({
      where: { business_id: businessId },
      include: ['offer'],
      order: [['created_at', 'DESC']]
    })
  }

  static async getScanHistory(businessId, limit = 50) {
    const results = await CustomerProgress.findAll({
      where: {
        business_id: businessId,
        total_scans: { [Op.gt]: 0 }
      },
      include: ['offer'],
      order: [['last_scan_date', 'DESC']],
      limit
    })

    // Convert Sequelize models to plain objects to avoid circular JSON references
    return results.map(r => r.toJSON())
  }

  static async getScanAnalytics(businessId, offerId = null) {
    const whereClause = { business_id: businessId }
    if (offerId) {
      whereClause.offer_id = offerId
    }

    const progress = await CustomerProgress.findAll({
      where: whereClause,
      include: ['offer']
    })

    const analytics = {
      totalCustomers: progress.length,
      activeCustomers: progress.filter(p => p.current_stamps > 0).length,
      completedRewards: progress.filter(p => p.is_completed).length,
      totalScans: progress.reduce((sum, p) => sum + (p.total_scans || 0), 0),
      totalRedemptions: progress.reduce((sum, p) => sum + (p.rewards_claimed || 0), 0),
      averageProgress: progress.length > 0 
        ? progress.reduce((sum, p) => sum + p.getProgressPercentage(), 0) / progress.length 
        : 0
    }

    return analytics
  }

  // Utility methods
  static generateWalletPassSerial() {
    return 'LP-' + crypto.randomBytes(8).toString('hex').toUpperCase()
  }

  static generateTestCustomerId() {
    return 'TEST-' + Date.now()
  }

  // Customer analytics for business dashboard
  static async getBusinessCustomerAnalytics(businessId, options = {}) {
    const { Customer } = await import('../models/index.js')
    const { start_date, end_date } = options

    // Get all customers for this business
    const customers = await Customer.findAll({
      where: { business_id: businessId }
    })

    const totalCustomers = customers.length

    // Active customers (status = 'active' OR recent activity within 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeCustomers = customers.filter(c =>
      c.status === 'active' ||
      (c.last_activity_date && new Date(c.last_activity_date) >= thirtyDaysAgo)
    ).length

    // VIP customers (status = 'vip' OR lifecycle_stage = 'vip_customer')
    const vipCustomers = customers.filter(c =>
      c.status === 'vip' || c.lifecycle_stage === 'vip_customer'
    ).length

    // Inactive customers
    const inactiveCustomers = customers.filter(c => c.status === 'inactive').length

    // New customers this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const newThisMonth = customers.filter(c =>
      new Date(c.created_at) >= startOfMonth
    ).length

    // Lifecycle stage distribution
    const lifecycleStages = {
      prospect: customers.filter(c => c.lifecycle_stage === 'prospect').length,
      new_customer: customers.filter(c => c.lifecycle_stage === 'new_customer').length,
      repeat_customer: customers.filter(c => c.lifecycle_stage === 'repeat_customer').length,
      loyal_customer: customers.filter(c => c.lifecycle_stage === 'loyal_customer').length,
      vip_customer: customers.filter(c => c.lifecycle_stage === 'vip_customer').length
    }

    // Calculate average lifetime value
    const totalLifetimeValue = customers.reduce((sum, c) =>
      sum + parseFloat(c.total_lifetime_value || 0), 0
    )
    const avgLifetimeValue = totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0

    // Calculate average engagement score
    const totalEngagementScore = customers.reduce((sum, c) => {
      try {
        return sum + (c.getEngagementScore ? c.getEngagementScore() : 0)
      } catch (err) {
        return sum
      }
    }, 0)
    const avgEngagementScore = totalCustomers > 0
      ? Math.round(totalEngagementScore / totalCustomers)
      : 0

    // Customer growth rate (last 30 days vs previous 30 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const lastMonthCustomers = customers.filter(c =>
      new Date(c.created_at) >= thirtyDaysAgo
    ).length

    const previousMonthCustomers = customers.filter(c => {
      const createdDate = new Date(c.created_at)
      return createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo
    }).length

    const customerGrowthRate = previousMonthCustomers > 0
      ? ((lastMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100
      : (lastMonthCustomers > 0 ? 100 : 0)

    return {
      total_customers: totalCustomers,
      active_customers: activeCustomers,
      vip_customers: vipCustomers,
      new_this_month: newThisMonth,
      inactive_customers: inactiveCustomers,
      lifecycle_stages: lifecycleStages,
      total_lifetime_value: totalLifetimeValue,
      avg_lifetime_value: avgLifetimeValue,
      avg_engagement_score: avgEngagementScore,
      customer_growth_rate: Math.round(customerGrowthRate * 10) / 10 // Round to 1 decimal
    }
  }

  // Customer data validation
  static validateCustomerData(customerData) {
    const errors = []

    if (customerData.phone && !/^\+?[1-9]\d{1,14}$/.test(customerData.phone)) {
      errors.push('Invalid phone number format')
    }

    if (customerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      errors.push('Invalid email format')
    }

    return errors
  }
}

export default CustomerService