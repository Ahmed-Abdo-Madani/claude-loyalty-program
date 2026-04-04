import assert from 'assert'
import sequelize from '../../config/database.js'
import { Business, Customer, Offer, CustomerProgress } from '../../models/index.js'
import WalletPass from '../../models/WalletPass.js'
import RealGoogleWalletController from '../../controllers/realGoogleWalletController.js'

// Mock environment
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.com'
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----'

async function runTests() {
    console.log('Starting Google Wallet Payload Validation integration tests...')

    const originalFetch = global.fetch;
    let lastRequestPayload = null;

    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // Setup mock data
        const business = await Business.create({
            public_id: 'biz_payload_test_' + Date.now(),
            business_name: 'Payload Test Business',
            email: `payload_test_${Date.now()}@example.com`,
            password_hash: 'hashed_password_mock'
        });

        const offer = await Offer.create({
            public_id: 'off_payload_test_' + Date.now(),
            business_id: business.public_id,
            title: 'Payload Test Offer',
            stamps_required: 10,
            reward_description: 'Free Item'
        });

        const customer = await Customer.create({
            customer_id: 'cust_payload_test_' + Date.now(),
            business_id: business.public_id,
            first_name: 'Payload',
            last_name: 'Tester',
            phone: `+123${Date.now().toString().slice(-7)}`
        });

        const progress = await CustomerProgress.create({
            customer_id: customer.customer_id,
            offer_id: offer.public_id,
            business_id: business.public_id,
            current_stamps: 3,
            max_stamps: 10,
            is_completed: false,
            rewards_claimed: 0
        });

        // Mock RealGoogleWalletController components
        RealGoogleWalletController.isGoogleWalletEnabled = true;
        RealGoogleWalletController.auth = {
            getClient: async () => ({
                getAccessToken: async () => ({ token: 'mock-token' })
            })
        };
        RealGoogleWalletController.generateSaveToWalletJWT = () => 'mock.jwt';

        // Mock global.fetch to capture payloads
        global.fetch = async (url, options) => {
            if (options && options.body) {
                lastRequestPayload = JSON.parse(options.body);
            }

            if (url.includes('/loyaltyClass')) {
                return {
                    ok: true,
                    json: async () => ({ id: 'mock-class-id', hexBackgroundColor: '#3B82F6' })
                };
            }

            if (url.includes('/loyaltyObject')) {
                return {
                    ok: true,
                    json: async () => ({ id: 'mock-object-id-' + Date.now(), loyaltyPoints: { balance: { int: 0 } } })
                };
            }

            return { ok: true, json: async () => ({}) };
        };

        // Test 1: createLoyaltyObject payload validation
        console.log('\n--- Test 1: createLoyaltyObject payload validation ---');
        const req = {
            body: {
                customerData: { customerId: customer.customer_id, firstName: customer.first_name, lastName: customer.last_name },
                offerData: { offerId: offer.public_id, businessName: business.business_name, stamps_required: 10 },
                progressData: progress.toJSON()
            },
            headers: { 'user-agent': 'payload-test' }
        };
        const res = {
            status: function() { return this; },
            json: function() { return this; }
        };

        await RealGoogleWalletController.generatePass(req, res);
        
        assert(lastRequestPayload, 'Fetch body should have been captured');
        assert.strictEqual(lastRequestPayload.notifyPreference, RealGoogleWalletController.NOTIFY_ON_UPDATE, 'notifyPreference should use the class constant');
        console.log('✅ createLoyaltyObject uses correct notifyPreference constant');

        // Test 2: Local validator guard for invalid enums
        console.log('\n--- Test 2: Validator guard validation ---');
        try {
            RealGoogleWalletController.validateLoyaltyObject({ notifyPreference: 'INVALID_ENUM' });
            assert.fail('Validator should have thrown an error for INVALID_ENUM');
        } catch (error) {
            assert(error.message.includes('Invalid notifyPreference'), 'Error message should be descriptive');
            console.log('✅ Validator correctly rejects invalid enum values');
        }

        // Reset payload capture
        lastRequestPayload = null;

        // Test 3: pushProgressUpdate payload validation
        console.log('\n--- Test 3: pushProgressUpdate payload validation ---');
        await RealGoogleWalletController.pushProgressUpdate(customer.customer_id, offer.public_id, progress.toJSON());

        assert(lastRequestPayload, 'Fetch body should have been captured');
        assert.strictEqual(lastRequestPayload.notifyPreference, 'NOTIFY_ON_UPDATE', 'notifyPreference should be NOTIFY_ON_UPDATE in pushProgressUpdate');
        console.log('✅ pushProgressUpdate uses correct notifyPreference enum');

        console.log('\n🎉 All Google Wallet Payload Validation tests passed!');

        // Cleanup
        await WalletPass.destroy({ where: { customer_id: customer.customer_id } });
        await CustomerProgress.destroy({ where: { id: progress.id } });
        await Offer.destroy({ where: { public_id: offer.public_id } });
        await Customer.destroy({ where: { customer_id: customer.customer_id } });
        await Business.destroy({ where: { public_id: business.public_id } });

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        global.fetch = originalFetch;
        await sequelize.close();
    }
}

runTests();
