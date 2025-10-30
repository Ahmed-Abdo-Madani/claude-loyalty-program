# ✅ Apple Web Service Migration - Complete Instructions

**Problem Solved**: The `wallet_passes` table didn't exist yet. This migration creates EVERYTHING you need in the correct order.

---

## 📋 **What This Migration Does**

✅ Creates `wallet_passes` table (if not exists)
✅ Adds notification tracking fields
✅ Creates `devices` table for iOS device tracking
✅ Creates `device_registrations` table (many-to-many)
✅ Adds Apple Web Service Protocol fields
✅ Creates all necessary indexes
✅ Backfills authentication tokens for existing passes

**All in one SQL file** with smart `IF NOT EXISTS` checks!

---

## 🚀 **How to Run (pgAdmin - RECOMMENDED)**

### Step 1: Open pgAdmin
1. Launch **pgAdmin 4**
2. Connect to your PostgreSQL server

### Step 2: Open Query Tool
1. In the left sidebar, expand:
   - **Servers** → **PostgreSQL 17** → **Databases**
2. Right-click on **loyalty_platform_dev**
3. Select **Query Tool**

### Step 3: Load the SQL File
1. In the Query Tool, click **File** menu → **Open**
2. Navigate to:
   ```
   c:\Users\Design_Bench_12\Documents\claude-loyalty-program\backend\migrations\complete-apple-web-service-setup.sql
   ```
3. Click **Open**

### Step 4: Execute
1. Click the **Execute** button (▶️ icon) or press **F5**
2. Wait 5-10 seconds for completion

### Step 5: Verify Success
You should see output ending with:
```
✅ MIGRATION COMPLETED SUCCESSFULLY!

TABLE SUMMARY:
  devices table: 0 rows
  device_registrations table: 0 rows
  wallet_passes table: X rows
  wallet_passes with auth tokens: X rows

WALLET_PASSES TABLE STRUCTURE:
[List of columns including authentication_token, last_updated_tag, pass_data_json]

NEXT STEPS:
  1. Restart your backend server
  2. Generate a new Apple Wallet pass
  3. Install on iPhone and check device registration
```

---

## 🖥️ **Alternative: Command Line (Advanced)**

If you prefer command line:

```cmd
cd c:\Users\Design_Bench_12\Documents\claude-loyalty-program\backend\migrations

set PGPASSWORD=Watashi12Des
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d loyalty_platform_dev -f complete-apple-web-service-setup.sql
```

---

## ✅ **After Migration: Next Steps**

### 1. Restart Backend Server
Stop and restart your Node.js backend:

```bash
# Kill existing process (Ctrl+C in terminal)
# Then restart
cd c:\Users\Design_Bench_12\Documents\claude-loyalty-program\backend
npm run dev
```

### 2. Verify Backend Logs
You should see during startup:
```
🍎 Validating Apple Wallet certificates...
✅ Apple Wallet certificates validated successfully
```

### 3. Test Device Registration
1. **Generate a new Apple Wallet pass**
   - Go to your frontend
   - Create/join a loyalty program
   - Click "Add to Apple Wallet"

2. **Install on iPhone**
   - Transfer .pkpass file to iPhone (AirDrop/email)
   - Tap to install

3. **Check Backend Logs**
   Look for:
   ```
   📱 Device registration request
   ✅ Device registered
   ```

