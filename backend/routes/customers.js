import express from 'express'
import { Op } from 'sequelize'
import CustomerService from '../services/CustomerService.js'
import CustomerSegmentationService from '../services/CustomerSegmentationService.js'
import { Customer, CustomerProgress, Business, Offer } from '../models/index.js'

const router = express.Router()

// Middleware to verify business session - reused from business.js pattern
const requireBusinessAuth = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token']
    const businessId = req.headers['x-business-id'] // Expects secure ID (biz_*)

    if (!sessionToken || !businessId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    // Find business by secure public_id instead of integer id
    const business = await Business.findByPk(businessId) // businessId is now secure string

    if (!business || business.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid business or account not active'
      })
    }

    req.business = business
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    })
  }
}

// ===============================
// CUSTOMER MANAGEMENT ROUTES
// ===============================

// GET /api/customers - List all customers for authenticated business
router.get('/', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { page = 1, limit = 50, search, status, lifecycle_stage, sort = 'created_at', order = 'DESC' } = req.query

    // Build where clause
    const whereClause = { business_id: businessId }

    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ]
    }

    if (status) {
      whereClause.status = status
    }

    if (lifecycle_stage) {
      whereClause.lifecycle_stage = lifecycle_stage
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Get customers with pagination (simplified for now - without associations)
    const { rows: customers, count: total } = await Customer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    })

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_customers: total,
          per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    })

  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    })
  }
})

// GET /api/customers/:id - Get specific customer details
router.get('/:customerId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { customerId } = req.params

    const customer = await Customer.findOne({
      where: {
        customer_id: customerId,
        business_id: businessId
      },
      include: [
        {
          model: CustomerProgress,
          as: 'progress',
          include: [{ model: Offer, as: 'offer' }],
          order: [['updated_at', 'DESC']]
        }
      ]
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }

    // Get customer analytics
    const analytics = await CustomerService.getCustomerAnalytics(customerId, businessId)

    res.json({
      success: true,
      data: {
        customer,
        analytics
      }
    })

  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details',
      error: error.message
    })
  }
})

// POST /api/customers - Create new customer
router.post('/', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const customerData = {
      ...req.body,
      business_id: businessId
    }

    // Validate required fields
    const { first_name, last_name, email, phone } = customerData
    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: first_name, last_name, email, phone'
      })
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      where: {
        business_id: businessId,
        [Op.or]: [
          { email: email },
          { phone: phone }
        ]
      }
    })

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'Customer with this email or phone already exists'
      })
    }

    // Create customer using CustomerService
    const customer = await CustomerService.createCustomer(customerData)

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    })

  } catch (error) {
    console.error('Error creating customer:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    })
  }
})

// PUT /api/customers/:id - Update customer
router.put('/:customerId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { customerId } = req.params
    const updateData = req.body

    // Find customer
    const customer = await Customer.findOne({
      where: {
        customer_id: customerId,
        business_id: businessId
      }
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }

    // Update customer
    await customer.update(updateData)

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    })

  } catch (error) {
    console.error('Error updating customer:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    })
  }
})

// DELETE /api/customers/:id - Soft delete customer
router.delete('/:customerId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { customerId } = req.params

    // Find customer
    const customer = await Customer.findOne({
      where: {
        customer_id: customerId,
        business_id: businessId
      }
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }

    // Soft delete (update status to inactive)
    await customer.update({
      status: 'inactive',
      updated_at: new Date()
    })

    res.json({
      success: true,
      message: 'Customer deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting customer:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    })
  }
})

// GET /api/customers/:id/progress - Get customer's progress across all offers
router.get('/:customerId/progress', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { customerId } = req.params

    // Verify customer belongs to business
    const customer = await Customer.findOne({
      where: {
        customer_id: customerId,
        business_id: businessId
      }
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }

    // Get all customer progress
    const progress = await CustomerProgress.findAll({
      where: { customer_id: customerId },
      include: [
        {
          model: Offer,
          as: 'offer',
          where: { business_id: businessId }
        }
      ],
      order: [['updated_at', 'DESC']]
    })

    res.json({
      success: true,
      data: {
        customer_id: customerId,
        progress
      }
    })

  } catch (error) {
    console.error('Error fetching customer progress:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer progress',
      error: error.message
    })
  }
})

// GET /api/customers/analytics - Get customer analytics for business
router.get('/analytics/overview', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { period = '30d' } = req.query

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    // Get comprehensive analytics
    const analytics = await CustomerService.getBusinessCustomerAnalytics(businessId, {
      start_date: startDate,
      end_date: endDate
    })

    res.json({
      success: true,
      data: {
        period,
        date_range: { start: startDate, end: endDate },
        analytics
      }
    })

  } catch (error) {
    console.error('Error fetching customer analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer analytics',
      error: error.message
    })
  }
})

// GET /api/customers/segments/high-value - Get high-value customers
router.get('/segments/high-value', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { min_value = 500, min_visits = 10, limit = 100 } = req.query

    const highValueCustomers = await CustomerSegmentationService.getHighValueCustomers(businessId, {
      minValue: parseInt(min_value),
      minVisits: parseInt(min_visits),
      limit: parseInt(limit)
    })

    res.json({
      success: true,
      data: highValueCustomers
    })

  } catch (error) {
    console.error('Error fetching high-value customers:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch high-value customers',
      error: error.message
    })
  }
})

// GET /api/customers/segments/at-risk - Get customers at risk of churning
router.get('/segments/at-risk', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { inactive_days = 30, min_previous_visits = 3, limit = 100 } = req.query

    const atRiskCustomers = await CustomerSegmentationService.getChurningCustomers(businessId, {
      inactiveDays: parseInt(inactive_days),
      minPreviousVisits: parseInt(min_previous_visits),
      limit: parseInt(limit)
    })

    res.json({
      success: true,
      data: atRiskCustomers
    })

  } catch (error) {
    console.error('Error fetching at-risk customers:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch at-risk customers',
      error: error.message
    })
  }
})

export default router