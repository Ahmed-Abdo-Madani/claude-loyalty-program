import { Business } from '../models/index.js'
import logger from '../config/logger.js'

class BusinessSettingsController {
    // Update business notification preferences
    static async updateNotificationPreferences(req, res) {
        try {
            const { notification_preferences } = req.body
            // Use public_id from authenticated business object
            const businessId = req.business.public_id

            if (!notification_preferences) {
                return res.status(400).json({
                    success: false,
                    message: 'Notification preferences are required'
                })
            }

            const business = await Business.findOne({ where: { public_id: businessId } })

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: 'Business not found'
                })
            }

            await business.updateNotificationPreferences(notification_preferences)

            res.status(200).json({
                success: true,
                message: 'Notification preferences updated successfully',
                data: {
                    notification_preferences: business.notification_preferences
                }
            })
        } catch (error) {
            logger.error('Update business preferences error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update preferences',
                error: error.message
            })
        }
    }

    // Get business notification preferences
    static async getNotificationPreferences(req, res) {
        try {
            const businessId = req.business.public_id
            const business = await Business.findOne({ where: { public_id: businessId } })

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: 'Business not found'
                })
            }

            res.status(200).json({
                success: true,
                data: {
                    notification_preferences: business.notification_preferences
                }
            })
        } catch (error) {
            logger.error('Get business preferences error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get preferences',
                error: error.message
            })
        }
    }
}

export default BusinessSettingsController
