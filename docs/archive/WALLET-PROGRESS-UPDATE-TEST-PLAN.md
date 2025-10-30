# 🧪 Google Wallet Progress Update - Fix Testing Guide

## 🔍 **Root Cause Identified**
The Google Wallet object `3388000000023017940.demo-customer-123_8` **does not exist** because:
1. Demo scans create new customers in the database
2. But no corresponding Google Wallet objects are created 
3. System tries to update non-existent wallet objects

## ✅ **Fixes Applied**

### **Fix 1: Auto-Create Missing Objects**
- Modified `pushProgressUpdate()` to create missing Google Wallet objects on-demand
- Added comprehensive error handling for 404 object not found errors

### **Fix 2: New Customer Wallet Creation** 
- Modified scanning process to create wallet objects for new customers
- Ensures every new customer progress entry has a corresponding wallet object

### **Fix 3: Debug & Recovery Endpoints**
- Added `/debug/wallet-object/:customerId/:offerId` to check sync status
- Added `/debug/create-wallet-object/:customerId/:offerId` to manually create missing objects

## 🧪 **Testing Procedure**

### **Step 1: Start Servers**
```powershell
# In project root
.\start-dev.ps1
```

### **Step 2: Test the Fixed Demo Scan**
1. Go to `http://localhost:3000`
2. Login to business dashboard
3. Navigate to Scanner tab
4. Click **"Demo Scan"** button
5. **Monitor backend logs** for the new flow

### **Expected New Log Flow:**
```
📱 Google Wallet Update Started: {...}
🎯 Target Object ID: 3388000000023017940.demo-customer-123_8
🔍 Verifying object exists...
❌ Object verification failed: { status: 404, ... }
🔧 Object not found, attempting to create it first...
🔨 Creating missing loyalty object with data: {...}
✅ Missing object created successfully: 3388000000023017940.demo-customer-123_8
📦 Update payload: {...}
✅ Google Wallet push notification sent successfully
📱 Wallet updates completed: [
  { platform: 'Apple Wallet', success: true },
  { platform: 'Google Wallet', success: true }  ← Should be TRUE now
]
```

### **Step 3: Test Debug Endpoint**
Open browser console on dashboard page:
```javascript
// Check wallet object status
fetch('/api/business/debug/wallet-object/demo-customer-123/8', {
  headers: {
    'x-session-token': localStorage.getItem('sessionToken'),
    'x-business-id': localStorage.getItem('businessId')
  }
}).then(r => r.json()).then(console.log)
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "objectId": "3388000000023017940.demo-customer-123_8",
    "database": {
      "current_stamps": 1,
      "max_stamps": 10,
      "is_completed": false
    },
    "wallet": {
      "exists": true,
      "balance": "1/10",
      "state": "ACTIVE"
    },
    "synced": true
  }
}
```

### **Step 4: Test Multiple Scans**
1. Click "Demo Scan" again (should increment to 2 stamps)
2. Check logs for successful update (no object creation needed)
3. Use debug endpoint to verify sync

### **Step 5: Test Manual Object Creation**
If any objects are still missing:
```javascript
// Create missing wallet object
fetch('/api/business/debug/create-wallet-object/demo-customer-123/8', {
  method: 'POST',
  headers: {
    'x-session-token': localStorage.getItem('sessionToken'),
    'x-business-id': localStorage.getItem('businessId')
  }
}).then(r => r.json()).then(console.log)
```

## 🎯 **Success Criteria**

### **✅ Demo Scan Working**
- Demo scan completes without errors
- Both Apple and Google Wallet updates succeed
- Backend shows `{ platform: 'Google Wallet', success: true }`

### **✅ Progress Updates**
- Multiple scans correctly increment stamps
- Database and wallet stay in sync
- No more 404 "Object not found" errors

### **✅ Real QR Scanning** 
- Test with actual QR codes from customer signup flow
- Verify wallet passes update in real Google Wallet app
- Check that customers see updated progress

## 🐛 **Troubleshooting Guide**

### **Issue: Still Getting 404 Errors**
**Cause:** Object ID format mismatch
**Solution:** Check object ID regex pattern consistency

### **Issue: Authentication Errors** 
**Cause:** Google Wallet API credentials
**Solution:** Verify `madna-platform-d8bf716cd142.json` is valid

### **Issue: Object Creation Fails**
**Cause:** Missing offer data or business info
**Solution:** Check database has complete offer information

### **Issue: Updates Don't Appear in Wallet App**
**Cause:** Google Wallet push notifications
**Solution:** May require app restart or network refresh

## 📊 **Monitoring Commands**

### **Backend Logs - Watch for Key Messages:**
```
✅ Missing object created successfully
✅ Google Wallet push notification sent successfully  
📱 Wallet updates completed: [success: true]
```

### **Database Check:**
Connect to PostgreSQL and verify:
```sql
SELECT customer_id, offer_id, current_stamps, max_stamps, is_completed 
FROM customer_progress 
WHERE customer_id LIKE 'demo-customer-%'
ORDER BY created_at DESC;
```

### **Google Wallet API Status:**
Use debug endpoint to verify all objects exist and are synced.

## 🚀 **Next Steps After Testing**

1. **If tests pass:** Deploy fixes to production
2. **If tests fail:** Check specific error messages and debug further  
3. **For real customers:** Run batch creation of missing wallet objects
4. **Monitor production:** Watch for any remaining wallet sync issues

The root cause has been identified and comprehensive fixes implemented. The auto-creation mechanism should resolve the "Object not found" errors permanently.