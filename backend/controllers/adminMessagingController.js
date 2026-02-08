import { Conversation, Message, MessageTemplate, Business, PlatformAdmin } from '../models/index.js'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import EmailService from '../services/EmailService.js'
import logger from '../config/logger.js'
import crypto from 'crypto'

class AdminMessagingController {
    // Get all conversations with pagination, filtering, and search
    static async getConversations(req, res) {
        try {
            const { status, business_id, search, limit = 20, offset = 0, sort_by = 'recent' } = req.query

            const where = {}

            // Filter by status
            if (status && ['open', 'closed', 'archived'].includes(status)) {
                where.status = status
            }

            // Filter by business
            if (business_id) {
                where.business_id = business_id
            }

            // Search by subject or business name
            if (search) {
                where[Op.or] = [
                    { subject: { [Op.iLike]: `%${search}%` } },
                    { '$business.business_name$': { [Op.iLike]: `%${search}%` } }
                ]
            }

            // Determine sort order
            let order = [['last_message_at', 'DESC']]
            if (sort_by === 'unread') {
                order = [['unread_count_admin', 'DESC'], ['last_message_at', 'DESC']]
            } else if (sort_by === 'oldest') {
                order = [['created_at', 'ASC']]
            }

            const include = [{
                model: Business,
                as: 'business',
                attributes: ['public_id', 'business_name', 'email', 'logo_url'],
                // If we are searching by business name, we need the join to happen so the where clause works
                // However, with Op.OR between subject and business name, if we make it required, 
                // it acts as an INNER JOIN. Which is fine, every conversation MUST have a business.
                required: !!search
            }]

            const { rows: conversations, count: total } = await Conversation.findAndCountAll({
                where,
                include,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order
            })

            // Add last message preview (optional, can be done with a separate query or huge include)
            // For performance, we might want to fetch just the last message for each conversation
            // But 'last_message_at' gives us the time. The text preview might be needed.
            // Let's fetch the actual last message content for these conversations
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
            logger.error('Get conversations error:', error)
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

            const conversation = await Conversation.findOne({
                where: { conversation_id: id },
                include: [
                    {
                        model: Business,
                        as: 'business',
                        attributes: ['public_id', 'business_name', 'email', 'phone', 'logo_url']
                    },
                    {
                        model: Message,
                        as: 'messages',
                        // Order is properly handled in the main query usually, but separate order here
                        // require separate query or proper ordering in include
                        /*
                        limit: 50, // Maybe limit messages?
                        order: [['created_at', 'ASC']] 
                        */
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

            // Mark admin messages as read (messages sent BY business TO admin)
            const unreadMessages = conversation.messages.filter(
                m => m.sender_type === 'business' && m.status !== 'read'
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

            // Reset admin unread count
            if (conversation.unread_count_admin > 0) {
                await conversation.resetUnreadCount('admin')
            }

            res.json({
                success: true,
                data: conversation
            })
        } catch (error) {
            logger.error('Get conversation details error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch conversation details',
                error: error.message
            })
        }
    }

    // Send a message (reply or new conversation)
    static async sendMessage(req, res) {
        try {
            const { business_id, conversation_id, subject, message_body, message_type = 'response', attachments = [] } = req.body
            const adminId = req.admin.adminId

            if (!message_body) {
                return res.status(400).json({
                    success: false,
                    message: 'Message body is required'
                })
            }

            let conversation

            if (conversation_id) {
                // Reply to existing conversation
                conversation = await Conversation.findOne({ where: { conversation_id } })
                if (!conversation) {
                    return res.status(404).json({
                        success: false,
                        message: 'Conversation not found'
                    })
                }
            } else {
                // New conversation
                if (!business_id || !subject) {
                    return res.status(400).json({
                        success: false,
                        message: 'Business ID and Subject are required for new conversations'
                    })
                }

                conversation = await Conversation.create({
                    business_id,
                    admin_id: adminId, // Assign current admin as owner/starter
                    subject,
                    status: 'open'
                })
            }

            // Create message
            const message = await Message.create({
                conversation_id: conversation.conversation_id,
                sender_type: 'admin',
                sender_id: adminId.toString(),
                recipient_id: conversation.business_id,
                subject: conversation_id ? null : subject, // Only store subject on first message if needed, or null
                message_body,
                message_type,
                status: 'sent',
                attachments
            })

            // Update conversation metadata
            await conversation.updateLastMessage()
            await conversation.incrementUnreadCount('business')

            // Send Email Notification
            try {
                const business = await Business.findOne({ where: { public_id: conversation.business_id } })

                // Check if business wants notifications
                if (business && business.email && business.canReceiveMessageNotifications && business.canReceiveMessageNotifications()) {
                    const emailSubject = subject || conversation.subject || 'New message from platform admin'

                    // Generate unsubscribe token
                    const unsubscribeToken = crypto.createHash('sha256').update(business.public_id + Date.now().toString()).digest('hex');

                    await EmailService.sendMessageNotification(
                        business.email,
                        {
                            businessName: business.business_name,
                            subject: emailSubject,
                            messageBody: message_body,
                            conversationUrl: `${process.env.FRONTEND_URL}/dashboard/messages/${conversation.conversation_id}`,
                            adminName: req.admin.full_name || 'Admin'
                        },
                        {
                            notificationType: 'new-message',
                            language: business.preferred_language || 'ar',
                            unsubscribeToken
                        }
                    );

                    // Update message with notification status
                    await message.update({
                        email_notification_sent: true,
                        email_notification_sent_at: new Date(),
                        email_notification_status: 'sent',
                        unsubscribe_token: unsubscribeToken
                    });
                }
            } catch (emailError) {
                logger.error('Failed to send email notification to business:', emailError)
                // Don't fail the request, just log it
                await message.update({
                    email_notification_status: 'failed'
                }).catch(err => logger.error('Failed to update message status:', err));
            }

            res.status(201).json({
                success: true,
                data: {
                    message,
                    conversation_id: conversation.conversation_id
                }
            })
        } catch (error) {
            logger.error('Send message error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to send message',
                error: error.message
            })
        }
    }

    // Mark message as read (individual message)
    static async markAsRead(req, res) {
        try {
            const { id } = req.params
            // For admin, we should check if the message was sent by business
            const message = await Message.findOne({ where: { message_id: id } })

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                })
            }

            // We technically only mark incoming messages as read
            if (message.sender_type === 'business' && message.status !== 'read') {
                await message.markAsRead()
                // Optionally decrement unread count on conversation
                // But usually we reset count when opening conversation. 
                // If we mark single message, we might want to recalc count.
                // For simplicity, let's assume 'getConversationById' resets count.
                // This endpoint might be used for instant updates if UI updates optimistically.
            }

            res.json({
                success: true,
                data: message
            })
        } catch (error) {
            logger.error('Mark as read error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to mark message as read',
                error: error.message
            })
        }
    }

    // Create Message Template
    static async createTemplate(req, res) {
        try {
            const { template_name, category, subject_template, body_template, variables = {} } = req.body
            const adminId = req.admin.adminId

            if (!template_name || !category || !body_template) {
                return res.status(400).json({
                    success: false,
                    message: 'Template name, category, and body are required'
                })
            }

            const template = await MessageTemplate.create({
                template_name,
                category,
                subject_template: subject_template || '',
                body_template,
                variables,
                created_by: adminId,
                is_active: true
            })

            res.status(201).json({
                success: true,
                data: template
            })
        } catch (error) {
            logger.error('Create template error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create template',
                error: error.message
            })
        }
    }

    // Get Templates
    static async getTemplates(req, res) {
        try {
            const { category, limit = 50, offset = 0 } = req.query
            const where = { is_active: true }

            if (category) {
                where.category = category
            }

            const { rows: templates, count: total } = await MessageTemplate.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['usage_count', 'DESC'], ['template_name', 'ASC']]
            })

            res.json({
                success: true,
                data: {
                    templates,
                    pagination: {
                        total,
                        limit: parseInt(limit),
                        offset: parseInt(offset)
                    }
                }
            })
        } catch (error) {
            logger.error('Get templates error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch templates',
                error: error.message
            })
        }
    }

    // Get unread count
    static async getUnreadCount(req, res) {
        try {
            // Sum all unread_count_admin across all conversations
            const result = await Conversation.findOne({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('unread_count_admin')), 'total_unread']
                ],
                raw: true
            })

            const unreadCount = parseInt(result?.total_unread || 0)

            res.json({
                success: true,
                data: {
                    unread_count: unreadCount
                }
            })
        } catch (error) {
            logger.error('Get unread count error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch unread count',
                error: error.message
            })
        }
    }

    // Update Conversation Status
    static async updateConversationStatus(req, res) {
        try {
            const { id } = req.params
            const { status } = req.body // open, closed, archived

            if (!['open', 'closed', 'archived'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                })
            }

            const conversation = await Conversation.findOne({ where: { conversation_id: id } })

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found'
                })
            }

            // Use update method
            conversation.status = status
            await conversation.save()

            res.json({
                success: true,
                data: conversation,
                message: `Conversation status updated to ${status}`
            })
        } catch (error) {
            logger.error('Update conversation status error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update conversation status',
                error: error.message
            })
        }
    }
}

export default AdminMessagingController
