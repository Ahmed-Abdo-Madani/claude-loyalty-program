import assert from 'assert'
import sequelize from '../../config/database.js'
import { Business, Customer, Offer, Branch, CustomerProgress } from '../../models/index.js'

async function runTests() {
    console.log('Starting branchManagerScan integration tests...')

    try {
        // Ensure DB is connected
        await sequelize.authenticate()
        console.log('DB Connected')

        // Step 1: Create mock data
        const business = await Business.create({
            public_id: 'biz_test_' + Date.now(),
            business_name: 'Test Business',
            email: `test_mgr_scan_${Date.now()}@example.com`,
            password_hash: 'hashed_password_mock'
        })

        const offer = await Offer.create({
            public_id: 'off_test_' + Date.now(),
            business_id: business.public_id,
            title: 'Test Offer',
            stamps_required: 10,
            reward_description: 'Free Coffee'
        })

        const customer = await Customer.create({
            customer_id: 'cust_test_' + Date.now(),
            business_id: business.public_id,
            first_name: 'Test',
            last_name: 'Customer',
            phone: `+123${Date.now().toString().slice(-7)}`
        })

        const branch = await Branch.create({
            public_id: 'branch_test_' + Date.now(),
            business_id: business.public_id,
            name: 'Test Branch',
            password: 'password123',
            manager_pin: '1234'
        })

        const progress = await CustomerProgress.create({
            customer_id: customer.customer_id,
            offer_id: offer.public_id,
            business_id: business.public_id,
            current_stamps: 10,
            max_stamps: 10,
            is_completed: true
        })

        // Step 2: Test guard for invalid branch ID
        let guardPassed = false
        try {
            await progress.claimReward(branch.id, 'Numeric branch ID should fail')
        } catch (err) {
            assert(err.message.includes('Invalid branch identifier format'), 'Expected invalid format error, got: ' + err.message)
            guardPassed = true
        }
        assert(guardPassed, 'Guard should reject numeric branch ID')

        let malformedPrefixGuardPassed = false
        try {
            await progress.claimReward('br_test_123', 'Malformed prefix branch ID should fail')
        } catch (err) {
            assert(err.message.includes('Invalid branch identifier format'), 'Expected invalid format error, got: ' + err.message)
            malformedPrefixGuardPassed = true
        }
        assert(malformedPrefixGuardPassed, 'Guard should reject malformed prefix branch ID')

        // Step 3: Test valid branch public_id
        await progress.claimReward(branch.public_id, 'Valid string branch ID')

        // Refetch to check DB
        const updatedProgress = await CustomerProgress.findOne({
            where: { id: progress.id }
        })

        assert.strictEqual(updatedProgress.fulfilled_by_branch, branch.public_id, 'Should store branch public_id without FK constraints errors')
        assert.strictEqual(updatedProgress.is_completed, false, 'Should reset completed status')
        assert.strictEqual(updatedProgress.current_stamps, 0, 'Should reset stamps')
        assert.strictEqual(updatedProgress.rewards_claimed, 1, 'Should increment rewards claimed')

        console.log('✅ All branchManagerScan tests passed!')

        // Cleanup
        await CustomerProgress.destroy({ where: { id: progress.id } })
        await Branch.destroy({ where: { public_id: branch.public_id } })
        await Offer.destroy({ where: { public_id: offer.public_id } })
        await Customer.destroy({ where: { customer_id: customer.customer_id } })
        await Business.destroy({ where: { public_id: business.public_id } })

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    } finally {
        await sequelize.close()
    }
}

runTests()
