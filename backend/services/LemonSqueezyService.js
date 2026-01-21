
import axios from 'axios';
import crypto from 'crypto';
import Subscription from '../models/Subscription.js';
import Business from '../models/Business.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const API_Key = process.env.LEMONSQUEEZY_API_KEY;
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

const api = axios.create({
    baseURL: 'https://api.lemonsqueezy.com/v1',
    headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${API_Key}`
    }
});

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
    async createCheckout(businessId, variantId, userEmail) {
        try {
            const payload = {
                data: {
                    type: "checkouts",
                    attributes: {
                        checkout_data: {
                            email: userEmail,
                            custom: {
                                business_id: businessId
                            }
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: "stores",
                                id: STORE_ID
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
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        const digest = Buffer.from(hmac.update(JSON.stringify(body)).digest('hex'), 'utf8');
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

        // Determine Plan Type based on Variant ID
        let planType = 'free';
        // You should probably load these from config/constants but using env/logic here
        if (
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_MONTHLY ||
            variantId === process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_YEARLY
        ) {
            planType = 'professional'; // "Loyalty" tier
        } else if (variantId === process.env.LEMONSQUEEZY_VARIANT_ID_POS_MONTHLY) {
            planType = 'enterprise'; // "POS" tier
        }

        await Subscription.upsert({
            business_id: businessId,
            lemon_squeezy_subscription_id: attributes.subscription_id?.toString() || data.id,
            lemon_squeezy_customer_id: attributes.customer_id.toString(),
            lemon_squeezy_variant_id: variantId,
            lemon_squeezy_status: attributes.status,
            status: attributes.status === 'active' || attributes.status === 'on_trial' ? 'active' : 'expired',
            plan_type: planType,
            trial_end_date: attributes.trial_ends_at,
            next_billing_date: attributes.renews_at,
            billing_cycle_start: attributes.created_at, // Approximation
            amount: attributes.total / 100, // Convert cents to dollars/SAR
            currency: attributes.currency
        });

        // Also update Business table status
        await Business.update(
            {
                current_plan: planType,
                subscription_status: 'active'
            },
            { where: { public_id: businessId } }
        );

        logger.info(`Synced subscription for Business ${businessId}: ${planType}`);
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
}

export default new LemonSqueezyService();
