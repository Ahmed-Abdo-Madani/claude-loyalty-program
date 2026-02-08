import { PlatformAdmin } from '../models/index.js'
import logger from '../config/logger.js'

class AdminSettingsController {
    // Update admin notification preferences
    static async updateNotificationPreferences(req, res) {
        try {
            const { notification_preferences } = req.body
            const adminId = req.admin.adminId

            if (!notification_preferences) {
                return res.status(400).json({
                    success: false,
                    message: 'Notification preferences are required'
                })
            }

            const admin = await PlatformAdmin.findByPk(adminId)

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                })
            }

            await admin.updateNotificationPreferences(notification_preferences)

            res.status(200).json({
                success: true,
                message: 'Notification preferences updated successfully',
                data: {
                    notification_preferences: admin.notification_preferences
                }
            })
        } catch (error) {
            logger.error('Update admin preferences error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update preferences',
                error: error.message
            })
        }
    }

    // Get admin notification preferences
    static async getNotificationPreferences(req, res) {
        try {
            const adminId = req.admin.adminId
            const admin = await PlatformAdmin.findByPk(adminId)

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                })
            }

            res.status(200).json({
                success: true,
                data: {
                    notification_preferences: admin.notification_preferences
                }
            })
        } catch (error) {
            logger.error('Get admin preferences error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get preferences',
                error: error.message
            })
        }
    }
}

export default AdminSettingsController
