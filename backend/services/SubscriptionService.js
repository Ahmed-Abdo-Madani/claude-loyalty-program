import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import logger from '../config/logger.js';
import Business from '../models/Business.js';
import Subscription from '../models/Subscription.js';
import Branch from '../models/Branch.js';
import Offer from '../models/Offer.js';
import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Counter from '../models/Counter.js';
import MoyasarService from './MoyasarService.js';

/**
 * SubscriptionService - Centralized subscription and plan management
 * Handles trial periods, plan limits, upgrades, downgrades, and feature access
 * 
 * Plan Structure:
 * - Free: 1 offer, 100 customers, 20 POS operations, 1 location
 * - Professional: Unlimited offers, 1000 customers, unlimited POS, 1 location (210 SAR/month)
 * - Enterprise: Unlimited everything, location-based pricing (570 SAR base + 180 SAR per extra location after 3)
 */
class SubscriptionService {
  // Plan definitions with limits and features
  static PLAN_DEFINITIONS = {
    free: {
      name: 'free',
      price: 0,
      limits: {
        offers: 1,
        customers: 100,
        posOperations: 20,
        locations: 1
      },
      features: ['basic_offers']
    },
    professional: {
      name: 'professional',
      price: 210,
      limits: {
        offers: Infinity,
        customers: 1000,
        posOperations: Infinity,
        locations: 1
      },
      features: ['basic_offers', 'unlimited_offers', 'api_access']
    },
    enterprise: {
      name: 'enterprise',
      basePrice: 570,
      pricePerLocation: 180,
      limits: {
        offers: Infinity,
        customers: Infinity,
        posOperations: Infinity,
        locations: Infinity
      },
      features: ['basic_offers', 'unlimited_offers', 'multiple_locations', 'api_access', 'advanced_analytics']
    }
  };

  /**
   * Get plan definition for a given plan type
   * @param {string} planType - Plan type: 'free', 'professional', 'enterprise'
   * @returns {Object} Plan configuration
   * @throws {Error} If plan type is invalid
   */
  static getPlanDefinition(planType) {
    const plan = this.PLAN_DEFINITIONS[planType?.toLowerCase()];
    
    if (!plan) {
      const error = new Error(`Invalid plan type: ${planType}. Valid plans: free, professional, enterprise`);
      logger.error('Invalid plan type requested', { planType });
      throw error;
    }

    logger.debug('Plan definition retrieved', { planType, plan });
    return plan;
  }

  /**
   * Calculate price for a plan based on location count
   * Enterprise pricing: 570 SAR for up to 3 locations, then +180 SAR per additional location
   * @param {string} planType - Plan type
   * @param {number} locationCount - Number of locations
   * @returns {number} Price in SAR
   */
  static calculatePlanPrice(planType, locationCount = 1) {
    const plan = this.getPlanDefinition(planType);

    if (planType === 'enterprise') {
      // Enterprise: 570 SAR base for up to 3 locations, 180 SAR per location after that
      if (locationCount <= 3) {
        return plan.basePrice;
      } else {
        const extraLocations = locationCount - 3;
        const totalPrice = plan.basePrice + (extraLocations * plan.pricePerLocation);
        
        logger.debug('Enterprise plan price calculated', {
          locationCount,
          extraLocations,
          basePrice: plan.basePrice,
          pricePerLocation: plan.pricePerLocation,
          totalPrice
        });
        
        return totalPrice;
      }
    }

    // Free and Professional plans have fixed prices
    return plan.price;
  }

