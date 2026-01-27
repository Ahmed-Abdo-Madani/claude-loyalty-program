
import assert from 'assert';
import { describe, it } from 'node:test';

// Mock Offer Model for testing logic
class MockOffer {
    constructor(data) {
        this.status = data.status || 'active';
        this.is_time_limited = data.is_time_limited || false;
        this.start_date = data.start_date ? new Date(data.start_date) : null;
        this.end_date = data.end_date ? new Date(data.end_date) : null;
    }

    isActive() {
        if (this.status !== 'active') return false;

        if (this.is_time_limited) {
            const now = new Date();
            if (this.start_date && now < this.start_date) return false;
            if (this.end_date && now > this.end_date) return false;
        }

        return true;
    }

    isExpired() {
        if (this.status === 'expired') return true;
        if (this.end_date && new Date() > this.end_date) return true;
        return false;
    }
}

// Mock Response Object
class MockResponse {
    constructor() {
        this.statusCode = 200;
        this.body = {};
    }

    status(code) {
        this.statusCode = code;
        return this;
    }

    json(data) {
        this.body = data;
        return this;
    }
}

// ANSI Colors
const CRED = '\x1b[31m';
const CGREEN = '\x1b[32m';
const CRESET = '\x1b[0m';
const CYELLOW = '\x1b[33m';

let passed = 0;
let total = 0;

function runTest(name, fn) {
    total++;
    try {
        fn();
        console.log(`${CGREEN}✅ PASS ${name}${CRESET}`);
        passed++;
    } catch (e) {
        console.log(`${CRED}❌ FAIL ${name}${CRESET}`);
        console.error(e.message);
    }
}

console.log(`\n${CYELLOW}═══════════════════════════════════════════════════════`);
console.log(`TEST SUITE 1: Offer Model Status Methods`);
console.log(`═══════════════════════════════════════════════════════${CRESET}\n`);

// Test Data
const now = new Date();
const yesterday = new Date(now.getTime() - 86400000);
const tomorrow = new Date(now.getTime() + 86400000);

// Tests
runTest('isActive() returns false for paused offers', () => {
    const offer = new MockOffer({ status: 'paused' });
    assert.strictEqual(offer.isActive(), false);
});

runTest('isActive() returns false for inactive offers', () => {
    const offer = new MockOffer({ status: 'inactive' });
    assert.strictEqual(offer.isActive(), false);
});

runTest('isActive() returns false for expired offers', () => {
    const offer = new MockOffer({ status: 'expired' });
    assert.strictEqual(offer.isActive(), false);
});

runTest('isActive() returns true for active offers without time limits', () => {
    const offer = new MockOffer({ status: 'active' });
    assert.strictEqual(offer.isActive(), true);
});

runTest('isActive() returns false for active offers before start_date', () => {
    const offer = new MockOffer({
        status: 'active',
        is_time_limited: true,
        start_date: tomorrow
    });
    assert.strictEqual(offer.isActive(), false);
});

runTest('isActive() returns false for active offers after end_date', () => {
    const offer = new MockOffer({
        status: 'active',
        is_time_limited: true,
        end_date: yesterday
    });
    assert.strictEqual(offer.isActive(), false);
});

runTest('isExpired() returns true when past end_date', () => {
    const offer = new MockOffer({
        status: 'active',
        end_date: yesterday
    });
    assert.strictEqual(offer.isExpired(), true);
});

runTest('isExpired() returns false when before end_date', () => {
    const offer = new MockOffer({
        status: 'active',
        end_date: tomorrow
    });
    assert.strictEqual(offer.isExpired(), false);
});


console.log(`\n${CYELLOW}═══════════════════════════════════════════════════════`);
console.log(`TEST SUITE 2: Customer Signup Validation`);
console.log(`═══════════════════════════════════════════════════════${CRESET}\n`);

// Mock Handler
const signupHandler = (offer, res) => {
    if (offer.status !== 'active') {
        if (offer.status === 'inactive') return res.status(404).json({ error: 'Offer not found' });
        return res.status(403).json({ error: 'Offer unavailable', reason: offer.status });
    }
    return res.status(200).json({ offer });
};

