import NotificationLog from '../models/NotificationLog.js'
import EmailService from './EmailService.js'
import logger from '../config/logger.js'
import cron from 'node-cron'
import { Op } from 'sequelize'

class EmailAlertService {
    static initialized = false

    constructor() {
        // No side effects in constructor
    }

    init() {
        if (EmailAlertService.initialized) return this

        // Schedule health checks every 6 hours
        cron.schedule('0 */6 * * *', () => EmailAlertService.runHealthChecks())
        logger.info('Scheduled email health check cron job (every 6 hours)')

        EmailAlertService.initialized = true
        return this
    }

    /**
     * Run all health checks and log alerts
     */
    static async runHealthChecks() {
        try {
            logger.info('Running email health checks')

            const results = await Promise.all([
                this.checkRateLimitAlerts(),
                this.checkBounceRateAlerts(),
                this.checkComplaintRateAlerts()
            ])

            const alerts = results.flat().filter(a => a !== null)

            if (alerts.length > 0) {
                logger.warn('Email health issues detected', { count: alerts.length, alerts })
                // Could also trigger a system notification to admins here
            } else {
                logger.info('Email health check passed: System healthy')
            }

            return {
                timestamp: new Date(),
                alerts,
                overallStatus: alerts.length > 0 ? 'warning' : 'healthy'
            }
        } catch (error) {
            logger.error('Failed to run email health checks', { error: error.message })
            return { timestamp: new Date(), alerts: [], error: error.message }
        }
    }

    /**
     * Check if approaching daily rate limits
     */
    static async checkRateLimitAlerts() {
        try {
            const stats = EmailService.getUsageStats()

            // Defaults
            const warningThreshold = 80
            const criticalThreshold = 95

            if (stats.percentUsed >= criticalThreshold) {
                logger.error('Email rate limit critical', stats)
                return {
                    level: 'error',
                    type: 'rate_limit',
                    message: `Critical: ${stats.percentUsed}% of daily email limit used`,
                    details: stats
                }
            } else if (stats.percentUsed >= warningThreshold) {
                logger.warn('Email rate limit warning', stats)
                return {
                    level: 'warning',
                    type: 'rate_limit',
                    message: `Warning: ${stats.percentUsed}% of daily email limit used`,
                    details: stats
                }
            }

            return null
        } catch (error) {
            logger.error('Rate limit check error', { error: error.message })
            return null
        }
    }

    /**
     * Check for high bounce rates in last 24 hours
     */
    static async checkBounceRateAlerts() {
        try {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)

            const whereClause = {
                channel: 'email',
                created_at: { [Op.gte]: yesterday }
            }

            const totalSent = await NotificationLog.count({ where: whereClause })

            if (totalSent < 10) return null // Ignore low volume

            const bounced = await NotificationLog.count({
                where: { ...whereClause, status: 'bounced' }
            })

            const bounceRate = (bounced / totalSent) * 100
            const threshold = parseFloat(process.env.EMAIL_ALERT_BOUNCE_THRESHOLD || '5.0')

            if (bounceRate > threshold) {
                const alert = {
                    level: bounceRate > (threshold * 2) ? 'error' : 'warning',
                    type: 'bounce_rate',
                    message: `High bounce rate: ${bounceRate.toFixed(1)}% (Threshold: ${threshold}%)`,
                    details: { totalSent, bounced, bounceRate }
                }

                logger.warn('High bounce rate detected', alert)
                return alert
            }

            return null
        } catch (error) {
            logger.error('Bounce rate check error', { error: error.message })
            return null
        }
    }

    /**
     * Check for high complaint rates in last 24 hours
     */
    static async checkComplaintRateAlerts() {
        try {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)

            const whereClause = {
                channel: 'email',
                created_at: { [Op.gte]: yesterday }
            }

            const totalSent = await NotificationLog.count({ where: whereClause })

            if (totalSent < 10) return null // Ignore low volume

            const complained = await NotificationLog.count({
                where: { ...whereClause, status: 'complained' }
            })

            const complaintRate = (complained / totalSent) * 100
            const threshold = parseFloat(process.env.EMAIL_ALERT_COMPLAINT_THRESHOLD || '0.1')

            if (complaintRate > threshold) {
                const alert = {
                    level: 'error', // Complaints are always serious
                    type: 'complaint_rate',
                    message: `High complaint rate: ${complaintRate.toFixed(2)}% (Threshold: ${threshold}%)`,
                    details: { totalSent, complained, complaintRate }
                }

                logger.error('High complaint rate detected', alert)
                return alert
            }

            return null
        } catch (error) {
            logger.error('Complaint rate check error', { error: error.message })
            return null
        }
    }
}

// Initialize the cron job by creating an instance if this file is imported
// But typically we export the class and let the app initializer start it, 
// or export a singleton.
// Given the previous pattern with NotificationService, creating an instance might be needed 
// or static initialization block.
// To ensure cron runs, we can run it in a static block or export an instance.

// Let's rely on the main app logic or just call it if valid.
// For now, I'll export the class. The user might need to import it somewhere to start the cron.
// Or I can add a static init() method.

// new EmailAlertService(); // Refactored to let server.js handle it or keep for side-effect
const emailAlertService = new EmailAlertService()
export default emailAlertService
export { EmailAlertService }
