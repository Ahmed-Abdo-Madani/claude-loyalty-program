# 🔍 Google Wallet Progress Update Issues Analysis

## 🚨 Critical Issues Identified

### 1. **Object ID Consistency Issue**
**Problem**: Object IDs between creation and update may not match exactly.
- **Creation**: `${this.issuerId}.${customerData.customerId}_${offerData.offerId}`
- **Update**: `${this.issuerId}.${customerId}_${offerId}`

**Impact**: Google Wallet API returns 404 "Object not found" when trying to update.

**Fix Required**:
```javascript
// In pushProgressUpdate method - Ensure consistent ID format
const objectId = `${this.issuerId}.${customerId}_${offerId}`.replace(/[^a-zA-Z0-9._]/g, '_')
```

### 2. **Progress Data Field Mapping**
**Problem**: Database field names don't match what the update method expects.
- Database uses: `current_stamps`, `max_stamps`, `is_completed`
- Update method may expect: `currentStamps`, `maxStamps`, `isCompleted`

**Current Code**:
```javascript
loyaltyPoints: {
  balance: {
    string: `${progressData.current_stamps}/${progressData.max_stamps}`
  }
}
```

### 3. **Google Wallet API Authorization**
**Problem**: Access tokens may be expired or invalid during update calls.
- Initial generation works (new token issued)
- Updates fail (token reuse or refresh issues)

### 4. **Missing Update Notification Mechanism**
**Problem**: Google Wallet requires specific update patterns to trigger notifications.
- Must use PATCH method with proper headers
- Needs specific field updates to trigger push notifications
- May require webhook configuration

### 5. **Database Transaction Integrity**
**Problem**: Progress updates happen before wallet updates, creating inconsistent states.

**Current Flow**:
1. Update database progress ✅
2. Try to update Apple Wallet ⚠️ (may fail)
3. Try to update Google Wallet ⚠️ (may fail)
4. Return success even if wallet updates failed

## 🔧 Recommended Solutions

### **Solution 1: Fix Object ID Consistency**

Update `realGoogleWalletController.js`:
```javascript
async pushProgressUpdate(customerId, offerId, progressData) {
  try {
    // CRITICAL: Use same ID format as creation
    const objectId = `${this.issuerId}.${customerId}_${offerId}`.replace(/[^a-zA-Z0-9._\-]/g, '_')
    
    console.log(`🔍 Updating Google Wallet object: ${objectId}`)
    
    // First verify object exists
    const authClient = await this.auth.getClient()
    const accessToken = await authClient.getAccessToken()
    
    const checkResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!checkResponse.ok) {
      throw new Error(`Object ${objectId} not found. Status: ${checkResponse.status}`)
    }
    
    // Object exists, proceed with update...
  }
}
```

### **Solution 2: Add Comprehensive Logging**

Add detailed logging to track the update process:
```javascript
async pushProgressUpdate(customerId, offerId, progressData) {
  console.log('📱 Google Wallet Update Started:', {
    customerId,
    offerId,
    issuerId: this.issuerId,
    progressData: {
      current_stamps: progressData.current_stamps,
      max_stamps: progressData.max_stamps,
      is_completed: progressData.is_completed
    }
  })
  
  const objectId = `${this.issuerId}.${customerId}_${offerId}`.replace(/[^a-zA-Z0-9._\-]/g, '_')
  console.log(`🎯 Target Object ID: ${objectId}`)
  
  // ... rest of method
}
```

### **Solution 3: Implement Retry Logic**

Add retry mechanism for failed updates:
```javascript
async pushProgressUpdate(customerId, offerId, progressData, retryCount = 0) {
  const MAX_RETRIES = 3
  
  try {
    // ... update logic
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️ Retry ${retryCount + 1}/${MAX_RETRIES} for wallet update`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return this.pushProgressUpdate(customerId, offerId, progressData, retryCount + 1)
    }
    throw error
  }
}
```

### **Solution 4: Verify Update Success**

Add verification step after update:
```javascript
// After update attempt
const verifyResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken.token}`,
    'Content-Type': 'application/json'
  }
})

if (verifyResponse.ok) {
  const updatedObject = await verifyResponse.json()
  const currentBalance = updatedObject.loyaltyPoints?.balance?.string
  const expectedBalance = `${progressData.current_stamps}/${progressData.max_stamps}`
  
  if (currentBalance !== expectedBalance) {
    throw new Error(`Update verification failed: Expected ${expectedBalance}, got ${currentBalance}`)
  }
  
  console.log('✅ Wallet update verified successfully')
}
```

## 🧪 Testing Strategy

### **1. Test Object ID Consistency**
```javascript
// Test in browser console or create test endpoint
const testData = {
  customerId: 'test123',
  offerId: 'offer456',
  issuerId: '3388000000023017940'
}

// Creation ID format
const creationId = `${testData.issuerId}.${testData.customerId}_${testData.offerId}`.replace(/[^a-zA-Z0-9._]/g, '_')

// Update ID format  
const updateId = `${testData.issuerId}.${testData.customerId}_${testData.offerId}`.replace(/[^a-zA-Z0-9._]/g, '_')

console.log('Creation ID:', creationId)
console.log('Update ID:', updateId)
console.log('Match:', creationId === updateId)
```

### **2. Test Google Wallet API Directly**
Create a test endpoint to verify Google Wallet API calls:
```javascript
router.get('/test/google-wallet/:objectId', async (req, res) => {
  try {
    const { objectId } = req.params
    const controller = await import('../controllers/realGoogleWalletController.js')
    const authClient = await controller.default.auth.getClient()
    const accessToken = await authClient.getAccessToken()
    
    const response = await fetch(`${controller.default.baseUrl}/loyaltyObject/${objectId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      data: data,
      objectId: objectId
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### **3. Monitor Database vs Wallet State**
Add endpoint to compare database progress with wallet state:
```javascript
router.get('/debug/wallet-sync/:customerId/:offerId', async (req, res) => {
  try {
    const { customerId, offerId } = req.params
    
    // Get database progress
    const dbProgress = await CustomerService.findCustomerProgress(customerId, offerId)
    
    // Get wallet object
    const objectId = `3388000000023017940.${customerId}_${offerId}`.replace(/[^a-zA-Z0-9._]/g, '_')
    // ... fetch from Google Wallet API
    
    res.json({
      database: {
        current_stamps: dbProgress?.current_stamps,
        max_stamps: dbProgress?.max_stamps,
        is_completed: dbProgress?.is_completed
      },
      wallet: {
        balance: walletObject?.loyaltyPoints?.balance?.string,
        state: walletObject?.state
      },
      synced: /* comparison logic */
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

## 🎯 Immediate Actions Required

1. **Add comprehensive logging** to `pushProgressUpdate` method
2. **Test object ID consistency** between creation and updates
3. **Verify Google Wallet API authentication** is working for PATCH requests
4. **Create debug endpoints** to monitor wallet sync status
5. **Add retry logic** for failed wallet updates
6. **Implement update verification** to confirm changes took effect

## 📋 Next Steps

1. Apply the fixes above
2. Test with real QR code scanning flow
3. Monitor logs during wallet updates
4. Verify wallet cards update in Google Wallet app
5. Create fallback mechanisms for wallet update failures