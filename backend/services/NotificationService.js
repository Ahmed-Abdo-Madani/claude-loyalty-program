import { NotificationCampaign, NotificationLog, Customer, Business } from '../models/index.js'
import logger from '../config/logger.js'
import { Op } from 'sequelize'
import { getLocalizedMessage } from '../middleware/languageMiddleware.js'

class NotificationService {
  constructor() {
    // Rate limiting for notifications (per customer)
    this.rateLimits = {
      email: { maxPerDay: 5, maxPerWeek: 15, maxPerMonth: 50 },
      sms: { maxPerDay: 3, maxPerWeek: 10, maxPerMonth: 30 },
      push: { maxPerDay: 10, maxPerWeek: 30, maxPerMonth: 100 },
      wallet: { maxPerDay: 3, maxPerWeek: 10, maxPerMonth: 25 }
    }
  }

  /**
   * Send a single notification to a customer
   */
  async sendNotification(customerId, businessId, message, channels = ['email'], options = {}) {
    try {
      logger.info(`📧 Sending notification to customer: ${customerId}`, { channels, message: message.subject })

      // Get customer details
      const customer = await Customer.findOne({
        where: { customer_id: customerId, business_id: businessId }
      })

      if (!customer) {
        throw new Error(`Customer ${customerId} not found`)
      }

      const results = []

      // Send notification through each channel
      for (const channel of channels) {
        if (!customer.canReceiveNotification(channel)) {
          logger.warn(`Customer ${customerId} cannot receive ${channel} notifications`)
          continue
        }

        // Check rate limits
        if (!(await this.checkRateLimit(customerId, channel))) {
          logger.warn(`Rate limit exceeded for customer ${customerId} on ${channel}`)
          continue
        }

        const result = await this.sendThroughChannel(customer, channel, message, options)
        results.push(result)
      }

      return {
        success: true,
        results,
        customer_id: customerId
      }

    } catch (error) {
      logger.error('Failed to send notification', { customerId, error: error.message })
      throw error
    }
  }

  /**
   * Send bulk notifications to multiple customers
   */
  async sendBulkNotifications(customerIds, businessId, message, channels = ['email'], options = {}) {
    try {
      logger.info(`📧 Sending bulk notifications to ${customerIds.length} customers`, { channels })

      const results = []
      const batchSize = 50 // Process in batches to avoid memory issues

      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize)
        const batchPromises = batch.map(customerId =>
          this.sendNotification(customerId, businessId, message, channels, options)
            .catch(error => ({ success: false, customer_id: customerId, error: error.message }))
        )

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Small delay between batches to prevent overwhelming external services
        if (i + batchSize < customerIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      logger.info(`Bulk notification completed: ${successful} successful, ${failed} failed`)

      return {
        success: true,
        total: customerIds.length,
        successful,
        failed,
        results
      }

    } catch (error) {
      logger.error('Failed to send bulk notifications', { error: error.message })
      throw error
    }
  }

  /**
   * Send quick notification to multiple customers
   * Used by the /api/notifications/send-quick route
   */
  async sendQuickNotification({ business_id, customer_ids, channels, subject, message, send_immediately = true }) {
    try {
      // Input validation
      if (!business_id || typeof business_id !== 'string' || business_id.trim() === '') {
        return {
          success: false,
          error: 'business_id is required and must be a non-empty string',
          total: 0,
          successful: 0,
          failed: 0
        }
      }

      if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
        return {
          success: false,
          error: 'customer_ids must be a non-empty array',
          total: 0,
          successful: 0,
          failed: 0
        }
      }

      if (!channels || !Array.isArray(channels) || channels.length === 0) {
        return {
          success: false,
          error: 'channels must be a non-empty array',
          total: 0,
          successful: 0,
          failed: customer_ids.length
        }
      }

      // Normalize and deduplicate channels
      const normalizedChannels = [...new Set(channels.map(ch => String(ch).toLowerCase().trim()))]

      // Validate channel types
      const validChannels = ['email', 'sms', 'push', 'wallet']
      const invalidChannels = normalizedChannels.filter(ch => !validChannels.includes(ch))
      if (invalidChannels.length > 0) {
        return {
          success: false,
          error: `Invalid channels: ${invalidChannels.join(', ')}. Valid channels are: ${validChannels.join(', ')}`,
          total: 0,
          successful: 0,
          failed: customer_ids.length
        }
      }

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return {
          success: false,
          error: 'message is required and must be a non-empty string',
          total: 0,
          successful: 0,
          failed: customer_ids.length
        }
      }

