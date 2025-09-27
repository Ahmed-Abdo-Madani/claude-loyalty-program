// Clean AdminBusinessController - PostgreSQL only
import BusinessService from '../services/BusinessService.js'
import OfferService from '../services/OfferService.js'
import { Business, Offer, CustomerProgress } from '../models/index.js'

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
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query

      // Use BusinessService with filters
      const businesses = await BusinessService.getAllBusinesses({
        status: status !== 'all' ? status : undefined,
        search,
        region: region !== 'all' ? region : undefined,
        business_type: business_type !== 'all' ? business_type : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })

      // Get total count for pagination
      const total = await Business.count()

      // Enrich with related data
      const enrichedBusinesses = await Promise.all(
        businesses.map(async business => {
          const offers = await Offer.findAll({
            where: { business_id: business.public_id }  // Use secure ID
          })

          return {
            ...business.toJSON(),
            total_offers: offers.length,
            active_offers: offers.filter(o => o.status === 'active').length
          }
        })
      )

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
      console.error('Get businesses error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve businesses'
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
        message: 'Failed to retrieve business statistics'
      })
    }
  }

  // Get single business details
  static async getBusinessById(req, res) {
    try {
      const { id } = req.params
      const business = await Business.findByPk(parseInt(id))

      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        })
      }

      // Get related data
      const offers = await Offer.findAll({ where: { business_id: business.id } })

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
        message: 'Failed to retrieve business details'
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
          message: 'Invalid status. Must be: active, pending, or suspended'
        })
      }

      const updatedBusiness = await BusinessService.updateBusinessStatus(id, status, reason, 1)

      res.json({
        success: true,
        data: updatedBusiness,
        message: `Business status updated to ${status} successfully`
      })

    } catch (error) {
      console.error('Update business status error:', error)
      if (error.message === 'Business not found') {
        res.status(404).json({
          success: false,
          message: 'Business not found'
        })
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update business status'
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
          message: `Missing required fields: ${missingFields.join(', ')}`
        })
      }

      // Check for duplicate email
      const existingBusiness = await Business.findOne({ where: { email: businessData.email } })
      if (existingBusiness) {
        return res.status(400).json({
          success: false,
          message: 'Business with this email already exists'
        })
      }

      const newBusiness = await BusinessService.createBusiness(businessData)

      res.status(201).json({
        success: true,
        data: newBusiness,
        message: 'Business registered successfully'
      })

    } catch (error) {
      console.error('Add business error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to register business'
      })
    }
  }

  // Delete business (super admin only)
  static async deleteBusiness(req, res) {
    try {
      const { id } = req.params
      const business = await Business.findByPk(parseInt(id))

      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        })
      }

      // Safety check - don't delete active businesses with customers
      if (business.status === 'active' && business.total_customers > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete business with active customers. Suspend the business first.'
        })
      }

      // Delete business and related data (CASCADE will handle related records)
      await business.destroy()

      res.json({
        success: true,
        message: 'Business and all related data deleted successfully'
      })

    } catch (error) {
      console.error('Delete business error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to delete business'
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
          message: 'business_ids array is required'
        })
      }

      if (!['approve', 'suspend', 'activate'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be: approve, suspend, or activate'
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
        message: `Bulk ${action} operation completed. ${updatedBusinesses.length} businesses updated.`
      })

    } catch (error) {
      console.error('Bulk update businesses error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation'
      })
    }
  }
}

export default AdminBusinessController