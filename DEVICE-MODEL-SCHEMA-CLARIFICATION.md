# Device Model Schema Clarification - Implementation Complete

## Overview

Fixed incorrect field references in `DeviceRegistration.js` that referenced non-existent columns in the `Device` model.

**Implementation Date**: October 22, 2025  
**Status**: ✅ Complete  
**Impact**: Bug fix - corrected attributes array to match actual database schema

---

## Problem Analysis

### Issue Found

In `backend/models/DeviceRegistration.js` line 169:
```javascript
attributes: ['id', 'push_token', 'device_library_id', 'platform']
```

**Problems**:
1. ❌ `device_library_id` - Column doesn't exist (actual name: `device_library_identifier`)
2. ❌ `platform` - Column doesn't exist (stored in JSONB `device_info` field)

### Actual Device Schema

**File**: `backend/models/Device.js`

**Columns**:
- ✅ `id` (INTEGER, primary key)
- ✅ `device_library_identifier` (STRING(100), unique)
- ✅ `push_token` (STRING(200))
- ✅ `device_info` (JSONB) - Contains platform, OS version, etc.
- ✅ `last_seen_at` (DATE)
- ✅ `created_at` (DATE, auto)
- ✅ `updated_at` (DATE, auto)

**What device_info Contains** (JSONB):
```json
{
  "user_agent": "PassKit/1.0 (iPhone; iOS 17.2)",
  "platform": "iOS",
  "os_version": "17.2",
  "device_model": "iPhone14,2",
  "registered_at": "2025-10-22T10:30:00Z"
}
```

---

## Decision: Remove Invalid Field References

After analysis, the decision is to **remove invalid field references** rather than add new columns because:

1. ✅ **Platform is context-specific** - All devices using Apple Wallet are iOS by definition
2. ✅ **JSONB provides flexibility** - Can store varying device metadata without schema changes
3. ✅ **Minimal schema principle** - Keep Device table focused on core identifiers
4. ✅ **Existing design is correct** - device_info JSONB is the right approach

### Why Not Add platform Column?

**Against adding a platform column**:
- Redundant: Apple Wallet = iOS only
- Less flexible: JSONB can store more metadata
- Schema bloat: Unnecessary column for single-platform service
- Already documented: Comments show platform goes in device_info

**If multi-platform support needed in future**:
- Google Wallet devices would use separate table or wallet_type field
- Platform distinction already exists at pass level (wallet_type: 'apple' vs 'google')

---

## Solution Implemented

### Fixed DeviceRegistration.getDevicesForPass()

**File**: `backend/models/DeviceRegistration.js`

**Before** ❌:
```javascript
DeviceRegistration.getDevicesForPass = async function(walletPassId) {
  return await this.findAll({
    where: { wallet_pass_id: walletPassId },
    include: [{
      model: sequelize.models.Device,
      as: 'device',
      attributes: ['id', 'push_token', 'device_library_id', 'platform'] // ❌ Wrong fields
    }],
    order: [['registered_at', 'DESC']]
  })
}
```

**After** ✅:
```javascript
DeviceRegistration.getDevicesForPass = async function(walletPassId) {
  return await this.findAll({
    where: { wallet_pass_id: walletPassId },
    include: [{
      model: sequelize.models.Device,
      as: 'device',
      attributes: ['id', 'push_token', 'device_library_identifier', 'device_info', 'last_seen_at']
    }],
    order: [['registered_at', 'DESC']]
  })
}
```

