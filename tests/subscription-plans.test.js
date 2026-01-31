/**
 * Comprehensive Unit Tests for Subscription Plans
 * 
 * Purpose: Validates the new 6-tier subscription plan system (Loyalty & POS)
 * Coverage: Pricing, limits, features, hierarchy, and backward compatibility
 * Uses: Node.js built-in assert module (no external dependencies)
 * Usage: node tests/subscription-plans.test.js
 */

import assert from 'assert';
import SubscriptionService from '../backend/services/SubscriptionService.js';
import { PLAN_DEFINITIONS, PLAN_HIERARCHY } from '../backend/constants/plans.js';
import Subscription from '../backend/models/Subscription.js';
import Business from '../backend/models/Business.js';

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ANSI color codes for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

/**
 * Helper: Run a single test with error handling
 */
function runTest(name, testFn) {
    totalTests++;
    try {
        testFn();
        passedTests++;
        console.log(`${colors.green}✅ PASS${colors.reset} ${name}`);
    } catch (error) {
        failedTests++;
        console.log(`${colors.red}❌ FAIL${colors.reset} ${name}`);
        console.log(`   ${colors.red}${error.message}${colors.reset}`);
        if (error.stack) {
            console.log(`   ${colors.yellow}${error.stack.split('\n')[1].trim()}${colors.reset}`);
        }
    }
}

/**
 * Helper: Assert price calculation
 */
function assertPrice(planType, interval, locationCount, expected) {
    const actual = SubscriptionService.calculatePlanPrice(planType, interval, locationCount);
    assert.strictEqual(actual, expected, `Expected price for ${planType} (${interval}, ${locationCount} locations) to be ${expected} SAR, but got ${actual} SAR`);
}

/**
 * Helper: Assert limit structure
 */
function assertLimits(planType, expectedLimits) {
    const plan = PLAN_DEFINITIONS[planType];
    assert(plan.limits, `Plan ${planType} missing limits object`);
    for (const [key, value] of Object.entries(expectedLimits)) {
        assert.strictEqual(plan.limits[key], value, `Expected ${key} limit for ${planType} to be ${value}, but got ${plan.limits[key]}`);
    }
}

/**
 * Helper: Assert feature access
 */
function assertFeatures(planType, expectedFeatures) {
    const plan = PLAN_DEFINITIONS[planType];
    assert(Array.isArray(plan.features), `Plan ${planType} missing features array`);
    for (const feature of expectedFeatures) {
        assert(plan.features.includes(feature), `Plan ${planType} should include feature "${feature}"`);
    }
}

// =============================================================================
// TEST SUITE 1: Plan Definition Validation
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 1: Plan Definition Validation${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('All new plan types exist in PLAN_DEFINITIONS', () => {
    const newPlans = ['loyalty_starter', 'loyalty_growth', 'loyalty_professional', 'pos_business', 'pos_enterprise', 'pos_premium'];
    newPlans.forEach(planType => {
        assert(PLAN_DEFINITIONS[planType], `Missing plan definition: ${planType}`);
    });
});

runTest('loyalty_starter has correct structure and properties', () => {
    const plan = PLAN_DEFINITIONS.loyalty_starter;
    assert.strictEqual(plan.name, 'loyalty_starter');
    assert.strictEqual(plan.monthlyPrice, 49);
    assert.strictEqual(plan.annualPrice, 490);
    assert(plan.limits, 'Missing limits');
    assert(Array.isArray(plan.features), 'Missing features');
});

runTest('pos_premium has correct structure and properties (unlimited)', () => {
    const plan = PLAN_DEFINITIONS.pos_premium;
    assert.strictEqual(plan.name, 'pos_premium');
    assert.strictEqual(plan.monthlyPrice, 549);
    assert.strictEqual(plan.annualPrice, 5490);
    assert.strictEqual(plan.limits.customers, Infinity);
    assert.strictEqual(plan.limits.offers, Infinity);
});

runTest('Legacy plans marked as deprecated', () => {
    assert.strictEqual(PLAN_DEFINITIONS.free.deprecated, true);
    assert.strictEqual(PLAN_DEFINITIONS.professional.deprecated, true);
    assert.strictEqual(PLAN_DEFINITIONS.enterprise.deprecated, true);
    assert(PLAN_DEFINITIONS.free.deprecationMessage);
});

runTest('All plans have valid limits object with required fields', () => {
    Object.values(PLAN_DEFINITIONS).forEach(plan => {
        assert(plan.limits, `Plan ${plan.name} missing limits`);
        const fields = ['customers', 'offers', 'locations', 'posOperations', 'terminals'];
        fields.forEach(field => {
            assert(field in plan.limits, `Plan ${plan.name} missing limit field: ${field}`);
        });
    });
});

// =============================================================================
// TEST SUITE 2: Price Calculation Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 2: Price Calculation Tests${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('loyalty_starter pricing (monthly/annual)', () => {
    assertPrice('loyalty_starter', 'monthly', 1, 49);
    assertPrice('loyalty_starter', 'annual', 1, 490);
});

