// Direct test of Google Wallet object creation without authentication
import fs from 'fs';
import path from 'path';

// Test data
const testCustomerData = {
  customerId: 'test-customer-direct',
  firstName: 'Test',
  lastName: 'Customer'
};

const testOfferData = {
  offerId: 'test-offer-1',
  businessName: 'Test Business',
  title: 'Buy 10 Get 1 Free',
  description: 'Test loyalty program',
  stamps_required: 10
};

const testProgressData = {
  current_stamps: 0,
  max_stamps: 10,
  is_completed: false
};

async function testWalletObjectCreation() {
  try {
    console.log('🧪 Testing Google Wallet Object Creation Directly...\n');

    // Import the controller
    const controllerModule = await import('./backend/controllers/realGoogleWalletController.js');
    const controller = controllerModule.default;

    console.log('✅ Controller loaded');
    console.log('📝 Issuer ID:', controller.issuerId);

    // Test object ID generation (our main fix)
    const objectId = `${controller.issuerId}.${testCustomerData.customerId}_${testOfferData.offerId}`.replace(/[^a-zA-Z0-9._\-]/g, '_');
    console.log('📝 Generated Object ID:', objectId);

    // Test authentication
    console.log('\n🔐 Testing authentication...');
    const authClient = await controller.auth.getClient();
    const accessToken = await authClient.getAccessToken();
    console.log('✅ Authentication successful');

    // Test loyalty class creation
    console.log('\n🏷️ Testing loyalty class creation...');
    try {
      const loyaltyClass = await controller.createOrUpdateLoyaltyClass(authClient, testOfferData);
      console.log('✅ Loyalty class created/updated:', loyaltyClass.id);
    } catch (classError) {
      console.log('⚠️ Loyalty class error:', classError.message);
    }

    // Test loyalty object creation (this is where our fix should work)
    console.log('\n📱 Testing loyalty object creation...');
    try {
      const loyaltyObject = await controller.createLoyaltyObject(authClient, testCustomerData, testOfferData, testProgressData);
      console.log('✅ Loyalty object created:', loyaltyObject.id);

      // Now test our progress update fix
      console.log('\n🔄 Testing progress update (our main fix)...');
      const updatedProgressData = {
        current_stamps: 1,
        max_stamps: 10,
        is_completed: false
      };

      const updateResult = await controller.pushProgressUpdate(
        testCustomerData.customerId,
        testOfferData.offerId,
        updatedProgressData
      );

      if (updateResult.success) {
        console.log('🎉 PROGRESS UPDATE SUCCESSFUL! Fix worked!');
        console.log('📊 Update details:', updateResult);
      } else {
        console.log('❌ Progress update failed:', updateResult.error);
      }

    } catch (objectError) {
      console.log('❌ Loyalty object error:', objectError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWalletObjectCreation();