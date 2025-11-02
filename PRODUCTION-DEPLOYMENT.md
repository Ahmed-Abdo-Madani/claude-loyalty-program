# 🚨 Production Deployment & Hotfix Guide

## 📋 Overview

This guide covers critical production issues, hotfixes, and troubleshooting for the Madna Loyalty Platform.

## 🔥 Critical Hotfixes

### Google Wallet Pass Generation Failure (CRITICAL)

**Status**: RESOLVED
**Severity**: Critical - Blocks all Google Wallet pass generation
**Affected Component**: Google Wallet pass creation endpoint
**Date Identified**: 2025-01-25

#### Problem Description

Google Wallet pass generation fails with database constraint violation error:

```
ERROR: null value in column "last_updated_tag" violates not-null constraint
DETAIL: Failing row contains (id, customer_id, offer_id, google, wallet_object_id, ..., null, null, ...)
```

#### Root Cause

The `last_updated_tag` column in the `wallet_passes` table has a NOT NULL constraint in production, but this field is **Apple Wallet-specific** and should be NULL for Google Wallet passes.

**Technical Details**:
- `last_updated_tag` is used by Apple Web Service Protocol's `passesUpdatedSince` endpoint
- Google Wallet uses Wallet Objects API which has its own update tracking mechanism
- The application code correctly sets `last_updated_tag = null` for Google Wallet passes
- Production database has a constraint that wasn't present in migration files (schema drift)

#### Impact

- **Before Fix**: All Google Wallet pass generation requests fail with 500 errors
- **After Fix**: Google Wallet passes generate successfully with NULL value for Apple-specific fields
- **Apple Wallet**: No impact - continues to work normally

#### Fix Implementation

**Migration File**: `backend/migrations/20250125-fix-last-updated-tag-nullable.js`

This migration:
1. Removes the NOT NULL constraint from `last_updated_tag` column
2. Adds documentation comment explaining Apple-specific usage
3. Includes verification step to confirm the fix
4. Includes rollback logic with data backfill

**Code Changes**:
1. **WalletPass.js model** - Enhanced column comment documentation
2. **WalletPassService.js** - Added validation and enhanced error handling
3. **realGoogleWalletController.js** - Added runtime validation and error detection

#### Deployment Steps

**Step 1: Run Migration**

```bash
# Connect to production database
cd backend
node migrations/20250125-fix-last-updated-tag-nullable.js
```

**Expected Output**:
```
🔄 Starting migration: Fix last_updated_tag nullable constraint...
📊 Current column state:
   - Nullable: NO
   - Data type: character varying(50)

🔧 Removing NOT NULL constraint...
✅ NOT NULL constraint removed

📝 Adding column documentation...
✅ Column comment updated

🔍 Verifying migration...
✅ Migration complete: last_updated_tag is now nullable

📊 Final column state:
   - Nullable: YES
   - Data type: character varying(50)
   - Comment: Update tag for tracking pass changes...

✅ Migration completed successfully in 0.234s
```

**Step 2: Verify Fix**

```bash
# Check column is nullable
psql $DATABASE_URL -c "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'wallet_passes' AND column_name = 'last_updated_tag';"
# Expected: is_nullable = 'YES'

# Test Google Wallet pass generation
curl -X POST https://api.madna.me/api/google-wallet/generate-pass \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"customerId": "test-customer-id", "offerId": "test-offer-id"}'
# Expected: 200 OK with pass URL
```

**Step 3: Monitor Logs**

Check application logs for successful Google Wallet pass creation:
```
✅ Wallet pass created successfully (customer_id: xxx, offer_id: xxx, wallet_type: google)
✅ Google Wallet pass generated successfully
```

#### Prevention

To prevent schema drift in the future:

1. **Always use migrations** for schema changes
2. **Test migrations** in staging environment before production
3. **Document constraints** in migration files with CHECK constraints
4. **Validate schema** after deployment against expected state
5. **Enhanced error handling** now detects constraint violations and suggests fixes

#### Enhanced Error Detection

The fix includes improved error handling that will catch similar issues:

**WalletPassService.js**:
```javascript
// Detects constraint violations (error code 23502)
if (error.name === 'SequelizeDatabaseError' && error.original?.code === '23502') {
  logger.error(`❌ CRITICAL: Database constraint violation`, {
    error: error.message,
    constraint: error.original?.constraint,
    column: error.original?.column,
    hint: 'Check that last_updated_tag column allows NULL for Google Wallet passes',
    migration: 'Run migration: backend/migrations/20250125-fix-last-updated-tag-nullable.js'
  })
}
```

**realGoogleWalletController.js**:
```javascript
// Runtime validation after wallet pass creation
if (walletPass.last_updated_tag !== null) {
  logger.warn('⚠️ Unexpected: last_updated_tag is not NULL for Google Wallet pass')
}

// Error response includes fix information
if (isConstraintError) {
  errorResponse.hint = 'Database schema issue detected'
  errorResponse.fix_available = true
  errorResponse.migration = 'Run migration: backend/migrations/20250125-fix-last-updated-tag-nullable.js'
}
```

#### Rollback Instructions

If you need to rollback (not recommended):

```bash
# This will:
# 1. Backfill NULL values with '0' for Google Wallet passes
# 2. Re-add the NOT NULL constraint
node migrations/20250125-fix-last-updated-tag-nullable.js --rollback
```

**Warning**: Rollback will break Google Wallet pass generation again. Only use if you encounter unexpected issues with the migration.

## 🔍 Troubleshooting

### Google Wallet Pass Generation Errors

#### Error: "null value in column 'last_updated_tag' violates not-null constraint"

**Solution**: Run the migration above

**Verification**:
```bash
psql $DATABASE_URL -c "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'wallet_passes' AND column_name IN ('last_updated_tag', 'authentication_token', 'manifest_etag');"
```

Expected output (all should be nullable):
```
       column_name       | is_nullable
------------------------+-------------
 last_updated_tag       | YES
 authentication_token   | YES
 manifest_etag          | YES
```

#### Error: "Migration file not found"

**Solution**: Ensure you're in the correct directory
```bash
cd backend
ls -la migrations/20250125-fix-last-updated-tag-nullable.js
```

#### Error: "Database connection refused"

**Solution**: Check DATABASE_URL environment variable
```bash
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/database
```

### Apple Wallet Pass Generation

Apple Wallet passes should continue working normally as they always provide the `last_updated_tag` field.

If you encounter issues:

1. Check that passes are being created with `last_updated_tag` value:
```sql
SELECT id, wallet_type, last_updated_tag, created_at
FROM wallet_passes
WHERE wallet_type = 'apple'
ORDER BY created_at DESC
LIMIT 5;
```

2. Verify authentication tokens are being generated:
```sql
SELECT COUNT(*)
FROM wallet_passes
WHERE wallet_type = 'apple'
AND authentication_token IS NOT NULL;
```

## 📊 Production Health Checks

### Database Schema Validation

Run this query to verify critical columns are configured correctly:

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'wallet_passes'
  AND column_name IN ('last_updated_tag', 'authentication_token', 'wallet_type')
ORDER BY column_name;
```

Expected results:
```
  table_name   |      column_name      |     data_type      | is_nullable | column_default
---------------+-----------------------+--------------------+-------------+----------------
 wallet_passes | authentication_token  | character varying  | YES         | NULL
 wallet_passes | last_updated_tag      | character varying  | YES         | NULL
 wallet_passes | wallet_type           | character varying  | NO          | NULL
```

### Application Health Check

```bash
# Check API health
curl https://api.madna.me/health

# Check Google Wallet endpoint
curl https://api.madna.me/api/google-wallet/health

# Check recent wallet passes
psql $DATABASE_URL -c "SELECT wallet_type, COUNT(*) FROM wallet_passes GROUP BY wallet_type;"
```

## 🚀 Emergency Rollback Procedures

### If Google Wallet Pass Generation Breaks After Migration

1. **Check logs** for specific error messages
2. **Verify migration status**:
```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_passes'
AND column_name = 'last_updated_tag';
```

3. **If migration didn't apply**, run it again (it's idempotent)
4. **If migration applied but still failing**, check application code deployment
5. **Contact support** with full error logs and stack trace

### Critical Contact Information

- **Production Database**: Check Render.com dashboard
- **Application Logs**: Render.com service logs
- **Error Tracking**: Check application error logs for full stack traces

## 📝 Migration History

### 2025-01-25: Google Wallet Pass Generation Fix
- **File**: `backend/migrations/20250125-fix-last-updated-tag-nullable.js`
- **Purpose**: Remove NOT NULL constraint from Apple-specific fields
- **Status**: ✅ Completed
- **Impact**: Critical - Enables Google Wallet pass generation

### Previous Migrations

See `DEPLOYMENT.md` for full migration history and database setup instructions.

---

## 🔔 Notification & Campaign System Deployment

### Required Migrations (CRITICAL)

**Status**: Must be applied before production deployment
**Date Added**: 2025-01-31

#### Migration 1: Campaign Type Fields

**File**: `backend/migrations/20250131-add-notification-campaign-fields.js`
**Purpose**: Add campaign_type, linked_offer_id, and last_notification_sent_at columns

**What it does**:
1. Adds `last_notification_sent_at` to `customer_segments` table
2. Adds `campaign_type` to `notification_campaigns` with CHECK constraint
3. Adds `linked_offer_id` to `notification_campaigns` with FK to offers
4. **Drops ALL legacy CHECK constraints** on campaign_type
5. Normalizes legacy data to 'lifecycle'
6. Creates ONE authoritative CHECK constraint with 6 values:
   - lifecycle
   - promotional
   - transactional
   - new_offer_announcement
   - custom_promotion
   - seasonal_campaign

**Run command**:
```bash
node backend/run-migration.js 20250131-add-notification-campaign-fields.js
```

**Verification**:
```sql
-- Should return exactly ONE constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'notification_campaigns'::regclass 
AND contype = 'c' 
AND pg_get_constraintdef(oid) LIKE '%campaign_type%';

