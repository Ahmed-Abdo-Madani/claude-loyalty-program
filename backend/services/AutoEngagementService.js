import { Op } from 'sequelize';
import { AutoEngagementConfig, Customer, Business, WalletPass, NotificationLog } from '../models/index.js';
import WalletNotificationService from './WalletNotificationService.js';
import logger from '../config/logger.js';

class AutoEngagementService {
  /**
   * Run daily auto-engagement check for all enabled businesses
   * Called by cron job
   */
  static async runDailyCheck() {
    logger.info('🔔 Starting daily auto-engagement check');
    
    try {
      // Get all enabled configs that can run today
      const configs = await AutoEngagementConfig.findAll({
        where: {
          enabled: true
        },
        include: [{
          model: Business,
          as: 'business',
          attributes: ['public_id', 'business_name', 'business_name_ar']
        }]
      });

      logger.info(`Found ${configs.length} enabled auto-engagement configs`);

      let totalProcessed = 0;
      let totalNotified = 0;
      let totalFailed = 0;

      for (const config of configs) {
        try {
          // Check if this config can run (not already run today, not currently running)
          if (!config.canRun()) {
            logger.info(`Skipping config ${config.config_id} - already ran today or currently running`);
            continue;
          }

          totalProcessed++;
          const notified = await this.processBusinessAutoEngagement(config);
          totalNotified += notified;

          logger.info(`✅ Processed auto-engagement for business ${config.business_id}: ${notified} customers notified`);
        } catch (error) {
          totalFailed++;
          logger.error(`❌ Failed to process auto-engagement for business ${config.business_id}`, {
            error: error.message,
            stack: error.stack
          });
        }
      }

      logger.info(`🎉 Daily auto-engagement check completed`, {
        totalConfigs: configs.length,
        totalProcessed,
        totalNotified,
        totalFailed
      });

      return {
        totalConfigs: configs.length,
        totalProcessed,
        totalNotified,
        totalFailed
      };

    } catch (error) {
      logger.error('❌ Daily auto-engagement check failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process auto-engagement for a specific business configuration
   * @param {AutoEngagementConfig} config - The auto-engagement configuration
   * @returns {number} Number of customers notified
   */
  static async processBusinessAutoEngagement(config) {
    try {
      // Mark as running
      await config.markAsRunning();

      // Get inactive customers
      const inactiveCustomers = await this.getInactiveCustomers(
        config.business_id,
        config.inactivity_days
      );

      logger.info(`Found ${inactiveCustomers.length} inactive customers for business ${config.business_id}`);

      if (inactiveCustomers.length === 0) {
        await config.markAsCompleted(0);
        return 0;
      }

      // Deduplication: Exclude customers who received re-engagement notifications within last 7 days
      const coolingPeriodDays = 7;
      const coolingCutoff = new Date();
      coolingCutoff.setDate(coolingCutoff.getDate() - coolingPeriodDays);

      const recentlyNotified = await NotificationLog.findAll({
        where: {
          business_id: config.business_id,
          notification_type: 'auto_reengagement',
          sent_at: {
            [Op.gte]: coolingCutoff
          }
        },
        attributes: ['customer_id']
      });

      const recentlyNotifiedIds = new Set(recentlyNotified.map(log => log.customer_id));
      const customersToNotify = inactiveCustomers.filter(
        customer => !recentlyNotifiedIds.has(customer.customer_id)
      );

      logger.info(`After deduplication: ${customersToNotify.length} customers to notify (excluded ${recentlyNotifiedIds.size} recently notified)`);

      if (customersToNotify.length === 0) {
        await config.markAsCompleted(0);
        return 0;
      }

      // Get message template
      const template = config.getMessageTemplate();

      // Send re-engagement notifications
      let notifiedCount = 0;
      let failedCount = 0;
      for (const customer of customersToNotify) {
        try {
          const success = await this.sendReengagementToCustomer(customer, config, template);
          if (success) {
            notifiedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          failedCount++;
          logger.error(`Failed to send re-engagement to customer ${customer.customer_id}`, {
            error: error.message
          });
        }
      }

      logger.info(`Auto-engagement completed for business ${config.business_id}`, {
        notifiedCount,
        failedCount,
        totalAttempted: customersToNotify.length
      });

      // Mark as completed with count
      await config.markAsCompleted(notifiedCount);

      return notifiedCount;

    } catch (error) {
      await config.markAsFailed(error);
      throw error;
    }
  }

  /**
   * Get inactive customers for a business
   * @param {string} businessId - The business secure ID
   * @param {number} inactivityDays - Number of days of inactivity
   * @returns {Array<Customer>} Array of inactive customers
   */
  static async getInactiveCustomers(businessId, inactivityDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

    try {
      // Find customers based on last_activity_date
      const inactiveCustomers = await Customer.findAll({
        where: {
          business_id: businessId,
          last_activity_date: {
            [Op.lte]: cutoffDate
          },
          status: {
            [Op.in]: ['active', 'churning']
          }
        },
        include: [{
          model: WalletPass,
          as: 'walletPasses',
          required: false // Don't constrain by wallet pass existence
        }],
        attributes: ['customer_id', 'name', 'phone', 'email', 'last_activity_date', 'status']
      });

      return inactiveCustomers;

    } catch (error) {
      logger.error('Error getting inactive customers', {
        businessId,
        inactivityDays,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send re-engagement notification to a customer
   * @param {Customer} customer - The customer to notify
   * @param {AutoEngagementConfig} config - The auto-engagement config
   * @param {Object} template - The message template
   * @returns {boolean} True if notification was successfully sent and logged
   */
  static async sendReengagementToCustomer(customer, config, template) {
    try {
      // Get customer's wallet passes
      const passes = customer.walletPasses || [];

      if (passes.length === 0) {
        logger.warn(`Customer ${customer.customer_id} has no wallet passes`);
        return false;
      }

      let sentSuccessfully = false;

      // Send through configured channels
      for (const channel of config.channels) {
        try {
          if (channel === 'wallet' && passes.length > 0) {
            // Send wallet push notification once per customer
            const result = await WalletNotificationService.sendReengagementNotification(
              customer.customer_id,
              config.business_id,
              {
                header: template.header,
                body: template.body
              }
            );

            // Only log if successful
            if (result.success) {
              try {
                await NotificationLog.create({
                  customer_id: customer.customer_id,
                  business_id: config.business_id,
                  channel: 'wallet',
                  notification_type: 'auto_reengagement',
                  status: 'sent',
                  sent_at: new Date(),
                  subject: template.header,
                  message_content: template.body,
                  context_data: {
                    config_id: config.config_id,
                    inactivity_days: config.inactivity_days,
                    passes_notified: result.results?.length || 0
                  }
                });
                sentSuccessfully = true;
              } catch (logError) {
                logger.error(`Failed to create notification log for customer ${customer.customer_id}`, {
                  error: logError.message
                });
                return false;
              }
            } else {
              logger.warn(`Failed to send wallet notification to customer ${customer.customer_id}`, {
                error: result.error
              });
            }
          } else if (channel === 'email' && customer.email) {
            // TODO: Implement email notification
            logger.info(`Email notification for customer ${customer.customer_id} (not yet implemented)`);
          } else if (channel === 'sms' && customer.phone) {
            // TODO: Implement SMS notification
            logger.info(`SMS notification for customer ${customer.customer_id} (not yet implemented)`);
          } else if (channel === 'push') {
            // TODO: Implement push notification
            logger.info(`Push notification for customer ${customer.customer_id} (not yet implemented)`);
          }
        } catch (channelError) {
          logger.error(`Failed to send ${channel} notification to customer ${customer.customer_id}`, {
            error: channelError.message
          });
        }
      }

      return sentSuccessfully;

    } catch (error) {
      logger.error('Error sending re-engagement to customer', {
        customerId: customer.customer_id,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get auto-engagement history for a business
   * @param {string} businessId - The business secure ID
   * @param {Object} options - Query options (page, limit, date_from, date_to)
   * @returns {Object} History data with pagination
   */
  static async getAutoEngagementHistory(businessId, options = {}) {
    const {
      page = 1,
      limit = 50,
      date_from,
      date_to
    } = options;

    const offset = (page - 1) * limit;

    try {
      // Build where clause for date filtering
      const where = {
        business_id: businessId,
        notification_type: 'auto_reengagement'
      };

      if (date_from || date_to) {
        where.sent_at = {};
        if (date_from) {
          where.sent_at[Op.gte] = new Date(date_from);
        }
        if (date_to) {
          where.sent_at[Op.lte] = new Date(date_to);
        }
      }

      // Get logs
      const { count, rows } = await NotificationLog.findAndCountAll({
        where,
        order: [['sent_at', 'DESC']],
        limit,
        offset,
        attributes: ['id', 'customer_id', 'channel', 'status', 'sent_at', 'delivered_at', 'opened_at', 'subject', 'message_content', 'context_data']
      });

      return {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
        data: rows
      };

    } catch (error) {
      logger.error('Error getting auto-engagement history', {
        businessId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate auto-engagement configuration data
   * @param {Object} configData - The config data to validate
   * @returns {Object} Validation result { valid: boolean, errors: array }
   */
  static validateConfig(configData) {
    const errors = [];

    // Validate inactivity_days
    if (configData.inactivity_days !== undefined) {
      if (!Number.isInteger(configData.inactivity_days) || configData.inactivity_days < 1 || configData.inactivity_days > 365) {
        errors.push('inactivity_days must be an integer between 1 and 365');
      }
    }

    // Validate message_template
    if (configData.message_template) {
      if (typeof configData.message_template !== 'object') {
        errors.push('message_template must be an object');
      } else {
        if (!configData.message_template.header || typeof configData.message_template.header !== 'string') {
          errors.push('message_template.header is required and must be a string');
        }
        if (!configData.message_template.body || typeof configData.message_template.body !== 'string') {
          errors.push('message_template.body is required and must be a string');
        }
      }
    }

    // Validate channels
    if (configData.channels) {
      if (!Array.isArray(configData.channels) || configData.channels.length === 0) {
        errors.push('channels must be a non-empty array');
      } else {
        const validChannels = ['email', 'sms', 'push', 'wallet'];
        const invalidChannels = configData.channels.filter(c => !validChannels.includes(c));
        if (invalidChannels.length > 0) {
          errors.push(`Invalid channels: ${invalidChannels.join(', ')}. Valid channels are: ${validChannels.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default AutoEngagementService;
