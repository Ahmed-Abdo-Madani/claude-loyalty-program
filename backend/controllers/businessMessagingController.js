import { Conversation, Message, Business, PlatformAdmin } from '../models/index.js'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import EmailService from '../services/EmailService.js'
import logger from '../config/logger.js'

class BusinessMessagingController {
    // Get all conversations for business with pagination
    static async getConversations(req, res) {
        try {
            const businessId = req.business.public_id // from auth middleware
            const { status, search, limit = 20, offset = 0, sort_by = 'recent' } = req.query

            const where = { business_id: businessId }

            // Filter by status
            if (status && ['open', 'closed', 'archived'].includes(status)) {
                where.status = status
            }

            // Search by subject or conversation ID
            if (search) {
                where[Op.or] = [
                    { subject: { [Op.iLike]: `%${search}%` } },
                    { conversation_id: { [Op.iLike]: `%${search}%` } }
                ]
            }

            // Determine sort order
            let order = [['last_message_at', 'DESC']]
            if (sort_by === 'unread') {
                order = [['unread_count_business', 'DESC'], ['last_message_at', 'DESC']]
            } else if (sort_by === 'oldest') {
                order = [['created_at', 'ASC']]
            }

            const { rows: conversations, count: total } = await Conversation.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order
            })

            // Add last message preview
            const conversationIds = conversations.map(c => c.conversation_id)
            const lastMessages = await Message.findAll({
                where: {
                    conversation_id: { [Op.in]: conversationIds },
                    id: {
                        [Op.in]: sequelize.literal(`(
                      SELECT MAX(id) 
                      FROM messages AS m2 
                      WHERE m2.conversation_id = messages.conversation_id
                  )`)
                    }
                },
                attributes: ['conversation_id', 'message_body', 'sender_type']
            })

            const lastMessageMap = {}
            lastMessages.forEach(m => {
                lastMessageMap[m.conversation_id] = m
            })

            const data = conversations.map(c => {
                const plain = c.get({ plain: true })
                const lastMsg = lastMessageMap[c.conversation_id]
                plain.last_message_preview = lastMsg ? lastMsg.message_body.substring(0, 50) + '...' : ''
                plain.last_sender = lastMsg ? lastMsg.sender_type : null
                return plain
            })

