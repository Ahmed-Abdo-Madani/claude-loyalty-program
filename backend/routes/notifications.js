import express from 'express'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import NotificationService from '../services/NotificationService.js'
import { NotificationCampaign, NotificationLog, Customer, Business } from '../models/index.js'

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
// NOTIFICATION CAMPAIGN ROUTES
// ===============================

// GET /api/notifications/campaigns - List all campaigns for authenticated business
router.get('/campaigns', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { page = 1, limit = 20, status, campaign_type, sort = 'created_at', order = 'DESC' } = req.query

    // Build where clause
    const whereClause = { business_id: businessId }

    if (status) {
      whereClause.status = status
    }

    if (campaign_type) {
      whereClause.campaign_type = campaign_type
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Get campaigns with pagination
    const { rows: campaigns, count: total } = await NotificationCampaign.findAndCountAll({
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
        campaigns,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_campaigns: total,
          per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    })

  } catch (error) {
    console.error('Error fetching campaigns:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message
    })
  }
})

// GET /api/notifications/campaigns/:id - Get specific campaign details
router.get('/campaigns/:campaignId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { campaignId } = req.params

    const campaign = await NotificationCampaign.findOne({
      where: {
        campaign_id: campaignId,
        business_id: businessId
      }
    })

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }

    // Get campaign delivery stats
    const deliveryStats = await NotificationLog.getDeliveryStats(campaignId, businessId)

    res.json({
      success: true,
      data: {
        campaign,
        delivery_stats: deliveryStats
      }
    })

  } catch (error) {
    console.error('Error fetching campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign details',
      error: error.message
    })
  }
})

// POST /api/notifications/campaigns - Create new campaign
router.post('/campaigns', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const campaignData = {
      ...req.body,
      business_id: businessId,
      created_by: req.business.user_id || null
    }

    // Validate required fields
    const { name, campaign_type, channels } = campaignData
    if (!name || !campaign_type || !channels || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, campaign_type, channels'
      })
    }

    // Create campaign
    const campaign = await NotificationCampaign.create(campaignData)

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaign }
    })

  } catch (error) {
    console.error('Error creating campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    })
  }
})

// PUT /api/notifications/campaigns/:id - Update campaign
router.put('/campaigns/:campaignId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { campaignId } = req.params
    const updateData = req.body

    // Find campaign
    const campaign = await NotificationCampaign.findOne({
      where: {
        campaign_id: campaignId,
        business_id: businessId
      }
    })

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }

    // Check if campaign can be updated
    if (campaign.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update campaign that has already been sent'
      })
    }

    // Update campaign
    await campaign.update({
      ...updateData,
      updated_by: req.business.user_id || null,
      updated_at: new Date()
    })

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign }
    })

  } catch (error) {
    console.error('Error updating campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message
    })
  }
})

// DELETE /api/notifications/campaigns/:id - Delete campaign
router.delete('/campaigns/:campaignId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { campaignId } = req.params

    // Find campaign
    const campaign = await NotificationCampaign.findOne({
      where: {
        campaign_id: campaignId,
        business_id: businessId
      }
    })

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }

    // Check if campaign can be deleted
    if (campaign.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign that has already been sent'
      })
    }

    // Soft delete campaign
    await campaign.update({
      status: 'deleted',
      updated_at: new Date()
    })

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message
    })
  }
})

// POST /api/notifications/campaigns/:id/send - Send campaign
router.post('/campaigns/:campaignId/send', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { campaignId } = req.params
    const { test_mode = false, test_recipients = [] } = req.body

    // Find campaign
    const campaign = await NotificationCampaign.findOne({
      where: {
        campaign_id: campaignId,
        business_id: businessId
      }
    })

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }

    // Check campaign status
    if (campaign.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft campaigns can be sent'
      })
    }

    // Send campaign using NotificationService
    let result
    if (test_mode) {
      result = await NotificationService.sendTestCampaign(campaignId, test_recipients)
    } else {
      result = await NotificationService.sendCampaign(campaignId)
    }

    res.json({
      success: true,
      message: test_mode ? 'Test campaign sent successfully' : 'Campaign sent successfully',
      data: result
    })

  } catch (error) {
    console.error('Error sending campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign',
      error: error.message
    })
  }
})

