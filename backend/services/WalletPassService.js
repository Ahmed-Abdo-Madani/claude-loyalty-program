import { WalletPass, Customer, CustomerProgress, Offer, Business } from '../models/index.js'
import { Op } from 'sequelize'
import logger from '../config/logger.js'
import sequelize from '../config/database.js'

class WalletPassService {
  /**
   * Create a new wallet pass record
   * @param {string} customerId - Customer ID (cust_*)
   * @param {string} offerId - Offer ID (off_*)
   * @param {string} walletType - 'apple' or 'google'
   * @param {object} metadata - Additional metadata
   * @returns {Promise<WalletPass>}
   */
  static async createWalletPass(customerId, offerId, walletType, metadata = {}) {
    try {
      logger.info(`🔍 Creating wallet pass: ${walletType} for customer ${customerId}, offer ${offerId}`)

      // Find customer progress record
      const progress = await CustomerProgress.findOne({
        where: {
          customer_id: customerId,
          offer_id: offerId
        }
      })

      if (!progress) {
        const errorMsg = `Customer progress not found for customer ${customerId} and offer ${offerId}`
        logger.error(`❌ ${errorMsg}`)
        throw new Error(errorMsg)
      }

      logger.info(`✅ Found customer progress: ID ${progress.id}, business ${progress.business_id}`)

      // Check if wallet pass already exists
      const existing = await WalletPass.findOne({
        where: {
          customer_id: customerId,
          offer_id: offerId,
          wallet_type: walletType
        }
      })

      if (existing) {
        logger.info(`♻️ Wallet pass already exists: ${walletType} for ${customerId} (ID: ${existing.id})`)
        return existing
      }

      // Create wallet pass
      logger.info(`🆕 Creating new wallet pass record in database...`)
      const walletPass = await WalletPass.create({
        customer_id: customerId,
        progress_id: progress.id,
        business_id: progress.business_id,
        offer_id: offerId,
        wallet_type: walletType,
        wallet_serial: metadata.wallet_serial || null,
        wallet_object_id: metadata.wallet_object_id || null,
        pass_status: 'active',
        device_info: metadata.device_info || {}
      })

      logger.info(`✨ Created ${walletType} wallet pass for customer ${customerId} (Pass ID: ${walletPass.id})`)

      return walletPass
    } catch (error) {
      logger.error(`❌ CRITICAL: Failed to create wallet pass for ${customerId}:`, {
        error: error.message,
        stack: error.stack,
        customerId,
        offerId,
        walletType,
        sqlError: error.original?.message || 'N/A'
      })
      throw error
    }
  }

  /**
   * Get all active wallet passes for a customer-offer combination
   * @param {string} customerId - Customer ID
   * @param {string} offerId - Offer ID
   * @returns {Promise<WalletPass[]>}
   */
  static async getCustomerWallets(customerId, offerId) {
    try {
      const wallets = await WalletPass.findAll({
        where: {
          customer_id: customerId,
          offer_id: offerId,
          pass_status: 'active'
        },
        order: [['created_at', 'ASC']]
      })

      return wallets
    } catch (error) {
      logger.error('❌ Failed to get customer wallets:', error)
      throw error
    }
  }

  /**
   * Check if customer has a specific wallet type
   * @param {string} customerId - Customer ID
   * @param {string} offerId - Offer ID
   * @param {string} walletType - 'apple' or 'google'
   * @returns {Promise<boolean>}
   */
  static async hasWalletType(customerId, offerId, walletType) {
    try {
      const count = await WalletPass.count({
        where: {
          customer_id: customerId,
          offer_id: offerId,
          wallet_type: walletType,
          pass_status: 'active'
        }
      })

      return count > 0
    } catch (error) {
      logger.error('❌ Failed to check wallet type:', error)
      return false
    }
  }

  /**
   * Update last push notification timestamp
   * @param {number} walletPassId - Wallet pass ID
   * @returns {Promise<WalletPass>}
   */
  static async updateLastPush(walletPassId) {
    try {
      const walletPass = await WalletPass.findByPk(walletPassId)
      if (!walletPass) {
        throw new Error(`Wallet pass ${walletPassId} not found`)
      }

      await walletPass.updateLastPush()
      return walletPass
    } catch (error) {
      logger.error('❌ Failed to update last push:', error)
      throw error
    }
  }

