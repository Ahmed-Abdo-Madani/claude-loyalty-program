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
            offers: 1,
            locations: 1,
            posOperations: 0,
            terminals: 0
        },
        features: ['online_menu', 'menu_qr_code', 'qr_code_scanning', 'customer_management']
    },
    loyalty_growth: {
        name: 'loyalty_growth',
        monthlyPrice: 99,
        annualPrice: 990,
        limits: {
            customers: 2000,
            offers: 5,
            locations: 3,
            posOperations: 0,
            terminals: 0
        },
        features: ['online_menu', 'menu_qr_code', 'qr_code_scanning', 'customer_management', 'multi_location']
    },
    loyalty_professional: {
        name: 'loyalty_professional',
        monthlyPrice: 179,
        annualPrice: 1790,
        limits: {
            customers: -1,
            offers: -1,
            locations: -1,
            posOperations: 0,
            terminals: 0
        },
        features: ['online_menu', 'menu_qr_code', 'qr_code_scanning', 'unlimited_offers', 'customer_management', 'unlimited_locations']
    },
    pos_business: {
        name: 'pos_business',
        monthlyPrice: 199,
        annualPrice: 1990,
        limits: {
            customers: 1000,
            offers: 1,
            locations: 1,
            posOperations: -1,
            terminals: 2
        },
        features: ['online_menu', 'qr_code_scanning', 'customer_management', 'pos_system', 'unlimited_pos_operations', 'sales_analytics']
    },
    pos_enterprise: {
        name: 'pos_enterprise',
        monthlyPrice: 349,
        annualPrice: 3490,
        limits: {
            customers: -1,
            offers: 5,
            locations: 3,
            posOperations: -1,
            terminals: 10
        },
        features: ['online_menu', 'qr_code_scanning', 'customer_management', 'multi_location', 'pos_system', 'unlimited_pos_operations', 'sales_analytics']
    },
    pos_premium: {
        name: 'pos_premium',
        monthlyPrice: 549,
        annualPrice: 5490,
        limits: {
            customers: -1,
            offers: -1,
            locations: -1,
            posOperations: -1,
            terminals: -1
        },
        features: ['online_menu', 'qr_code_scanning', 'unlimited_offers', 'customer_management', 'unlimited_locations', 'pos_system', 'unlimited_pos_operations', 'sales_analytics', 'api_access', 'priority_support']
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
            offers: -1,
            customers: 1000,
            posOperations: -1,
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
            offers: -1,
            customers: -1,
            posOperations: -1,
            locations: -1,
            terminals: -1
        },
        features: ['basic_offers', 'unlimited_offers', 'multiple_locations', 'api_access', 'advanced_analytics']
    }
};
