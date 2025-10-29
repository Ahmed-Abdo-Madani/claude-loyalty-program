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
        last_name: customerData.last_name || '',
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
          last_name: customerData.lastName || customerData.last_name || '',
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
    const encoded = Buffer.from(tokenData).toString('base64')
    
    // Validate that encoded token is ASCII-safe (for QR code compatibility)
    if (!this.isAsciiSafe(encoded)) {
      logger.error('❌ Encoded customer token contains non-ASCII characters:', {
        customerId: customerId.substring(0, 8) + '...',
        businessId: businessId.substring(0, 8) + '...',
        encoded: encoded.substring(0, 20) + '...'
      })
      throw new Error('Customer token encoding produced non-ASCII result')
    }
    
    return encoded
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
    const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 8)
    
    // Validate that hash is ASCII-safe (hex is always ASCII-safe, but verify)
    if (!this.isAsciiSafe(hash)) {
      logger.error('❌ Offer hash contains non-ASCII characters:', {
        offerId: offerId.substring(0, 8) + '...',
        businessId: businessId.substring(0, 8) + '...',
        hash
      })
      throw new Error('Offer hash generation produced non-ASCII result')
    }
    
    return hash
  }

  /**
   * Validate that a string contains only ASCII characters (0x00-0x7F)
   * Critical for QR code barcode messages in Apple Wallet passes
   * @param {string} str - String to validate
   * @returns {boolean} True if string is ASCII-safe
   */
  static isAsciiSafe(str) {
    if (typeof str !== 'string') return false
    
    // Check if all characters are in ASCII range (0-127)
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      if (code > 127) {
        logger.warn('⚠️ Non-ASCII character detected:', {
          char: str[i],
          charCode: code,
          position: i,
          context: str.substring(Math.max(0, i - 5), Math.min(str.length, i + 6))
        })
        return false
      }
    }
    
    return true
  }

  static verifyOfferHash(offerId, businessId, providedHash) {
    const expectedHash = this.generateOfferHash(offerId, businessId)
    return expectedHash === providedHash
  }

  /**
   * Find offer by hash for a given business
   * Loops through all offers and verifies hash against each
   * Returns the matching offer object or null if not found
   * 
   * Comment 3: Removed status filter to mirror business.js behavior
   * This prevents rejecting valid QR codes for archived/inactive offers
   * 
   * @param {string} offerHash - The hash from the QR code
   * @param {string} businessId - The business ID to search within
   * @returns {Promise<Object|null>} The matching offer or null
   */
  static async findOfferByHash(offerHash, businessId) {
    try {
      logger.debug('Finding offer by hash for business:', businessId)
      
      // Fetch all offers for the business (no status filter, matching business.js)
      const businessOffers = await Offer.findAll({
        where: {
          business_id: businessId
        }
      })

      if (!businessOffers || businessOffers.length === 0) {
        logger.warn('No offers found for business:', businessId)
        return null
      }

      logger.debug(`Checking ${businessOffers.length} offers for hash match`)

      // Loop through offers and verify hash for each
      for (const offer of businessOffers) {
        if (this.verifyOfferHash(offer.public_id, businessId, offerHash)) {
          logger.info('Found matching offer:', offer.public_id)
          return offer
        }
      }

      logger.warn('No matching offer found for provided hash')
      return null
    } catch (error) {
      logger.error('Error finding offer by hash:', error)
      return null
    }
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

  /**
   * Calculate customer's tier based on rewards_claimed count and offer's tier configuration
   * @param {string} customerId - Customer's public ID (cust_*)
   * @param {string} offerId - Offer's public ID (off_*)
   * @returns {Object|null} Tier data object or null if customer hasn't started this offer
   */
  static async calculateCustomerTier(customerId, offerId) {
    try {
      // Default tiers (used when loyalty_tiers is null or disabled)
      const DEFAULT_TIERS = [
        {
          id: 'bronze',
          name: 'Bronze Member',
          nameAr: 'عضو برونزي',
          minRewards: 1,
          maxRewards: 2,
          icon: '🥉',
          color: '#CD7F32'
        },
        {
          id: 'silver',
          name: 'Silver Member',
          nameAr: 'عضو فضي',
          minRewards: 3,
          maxRewards: 5,
          icon: '🥈',
          color: '#C0C0C0'
        },
        {
          id: 'gold',
          name: 'Gold Member',
          nameAr: 'عضو ذهبي',
          minRewards: 6,
          maxRewards: null,
          icon: '🥇',
          color: '#FFD700'
        }
      ]

      // Step 1: Fetch customer progress
      const progress = await CustomerProgress.findOne({
        where: {
          customer_id: customerId,
          offer_id: offerId
        }
      })

      // If customer hasn't started this offer yet, treat as 0 completions
      // This ensures new customers get the "New Member" tier
      let rewardsClaimed = 0
      if (!progress) {
        logger.info('📊 No progress found, treating as new customer with 0 completions:', { customerId, offerId })
      } else {
        rewardsClaimed = progress.rewards_claimed || 0
        logger.info('📊 Customer progress:', { customerId, offerId, rewardsClaimed })
      }

      // Step 2: Fetch offer tier configuration
      const offer = await Offer.findOne({
        where: { public_id: offerId },
        attributes: ['public_id', 'loyalty_tiers']
      })

      if (!offer) {
        logger.warn(`Offer not found: ${offerId}`)
        return null
      }

      // Step 3: Determine which tiers to use (custom or default)
      let tiers = DEFAULT_TIERS
      if (offer.loyalty_tiers && offer.loyalty_tiers.enabled && Array.isArray(offer.loyalty_tiers.tiers)) {
        tiers = offer.loyalty_tiers.tiers
      }

      // Validate tier configuration
      if (!tiers || tiers.length === 0) {
        logger.warn(`Invalid tier configuration for offer ${offerId}, using defaults`)
        tiers = DEFAULT_TIERS
      }

      logger.info('🎯 Using tiers:', { tierCount: tiers.length, tierNames: tiers.map(t => t.name), source: offer.loyalty_tiers?.enabled ? 'custom' : 'default' })

      // Handle customers with 0 completions
      if (rewardsClaimed === 0) {
        const firstTier = tiers[0]
        
        // Check if first tier starts at 0 (includes new members)
        if (firstTier.minRewards === 0) {
          // First tier includes new members, assign them to it
          logger.info('🏆 Matched tier:', { tierId: firstTier.id, tierName: firstTier.name, rewardsClaimed: 0, note: 'New member in first tier' })
          
          // Calculate next tier
          let nextTier = null
          let rewardsToNextTier = null
          if (tiers.length > 1) {
            nextTier = tiers[1]
            rewardsToNextTier = nextTier.minRewards - 0
          }
          
          return {
            currentTier: {
              id: firstTier.id,
              name: firstTier.name,
              nameAr: firstTier.nameAr || firstTier.name,
              icon: firstTier.icon || '',
              color: firstTier.color || '#000000',
              minRewards: firstTier.minRewards,
              maxRewards: firstTier.maxRewards
            },
            rewardsClaimed: 0,
            rewardsToNextTier: rewardsToNextTier,
            nextTier: nextTier ? {
              name: nextTier.name,
              nameAr: nextTier.nameAr || nextTier.name,
              icon: nextTier.icon || ''
            } : null,
            isTopTier: tiers.length === 1
          }
        } else {
          // First tier starts at 1, show "New Member" tier for 0 completions
          logger.info('🏆 Matched tier:', { tierId: 'new', tierName: 'New Member', rewardsClaimed: 0, note: 'First-time customer' })
          
          const newMemberTier = {
            currentTier: {
              id: 'new',
              name: 'New Member',
              nameAr: 'عضو جديد',
              icon: '👋',
              color: '#6B7280',
              minRewards: 0,
              maxRewards: 0
            },
            rewardsClaimed: 0,
            rewardsToNextTier: firstTier.minRewards,
            nextTier: {
              name: firstTier.name,
              nameAr: firstTier.nameAr || firstTier.name,
              icon: firstTier.icon || ''
            },
            isTopTier: false
          }
          
          logger.info('📈 Tier progression:', { currentTier: 'New Member', nextTier: firstTier.name, rewardsToNext: firstTier.minRewards, isTopTier: false })
          
          return newMemberTier
        }
      }

      // Step 4: Find current tier
      let currentTier = null
      for (const tier of tiers) {
        const minRewards = tier.minRewards || 0
        const maxRewards = tier.maxRewards

        if (rewardsClaimed >= minRewards && (maxRewards === null || rewardsClaimed <= maxRewards)) {
          currentTier = tier
          break
        }
      }

      // If no tier matches, assign to highest tier
      if (!currentTier && tiers.length > 0) {
        currentTier = tiers[tiers.length - 1]
      }

      logger.info('🏆 Matched tier:', { tierId: currentTier?.id, tierName: currentTier?.name, rewardsClaimed })

      // Step 5: Calculate progress to next tier
      let rewardsToNextTier = null
      let nextTier = null
      let isTopTier = false

      if (currentTier) {
        // Find next tier
        const currentTierIndex = tiers.findIndex(t => t.id === currentTier.id)
        if (currentTierIndex >= 0 && currentTierIndex < tiers.length - 1) {
          nextTier = tiers[currentTierIndex + 1]
          rewardsToNextTier = (nextTier.minRewards || 0) - rewardsClaimed
        } else {
          // Customer is in the highest tier
          isTopTier = true
        }
      }

      logger.info('📈 Tier progression:', { currentTier: currentTier?.name, nextTier: nextTier?.name, rewardsToNext: rewardsToNextTier, isTopTier })

      // Step 6: Return tier data
      const tierResult = {
        currentTier: {
          id: currentTier.id,
          name: currentTier.name,
          nameAr: currentTier.nameAr || currentTier.name,
          icon: currentTier.icon || '',
          color: currentTier.color || '#000000',
          minRewards: currentTier.minRewards,
          maxRewards: currentTier.maxRewards
        },
        rewardsClaimed: rewardsClaimed,
        rewardsToNextTier: rewardsToNextTier,
        nextTier: nextTier ? {
          name: nextTier.name,
          nameAr: nextTier.nameAr || nextTier.name,
          icon: nextTier.icon || ''
        } : null,
        isTopTier: isTopTier
      }

      logger.info('✅ Tier calculation complete:', { tier: tierResult.currentTier?.name, completions: rewardsClaimed, toNext: rewardsToNextTier })

      return tierResult

    } catch (error) {
      // Enhanced error logging with context
      logger.error('❌ calculateCustomerTier failed:', {
        error: error.message,
        stack: error.stack,
        customerId: customerId,
        offerId: offerId
      })
      // Return null instead of throwing to prevent pass generation failures
      return null
    }
  }
}

export default CustomerService