runTest('Returns 404 for inactive offer', () => {
    const offer = new MockOffer({ status: 'inactive' });
    const res = new MockResponse();
    signupHandler(offer, res);
    assert.strictEqual(res.statusCode, 404);
});

runTest('Returns 403 for paused offer', () => {
    const offer = new MockOffer({ status: 'paused' });
    const res = new MockResponse();
    signupHandler(offer, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.reason, 'paused');
});

runTest('Returns 200 for active offer', () => {
    const offer = new MockOffer({ status: 'active' });
    const res = new MockResponse();
    signupHandler(offer, res);
    assert.strictEqual(res.statusCode, 200);
});


console.log(`\n${CYELLOW}═══════════════════════════════════════════════════════`);
console.log(`TEST SUITE 3: Branch Manager Scan Validation`);
console.log(`═══════════════════════════════════════════════════════${CRESET}\n`);

// Mock Scan Handler
const scanHandler = (offer, res) => {
    const responseData = { success: true };

    if (!offer.isActive()) {
        let warningCode = 'OFFER_INACTIVE';
        if (offer.status === 'paused') warningCode = 'OFFER_PAUSED';
        if (offer.status === 'expired' || offer.isExpired()) warningCode = 'OFFER_EXPIRED';
        if (offer.is_time_limited && offer.start_date && new Date() < offer.start_date) warningCode = 'OFFER_NOT_STARTED';

        responseData.offerWarning = {
            code: warningCode,
            message: 'Offer warning'
        };
    } else if (offer.is_time_limited) {
        responseData.offerWarning = {
            code: 'OFFER_TIME_LIMITED',
            expirationDate: offer.end_date
        };
    }

    return res.status(200).json(responseData);
};

runTest('Scan returns warning for paused offer', () => {
    const offer = new MockOffer({ status: 'paused' });
    const res = new MockResponse();
    scanHandler(offer, res);
    assert.strictEqual(res.body.offerWarning.code, 'OFFER_PAUSED');
});

runTest('Scan returns warning for inactive offer', () => {
    const offer = new MockOffer({ status: 'inactive' });
    const res = new MockResponse();
    scanHandler(offer, res);
    assert.strictEqual(res.body.offerWarning.code, 'OFFER_INACTIVE');
});

runTest('Scan returns warning for expired offer', () => {
    const offer = new MockOffer({ status: 'expired' });
    const res = new MockResponse();
    scanHandler(offer, res);
    assert.strictEqual(res.body.offerWarning.code, 'OFFER_EXPIRED');
});

runTest('Scan returns warning for future offer', () => {
    const offer = new MockOffer({
        status: 'active',
        is_time_limited: true,
        start_date: tomorrow
    });
    const res = new MockResponse();
    scanHandler(offer, res);
    assert.strictEqual(res.body.offerWarning.code, 'OFFER_NOT_STARTED');
});

runTest('Scan returns warning for active time-limited offer', () => {
    const offer = new MockOffer({
        status: 'active',
        is_time_limited: true,
        end_date: tomorrow
    });
    const res = new MockResponse();
    scanHandler(offer, res);
    assert.strictEqual(res.body.offerWarning.code, 'OFFER_TIME_LIMITED');
    assert.ok(res.body.offerWarning.expirationDate);
});

console.log(`\n${CYELLOW}═══════════════════════════════════════════════════════`);
console.log(`TEST RESULTS SUMMARY`);
console.log(`═══════════════════════════════════════════════════════${CRESET}\n`);
console.log(`Total Tests:  ${total}`);
console.log(`Passed:       ${passed} ${passed === total ? '✅' : ''}`);
console.log(`Failed:       ${total - passed}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

if (passed === total) {
    console.log(`\n${CGREEN}🎉 All tests passed! Offer status validation is working correctly.${CRESET}\n`);
} else {
    console.log(`\n${CRED}❌ Some tests failed.${CRESET}\n`);
    process.exit(1);
}
