# Quick Guide: Running the manifest_etag Migration

## The Easy Way (pgAdmin)

### Step 1: Open pgAdmin and Connect
1. Launch **pgAdmin 4**
2. Expand: Servers → PostgreSQL → Databases
3. Right-click your database → **Query Tool**

### Step 2: Load the Migration
- Click 📁 **Open File** icon in Query Tool
- Navigate to: `backend/migrations/20250122-add-manifest-etag-to-wallet-passes.sql`
- Click **Open**

### Step 3: Execute
- Click ▶️ **Execute** button (or press F5)
- Wait ~2 seconds

### Step 4: Verify Success
You should see:
```
NOTICE: Column manifest_etag added successfully
CREATE INDEX
✅ Migration completed successfully!
```

### Step 5: Restart Your App
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

---

## What This Migration Does

✅ Adds `manifest_etag` column to `wallet_passes` table  
✅ Creates an index for fast lookups  
✅ Fixes pass generation errors  
✅ Enables ETag-based HTTP caching

---

## Verification

After running migration, check in pgAdmin:

```sql
-- Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_passes' 
  AND column_name = 'manifest_etag';
```

Expected result:
```
column_name   | data_type
manifest_etag | character varying
```

---

## If Something Goes Wrong

### To Rollback:
1. Open Query Tool
2. Run this:
```sql
DROP INDEX IF EXISTS idx_wallet_passes_manifest_etag;
ALTER TABLE wallet_passes DROP COLUMN IF EXISTS manifest_etag;
```

### Migration File Already Run?
No problem! The migration is **idempotent** (safe to run multiple times).

---

## Files Included

📄 **Migration Files:**
- `backend/migrations/20250122-add-manifest-etag-to-wallet-passes.sql` ← **Use this one**
- `backend/migrations/20250122-add-manifest-etag-to-wallet-passes.js` (alternative)

📖 **Documentation:**
- `RUNNING-SQL-MIGRATIONS.md` - Detailed pgAdmin instructions
- `MANIFEST-ETAG-MIGRATION.md` - Complete migration guide

---

## Need Help?

**Error: "column already exists"**
→ Already done! No action needed.

**Error: "permission denied"**
→ Use a superuser account or grant permissions.

**Error: "table wallet_passes does not exist"**
→ Run base migrations first.

---

✅ **Ready to go!** Just open the `.sql` file in pgAdmin and hit Execute.
