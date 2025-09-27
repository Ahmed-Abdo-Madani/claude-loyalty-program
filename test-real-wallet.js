// Test with real database offer
import fs from 'fs';

async function testRealWalletUpdate() {
  try {
    console.log('🧪 Testing Google Wallet Update with Real Database Data\n');

    // Import the controller
    const controllerModule = await import('./backend/controllers/realGoogleWalletController.js');
    const controller = controllerModule.default;

    // Use real offer ID from database
    const realCustomerId = 'demo-customer-test-2';
    const realOfferId = 1; // Real offer from database
    
    console.log('📝 Testing with:');
    console.log('  Customer ID:', realCustomerId);
    console.log('  Offer ID:', realOfferId);

    // Test progress update (this should trigger our fix)
    console.log('\n🔄 Testing progress update with missing object (our fix)...');
    
    const testProgressData = {
      current_stamps: 2,
      max_stamps: 8,
      is_completed: false
    };

    const updateResult = await controller.pushProgressUpdate(
      realCustomerId,
      realOfferId,
      testProgressData
    );

    console.log('\n📊 Result:', updateResult);

    if (updateResult.success) {
      console.log('\n🎉 SUCCESS! Google Wallet progress update worked!');
      console.log('✅ Object was created and updated successfully');
      console.log('✅ Fix is working properly');
      
      // Test a second update to verify updates work on existing objects
      console.log('\n🔄 Testing second update (should work without creation)...');
      const secondUpdate = {
        current_stamps: 3,
        max_stamps: 8,
        is_completed: false
      };
      
      const secondResult = await controller.pushProgressUpdate(
        realCustomerId,
        realOfferId,
        secondUpdate
      );
      
      if (secondResult.success) {
        console.log('🎉 Second update also successful!');
        console.log('✅ Progressive updates working correctly');
      } else {
        console.log('❌ Second update failed:', secondResult.error);
      }
      
    } else {
      console.log('\n❌ FAILED:', updateResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealWalletUpdate();