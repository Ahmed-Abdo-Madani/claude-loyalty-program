#!/usr/bin/env node

/**
 * Test script for SECURE API endpoints
 * Tests business authentication and CRUD operations with secure IDs
 */

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:3001/api/business'
let testSessionToken = ''
let testBusinessId = ''
let testOfferId = ''

// Test data
const testBusiness = {
  email: 'test-secure@example.com',
  password_hash: 'secure-test-password-123',
  business_name: 'Secure Test Business',
  business_type: 'Testing',
  phone: '+966 50 123-4567',
  owner_name: 'Test Owner',
  region: 'Central Region',
  status: 'active'
}

const testOffer = {
  title: 'Test Secure Offer',
  description: 'Testing secure ID system',
  type: 'stamps',
  stamps_required: 5,
  status: 'active'
}

async function apiRequest(method, endpoint, data = null, headers = {}) {
  const url = `${API_BASE}${endpoint}`
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }
  
  if (data) {
    options.body = JSON.stringify(data)
  }
  
  console.log(`📡 ${method} ${endpoint}`)
  if (data) console.log('   Body:', JSON.stringify(data, null, 2))
  
  const response = await fetch(url, options)
  const result = await response.json()
  
  if (!response.ok) {
    console.log(`❌ Failed: ${response.status} - ${result.message || 'Unknown error'}`)
    return { success: false, error: result.message, status: response.status }
  }
  
  console.log(`✅ Success: ${response.status}`)
  return { success: true, data: result.data, ...result }
}

