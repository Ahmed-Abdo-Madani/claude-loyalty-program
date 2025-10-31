// Clean AdminBusinessController - PostgreSQL only
import BusinessService from '../services/BusinessService.js'
import { Business, Offer } from '../models/index.js'
import { getLocalizedMessage } from '../middleware/languageMiddleware.js'

class AdminBusinessController {
  // Get all businesses with filters and pagination
  static async getBusinesses(req, res) {
    try {
      const {
        status,
        search,
        region,
        business_type,
        limit = 50,
        offset = 0
      } = req.query

      console.log('🔍 Admin: Fetching businesses with filters:', {
        status: status !== 'all' ? status : 'all',
        search: search || 'none',
        region: region !== 'all' ? region : 'all',
        limit: parseInt(limit),
        offset: parseInt(offset)
      })

      // Use BusinessService with filters
      const businesses = await BusinessService.getAllBusinesses({
        status: status !== 'all' ? status : undefined,
        search,
        region: region !== 'all' ? region : undefined,
        business_type: business_type !== 'all' ? business_type : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })

      console.log(`📊 Admin: Retrieved ${businesses.length} businesses from database`)

      // Build the same where clause used by BusinessService for accurate filtered count
      const whereClause = {}
      
      if (status && status !== 'all') {
        whereClause.status = status
      }

      if (region && region !== 'all') {
        whereClause.region = region
      }

      if (business_type && business_type !== 'all') {
        whereClause.business_type = business_type
      }

      if (search && search !== 'none') {
        const { Op } = await import('sequelize')
        whereClause[Op.or] = [
          { business_name: { [Op.iLike]: `%${search}%` } },
          { business_name_ar: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ]
      }

      // Get filtered count matching the query filters
      const total = await Business.count({ where: whereClause })

      // Fetch offer counts in a single aggregated query to avoid N+1
      const { Op } = await import('sequelize')
      const businessIds = businesses.map(b => b.public_id || b.id).filter(Boolean)
      
      const offerCounts = await Offer.findAll({
        attributes: [
          'business_id',
          [Business.sequelize.fn('COUNT', Business.sequelize.literal('*')), 'total_offers'],
          [Business.sequelize.fn('SUM', Business.sequelize.literal("CASE WHEN \"Offer\".\"status\" = 'active' THEN 1 ELSE 0 END")), 'active_offers']
        ],
        where: {
          business_id: { [Op.in]: businessIds }
        },
        group: ['business_id'],
        raw: true
      })

      // Create a map of business_id -> counts for efficient lookup
      const countsMap = {}
      offerCounts.forEach(count => {
        countsMap[count.business_id] = {
          total_offers: parseInt(count.total_offers) || 0,
          active_offers: parseInt(count.active_offers) || 0
        }
      })

      // Enrich businesses with offer counts from the map
      const enrichedBusinesses = businesses.map(business => {
        const businessId = business.public_id || business.id
        const counts = countsMap[businessId] || { total_offers: 0, active_offers: 0 }
        
        return {
          ...business.toJSON(),
          total_offers: counts.total_offers,
          active_offers: counts.active_offers
        }
      })

      console.log(`✅ Admin: Successfully enriched ${enrichedBusinesses.length} businesses`)

      res.json({
        success: true,
        data: {
          businesses: enrichedBusinesses,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: (parseInt(offset) + parseInt(limit)) < total
          }
        }
      })

    } catch (error) {
      console.error('❌ Admin: Get businesses error:', error)
      console.error('❌ Admin: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      })
      res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.failedToGetBusinesses', req.locale),
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  }

  // Get business statistics
  static async getBusinessStats(req, res) {
    try {
      const businesses = await Business.findAll()
      const offers = await Offer.findAll()

      const stats = {
        total_businesses: businesses.length,
        active_businesses: businesses.filter(b => b.status === 'active').length,
        pending_businesses: businesses.filter(b => b.status === 'pending').length,
        suspended_businesses: businesses.filter(b => b.status === 'suspended').length,

        // Regional distribution
        regional_stats: {
          central: businesses.filter(b => b.region && b.region.includes('Central')).length,
          western: businesses.filter(b => b.region && b.region.includes('Western')).length,
          eastern: businesses.filter(b => b.region && b.region.includes('Eastern')).length,
          nationwide: businesses.filter(b => b.region && b.region.includes('All Regions')).length
        },

        // Performance metrics
        total_offers: offers.length,
        active_offers: offers.filter(o => o.status === 'active').length,
        total_customers: businesses.reduce((sum, b) => sum + (b.total_customers || 0), 0),
        total_redemptions: businesses.reduce((sum, b) => sum + (b.total_redemptions || 0), 0)
      }

      res.json({
        success: true,
        data: stats
      })

    } catch (error) {
      console.error('Get business stats error:', error)
      res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.failedToGetStats', req.locale)
      })
    }
  }

  // Get single business details
  static async getBusinessById(req, res) {
    try {
      const { id } = req.params
      
      // Try to find by both secure ID and legacy ID
      let business = await Business.findByPk(id)
      if (!business && !id.startsWith('biz_') && /^[0-9]+$/.test(id)) {
        // If not found and it's a valid numeric ID string, try as legacy ID
        const numericId = Number(id)
        if (!isNaN(numericId) && numericId > 0) {
          business = await Business.findByPk(numericId)
        }
      }

      if (!business) {
        return res.status(404).json({
          success: false,
          message: getLocalizedMessage('notFound.business', req.locale)
        })
      }

      // Get related data using the correct business ID
      const businessId = business.public_id || business.id
      const offers = await Offer.findAll({ 
        where: { business_id: businessId } 
      })

      const enrichedBusiness = {
        ...business.toJSON(),
        offers,
        total_offers: offers.length,
        active_offers: offers.filter(o => o.status === 'active').length
      }

      res.json({
        success: true,
        data: enrichedBusiness
      })

    } catch (error) {
      console.error('Get business by ID error:', error)
      res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.failedToGetBusinessDetails', req.locale)
      })
    }
  }

  // Update business status (approve, suspend, etc.)
  static async updateBusinessStatus(req, res) {
    try {
      const { id } = req.params
      const { status, reason } = req.body

      if (!['active', 'pending', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('validation.invalidStatus', req.locale)
        })
      }

      const updatedBusiness = await BusinessService.updateBusinessStatus(id, status, reason, 1)

      res.json({
        success: true,
        data: updatedBusiness,
        message: getLocalizedMessage('business.statusUpdateSuccess', req.locale, { status })
      })

    } catch (error) {
      console.error('Update business status error:', error)
      if (error.message === 'Business not found') {
        res.status(404).json({
          success: false,
          message: getLocalizedMessage('notFound.business', req.locale)
        })
      } else {
        res.status(500).json({
          success: false,
          message: getLocalizedMessage('server.failedToUpdateStatus', req.locale)
        })
      }
    }
  }

  // Add new business
  static async addBusiness(req, res) {
    try {
      const businessData = req.body

      // Validate required fields
      const requiredFields = ['business_name', 'email', 'phone', 'owner_name']
      const missingFields = requiredFields.filter(field => !businessData[field])

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('validation.missingRequiredFields', req.locale, { fields: missingFields.join(', ') })
        })
      }

      // Check for duplicate email
      const existingBusiness = await Business.findOne({ where: { email: businessData.email } })
      if (existingBusiness) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('validation.emailAlreadyExists', req.locale)
        })
      }

      const newBusiness = await BusinessService.createBusiness(businessData)

      res.status(201).json({
        success: true,
        data: newBusiness,
        message: getLocalizedMessage('business.createSuccess', req.locale)
      })

    } catch (error) {
      console.error('Add business error:', error)
      res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.businessCreateFailed', req.locale)
      })
    }
  }

  // Delete business (super admin only)
  static async deleteBusiness(req, res) {
    try {
      const { id } = req.params
      
      // Try to find by both secure ID and legacy ID
      let business = await Business.findByPk(id)
      if (!business && !id.startsWith('biz_') && /^[0-9]+$/.test(id)) {
        // If not found and it's a valid numeric ID string, try as legacy ID
        const numericId = Number(id)
        if (!isNaN(numericId) && numericId > 0) {
          business = await Business.findByPk(numericId)
        }
      }

      if (!business) {
        return res.status(404).json({
          success: false,
          message: getLocalizedMessage('notFound.business', req.locale)
        })
      }

      // Safety check - don't delete active businesses with customers
      if (business.status === 'active' && business.total_customers > 0) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('permission.cannotDeleteActiveBusinessWithCustomers', req.locale)
        })
      }

      // Delete business and related data (CASCADE will handle related records)
      await business.destroy()

      res.json({
        success: true,
        message: getLocalizedMessage('business.deleteSuccess', req.locale)
      })

    } catch (error) {
      console.error('Delete business error:', error)
      res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.businessDeleteFailed', req.locale)
      })
    }
  }

  // Bulk operations on businesses
  static async bulkUpdateBusinesses(req, res) {
    try {
      const { business_ids, action, reason } = req.body

      if (!business_ids || !Array.isArray(business_ids) || business_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('validation.businessIdsRequired', req.locale)
        })
      }

      if (!['approve', 'suspend', 'activate'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('validation.invalidBulkAction', req.locale)
        })
      }

      // Map actions to statuses
      const statusMap = {
        approve: 'active',
        suspend: 'suspended',
        activate: 'active'
      }

      const targetStatus = statusMap[action]
      const updatedBusinesses = []

      // Update each business
      for (const businessId of business_ids) {
        try {
          const updatedBusiness = await BusinessService.updateBusinessStatus(businessId, targetStatus, reason, 1)
          updatedBusinesses.push(updatedBusiness)
        } catch (error) {
          console.error(`Error updating business ${businessId}:`, error)
          // Continue with other businesses
        }
      }

      res.json({
        success: true,
        data: {
          updated_businesses: updatedBusinesses,
          total_updated: updatedBusinesses.length,
          total_requested: business_ids.length
        },
        message: getLocalizedMessage('business.bulkUpdateSuccess', req.locale, { action, count: updatedBusinesses.length })
      })

    } catch (error) {
      console.error('Bulk update businesses error:', error)
      res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.bulkOperationFailed', req.locale)
      })
    }
  }
}

export default AdminBusinessController