      logger.info('📧 Sending quick notification', {
        business_id,
        customer_count: customer_ids.length,
        channels: normalizedChannels
      })

      // Customer verification - find active customers that belong to the business
      const customers = await Customer.findAll({
        where: {
          customer_id: { [Op.in]: customer_ids },
          business_id: business_id,
          status: 'active'
        },
        attributes: ['customer_id']
      })

      if (customers.length === 0) {
        logger.warn('No valid active customers found for quick notification', {
          business_id,
          requested_count: customer_ids.length
        })
        return {
          success: false,
          error: 'No valid active customers found',
          total: 0,
          successful: 0,
          failed: customer_ids.length
        }
      }

      // Log if some customers were filtered out
      if (customers.length < customer_ids.length) {
        logger.warn('Some customer IDs were filtered out (inactive or not found)', {
          business_id,
          requested: customer_ids.length,
          valid: customers.length,
          filtered_out: customer_ids.length - customers.length
        })
      }

      logger.info('Verified customers for quick notification', {
        requested: customer_ids.length,
        valid: customers.length
      })

      // Prepare message object with structure expected by sendBulkNotifications
      const messageObject = {
        subject: subject || 'Notification',
        content: message,
        body: message
      }

      // Extract valid customer IDs
      const validCustomerIds = customers.map(c => c.customer_id)

      // Delegate to sendBulkNotifications with proper options
      const result = await this.sendBulkNotifications(
        validCustomerIds,
        business_id,
        messageObject,
        normalizedChannels,
        {
          notification_type: 'quick',
          send_immediately
        }
      )

      // Add metadata to response
      const response = {
        ...result,
        notification_type: 'quick',
        channels: normalizedChannels,
        timestamp: new Date()
      }

      logger.info('Quick notification completed', {
        business_id,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        channels: normalizedChannels
      })