**Changes**:
- ✅ Fixed: `device_library_id` → `device_library_identifier`
- ✅ Removed: `platform` (doesn't exist as column)
- ✅ Added: `device_info` (JSONB containing platform and other metadata)
- ✅ Added: `last_seen_at` (useful for device activity tracking)

---

## Access Platform Information

### How to Access Platform Data

Since `platform` is stored in the JSONB `device_info` field:

**Example 1: In Query Results**
```javascript
const registrations = await DeviceRegistration.getDevicesForPass(passId)

registrations.forEach(reg => {
  const device = reg.device
  console.log('Device ID:', device.id)
  console.log('Push Token:', device.push_token)
  console.log('Library ID:', device.device_library_identifier)
  
  // Access platform from device_info
  const platform = device.device_info?.platform || 'iOS' // Default to iOS for Apple Wallet
  const osVersion = device.device_info?.os_version
  const userAgent = device.device_info?.user_agent
  
  console.log('Platform:', platform)
  console.log('OS Version:', osVersion)
  console.log('User Agent:', userAgent)
})
```

**Example 2: Sequelize JSONB Query**
```javascript
// Find all iOS 17+ devices
const modernDevices = await Device.findAll({
  where: {
    'device_info.platform': 'iOS',
    'device_info.os_version': {
      [sequelize.Sequelize.Op.gte]: '17.0'
    }
  }
})
```

**Example 3: In APNs Service**
```javascript
// When sending push notifications
const devices = await DeviceRegistration.getDevicesForPass(passId)

for (const registration of devices) {
  const device = registration.device
  
  // All Apple Wallet devices are iOS
  await apnsService.sendNotification(device.push_token, {
    platform: device.device_info?.platform || 'iOS',
    osVersion: device.device_info?.os_version
  })
}
```

---

## Verification

### Database Schema Check

**Run this query to verify schema**:
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'devices'
ORDER BY ordinal_position;
```

**Expected Output**:
```
column_name              | data_type             | is_nullable | column_default
-------------------------|-----------------------|-------------|----------------
id                       | integer               | NO          | nextval('devices_id_seq')
device_library_identifier| character varying(100)| NO          | NULL
push_token               | character varying(200)| NO          | NULL
device_info              | jsonb                 | YES         | '{}'
last_seen_at             | timestamp             | YES         | CURRENT_TIMESTAMP
created_at               | timestamp             | YES         | CURRENT_TIMESTAMP
updated_at               | timestamp             | YES         | CURRENT_TIMESTAMP
```

### Test Query

**Test getDevicesForPass() method**:
```javascript
import DeviceRegistration from './backend/models/DeviceRegistration.js'

// Get devices for a specific pass
const passId = 1
const registrations = await DeviceRegistration.getDevicesForPass(passId)

console.log('Registrations:', registrations.length)

registrations.forEach(reg => {
  console.log({
    registrationId: reg.id,
    deviceId: reg.device.id,
    pushToken: reg.device.push_token,
    libraryId: reg.device.device_library_identifier,
    deviceInfo: reg.device.device_info,
    lastSeen: reg.device.last_seen_at
  })
})
```

**Expected**: No Sequelize errors about unknown columns.

---

## Related Files

### No Changes Needed

These files are already correct:

✅ **backend/models/Device.js**
- Schema matches database
- Comments correctly indicate platform goes in device_info
- All field names are correct

✅ **backend/routes/appleWebService.js**
- Uses Device.findOrCreateDevice() correctly
- Passes device_info with user_agent
- No direct platform references

✅ **backend/migrations/20250120-add-apple-web-service-tables.js**
- Creates correct device_info JSONB column
- No platform column (correct)
- Schema matches model definition

---

## Future Multi-Platform Support (Optional)

If we ever need to support Google Wallet or other platforms:

### Option 1: Keep Current Design (Recommended)
```javascript
// Google Wallet devices would use same Device model
const device = await Device.findOrCreateDevice(deviceId, pushToken, {
  user_agent: req.headers['user-agent'],
  platform: 'Android', // ← Store in device_info
  os_version: '14',
  device_model: 'Pixel 8'
})
```

### Option 2: Add wallet_type to Device (If Needed)
```javascript
// Only if we need to distinguish at table level
ALTER TABLE devices 
ADD COLUMN wallet_type VARCHAR(20) DEFAULT 'apple';

// Then update model
wallet_type: {
  type: DataTypes.STRING(20),
  allowNull: false,
  defaultValue: 'apple',
  validate: {
    isIn: [['apple', 'google']]
  }
}
```

**Recommendation**: Stick with Option 1 (current design) unless we have 100+ different wallet platforms. JSONB is perfect for this use case.

---

## Summary

### What Was Fixed
- ✅ Corrected `device_library_id` → `device_library_identifier` 
- ✅ Removed invalid `platform` field reference
- ✅ Added `device_info` and `last_seen_at` to attributes array
- ✅ Clarified that platform info lives in JSONB device_info

### Why This Approach
- ✅ Maintains schema simplicity
- ✅ Provides flexibility for additional metadata
- ✅ Aligns with existing design patterns
- ✅ No breaking changes or migrations needed
- ✅ Platform info accessible via device_info JSONB

### Impact
- **Database**: No changes (schema already correct)
- **Code**: Fixed attributes array to match actual columns
- **Functionality**: No behavior change (bug fix only)
- **Performance**: No impact

---

**Status**: ✅ Complete - Bug Fixed  
**Migration Required**: No  
**Breaking Changes**: None