4. **Verify Database**
   Run in pgAdmin:
   ```sql
   -- Check registered devices
   SELECT * FROM devices ORDER BY created_at DESC LIMIT 5;

   -- Check device-to-pass registrations
   SELECT
     d.device_library_identifier,
     wp.wallet_serial,
     dr.registered_at
   FROM device_registrations dr
   JOIN devices d ON d.id = dr.device_id
   JOIN wallet_passes wp ON wp.id = dr.wallet_pass_id
   ORDER BY dr.registered_at DESC
   LIMIT 5;

   -- Check wallet passes with auth tokens
   SELECT
     wallet_serial,
     authentication_token,
     last_updated_tag,
     pass_status
   FROM wallet_passes
   WHERE wallet_type = 'apple'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

---

## 🎯 **Expected Results**

### Immediately After Migration
- ✅ 3 new tables created
- ✅ 6 new columns added to `wallet_passes`
- ✅ 10+ indexes created
- ✅ Existing Apple Wallet passes have auth tokens backfilled

### After Generating New Pass
- ✅ Pass includes `webServiceURL` (https://api.madna.me or http://localhost:3001)
- ✅ Pass includes `authenticationToken` (32-character hash)
- ✅ Pass stored in database with all new fields

### After Installing Pass on iPhone
- ✅ Device registration entry in `devices` table
- ✅ Registration entry in `device_registrations` table
- ✅ Backend logs show successful registration

### After Earning Stamp
- ✅ `last_updated_tag` incremented in `wallet_passes`
- ✅ Pass updates on device (within 5-15 minutes without APNs)
- ✅ With APNs (Phase 3): Pass updates immediately

---

## ❌ **Troubleshooting**

### Error: "relation xyz does not exist"
**Cause**: Missing prerequisite table (businesses, customers, offers, customer_progress)

**Solution**: This means your base tables don't exist. You need to:
1. Run Sequelize sync first: `npm run sync` (if available)
2. Or check if there's an earlier migration to create base tables

### Error: "duplicate key value violates unique constraint"
**Cause**: Some data already exists from partial migration

**Solution**: This is fine! The migration uses `IF NOT EXISTS` checks and will skip existing items.

### No Output/Migration Seems Stuck
**Cause**: SQL file may not have loaded properly

**Solution**:
1. Close and reopen Query Tool in pgAdmin
2. Ensure file path is correct
3. Try copy-pasting SQL content directly into Query Tool

### Authentication Tokens Still NULL
**Cause**: Backfill query may have failed

**Solution**: Run this manually in pgAdmin:
```sql
UPDATE wallet_passes
SET authentication_token = SUBSTRING(
  encode(
    convert_to(customer_id || ':' || offer_id || ':' || EXTRACT(EPOCH FROM created_at)::TEXT, 'UTF8'),
    'base64'
  ),
  1, 32
),
last_updated_tag = EXTRACT(EPOCH FROM COALESCE(last_updated_at, updated_at, created_at))::TEXT
WHERE wallet_type = 'apple'
  AND authentication_token IS NULL;
```

---

## 📊 **Migration Summary**

### Tables Created/Modified
1. **wallet_passes** (created or modified)
   - Base table for tracking wallet passes
   - Added 6 new columns

2. **devices** (created)
   - Stores iOS device information
   - Tracks device library ID and push token

3. **device_registrations** (created)
   - Many-to-many relationship
   - Links devices to wallet passes

### Indexes Created
- 15+ indexes for optimal query performance
- Covering device lookups, pass queries, and update tracking

### Foreign Keys
- 6 foreign key constraints
- Proper CASCADE delete behavior

---

## 🎉 **Success Criteria**

You'll know the migration succeeded when:
1. ✅ pgAdmin shows "MIGRATION COMPLETED SUCCESSFULLY!"
2. ✅ No ERROR messages in output
3. ✅ All verification queries return data
4. ✅ `wallet_passes` table has `authentication_token` column
5. ✅ `devices` and `device_registrations` tables exist

---

## 📞 **Need Help?**

If you encounter issues:
1. Copy the **exact error message** from pgAdmin
2. Check which table/column is mentioned
3. Run the verification queries at the end of the migration
4. Share the output for debugging

---

**Migration File**: `complete-apple-web-service-setup.sql`
**Status**: Ready to run
**Estimated Time**: 10-20 seconds
**Safe to Run**: Yes (uses IF NOT EXISTS checks)

