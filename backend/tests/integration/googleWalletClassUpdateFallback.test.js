import assert from 'assert'
import sequelize from '../../config/database.js'
import { Business, Customer, Offer, CustomerProgress } from '../../models/index.js'
import WalletPass from '../../models/WalletPass.js'
import RealGoogleWalletController from '../../controllers/realGoogleWalletController.js'

// Need these mock environments for the GoogleAuth library check to pass
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.com'
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----'

async function runTests() {
    console.log('Starting googleWalletClassUpdateFallback integration tests...')

    const originalFetch = global.fetch;

    try {
        await sequelize.authenticate();
        console.log('DB Connected');

        // Setup mock data
        const business = await Business.create({
            public_id: 'biz_gw_test_' + Date.now(),
            business_name: 'Test Business',
            email: `gw_test_${Date.now()}@example.com`,
            password_hash: 'hashed_password_mock'
        });

        const offer = await Offer.create({
            public_id: 'off_gw_test_' + Date.now(),
            business_id: business.public_id,
            title: 'Test Offer',
            stamps_required: 10,
            reward_description: 'Free Coffee'
        });

        const customer = await Customer.create({
            customer_id: 'cust_gw_test_' + Date.now(),
            business_id: business.public_id,
            first_name: 'Test',
            last_name: 'Customer',
            phone: `+123${Date.now().toString().slice(-7)}`
        });

        const progress = await CustomerProgress.create({
            customer_id: customer.customer_id,
            offer_id: offer.public_id,
            business_id: business.public_id,
            current_stamps: 5,
            max_stamps: 10,
            is_completed: false
        });

        // Mock auth to bypass real credentials check
        RealGoogleWalletController.isGoogleWalletEnabled = true;
        RealGoogleWalletController.credentials = {
            client_email: 'test@example.com',
            private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----'
        };
        RealGoogleWalletController.issuerId = 'test-issuer';
        RealGoogleWalletController.auth = {
            getClient: async () => ({
                getAccessToken: async () => ({ token: 'mock-token' })
            })
        };
        RealGoogleWalletController.generateSaveToWalletJWT = () => 'mock.jwt.token';

        // Mock global.fetch to simulate Google API returning the existing class via GET 
        // and throwing a review-status 400 validation error via PATCH
        global.fetch = async (url, options) => {
            if (url.includes('/loyaltyClass')) {
                if (options && options.method === 'PATCH') {
                    // Simulate PATCH failing due to review status validation
                    return {
                        ok: false,
                        status: 400,
                        text: async () => JSON.stringify({
                            error: {
                                code: 400,
                                message: "Invalid review status Optional[APPROVED]."
                            }
                        })
                    };
                }

                if (!options || !options.method || options.method === 'GET') {
                    // Simulate existing class found
                    return {
                        ok: true,
                        json: async () => ({
                            id: url.split('/').pop(),
                            issuerName: business.business_name,
                            programName: offer.title,
                            reviewStatus: 'APPROVED',
                            hexBackgroundColor: '#000000' // Make it differ so PATCH is triggered
                        })
                    };
                }
            }

            if (url.includes('/loyaltyObject')) {
                // Simulate Object creation/update success
                return {
                    ok: true,
                    json: async () => ({
                        id: 'mock_object_id'
                    })
                };
            }

            return originalFetch(url, options);
        };

        const req = {
            body: {
                customerData: { customerId: customer.customer_id, firstName: customer.first_name, lastName: customer.last_name },
                offerData: { offerId: offer.public_id, businessName: business.business_name, stamps_required: 10 },
                progressData: progress.toJSON()
            },
            headers: {
                'user-agent': 'integration-test'
            }
        };

        const res = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.responseData = data; return this; }
        };

        // Trigger generatePass
        await RealGoogleWalletController.generatePass(req, res);

        const responseData = res.responseData;
        assert(responseData, 'Response data should be returned');

        if (responseData.error) {
            throw new Error(`generatePass returned an error: ${responseData.error} - ${responseData.message}`);
        }

        assert.strictEqual(responseData.success, true, 'Wallet pass generation should succeed despite PATCH error');
        assert(responseData.saveUrl, 'Should return saveUrl');
        assert(responseData.jwt, 'Should return jwt');
        assert(responseData.classId, 'Should return classId');
        assert(responseData.objectId, 'Should return objectId');

        console.log('✅ Fallback mechanism successfully recovered from PATCH error');
        console.log('✅ Google Wallet regression test passed!');

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
