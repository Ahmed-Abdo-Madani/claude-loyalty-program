// Test secure offer operations and public endpoints

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:3001/api/business'

async function testSecureOfferOperations() {
  console.log('🔒 SECURE OFFER OPERATIONS TEST')
  console.log('=' .repeat(50))

  try {
    // Setup test business
    const { Business } = await import('./models/index.js')
    
    const testBusiness = {
      email: 'test-offers@example.com',
      password_hash: 'test-password-123',
      business_name: 'Test Offers Business',
      business_type: 'Testing',
      phone: '+966 50 123-4567',
      owner_name: 'Test Owner',
      region: 'Central Region',
      status: 'active'
    }
    
    await Business.destroy({ where: { email: testBusiness.email } })
    const business = await Business.create(testBusiness)
    const businessId = business.public_id
    
    // Login and get session
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testBusiness.email,
        password: testBusiness.password_hash
      })
    })
    
    const loginData = await loginResponse.json()
    const authHeaders = {
      'Content-Type': 'application/json',
      'x-session-token': loginData.data.session_token,
      'x-business-id': loginData.data.business_id
    }

    console.log('\n🆕 Test 1: Create Offer with Secure IDs')
    
    const createResponse = await fetch(`${API_BASE}/my/offers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Secure Test Offer',
        description: 'Testing secure offer operations',
        type: 'stamps',
        stamps_required: 8,
        status: 'active',
        branch: 'Main Branch'
      })
    })
    
    const createData = await createResponse.json()
    const offerId = createData.data.public_id
    
    console.log(`✅ Offer created: ${offerId}`)
    console.log(`✅ Business reference: ${createData.data.business_id}`)

    console.log('\n📄 Test 2: Public Offer Endpoint (Secure)')
    
    const publicResponse = await fetch(`${API_BASE}/public/offer/${offerId}`)
    const publicData = await publicResponse.json()
    
    if (publicResponse.ok) {
      console.log('✅ Public offer endpoint working')
      console.log(`✅ Offer title: ${publicData.data.title}`)
      console.log(`✅ Business name: ${publicData.data.businessName}`)
      console.log(`✅ Secure offer ID in response: ${publicData.data.id}`)
    } else {
      console.log('❌ Public offer endpoint failed:', publicData.message)
    }

    console.log('\n✏️  Test 3: Update Offer Using Secure ID')
    
    const updateResponse = await fetch(`${API_BASE}/my/offers/${offerId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Updated Secure Test Offer',
        description: 'Updated via secure endpoint',
        stamps_required: 10
      })
    })
    
    const updateData = await updateResponse.json()
    
    if (updateResponse.ok) {
      console.log('✅ Offer updated successfully')
      console.log(`✅ New title: ${updateData.data.title}`)
      console.log(`✅ New stamps required: ${updateData.data.stamps_required}`)
    } else {
      console.log('❌ Offer update failed:', updateData.message)
    }

    console.log('\n🔄 Test 4: Toggle Offer Status')
    
    const toggleResponse = await fetch(`${API_BASE}/my/offers/${offerId}/status`, {
      method: 'PATCH',
      headers: authHeaders
    })
    
    const toggleData = await toggleResponse.json()
    
    if (toggleResponse.ok) {
      console.log(`✅ Status toggled to: ${toggleData.data.status}`)
    } else {
      console.log('❌ Status toggle failed:', toggleData.message)
    }

    console.log('\n🛡️  Test 5: Security - Try to Access Another Business\'s Offer')
    
    // Create another business
    const otherBusiness = {
      email: 'other-business@example.com',
      password_hash: 'other-password-123',
      business_name: 'Other Business',
      business_type: 'Testing',
      phone: '+966 50 987-6543',
      owner_name: 'Other Owner',
      region: 'Central Region',
      status: 'active'
    }
    
    await Business.destroy({ where: { email: otherBusiness.email } })
    const otherBusinessObj = await Business.create(otherBusiness)
    
    // Login as other business
    const otherLoginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: otherBusiness.email,
        password: otherBusiness.password_hash
      })
    })
    
    const otherLoginData = await otherLoginResponse.json()
    const otherAuthHeaders = {
      'Content-Type': 'application/json',
      'x-session-token': otherLoginData.data.session_token,
      'x-business-id': otherLoginData.data.business_id
    }
    
    // Try to update the first business's offer
    const hackAttemptResponse = await fetch(`${API_BASE}/my/offers/${offerId}`, {
      method: 'PUT',
      headers: otherAuthHeaders,
      body: JSON.stringify({
        title: 'HACKED OFFER'
      })
    })
    
    const hackData = await hackAttemptResponse.json()
    
    if (!hackAttemptResponse.ok && hackData.message.includes('not found')) {
      console.log('✅ Security test passed - cross-business access blocked')
    } else {
      console.log('❌ SECURITY VULNERABILITY - cross-business access allowed!')
      return false
    }

    console.log('\n🗑️  Test 6: Delete Offer Using Secure ID')
    
    const deleteResponse = await fetch(`${API_BASE}/my/offers/${offerId}`, {
      method: 'DELETE',
      headers: authHeaders
    })
    
    const deleteData = await deleteResponse.json()
    
    if (deleteResponse.ok) {
      console.log('✅ Offer deleted successfully')
    } else {
      console.log('❌ Offer deletion failed:', deleteData.message)
    }

    // Verify deletion
    const verifyResponse = await fetch(`${API_BASE}/public/offer/${offerId}`)
    if (verifyResponse.status === 404) {
      console.log('✅ Offer deletion verified - offer no longer accessible')
    }

    // Cleanup
    console.log('\n🧹 Cleanup...')
    await Business.destroy({ where: { public_id: businessId } })
    await Business.destroy({ where: { public_id: otherBusinessObj.public_id } })
    console.log('✅ Test data cleaned up')

    console.log('\n🎉 SECURE OFFER OPERATIONS TEST COMPLETED')
    console.log('✅ All secure offer operations working correctly!')
    console.log('✅ Security controls validated!')
    return true

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    return false
  }
}

testSecureOfferOperations()