-- Should show all 6 values in the constraint definition
```

**Expected output**:
```
       conname        |                    constraint_def
----------------------+-------------------------------------------------------
 check_campaign_type  | CHECK (campaign_type IN ('lifecycle', 'promotional', 
                      |  'transactional', 'new_offer_announcement', 
                      |  'custom_promotion', 'seasonal_campaign'))
```

#### Migration 2: Auto-Engagement Config Table

**File**: `backend/migrations/20250201-create-auto-engagement-configs-table.js`
**Purpose**: Create table for auto-engagement configuration

**What it does**:
1. Creates `auto_engagement_configs` table
2. Adds foreign key to businesses table
3. Creates indexes for query performance
4. Sets up CHECK constraints for data validation

**Run command**:
```bash
node backend/run-migration.js 20250201-create-auto-engagement-configs-table.js
```

**Verification**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'auto_engagement_configs';

-- Should return one row
```

### Environment Variables (REQUIRED)

**Already Configured in Render.com** ✅:
- `JWT_SECRET` - Strong 64-char secret
- `SESSION_SECRET` - Strong 64-char secret
- `ENCRYPTION_KEY` - Strong 32-char secret
- `APNS_PRODUCTION=true`
- `APNS_TOPIC=pass.me.madna.api`
- `APPLE_PASS_TYPE_ID=pass.me.madna.api`
- `APPLE_TEAM_ID=NFQ6M7TFY2`
- `UPLOADS_DIR=/app/uploads`
- `UPLOADS_BASE_URL=https://api.madna.me/uploads`
- `FRONTEND_URL=https://app.madna.me`
- `BASE_URL=https://api.madna.me`
- `DATABASE_URL` - PostgreSQL connection string
- `WALLET_NOTIFICATION_DAILY_LIMIT=10`

**MISSING - Need to Add** ⚠️:
```bash
# QR Code Security (CRITICAL)
QR_JWT_SECRET=<generate-with-openssl-rand-base64-64>
# Generate with: openssl rand -base64 64
```

**Optional - Already Configured**:
- `DISABLE_AUTO_ENGAGEMENT=false` (not set, defaults to false)

### Testing Campaign System

After deployment, verify:

1. **Campaign Creation**:
```bash
curl -X POST https://api.madna.me/api/notifications/campaigns/promotional \
  -H "Content-Type: application/json" \
  -H "x-session-token: YOUR_TOKEN" \
  -H "x-business-id: YOUR_BUSINESS_ID" \
  -d '{
    "name": "Test Campaign",
    "campaign_type": "custom_promotion",
    "target_type": "all_customers",
    "message_header": "Test",
    "message_body": "Test message",
    "send_immediately": false
  }'
# Expected: 201 Created
```

2. **Auto-Engagement Cron**:
```bash
# Check server logs for:
✅ Auto-engagement cron job scheduled (daily at 9:00 AM)

# Should NOT see:
❌ Error: relation "auto_engagement_configs" does not exist
```

3. **Segment Notifications**:
- Open CustomersTab in browser
- Select a segment from dropdown
- Click "Send to Segment"
- Fill notification form and send
- Verify success message appears

### Troubleshooting

#### Error: "violates check constraint notification_campaigns_campaign_type_check"

**Cause**: Legacy CHECK constraints still exist

**Solution**:
1. Connect to database
2. Drop all CHECK constraints on campaign_type:
```sql
SELECT conname FROM pg_constraint 
WHERE conrelid = 'notification_campaigns'::regclass 
AND contype = 'c' 
AND pg_get_constraintdef(oid) LIKE '%campaign_type%';

-- For each constraint returned:
ALTER TABLE notification_campaigns DROP CONSTRAINT <constraint_name>;
```
3. Re-run migration: `node backend/run-migration.js 20250131-add-notification-campaign-fields.js`

#### Error: "relation auto_engagement_configs does not exist"

**Cause**: Migration not applied

**Solution**:
```bash
node backend/run-migration.js 20250201-create-auto-engagement-configs-table.js
```

### Rollback Instructions

If you need to rollback the notification system:

```bash
# Rollback auto-engagement
node backend/run-migration.js 20250201-create-auto-engagement-configs-table.js --rollback

# Rollback campaign fields
node backend/run-migration.js 20250131-add-notification-campaign-fields.js --rollback
```

**Warning**: Rollback will delete all campaign data and auto-engagement configurations.

---

**Last Updated**: 2025-02-01
**Maintained By**: Madna Platform Team
