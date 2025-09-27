import { CustomerProgress, Offer, Business } from '../models/index.js'
import { Op } from 'sequelize'
import crypto from 'crypto'
import logger from '../config/logger.js'

class CustomerService {
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
    const offer = await Offer.findByPk(offerId)
    if (!offer) {
      throw new Error(`Offer with ID ${offerId} not found`)
    }

    const progressData = {
      customer_id: customerId,
      offer_id: offerId,
      business_id: businessId,
      max_stamps: offer.stamps_required,
      current_stamps: 0,
      customer_name: customerData.name || null,
      customer_phone: customerData.phone || null,
      customer_email: customerData.email || null,
      wallet_pass_serial: this.generateWalletPassSerial()
    }

    const progress = await CustomerProgress.create(progressData)
    
    // Increment offer customer count
    await offer.increment('customers')
    
    return progress
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
        businessId: parseInt(businessId),
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