  /**
   * Mark wallet pass as expired
   * @param {number} walletPassId - Wallet pass ID
   * @returns {Promise<WalletPass>}
   */
  static async markWalletAsExpired(walletPassId) {
    try {
      const walletPass = await WalletPass.findByPk(walletPassId)
      if (!walletPass) {
        throw new Error(`Wallet pass ${walletPassId} not found`)
      }

      await walletPass.markExpired()
      logger.info(`⏰ Wallet pass ${walletPassId} marked as expired`)
      return walletPass
    } catch (error) {
      logger.error('❌ Failed to mark wallet as expired:', error)
      throw error
    }
  }

  /**
   * Get wallet statistics for a business
   * @param {string} businessId - Business ID (biz_*)
   * @returns {Promise<object>} - { apple, google, total, both, customers_with_wallets }
   */
  static async getWalletStatsByBusiness(businessId) {
    try {
      // Count active wallet passes by type
      const walletCounts = await WalletPass.findAll({
        where: {
          business_id: businessId,
          pass_status: 'active'
        },
        attributes: [
          'wallet_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['wallet_type'],
        raw: true
      })

      const stats = {
        apple: 0,
        google: 0,
        total: 0,
        both: 0,
        customers_with_wallets: 0
      }

      // Process wallet counts
      walletCounts.forEach(row => {
        const count = parseInt(row.count)
        if (row.wallet_type === 'apple') {
          stats.apple = count
        } else if (row.wallet_type === 'google') {
          stats.google = count
        }
        stats.total += count
      })

      // Count customers with both wallet types
      const customersWithBoth = await sequelize.query(`
        SELECT customer_id
        FROM wallet_passes
        WHERE business_id = :businessId
          AND pass_status = 'active'
        GROUP BY customer_id, offer_id
        HAVING COUNT(DISTINCT wallet_type) = 2
      `, {
        replacements: { businessId },
        type: sequelize.QueryTypes.SELECT
      })

      stats.both = customersWithBoth.length

      // Count unique customers with at least one wallet pass
      const customersWithWallets = await sequelize.query(`
        SELECT COUNT(DISTINCT customer_id) as count
        FROM wallet_passes
        WHERE business_id = :businessId
          AND pass_status = 'active'
      `, {
        replacements: { businessId },
        type: sequelize.QueryTypes.SELECT
      })

      stats.customers_with_wallets = parseInt(customersWithWallets[0]?.count || 0)

      return stats
    } catch (error) {
      logger.error('❌ Failed to get wallet stats:', error)
      throw error
    }
  }

  /**
   * Get wallet adoption rate for a business
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} - { adoption_rate, apple_rate, google_rate }
   */
  static async getWalletAdoptionRate(businessId) {
    try {
      // Get total customers for this business
      const totalCustomers = await Customer.count({
        where: { business_id: businessId }
      })

      if (totalCustomers === 0) {
        return {
          adoption_rate: 0,
          apple_rate: 0,
          google_rate: 0
        }
      }

      const stats = await this.getWalletStatsByBusiness(businessId)

      return {
        adoption_rate: ((stats.customers_with_wallets / totalCustomers) * 100).toFixed(1),
        apple_rate: ((stats.apple / totalCustomers) * 100).toFixed(1),
        google_rate: ((stats.google / totalCustomers) * 100).toFixed(1)
      }
    } catch (error) {
      logger.error('❌ Failed to get wallet adoption rate:', error)
      throw error
    }
  }

  /**
   * Get wallet pass by wallet-specific identifier
   * @param {string} identifier - wallet_serial (Apple) or wallet_object_id (Google)
   * @returns {Promise<WalletPass|null>}
   */
  static async findByWalletIdentifier(identifier) {
    try {
      const walletPass = await WalletPass.findOne({
        where: {
          [Op.or]: [
            { wallet_serial: identifier },
            { wallet_object_id: identifier }
          ],
          pass_status: 'active'
        },
        include: [
          { model: Customer, as: 'customer' },
          { model: CustomerProgress, as: 'progress' },
          { model: Offer, as: 'offer' }
        ]
      })

      return walletPass
    } catch (error) {
      logger.error('❌ Failed to find wallet pass by identifier:', error)
      throw error
    }
  }
}

export default WalletPassService
