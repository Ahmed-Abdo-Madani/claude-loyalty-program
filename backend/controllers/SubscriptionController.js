
import LemonSqueezyService from '../services/LemonSqueezyService.js';
import { Business, Subscription, Branch, Offer, Customer } from '../models/index.js';
import logger from '../config/logger.js';
import { getLocalizedMessage } from '../middleware/languageMiddleware.js';

export const generateCheckout = async (req, res) => {
    try {
        const { variantId: directVariantId, planType: rawPlanType, interval: rawInterval, billingInterval } = req.body;
        const businessId = req.business.public_id;
        const userEmail = req.business.email;

        const planType = (rawPlanType || '').toLowerCase();
        // Support both 'interval' and 'billingInterval' parameters, default to monthly
        const intervalInput = (rawInterval || billingInterval || 'monthly').toLowerCase();
        const interval = (intervalInput === 'yearly' || intervalInput === 'annual' || intervalInput === 'year') ? 'annual' : 'monthly';

        console.log(`🚀 Generating checkout for plan: ${planType}, interval: ${interval}`);

        let targetVariantId = directVariantId;

        // Variant Mapping Configuration
        const VARIANT_MAPPING = {
            // Loyalty Plans
            loyalty_starter: {
                monthly: process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_STARTER_MONTHLY,
                annual: process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_STARTER_YEARLY
            },
            loyalty_growth: {
                monthly: process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_GROWTH_MONTHLY,
                annual: process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_GROWTH_YEARLY
            },
            loyalty_professional: {
                monthly: process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_PROFESSIONAL_MONTHLY,
                annual: process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_PROFESSIONAL_YEARLY
            },

            // POS Plans
            pos_business: {
                monthly: process.env.LEMONSQUEEZY_VARIANT_ID_POS_BUSINESS_MONTHLY,
                annual: process.env.LEMONSQUEEZY_VARIANT_ID_POS_BUSINESS_YEARLY
            },
            pos_enterprise: {
                monthly: process.env.LEMONSQUEEZY_VARIANT_ID_POS_ENTERPRISE_MONTHLY,
                annual: process.env.LEMONSQUEEZY_VARIANT_ID_POS_ENTERPRISE_YEARLY
            },
            pos_premium: {
                monthly: process.env.LEMONSQUEEZY_VARIANT_ID_POS_PREMIUM_MONTHLY,
                annual: process.env.LEMONSQUEEZY_VARIANT_ID_POS_PREMIUM_YEARLY
            }
        };

        // If a direct variantId is not provided, try to derive it from planType
        if (!targetVariantId && planType) {
            // Check for new plan types
            if (VARIANT_MAPPING[planType]) {
                targetVariantId = VARIANT_MAPPING[planType][interval];
            }
            // Backward Compatibility for Legacy Plans
            else if (planType === 'free') {
                return res.status(400).json({ success: false, message: 'Free plan does not require checkout' });
            }
            else if (planType === 'professional') {
                // Map legacy 'professional' to 'loyalty_professional'
                console.warn('⚠️ Legacy plan type "professional" requested. Mapping to "loyalty_professional".');
                targetVariantId = VARIANT_MAPPING.loyalty_professional[interval];
            }
            else if (planType === 'enterprise') {
                // Map legacy 'enterprise' to 'pos_enterprise'
                console.warn('⚠️ Legacy plan type "enterprise" requested. Mapping to "pos_enterprise".');
                targetVariantId = VARIANT_MAPPING.pos_enterprise[interval];
            }
            else if (planType === 'loyalty') {
                // Map generic 'loyalty' to 'loyalty_growth' (middle tier) or legacy env var
                console.warn('⚠️ Generic "loyalty" plan requested. Using legacy configuration or default.');
                targetVariantId = interval === 'annual'
                    ? process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_YEARLY
                    : process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_MONTHLY;

                // Fallback to new structure if legacy vars are missing
                if (!targetVariantId) targetVariantId = VARIANT_MAPPING.loyalty_growth[interval];
            }
            else if (planType === 'pos') {
                // Map generic 'pos' to 'pos_business' (middle tier) or legacy env var
                console.warn('⚠️ Generic "pos" plan requested. Mapping to "pos_business".');

                // If annual is requested, use the new structure directly (since legacy was likely monthly-only)
                if (interval === 'annual') {
                    targetVariantId = VARIANT_MAPPING.pos_business.annual;
                } else {
                    // For monthly, try legacy first, then fall back to new
                    targetVariantId = process.env.LEMONSQUEEZY_VARIANT_ID_POS_MONTHLY || VARIANT_MAPPING.pos_business.monthly;
                }
            }
        }

        if (!targetVariantId) {
            console.error(`❌ Invalid plan type or missing configuration for: ${planType} (${interval})`);
            return res.status(400).json({
                success: false,
                error: 'Invalid plan configuration',
                message: req.locale === 'ar' ? 'الخطة غير متوفرة حالياً' : 'Selected plan is not currently available'
            });
        }

        // Retrieve the checkout URL
        const checkoutUrl = await LemonSqueezyService.createCheckout(businessId, targetVariantId, req.business.email);
        res.json({ success: true, checkoutUrl });
    } catch (error) {
        logger.error('Checkout Generation Error:', error);
        res.status(500).json({
            success: false,
            error: 'Checkout failed',
            message: error.message || 'Failed to initialize checkout session'
        });
    }
};

