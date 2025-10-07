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

      // Create customer record
      const customer = await Customer.create({
        customer_id: customerData.customer_id,
        business_id: customerData.business_id,
        name: customerData.name || `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim(),
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
        acquisition_source: customerData.acquisition_source || 'in_store',
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

        customer = await Customer.create({
          customer_id: validCustomerId,
          business_id: businessId,
          name: customerData.name || `${customerData.firstName || 'Guest'} ${customerData.lastName || 'Customer'}`.trim(),
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
          acquisition_source: customerData.source || 'in_store',
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
        customer_name: customer.name || customerData.name || null,
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
    return await CustomerProgress.findAll({
      where: { 
        business_id: businessId,
        total_scans: { [Op.gt]: 0 }
      },
      include: ['offer'],
      order: [['last_scan_date', 'DESC']],
      limit
    })
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
  static async getBusinessCustomerAnalytics(businessId) {
    const { Customer } = await import('../models/index.js')

    const customers = await Customer.findAll({
      where: { business_id: businessId }
    })

    const totalCustomers = customers.length
    const activeCustomers = customers.filter(c => c.status === 'active').length
    const vipCustomers = customers.filter(c => c.status === 'vip').length
    const inactiveCustomers = customers.filter(c => c.status === 'inactive').length

    // Lifecycle stage distribution
    const lifecycleStages = {
      new_customer: customers.filter(c => c.lifecycle_stage === 'new_customer').length,
      repeat_customer: customers.filter(c => c.lifecycle_stage === 'repeat_customer').length,
      loyal_customer: customers.filter(c => c.lifecycle_stage === 'loyal_customer').length,
      vip_customer: customers.filter(c => c.lifecycle_stage === 'vip_customer').length,
      at_risk: customers.filter(c => c.lifecycle_stage === 'at_risk').length
    }

    // Calculate average lifetime value
    const totalLifetimeValue = customers.reduce((sum, c) => sum + parseFloat(c.total_lifetime_value || 0), 0)
    const averageLifetimeValue = totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0

    // Growth metrics (simple calculation for demo)
    const thisMonth = new Date()
    thisMonth.setMonth(thisMonth.getMonth())
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const newCustomersThisMonth = customers.filter(c =>
      new Date(c.created_at) >= lastMonth
    ).length

    return {
      totalCustomers,
      activeCustomers,
      vipCustomers,
      inactiveCustomers,
      lifecycleStages,
      totalLifetimeValue,
      averageLifetimeValue,
      newCustomersThisMonth,
      customerGrowthRate: totalCustomers > 0 ? (newCustomersThisMonth / totalCustomers) * 100 : 0
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