// ===============================
// NOTIFICATION LOG ROUTES
// ===============================

// GET /api/notifications/logs - Get notification logs
router.get('/logs', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const {
      page = 1,
      limit = 50,
      campaign_id,
      customer_id,
      channel,
      status,
      date_from,
      date_to,
      sort = 'created_at',
      order = 'DESC'
    } = req.query

    // Build where clause
    const whereClause = { business_id: businessId }

    if (campaign_id) {
      whereClause.campaign_id = campaign_id
    }

    if (customer_id) {
      whereClause.customer_id = customer_id
    }

    if (channel) {
      whereClause.channel = channel
    }

    if (status) {
      whereClause.status = status
    }

    if (date_from || date_to) {
      whereClause.created_at = {}
      if (date_from) {
        whereClause.created_at[Op.gte] = new Date(date_from)
      }
      if (date_to) {
        whereClause.created_at[Op.lte] = new Date(date_to)
      }
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Get logs with pagination
    const { rows: logs, count: total } = await NotificationLog.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
      include: [
        {
          model: NotificationCampaign,
          as: 'campaign',
          attributes: ['campaign_id', 'name', 'campaign_type']
        }
      ]
    })

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_logs: total,
          per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    })

  } catch (error) {
    console.error('Error fetching notification logs:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification logs',
      error: error.message
    })
  }
})

// GET /api/notifications/analytics - Get notification analytics
router.get('/analytics', requireBusinessAuth, async (req, res) => {
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

    // Get comprehensive notification analytics
    const deliveryStats = await NotificationLog.getDeliveryStats(null, businessId, {
      start: startDate,
      end: endDate
    })

    // Get channel breakdown
    const channelStats = await NotificationLog.findAll({
      where: {
        business_id: businessId,
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'channel',
        [sequelize.fn('COUNT', '*'), 'total_sent'],
        [sequelize.fn('COUNT', sequelize.where(sequelize.col('status'), 'delivered')), 'delivered'],
        [sequelize.fn('COUNT', sequelize.where(sequelize.col('status'), 'opened')), 'opened'],
        [sequelize.fn('COUNT', sequelize.where(sequelize.col('status'), 'clicked')), 'clicked']
      ],
      group: ['channel']
    })

    // Get recent campaigns
    const recentCampaigns = await NotificationCampaign.findAll({
      where: {
        business_id: businessId,
        status: { [Op.in]: ['sent', 'sending', 'completed'] },
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['created_at', 'DESC']],
      limit: 10
    })

    res.json({
      success: true,
      data: {
        period,
        date_range: { start: startDate, end: endDate },
        overall_stats: deliveryStats,
        channel_breakdown: channelStats,
        recent_campaigns: recentCampaigns
      }
    })

  } catch (error) {
    console.error('Error fetching notification analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification analytics',
      error: error.message
    })
  }
})

// ===============================
// QUICK NOTIFICATION ROUTES
// ===============================

// POST /api/notifications/send-quick - Send quick notification to specific customers
router.post('/send-quick', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id
    const { customer_ids, channels, subject, message, send_immediately = true } = req.body

    // Validate required fields
    if (!customer_ids || !channels || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_ids, channels, message'
      })
    }

    // Verify customers belong to business
    const customers = await Customer.findAll({
      where: {
        customer_id: { [Op.in]: customer_ids },
        business_id: businessId,
        status: 'active'
      }
    })

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid customers found'
      })
    }

    // Send quick notification
    const result = await NotificationService.sendQuickNotification({
      business_id: businessId,
      customer_ids: customers.map(c => c.customer_id),
      channels,
      subject,
      message,
      send_immediately
    })

    res.json({
      success: true,
      message: 'Quick notification sent successfully',
      data: result
    })

  } catch (error) {
    console.error('Error sending quick notification:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send quick notification',
      error: error.message
    })
  }
})

export default router