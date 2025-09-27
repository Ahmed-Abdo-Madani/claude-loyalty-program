// Test secure business authentication and basic operations

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:3001/api/business'

async function testSecureAuth() {
  console.log('🔒 SECURE AUTHENTICATION TEST')
  console.log('=' .repeat(50))

  try {
    // Step 1: Create test business in database
    console.log('\n📝 Step 1: Setting up test business...')
    
    const { Business } = await import('./models/index.js')
    
    const testBusiness = {
      email: 'test-secure-auth@example.com',
      password_hash: 'test-password-123',
      business_name: 'Test Auth Business',
      business_type: 'Testing',
      phone: '+966 50 123-4567',
      owner_name: 'Test Owner',
      region: 'Central Region',
      status: 'active'
    }
    
    // Clean up any existing test business
    await Business.destroy({ where: { email: testBusiness.email } })
    
    const business = await Business.create(testBusiness)
    const secureBusinessId = business.public_id
    console.log(`✅ Test business created: ${business.business_name}`)
    console.log(`✅ Secure Business ID: ${secureBusinessId}`)

    // Step 2: Test login endpoint
    console.log('\n🔑 Step 2: Testing login with secure ID response...')
    
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testBusiness.email,
        password: testBusiness.password_hash
      })
    })
    
    const loginData = await loginResponse.json()
    
    if (loginResponse.ok && loginData.success) {
      console.log('✅ Login successful')
      console.log(`✅ Session token: ${loginData.data.session_token.substring(0, 20)}...`)
      console.log(`✅ Business ID returned: ${loginData.data.business_id}`)
      
      if (loginData.data.business_id === secureBusinessId) {
        console.log('✅ Secure business ID matches!')
      } else {
        console.log('❌ Business ID mismatch!')
        return false
      }
    } else {
      console.log('❌ Login failed:', loginData.message)
      return false
    }

    // Step 3: Test authenticated endpoint
    console.log('\n📋 Step 3: Testing authenticated endpoint...')
    
    const authHeaders = {
      'Content-Type': 'application/json',
      'x-session-token': loginData.data.session_token,
      'x-business-id': loginData.data.business_id
    }
    
    const offersResponse = await fetch(`${API_BASE}/my/offers`, {
      method: 'GET',
      headers: authHeaders
    })
    
    const offersData = await offersResponse.json()
    
    if (offersResponse.ok && offersData.success) {
      console.log('✅ Authenticated request successful')
      console.log(`✅ Retrieved ${offersData.data.length} offers`)
    } else {
      console.log('❌ Authenticated request failed:', offersData.message)
      return false
    }

    // Step 4: Create offer with secure business ID
    console.log('\n🆕 Step 4: Testing offer creation...')
    
    const createOfferResponse = await fetch(`${API_BASE}/my/offers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Test Secure Offer',
        description: 'Testing secure ID system',
        type: 'stamps',
        stamps_required: 5,
        status: 'active'
      })
    })
    
    const createOfferData = await createOfferResponse.json()
    
    if (createOfferResponse.ok && createOfferData.success) {
      console.log('✅ Offer created successfully')
      console.log(`✅ Secure Offer ID: ${createOfferData.data.public_id}`)
      console.log(`✅ Business ID reference: ${createOfferData.data.business_id}`)
      
      if (createOfferData.data.business_id === secureBusinessId) {
        console.log('✅ Offer correctly linked to secure business ID!')
      } else {
        console.log('❌ Offer business ID reference incorrect!')
        return false
      }
    } else {
      console.log('❌ Offer creation failed:', createOfferData.message)
      return false
    }

    // Cleanup
    console.log('\n🧹 Cleanup...')
    await Business.destroy({ where: { public_id: secureBusinessId } })
    console.log('✅ Test data cleaned up')

    console.log('\n🎉 SECURE AUTHENTICATION TEST COMPLETED')
    console.log('✅ All secure authentication features working correctly!')
    return true

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

testSecureAuth()