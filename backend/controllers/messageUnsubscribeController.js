import { Message, Business, Conversation } from '../models/index.js'
import logger from '../config/logger.js'

class MessageUnsubscribeController {
    // Handle unsubscribe request from email link
    static async unsubscribe(req, res) {
        try {
            const { token } = req.params

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid unsubscribe token'
                })
            }

            // Find message with this token
            const message = await Message.findOne({
                where: { unsubscribe_token: token },
                include: [{
                    model: Conversation,
                    as: 'conversation'
                }]
            })

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Invalid or expired unsubscribe link'
                })
            }

            // Identify the business from the conversation
            // Messages with unsubscribe links are sent TO businesses (from Admin)
            // So the recipient is the business associated with the conversation
            const businessId = message.conversation.business_id

            const business = await Business.findOne({
                where: { public_id: businessId }
            })

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: 'Business account not found'
                })
            }

            // Update business preferences to disable message notifications
            await business.updateNotificationPreferences({
                message_notifications: false
            })

            // Log the action
            logger.info(`Business ${business.public_id} unsubscribe from message notifications via token from message ${message.uuid}`)

            // Optional: Render a nice HTML page or redirect to frontend
            // For API, we return JSON, but typically unsubscribe links load a page.
            // If the request accepts HTML, redirect to frontend confirmation page
            if (req.accepts('html')) {
                return res.redirect(`${process.env.FRONTEND_URL}/unsubscribe/success?type=messages`)
            }

            res.status(200).json({
                success: true,
                message: 'Successfully unsubscribed from message notifications'
            })

        } catch (error) {
            logger.error('Unsubscribe error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to process unsubscribe request'
            })
        }
    }
}

export default MessageUnsubscribeController
