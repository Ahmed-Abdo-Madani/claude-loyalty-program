#!/usr/bin/env node

/**
 * Test script for SECURE model integration
 * Tests all models with secure IDs working together
 */

import { syncDatabase, seedDatabase, Business, Offer, CustomerProgress, Branch } from './models/index.js'
import SecureIDGenerator from './utils/secureIdGenerator.js'
import logger from './config/logger.js'

async function testSecureModels() {
  try {
    console.log('🔒 SECURE MODEL INTEGRATION TEST')
    console.log('='.repeat(50))

    // Test 1: Secure ID Generation
    console.log('\n📝 Test 1: Secure ID Generation')
    const businessId = SecureIDGenerator.generateBusinessID()
    const offerId = SecureIDGenerator.generateOfferID()
    const branchId = SecureIDGenerator.generateBranchID()
    const customerId = SecureIDGenerator.generateCustomerID()

    console.log(`✅ Business ID: ${businessId} (${businessId.length} chars)`)
    console.log(`✅ Offer ID: ${offerId} (${offerId.length} chars)`)
    console.log(`✅ Branch ID: ${branchId} (${branchId.length} chars)`)
    console.log(`✅ Customer ID: ${customerId} (${customerId.length} chars)`)

    // Test 2: Database Sync
    console.log('\n🔄 Test 2: Database Schema Sync (SECURE)')
    await syncDatabase(true) // Force recreation with secure schema
    console.log('✅ SECURE schema created successfully')

    // Test 3: Model Creation with Secure IDs
    console.log('\n🏗️  Test 3: Model Creation with Secure IDs')

    // Create business
    const business = await Business.create({
      email: 'test@secure.com',
      password_hash: '$2b$10$securehashexample',
      business_name: 'Test Secure Business',
      business_type: 'Testing',
      status: 'active'
    })
    console.log(`✅ Business created: ${business.business_name} (ID: ${business.public_id})`)

    // Create offer
    const offer = await Offer.create({
      business_id: business.public_id,
      title: 'Test Secure Offer',
      description: 'Testing secure relationships',
      type: 'stamps',
      stamps_required: 5,
      status: 'active'
    })
    console.log(`✅ Offer created: ${offer.title} (ID: ${offer.public_id})`)

    // Create branch
    const branch = await Branch.create({
      business_id: business.public_id,
      name: 'Test Secure Branch',
      status: 'active'
    })
    console.log(`✅ Branch created: ${branch.name} (ID: ${branch.public_id})`)

    // Create customer progress
    const customerProgress = await CustomerProgress.create({
      customer_id: SecureIDGenerator.generateCustomerID(),
      offer_id: offer.public_id,
      business_id: business.public_id,
      current_stamps: 2,
      max_stamps: 5,
      customer_name: 'Test Customer',
      customer_phone: '+966 50 123-4567'
    })
    console.log(`✅ Customer Progress created: ${customerProgress.customer_name} (${customerProgress.current_stamps}/${customerProgress.max_stamps} stamps)`)

    // Test 4: Model Associations
    console.log('\n🔗 Test 4: Secure Model Associations')

    // Test business -> offers relationship
    const businessWithOffers = await Business.findByPk(business.public_id, {
      include: [{ model: Offer, as: 'offers' }]
    })
    console.log(`✅ Business has ${businessWithOffers.offers.length} offers`)

    // Test business -> branches relationship
    const businessWithBranches = await Business.findByPk(business.public_id, {
      include: [{ model: Branch, as: 'branches' }]
    })
    console.log(`✅ Business has ${businessWithBranches.branches.length} branches`)

    // Test offer -> business relationship
    const offerWithBusiness = await Offer.findOne({
      where: { public_id: offer.public_id },
      include: [{ model: Business, as: 'business' }]
    })
    console.log(`✅ Offer belongs to: ${offerWithBusiness.business.business_name}`)

    // Test customer progress relationships
    const progressWithRelations = await CustomerProgress.findOne({
      where: { customer_id: customerProgress.customer_id },
      include: [
        { model: Business, as: 'business' },
        { model: Offer, as: 'offer' }
      ]
    })
    console.log(`✅ Customer progress linked to: ${progressWithRelations.business.business_name} - ${progressWithRelations.offer.title}`)

    // Test 5: Secure ID Validation
    console.log('\n🛡️  Test 5: Secure ID Validation')

    const validBizId = SecureIDGenerator.validateSecureID('BIZ_1234567890ABCDEF1234', 'business')
    const validOfferId = SecureIDGenerator.validateSecureID('OFF_1234567890ABCDEF1234', 'offer')
    const validBranchId = SecureIDGenerator.validateSecureID('BCH_1234567890ABCDEF1234', 'branch')
    const validCustomerId = SecureIDGenerator.validateSecureID('CUST_1234567890ABCDEF1234', 'customer')

    console.log(`✅ Business ID validation: ${validBizId}`)
    console.log(`✅ Offer ID validation: ${validOfferId}`)
    console.log(`✅ Branch ID validation: ${validBranchId}`)
    console.log(`✅ Customer ID validation: ${validCustomerId}`)

    // Test 6: Performance Test
    console.log('\n⚡ Test 6: Performance Test - Batch Operations')
    const startTime = Date.now()

    const batchBusinesses = []
    for (let i = 0; i < 10; i++) {
      const biz = await Business.create({
        email: `batch${i}@test.com`,
        password_hash: '$2b$10$batchtest',
        business_name: `Batch Business ${i}`,
        business_type: 'Testing',
        status: 'active'
      })
      batchBusinesses.push(biz)
    }

    const batchTime = Date.now() - startTime
    console.log(`✅ Created 10 businesses in ${batchTime}ms (avg: ${batchTime / 10}ms per business)`)

    // Test 7: Complex Query with Secure IDs
    console.log('\n🔍 Test 7: Complex Query Performance')
    const queryStart = Date.now()

    const businessesWithEverything = await Business.findAll({
      include: [
        { model: Offer, as: 'offers' },
        { model: Branch, as: 'branches' },
        { model: CustomerProgress, as: 'customerProgress' }
      ],
      limit: 5
    })

    const queryTime = Date.now() - queryStart
    console.log(`✅ Complex query for ${businessesWithEverything.length} businesses in ${queryTime}ms`)

    console.log('\n🎉 SECURE MODEL INTEGRATION TEST COMPLETED')
    console.log('All tests passed! Ready for aggressive migration.')

    process.exit(0)

  } catch (error) {
    logger.error('❌ SECURE model test failed', { error: error.message, stack: error.stack })
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testSecureModels()