export const handleWebhook = async (req, res) => {
    try {
        const signature = req.get('X-Signature');
        const payload = req.body;

        if (!LemonSqueezyService.verifyWebhook(signature, payload)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Process webhook in background to avoid timeouts
        LemonSqueezyService.handleWebhook(payload)
            .catch(err => logger.error('Webhook processing error:', err));

        // Return 200 OK immediately
        res.status(200).send('Webhook received');
    } catch (error) {
        logger.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
};

export const getSubscriptionDetails = async (req, res) => {
    try {
        const business = req.business; // Attached by auth middleware
        const businessId = business.public_id;

        const subscription = await Subscription.findOne({
            where: { business_id: businessId, status: ['active', 'trial', 'past_due'] },
            order: [['created_at', 'DESC']]
        });

        const limits = business.getPlanLimits();

        // Calculate usage
        const [offerCount, customerCount, branchCount] = await Promise.all([
            Offer.count({ where: { business_id: businessId } }),
            Customer.count({ where: { business_id: businessId } }),
            Branch.count({ where: { business_id: businessId } })
        ]);

        const usage = {
            offers: offerCount,
            customers: customerCount || business.total_customers,
            locations: branchCount,
            pos_operations: 0 // TODO: Count POS transactions
        };

        const trialInfo = business.isOnTrial() ? {
            days_remaining: business.getRemainingTrialDays(),
            ends_at: business.trial_ends_at
        } : null;

        const subData = {
            plan_type: business.current_plan,
            status: business.subscription_status,
            amount: subscription?.amount || 0,
            currency: subscription?.currency || 'USD',
            billing_cycle_start: subscription?.billing_cycle_start,
            next_billing_date: subscription?.next_billing_date,
            payment_method: {
                has_token: !!subscription?.lemon_squeezy_customer_id, // Simplified
                last4: '****', // We might not have this unless we store it
                brand: 'Card'
            },
            lemon_squeezy_customer_id: subscription?.lemon_squeezy_customer_id
        };

        // Determine update payment URL (Customer Portal)
        // Lemon Squeezy provides a customer portal link, but we usually need to generate it via API or use the store link
        // For now, simpler approach:
        const updatePaymentUrl = subscription?.lemon_squeezy_customer_id
            ? `https://${process.env.LEMONSQUEEZY_STORE_ID}.lemonsqueezy.com/billing`
            : null;

        res.json({
            success: true,
            data: {
                subscription: subData,
                limits,
                usage,
                trial_info: trialInfo,
                recent_payments: [] // Populated from payments table if available
            }
        });

    } catch (error) {
        logger.error('Error fetching subscription details:', error);
        res.status(500).json({
            success: false,
            message: getLocalizedMessage('server.detailsFailed', req.locale || 'ar')
        });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const businessId = req.business.public_id;
        // In a real implementation: Call Lemon Squeezy API to cancel
        // For now, we might just mark it locally or fail if API not ready
        // TODO: Implement LS Cancel API call in Service

        res.status(501).json({ success: false, message: 'Cancellation via API not yet implemented' });
    } catch (error) {
        logger.error('Error cancelling subscription:', error);
        res.status(500).json({ success: false, error: 'Cancellation failed' });
    }
};

export const getPortalUrl = async (req, res) => {
    try {
        const business = req.business;
        const subscription = await Subscription.findOne({
            where: { business_id: business.public_id, status: ['active', 'trial', 'past_due'] },
            order: [['created_at', 'DESC']]
        });

        if (!subscription || !subscription.lemon_squeezy_customer_id) {
            return res.status(404).json({
                success: false,
                message: 'No active subscription found to manage.'
            });
        }

        const portalUrl = await LemonSqueezyService.getCustomerPortalUrl(subscription.lemon_squeezy_customer_id);
        res.json({ success: true, url: portalUrl });
    } catch (error) {
        logger.error('Portal URL Generation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate management portal URL'
        });
    }
};