runTest('loyalty_growth pricing (monthly/annual)', () => {
    assertPrice('loyalty_growth', 'monthly', 1, 99);
    assertPrice('loyalty_growth', 'annual', 1, 990);
});

runTest('loyalty_professional pricing (monthly/annual)', () => {
    assertPrice('loyalty_professional', 'monthly', 1, 179);
    assertPrice('loyalty_professional', 'annual', 1, 1790);
});

runTest('pos_business pricing (monthly/annual)', () => {
    assertPrice('pos_business', 'monthly', 1, 199);
    assertPrice('pos_business', 'annual', 1, 1990);
});

runTest('pos_enterprise pricing (monthly/annual)', () => {
    assertPrice('pos_enterprise', 'monthly', 1, 349);
    assertPrice('pos_enterprise', 'annual', 1, 3490);
});

runTest('pos_premium pricing (monthly/annual)', () => {
    assertPrice('pos_premium', 'monthly', 1, 549);
    assertPrice('pos_premium', 'annual', 1, 5490);
});

runTest('Legacy free plan always returns 0', () => {
    assertPrice('free', 'monthly', 1, 0);
    assertPrice('free', 'annual', 1, 0);
});

runTest('Legacy professional plan returns 210 SAR', () => {
    assertPrice('professional', 'monthly', 1, 210);
});

runTest('Legacy enterprise plan: location-based pricing', () => {
    assertPrice('enterprise', 'monthly', 1, 570);
    assertPrice('enterprise', 'monthly', 3, 570);
    assertPrice('enterprise', 'monthly', 5, 570 + (2 * 180)); // 930
});

// =============================================================================
// TEST SUITE 3: Limit Enforcement Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 3: Limit Enforcement Tests${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('loyalty_starter limits validation', () => {
    assertLimits('loyalty_starter', {
        customers: 500,
        offers: 3,
        locations: 1,
        posOperations: 0,
        terminals: 0
    });
});

runTest('loyalty_growth limits validation', () => {
    assertLimits('loyalty_growth', {
        customers: 2000,
        offers: 10,
        locations: 3,
        posOperations: 0,
        terminals: 0
    });
});

runTest('loyalty_professional limits validation', () => {
    assertLimits('loyalty_professional', {
        customers: 10000,
        offers: Infinity,
        locations: 10,
        posOperations: 0,
        terminals: 0
    });
});

runTest('pos_business limits validation', () => {
    assertLimits('pos_business', {
        customers: 2000,
        offers: Infinity,
        locations: 1,
        posOperations: Infinity,
        terminals: 2
    });
});

runTest('pos_enterprise limits validation', () => {
    assertLimits('pos_enterprise', {
        customers: 10000,
        offers: Infinity,
        locations: 5,
        posOperations: Infinity,
        terminals: 10
    });
});

runTest('pos_premium limits validation (all Infinity)', () => {
    assertLimits('pos_premium', {
        customers: Infinity,
        offers: Infinity,
        locations: Infinity,
        posOperations: Infinity,
        terminals: Infinity
    });
});

