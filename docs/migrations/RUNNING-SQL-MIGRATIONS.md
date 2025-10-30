# Running SQL Migrations in pgAdmin

## Quick Start

### Option 1: pgAdmin Query Tool (Recommended for Development)

1. **Open pgAdmin 4**

2. **Connect to your database:**
   - Expand Servers → PostgreSQL → Databases
   - Find your database (likely `loyalty_db` or similar)
   - Right-click on the database
   - Select **"Query Tool"**

3. **Open the migration file:**
   - Click the folder icon (Open File) in Query Tool
   - Navigate to: `backend/migrations/20250122-add-manifest-etag-to-wallet-passes.sql`
   - Click Open

4. **Execute the migration:**
   - Click the ▶️ (Execute) button or press **F5**
   - Watch the Messages tab for output

5. **Verify success:**
   - Check the verification queries at the bottom
   - You should see:
     ```
     column_name   | data_type         | character_maximum_length
     manifest_etag | character varying | 32
     ```

### Option 2: Command Line (psql)

If you prefer command line:

```bash
# Connect to database
psql -U postgres -d loyalty_db

# Run migration file
\i backend/migrations/20250122-add-manifest-etag-to-wallet-passes.sql

# Or in one line:
psql -U postgres -d loyalty_db -f backend/migrations/20250122-add-manifest-etag-to-wallet-passes.sql
```

### Option 3: Copy-Paste (Fastest)

1. Open the `.sql` file in a text editor
2. Copy ALL the content (Ctrl+A, Ctrl+C)
3. Open pgAdmin Query Tool
4. Paste (Ctrl+V)
5. Execute (F5)

---

## Expected Output

When you run the migration successfully, you should see:

```
NOTICE:  Column manifest_etag added successfully
COMMENT
CREATE INDEX
column_name   | data_type         | character_maximum_length | is_nullable | column_default
--------------+-------------------+--------------------------+-------------+----------------
manifest_etag | character varying | 32                       | YES         | NULL

indexname                        | indexdef
---------------------------------+----------------------------------------------------------
idx_wallet_passes_manifest_etag | CREATE INDEX idx_wallet_passes_manifest_etag ON ...

total_passes | passes_with_etag | passes_without_etag
-------------+------------------+--------------------
5            | 0                | 5

NOTICE:  ✅ Migration completed successfully!
NOTICE:  
NOTICE:  Next steps:
NOTICE:  1. Verify column exists in verification query above
NOTICE:  2. Restart your application
NOTICE:  3. Generate a new Apple Wallet pass
NOTICE:  4. Check that manifest_etag is populated
```

---

## Troubleshooting

### Issue: "column already exists"

**Message:**
```
NOTICE:  Column manifest_etag already exists, skipping
```

**Resolution:** This is fine! The migration is idempotent (safe to run multiple times).

### Issue: "permission denied"

**Cause:** Your database user doesn't have permission to alter tables.

**Solution:**
```sql
-- Run as superuser or grant permissions:
GRANT ALL ON TABLE wallet_passes TO your_username;
```

### Issue: "relation wallet_passes does not exist"

**Cause:** The `wallet_passes` table hasn't been created yet.

**Solution:** Run the base migrations first:
```bash
node backend/migrations/20250120-add-apple-web-service-tables.js
```

---

## Rollback Instructions

If you need to remove the column:

1. Open pgAdmin Query Tool
2. Scroll to the bottom of the migration file
3. Find the commented rollback section
4. Copy these lines:
   ```sql
   DROP INDEX IF EXISTS idx_wallet_passes_manifest_etag;
   ALTER TABLE wallet_passes DROP COLUMN IF EXISTS manifest_etag;
   SELECT 'Rollback completed - manifest_etag column removed' AS status;
   ```
5. Paste and execute in Query Tool

---

## After Migration

### 1. Verify the column exists

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'wallet_passes' 
  AND column_name = 'manifest_etag';
```

### 2. Restart your application

```bash
# Stop the server (Ctrl+C in terminal)

# Start again
npm run dev
# or
npm run backend:dev
```

### 3. Test pass generation

Generate a new pass and check if `manifest_etag` is populated:

```sql
SELECT 
    id,
    customer_id,
    offer_id,
    manifest_etag,
    created_at
FROM wallet_passes
ORDER BY created_at DESC
LIMIT 5;
```

### 4. Test ETag caching

```bash
# Get a pass and check ETag header
curl -v -H "Authorization: ApplePass TOKEN" \
  http://localhost:3001/api/apple/v1/passes/pass.me.madna.api/SERIAL

# Should show header:
# ETag: "abc123def4567890"
```

---

## Production Deployment

For production, follow these steps:

1. **Backup database first:**
   ```sql
   -- In pgAdmin: Right-click database → Backup
   -- Or via command line:
   pg_dump -U postgres -d loyalty_db > backup_before_etag.sql
   ```

2. **Run migration in production database:**
   - Connect pgAdmin to production server
   - Open Query Tool
   - Load and execute the `.sql` file

3. **Verify:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'wallet_passes' AND column_name = 'manifest_etag';
   ```

4. **Restart production app:**
   ```bash
   pm2 restart loyalty-platform
   # or
   systemctl restart loyalty-platform
   ```

---

## Summary

✅ **File to run:** `backend/migrations/20250122-add-manifest-etag-to-wallet-passes.sql`  
✅ **Method:** pgAdmin Query Tool  
✅ **Safe to re-run:** Yes (idempotent)  
✅ **Requires restart:** Yes (after migration)  
✅ **Rollback available:** Yes (commented at bottom of file)
