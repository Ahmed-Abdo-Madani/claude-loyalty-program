// Simple test to verify server connectivity and secure API endpoints

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:3001/api/business'

console.log('🔒 SECURE API CONNECTIVITY TEST')
console.log('=' .repeat(50))

try {
  console.log('\n📡 Testing server connectivity...')
  const response = await fetch(`${API_BASE}/categories`)
  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ Server is responding')
    console.log(`✅ Categories endpoint returned ${data.data?.length || 0} categories`)
  } else {
    console.log('❌ Server responded with error:', response.status, data.message)
  }
} catch (error) {
  console.error('❌ Connection failed:', error.message)
}

console.log('\nTest completed.')