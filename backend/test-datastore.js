import dataStore from './models/DataStore.js'

async function testDataStore() {
  try {
    console.log('🔍 Testing DataStore initialization...')
    await dataStore.init()
    console.log('✅ DataStore initialized successfully')
    
    const businesses = dataStore.getBusinesses()
    console.log(`📊 Found ${businesses.length} businesses`)
    
    if (businesses.length > 0) {
      const testBusiness = businesses.find(b => b.email === 'info@alamalrestaurant.sa')
      if (testBusiness) {
        console.log('✅ Test business found:', testBusiness.business_name)
        console.log('🔑 Has password:', !!testBusiness.password)
        if (testBusiness.password) {
          console.log('🔑 Password value:', testBusiness.password)
        }
      } else {
        console.log('❌ Test business not found')
      }
    }
  } catch (error) {
    console.error('❌ DataStore test failed:', error)
  }
}

testDataStore()