      return response

    } catch (error) {
      logger.error('Failed to send quick notification', {
        business_id,
        customer_count: customer_ids ? customer_ids.length : 0,
        channels,
        error: error.message,
        stack: error.stack
      })

      return {
        success: false,
        error: 'Failed to send quick notification',
        message: error.message,
        total: customer_ids ? customer_ids.length : 0,
        successful: 0,
        failed: customer_ids ? customer_ids.length : 0
      }
    }
  }

  /**
   * Send a campaign to targeted customers
   */
  async sendCampaign(campaignId) {
    try {
      logger.info(`🚀 Starting campaign: ${campaignId}`)

      const campaign = await NotificationCampaign.findOne({
        where: { campaign_id: campaignId }
      })

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`)
      }

      // Check if campaign is scheduled for later
      if (campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date() && !campaign.send_immediately) {
        logger.info(`Campaign ${campaignId} is scheduled for later`, { scheduled_at: campaign.scheduled_at })
        return { success: true, message: 'Campaign scheduled for later', sent: 0 }
      }

      if (!campaign.canSend()) {
        throw new Error(`Campaign ${campaignId} cannot be sent (status: ${campaign.status})`)
      }

      // Mark campaign as started
      await campaign.markAsStarted()

      // Get target customers
      const customers = await this.getTargetCustomers(campaign)
      logger.info(`Campaign ${campaignId} targeting ${customers.length} customers`)

      if (customers.length === 0) {
        await campaign.markAsCompleted()
        return { success: true, message: 'No target customers found', sent: 0 }
      }

      // Update campaign with recipient count
      campaign.total_recipients = customers.length
      await campaign.save()

      // Send notifications
      const customerIds = customers.map(c => c.customer_id)
      const results = await this.sendBulkNotifications(
        customerIds,
        campaign.business_id,
        campaign.message_template,
        campaign.channels,
        {
          campaign_id: campaignId,
          ab_variant: campaign.ab_test_variant
        }
      )

      // Update campaign statistics
      await campaign.updateStats({
        sent: results.successful,
        failed: results.failed
      })

      // Mark as completed if all sent
      if (results.failed === 0) {
        await campaign.markAsCompleted()
      }

      logger.info(`Campaign ${campaignId} completed: ${results.successful} sent, ${results.failed} failed`)

      return {
        success: true,
        campaign_id: campaignId,
        total_recipients: customers.length,
        sent: results.successful,
        failed: results.failed
      }

    } catch (error) {
      logger.error(`Campaign ${campaignId} failed`, { error: error.message })

      // Mark campaign as failed
      try {
        const campaign = await NotificationCampaign.findOne({
          where: { campaign_id: campaignId }
        })
        if (campaign) {
          campaign.status = 'error'
          await campaign.save()
        }
      } catch (updateError) {
        logger.error('Failed to update campaign status', updateError)
      }

      throw error
    }
  }

  /**
   * Send notification through specific channel
   */
  async sendThroughChannel(customer, channel, message, options = {}) {
    try {
      // Create notification log entry
      const logEntry = await NotificationLog.create({
        campaign_id: options.campaign_id || null,
        customer_id: customer.customer_id,
        business_id: customer.business_id,
        notification_type: options.notification_type || (options.campaign_id ? 'campaign' : 'manual'),
        channel,
        subject: message.subject,
        message_content: message.content || message.body,
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        recipient_name: customer.name,
        ab_test_variant: options.ab_variant || null,
        personalization_data: this.getPersonalizationData(customer, message)
      })

      let success = false
      let externalId = null
      let provider = null

      // Send through appropriate channel
      switch (channel) {
        case 'email':
          ({ success, externalId, provider } = await this.sendEmail(customer, message, options))
          break
        case 'sms':
          ({ success, externalId, provider } = await this.sendSMS(customer, message, options))
          break
        case 'push':
          ({ success, externalId, provider } = await this.sendPushNotification(customer, message, options))
          break
        case 'wallet':
          ({ success, externalId, provider } = await this.sendWalletNotification(customer, message, options))
          break
        default:
          throw new Error(`Unsupported channel: ${channel}`)
      }

      if (success) {
        await logEntry.markAsSent(externalId, provider)
      } else {
        await logEntry.markAsFailed('Failed to send through external provider')
      }

      return {
        success,
        channel,
        log_id: logEntry.id,
        external_id: externalId
      }

    } catch (error) {
      logger.error(`Failed to send through ${channel}`, { error: error.message })
      throw error
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(customer, message, options = {}) {
    try {
      logger.info(`📧 Sending email to ${customer.email}`, { subject: message.subject })

      // Extract attachment if provided
      const { attachments = [] } = options

      // In real implementation, integrate with email service:
      // const emailService = new EmailService() // SendGrid, AWS SES, etc.
      // const result = await emailService.send({
      //   to: customer.email,
      //   subject: message.subject,
      //   html: message.html,
      //   text: message.text,
      //   attachments: attachments // [{ filename, content, contentType }]
      // })

      // Simulate successful send
      const externalId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Log attachment info if present
      if (attachments.length > 0) {
        logger.info(`📎 Email includes ${attachments.length} attachment(s)`, {
          filenames: attachments.map(a => a.filename)
        })
      }

      return {
        success: true,
        externalId,
        provider: 'sendgrid'
      }

    } catch (error) {
      logger.error('Email sending failed', { error: error.message })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(customer, message, options = {}) {
    try {
      logger.info(`📱 Sending SMS to ${customer.phone}`, { message: message.content?.substring(0, 50) })

      // This would integrate with your SMS service (Twilio, AWS SNS, etc.)
      // Simulate SMS sending for now
      const externalId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return {
        success: true,
        externalId,
        provider: 'twilio'
      }

    } catch (error) {
      logger.error('SMS sending failed', { error: error.message })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(customer, message, options = {}) {
    try {
      logger.info(`🔔 Sending push notification to ${customer.customer_id}`)

      // This would integrate with your push notification service
      const externalId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return {
        success: true,
        externalId,
        provider: 'fcm'
      }

    } catch (error) {
      logger.error('Push notification failed', { error: error.message })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send wallet notification (leverage existing Google Wallet integration)
   */
  async sendWalletNotification(customer, message, options = {}) {
    try {
      logger.info(`💳 Sending wallet notification to ${customer.customer_id}`)

      // This would integrate with your existing wallet notification system
      // from RealGoogleWalletController
      const externalId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return {
        success: true,
        externalId,
        provider: 'google_wallet'
      }

    } catch (error) {
      logger.error('Wallet notification failed', { error: error.message })
      return { success: false, error: error.message }
    }
  }

  /**
   * Check rate limits for customer and channel
   */
  async checkRateLimit(customerId, channel) {
    try {
      const limits = this.rateLimits[channel]
      if (!limits) return true

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Count recent notifications
      const [dailyCount, weeklyCount, monthlyCount] = await Promise.all([
        NotificationLog.count({
          where: {
            customer_id: customerId,
            channel,
            created_at: { [Op.gte]: today }
          }
        }),
        NotificationLog.count({
          where: {
            customer_id: customerId,
            channel,
            created_at: { [Op.gte]: weekStart }
          }
        }),
        NotificationLog.count({
          where: {
            customer_id: customerId,
            channel,
            created_at: { [Op.gte]: monthStart }
          }
        })
      ])

      return dailyCount < limits.maxPerDay &&
             weeklyCount < limits.maxPerWeek &&
             monthlyCount < limits.maxPerMonth

    } catch (error) {
      logger.error('Rate limit check failed', { error: error.message })
      return true // Allow on error to avoid blocking legitimate notifications
    }
  }

  /**
   * Get target customers for a campaign
   */
  async getTargetCustomers(campaign) {
    try {
      let whereClause = { business_id: campaign.business_id }

      switch (campaign.target_type) {
        case 'all_customers':
          // No additional filters
          break

        case 'individual':
          if (campaign.target_customer_ids && campaign.target_customer_ids.length > 0) {
            whereClause.customer_id = { [Op.in]: campaign.target_customer_ids }
          }
          break

        case 'segment':
          // Fetch customers from segment using CustomerSegmentationService
          if (campaign.target_segment_id) {
            const CustomerSegmentationService = (await import('./CustomerSegmentationService.js')).default
            const segmentCustomers = await CustomerSegmentationService.getSegmentCustomers(campaign.target_segment_id)
            return segmentCustomers
          }
          logger.warn('Segment targeting requested but no target_segment_id provided', { campaign_id: campaign.campaign_id })
          return []

        case 'custom_filter':
          // Apply custom criteria
          if (campaign.target_criteria) {
            whereClause = { ...whereClause, ...this.buildCriteriaFilter(campaign.target_criteria) }
          }
          break
      }

      const customers = await Customer.findAll({
        where: whereClause,
        attributes: ['customer_id', 'business_id', 'name', 'email', 'phone', 'preferences']
      })

      return customers

    } catch (error) {
      logger.error('Failed to get target customers', { error: error.message })
      return []
    }
  }

  /**
   * Build sequelize filter from campaign criteria
   */
  buildCriteriaFilter(criteria) {
    const filter = {}

    if (criteria.status) {
      filter.status = { [Op.in]: Array.isArray(criteria.status) ? criteria.status : [criteria.status] }
    }

    if (criteria.lifecycle_stage) {
      filter.lifecycle_stage = { [Op.in]: Array.isArray(criteria.lifecycle_stage) ? criteria.lifecycle_stage : [criteria.lifecycle_stage] }
    }

    // CAUTION: Semantics for "inactive for N days"
    // If intent is "inactive for N days", use Op.lte (last_activity_date <= cutoff)
    // Current implementation uses Op.gte (active within N days)
    // TODO: When enabling custom filter UI, align field names with backend keys
    // and add server-side validation for criteria structure
    if (criteria.last_activity_days) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - criteria.last_activity_days)
      // Current: finds customers active within N days (last_activity_date >= cutoff)
      // For "inactive for N days": use { [Op.lte]: cutoffDate }
      filter.last_activity_date = { [Op.gte]: cutoffDate }
    }

    return filter
  }

  /**
   * Get personalization data for message templates
   */
  getPersonalizationData(customer, message) {
    return {
      customer_name: customer.name || 'Valued Customer',
      customer_id: customer.customer_id,
      engagement_score: customer.getEngagementScore(),
      total_visits: customer.total_visits,
      total_rewards: customer.total_rewards_claimed,
      preferred_language: customer.preferred_language || 'en'
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(businessId, dateRange = null) {
    try {
      const whereClause = { business_id: businessId }

      if (dateRange) {
        whereClause.created_at = {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }

      const stats = await NotificationLog.getDeliveryStats(null, businessId, dateRange)

      return {
        success: true,
        stats,
        business_id: businessId
      }

    } catch (error) {
      logger.error('Failed to get notification analytics', { error: error.message })
      throw error
    }
  }

  /**
   * Handle webhook updates from external providers
   */
  async handleDeliveryWebhook(provider, data) {
    try {
      logger.info(`📬 Processing ${provider} webhook`, { messageId: data.messageId })

      const logEntry = await NotificationLog.findOne({
        where: { external_id: data.messageId }
      })

      if (!logEntry) {
        logger.warn(`Notification log not found for external ID: ${data.messageId}`)
        return { success: false, error: 'Log entry not found' }
      }

      // Update based on webhook data
      switch (data.status) {
        case 'delivered':
          await logEntry.markAsDelivered(new Date(data.timestamp))
          break
        case 'opened':
          await logEntry.markAsOpened(new Date(data.timestamp), data.device, data.userAgent)
          break
        case 'clicked':
          await logEntry.markAsClicked(data.clickData)
          break
        case 'bounced':
        case 'failed':
          await logEntry.markAsFailed(data.reason, data.errorCode)
          break
      }

      return { success: true, log_id: logEntry.id }

    } catch (error) {
      logger.error('Webhook processing failed', { error: error.message })
      throw error
    }
  }

  /**
   * Track campaign conversion
   * @param {string} campaignId - Campaign ID
   * @param {string} customerId - Customer ID
   * @param {object} conversionData - Additional conversion data
   */
  async trackCampaignConversion(campaignId, customerId, conversionData = {}) {
    try {
      logger.info('Tracking campaign conversion', { campaign_id: campaignId, customer_id: customerId })

      // Find NotificationLog entry for campaign and customer
      const logEntry = await NotificationLog.findOne({
        where: {
          campaign_id: campaignId,
          customer_id: customerId
        }
      })

      if (!logEntry) {
        logger.warn('No notification log found for campaign conversion', { campaign_id: campaignId, customer_id: customerId })
        return { success: false, message: 'Notification log not found' }
      }

      // Mark as converted
      await logEntry.markAsConverted(conversionData)

      // Update campaign stats
      const campaign = await NotificationCampaign.findOne({
        where: { campaign_id: campaignId }
      })

      if (campaign) {
        campaign.total_converted += 1
        await campaign.save()

        // If campaign has linked_offer_id, record offer conversion
        if (campaign.linked_offer_id) {
          logger.info('Campaign conversion linked to offer', { 
            campaign_id: campaignId, 
            offer_id: campaign.linked_offer_id 
          })
        }
      }

      return { success: true }

    } catch (error) {
      logger.error('Failed to track campaign conversion', { error: error.message })
      throw error
    }
  }

  /**
   * Send payment failure notification to business owner
   * @param {string} businessId - Business ID
   * @param {object} paymentDetails - Payment details (amount, currency, payment_method_last4, etc.)
   * @param {object} retryInfo - Retry information (retry_count, next_retry_date, grace_period_end)
   */
  async sendPaymentFailureNotification(businessId, paymentDetails, retryInfo) {
    try {
      logger.info('📧 Sending payment failure notification', { businessId, retryCount: retryInfo.retry_count })

      // Fetch Business record to get owner email/phone
      const business = await Business.findOne({
        where: { public_id: businessId }
      })

      if (!business) {
        throw new Error(`Business ${businessId} not found`)
      }

      // Determine notification urgency based on retry count
      const isCritical = retryInfo.retry_count >= 3
      const locale = business.preferred_language || 'ar'

      // Build localized message
      let message
      if (isCritical || retryInfo.grace_period_end) {
        // Final attempt failed - grace period started
        message = {
          subject: getLocalizedMessage('payment.failureNotification.subject', locale),
          body: getLocalizedMessage('payment.failureNotification.bodyFinal', locale, {
            businessName: business.business_name,
            amount: paymentDetails.amount,
            currency: paymentDetails.currency,
            planType: paymentDetails.plan_type,
            gracePeriodEnd: retryInfo.grace_period_end ? new Date(retryInfo.grace_period_end).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : '',
            reactivationUrl: `${process.env.BASE_URL || 'https://madna.me'}/subscription/suspended`
          })
        }
      } else {
        // Regular retry notification
        message = {
          subject: getLocalizedMessage('payment.failureNotification.subject', locale),
          body: getLocalizedMessage('payment.failureNotification.body', locale, {
            businessName: business.business_name,
            amount: paymentDetails.amount,
            currency: paymentDetails.currency,
            planType: paymentDetails.plan_type,
            retryCount: retryInfo.retry_count,
            nextRetryDate: retryInfo.next_retry_date ? new Date(retryInfo.next_retry_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : ''
          })
        }
      }

      // Send through email and SMS for maximum reach
      const channels = ['email', 'sms']
      
      // Simulate sending (reuse existing channel logic)
      const results = []
      for (const channel of channels) {
        try {
          let result
          if (channel === 'email') {
            result = await this.sendBusinessEmail(business, message)
          } else if (channel === 'sms') {
            result = await this.sendBusinessSMS(business, message)
          }
          results.push({ channel, success: result.success })
        } catch (channelError) {
          logger.warn(`Failed to send payment failure notification via ${channel}`, {
            businessId,
            error: channelError.message
          })
          results.push({ channel, success: false, error: channelError.message })
        }
      }

      logger.info('Payment failure notification sent', {
        businessId,
        retryCount: retryInfo.retry_count,
        channels: results.map(r => r.channel),
        success: results.some(r => r.success)
      })

      return { success: true, results }

    } catch (error) {
      logger.error('Failed to send payment failure notification', {
        businessId,
        error: error.message,
        stack: error.stack
      })
      // Non-blocking: return success to not disrupt payment processing
      return { success: true, error: error.message }
    }
  }

  /**
   * Send grace period notification to business owner
   * @param {string} businessId - Business ID
   * @param {Date} gracePeriodEnd - Grace period end date
   */
  async sendGracePeriodNotification(businessId, gracePeriodEnd) {
    try {
      logger.info('📧 Sending grace period notification', { businessId, gracePeriodEnd })

      const business = await Business.findOne({
        where: { public_id: businessId }
      })

      if (!business) {
        throw new Error(`Business ${businessId} not found`)
      }

      const locale = business.preferred_language || 'ar'

      const message = {
        subject: getLocalizedMessage('payment.gracePeriodNotification.subject', locale),
        body: getLocalizedMessage('payment.gracePeriodNotification.body', locale, {
          businessName: business.business_name,
          gracePeriodEnd: new Date(gracePeriodEnd).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
          reactivationUrl: `${process.env.BASE_URL || 'https://madna.me'}/subscription/suspended`
        })
      }

      // Send via email and SMS
      const results = []
      const channels = ['email', 'sms']
      
      for (const channel of channels) {
        try {
          let result
          if (channel === 'email') {
            result = await this.sendBusinessEmail(business, message)
          } else if (channel === 'sms') {
            result = await this.sendBusinessSMS(business, message)
          }
          results.push({ channel, success: result.success })
        } catch (channelError) {
          logger.warn(`Failed to send grace period notification via ${channel}`, {
            businessId,
            error: channelError.message
          })
          results.push({ channel, success: false })
        }
      }

      logger.info('Grace period notification sent', { businessId, channels: results.map(r => r.channel) })

      return { success: true, results }

    } catch (error) {
      logger.error('Failed to send grace period notification', {
        businessId,
        error: error.message
      })
      return { success: true, error: error.message }
    }
  }

  /**
   * Send account suspension notification to business owner
   * @param {string} businessId - Business ID
   * @param {string} suspensionReason - Reason for suspension
   */
  async sendAccountSuspensionNotification(businessId, suspensionReason) {
    try {
      logger.info('📧 Sending account suspension notification', { businessId })

      const business = await Business.findOne({
        where: { public_id: businessId }
      })

      if (!business) {
        throw new Error(`Business ${businessId} not found`)
      }

      const locale = business.preferred_language || 'ar'

      const message = {
        subject: getLocalizedMessage('payment.suspensionNotification.subject', locale),
        body: getLocalizedMessage('payment.suspensionNotification.body', locale, {
          businessName: business.business_name,
          suspensionReason: suspensionReason,
          suspensionDate: new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
          reactivationUrl: `${process.env.BASE_URL || 'https://madna.me'}/subscription/suspended`
        })
      }

      // Email only (SMS too brief for detailed instructions)
      const result = await this.sendBusinessEmail(business, message)

      logger.info('Account suspension notification sent', { businessId, success: result.success })

      return { success: true, result }

    } catch (error) {
      logger.error('Failed to send suspension notification', {
        businessId,
        error: error.message
      })
      return { success: true, error: error.message }
    }
  }

  /**
   * Send reactivation success notification to business owner
   * @param {string} businessId - Business ID
   * @param {object} newPlanDetails - New subscription details
   */
  async sendReactivationSuccessNotification(businessId, newPlanDetails) {
    try {
      logger.info('📧 Sending reactivation success notification', { businessId })

      const business = await Business.findOne({
        where: { public_id: businessId }
      })

      if (!business) {
        throw new Error(`Business ${businessId} not found`)
      }

      const locale = business.preferred_language || 'ar'

      const message = {
        subject: getLocalizedMessage('payment.reactivationSuccessNotification.subject', locale),
        body: getLocalizedMessage('payment.reactivationSuccessNotification.body', locale, {
          businessName: business.business_name,
          planType: newPlanDetails.plan_type,
          amount: newPlanDetails.amount,
          currency: newPlanDetails.currency || 'SAR',
          nextBillingDate: newPlanDetails.next_billing_date ? new Date(newPlanDetails.next_billing_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : ''
        })
      }

      // Send via email and SMS for confirmation
      const results = []
      const channels = ['email', 'sms']
      
      for (const channel of channels) {
        try {
          let result
          if (channel === 'email') {
            result = await this.sendBusinessEmail(business, message)
          } else if (channel === 'sms') {
            result = await this.sendBusinessSMS(business, message)
          }
          results.push({ channel, success: result.success })
        } catch (channelError) {
          logger.warn(`Failed to send reactivation success notification via ${channel}`, {
            businessId,
            error: channelError.message
          })
          results.push({ channel, success: false })
        }
      }

      logger.info('Reactivation success notification sent', { businessId, channels: results.map(r => r.channel) })

      return { success: true, results }

    } catch (error) {
      logger.error('Failed to send reactivation notification', {
        businessId,
        error: error.message
      })
      return { success: true, error: error.message }
    }
  }

  /**
   * Send email to business owner
   * @param {object} business - Business record
   * @param {object} message - Message object with subject and body
   */
  async sendBusinessEmail(business, message) {
    try {
      logger.info(`📧 Sending business email to ${business.email}`, { subject: message.subject })

      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      // For now, simulate successful send
      const externalId = `business_email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return {
        success: true,
        externalId,
        provider: 'sendgrid'
      }

    } catch (error) {
      logger.error('Business email sending failed', { error: error.message })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send SMS to business owner
   * @param {object} business - Business record
   * @param {object} message - Message object with subject and body
   */
  async sendBusinessSMS(business, message) {
    try {
      logger.info(`📱 Sending business SMS to ${business.phone}`, { message: message.body?.substring(0, 50) })

      // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
      // For now, simulate successful send
      const externalId = `business_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return {
        success: true,
        externalId,
        provider: 'twilio'
      }

    } catch (error) {
      logger.error('Business SMS sending failed', { error: error.message })
      return { success: false, error: error.message }
    }
  }
}

export default NotificationService