  /**
   * Initialize trial period for a new business
   * Sets trial end date and creates initial Subscription record
   * @param {string} businessId - Business secure ID
   * @param {number} trialDays - Number of trial days (default: 7)
   * @returns {Promise<Object>} Created subscription record
   * @throws {Error} If business not found or subscription creation fails
   */
  static async initializeTrialPeriod(businessId, trialDays = 7) {
    logger.debug('Initializing trial period', { businessId, trialDays });

    try {
      // Fetch business
      const business = await Business.findOne({
        where: { public_id: businessId }
      });

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Calculate trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      // Update business with trial information
      await business.update({
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
        current_plan: 'free'
      });

      logger.debug('Business updated with trial status', {
        businessId,
        trialEndsAt,
        subscription_status: 'trial'
      });

      // Create initial Subscription record
      const subscription = await Subscription.create({
        business_id: businessId,
        plan_type: 'free',
        status: 'trial',
        trial_ends_at: trialEndsAt,
        billing_cycle_start: new Date(),
        next_billing_date: trialEndsAt,
        metadata: {
          trial_days: trialDays,
          activated_at: new Date().toISOString()
        }
      });

      logger.info('Trial period initialized successfully', {
        businessId,
        subscriptionId: subscription.public_id,
        trialDays,
        trialEndsAt
      });

      return subscription;

    } catch (error) {
      logger.error('Failed to initialize trial period', {
        businessId,
        trialDays,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Check if business can perform action based on subscription limits
   * @param {string} businessId - Business secure ID
   * @param {string} limitType - Type of limit: 'offers', 'customers', 'posOperations', 'locations'
   * @returns {Promise<Object>} { allowed: boolean, message: string, current: number, limit: number }
   * @throws {Error} If business not found or limit check fails
   */
  static async checkSubscriptionLimits(businessId, limitType) {
    logger.debug('Checking subscription limits', { businessId, limitType });

    try {
      // Fetch business
      const business = await Business.findOne({
        where: { public_id: businessId }
      });

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Get plan limits from service definition (not from Business model)
      const planDefinition = this.getPlanDefinition(business.current_plan);
      const planLimits = planDefinition.limits;
      const limit = planLimits[limitType];

      if (limit === undefined) {
        logger.warn('Invalid limit type requested', {
          limitType,
          availableLimits: Object.keys(planLimits),
          businessId
        });
        throw new Error(`Invalid limit type: ${limitType}. Valid types: ${Object.keys(planLimits).join(', ')}`);
      }

      // Optional: Log if Business model has its own getPlanLimits for debugging
      if (business.getPlanLimits && typeof business.getPlanLimits === 'function') {
        logger.debug('Business model has getPlanLimits method (service definition takes precedence)', {
          businessId,
          businessPlan: business.current_plan
        });
      }

      // Calculate current usage
      const usage = await this.calculateUsage(businessId);
      const currentUsage = usage[limitType];

      // Check limit
      const result = this.enforceLimit(currentUsage, limit, limitType);

      logger.debug('Subscription limit checked', {
        businessId,
        limitType,
        currentUsage,
        limit,
        allowed: result.allowed,
        plan: business.current_plan
      });

      return {
        allowed: result.allowed,
        message: result.message,
        current: currentUsage,
        limit: limit === Infinity ? 'unlimited' : limit,
        plan: business.current_plan
      };

    } catch (error) {
      logger.error('Failed to check subscription limits', {
        businessId,
        limitType,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Get comprehensive subscription status for a business
   * @param {string} businessId - Business secure ID
   * @returns {Promise<Object>} Subscription details with limits and usage
   * @throws {Error} If business not found
   */
  static async getSubscriptionStatus(businessId) {
    logger.debug('Fetching subscription status', { businessId });

    try {
      // Fetch business
      const business = await Business.findOne({
        where: { public_id: businessId }
      });

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Get plan definition
      const plan = this.getPlanDefinition(business.current_plan);

      // Calculate usage
      const usage = await this.calculateUsage(businessId);

      // Calculate trial info if applicable
      let trialInfo = null;
      if (business.isOnTrial()) {
        const now = new Date();
        const trialEnd = new Date(business.trial_ends_at);
        const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        
        trialInfo = {
          is_trial: true,
          trial_ends_at: business.trial_ends_at,
          days_remaining: daysRemaining,
          expired: this.isTrialExpired(business)
        };
      }

      // Fetch active Subscription record for retry/grace metadata
      const subscription = await Subscription.findOne({
        where: { business_id: businessId },
        order: [['created_at', 'DESC']]
      });

      const status = {
        current_plan: business.current_plan,
        subscription_status: business.subscription_status,
        trial_info: trialInfo,
        limits: plan.limits,
        usage,
        features: plan.features,
        can_upgrade: business.current_plan !== 'enterprise',
        next_billing_date: subscription?.next_billing_date || null,
        // Comment 4: Include retry and grace metadata for payment failure banner
        retry_count: subscription?.retry_count || 0,
        grace_period_end: subscription?.grace_period_end || null,
        next_retry_date: subscription?.next_billing_date || null
      };

      logger.info('Subscription status fetched', {
        businessId,
        plan: business.current_plan,
        status: business.subscription_status,
        retry_count: status.retry_count
      });

      return status;

    } catch (error) {
      logger.error('Failed to fetch subscription status', {
        businessId,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Check if business can access a specific feature
   * @param {string} businessId - Business secure ID
   * @param {string} feature - Feature name to check
   * @returns {Promise<boolean>} True if feature is accessible
   */
  static async canAccessFeature(businessId, feature) {
    logger.debug('Checking feature access', { businessId, feature });

    try {
      const business = await Business.findOne({
        where: { public_id: businessId }
      });

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      const plan = this.getPlanDefinition(business.current_plan);
      const hasAccess = plan.features.includes(feature);

      logger.debug('Feature access checked', {
        businessId,
        feature,
        plan: business.current_plan,
        hasAccess
      });

      return hasAccess;

    } catch (error) {
      logger.error('Failed to check feature access', {
        businessId,
        feature,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Upgrade business subscription to a new plan
   * Handles prorated billing calculation
   * @param {string} businessId - Business secure ID
   * @param {string} newPlanType - New plan type
   * @param {number} locationCount - Number of locations (for Enterprise)
   * @param {Object} transaction - Optional Sequelize transaction for atomic operations
   * @returns {Promise<Object>} Upgrade details with prorated amount
   * @throws {Error} If upgrade fails or plan is invalid
   */
  static async upgradeSubscription(businessId, newPlanType, locationCount = 1, transaction = null) {
    logger.debug('Processing subscription upgrade', { businessId, newPlanType, locationCount, hasTransaction: !!transaction });

    try {
      const business = await Business.findOne({
        where: { public_id: businessId },
        transaction
      });

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Fetch latest Subscription record for next_billing_date
      const subscription = await Subscription.findOne({
        where: { business_id: businessId },
        order: [['created_at', 'DESC']],
        transaction
      });

      const currentPlan = business.current_plan;
      const newPlan = this.getPlanDefinition(newPlanType);
      
      // Validate upgrade path (can't downgrade)
      const planHierarchy = ['free', 'professional', 'enterprise'];
      const currentIndex = planHierarchy.indexOf(currentPlan);
      const newIndex = planHierarchy.indexOf(newPlanType);
      
      if (newIndex <= currentIndex) {
        throw new Error(`Cannot upgrade from ${currentPlan} to ${newPlanType}. Use downgradeSubscription instead.`);
      }

      // Calculate new price
      const newPrice = this.calculatePlanPrice(newPlanType, locationCount);

      // Calculate prorated amount if upgrading mid-period
      let proratedAmount = newPrice;
      if (subscription?.next_billing_date) {
        const now = new Date();
        const nextBilling = new Date(subscription.next_billing_date);
        const daysRemaining = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
        const totalDays = 30;
        proratedAmount = Math.round((newPrice * daysRemaining) / totalDays);
      }

      // Update business
      await business.update({
        current_plan: newPlanType,
        subscription_status: 'active',
        trial_ends_at: null
      }, { transaction });

      // Update or create subscription record (already fetched above)
      if (subscription) {
        await subscription.update({
          plan_type: newPlanType,
          status: 'active',
          amount: newPrice,
          billing_cycle_start: new Date(),
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          metadata: {
            ...subscription.metadata,
            upgraded_from: currentPlan,
            upgraded_at: new Date().toISOString(),
            location_count: locationCount
          }
        }, { transaction });
      }

      logger.info('Subscription upgraded successfully', {
        businessId,
        from: currentPlan,
        to: newPlanType,
        newPrice,
        proratedAmount,
        locationCount
      });

      return {
        success: true,
        previous_plan: currentPlan,
        new_plan: newPlanType,
        price: newPrice,
        prorated_amount: proratedAmount,
        limits: newPlan.limits,
        features: newPlan.features
      };

    } catch (error) {
      logger.error('Failed to upgrade subscription', {
        businessId,
        newPlanType,
        locationCount,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Downgrade business subscription to a lower plan
   * Handles credit calculation for remaining period
   * @param {string} businessId - Business secure ID
   * @param {string} newPlanType - New plan type
   * @returns {Promise<Object>} Downgrade details with credit amount
   * @throws {Error} If downgrade fails or plan is invalid
   */
  static async downgradeSubscription(businessId, newPlanType) {
    logger.debug('Processing subscription downgrade', { businessId, newPlanType });

    try {
      const business = await Business.findOne({
        where: { public_id: businessId }
      });

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Fetch latest Subscription record for next_billing_date
      const subscription = await Subscription.findOne({
        where: { business_id: businessId },
        order: [['created_at', 'DESC']]
      });

      const currentPlan = business.current_plan;
      const newPlan = this.getPlanDefinition(newPlanType);
      
      // Validate downgrade path
      const planHierarchy = ['free', 'professional', 'enterprise'];
      const currentIndex = planHierarchy.indexOf(currentPlan);
      const newIndex = planHierarchy.indexOf(newPlanType);
      
      if (newIndex >= currentIndex) {
        throw new Error(`Cannot downgrade from ${currentPlan} to ${newPlanType}. Use upgradeSubscription instead.`);
      }

      // Calculate credit for unused portion
      let creditAmount = 0;
      if (subscription?.next_billing_date) {
        const currentPrice = this.calculatePlanPrice(currentPlan);
        const now = new Date();
        const nextBilling = new Date(subscription.next_billing_date);
        const daysRemaining = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
        const totalDays = 30;
        creditAmount = Math.round((currentPrice * daysRemaining) / totalDays);
      }

      // Update business (downgrade takes effect at end of billing period)
      await business.update({
        metadata: {
          ...business.metadata,
          pending_downgrade: {
            to_plan: newPlanType,
            scheduled_at: new Date().toISOString(),
            effective_date: subscription?.next_billing_date || null,
            credit_amount: creditAmount
          }
        }
      });

      logger.info('Subscription downgrade scheduled', {
        businessId,
        from: currentPlan,
        to: newPlanType,
        effectiveDate: subscription?.next_billing_date || null,
        creditAmount
      });

      return {
        success: true,
        current_plan: currentPlan,
        scheduled_plan: newPlanType,
        effective_date: subscription?.next_billing_date || null,
        credit_amount: creditAmount,
        message: subscription?.next_billing_date ? `Downgrade will take effect on ${subscription.next_billing_date}` : 'Downgrade scheduled'
      };

    } catch (error) {
      logger.error('Failed to downgrade subscription', {
        businessId,
        newPlanType,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Cancel business subscription
   * @param {string} businessId - Business secure ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation details
   * @throws {Error} If cancellation fails
   */
  static async cancelSubscription(businessId, reason = null) {
    logger.debug('Processing subscription cancellation', { businessId, reason });

    try {
      const business = await Business.findOne({
        where: { public_id: businessId }
      });

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Fetch latest Subscription record for next_billing_date
      const subscription = await Subscription.findOne({
        where: { business_id: businessId },
        order: [['created_at', 'DESC']]
      });

      // Update business status
      await business.update({
        subscription_status: 'cancelled',
        metadata: {
          ...business.metadata,
          cancellation: {
            cancelled_at: new Date().toISOString(),
            reason,
            previous_plan: business.current_plan
          }
        }
      });

      // Update subscription record
      if (subscription) {
        await subscription.update({
          status: 'cancelled',
          cancelled_at: new Date(),
          metadata: {
            ...subscription.metadata,
            cancellation_reason: reason
          }
        });
      }

      logger.info('Subscription cancelled', {
        businessId,
        plan: business.current_plan,
        reason
      });

      return {
        success: true,
        cancelled_at: new Date(),
        plan: business.current_plan,
        access_until: subscription?.next_billing_date || null,
        message: 'Subscription cancelled. Access will continue until the end of the billing period.'
      };

    } catch (error) {
      logger.error('Failed to cancel subscription', {
        businessId,
        reason,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Check if trial period has expired
   * @param {Object} business - Business instance
   * @returns {boolean} True if trial is expired
   */
  static isTrialExpired(business) {
    if (!business.trial_ends_at) {
      return false;
    }

    const now = new Date();
    const trialEnd = new Date(business.trial_ends_at);
    const expired = now > trialEnd;

    logger.debug('Trial expiration check', {
      businessId: business.public_id,
      trialEnd,
      now,
      expired
    });

    return expired;
  }

  /**
   * Calculate current usage for a business
   * @param {string} businessId - Business secure ID
   * @returns {Promise<Object>} Usage counts
   */
  static async calculateUsage(businessId) {
    logger.debug('Calculating usage', { businessId });

    try {
      // Count offers
      const offerCount = await Offer.count({
        where: { business_id: businessId }
      });

      // Count customers
      const customerCount = await Customer.count({
        where: { business_id: businessId }
      });

      // Count POS operations (sales) in current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      logger.debug('Counting POS operations for current month', {
        businessId,
        firstDayOfMonth: firstDayOfMonth.toISOString(),
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear()
      });
      
      const posOperationCount = await Sale.count({
        where: {
          business_id: businessId,
          created_at: {
            [Op.gte]: firstDayOfMonth
          }
        }
      });

      // Count locations (branches)
      const locationCount = await Branch.count({
        where: { business_id: businessId }
      });

      const usage = {
        offers: offerCount,
        customers: customerCount,
        posOperations: posOperationCount,
        locations: locationCount
      };

      logger.debug('Usage calculated', { 
        businessId, 
        usage,
        posOperationsMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      });

      return usage;

    } catch (error) {
      logger.error('Failed to calculate usage', {
        businessId,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Enforce limit check
   * @param {number} currentUsage - Current usage count
   * @param {number} limit - Limit value (Infinity for unlimited)
   * @param {string} limitType - Type of limit
   * @returns {Object} { allowed: boolean, message: string }
   */
  static enforceLimit(currentUsage, limit, limitType) {
    // Unlimited
    if (limit === Infinity) {
      return {
        allowed: true,
        message: 'Unlimited access'
      };
    }

    // Check if at or over limit
    if (currentUsage >= limit) {
      return {
        allowed: false,
        message: `${limitType} limit reached (${currentUsage}/${limit}). Please upgrade your plan to continue.`
      };
    }

    // Within limits
    return {
      allowed: true,
      message: `Within limits (${currentUsage}/${limit})`
    };
  }

  // ============================================
  // RECURRING BILLING METHODS
  // ============================================

  /**
   * Main entry point for recurring billing cron job
   * Processes all subscriptions due for renewal
   * Called daily at 2:00 AM UTC by cron job in server.js
   * @returns {Promise<object>} Statistics (totalProcessed, totalSuccessful, totalFailed, totalRetries)
   */
  static async processRecurringPayments() {
    logger.info('💳 Starting recurring billing process');

    try {
      // Get all subscriptions due for renewal
      const subscriptions = await this.getSubscriptionsDueForRenewal();

      logger.info(`Found ${subscriptions.length} subscriptions due for renewal`);

      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      let totalRetries = 0;

      // Process each subscription independently
      for (const subscription of subscriptions) {
        try {
          totalProcessed++;

          // Check if subscription is past grace period without attempting payment
          if (subscription.status === 'past_due' && subscription.grace_period_end) {
            const now = new Date();
            if (now >= new Date(subscription.grace_period_end)) {
              logger.warn('Grace period expired - suspending business without retry', {
                subscriptionId: subscription.public_id,
                businessId: subscription.business_id,
                gracePeriodEnd: subscription.grace_period_end
              });

              // Suspend business and mark subscription as expired
              const transaction = await sequelize.transaction();
              try {
                await this.suspendBusinessForNonPayment(
                  subscription.business_id,
                  `Failed payment with grace period expired on ${subscription.grace_period_end}`,
                  transaction
                );

                await subscription.update({
                  status: 'expired',
                  cancelled_at: new Date(),
                  cancellation_reason: 'Suspended due to failed payment after grace period'
                }, { transaction });

                await transaction.commit();
                totalFailed++;
                logger.info(`🚫 Business suspended for expired grace period: ${subscription.business_id}`);
              } catch (error) {
                await transaction.rollback();
                throw error;
              }
              continue;
            }
          }

          // Proceed with normal renewal flow
          const result = await this.processSubscriptionRenewal(subscription);

          if (result.success) {
            totalSuccessful++;
            logger.info(`✅ Successfully renewed subscription ${subscription.public_id}`);
          } else {
            totalFailed++;
            if (result.retryScheduled) {
              totalRetries++;
            }
            logger.warn(`⚠️ Failed to renew subscription ${subscription.public_id}`, {
              reason: result.error,
              retryCount: result.retryCount
            });
          }
        } catch (error) {
          totalFailed++;
          logger.error(`❌ Error processing subscription ${subscription.public_id}`, {
            error: error.message,
            stack: error.stack
          });
        }
      }

      const stats = {
        totalSubscriptions: subscriptions.length,
        totalProcessed,
        totalSuccessful,
        totalFailed,
        totalRetries
      };

      logger.info('🎉 Recurring billing process completed', stats);

      return stats;

    } catch (error) {
      logger.error('❌ Recurring billing process failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get all subscriptions due for renewal
   * Criteria: next_billing_date <= today, status = 'active', moyasar_token exists
   * @returns {Promise<Array>} Array of subscriptions with business data
   */
  static async getSubscriptionsDueForRenewal() {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const subscriptions = await Subscription.findAll({
      where: {
        next_billing_date: {
          [Op.lte]: today
        },
        status: {
          [Op.in]: ['active', 'past_due']
        },
        moyasar_token: {
          [Op.ne]: null
        }
      },
      include: [{
        model: Business,
        as: 'business',
        attributes: ['public_id', 'business_name', 'business_name_ar', 'status', 'subscription_status']
      }]
    });

    logger.debug('Subscriptions due for renewal query', {
      today: today.toISOString(),
      count: subscriptions.length
    });

    return subscriptions;
  }

  /**
   * Process renewal for a single subscription
   * Handles payment, success/failure flows, retries, and grace periods
   * @param {Subscription} subscription - Subscription to renew
   * @returns {Promise<object>} Result object with success status
   */
  static async processSubscriptionRenewal(subscription) {
    const transaction = await sequelize.transaction();

    try {
      logger.info(`Processing renewal for subscription ${subscription.public_id}`, {
        businessId: subscription.business_id,
        planType: subscription.plan_type,
        nextBillingDate: subscription.next_billing_date
      });

      // Fetch business and count locations for enterprise pricing
      const business = await Business.findByPk(subscription.business_id);
      if (!business) {
        throw new Error(`Business not found: ${subscription.business_id}`);
      }

      // Calculate renewal amount based on plan and location count
      const locationCount = await Branch.count({
        where: { business_id: subscription.business_id }
      });
      const amount = this.calculatePlanPrice(subscription.plan_type, locationCount || 1);

      logger.debug('Renewal amount calculated', {
        subscriptionId: subscription.public_id,
        planType: subscription.plan_type,
        locationCount,
        amount
      });

      // Check for existing pending payment to avoid duplicates
      const existingPendingPayment = await Payment.findOne({
        where: {
          subscription_id: subscription.public_id,
          status: 'pending'
        }
      });

      if (existingPendingPayment) {
        logger.warn('Pending payment already exists for subscription', {
          subscriptionId: subscription.public_id,
          paymentId: existingPendingPayment.public_id
        });
        await transaction.rollback();
        return {
          success: false,
          error: 'Pending payment already exists',
          retryScheduled: false
        };
      }

      // Attempt tokenized payment (pass transaction for atomicity)
      const paymentResult = await MoyasarService.createTokenizedPayment({
        businessId: subscription.business_id,
        subscriptionId: subscription.public_id,
        token: subscription.moyasar_token,
        amount,
        description: `Monthly subscription renewal - ${subscription.plan_type} plan`,
        transaction
      });

      if (paymentResult.success) {
        // Payment successful - handle renewal
        await this.handleSuccessfulRenewal(
          subscription,
          paymentResult.payment,
          paymentResult.moyasarPayment,
          transaction
        );

        await transaction.commit();

        return {
          success: true,
          paymentId: paymentResult.payment.public_id
        };
      } else {
        // Payment failed - handle failure with retry logic
        const failureResult = await this.handleFailedRenewal(
          subscription,
          paymentResult.payment,
          paymentResult.error || 'Payment failed',
          transaction
        );

        await transaction.commit();

        return {
          success: false,
          error: paymentResult.error,
          retryCount: failureResult.retryCount,
          retryScheduled: failureResult.retryScheduled
        };
      }

    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to process subscription renewal', {
        subscriptionId: subscription.public_id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Handle successful renewal
   * Extends subscription, generates invoice, resets retry count
   * @param {Subscription} subscription - Subscription being renewed
   * @param {Payment} payment - Payment record
   * @param {object} moyasarPayment - Moyasar payment response
   * @param {Transaction} transaction - Sequelize transaction
   */
  static async handleSuccessfulRenewal(subscription, payment, moyasarPayment, transaction) {
    try {
      logger.info('Handling successful renewal', {
        subscriptionId: subscription.public_id,
        paymentId: payment.public_id
      });

      // Calculate next billing date (current + 30 days)
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      // Update subscription
      await subscription.update({
        next_billing_date: nextBillingDate,
        billing_cycle_start: new Date(),
        status: 'active'
      }, { transaction });

      // Update business subscription status
      const business = await Business.findByPk(subscription.business_id, { transaction });
      await business.update({
        subscription_status: 'active',
        subscription_started_at: business.subscription_started_at || new Date()
      }, { transaction });

      // Reset any failed payment retries
      await Payment.update(
        { retry_count: 0 },
        {
          where: {
            subscription_id: subscription.public_id,
            status: 'failed'
          },
          transaction
        }
      );

      // Generate invoice (invoice_number auto-generated by Invoice model's beforeValidate hook)
      const invoice = await Invoice.create({
        business_id: subscription.business_id,
        payment_id: payment.public_id,
        subscription_id: subscription.public_id,
        amount: payment.amount,
        currency: 'SAR',
        issued_date: new Date(),
        due_date: new Date(), // Paid immediately
        paid_date: new Date(),
        status: 'paid'
      }, { transaction });

      logger.info('Invoice generated for successful renewal', {
        invoiceNumber: invoice.invoice_number,
        subscriptionId: subscription.public_id,
        amount: totalAmount
      });

    } catch (error) {
      logger.error('Failed to handle successful renewal', {
        subscriptionId: subscription.public_id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Handle failed renewal
   * Increments retry count, schedules retries, applies grace period
   * @param {Subscription} subscription - Subscription with failed payment
   * @param {Payment} payment - Failed payment record
   * @param {string} error - Error message
   * @param {Transaction} transaction - Sequelize transaction
   * @returns {Promise<object>} Object with retryCount and retryScheduled
   */
  static async handleFailedRenewal(subscription, payment, error, transaction) {
    try {
      logger.warn('Handling failed renewal', {
        subscriptionId: subscription.public_id,
        paymentId: payment.public_id,
        error
      });

      // Get current retry count
      const currentRetryCount = payment.retry_count || 0;
      const newRetryCount = currentRetryCount + 1;

      // Update payment with retry info
      await payment.update({
        retry_count: newRetryCount,
        last_retry_at: new Date(),
        failure_reason: error
      }, { transaction });

      if (newRetryCount < 3) {
        // Schedule next retry (add 1 day to next_billing_date)
        const nextRetryDate = new Date(subscription.next_billing_date);
        nextRetryDate.setDate(nextRetryDate.getDate() + 1);

        await subscription.update({
          status: 'past_due',
          next_billing_date: nextRetryDate,
          retry_count: newRetryCount
        }, { transaction });

        logger.info('Retry scheduled for failed payment', {
          subscriptionId: subscription.public_id,
          retryCount: newRetryCount,
          nextRetryDate: nextRetryDate.toISOString()
        });

        // Comment 2: Send payment failure notification for retry attempts
        try {
          const NotificationService = (await import('./NotificationService.js')).default
          const notificationService = new NotificationService()
          
          const paymentDetails = {
            amount: subscription.amount || 0,
            currency: subscription.currency || 'SAR',
            plan_type: subscription.plan_type,
            failure_reason: error
          }
          
          const retryInfo = {
            retry_count: newRetryCount,
            max_retries: 3,
            next_retry_date: nextRetryDate,
            grace_period_end: null
          }
          
          await notificationService.sendPaymentFailureNotification(
            subscription.business_id,
            paymentDetails,
            retryInfo
          )
        } catch (notificationError) {
          logger.warn('Failed to send payment failure notification', {
            subscriptionId: subscription.public_id,
            error: notificationError.message
          })
          // Don't throw - notification failure should not block retry
        }

        return {
          retryCount: newRetryCount,
          retryScheduled: true
        };
      } else {
        // Max retries reached - set grace period end date
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

        // Persist grace period in dedicated field (grace_period_end)
        await subscription.update({
          status: 'past_due',
          grace_period_end: gracePeriodEnd,
          retry_count: newRetryCount,
          cancellation_reason: `Payment failed after ${newRetryCount} attempts. Grace period ends: ${gracePeriodEnd.toISOString()}`
        }, { transaction });

        logger.warn('Max retries reached - grace period set', {
          subscriptionId: subscription.public_id,
          retryCount: newRetryCount,
          gracePeriodEnd: gracePeriodEnd.toISOString()
        });

        // Comment 2: Send grace period notification when max retries reached
        try {
          const NotificationService = (await import('./NotificationService.js')).default
          const notificationService = new NotificationService()
          
          await notificationService.sendGracePeriodNotification(
            subscription.business_id,
            gracePeriodEnd
          )
        } catch (notificationError) {
          logger.warn('Failed to send grace period notification', {
            subscriptionId: subscription.public_id,
            error: notificationError.message
          })
          // Don't throw - notification failure should not block grace period
        }

        // Note: Grace period suspension will be checked on next cron run
        // Do NOT check immediately as grace period is 3 days in the future

        return {
          retryCount: newRetryCount,
          retryScheduled: false
        };
      }

    } catch (error) {
      logger.error('Failed to handle failed renewal', {
        subscriptionId: subscription.public_id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check and apply grace period suspension if expired
   * Called after max retries reached
   * @param {Subscription} subscription - Subscription in grace period
   * @param {Date} gracePeriodEnd - Grace period end date
   * @param {Transaction} transaction - Sequelize transaction
   */
  static async checkAndApplyGracePeriod(subscription, gracePeriodEnd, transaction) {
    try {
      const now = new Date();

      // Check if grace period has expired
      if (now >= gracePeriodEnd) {
        logger.warn('Grace period expired - suspending business', {
          subscriptionId: subscription.public_id,
          businessId: subscription.business_id,
          gracePeriodEnd: gracePeriodEnd.toISOString()
        });

        // Suspend business for non-payment
        await this.suspendBusinessForNonPayment(
          subscription.business_id,
          `Failed payment after 3 attempts. Grace period expired on ${gracePeriodEnd.toISOString()}`,
          transaction
        );

        // Mark subscription as expired
        await subscription.update({
          status: 'expired',
          cancelled_at: new Date(),
          cancellation_reason: 'Suspended due to failed payment after grace period'
        }, { transaction });

        logger.info('Business suspended for non-payment', {
          businessId: subscription.business_id,
          subscriptionId: subscription.public_id
        });
      } else {
        logger.info('Grace period active - suspension deferred', {
          subscriptionId: subscription.public_id,
          businessId: subscription.business_id,
          daysRemaining: Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24))
        });
      }

    } catch (error) {
      logger.error('Failed to check and apply grace period', {
        subscriptionId: subscription.public_id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Suspend business account for non-payment
   * Updates business status and subscription status
   * @param {string} businessId - Business secure ID
   * @param {string} reason - Suspension reason
   * @param {Transaction} transaction - Sequelize transaction
   */
  static async suspendBusinessForNonPayment(businessId, reason, transaction) {
    try {
      logger.warn('Suspending business for non-payment', {
        businessId,
        reason
      });

      // Fetch business
      const business = await Business.findByPk(businessId, { transaction });
      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Update business status to suspended
      await business.updateStatus('suspended', reason);

      // Update subscription_status to expired
      await business.update({
        subscription_status: 'expired'
      }, { transaction });

      logger.info('Business suspended successfully', {
        businessId,
        businessName: business.business_name,
        reason
      });
      
      // Send suspension notification (non-blocking)
      try {
        const NotificationService = (await import('./NotificationService.js')).default;
        const notificationService = new NotificationService();
        
        await notificationService.sendAccountSuspensionNotification(
          businessId,
          reason
        );
        
        logger.info('Account suspension notification sent', { businessId });
      } catch (notificationError) {
        logger.error('Failed to send suspension notification', {
          businessId,
          error: notificationError.message
        });
      }

    } catch (error) {
      logger.error('Failed to suspend business for non-payment', {
        businessId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Activate subscription from webhook payment event
   * Centralizes subscription activation logic for webhooks and cron jobs
   * @param {Payment} payment - Payment model instance
   * @param {object} moyasarPayment - Moyasar API response object
   * @returns {Promise<object>} Result object with success status, subscription, and invoice
   */
  static async activateSubscriptionFromPayment(payment, moyasarPayment) {
    const transaction = await sequelize.transaction();

    try {
      logger.info('🔄 Activating subscription from payment', {
        paymentId: payment.public_id,
        subscriptionId: payment.subscription_id
      });

      // Find associated subscription
      const subscription = await Subscription.findByPk(payment.subscription_id, { transaction });

      if (!subscription) {
        logger.warn('⚠️ No subscription found for payment', {
          paymentId: payment.public_id,
          subscriptionId: payment.subscription_id
        });
        await transaction.rollback();
        return {
          success: true,
          message: 'Payment marked as paid, but no subscription found'
        };
      }

      // Update subscription status to active
      const now = new Date();
      const nextBillingDate = new Date(now);
      nextBillingDate.setDate(nextBillingDate.getDate() + 30); // 30-day billing cycle

      await subscription.update({
        status: 'active',
        billing_cycle_start: now,
        next_billing_date: nextBillingDate,
        grace_period_end: null // Clear any grace period
      }, { transaction });

      // Reset retry count in payment record
      await payment.update({
        retry_count: 0
      }, { transaction });

      // Update business subscription status
      const business = await Business.findByPk(subscription.business_id, { transaction });
      if (business) {
        await business.update({
          subscription_status: 'active',
          subscription_started_at: business.subscription_started_at || now
        }, { transaction });

        logger.info('✅ Business subscription status updated', {
          businessId: business.public_id,
          businessName: business.business_name
        });
      }

      // Generate invoice
      const invoice = await Invoice.create({
        business_id: subscription.business_id,
        payment_id: payment.public_id,
        subscription_id: subscription.public_id,
        amount: payment.amount,
        currency: 'SAR',
        issued_date: now,
        due_date: now, // Paid immediately
        paid_date: now,
        status: 'paid'
      }, { transaction });

      await transaction.commit();

      logger.info('✅ Subscription activated from webhook', {
        subscriptionId: subscription.public_id,
        businessId: subscription.business_id,
        invoiceNumber: invoice.invoice_number
      });

      return {
        success: true,
        subscription,
        invoice
      };

    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Failed to activate subscription from payment', {
        paymentId: payment.public_id,
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle payment failure from webhook event
   * Implements retry logic and grace period management
   * @param {Payment} payment - Payment model instance
   * @param {string} failureReason - Reason for payment failure
   * @returns {Promise<object>} Result object with action taken
   */
  static async handlePaymentFailureFromWebhook(payment, failureReason) {
    const transaction = await sequelize.transaction();

    try {
      logger.info('⚠️ Handling payment failure from webhook', {
        paymentId: payment.public_id,
        reason: failureReason
      });

      // Find associated subscription
      const subscription = await Subscription.findByPk(payment.subscription_id, { transaction });

      if (!subscription) {
        logger.warn('⚠️ No subscription found for failed payment', {
          paymentId: payment.public_id
        });
        await transaction.rollback();
        return {
          success: true,
          message: 'Payment marked as failed, but no subscription found'
        };
      }

      // Increment retry count
      const currentRetryCount = payment.retry_count || 0;
      const newRetryCount = currentRetryCount + 1;

      await payment.update({
        retry_count: newRetryCount,
        last_retry_at: new Date()
      }, { transaction });

      if (newRetryCount < 3) {
        // Schedule retry - set grace period (3 days)
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

        await subscription.update({
          status: 'past_due',
          grace_period_end: gracePeriodEnd
        }, { transaction });

        await transaction.commit();

        // Send payment failure notification (non-blocking)
        try {
          const NotificationService = (await import('./NotificationService.js')).default;
          const notificationService = new NotificationService();
          
          const paymentDetails = {
            amount: payment.amount,
            currency: payment.currency,
            plan_type: subscription.plan_type,
            failure_reason: failureReason
          };
          
          const retryInfo = {
            retry_count: newRetryCount,
            max_retries: 3,
            next_retry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
            grace_period_end: newRetryCount === 3 ? gracePeriodEnd : null
          };
          
          await notificationService.sendPaymentFailureNotification(
            subscription.business_id,
            paymentDetails,
            retryInfo
          );
          
          logger.info('Payment failure notification sent', {
            businessId: subscription.business_id,
            retryCount: newRetryCount
          });
        } catch (notificationError) {
          logger.error('Failed to send payment failure notification', {
            businessId: subscription.business_id,
            error: notificationError.message
          });
        }

        logger.info('📅 Retry scheduled for failed payment', {
          subscriptionId: subscription.public_id,
          retryCount: newRetryCount,
          gracePeriodEnd: gracePeriodEnd.toISOString()
        });

        return {
          success: true,
          action: 'retry_scheduled',
          retryCount: newRetryCount,
          gracePeriodEnd
        };

      } else {
        // Max retries exceeded - set grace period
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
        
        await subscription.update({
          status: 'expired',
          cancelled_at: new Date(),
          cancellation_reason: `Payment failed after ${newRetryCount} attempts`,
          grace_period_end: gracePeriodEnd
        }, { transaction });

        // Update business subscription status
        const business = await Business.findByPk(subscription.business_id, { transaction });
        if (business) {
          await business.update({
            subscription_status: 'past_due'
          }, { transaction });
          
          await transaction.commit();
          
          // Send grace period notification (non-blocking)
          try {
            const NotificationService = (await import('./NotificationService.js')).default;
            const notificationService = new NotificationService();
            
            await notificationService.sendGracePeriodNotification(
              business.public_id,
              gracePeriodEnd
            );
            
            logger.info('Grace period notification sent', {
              businessId: business.public_id,
              gracePeriodEnd
            });
          } catch (notificationError) {
            logger.error('Failed to send grace period notification', {
              businessId: business.public_id,
              error: notificationError.message
            });
          }

          logger.warn('🚫 Business subscription expired due to payment failure', {
            businessId: business.public_id,
            businessName: business.business_name
          });
        }

        await transaction.commit();

        logger.warn('❌ Max retries exceeded - account suspended', {
          subscriptionId: subscription.public_id,
          retryCount: newRetryCount
        });

        return {
          success: true,
          action: 'account_suspended',
          retryCount: newRetryCount
        };
      }

    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Failed to handle payment failure from webhook', {
        paymentId: payment.public_id,
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle refund from webhook event
   * Processes refunds and cancels subscription if full refund
   * @param {Payment} payment - Payment model instance
   * @param {number} refundAmount - Refund amount in SAR
   * @returns {Promise<object>} Result object with refund details
   */
  static async handleRefundFromWebhook(payment, refundAmount) {
    const transaction = await sequelize.transaction();

    try {
      logger.info('💸 Handling refund from webhook', {
        paymentId: payment.public_id,
        refundAmount,
        paymentAmount: payment.amount
      });

      // Process refund on payment record as part of the transaction
      await payment.update({
        status: 'refunded',
        refund_amount: refundAmount || payment.amount,
        refunded_at: new Date()
      }, { transaction });

      // Find associated subscription
      const subscription = await Subscription.findByPk(payment.subscription_id, { transaction });

      if (!subscription) {
        logger.info('ℹ️ No subscription found for refund (may be one-time payment)', {
          paymentId: payment.public_id
        });
        await transaction.commit();
        return {
          success: true,
          action: 'refund_processed',
          fullRefund: refundAmount >= payment.amount
        };
      }

      // Check if full refund
      const isFullRefund = refundAmount >= payment.amount;

      if (isFullRefund && subscription.status === 'active') {
        // Cancel subscription for full refund
        await subscription.update({
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: 'refunded'
        }, { transaction });

        // Update business subscription status
        const business = await Business.findByPk(subscription.business_id, { transaction });
        if (business) {
          await business.update({
            subscription_status: 'cancelled'
          }, { transaction });

          logger.info('✅ Business subscription cancelled due to full refund', {
            businessId: business.public_id,
            businessName: business.business_name
          });
        }

        await transaction.commit();

        logger.info('✅ Subscription cancelled due to full refund', {
          subscriptionId: subscription.public_id,
          refundAmount
        });

        return {
          success: true,
          action: 'refund_processed',
          fullRefund: true
        };

      } else {
        // Partial refund - no status change
        await transaction.commit();

        logger.info('✅ Partial refund processed', {
          subscriptionId: subscription.public_id,
          refundAmount,
          paymentAmount: payment.amount
        });

        return {
          success: true,
          action: 'refund_processed',
          fullRefund: false
        };
      }

    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Failed to handle refund from webhook', {
        paymentId: payment.public_id,
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default SubscriptionService;