// =============================================================================
// TEST SUITE 4: Plan Hierarchy and Upgrade Paths
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 4: Plan Hierarchy and Upgrade Paths${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('PLAN_HIERARCHY contains all expected plans in order', () => {
    const expected = [
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
    assert.deepStrictEqual(PLAN_HIERARCHY, expected);
});

runTest('Hierarchy index validation (increasing value)', () => {
    const loyaltyStarterIdx = PLAN_HIERARCHY.indexOf('loyalty_starter');
    const loyaltyGrowthIdx = PLAN_HIERARCHY.indexOf('loyalty_growth');
    const posBusinessIdx = PLAN_HIERARCHY.indexOf('pos_business');
    const posPremiumIdx = PLAN_HIERARCHY.indexOf('pos_premium');

    assert(loyaltyGrowthIdx > loyaltyStarterIdx);
    assert(posBusinessIdx > loyaltyGrowthIdx);
    assert(posPremiumIdx > posBusinessIdx);
});

// =============================================================================
// TEST SUITE 5: Feature Access Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 5: Feature Access Tests${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('loyalty_starter features', () => {
    assertFeatures('loyalty_starter', ['basic_offers', 'customer_management']);
});

runTest('loyalty_professional features', () => {
    assertFeatures('loyalty_professional', ['basic_offers', 'unlimited_offers', 'customer_management', 'advanced_analytics']);
});

runTest('pos_business features', () => {
    assertFeatures('pos_business', ['pos_system', 'inventory_management', 'customer_management']);
});

runTest('pos_premium includes exclusive features', () => {
    assertFeatures('pos_premium', ['api_access', 'priority_support']);
});

// =============================================================================
// TEST SUITE 6: getPlanDefinition() Method Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 6: getPlanDefinition() Method Tests${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('getPlanDefinition returns correct object', () => {
    const plan = SubscriptionService.getPlanDefinition('loyalty_starter');
    assert.strictEqual(plan.name, 'loyalty_starter');
});

runTest('getPlanDefinition is case-insensitive', () => {
    const plan = SubscriptionService.getPlanDefinition('LOYALTY_STARTER');
    assert.strictEqual(plan.name, 'loyalty_starter');
});

runTest('getPlanDefinition throws for invalid plan', () => {
    assert.throws(() => SubscriptionService.getPlanDefinition('invalid_plan'), /Invalid plan type/);
});

// =============================================================================
// TEST SUITE 7: getPlanCategory() Method Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 7: getPlanCategory() Method Tests${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('getPlanCategory correctly categorizes all plans', () => {
    assert.strictEqual(SubscriptionService.getPlanCategory('free'), 'legacy');
    assert.strictEqual(SubscriptionService.getPlanCategory('professional'), 'legacy');
    assert.strictEqual(SubscriptionService.getPlanCategory('enterprise'), 'legacy');
    assert.strictEqual(SubscriptionService.getPlanCategory('loyalty_starter'), 'loyalty');
    assert.strictEqual(SubscriptionService.getPlanCategory('pos_business'), 'pos');
    assert.strictEqual(SubscriptionService.getPlanCategory('unknown'), 'unknown');
});

// =============================================================================
// TEST SUITE 8: Backward Compatibility Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 8: Backward Compatibility Tests${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('Legacy free plan limits consistency', () => {
    assertLimits('free', {
        offers: 1,
        customers: 100,
        locations: 1
    });
});

runTest('Legacy pricing still works in calculatePlanPrice', () => {
    assert.strictEqual(SubscriptionService.calculatePlanPrice('free'), 0);
    assert.strictEqual(SubscriptionService.calculatePlanPrice('professional'), 210);
});

