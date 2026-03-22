import assert from 'assert'
import express from 'express'
import sequelize from '../../config/database.js'
import { Business, Customer, Offer, CustomerProgress, BusinessSession } from '../../models/index.js'
import businessRoutes from '../../routes/business.js'
import SecureIDGenerator from '../../utils/secureIdGenerator.js'
import CustomerService from '../../services/CustomerService.js'

async function runTests() {
    console.log('Starting dashboardScanner legacy integration tests...')

    const app = express()
    app.use(express.json())
    app.use('/api/business', businessRoutes)

    let server
    let baseUrl

    try {
        await sequelize.authenticate()
        console.log('DB Connected')

        // Start server on random port
        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port
                baseUrl = `http://localhost:${port}/api/business`
                resolve()
            })
        })

        // 1. Create Mock Data
        const business = await Business.create({
            public_id: SecureIDGenerator.generateBusinessID(),
            business_name: 'Dashboard Scan Test Business',
            email: `dash_mgr_scan_${Date.now()}@example.com`,
            password_hash: 'hashed_password_mock',
            status: 'active'
        })

        const sessionToken = 'test_session_' + Date.now()
        await BusinessSession.create({
            business_id: business.public_id,
            session_token: sessionToken,
            is_active: true,
            expires_at: new Date(Date.now() + 1000 * 60 * 60)
        })

        const reqHeaders = {
            'x-business-id': business.public_id,
            'x-session-token': sessionToken
        }

        const offer = await Offer.create({
            public_id: SecureIDGenerator.generateOfferID(),
            business_id: business.public_id,
            title: 'Active Test Offer',
            status: 'active',
            stamps_required: 10,
            reward_description: 'Free Coffee'
        })

        const customer = await Customer.create({
            customer_id: SecureIDGenerator.generateCustomerID(),
            business_id: business.public_id,
            first_name: 'Scan',
            last_name: 'Tester',
            phone: `+123${Date.now().toString().slice(-7)}`
        })

        const progress = await CustomerProgress.create({
            customer_id: customer.customer_id,
            offer_id: offer.public_id,
            business_id: business.public_id,
            current_stamps: 5,
            max_stamps: 10,
            is_completed: false
        })

        const legacyCustomerToken = CustomerService.encodeCustomerToken(customer.customer_id, business.public_id)

        // 2. Test GET /scan/verify fallback when offerHash is not provided
        console.log('Testing GET /scan/verify with token-only legacy payload...')
        const verifyRes = await fetch(`${baseUrl}/scan/verify/${encodeURIComponent(legacyCustomerToken)}`, {
            headers: reqHeaders
        })
        const verifyData = await verifyRes.json()
        console.log('Verify Response:', JSON.stringify(verifyData, null, 2))
        assert.strictEqual(verifyRes.status, 200, `Expected 200 OK, got ${verifyRes.status}: ${JSON.stringify(verifyData)}`)
        assert.strictEqual(verifyData.data.customer.id.startsWith('cust_'), true)
        assert.strictEqual(verifyData.data.offer.id, offer.public_id, 'Should auto-detect active offer when hash is omitted')

        // 3. Test POST /scan/progress fallback
        console.log('Testing POST /scan/progress with token-only legacy payload...')
        const progressRes = await fetch(`${baseUrl}/scan/progress/${encodeURIComponent(legacyCustomerToken)}`, {
            method: 'POST',
            headers: reqHeaders
        })
        const progressData = await progressRes.json()
        console.log('Progress Response:', JSON.stringify(progressData, null, 2))
        assert.strictEqual(progressRes.status, 200, `Expected 200 OK, got ${progressRes.status}: ${JSON.stringify(progressData)}`)
        assert.strictEqual(progressData.success, true)
        assert.strictEqual(progressData.data.progress.current_stamps, 6, 'Should add 1 stamp to the auto-detected offer')

        // 4. Refetch progress to verify DB write
        const updatedProgress = await CustomerProgress.findOne({ where: { id: progress.id } })
        assert.strictEqual(updatedProgress.current_stamps, 6)

        console.log('✅ All dashboardScanner tests passed!')

        // Cleanup
        await BusinessSession.destroy({ where: { business_id: business.public_id } })
        await CustomerProgress.destroy({ where: { id: progress.id } })
        await Offer.destroy({ where: { public_id: offer.public_id } })
        await Customer.destroy({ where: { customer_id: customer.customer_id } })
        await Business.destroy({ where: { public_id: business.public_id } })

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve))
        }
        await sequelize.close()
    }
}

runTests()
