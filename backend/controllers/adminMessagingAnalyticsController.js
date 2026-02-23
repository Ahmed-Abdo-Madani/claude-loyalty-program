
import { Op } from 'sequelize'
import {
    sequelize,
    Message,
    Conversation,
    Business
} from '../models/index.js'
import logger from '../config/logger.js'

class AdminMessagingAnalyticsController {
    // Get overall messaging statistics
    static async getMessagingStats(req, res) {
        try {
            const {
                totalConversations,
                openConversations,
                closedConversations,
                totalMessages,
                messagesToday,
                avgMessagesPerConversation
            } = await AdminMessagingAnalyticsController._calculateMessagingStats()

            res.json({
                success: true,
                data: {
                    total_conversations: totalConversations,
                    open_conversations: openConversations,
                    closed_conversations: closedConversations,
                    total_messages: totalMessages,
                    messages_today: messagesToday,
                    avg_messages_per_conversation: avgMessagesPerConversation
                }
            })
        } catch (error) {
            logger.error('Get messaging stats error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch messaging statistics',
                error: error.message
            })
        }
    }

    // Helper to calculate basic stats
    static async _calculateMessagingStats() {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const [
            totalConversations,
            openConversations,
            closedConversations,
            totalMessages,
            messagesToday
        ] = await Promise.all([
            Conversation.count(),
            Conversation.count({ where: { status: 'open' } }),
            Conversation.count({ where: { status: 'closed' } }),
            Message.count(),
            Message.count({
                where: {
                    created_at: {
                        [Op.gte]: todayStart
                    }
                }
            })
        ])

        const avgMessagesPerConversation = totalConversations > 0
            ? (totalMessages / totalConversations).toFixed(1)
            : 0

        return {
            totalConversations,
            openConversations,
            closedConversations,
            totalMessages,
            messagesToday,
            avgMessagesPerConversation
        }
    }

    // Get response time metrics
    static async getResponseTimeMetrics(req, res) {
        try {
            // Calculate response times
            // We need to find pairs of messages: Business Inquiry -> First Admin Response
            // This is complex in SQL/Sequelize, so we'll do an approximation or use a raw query

            const query = `
        SELECT 
          AVG(EXTRACT(EPOCH FROM (admin_msg.created_at - business_msg.created_at))/60) as avg_response_time_minutes,
          MIN(EXTRACT(EPOCH FROM (admin_msg.created_at - business_msg.created_at))/60) as min_response_time_minutes,
          MAX(EXTRACT(EPOCH FROM (admin_msg.created_at - business_msg.created_at))/60) as max_response_time_minutes
        FROM messages as business_msg
        JOIN messages as admin_msg ON business_msg.conversation_id = admin_msg.conversation_id
        WHERE business_msg.sender_type = 'business'
        AND admin_msg.sender_type = 'admin'
        AND admin_msg.created_at > business_msg.created_at
        AND admin_msg.id = (
          SELECT MIN(id) 
          FROM messages m2 
          WHERE m2.conversation_id = business_msg.conversation_id 
          AND m2.sender_type = 'admin' 
          AND m2.created_at > business_msg.created_at
        )
      `

            const [results] = await sequelize.query(query)
            const metrics = results[0]

            // Calculate Resolution Time: Avg time from conversation created_at to closed status
            // Note: This relies on 'updated_at' approximating close time if not tracked separately, 
            // or we can assume closed conversations' updated_at is close time.
            const resolutionQuery = `
                SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_resolution_time_minutes
                FROM conversations
                WHERE status = 'closed'
            `
            const [resolutionResults] = await sequelize.query(resolutionQuery)
            const resolutionMetrics = resolutionResults[0]

            res.json({
                success: true,
                data: {
                    avg_response_time: parseFloat(metrics.avg_response_time_minutes || 0).toFixed(0),
                    fastest_response: parseFloat(metrics.min_response_time_minutes || 0).toFixed(0),
                    slowest_response: parseFloat(metrics.max_response_time_minutes || 0).toFixed(0),
                    avg_first_response_time: parseFloat(metrics.avg_response_time_minutes || 0).toFixed(0), // Approximation used in query
                    avg_resolution_time: parseFloat(resolutionMetrics.avg_resolution_time_minutes || 0).toFixed(0)
                }
            })

        } catch (error) {
            logger.error('Get response time metrics error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch response time metrics',
                error: error.message
            })
        }
    }

    // Get conversation trends (last 30 days)
    static async getConversationTrends(req, res) {
        try {
            const { period = '30d' } = req.query
            const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)

            const trends = await Conversation.findAll({
                attributes: [
                    [sequelize.literal("created_at::date"), 'date'],
                    [sequelize.fn('COUNT', 'id'), 'count']
                ],
                where: {
                    created_at: {
                        [Op.gte]: startDate
                    }
                },
                group: [sequelize.literal("created_at::date")],
                order: [[sequelize.literal("created_at::date"), 'ASC']],
                raw: true
            })

            const messageTrends = await Message.findAll({
                attributes: [
                    [sequelize.literal("created_at::date"), 'date'],
                    [sequelize.fn('COUNT', 'id'), 'count']
                ],
                where: {
                    created_at: {
                        [Op.gte]: startDate
                    }
                },
                group: [sequelize.literal("created_at::date")],
                order: [[sequelize.literal("created_at::date"), 'ASC']],
                raw: true
            })

            // Merge and format data
            const aggregatedData = []
            // Loop from 0 to days (inclusive) to cover the full range including today if we want exact 'days' count back
            // Or typically 0 to days-1. User verification says "omit current day due to loop bounds".
            // If we start at startDate (days ago) and add i, we need to go up to today.
            // startDate = today - days. 
            // i=0 -> startDate. i=days -> today.
            for (let i = 0; i <= days; i++) {
                const d = new Date(startDate)
                d.setDate(d.getDate() + i)
                const dateStr = d.toISOString().split('T')[0]

                const convCheck = trends.find(t => t.date === dateStr)
                const msgCheck = messageTrends.find(m => m.date === dateStr)

                aggregatedData.push({
                    date: dateStr,
                    conversations: parseInt(convCheck?.count || 0),
                    messages: parseInt(msgCheck?.count || 0)
                })
            }

            res.json({
                success: true,
                data: aggregatedData
            })

        } catch (error) {
            logger.error('Get conversation trends error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch conversation trends',
                error: error.message
            })
        }
    }

    // Get conversation status distribution
    static async getConversationStatusDistribution(req, res) {
        try {
            const distribution = await Conversation.findAll({
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', 'id'), 'count']
                ],
                group: ['status'],
                raw: true
            })

            const total = distribution.reduce((sum, d) => sum + parseInt(d.count), 0)

            const formatted = distribution.map(d => ({
                status: d.status,
                count: parseInt(d.count),
                percentage: total > 0 ? ((parseInt(d.count) / total) * 100).toFixed(1) : 0
            }))

            res.json({
                success: true,
                data: formatted
            })
        } catch (error) {
            logger.error('Get status distribution error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch status distribution',
                error: error.message
            })
        }
    }

    // Get most active businesses
    static async getMostActiveBusinesses(req, res) {
        try {
            const { limit = 10 } = req.query

            const activeBusinesses = await Conversation.findAll({
                attributes: [
                    'business_id',
                    [sequelize.fn('COUNT', sequelize.col('Conversation.id')), 'conversation_count'],
                    [sequelize.fn('MAX', sequelize.col('Conversation.created_at')), 'last_activity']
                ],
                include: [
                    {
                        model: Business,
                        as: 'business',
                        attributes: ['business_name', 'email', 'phone']
                    }
                ],
                group: ['business_id', sequelize.col('business.public_id'), sequelize.col('business.id')],
                order: [[sequelize.col('conversation_count'), 'DESC']],
                limit: parseInt(limit),
                subQuery: false
            })

            // Get message counts for these businesses separately or via include if possible
            // For simplicity/performance, we might just count conversations or do a separate query for messages

            const formatted = await Promise.all(activeBusinesses.map(async (b) => {
                const messageCount = await Message.count({
                    where: {
                        sender_id: b.business_id,
                        sender_type: 'business'
                    }
                })

                return {
                    business_id: b.business_id,
                    business_name: b.business?.business_name || 'Unknown',
                    email: b.business?.email,
                    conversation_count: parseInt(b.getDataValue('conversation_count')),
                    message_count: messageCount,
                    last_activity: b.getDataValue('last_activity')
                }
            }))

            // Re-sort by activity (mix of conversations and messages if desired, but here conversations is primary)

            res.json({
                success: true,
                data: formatted
            })

        } catch (error) {
            logger.error('Get active businesses error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch active businesses',
                error: error.message
            })
        }
    }

    // Export messaging history
    static async exportMessagingHistory(req, res) {
        try {
            const { start_date, end_date, status, period, format = 'csv' } = req.query

            const where = {}

            // Handle period logic if specific dates aren't provided
            if (!start_date || !end_date) {
                if (period) {
                    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30
                    const startDate = new Date()
                    startDate.setDate(startDate.getDate() - days)
                    where.created_at = {
                        [Op.gte]: startDate
                    }
                }
            } else {
                where.created_at = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                }
            }

            if (status) {
                where.status = status
            }

            const conversations = await Conversation.findAll({
                where,
                include: [
                    {
                        model: Business,
                        as: 'business',
                        attributes: ['business_name', 'email']
                    }
                ],
                order: [['created_at', 'DESC']],
                raw: true,
                nest: true
            })

            // Transform data
            const exportData = conversations.map(c => ({
                ConversationID: c.conversation_id,
                Date: new Date(c.created_at).toLocaleDateString(),
                BusinessName: c.business.business_name,
                BusinessEmail: c.business.email,
                Subject: c.subject,
                Status: c.status,
                LastMessage: c.last_message_at ? new Date(c.last_message_at).toLocaleString() : 'N/A',
                AdminUnread: c.unread_count_admin
            }))

            if (format === 'pdf') {
                const PDFDocument = (await import('pdfkit')).default
                const doc = new PDFDocument()

                res.setHeader('Content-Type', 'application/pdf')
                res.setHeader('Content-Disposition', `attachment; filename=messaging_history_${period || 'custom'}_${Date.now()}.pdf`)

                doc.pipe(res)

                doc.fontSize(20).text('Messaging History Report', { align: 'center' })
                doc.moveDown()
                doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`)
                doc.text(`Period: ${period || 'Custom Range'}`)
                doc.moveDown()

                // Simple table-like structure
                exportData.forEach((item, index) => {
                    doc.fontSize(10).font('Helvetica-Bold').text(`Conversation #${index + 1}: ${item.Subject}`)
                    doc.font('Helvetica').text(`Business: ${item.BusinessName} (${item.BusinessEmail})`)
                    doc.text(`Date: ${item.Date} | Status: ${item.Status}`)
                    doc.text(`Last Message: ${item.LastMessage}`)
                    doc.moveDown(0.5)
                })

                doc.end()
                return // Response handled by pipe
            }

            // Default CSV JSON response
            res.json({
                success: true,
                data: exportData
            })

        } catch (error) {
            logger.error('Export messaging history error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to export messaging history',
                error: error.message
            })
        }
    }
}

export default AdminMessagingAnalyticsController