// =============================================================================
// TEST SUITE 9: Edge Cases and Error Handling
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 9: Edge Cases and Error Handling${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

runTest('calculatePlanPrice handles null interval', () => {
    // Should default to monthly
    const price = SubscriptionService.calculatePlanPrice('loyalty_starter', null);
    assert.strictEqual(price, 49);
});

runTest('calculatePlanPrice handles undefined locations for enterprise', () => {
    // Should default to 1 location
    const price = SubscriptionService.calculatePlanPrice('enterprise', 'monthly');
    assert.strictEqual(price, 570);
});

runTest('getPlanDefinition handles null/undefined input', () => {
    assert.throws(() => SubscriptionService.getPlanDefinition(null), /Invalid plan type/);
    assert.throws(() => SubscriptionService.getPlanDefinition(undefined), /Invalid plan type/);
});

// =============================================================================
// TEST SUITE 10: Subscription Limit Enforcement Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}TEST SUITE 10: checkSubscriptionLimits Unit Tests (Mocked)${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

// Mocking dependencies for SubscriptionService.checkSubscriptionLimits
const originalFindOne = Business.findOne;
const originalCalculateUsage = SubscriptionService.calculateUsage;

async function runLimitTest(name, config, testFn) {
    // Monkey-patch
    Business.findOne = async () => ({
        public_id: config.businessId,
        current_plan: config.plan
    });
    SubscriptionService.calculateUsage = async () => config.usage;

    await (async () => {
        totalTests++;
        try {
            const result = await SubscriptionService.checkSubscriptionLimits(config.businessId, config.limitType);
            testFn(result);
            passedTests++;
            console.log(`${colors.green}✅ PASS${colors.reset} ${name}`);
        } catch (error) {
            failedTests++;
            console.log(`${colors.red}❌ FAIL${colors.reset} ${name}`);
            console.log(`   ${colors.red}${error.message}${colors.reset}`);
        }
    })();
}

// Restore originals after Suite 10
const restoreSuite10 = () => {
    Business.findOne = originalFindOne;
    SubscriptionService.calculateUsage = originalCalculateUsage;
};

(async () => {
    await runLimitTest('loyalty_starter within customer limit', {
        businessId: 'biz_123',
        plan: 'loyalty_starter',
        limitType: 'customers',
        usage: { customers: 499 }
    }, (result) => {
        assert.strictEqual(result.allowed, true);
        assert(result.message.includes('Within limits'));
    });

    await runLimitTest('loyalty_starter at customer limit (blocked)', {
        businessId: 'biz_123',
        plan: 'loyalty_starter',
        limitType: 'customers',
        usage: { customers: 500 }
    }, (result) => {
        assert.strictEqual(result.allowed, false);
        assert(result.message.includes('limit reached'));
    });

    await runLimitTest('pos_premium unlimited customers', {
        businessId: 'biz_123',
        plan: 'pos_premium',
        limitType: 'customers',
        usage: { customers: 999999 }
    }, (result) => {
        assert.strictEqual(result.allowed, true);
        assert.strictEqual(result.limit, 'unlimited');
    });

    await runLimitTest('loyalty_starter blocked POS operations', {
        businessId: 'biz_123',
        plan: 'loyalty_starter',
        limitType: 'posOperations',
        usage: { posOperations: 0 }
    }, (result) => {
        // loyalty_starter has limit 0, so even 0 is "at or over" logic in enforceLimit (>= 0 is true)
        // Wait, currentUsage >= limit. If usage is 0 and limit is 0, allowed is false. 
        // This is correct as starter doesn't allow POS.
        assert.strictEqual(result.allowed, false);
    });

    await runLimitTest('pos_business within terminal limit', {
        businessId: 'biz_123',
        plan: 'pos_business',
        limitType: 'terminals',
        usage: { terminals: 1 }
    }, (result) => {
        assert.strictEqual(result.allowed, true);
        assert.strictEqual(result.limit, 2);
    });

    restoreSuite10();

    // =============================================================================
    // TEST SUITE 11: Subscription Model Instance Method Tests
    // =============================================================================

    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}TEST SUITE 11: Subscription Model Instance Method Tests${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    runTest('Subscription.canUpgrade logic', () => {
        const sub1 = { plan_type: 'loyalty_starter', status: 'active', isActive: () => true };
        Object.setPrototypeOf(sub1, Subscription.prototype);
        assert.strictEqual(sub1.canUpgrade(), true);

        const sub2 = { plan_type: 'pos_premium', status: 'active', isActive: () => true };
        Object.setPrototypeOf(sub2, Subscription.prototype);
        assert.strictEqual(sub2.canUpgrade(), false, 'Highest tier cannot upgrade');

        const sub3 = { plan_type: 'loyalty_starter', status: 'expired', isActive: () => false };
        Object.setPrototypeOf(sub3, Subscription.prototype);
        assert.strictEqual(sub3.canUpgrade(), false, 'Inactive subscription cannot upgrade');
    });

    runTest('Subscription.canDowngrade logic', () => {
        const sub1 = { plan_type: 'loyalty_growth', status: 'active', isActive: () => true };
        Object.setPrototypeOf(sub1, Subscription.prototype);
        assert.strictEqual(sub1.canDowngrade(), true);

        const sub2 = { plan_type: 'free', status: 'active', isActive: () => true };
        Object.setPrototypeOf(sub2, Subscription.prototype);
        assert.strictEqual(sub2.canDowngrade(), false, 'Lowest tier cannot downgrade');
    });

    runTest('Subscription.calculateProration mid-cycle upgrade', () => {
        const now = new Date();
        const cycleStart = new Date(now);
        cycleStart.setDate(now.getDate() - 15); // 15 days ago
        const cycleEnd = new Date(now);
        cycleEnd.setDate(now.getDate() + 15); // 15 days from now

        const sub = {
            amount: 100, // 100 SAR for 30 days ~= 3.33/day
            billing_cycle_start: cycleStart,
            next_billing_date: cycleEnd
        };
        Object.setPrototypeOf(sub, Subscription.prototype);

        // New plan: 200 SAR
        // Remaining days: 15
        // Unused credit: (100/30) * 15 = 50
        // New cost: (200/30) * 15 = 100
        // Result: 100 - 50 = 50
        const proration = sub.calculateProration(200);
        assert(proration > 45 && proration < 55, `Expected ~50, got ${proration}`);
    });

    runTest('Subscription.calculateProration zero-credit/guard cases', () => {
        const sub = { amount: 100, billing_cycle_start: null, next_billing_date: null };
        Object.setPrototypeOf(sub, Subscription.prototype);
        assert.strictEqual(sub.calculateProration(200), 0, 'Should return 0 for missing dates');
    });

    // =============================================================================
    // TEST SUITE 12: Payment Gateway Mapping Tests
    // =============================================================================

    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}TEST SUITE 12: Payment Gateway Mapping Tests${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // We can't easily call the controller without express mock, but we can test the LemonSqueezyService mappings
    // and the logic that would be used in generateCheckout.
    // In generateCheckout, VARIANT_MAPPING is local, which is hard to test. 
    // However, we can test syncSubscription in LemonSqueezyService.

    // Mocking for syncSubscription
    const originalUpsert = Subscription.upsert;
    const originalUpdate = Business.update;
    let syncResults = null;

    Subscription.upsert = async (data) => { syncResults = data; };
    Business.update = async () => { };

    // Need to mock process.env for variant IDs mapping
    const originalEnv = { ...process.env };
    process.env.LEMONSQUEEZY_VARIANT_ID_LOYALTY_STARTER_MONTHLY = 'v_starter_m';
    process.env.LEMONSQUEEZY_VARIANT_ID_POS_PREMIUM_YEARLY = 'v_premium_y';

    const LemonSqueezyService = (await import('../backend/services/LemonSqueezyService.js')).default;

    await runTest('LemonSqueezyService.syncSubscription: monthly starter', async () => {
        await LemonSqueezyService.syncSubscription('biz_123', {
            id: 'sub_ls_123',
            attributes: {
                variant_id: 'v_starter_m',
                customer_id: 'cust_123',
                status: 'active',
                total: 4900,
                currency: 'SAR'
            }
        });
        assert.strictEqual(syncResults.plan_type, 'loyalty_starter');
        assert.strictEqual(syncResults.amount, 49);
    });

    await runTest('LemonSqueezyService.syncSubscription: annual premium', async () => {
        await LemonSqueezyService.syncSubscription('biz_123', {
            id: 'sub_ls_123',
            attributes: {
                variant_id: 'v_premium_y',
                customer_id: 'cust_123',
                status: 'active',
                total: 549000, // LS uses cents usually, let's assume 5490 SAR = 549000 cents
                currency: 'SAR'
            }
        });
        assert.strictEqual(syncResults.plan_type, 'pos_premium');
    });

    // Cleanup
    Subscription.upsert = originalUpsert;
    Business.update = originalUpdate;
    process.env = originalEnv;

    // =============================================================================
    // TEST RESULTS SUMMARY
    // =============================================================================

    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}TEST RESULTS SUMMARY${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`Total Tests:  ${totalTests}`);
    console.log(`${colors.green}Passed:       ${passedTests} ✅${colors.reset}`);
    if (failedTests > 0) {
        console.log(`${colors.red}Failed:       ${failedTests} ❌${colors.reset}`);
    } else {
        console.log(`Failed:       ${failedTests}`);
    }

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);

    if (failedTests === 0) {
        console.log(`\n${colors.green}🎉 All tests passed! Subscription plan system is working correctly.${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`\n${colors.red}❌ Some tests failed. Please review the plan logic.${colors.reset}\n`);
        process.exit(1);
    }
})();
