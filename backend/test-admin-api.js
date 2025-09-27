// Test admin API endpoints
const testEndpoints = async () => {
  const baseUrl = 'http://192.168.8.114:3001'
  
  console.log('🧪 Testing admin API endpoints...')
  
  try {
    // Test 1: Health check (no auth required)
    console.log('1. Testing health check...')
    const healthResponse = await fetch(`${baseUrl}/api/admin/health`)
    const healthData = await healthResponse.json()
    console.log('✅ Health check:', healthData.message)
    
    // Test 2: Login endpoint
    console.log('2. Testing login...')
    const loginResponse = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@loyaltyplatform.com',
        password: 'admin123'
      })
    })
    
    const loginData = await loginResponse.json()
    if (loginData.success) {
      console.log('✅ Login successful')
      const token = loginData.data.access_token
      
      // Test 3: Analytics overview (requires auth)
      console.log('3. Testing analytics overview with auth...')
      const analyticsResponse = await fetch(`${baseUrl}/api/admin/analytics/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const analyticsData = await analyticsResponse.json()
      if (analyticsData.success) {
        console.log('✅ Analytics overview successful')
      } else {
        console.log('❌ Analytics failed:', analyticsData.message)
      }
      
      // Test 4: Businesses endpoint
      console.log('4. Testing businesses endpoint...')
      const businessResponse = await fetch(`${baseUrl}/api/admin/businesses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const businessData = await businessResponse.json()
      if (businessData.success) {
        console.log('✅ Businesses endpoint successful')
      } else {
        console.log('❌ Businesses failed:', businessData.message)
      }
      
    } else {
      console.log('❌ Login failed:', loginData.message)
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.message)
  }
}

testEndpoints()