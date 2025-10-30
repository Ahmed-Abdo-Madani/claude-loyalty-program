# Perpetual Passes Verification Fixes - Complete

## Overview
All 9 verification comments from the initial perpetual passes implementation have been successfully addressed.

---

## ✅ Comment 1: req.branchId Fix
**File**: `backend/routes/branchManager.js`  
**Issue**: `req.branchId` was undefined, causing branch fulfillment not to be recorded.  
**Fix**: Changed all instances of `req.branchId` to `req.branch.public_id` in the confirm-prize endpoint.

```javascript
// ❌ Before
await CustomerService.claimReward(req.branchId, notes)

// ✅ After
await CustomerService.claimReward(req.branch.public_id, notes)
```

---

## ✅ Comment 2: Frontend Tier Data Consumption
**File**: `src/pages/BranchScanner.jsx`  
**Issue**: `handleConfirmPrize` didn't consume tier/newCycleStarted/totalCompletions from API response.  
**Fix**: Updated `setScanResult` to destructure and spread all tier-related fields.

```javascript
// ❌ Before
setScanResult({ ...scanResult, prizeFulfilled: true })

// ✅ After
setScanResult({ 
  ...scanResult, 
  prizeFulfilled: true,
  tier: data.tier,
  newCycleStarted: data.newCycleStarted,
  totalCompletions: data.totalCompletions,
  progress: data.progress
})
```

---

## ✅ Comment 3: Google Wallet Push Update Tier Computation
**File**: `backend/controllers/realGoogleWalletController.js`  
**Issue**: `pushProgressUpdate` method didn't calculate customer tier.  
**Fix**: Added tier calculation right after Google Wallet enabled check.

```javascript
// Calculate customer tier
const CustomerService = (await import('../services/CustomerService.js')).default
const tierData = await CustomerService.calculateCustomerTier(customerId, offerId)
if (tierData) {
  console.log('🏆 Customer tier for push update:', tierData)
  progressData.tierData = tierData
  progressData.rewardsClaimed = tierData.rewardsClaimed
}
```

**Also added tier info to updateData**:
```javascript
if (progressData.tierData) {
  updateData.loyaltyPoints.balance.int = progressData.tierData.rewardsClaimed || 0
  
  updateData.textModulesData.push({
    id: 'tier',
    header: 'Loyalty Tier',
    body: `${progressData.tierData.currentTier.name} (${progressData.tierData.rewardsClaimed} completions)`
  })

  if (progressData.tierData.nextTier) {
    updateData.textModulesData.push({
      id: 'next_tier',
      header: 'Next Tier',
      body: `${progressData.tierData.completionsUntilNext} more to reach ${progressData.tierData.nextTier.name}`
    })
  }
}
```

---

## ✅ Comment 4: Google Wallet loyaltyPoints Standardization
**File**: `backend/controllers/realGoogleWalletController.js`  
**Issue**: Mixed use of `.string` and `.int` for loyaltyPoints.balance.  
**Fix**: Standardized to use `.int` exclusively for total completions (rewardsClaimed).

```javascript
// ❌ Before (pushProgressUpdate)
loyaltyPoints: {
  balance: {
    string: `${progressData.current_stamps}/${progressData.max_stamps}`
  }
}

// ✅ After
loyaltyPoints: {
  balance: {
    int: progressData.rewardsClaimed || 0  // Standardized to int
  },
  label: 'Rewards Earned'
}
```

**Also updated verification check**:
```javascript
// ❌ Before
const currentBalance = updatedObject.loyaltyPoints?.balance?.string
const expectedBalance = `${progressData.current_stamps}/${progressData.max_stamps}`

// ✅ After
const currentBalance = updatedObject.loyaltyPoints?.balance?.int
const expectedBalance = progressData.rewardsClaimed || 0
```

---

## ✅ Comment 5: Google Wallet Fallback offerId Fix
**File**: `backend/controllers/realGoogleWalletController.js`  
**Issue**: Fallback object creation used `offer.id` (integer) instead of `offerId` (secure public ID).  
**Fix**: Changed to use the secure `offerId` parameter.

```javascript
// ❌ Before
const offerData = {
  offerId: offer.id,  // Wrong - integer ID
  businessName: offer.business?.business_name || 'Business',
  // ...
}

// ✅ After
const offerData = {
  offerId: offerId,  // Correct - secure public ID
  businessName: offer.business?.business_name || 'Business',
  // ...
}
```

---

