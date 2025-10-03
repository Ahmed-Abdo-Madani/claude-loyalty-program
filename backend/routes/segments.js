import express from 'express'
import { Op } from 'sequelize'
import CustomerSegmentationService from '../services/CustomerSegmentationService.js'
import { CustomerSegment, Customer, Business } from '../models/index.js'

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
// CUSTOMER SEGMENTATION ROUTES
// ===============================

// GET /api/segments - List all segments for authenticated business
router.get('/', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { page = 1, limit = 20, is_active, auto_update, sort = 'created_at', order = 'DESC' } = req.query

    // Build where clause
    const whereClause = { business_id: businessId }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true'
    }

    if (auto_update !== undefined) {
      whereClause.auto_update = auto_update === 'true'
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Get segments with pagination
    const { rows: segments, count: total } = await CustomerSegment.findAndCountAll({
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
        segments,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_segments: total,
          per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    })

  } catch (error) {
    console.error('Error fetching segments:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segments',
      error: error.message
    })
  }
})

// GET /api/segments/:id - Get specific segment details
router.get('/:segmentId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { segmentId } = req.params

    const segment = await CustomerSegment.findOne({
      where: {
        segment_id: segmentId,
        business_id: businessId
      }
    })

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      })
    }

    res.json({
      success: true,
      data: { segment }
    })

  } catch (error) {
    console.error('Error fetching segment:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segment details',
      error: error.message
    })
  }
})

// POST /api/segments - Create new segment
router.post('/', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const segmentData = req.body
    const userId = req.business.user_id || null

    // Validate required fields
    const { name, description } = segmentData
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description'
      })
    }

    // Create segment using CustomerSegmentationService
    const segment = await CustomerSegmentationService.createSegment(businessId, segmentData, userId)

    res.status(201).json({
      success: true,
      message: 'Segment created successfully',
      data: { segment }
    })

  } catch (error) {
    console.error('Error creating segment:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create segment',
      error: error.message
    })
  }
})

// PUT /api/segments/:id - Update segment
router.put('/:segmentId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { segmentId } = req.params
    const updateData = req.body
    const userId = req.business.user_id || null

    // Verify segment belongs to business
    const segment = await CustomerSegment.findOne({
      where: {
        segment_id: segmentId,
        business_id: businessId
      }
    })

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      })
    }

    // Update segment using CustomerSegmentationService
    const updatedSegment = await CustomerSegmentationService.updateSegmentCriteria(segmentId, updateData, userId)

    res.json({
      success: true,
      message: 'Segment updated successfully',
      data: { segment: updatedSegment }
    })

  } catch (error) {
    console.error('Error updating segment:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update segment',
      error: error.message
    })
  }
})

// DELETE /api/segments/:id - Delete segment
router.delete('/:segmentId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { segmentId } = req.params

    // Find segment
    const segment = await CustomerSegment.findOne({
      where: {
        segment_id: segmentId,
        business_id: businessId
      }
    })

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      })
    }

    // Soft delete segment
    await segment.update({
      is_active: false,
      updated_at: new Date()
    })

    res.json({
      success: true,
      message: 'Segment deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting segment:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete segment',
      error: error.message
    })
  }
})

// GET /api/segments/:id/customers - Get customers in segment
router.get('/:segmentId/customers', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { segmentId } = req.params
    const { page = 1, limit = 50, sort = 'last_activity_date', order = 'DESC' } = req.query

    // Verify segment belongs to business
    const segment = await CustomerSegment.findOne({
      where: {
        segment_id: segmentId,
        business_id: businessId
      }
    })

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      })
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Get customers in segment with pagination
    const segmentData = await CustomerSegmentationService.getCustomersInSegment(segmentId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    })

    // Calculate pagination info
    const totalPages = Math.ceil(segmentData.total_count / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    res.json({
      success: true,
      data: {
        segment: segmentData.segment,
        customers: segmentData.customers,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_customers: segmentData.total_count,
          per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    })

  } catch (error) {
    console.error('Error fetching segment customers:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segment customers',
      error: error.message
    })
  }
})

// POST /api/segments/:id/refresh - Refresh segment size
router.post('/:segmentId/refresh', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { segmentId } = req.params

    // Verify segment belongs to business
    const segment = await CustomerSegment.findOne({
      where: {
        segment_id: segmentId,
        business_id: businessId
      }
    })

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      })
    }

    // Refresh segment size
    const result = await CustomerSegmentationService.calculateSegmentSize(segmentId)

    res.json({
      success: true,
      message: 'Segment refreshed successfully',
      data: result
    })

  } catch (error) {
    console.error('Error refreshing segment:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to refresh segment',
      error: error.message
    })
  }
})

// GET /api/segments/:id/analytics - Get segment analytics
router.get('/:segmentId/analytics', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { segmentId } = req.params
    const { period = '30d' } = req.query

    // Verify segment belongs to business
    const segment = await CustomerSegment.findOne({
      where: {
        segment_id: segmentId,
        business_id: businessId
      }
    })

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      })
    }

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

    // Get segment analytics
    const analytics = await CustomerSegmentationService.getSegmentAnalytics(segmentId, {
      start: startDate,
      end: endDate
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
    console.error('Error fetching segment analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segment analytics',
      error: error.message
    })
  }
})

// ===============================
// PREDEFINED SEGMENTS ROUTES
// ===============================

// POST /api/segments/predefined - Create predefined segments for business
router.post('/predefined', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const userId = req.business.user_id || null

    // Create predefined segments
    const segments = await CustomerSegmentationService.createPredefinedSegments(businessId, userId)

    res.status(201).json({
      success: true,
      message: 'Predefined segments created successfully',
      data: { segments }
    })

  } catch (error) {
    console.error('Error creating predefined segments:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create predefined segments',
      error: error.message
    })
  }
})

// GET /api/segments/predefined/high-value - Get high-value customers segment
router.get('/predefined/high-value', requireBusinessAuth, async (req, res) => {
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

// GET /api/segments/predefined/at-risk - Get customers at risk of churning
router.get('/predefined/at-risk', requireBusinessAuth, async (req, res) => {
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

// GET /api/segments/predefined/birthday - Get customers with upcoming birthdays
router.get('/predefined/birthday', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { days_ahead = 7 } = req.query

    // Calculate date range
    const today = new Date()
    const endDate = new Date(today.getTime() + (parseInt(days_ahead) * 24 * 60 * 60 * 1000))

    const birthdayCustomers = await CustomerSegmentationService.getBirthdayCustomers(businessId, {
      start: today,
      end: endDate
    })

    res.json({
      success: true,
      data: birthdayCustomers
    })

  } catch (error) {
    console.error('Error fetching birthday customers:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch birthday customers',
      error: error.message
    })
  }
})

// POST /api/segments/refresh-all - Refresh all segments for business
router.post('/refresh-all', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id

    const result = await CustomerSegmentationService.refreshBusinessSegments(businessId)

    res.json({
      success: true,
      message: 'All segments refreshed successfully',
      data: result
    })

  } catch (error) {
    console.error('Error refreshing all segments:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to refresh all segments',
      error: error.message
    })
  }
})

export default router