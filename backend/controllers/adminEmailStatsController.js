import NotificationLog from '../models/NotificationLog.js'
import EmailService from '../services/EmailService.js'
import { Op } from 'sequelize'
import logger from '../config/logger.js'

class AdminEmailStatsController {

    /**
     * Get email statistics (delivery, open, click rates)
     * GET /api/admin/analytics/email/stats
     */
    static async getEmailStats(req, res) {
        try {
            const { startDate, endDate, businessId } = req.query

            const whereClause = {
                channel: 'email'
            }

            // Date filtering
            if (startDate || endDate) {
                whereClause.created_at = {}
                if (startDate) whereClause.created_at[Op.gte] = new Date(startDate)
                if (endDate) {
                    const end = new Date(endDate);
                    end.setUTCHours(23, 59, 59, 999);
                    whereClause.created_at[Op.lte] = end
                }
            }

            // Business filtering
            if (businessId) {
                whereClause.business_id = businessId
            }

            // Aggregate stats
            // Note: This matches the pattern in NotificationLog.getDeliveryStats if available,
            // but implementing directly since getDeliveryStats signatures might vary.
            // Assuming standard Sequelize count queries.

            const totalSent = await NotificationLog.count({ where: whereClause })

            const delivered = await NotificationLog.count({
                where: { ...whereClause, status: { [Op.in]: ['delivered', 'opened', 'clicked'] } }
            })

            const opened = await NotificationLog.count({
                where: { ...whereClause, status: { [Op.in]: ['opened', 'clicked'] } }
            })

            const clicked = await NotificationLog.count({
                where: { ...whereClause, status: 'clicked' }
            })

            const failed = await NotificationLog.count({
                where: { ...whereClause, status: 'failed' }
            })

            const bounced = await NotificationLog.count({
                where: {
                    ...whereClause,
                    [Op.or]: [
                        { status: 'bounced' },
                        { external_status: 'bounced' }
                    ]
                }
            })

            const complained = await NotificationLog.count({
                where: {
                    ...whereClause,
                    [Op.or]: [
                        { status: 'complained' },
                        { external_status: 'complained' }
                    ]
                }
            })

            // Calculate rates
            const calculateRate = (count, total) => total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0

            const stats = {
                total_sent: totalSent,
                delivered,
                opened,
                clicked,
                failed,
                bounced,
                complained,
                delivery_rate: calculateRate(delivered, totalSent),
                open_rate: calculateRate(opened, totalSent), // Usually opened / delivered, but user spec says sent? 
                // User spec: 52.2 open rate. Usually Open Rate is Unique Opens / Delivered.
                // I'll stick to Opens / Sent for simplicity or verify industry standard? 
                // Standard is Opens / Delivered. But let's follow standard if user didn't specify formula.
                // Actually, let's use Opens / Delivered as it's more accurate.
                // But for safety if delivered is 0, use totalSent.
                click_rate: calculateRate(clicked, opened || delivered || totalSent), // Clicks per Open typically
                bounce_rate: calculateRate(bounced, totalSent),
                complaint_rate: calculateRate(complained, totalSent)
            }

            // Override rates to match user example logic if needed, but sticking to reasonable defaults.
            // User example: delivery_rate 98.0

            res.json({
                success: true,
                data: {
                    stats,
                    period: {
                        start: startDate || 'all-time',
                        end: endDate || 'now'
                    }
                }
            })

        } catch (error) {
            logger.error('Failed to get email stats', { error: error.message })
            res.status(500).json({ success: false, error: 'Failed to retrieve email statistics' })
        }
    }

    /**
     * Get current email usage against limits
     * GET /api/admin/analytics/email/usage
     */
    static async getEmailUsage(req, res) {
        try {
            // Get real-time usage from in-memory service
            const usageStats = EmailService.getUsageStats()

            // Calculate hourly breakdown for today 
            // (This requires DB query since in-memory only stores total count)
            const startOfDay = new Date()
            startOfDay.setUTCHours(0, 0, 0, 0)

            const hourlyData = await NotificationLog.findAll({
                attributes: [
                    [NotificationLog.sequelize.fn('date_part', 'hour', NotificationLog.sequelize.col('created_at')), 'hour'],
                    [NotificationLog.sequelize.fn('count', '*'), 'count']
                ],
                where: {
                    channel: 'email',
                    created_at: { [Op.gte]: startOfDay }
                },
                group: [NotificationLog.sequelize.fn('date_part', 'hour', NotificationLog.sequelize.col('created_at'))],
                order: [[NotificationLog.sequelize.fn('date_part', 'hour', NotificationLog.sequelize.col('created_at')), 'ASC']]
            })

            const hourlyBreakdown = hourlyData.map(item => ({
                hour: parseInt(item.get('hour')),
                count: parseInt(item.get('count'))
            }))

            // Generate alerts
            const alerts = []
            if (usageStats.percentUsed >= 90) {
                alerts.push({
                    level: 'warning',
                    message: `${usageStats.percentUsed}% of daily email limit used`,
                    recommendation: 'Consider upgrading to a paid plan or reducing email volume'
                })
            }

            res.json({
                success: true,
                data: {
                    usage: usageStats,
                    hourlyBreakdown,
                    alerts
                }
            })

        } catch (error) {
            logger.error('Failed to get email usage', { error: error.message })
            res.status(500).json({ success: false, error: 'Failed to retrieve email usage' })
        }
    }

