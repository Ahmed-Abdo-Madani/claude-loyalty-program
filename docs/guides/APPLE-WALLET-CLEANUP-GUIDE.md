# Apple Wallet Pass Cleanup Guide

## Problem Overview

After deploying the authentication token consistency fix, old Apple Wallet passes created before the fix have mismatched authentication tokens. This causes harmless but noisy "Invalid authentication token" errors in production logs when users delete old passes.

## Solution: Two-Step Cleanup Process

### Step 1: Clean Up Render Environment Variables (Remove Misleading Warning)

The warning "APNs certificate not found at: /opt/render/project/src/backend/certificates/pass.p12" appears because Render has both certificate loading methods configured.

**Action Required:**
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Navigate to your `api.madna.me` service
3. Click on **Environment** tab
4. Look for `APNS_CERT_PATH` environment variable
5. If it exists, **DELETE IT** (click the X button)
6. **Keep these variables** (DO NOT DELETE):
   - `APPLE_PASS_CERTIFICATE_BASE64` ✅
   - `APPLE_PASS_CERTIFICATE_PASSWORD` ✅
   - `APPLE_PASS_TYPE_ID` ✅
   - `APNS_TOPIC` ✅ (or fallback to APPLE_PASS_TYPE_ID)
   - `APNS_PRODUCTION=true` ✅

7. Click **Save Changes**
8. Render will automatically redeploy

**Expected Result:**
- Warning message will disappear from logs
- APNs will continue working perfectly (using environment variable certificate)

---

### Step 2: Run Database Migration to Clean Up Old Passes

This migration removes old Apple Wallet passes that have authentication token mismatches.

#### Option A: Run Migration on Render (Recommended)

1. **SSH into Render shell:**
   ```bash
   # In Render dashboard, go to Shell tab, then run:
   cd /opt/render/project/src
   node backend/migrations/run-cleanup-migration.js
   ```

2. **Verify results:**
   Check the migration output for summary:
   ```
   📊 Migration Summary:
      - Apple Wallet passes deleted: X
      - Device registrations removed: X
      - Status: All old passes marked as 'deleted'
   ```

#### Option B: Run Migration via Render Deploy (Alternative)

If you can't access the shell, you can trigger it during deployment:

1. Temporarily add to `package.json` scripts:
   ```json
   "scripts": {
     "postinstall": "node backend/migrations/run-cleanup-migration.js || true"
   }
   ```

2. Push to GitHub:
   ```bash
   git add package.json
   git commit -m "chore: run Apple Wallet cleanup migration"
   git push origin main
   ```

3. Migration will run automatically during Render deployment

4. **IMPORTANT:** Remove the postinstall script after migration completes:
   ```bash
   # Remove the postinstall line from package.json
   git add package.json
   git commit -m "chore: remove cleanup migration from postinstall"
   git push origin main
   ```

---

## What the Migration Does

### Affected Data:
- **Apple Wallet passes** created before `2025-10-21 16:00:00 UTC`
- **Device registrations** associated with those passes

### Actions Taken:
1. **Marks passes as deleted** (soft delete - data preserved)
   - Changes `pass_status` from `'active'` to `'deleted'`
   - Updates `updated_at` timestamp
   - Data remains in database for analytics

2. **Deletes device registrations**
   - Removes entries from `device_registrations` table
   - Prevents iOS devices from attempting to unregister
   - Stops "Invalid authentication token" errors

### Safe Rollback:
If needed, you can rollback the migration:
```bash
# This will restore passes to 'active' status
# Note: Device registrations won't be restored
node backend/migrations/rollback-cleanup.js
```

---

## Impact on Users

### What Users Will See:
- **Old passes on devices:** Will appear as expired or deleted
- **Accessing the offer:** Users can get a new pass by scanning the QR code again
- **New passes:** Will have correct authentication tokens and work perfectly

### What You'll See:
- ✅ No more "Invalid authentication token" errors in logs
- ✅ No more "APNs certificate not found" warnings (after Step 1)
- ✅ Clean logs showing only legitimate errors
- ✅ Pass updates working correctly for new passes

---

## Verification After Cleanup

### 1. Check Production Logs:
```
# Should see successful migration output:
📊 Migration Summary:
   - Apple Wallet passes deleted: X
   - Device registrations removed: Y
```

### 2. Monitor for Errors:
After cleanup, you should NOT see:
- ❌ "Invalid authentication token" errors
- ❌ "APNs certificate not found" warnings

### 3. Test New Pass Flow:
1. Scan QR code on production
2. Add pass to Apple Wallet
3. Scan again to earn stamps
4. Verify pass updates automatically
5. Check logs for successful push notifications

---

## Timeline Recommendation

**Immediate (Step 1):**
- Remove `APNS_CERT_PATH` from Render environment
- Takes 5 minutes, eliminates warning immediately

**Within 24 hours (Step 2):**
- Run database migration to clean up old passes
- Takes 2 minutes to run, immediate effect
- Old passes already have issues, cleaning them up ASAP is better

---

## FAQ

**Q: Will this affect Google Wallet passes?**
A: No, migration only touches Apple Wallet passes.

**Q: Will active users lose their progress?**
A: No, progress is stored separately in `customer_progress` table. When users scan QR code again, they'll get a new pass with their existing progress.

**Q: Can I restore deleted passes?**
A: Yes, the migration uses soft delete. You can restore by running the `down()` migration, but device registrations won't be restored.

**Q: Is this migration reversible?**
A: Partially. Passes can be restored to 'active', but device registrations are permanently deleted (which is fine, users just need to re-add passes).

**Q: What if migration fails?**
A: Migration is wrapped in try-catch. If it fails, no changes are made. Check error logs and contact support.

---

## Support

If you encounter issues:
1. Check production logs for error details
2. Verify environment variables are correct
3. Ensure database is accessible
4. Contact support with migration logs

---

**Last Updated:** 2025-10-21
**Related Fix:** Authentication Token Consistency (commit c23933b)