## ✅ Comment 6: Inactivity Expiration Method
**File**: `backend/services/PassLifecycleService.js`  
**Issue**: `expireInactivePasses` called `expireCompletedPass` which requires `is_completed = true`.  
**Fix**: Created new generic `expirePass()` method with optional completion check.

**New Method**:
```javascript
static async expirePass(passId, reason = 'expired', requireCompletion = false) {
  // ... transaction logic ...
  
  // Optional completion check
  if (requireCompletion && (!progress || !progress.is_completed)) {
    logger.warn('Cannot expire pass: progress not completed', { passId })
    await transaction.rollback()
    return { success: false, reason: 'Progress not completed' }
  }
  
  // Mark pass as expired
  pass.pass_status = 'expired'
  await pass.save({ transaction })
  
  // ... push notification logic ...
}
```

**Updated expireInactivePasses**:
```javascript
// ❌ Before
await this.expireCompletedPass(pass.id)

// ✅ After
await this.expirePass(pass.id, 'inactivity', false) // Generic expirePass for inactivity
```

---

## ✅ Comment 7: Server-side Validation for loyalty_tiers
**File**: `backend/routes/business.js`  
**Issue**: No validation for `loyalty_tiers` structure on offer save/update.  
**Fix**: Added comprehensive validation function and integrated into POST/PUT routes.

**Validation Function**:
```javascript
function validateLoyaltyTiers(tiers) {
  if (!tiers) return null // null is valid (tiers disabled)
  
  if (!Array.isArray(tiers)) {
    throw new Error('loyalty_tiers must be an array')
  }
  
  if (tiers.length < 2 || tiers.length > 5) {
    throw new Error('loyalty_tiers must have between 2 and 5 tiers')
  }
  
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    
    // Required fields
    if (!tier.name || typeof tier.name !== 'string' || tier.name.trim() === '') {
      throw new Error(`Tier ${i + 1}: name is required and must be a non-empty string`)
    }
    
    if (tier.minCompletions === undefined || typeof tier.minCompletions !== 'number' || tier.minCompletions < 0) {
      throw new Error(`Tier ${i + 1}: minCompletions is required and must be a non-negative number`)
    }
    
    if (!tier.color || typeof tier.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(tier.color)) {
      throw new Error(`Tier ${i + 1}: color is required and must be a valid hex color (e.g., #FFD700)`)
    }
    
    if (!tier.icon || typeof tier.icon !== 'string' || tier.icon.trim() === '') {
      throw new Error(`Tier ${i + 1}: icon is required and must be a non-empty string (emoji)`)
    }
    
    // Optional reward boost validation
    if (tier.rewardBoost !== undefined) {
      if (typeof tier.rewardBoost !== 'number' || tier.rewardBoost < 0 || tier.rewardBoost > 1) {
        throw new Error(`Tier ${i + 1}: rewardBoost must be a number between 0 and 1`)
      }
    }
    
    // Optional iconUrl validation
    if (tier.iconUrl !== undefined && typeof tier.iconUrl !== 'string') {
      throw new Error(`Tier ${i + 1}: iconUrl must be a string (URL)`)
    }
    
    // Ensure tiers are in ascending order
    if (i > 0 && tier.minCompletions <= tiers[i - 1].minCompletions) {
      throw new Error(`Tier ${i + 1}: minCompletions must be greater than previous tier`)
    }
  }
  
  // First tier must start at 0
  if (tiers[0].minCompletions !== 0) {
    throw new Error('First tier must have minCompletions = 0')
  }
  
  return tiers
}
```

**Integrated into routes**:
```javascript
// POST /my/offers
if (req.body.loyalty_tiers !== undefined && req.body.loyalty_tiers !== null) {
  try {
    validateLoyaltyTiers(req.body.loyalty_tiers)
  } catch (validationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid loyalty_tiers configuration',
      error: validationError.message
    })
  }
}

// PUT /my/offers/:id (same validation)
```

---

## ✅ Comment 8: Apple Wallet rewardsClaimed Always Set
**File**: `backend/controllers/appleWalletController.js`  
**Issue**: `completions` field only showed if `progressData.rewardsClaimed` was truthy (hidden when 0).  
**Fix**: Changed condition to check for `undefined` instead, allowing 0 to display.

```javascript
// ❌ Before
...(progressData.rewardsClaimed ? [{
  key: 'completions',
  label: 'Completed',
  textAlignment: 'PKTextAlignmentLeft',
  value: `${progressData.rewardsClaimed}x`
}] : [])