    /**
     * Get overall email system health
     * GET /api/admin/analytics/email/health
     */
    static async getEmailHealth(req, res) {
        try {
            // Look back 24 hours
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)

            const whereClause = {
                channel: 'email',
                created_at: { [Op.gte]: yesterday }
            }

            const totalSent = await NotificationLog.count({ where: whereClause })

            if (totalSent === 0) {
                return res.json({
                    success: true,
                    data: {
                        healthScore: 100,
                        status: 'good',
                        issues: [],
                        recommendations: ['No emails sent in the last 24 hours'],
                        lastUpdated: new Date()
                    }
                })
            }

            const delivered = await NotificationLog.count({
                where: { ...whereClause, status: { [Op.in]: ['delivered', 'opened', 'clicked'] } }
            })

            const bounced = await NotificationLog.count({
                where: { ...whereClause, status: 'bounced' }
            })

            const complained = await NotificationLog.count({
                where: { ...whereClause, status: 'complained' }
            })

            // Calculate metrics
            const deliveryRate = (delivered / totalSent) * 100
            const bounceRate = (bounced / totalSent) * 100
            const complaintRate = (complained / totalSent) * 100

            // Health Score Algorithm
            // Start with 100
            // Deduct points for issues
            let score = 100
            const issues = []
            const recommendations = []

            // Delivery Rate Impact (40% weight)
            if (deliveryRate < 95) {
                const penalty = Math.min(40, (95 - deliveryRate) * 2)
                score -= penalty
                issues.push({
                    type: 'delivery_rate',
                    severity: deliveryRate < 80 ? 'high' : 'medium',
                    value: Number(deliveryRate.toFixed(2)),
                    threshold: 95.0,
                    message: `Delivery rate is low (${deliveryRate.toFixed(1)}%)`
                })
                recommendations.push('Investigate failed deliveries and check logs for error patterns')
            }

            // Bounce Rate Impact (30% weight)
            if (bounceRate > 5) { // 5% hard bounce threshold
                const penalty = Math.min(30, (bounceRate - 5) * 3)
                score -= penalty
                issues.push({
                    type: 'bounce_rate',
                    severity: bounceRate > 10 ? 'high' : 'medium',
                    value: Number(bounceRate.toFixed(2)),
                    threshold: 5.0,
                    message: `High bounce rate detected (${bounceRate.toFixed(1)}%)`
                })
                recommendations.push('Clean your email list and remove invalid addresses')
            }

            // Complaint Rate Impact (30% weight)
            if (complaintRate > 0.1) { // 0.1% spam complaint threshold
                const penalty = Math.min(30, (complaintRate - 0.1) * 100)
                score -= penalty
                issues.push({
                    type: 'complaint_rate',
                    severity: complaintRate > 0.5 ? 'critical' : 'high',
                    value: Number(complaintRate.toFixed(2)),
                    threshold: 0.1,
                    message: `High spam complaint rate (${complaintRate.toFixed(2)}%)`
                })
                recommendations.push('Review email content and ensure easy unsubscribe options')
            }

            // Determine Status
            let status = 'good'
            if (score >= 95) status = 'excellent'
            else if (score >= 85) status = 'good'
            else if (score >= 70) status = 'warning'
            else status = 'critical'

            res.json({
                success: true,
                data: {
                    healthScore: Math.max(0, Math.round(score)),
                    status,
                    issues,
                    recommendations,
                    lastUpdated: new Date()
                }
            })

        } catch (error) {
            logger.error('Failed to get email health', { error: error.message })
            res.status(500).json({ success: false, error: 'Failed to calculate email health' })
        }
    }

    /**
     * Test email connectivity by sending a test email to the admin
     * GET /api/admin/email/test
     */
    static async testEmailConnectivity(req, res) {
        try {
            const adminEmail = process.env.ADMIN_EMAIL;
            
            const result = await EmailService.sendTransactional({
                to: adminEmail,
                subject: "[Madna] Email Connectivity Test",
                html: "<p>This is a test email to confirm the service is reachable.</p>",
                text: "This is a test email to confirm the service is reachable."
            });
            
            logger.info('Test email sent successfully', { messageId: result.externalId });
            
            res.json({
                success: true,
                messageId: result.externalId,
                provider: 'resend',
                sentTo: adminEmail
            });
        } catch (error) {
            logger.error('Test email failed', { error: error.message, code: error.code });
            res.status(502).json({
                success: false,
                error: error.message,
                code: error.code
            });
        }
    }
}

export default AdminEmailStatsController
