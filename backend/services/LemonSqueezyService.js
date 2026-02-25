import axios from 'axios';
import crypto from 'crypto';
import { Op } from 'sequelize';
import Subscription from '../models/Subscription.js';
import Business from '../models/Business.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const getLSConfig = () => ({
    apiKey: process.env.LEMONSQUEEZY_API_KEY,
    storeId: process.env.LEMONSQUEEZY_STORE_ID,
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET
});

const getApi = () => {
    const { apiKey } = getLSConfig();
    return axios.create({
        baseURL: 'https://api.lemonsqueezy.com/v1',
        headers: {
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'Authorization': `Bearer ${apiKey}`
        }
    });
};

class LemonSqueezyService {
    /**
     * Create a checkout URL for a specific variant
     * @param {string} businessId - The business public_id to associate
     * @param {string} variantId - The variant ID to purchase
     * @param {string} userEmail - Pre-fill email
     * @returns {Promise<string>} Checkout URL
     */
    /**
     * Get Customer Portal URL
     * @param {string} customerId - Lemon Squeezy Customer ID
     * @returns {Promise<string>} Portal URL
     */
    async getCustomerPortalUrl(customerId) {
        try {
            const api = getApi();
            const response = await api.get(`/customers/${customerId}`);
            // The portal URL is usually in links.self or we generate it via the API if available
            // Actually, Lemon Squeezy Customer Portal is accessed via: 
            // https://<store-slug>.lemonsqueezy.com/billing?token=<customer-token>
            // BUT api/v1/customers/{id} response contains "attributes.urls.customer_portal"
            return response.data.data.attributes.urls.customer_portal;
        } catch (error) {
            // Handle 404 gracefully in development for dummy data
            if (error.response?.status === 404 && process.env.NODE_ENV === 'development') {
                logger.warn(`Lemon Squeezy Customer ${customerId} not found. Using fallback portal URL for development.`);
                return 'https://app.lemonsqueezy.com/my-billing';
            }

            logger.error('Failed to get customer portal URL:', error.response?.data || error.message);
            throw new Error('Failed to generate portal URL');
        }
    }

    /**
     * Create a checkout URL for a specific variant
     * @param {string} businessId - The business public_id to associate
     * @param {string} variantId - The variant ID to purchase
     * @param {string} userEmail - Pre-fill email
     * @returns {Promise<string>} Checkout URL
     */
    async createCheckout(businessId, variantId, userEmail, upgradeFromSubId = null) {
        try {
            const { storeId } = getLSConfig();
            const api = getApi();
            const frontendUrl = process.env.FRONTEND_URL || 'https://app.madna.me';

            const customData = { business_id: businessId };
            if (upgradeFromSubId) {
                customData.upgrade_from_sub_id = upgradeFromSubId;
            }

            const payload = {
                data: {
                    type: "checkouts",
                    attributes: {
                        product_options: {
                            redirect_url: `${frontendUrl}/subscription/success`
                        },
                        checkout_data: {
                            email: userEmail,
                            custom: customData
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: "stores",
                                id: storeId
                            }
                        },
                        variant: {
                            data: {
                                type: "variants",
                                id: variantId.toString()
                            }
                        }
                    }
                }
            };

            const response = await api.post('/checkouts', payload);
            return response.data.data.attributes.url;
        } catch (error) {
            logger.error('Lemon Squeezy Checkout Error:', error.response?.data || error.message);
            throw new Error('Failed to create checkout');
        }
    }

    /**
     * Verify webhook signature
     * @param {string} signature - X-Signature header
     * @param {object} body - Raw body
     * @returns {boolean}
     */
    verifyWebhook(signature, body) {
        const { webhookSecret } = getLSConfig();
        const hmac = crypto.createHmac('sha256', webhookSecret);

        const rawString = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        const digest = Buffer.from(hmac.update(rawString).digest('hex'), 'utf8');
        const signatureBuffer = Buffer.from(signature || '', 'utf8');

        return digest.length === signatureBuffer.length && crypto.timingSafeEqual(digest, signatureBuffer);
    }

    /**
     * Handle incoming webhook
     * @param {object} payload 
     */
    async handleWebhook(payload) {
        const eventName = payload.meta.event_name;
        const data = payload.data;
        const customData = payload.meta.custom_data || {}; // Contains business_id

        logger.info(`Processing Lemon Squeezy Event: ${eventName}`);

        // Log variant info if available for debugging
        if (data.attributes && data.attributes.variant_id) {
            logger.info(`Webhook Variant ID: ${data.attributes.variant_id}`);
        }

        // Extract business_id from custom_data (passed during checkout)
        // OR if it's an update, we might need to look it up via subscription ID
        let businessId = customData.business_id;

        // If no business_id in payload, try to find it via existing subscription
        if (!businessId && data.attributes.subscription_id) {
            const sub = await Subscription.findOne({
                where: { lemon_squeezy_subscription_id: data.attributes.subscription_id.toString() }
            });
            businessId = sub?.business_id;
        }

        if (!businessId) {
            logger.warn(`No business_id found for event ${eventName}. Skipping.`);
            return;
        }

        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated':
            case 'subscription_payment_success':
                await this.syncSubscription(businessId, data);
                break;

            case 'subscription_cancelled':
            case 'subscription_expired':
                await this.handleCancellation(businessId, data);
                break;

            default:
                logger.info(`Unhandled event: ${eventName}`);
        }
    }

    /**
     * Sync subscription data to local DB
     */
    async syncSubscription(businessId, data) {
        const attributes = data.attributes;
        const variantId = attributes.variant_id.toString();

        logger.info(`Syncing subscription for Variant ID: ${variantId}`);

        // Reverse Mapping Configuration
        const VARIANT_TO_PLAN_MAPPING = {
            // Loyalty Plans
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_STARTER_MONTHLY]: 'loyalty_starter',
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_STARTER_YEARLY]: 'loyalty_starter',
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_GROWTH_MONTHLY]: 'loyalty_growth',
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_GROWTH_YEARLY]: 'loyalty_growth',
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_PROFESSIONAL_MONTHLY]: 'loyalty_professional',
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_PROFESSIONAL_YEARLY]: 'loyalty_professional',

            // POS Plans
            [process.env.LEMONSQUEEZY_VARIANT_ID_POS_BUSINESS_MONTHLY]: 'pos_business',
            [process.env.LEMONSQUEEZY_VARIANT_ID_POS_BUSINESS_YEARLY]: 'pos_business',
            [process.env.LEMONSQUEEZY_VARIANT_ID_POS_ENTERPRISE_MONTHLY]: 'pos_enterprise',
            [process.env.LEMONSQUEEZY_VARIANT_ID_POS_ENTERPRISE_YEARLY]: 'pos_enterprise',
            [process.env.LEMONSQUEEZY_VARIANT_ID_POS_PREMIUM_MONTHLY]: 'pos_premium',
            [process.env.LEMONSQUEEZY_VARIANT_ID_POS_PREMIUM_YEARLY]: 'pos_premium',

            // Legacy Plans (Backward Compatibility)
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_MONTHLY]: 'loyalty_growth', // Map old loyalty to growth
            [process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_YEARLY]: 'loyalty_growth',
            [process.env.LEMONSQUEEZY_VARIANT_ID_POS_MONTHLY]: 'pos_business' // Map old POS to business
        };

        // Determine Plan Type based on Variant ID
        let planType = VARIANT_TO_PLAN_MAPPING[variantId];

        if (!planType) {
            logger.error(`❌ Unknown Variant ID: ${variantId}. Skipping sync to prevent data corruption. Full payload: ${JSON.stringify(data)}`);
            return;
        } else {
            logger.info(`✅ Identified Plan Type: ${planType} from Variant ID: ${variantId}`);
        }

        // Determine Billing Interval (for logic/logging, even if not stored yet)
        let billingInterval = 'monthly';
        if (
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_STARTER_YEARLY ||
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_GROWTH_YEARLY ||
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_PROFESSIONAL_YEARLY ||
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_POS_BUSINESS_YEARLY ||
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_POS_ENTERPRISE_YEARLY ||
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_POS_PREMIUM_YEARLY ||
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_YEARLY
        ) {
            billingInterval = 'annual';
        }

        const newSubscriptionId = attributes.subscription_id?.toString() || data.id?.toString();

        // 1. Cancel previous active subscriptions for this business if they differ from the new one
        const whereClause = {
            business_id: businessId,
            status: ['active', 'trial', 'past_due']
        };
        if (newSubscriptionId) {
            whereClause.lemon_squeezy_subscription_id = { [Op.ne]: newSubscriptionId };
        }
        const previousActiveSubs = await Subscription.findAll({ where: whereClause });

        for (const oldSub of previousActiveSubs) {
            if (oldSub.lemon_squeezy_subscription_id) {
                try {
                    await this.cancelSubscription(oldSub.lemon_squeezy_subscription_id);
                } catch (err) {
                    logger.error(`Failed to cancel old subscription ${oldSub.lemon_squeezy_subscription_id} during upgrade:`, err);
                }
            }
            await oldSub.update({
                status: 'cancelled',
                lemon_squeezy_status: 'cancelled',
                cancelled_at: new Date()
            });
        }

        const subData = {
            business_id: businessId,
            lemon_squeezy_customer_id: attributes.customer_id?.toString(),
            lemon_squeezy_variant_id: variantId,
            lemon_squeezy_status: attributes.status,
            status: attributes.status === 'active' || attributes.status === 'on_trial' ? 'active' : 'expired',
            plan_type: planType,
            trial_end_date: attributes.trial_ends_at,
            next_billing_date: attributes.renews_at,
            billing_cycle_start: attributes.created_at, // Approximation
            amount: attributes.total / 100, // Convert cents to dollars/SAR
            currency: attributes.currency
        };

        // 2. Insert or update the CURRENT subscription record
        let currentSub = null;
        if (newSubscriptionId) {
            currentSub = await Subscription.findOne({
                where: { lemon_squeezy_subscription_id: newSubscriptionId }
            });
        }

        if (currentSub) {
            await currentSub.update(subData);
        } else {
            subData.lemon_squeezy_subscription_id = newSubscriptionId;
            await Subscription.create(subData);
        }

        // Also update Business table status
        await Business.update(
            {
                current_plan: planType,
                subscription_status: 'active'
            },
            { where: { public_id: businessId } }
        );

        logger.info(`Synced subscription for Business ${businessId}: ${planType} (${billingInterval})`);
    }

    async handleCancellation(businessId, data) {
        await Subscription.update({
            status: 'cancelled',
            lemon_squeezy_status: data.attributes.status,
            cancelled_at: new Date()
        }, {
            where: { lemon_squeezy_subscription_id: data.id }
        });

        // We don't immediately downgrade Business plan, usually wait for expiration
        // But for now, let's keep it simple
        logger.info(`Subscription cancelled for Business ${businessId}`);
    }

    /**
     * Update subscription quantity (for POS branches)
     */
    async updateSubscriptionQuantity(subscriptionId, quantity) {
        try {
            const api = getApi();
            const payload = {
                data: {
                    type: "subscriptions",
                    id: subscriptionId,
                    attributes: {
                        quantity: quantity,
                        invoice_immediately: true
                    }
                }
            };

            const response = await api.patch(`/subscriptions/${subscriptionId}`, payload);
            return response.data;
        } catch (error) {
            logger.error('Failed to update subscription quantity:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Cancel subscription via Lemon Squeezy API
     * @param {string} lsSubscriptionId 
     */
    async cancelSubscription(lsSubscriptionId) {
        try {
            const api = getApi();
            const response = await api.delete(`/subscriptions/${lsSubscriptionId}`);
            logger.info(`Successfully cancelled Lemon Squeezy subscription: ${lsSubscriptionId}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to cancel LemonSqueezy subscription:', error.response?.data || error.message);
            throw error;
        }
    }
}

export default new LemonSqueezyService();
