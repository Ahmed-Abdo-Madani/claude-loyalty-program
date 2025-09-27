// Test script for Google Wallet progress update fixes
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// Test credentials (you'll need to update these with actual session token and business ID)
const SESSION_TOKEN = 'your-session-token-here';
const BUSINESS_ID = 'your-business-id-here';

const headers = {
  'x-session-token': SESSION_TOKEN,
  'x-business-id': BUSINESS_ID,
  'Content-Type': 'application/json'
};

async function testWalletFix() {
  console.log('🧪 Testing Google Wallet Progress Update Fixes\n');

  try {
    // Step 1: Test business login first
    console.log('📧 Step 1: Testing business login...');
    const loginResponse = await fetch(`${BASE_URL}/api/business/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'toni91994@gmail.com', // Update with your business email
        password: 'password123' // Update with your password
      })
    });
    
    const loginData = await loginResponse.json();
    if (loginData.success) {
      console.log('✅ Login successful');
      headers['x-session-token'] = loginData.sessionToken;
      headers['x-business-id'] = loginData.business.id.toString();
    } else {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    // Step 2: Generate test QR data
    console.log('\n🎯 Step 2: Generating test QR data...');
    const testQRResponse = await fetch(`${BASE_URL}/api/business/test/dual-qr-flow`, {
      method: 'POST',
      headers
    });
    
    const testQRData = await testQRResponse.json();
    if (testQRData.success) {
      console.log('✅ Test QR data generated');
      console.log('📝 Customer Token:', testQRData.data.testStep2_CustomerToken.substring(0, 20) + '...');
      console.log('📝 Offer Hash:', testQRData.data.testStep3_OfferHash);
      
      const customerToken = testQRData.data.testStep2_CustomerToken;
      const offerHash = testQRData.data.testStep3_OfferHash;
      const offerId = testQRData.data.offer.id;

      // Step 3: Test progress scan (this should trigger our fixes)
      console.log('\n📱 Step 3: Testing progress scan (triggers wallet update)...');
      const scanResponse = await fetch(`${BASE_URL}/api/business/scan/progress/${customerToken}/${offerHash}`, {
        method: 'POST',
        headers
      });
      
      const scanData = await scanResponse.json();
      if (scanData.success) {
        console.log('✅ Scan successful!');
        console.log('📊 Progress:', `${scanData.data.progress.current_stamps}/${scanData.data.progress.max_stamps} stamps`);
        console.log('📱 Wallet updates:', scanData.data.walletUpdates);
        
        // Check if Google Wallet update succeeded
        const googleWalletUpdate = scanData.data.walletUpdates.find(u => u.platform === 'Google Wallet');
        if (googleWalletUpdate && googleWalletUpdate.success) {
          console.log('🎉 Google Wallet update SUCCESS! (Fix worked!)');
        } else {
          console.log('❌ Google Wallet update still failed');
        }
        
        // Step 4: Debug wallet object status
        console.log('\n🔍 Step 4: Checking wallet object status...');
        const customerId = scanData.data.customer.id;
        const debugResponse = await fetch(`${BASE_URL}/api/business/debug/wallet-object/${customerId}/${offerId}`, {
          headers
        });
        
        const debugData = await debugResponse.json();
        if (debugData.success) {
          console.log('✅ Debug info retrieved:');
          console.log('📝 Object ID:', debugData.data.objectId);
          console.log('💾 Database progress:', debugData.data.database);
          console.log('📱 Wallet status:', debugData.data.wallet);
          console.log('🔄 Synced:', debugData.data.synced ? '✅ YES' : '❌ NO');
        }
        
      } else {
        console.log('❌ Scan failed:', scanData.message);
      }
      
    } else {
      console.log('❌ Test QR generation failed:', testQRData.message);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testWalletFix();