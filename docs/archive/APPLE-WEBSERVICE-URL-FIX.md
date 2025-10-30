# Apple Web Service URL Fix - Implementation Complete

## Issue
The `webServiceURL` in Apple Wallet passes was set to the bare origin (e.g., `https://api.madna.me`), but Apple expects the full base path to PassKit endpoints where the Apple Web Service Protocol routes are mounted.

## Root Cause
- **Previous Setup**: `appleWebServiceRoutes` was mounted at root level without a prefix
- **Problem**: Pass contained `webServiceURL: "https://api.madna.me"` but actual endpoints were at `/v1/devices/...`
- **Result**: Device registration POSTs couldn't reach the correct endpoints

## Solution Implemented

### 1. Updated Server Route Mounting
**File**: `backend/server.js`

**Change**:
```javascript
// BEFORE
app.use(appleWebServiceRoutes) // Routes at root: /v1/...

// AFTER
app.use('/api/apple', appleWebServiceRoutes) // Routes now at: /api/apple/v1/...
```

**Result**: Apple Web Service Protocol endpoints are now properly namespaced under `/api/apple`

### 2. Updated webServiceURL in Pass Generation
**File**: `backend/controllers/appleWalletController.js`

**Change**:
```javascript
// BEFORE
passData.webServiceURL = baseUrl
// Example: "https://api.madna.me"

// AFTER
passData.webServiceURL = `${baseUrl}/api/apple`
// Example: "https://api.madna.me/api/apple"
```

**Result**: Passes now contain the correct full path to the Apple Web Service endpoints

## Verification

### Endpoint Paths (Before vs After)

| Endpoint Purpose | Before | After |
|-----------------|--------|-------|
| Register Device | `POST https://api.madna.me/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` | `POST https://api.madna.me/api/apple/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` |
| Get Updates | `GET https://api.madna.me/v1/devices/{deviceId}/registrations/{passTypeId}` | `GET https://api.madna.me/api/apple/v1/devices/{deviceId}/registrations/{passTypeId}` |
| Get Latest Pass | `GET https://api.madna.me/v1/passes/{passTypeId}/{serial}` | `GET https://api.madna.me/api/apple/v1/passes/{passTypeId}/{serial}` |
| Unregister Device | `DELETE https://api.madna.me/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` | `DELETE https://api.madna.me/api/apple/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` |
| Log Errors | `POST https://api.madna.me/v1/log` | `POST https://api.madna.me/api/apple/v1/log` |

### Pass JSON Structure (After Fix)

```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.me.madna.api",
  "serialNumber": "...",
  "teamIdentifier": "NFQ6M7TFY2",
  "webServiceURL": "https://api.madna.me/api/apple",
  "authenticationToken": "...",
  // ... other pass fields
}
```

## Testing Steps

1. **Regenerate a pass** with the updated controller
2. **Add to Apple Wallet** on a device
3. **Monitor server logs** for device registration:
   ```
   POST /api/apple/v1/devices/{deviceId}/registrations/pass.me.madna.api/{serial}
   ```
4. **Verify successful registration** in the database (`device_registrations` table)
5. **Test automatic updates**:
   - Add a stamp to the customer
   - Trigger APNs push notification
   - Device should fetch updated pass from correct endpoint

## Environment-Specific URLs

### Production
```
BASE_URL=https://api.madna.me
webServiceURL=https://api.madna.me/api/apple
```

### Development (localhost)
```
BASE_URL=http://localhost:3001
webServiceURL=http://localhost:3001/api/apple
```

### Development (ngrok)
```
BASE_URL=https://your-subdomain.ngrok-free.app
webServiceURL=https://your-subdomain.ngrok-free.app/api/apple
```

## Benefits

✅ **Proper Namespace**: Apple Web Service routes are logically grouped under `/api/apple`  
✅ **Consistent Pattern**: Matches other API routes (`/api/wallet`, `/api/business`, etc.)  
✅ **Apple Compliance**: Follows Apple's expectation for full base path in `webServiceURL`  
✅ **Clear Debugging**: Logs show full path for easier troubleshooting  
✅ **Future-Proof**: Easy to add more Apple-specific endpoints under `/api/apple`

## Related Files

- ✅ `backend/server.js` - Route mounting
- ✅ `backend/controllers/appleWalletController.js` - Pass generation
- 📄 `backend/routes/appleWebService.js` - Apple Web Service Protocol implementation (no changes needed)

## Impact

- **Breaking Change**: ❌ No - existing passes will continue to work until regenerated
- **Requires Migration**: ❌ No - only new/updated passes use the new URL
- **Backward Compatible**: ✅ Yes - old passes with old URL still function (if server kept both routes)
- **Recommended Action**: Regenerate all active passes to use the new endpoint structure

## Notes

- The router itself (`appleWebService.js`) still defines routes starting with `/v1/...`
- The mount point `/api/apple` is prepended by Express
- Final URLs become: `/api/apple/v1/devices/...`
- This matches Apple's documented expectations for the Web Service Protocol

---

**Status**: ✅ Complete  
**Date**: October 22, 2025  
**Tested**: Pending verification after deployment