            res.json({
                success: true,
                data: {
                    conversations: data,
                    pagination: {
                        total,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        has_more: (parseInt(offset) + parseInt(limit)) < total
                    }
                }
            })
        } catch (error) {
            logger.error('Get business conversations error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch conversations',
                error: error.message
            })
        }
    }

    // Get conversation by ID with all messages
    static async getConversationById(req, res) {
        try {
            const { id } = req.params
            const businessId = req.business.public_id

            const conversation = await Conversation.findOne({
                where: {
                    conversation_id: id,
                    business_id: businessId // Ensure ownership
                },
                include: [
                    {
                        model: Message,
                        as: 'messages',
                        // Order here if possible, but we do sort below
                    }
                ],
                order: [[{ model: Message, as: 'messages' }, 'created_at', 'ASC']] // Order messages
            })

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found'
                })
            }

            // Mark business messages as read (messages sent BY admin TO business)
            const unreadMessages = conversation.messages.filter(
                m => m.sender_type === 'admin' && m.status !== 'read'
            )

            if (unreadMessages.length > 0) {
                await Message.update(
                    { status: 'read', read_at: new Date() },
                    {
                        where: {
                            id: { [Op.in]: unreadMessages.map(m => m.id) }
                        }
                    }
                )
            }

            // Reset business unread count
            if (conversation.unread_count_business > 0) {
                await conversation.resetUnreadCount('business')
            }

            res.json({
                success: true,
                data: conversation
            })
        } catch (error) {
            logger.error('Get business conversation details error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch conversation details',
                error: error.message
            })
        }
    }

    // Send a message (inquiry or reply)
    static async sendMessage(req, res) {
        try {
            const { conversation_id, subject, message_body, attachments = [] } = req.body
            const businessId = req.business.public_id

            if (!message_body) {
                return res.status(400).json({
                    success: false,
                    message: 'Message body is required'
                })
            }

            let conversation

            if (conversation_id) {
                // Reply to existing conversation
                conversation = await Conversation.findOne({
                    where: {
                        conversation_id,
                        business_id: businessId
                    }
                })
                if (!conversation) {
                    return res.status(404).json({
                        success: false,
                        message: 'Conversation not found'
                    })
                }
            } else {
                // New conversation / inquiry
                if (!subject) {
                    return res.status(400).json({
                        success: false,
                        message: 'Subject is required for new inquiries'
                    })
                }

                conversation = await Conversation.create({
                    business_id: businessId,
                    // admin_id will be null initially until an admin picks it up or replies
                    // or we could assign a default system admin if we had one
                    subject,
                    status: 'open'
                })
            }

            // Create message
            const message = await Message.create({
                conversation_id: conversation.conversation_id,
                sender_type: 'business',
                sender_id: businessId,
                recipient_id: conversation.admin_id ? conversation.admin_id.toString() : 'system', // 'system' or null if no admin assigned yet
                subject: conversation_id ? null : subject,
                message_body,
                message_type: 'inquiry',
                status: 'sent',
                attachments
            })

            // Update conversation metadata
            await conversation.updateLastMessage()
            await conversation.incrementUnreadCount('admin')

            // Send Email Notification to Admin
            try {
                const isNotificationsEnabled = process.env.MESSAGE_NOTIFICATION_ENABLED !== 'false'
                let shouldNotify = isNotificationsEnabled

                const adminEmail = process.env.ADMIN_MESSAGE_RECIPIENT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_FROM
                let targetEmail = adminEmail
                let targetAdmin = null

                // If conversation has an assigned admin, try to notify them specifically
                if (conversation.admin_id) {
                    targetAdmin = await PlatformAdmin.findByPk(conversation.admin_id)
                    if (targetAdmin) {
                        targetEmail = targetAdmin.email
                        shouldNotify = shouldNotify && targetAdmin.canReceiveInquiryNotifications()
                    }
                } else {
                    // Check if default recipient is an admin and respect their preferences
                    targetAdmin = await PlatformAdmin.findOne({ where: { email: adminEmail } })
                    if (targetAdmin) {
                        shouldNotify = shouldNotify && targetAdmin.canReceiveInquiryNotifications()
                    }
                }

                if (shouldNotify) {
                    await EmailService.sendMessageNotification(
                        targetEmail,
                        {
                            businessName: req.business.business_name,
                            subject: subject || conversation.subject,
                            messageBody: message_body,
                            conversationUrl: `${process.env.ADMIN_FRONTEND_URL}/messages/${conversation.conversation_id}`,
                            businessEmail: req.business.email
                        },
                        {
                            notificationType: 'new-inquiry',
                            language: 'en' // Admin assumes English usually
                        }
                    )

                    // Update message status
                    await message.update({
                        email_notification_sent: true,
                        email_notification_sent_at: new Date(),
                        email_notification_status: 'sent'
                    })
                } else {
                    logger.info('Admin message notification skipped (disabled by preference or global toggle)', {
                        conversationId: conversation.conversation_id,
                        shouldNotify,
                        isNotificationsEnabled
                    })
                }

            } catch (emailError) {
                logger.error('Failed to send email notification to admin:', emailError)
                await message.update({
                    email_notification_status: 'failed'
                }).catch(err => logger.error('Failed to update message status:', err))
            }

            res.status(201).json({
                success: true,
                data: {
                    message,
                    conversation_id: conversation.conversation_id
                }
            })
        } catch (error) {
            logger.error('Send business message error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to send message',
                error: error.message
            })
        }
    }

    // Mark message as read
    static async markAsRead(req, res) {
        try {
            const { id } = req.params
            const businessId = req.business.public_id

            // Find message and check ownership via inclusion of conversation
            const message = await Message.findOne({
                where: { message_id: id },
                include: [{
                    model: Conversation,
                    as: 'conversation',
                    where: { business_id: businessId }
                }]
            })

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                })
            }

            // We only mark incoming (admin) messages as read
            if (message.sender_type === 'admin' && message.status !== 'read') {
                await message.markAsRead()
            }

            res.json({
                success: true,
                data: message
            })
        } catch (error) {
            logger.error('Mark business message as read error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to mark message as read',
                error: error.message
            })
        }
    }
}

export default BusinessMessagingController