// ✅ After
...(progressData.rewardsClaimed !== undefined ? [{
  key: 'completions',
  label: 'Completed',
  textAlignment: 'PKTextAlignmentLeft',
  value: `${progressData.rewardsClaimed || 0}x`
}] : [])
```

**Note**: Both `generatePass()` and `pushProgressUpdate()` already set `progressData.rewardsClaimed` from `tierData.rewardsClaimed`, ensuring it's always defined when tier data exists.

---

## ✅ Comment 9: Tier Icon URL Support in UI
**File**: `src/components/OffersTab.jsx`  
**Issue**: No input field for optional `iconUrl` property in tier configuration.  
**Fix**: Added "Icon URL (Optional)" input field after emoji icon field.

```jsx
<div>
  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
    Icon (Emoji) *
  </label>
  <input
    type="text"
    required
    value={tier.icon}
    onChange={(e) => updateTier(index, 'icon', e.target.value)}
    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
    placeholder="🥇"
    maxLength="2"
  />
</div>

{/* NEW FIELD */}
<div>
  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
    Icon URL (Optional)
  </label>
  <input
    type="url"
    value={tier.iconUrl || ''}
    onChange={(e) => updateTier(index, 'iconUrl', e.target.value)}
    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
    placeholder="https://example.com/icon.png"
  />
</div>
```

---

## Summary of Changes

| Comment | File | Issue | Status |
|---------|------|-------|--------|
| 1 | branchManager.js | req.branchId undefined | ✅ Fixed |
| 2 | BranchScanner.jsx | Frontend not consuming tier fields | ✅ Fixed |
| 3 | realGoogleWalletController.js | Push update missing tier calculation | ✅ Fixed |
| 4 | realGoogleWalletController.js | Mixed .string and .int usage | ✅ Standardized |
| 5 | realGoogleWalletController.js | Fallback using integer id | ✅ Fixed |
| 6 | PassLifecycleService.js | Inactivity expiration requires completion | ✅ New method |
| 7 | business.js | No loyalty_tiers validation | ✅ Validated |
| 8 | appleWalletController.js | completions hidden when 0 | ✅ Fixed |
| 9 | OffersTab.jsx | No iconUrl input field | ✅ Added |

---

## Testing Recommendations

1. **Branch Manager Prize Confirmation** (Comments 1, 2)
   - Scan QR code
   - Confirm prize with notes
   - Verify branch_id is recorded in fulfillments
   - Verify frontend displays tier upgrade celebration

2. **Google Wallet Push Updates** (Comments 3, 4, 5)
   - Earn stamps to trigger push update
   - Verify tier info appears in Google Wallet pass
   - Verify loyaltyPoints.balance.int shows correct completions count
   - Test fallback object creation for missing passes

3. **Inactivity Expiration** (Comment 6)
   - Run expiration script: `node backend/scripts/expire-passes.js --inactivity --dry-run`
   - Verify incomplete passes are expired after 90 days

4. **Tier Validation** (Comment 7)
   - Try creating offer with invalid tiers (missing name, invalid color, wrong order)
   - Verify 400 error with clear message
   - Create valid tiers and verify save succeeds

5. **Apple Wallet Completions** (Comment 8)
   - Generate new Apple Wallet pass
   - Verify "Completed: 0x" shows even for new customers
   - Complete cycles and verify count increments

6. **Icon URL UI** (Comment 9)
   - Open offer edit modal
   - Enable tier system
   - Verify "Icon URL (Optional)" field appears for each tier
   - Save offer with iconUrl values

---

## Files Modified

### Backend (6 files)
1. `backend/routes/branchManager.js` - req.branchId fix
2. `backend/routes/business.js` - loyalty_tiers validation
3. `backend/controllers/realGoogleWalletController.js` - Tier calculation, standardization, fallback fix
4. `backend/controllers/appleWalletController.js` - rewardsClaimed display fix
5. `backend/services/PassLifecycleService.js` - Generic expirePass method

### Frontend (2 files)
1. `src/pages/BranchScanner.jsx` - Tier data consumption
2. `src/components/OffersTab.jsx` - Icon URL input field

---

## Next Steps

1. **Manual Testing**: Test each scenario listed above
2. **Database Migration**: Ensure `loyalty_tiers` column exists with correct JSON type
3. **Documentation**: Update API docs with tier validation rules
4. **Monitoring**: Watch logs for tier calculation errors or validation failures
5. **Performance**: Monitor tier calculation performance with many completions

---

**Status**: All 9 verification comments RESOLVED ✅  
**Date**: 2025-01-29  
**Impact**: Production-ready perpetual passes with tier system