async function testSecureAPIEndpoints() {
  try {
    console.log('🔒 SECURE API ENDPOINTS TEST')
    console.log('=' .repeat(50))

    // Test 1: Create test business directly in database for login test
    console.log('\n📝 Test 1: Database Setup')
    const { Business } = await import('./models/index.js')
    
    // Clean up any existing test business
    await Business.destroy({ where: { email: testBusiness.email } })
    
    const business = await Business.create(testBusiness)
    testBusinessId = business.public_id
    console.log(`✅ Test business created: ${business.business_name} (ID: ${testBusinessId})`)

    // Test 2: Business Login with Secure ID Response
    console.log('\n🔑 Test 2: Business Login (Secure)')
    const loginResult = await apiRequest('POST', '/login', {
      email: testBusiness.email,
      password: testBusiness.password_hash // Note: using password_hash temporarily for testing
    })

    if (!loginResult.success) {
      console.error('❌ Login failed, aborting tests')
      return false
    }

    testSessionToken = loginResult.data.session_token
    const returnedBusinessId = loginResult.data.business_id
    console.log(`✅ Login successful - Business ID: ${returnedBusinessId}`)
    console.log(`✅ Session Token: ${testSessionToken.substring(0, 20)}...`)

    if (returnedBusinessId !== testBusinessId) {
      console.error('❌ Business ID mismatch! Expected:', testBusinessId, 'Got:', returnedBusinessId)
      return false
    }

    // Test 3: Authenticated Headers
    const authHeaders = {
      'x-session-token': testSessionToken,
      'x-business-id': testBusinessId // Send secure business ID
    }

    // Test 4: Get Business Offers (should be empty initially)
    console.log('\n📋 Test 4: Get Business Offers')
    const offersResult = await apiRequest('GET', '/my/offers', null, authHeaders)
    
    if (offersResult.success) {
      console.log(`✅ Retrieved ${offersResult.data.length} offers`)
    } else {
      console.error('❌ Failed to get offers')
      return false
    }

    // Test 5: Create Business Offer (secure ID generated automatically)
    console.log('\n🆕 Test 5: Create Business Offer')
    const createOfferResult = await apiRequest('POST', '/my/offers', testOffer, authHeaders)
    
    if (createOfferResult.success) {
      testOfferId = createOfferResult.data.public_id
      console.log(`✅ Offer created with secure ID: ${testOfferId}`)
      console.log(`✅ Business ID reference: ${createOfferResult.data.business_id}`)
      
      if (createOfferResult.data.business_id !== testBusinessId) {
        console.error('❌ Offer business_id mismatch!')
        return false
      }
    } else {
      console.error('❌ Failed to create offer')
      return false
    }

    // Test 6: Update Offer Using Secure ID
    console.log('\n✏️  Test 6: Update Offer (Secure ID)')
    const updateOfferResult = await apiRequest('PUT', `/my/offers/${testOfferId}`, {
      title: 'Updated Secure Offer Title',
      description: 'Updated via secure API endpoint'
    }, authHeaders)
    
    if (updateOfferResult.success) {
      console.log(`✅ Offer updated: ${updateOfferResult.data.title}`)
    } else {
      console.error('❌ Failed to update offer')
      return false
    }

    // Test 7: Get Updated Offers List
    console.log('\n📋 Test 7: Verify Updated Offers')
    const updatedOffersResult = await apiRequest('GET', '/my/offers', null, authHeaders)
    
    if (updatedOffersResult.success) {
      console.log(`✅ Retrieved ${updatedOffersResult.data.length} offers`)
      const updatedOffer = updatedOffersResult.data.find(o => o.public_id === testOfferId)
      if (updatedOffer && updatedOffer.title.includes('Updated')) {
        console.log(`✅ Offer update confirmed: "${updatedOffer.title}"`)
      } else {
        console.error('❌ Offer update not reflected')
        return false
      }
    }

    // Test 8: Toggle Offer Status Using Secure ID
    console.log('\n🔄 Test 8: Toggle Offer Status')
    const toggleResult = await apiRequest('PATCH', `/my/offers/${testOfferId}/status`, null, authHeaders)
    
    if (toggleResult.success) {
      console.log(`✅ Offer status toggled: ${toggleResult.data.status}`)
    } else {
      console.error('❌ Failed to toggle offer status')
      return false
    }

    // Test 9: Get Branches (should be empty initially)
    console.log('\n🏢 Test 9: Get Business Branches')
    const branchesResult = await apiRequest('GET', '/my/branches', null, authHeaders)
    
    if (branchesResult.success) {
      console.log(`✅ Retrieved ${branchesResult.data.length} branches`)
    } else {
      console.error('❌ Failed to get branches')
      return false
    }

    // Test 10: Create Branch with Secure Business ID
    console.log('\n🏗️  Test 10: Create Business Branch')
    const createBranchResult = await apiRequest('POST', '/my/branches', {
      name: 'Test Secure Branch',
      city: 'Test City',
      status: 'active'
    }, authHeaders)
    
    if (createBranchResult.success) {
      const branchId = createBranchResult.data.public_id
      console.log(`✅ Branch created with secure ID: ${branchId}`)
      console.log(`✅ Business ID reference: ${createBranchResult.data.business_id}`)
    } else {
      console.error('❌ Failed to create branch')
      return false
    }

    // Test 11: Security Test - Try to access another business's data
    console.log('\n🛡️  Test 11: Security Test - Invalid Business ID')
    const invalidBusinessId = 'biz_invalid123456789012345678'
    const securityTestHeaders = {
      'x-session-token': testSessionToken,
      'x-business-id': invalidBusinessId
    }
    
    const securityResult = await apiRequest('GET', '/my/offers', null, securityTestHeaders)
    
    if (!securityResult.success && securityResult.status === 401) {
      console.log('✅ Security test passed - invalid business ID rejected')
    } else {
      console.error('❌ Security vulnerability - invalid business ID accepted!')
      return false
    }

    // Test 12: Performance Test - Rapid Secure Operations
    console.log('\n⚡ Test 12: Performance Test')
    const startTime = Date.now()
    
    const performancePromises = []
    for (let i = 0; i < 5; i++) {
      performancePromises.push(apiRequest('GET', '/my/offers', null, authHeaders))
    }
    
    await Promise.all(performancePromises)
    const performanceTime = Date.now() - startTime
    console.log(`✅ 5 concurrent secure API calls completed in ${performanceTime}ms`)

    // Cleanup
    console.log('\n🧹 Cleanup: Removing test data')
    await apiRequest('DELETE', `/my/offers/${testOfferId}`, null, authHeaders)
    await Business.destroy({ where: { public_id: testBusinessId } })
    console.log('✅ Test data cleaned up')

    console.log('\n🎉 SECURE API ENDPOINTS TEST COMPLETED')
    console.log('All tests passed! API endpoints are secure and operational.')
    
    return true

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    console.error('Stack trace:', error.stack)
    return false
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecureAPIEndpoints()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test execution failed:', error)
      process.exit(1)
    })
}

export default testSecureAPIEndpoints