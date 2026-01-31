/**
 * Subscription Plan Definitions and Hierarchy
 * Centralized source of truth for all plan-related logic
 */

export const PLAN_HIERARCHY = [
    'free',
    'professional',
    'loyalty_starter',
    'loyalty_growth',
    'loyalty_professional',
    'pos_business',
    'pos_enterprise',
    'enterprise',
    'pos_premium'
];

export const PLAN_DEFINITIONS = {
    // New Plans
    loyalty_starter: {
        name: 'loyalty_starter',
        monthlyPrice: 49,
        annualPrice: 490,
        limits: {
            customers: 500,
            offers: 3,
            locations: 1,
            posOperations: 0,
            terminals: 0
        },
        features: ['basic_offers', 'customer_management']
    },
    loyalty_growth: {
        name: 'loyalty_growth',
        monthlyPrice: 99,
        annualPrice: 990,
        limits: {
            customers: 2000,
            offers: 10,
            locations: 3,
            posOperations: 0,
            terminals: 0
        },
        features: ['basic_offers', 'customer_management', 'multi_location']
    },
    loyalty_professional: {
        name: 'loyalty_professional',
        monthlyPrice: 179,
        annualPrice: 1790,
        limits: {
            customers: 10000,
            offers: Infinity,
            locations: 10,
            posOperations: 0,
            terminals: 0
        },
        features: ['basic_offers', 'unlimited_offers', 'customer_management', 'multi_location', 'advanced_analytics']
    },
    pos_business: {
        name: 'pos_business',
        monthlyPrice: 199,
        annualPrice: 1990,
        limits: {
            customers: 2000,
            offers: Infinity,
            locations: 1,
            posOperations: Infinity,
            terminals: 2
        },
        features: ['basic_offers', 'unlimited_offers', 'customer_management', 'multi_location', 'pos_system', 'inventory_management', 'advanced_analytics']
    },
    pos_enterprise: {
        name: 'pos_enterprise',
        monthlyPrice: 349,
        annualPrice: 3490,
        limits: {
            customers: 10000,
            offers: Infinity,
            locations: 5,
            posOperations: Infinity,
            terminals: 10
        },
        features: ['basic_offers', 'unlimited_offers', 'customer_management', 'multi_location', 'pos_system', 'inventory_management', 'advanced_analytics']
    },
    pos_premium: {
        name: 'pos_premium',
        monthlyPrice: 549,
        annualPrice: 5490,
        limits: {
            customers: Infinity,
            offers: Infinity,
            locations: Infinity,
            posOperations: Infinity,
            terminals: Infinity
        },
        features: ['basic_offers', 'unlimited_offers', 'customer_management', 'multi_location', 'pos_system', 'inventory_management', 'advanced_analytics', 'api_access', 'priority_support']
    },

    // Legacy Plans (Deprecated)
    free: {
        name: 'free',
        price: 0,
        monthlyPrice: 0,
        annualPrice: 0,
        deprecated: true,
        deprecationMessage: 'This plan is deprecated. Please upgrade to a specialized loyalty or POS plan.',
        limits: {
            offers: 1,
            customers: 100,
            posOperations: 20,
            locations: 1,
            terminals: 0
        },
        features: ['basic_offers']
    },
    professional: {
        name: 'professional',
        price: 210,
        monthlyPrice: 210,
        annualPrice: 2100,
        deprecated: true,
        deprecationMessage: 'This plan is deprecated. Please upgrade to a specialized loyalty or POS plan.',
        limits: {
            offers: Infinity,
            customers: 1000,
            posOperations: Infinity,
            locations: 1,
            terminals: 0
        },
        features: ['basic_offers', 'unlimited_offers', 'api_access']
    },
    enterprise: {
        name: 'enterprise',
        basePrice: 570,
        pricePerLocation: 180,
        monthlyPrice: 570,
        annualPrice: 5700,
        deprecated: true,
        deprecationMessage: 'This plan is deprecated. Please contact sales for migration to POS Enterprise/Premium.',
        limits: {
            offers: Infinity,
            customers: Infinity,
            posOperations: Infinity,
            locations: Infinity,
            terminals: Infinity
        },
        features: ['basic_offers', 'unlimited_offers', 'multiple_locations', 'api_access', 'advanced_analytics']
    }
};
