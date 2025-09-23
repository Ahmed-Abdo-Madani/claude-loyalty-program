// Import unified data store
import dataStore from '../models/DataStore.js'

class AdminBusinessController {
  // Get all businesses with filters and pagination
  static async getBusinesses(req, res) {
    try {
      await dataStore.init()

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

      let businesses = dataStore.getBusinesses()

      // Apply filters
      if (status && status !== 'all') {
        businesses = businesses.filter(b => b.status === status)
      }

      if (search) {
        const searchTerm = search.toLowerCase()
        businesses = businesses.filter(b =>
          b.business_name.toLowerCase().includes(searchTerm) ||
          b.email.toLowerCase().includes(searchTerm) ||
          b.owner_name.toLowerCase().includes(searchTerm)
        )
      }

      if (region && region !== 'all') {
        businesses = businesses.filter(b => b.region.includes(region))
      }

      if (business_type && business_type !== 'all') {
        businesses = businesses.filter(b => b.business_type === business_type)
      }

      // Sort businesses
      businesses.sort((a, b) => {
        const aVal = a[sort_by]
        const bVal = b[sort_by]
        if (sort_order === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })

      // Apply pagination
      const total = businesses.length
      const paginatedBusinesses = businesses.slice(parseInt(offset), parseInt(offset) + parseInt(limit))

      // Calculate statistics for each business from related data
      const enrichedBusinesses = paginatedBusinesses.map(business => {
        const branches = dataStore.getBranches().filter(b => b.businessId === business.id)
        const offers = dataStore.getOffers().filter(o => o.businessId === business.id)
        const customers = dataStore.getCustomers().filter(c => c.businessId === business.id)

        return {
          ...business,
          total_branches: branches.length,
          total_offers: offers.length,
          active_offers: offers.filter(o => o.status === 'active').length,
          total_customers: branches.reduce((sum, branch) => sum + branch.customers, 0),
          total_redemptions: offers.reduce((sum, offer) => sum + offer.redeemed, 0),
          monthly_revenue: branches.reduce((sum, branch) => sum + branch.monthlyRevenue, 0)
        }
      })

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
      await dataStore.init()

      const businesses = dataStore.getBusinesses()
      const analytics = dataStore.calculateAnalytics()

      const stats = {
        total_businesses: businesses.length,
        active_businesses: businesses.filter(b => b.status === 'active').length,
        pending_businesses: businesses.filter(b => b.status === 'pending').length,
        suspended_businesses: businesses.filter(b => b.status === 'suspended').length,

        // Regional distribution
        regional_stats: {
          central: businesses.filter(b => b.region.includes('Central')).length,
          western: businesses.filter(b => b.region.includes('Western')).length,
          eastern: businesses.filter(b => b.region.includes('Eastern')).length,
          nationwide: businesses.filter(b => b.region.includes('All Regions')).length
        },

        // Business type distribution
        type_stats: {
          restaurant: businesses.filter(b => b.business_type.includes('Restaurant')).length,
          coffee: businesses.filter(b => b.business_type.includes('Coffee')).length,
          bakery: businesses.filter(b => b.business_type.includes('Bakery')).length,
          other: businesses.filter(b => !['Restaurant', 'Coffee', 'Bakery'].some(type => b.business_type.includes(type))).length
        },

        // Performance metrics
        total_revenue: analytics.total_revenue,
        total_customers: analytics.total_customers,
        total_offers: analytics.total_offers,
        total_redemptions: analytics.total_redemptions,

        // Growth metrics
        monthly_growth: analytics.monthly_growth_rate,
        engagement_rate: analytics.customer_engagement_rate
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
      await dataStore.init()

      const { id } = req.params
      const business = dataStore.getBusinesses().find(b => b.id === parseInt(id))

      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        })
      }

      // Get related data
      const branches = dataStore.getBranches().filter(b => b.businessId === business.id)
      const offers = dataStore.getOffers().filter(o => o.businessId === business.id)
      const customers = dataStore.getCustomers().filter(c => c.businessId === business.id)

      // Enrich business data
      const enrichedBusiness = {
        ...business,
        branches,
        offers,
        customers: customers.length,
        total_branches: branches.length,
        total_offers: offers.length,
        active_offers: offers.filter(o => o.status === 'active').length,
        total_customers: branches.reduce((sum, branch) => sum + branch.customers, 0),
        total_redemptions: offers.reduce((sum, offer) => sum + offer.redeemed, 0),
        monthly_revenue: branches.reduce((sum, branch) => sum + branch.monthlyRevenue, 0)
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
      await dataStore.init()

      const { id } = req.params
      const { status, reason } = req.body

      if (!['active', 'pending', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: active, pending, or suspended'
        })
      }

      const updatedBusiness = await dataStore.updateBusinessStatus(id, status, reason)

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

  // Delete business (super admin only)
  static async deleteBusiness(req, res) {
    try {
      await dataStore.init()

      const { id } = req.params
      const businesses = dataStore.getBusinesses()
      const businessIndex = businesses.findIndex(b => b.id === parseInt(id))

      if (businessIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        })
      }

      const business = businesses[businessIndex]

      // Safety checks
      if (business.status === 'active' && business.total_customers > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete business with active customers. Suspend the business first.'
        })
      }

      // Remove business and related data
      businesses.splice(businessIndex, 1)

      // Remove related branches, offers, customers
      dataStore.data.branches = dataStore.data.branches.filter(b => b.businessId !== business.id)
      dataStore.data.offers = dataStore.data.offers.filter(o => o.businessId !== business.id)
      dataStore.data.customers = dataStore.data.customers.filter(c => c.businessId !== business.id)

      await dataStore.save()

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
      await dataStore.init()

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
          const updatedBusiness = await dataStore.updateBusinessStatus(businessId, targetStatus, reason)
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

  // Add new business (for admin registration)
  static async addBusiness(req, res) {
    try {
      await dataStore.init()

      const businessData = req.body

      // Validate required fields
      const requiredFields = ['business_name', 'email', 'phone', 'owner_name', 'business_type', 'region']
      const missingFields = requiredFields.filter(field => !businessData[field])

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        })
      }

      // Check for duplicate email
      const existingBusiness = dataStore.getBusinesses().find(b => b.email === businessData.email)
      if (existingBusiness) {
        return res.status(400).json({
          success: false,
          message: 'Business with this email already exists'
        })
      }

      const newBusiness = await dataStore.addBusiness(businessData)

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
}

export default AdminBusinessController