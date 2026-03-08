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
        assert.strictEqual(responseData.brandingFailed, true, 'Should report that branding failed');
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
    }
}

async function runRolloverTests() {
    console.log('\nStarting googleWalletClassRollover integration tests...')

    const originalFetch = global.fetch;

    try {
        await sequelize.authenticate();

        // Setup mock data
        const business = await Business.create({
            public_id: 'biz_gw_rollover_' + Date.now(),
            business_name: 'Rollover Business',
            email: `gw_rollover_${Date.now()}@example.com`,
            password_hash: 'hashed_password_mock'
        });

        const offer = await Offer.create({
            public_id: 'off_gw_rollover_' + Date.now(),
            business_id: business.public_id,
            title: 'Rollover Offer',
            stamps_required: 10,
            reward_description: 'Free Coffee'
        });

        const customer = await Customer.create({
            customer_id: 'cust_gw_rollover_' + Date.now(),
            business_id: business.public_id,
            first_name: 'Roll',
            last_name: 'Over',
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

        // Create an existing wallet pass tied to an older object id
        const existingPass = await WalletPass.create({
            customer_id: customer.customer_id,
            progress_id: progress.id,
            business_id: business.public_id,
            offer_id: offer.public_id,
            wallet_type: 'google',
            wallet_object_id: `test-issuer.${customer.customer_id}_${offer.public_id}`, // old object format
            pass_status: 'active'
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

        let classGetCount = 0;
        let objectPostCount = 0;
        let objectPatchCount = 0;
        let createdObjectId = null;

        // Mock global.fetch
        global.fetch = async (url, options) => {
            if (url.includes('/loyaltyClass')) {
                if (!options || !options.method || options.method === 'GET') {
                    classGetCount++
                    // Simulate class existing and matching
                    return {
                        ok: true,
                        json: async () => ({
                            id: url.split('/').pop(),
                            hexBackgroundColor: '#3B82F6', // matches default
                            programLogo: { sourceUri: { uri: 'https://img.icons8.com/color/200/loyalty-card.png' } }
                        })
                    }
                }
            }

            if (url.includes('/loyaltyObject')) {
                if (options && options.method === 'POST') {
                    objectPostCount++
                    const body = JSON.parse(options.body)
                    createdObjectId = body.id
                    return {
                        ok: true,
                        json: async () => ({ id: body.id, classId: body.classId })
                    }
                }
                if (options && options.method === 'PATCH') {
                    objectPatchCount++
                    return {
                        ok: true,
                        json: async () => ({ id: url.split('/').pop() })
                    }
                }
                if (!options || !options.method || options.method === 'GET') {
                    const objectId = url.split('/').pop()
                    if (objectId === existingPass.wallet_object_id) {
                        // Return the existing object, but assert its class ID is DIFFERENT
                        return {
                            ok: true,
                            json: async () => ({
                                id: objectId,
                                classId: `test-issuer.${String(offer.public_id).replace(/[^a-zA-Z0-9]/g, '_')}_v0` // different class ID
                            })
                        }
                    }
                }
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

        assert.strictEqual(responseData.success, true, 'Wallet pass generation should succeed');
        assert.strictEqual(objectPostCount, 1, 'Should have POSTed a new object because class ID was wrong');
        assert.strictEqual(objectPatchCount, 0, 'Should NOT have PATCHed the old object');
        assert.notStrictEqual(responseData.objectId, existingPass.wallet_object_id, 'New object ID should be different from the old one');

        // Verify database was updated
        const updatedPass = await WalletPass.findByPk(existingPass.id);
        assert.strictEqual(updatedPass.wallet_object_id, createdObjectId, 'Database should be updated with the new object ID');

        console.log('✅ Class migration successful! Wallet object ID updated in DB.');
        console.log('✅ Google Wallet rollover regression test passed!');

        // Cleanup
        await WalletPass.destroy({ where: { customer_id: customer.customer_id } });
        await CustomerProgress.destroy({ where: { id: progress.id } });
        await Offer.destroy({ where: { public_id: offer.public_id } });
        await Customer.destroy({ where: { customer_id: customer.customer_id } });
        await Business.destroy({ where: { public_id: business.public_id } });

    } catch (error) {
        console.error('❌ Rollover Test failed:', error);
        process.exit(1);
    } finally {
        global.fetch = originalFetch;
    }
}

async function runNullObjectIdTests() {
    console.log('\nStarting googleWalletNullObjectId integration tests...')

    const originalFetch = global.fetch;

    try {
        await sequelize.authenticate();

        // Setup mock data
        const business = await Business.create({
            public_id: 'biz_gw_nullobj_' + Date.now(),
            business_name: 'Null Object Business',
            email: `gw_nullobj_${Date.now()}@example.com`,
            password_hash: 'hashed_password_mock'
        });

        const offer = await Offer.create({
            public_id: 'off_gw_nullobj_' + Date.now(),
            business_id: business.public_id,
            title: 'Null Object Offer',
            stamps_required: 10,
            reward_description: 'Free Coffee'
        });

        const customer = await Customer.create({
            customer_id: 'cust_gw_nullobj_' + Date.now(),
            business_id: business.public_id,
            first_name: 'Null',
            last_name: 'Object',
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

        // Create an existing wallet pass with a NULL wallet_object_id
        const existingPass = await WalletPass.create({
            customer_id: customer.customer_id,
            progress_id: progress.id,
            business_id: business.public_id,
            offer_id: offer.public_id,
            wallet_type: 'google',
            wallet_object_id: null, // Critical: NULL ID
            pass_status: 'active'
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

        let objectPostCount = 0;
        let objectPatchCount = 0;
        let createdObjectId = null;

        // Mock global.fetch
        global.fetch = async (url, options) => {
            if (url.includes('/loyaltyClass')) {
                if (!options || !options.method || options.method === 'GET') {
                    // Simulate class existing and matching
                    return {
                        ok: true,
                        json: async () => ({
                            id: url.split('/').pop(),
                            hexBackgroundColor: '#3B82F6', // matches default
                            programLogo: { sourceUri: { uri: 'https://img.icons8.com/color/200/loyalty-card.png' } }
                        })
                    }
                }
            }

            if (url.includes('/loyaltyObject')) {
                const objectId = url.split('/').pop()

                if (options && options.method === 'POST') {
                    objectPostCount++
                    const body = JSON.parse(options.body)
                    createdObjectId = body.id
                    return {
                        ok: true,
                        json: async () => ({ id: body.id, classId: body.classId })
                    }
                }
                if (options && options.method === 'PATCH') {
                    objectPatchCount++
                    return {
                        ok: true,
                        json: async () => ({ id: url.split('/').pop() })
                    }
                }
                if (!options || !options.method || options.method === 'GET') {
                    // Object doesn't exist yet via GET mock
                    return {
                        ok: false,
                        status: 404,
                        json: async () => ({ error: 'Not found' })
                    }
                }
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

        assert.strictEqual(responseData.success, true, 'Wallet pass generation should succeed');
        assert.strictEqual(objectPostCount, 1, 'Should have POSTed a new object because the old one did not exist remotely');
        assert(responseData.objectId, 'Should return a valid objectId');

        // Verify database was updated
        const updatedPass = await WalletPass.findByPk(existingPass.id);
        assert.strictEqual(updatedPass.wallet_object_id, responseData.objectId, 'Database should be updated with the generated object ID');

        console.log('✅ Null Object ID migration successful! Wallet object ID updated in DB.');
        console.log('✅ Null Object ID regression test passed!');

        // Cleanup
        await WalletPass.destroy({ where: { customer_id: customer.customer_id } });
        await CustomerProgress.destroy({ where: { id: progress.id } });
        await Offer.destroy({ where: { public_id: offer.public_id } });
        await Customer.destroy({ where: { customer_id: customer.customer_id } });
        await Business.destroy({ where: { public_id: business.public_id } });

    } catch (error) {
        console.error('❌ Null Object Test failed:', error);
        process.exit(1);
    } finally {
        global.fetch = originalFetch;
    }
}

async function runAll() {
    await runTests();
    await runRolloverTests();
    await runNullObjectIdTests();
    await sequelize.close();
}

runAll();
