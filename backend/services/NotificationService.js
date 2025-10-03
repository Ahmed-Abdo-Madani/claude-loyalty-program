import { NotificationCampaign, NotificationLog, Customer } from '../models/index.js'
import logger from '../config/logger.js'
import { Op } from 'sequelize'

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
        notification_type: options.campaign_id ? 'campaign' : 'manual',
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
      // This would integrate with your email service (SendGrid, AWS SES, etc.)
      logger.info(`📧 Sending email to ${customer.email}`, { subject: message.subject })

      // Simulate email sending for now
      // In real implementation:
      // const emailService = new EmailService()
      // const result = await emailService.send({
      //   to: customer.email,
      //   subject: message.subject,
      //   html: message.html,
      //   text: message.text
      // })

      // Simulate successful send
      const externalId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      return {
        success: true,
        externalId,
        provider: 'sendgrid' // or whatever provider you use
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
          // This would be handled by CustomerSegmentationService
          // For now, return empty array
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

    if (criteria.last_activity_days) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - criteria.last_activity_days)
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
}

export default NotificationService