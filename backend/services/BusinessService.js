import Business from '../models/Business.js'
import { Op } from 'sequelize'

/**
 * Business Service Layer
 * Handles all business-related database operations
 */

class BusinessService {
  // Get business by ID
  static async findById(businessId) {
    return await Business.findByPk(businessId)
  }

  // Get all businesses with filtering options
  static async getAllBusinesses(filters = {}) {
    const whereClause = {}

    if (filters.status) {
      whereClause.status = filters.status
    }

    if (filters.region) {
      whereClause.region = filters.region
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { business_name: { [Op.iLike]: `%${filters.search}%` } },
        { business_name_ar: { [Op.iLike]: `%${filters.search}%` } },
        { email: { [Op.iLike]: `%${filters.search}%` } }
      ]
    }

    return await Business.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0
    })
  }

  // Update business status
  static async updateBusinessStatus(businessId, status, reason = null, adminId = null) {
    const business = await Business.findByPk(businessId)

    if (!business) {
      throw new Error('Business not found')
    }

    return await business.updateStatus(status, reason, adminId)
  }

  // Create new business
  static async createBusiness(businessData) {
    // Validate required fields
    const requiredFields = ['email', 'business_name', 'phone', 'password']
    for (const field of requiredFields) {
      if (!businessData[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Check for duplicate email
    const existingBusiness = await Business.findOne({
      where: { email: businessData.email }
    })

    if (existingBusiness) {
      throw new Error('Email already registered')
    }

    // Create business with default values
    const business = await Business.create({
      ...businessData,
      status: 'pending',
      last_activity_at: new Date()
    })

    return business
  }

  // Get business analytics
  static async getBusinessAnalytics(businessId = null) {
    if (businessId) {
      // Single business analytics
      const business = await Business.findByPk(businessId)
      if (!business) {
        throw new Error('Business not found')
      }
      return await business.getAnalytics()
    }

    // Platform-wide analytics
    const [
      totalBusinesses,
      activeBusinesses,
      pendingBusinesses,
      suspendedBusinesses
    ] = await Promise.all([
      Business.count(),
      Business.count({ where: { status: 'active' } }),
      Business.count({ where: { status: 'pending' } }),
      Business.count({ where: { status: 'suspended' } })
    ])

    return {
      total_businesses: totalBusinesses,
      active_businesses: activeBusinesses,
      pending_businesses: pendingBusinesses,
      suspended_businesses: suspendedBusinesses,
      growth_rate: await this.calculateGrowthRate(),
      last_updated: new Date().toISOString()
    }
  }

  // New method: Calculate business growth rate
  static async calculateGrowthRate() {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    const [currentCount, lastMonthCount] = await Promise.all([
      Business.count(),
      Business.count({
        where: {
          created_at: { [Op.lt]: lastMonth }
        }
      })
    ])

    if (lastMonthCount === 0) return 0

    const growthRate = ((currentCount - lastMonthCount) / lastMonthCount) * 100
    return Math.round(growthRate * 100) / 100 // Round to 2 decimals
  }

  // Authenticate business login
  static async authenticateBusiness(email, password) {
    const business = await Business.findOne({
      where: {
        email: email.toLowerCase(),
        status: { [Op.in]: ['active', 'pending'] }
      }
    })

    if (!business) {
      throw new Error('Invalid credentials')
    }

    // Note: In production, use proper password hashing (bcrypt)
    if (business.password !== password) {
      throw new Error('Invalid credentials')
    }

    // Update last activity
    business.last_activity_at = new Date()
    await business.save()

    return business
  }

  // Replace: Complex filtering and search
  static async searchBusinesses(query, filters = {}) {
    const whereClause = {
      [Op.or]: [
        { business_name: { [Op.iLike]: `%${query}%` } },
        { business_name_ar: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
        { city: { [Op.iLike]: `%${query}%` } },
        { region: { [Op.iLike]: `%${query}%` } }
      ]
    }

    if (filters.status) {
      whereClause.status = filters.status
    }

    return await Business.findAll({
      where: whereClause,
      order: [
        ['status', 'ASC'], // Active businesses first
        ['created_at', 'DESC']
      ],
      limit: filters.limit || 50
    })
  }
}

export default BusinessService