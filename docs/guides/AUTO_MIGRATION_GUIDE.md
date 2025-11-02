# Automatic Migration System Guide

**Date**: 2025-02-03  
**Status**: Production-Ready  
**Version**: 1.0.0

---

## 📋 Overview

The Madna Loyalty Platform now includes **automatic migration tracking and execution** for production deployments. Migrations run automatically without manual intervention, ensuring zero-downtime deployments and preventing schema drift.

---

## 🎯 Key Features

### 1. Automatic Execution
- Migrations run automatically during Render deployments
- No manual SSH or database access required
- Integrated into deployment pipeline

### 2. Migration Tracking
- `schema_migrations` table records all applied migrations
- Tracks execution time, status, and checksums
- Prevents duplicate execution

### 3. Zero-Downtime Deployments
- Migrations run via Render's preDeploy command
- Old version serves traffic while migrations execute
- Traffic switches only after migrations succeed

### 4. Safety Mechanisms
- Advisory locks prevent concurrent execution
- Transaction-based execution with automatic rollback
- Checksum validation detects file tampering
- Fail-fast in production (server won't start with incomplete schema)

### 5. Comprehensive Monitoring
- Detailed logs in Render dashboard
- Migration status API via npm scripts
- Integrity validation tools

---

## 🏗️ Architecture

### Components

**1. Migration Tracking Table** (`schema_migrations`)
- Stores record of applied migrations
- Created by: `19990101-create-schema-migrations-table.js`
- Columns: migration_name, applied_at, execution_time_ms, status, error_message, checksum

**2. Auto-Migration Runner** (`AutoMigrationRunner.js`)
- Service class that manages migration execution
- Methods: runPendingMigrations, getMigrationStatus, validateIntegrity
- Uses advisory locks to prevent concurrent runs

**3. Deploy Script** (`scripts/deploy-migrations.js`)
- Executed by Render's preDeploy command
- Runs pending migrations before deployment
- Exits with code 0 (success) or 1 (failure)

**4. Server Integration** (`server.js`)
- Runs auto-migrations during startup
- Validates schema after migrations
- Fails fast if migrations incomplete

### Execution Flow

```
Git Push → Render Build → preDeploy (migrations) → Deploy → Server Startup (validate)
                              ↓                        ↓              ↓
                         Run pending              Switch traffic   Check schema
                         migrations               to new version   is complete
                              ↓                        ↓              ↓
                         Success: Continue        Serve traffic   Start app
                         Failure: Abort           Old version     Or fail fast
```

---

## 🚀 Usage

### For Developers

**Check migration status**:
```bash
npm run migrate:status
```

**See pending migrations**:
```bash
npm run migrate:pending
```

**Test migrations locally**:
```bash
# Dry-run (shows what would execute)
npm run migrate:auto:dry-run

# Actually run pending migrations
npm run migrate:auto
```

**Validate migration integrity**:
```bash
npm run migrate:validate
```

**Interactive CLI**:
```bash
npm run migrate:cli
```

### For Deployments

**Normal Deployment** (Fully Automatic):
1. Commit and push code: `git push origin main`
2. Render automatically:
   - Builds Docker image
   - Runs preDeploy: `node scripts/deploy-migrations.js`
   - Executes pending migrations
   - Switches traffic if migrations succeed
   - Aborts deployment if migrations fail
3. Server starts and validates schema
4. Monitor logs in Render dashboard

**Emergency Manual Deployment**:
1. Disable auto-migrations in Render: `AUTO_MIGRATE=false`
2. Deploy code
3. SSH into Render shell or use Render console
4. Run: `npm run migrate:auto`
5. Verify: `npm run migrate:status`
6. Re-enable: `AUTO_MIGRATE=true`

---

## 🔒 Safety Features

### Advisory Locks

**Purpose**: Prevent concurrent migration execution

**How it works**:
- Uses Postgres advisory lock: `pg_try_advisory_lock(hashcode('schema_migrations'))`
- Lock is acquired on a dedicated connection before running migrations
- Released automatically on completion or error
- Timeout: 30 seconds (configurable via `MIGRATION_LOCK_TIMEOUT`)

**Behavior**:
- If lock acquired: Migrations run normally
- If lock not acquired: Script exits with warning (another instance is running)
- If timeout: Script fails and exits

### Transaction Safety

**Each migration runs in its own transaction**:
- Success: Transaction commits, changes are permanent
- Failure: Transaction rolls back, no partial changes
- Atomic execution per migration

**Note**: The auto-migration runner doesn't wrap ALL migrations in one transaction (by design). Each migration is independent.

### Checksum Validation

**Purpose**: Detect if migration files were modified after being applied

**How it works**:
- SHA-256 hash calculated when migration is applied
- Stored in `schema_migrations.checksum` column
- Validation compares current file hash with stored hash

**Run validation**:
```bash
npm run migrate:validate
```

**If mismatch detected**:
- Warning logged (not a fatal error)
- Indicates migration file was modified
- Recommendation: Create new migration instead of modifying old one

### Fail-Fast in Production

**Server startup behavior**:
- If `AUTO_MIGRATE=true` and migrations fail: Server exits with code 1
- If schema validation fails: Server exits with code 1
- If tracking table missing: Server exits with code 1

**Rationale**: Prevents serving traffic with incomplete or incorrect schema

---

## 📊 Monitoring

### Render Dashboard

**During Deployment**:
1. Go to Render dashboard → Your service → Deploys
2. Click on active deployment
3. View "Pre-Deploy Logs" section
4. Look for:
   ```
   ✅ Auto-migrations completed successfully
      Applied: 2, Failed: 0, Total: 24
   ```

**After Deployment**:
1. View "Logs" tab
2. Look for startup messages:
   ```
   ✅ Database schema is up to date (no pending migrations)
   ```

### Database Queries

**Recent migrations**:
```sql
SELECT 
  migration_name,
  applied_at,
  execution_time_ms,
  status
FROM schema_migrations
ORDER BY applied_at DESC
LIMIT 10;
```

**Failed migrations**:
```sql
SELECT 
  migration_name,
  applied_at,
  error_message
FROM schema_migrations
WHERE status = 'failed'
ORDER BY applied_at DESC;
```

**Migration statistics**:
```sql
SELECT 
  COUNT(*) as total_migrations,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(execution_time_ms) as avg_execution_time_ms
FROM schema_migrations;
```

---

## 🚨 Troubleshooting

### Deployment Failed: "Migration failed"

**Check Render logs**:
1. Go to failed deployment in Render dashboard
2. Check "Pre-Deploy Logs" section
3. Look for error message and stack trace

**Common causes**:
- SQL syntax error in migration
- Missing table or column referenced in migration
- Constraint violation from existing data
- Database connection timeout

**Solution**:
1. Fix the migration file
2. Commit and push fix
3. Render will retry deployment automatically

### Server Won't Start: "Pending migrations detected"

**Cause**: Auto-migrations disabled but pending migrations exist

**Solution**:
```bash
# Option 1: Enable auto-migrations
AUTO_MIGRATE=true

# Option 2: Run manually
npm run migrate:auto
```

### Error: "Could not acquire migration lock"

**Cause**: Another instance is running migrations or lock wasn't released

**Check active locks**:
```sql
SELECT * FROM pg_locks WHERE locktype = 'advisory';
```

**Force release** (use with caution):
```sql
SELECT pg_advisory_unlock_all();
```

### Error: "schema_migrations table does not exist"

**Cause**: Tracking table migration hasn't been run

**Solution**:
```bash
npm run migrate:tracking-table
# Or:
node backend/run-migration.js 19990101-create-schema-migrations-table.js
```

### Error: "Migration checksum mismatch"

**Cause**: Migration file was modified after being applied

**Solution**:
1. Review the migration file changes
2. If changes are intentional, create a new migration instead
3. Never modify applied migrations
4. Run `npm run migrate:validate` to see all mismatches

### Deployment Failed: "Migration timeout"

**Cause**: Migration took longer than lock timeout (default 30s)

**Solution**:
1. Increase timeout: Set `MIGRATION_LOCK_TIMEOUT=60000` in Render env vars
2. Optimize slow migration (add indexes after data migration, not during)
3. Check database performance

---

## 🔄 Migration Lifecycle

### Creating a New Migration

1. **Create migration file**:
   - Naming: `YYYYMMDD-description.js`
   - Location: `backend/migrations/`
   - Template: Copy from existing migration

2. **Implement up() and down()**:
   - `up()`: Apply changes
   - `down()`: Rollback changes
   - Use transactions
   - Check for existing columns/tables

3. **Test locally**:
   ```bash
   npm run migrate:auto:dry-run  # Verify it's detected
   npm run migrate:auto          # Run it
   npm run migrate:status        # Verify it's recorded
   ```

4. **Commit and push**:
   - Migration will run automatically on next deployment
   - No manual intervention needed

### Migration Best Practices

**DO**:
- ✅ Make migrations idempotent (check for existing columns)
- ✅ Use transactions for atomic execution
- ✅ Test locally before pushing
- ✅ Add clear logging with emoji prefixes
- ✅ Document breaking changes in comments
- ✅ Use VARCHAR + CHECK instead of ENUM (easier to modify)
- ✅ **ALWAYS name files with YYYYMMDD prefix** (enforced by scanner)

**DON'T**:
- ❌ Modify migrations after they've been applied
- ❌ Assume table/column exists without checking
- ❌ Skip the down() function (needed for rollback)
- ❌ Use long-running operations without batching
- ❌ Forget to add indexes for new columns
- ❌ **Create migration files without YYYYMMDD prefix** (they will be ignored)

**Filename Convention (ENFORCED)**:
```
Format: YYYYMMDD-description.js
Example: 20250202-add-customer-fields.js

✅ Will execute: 20250202-add-customer-fields.js
❌ Will ignore:  add-customer-fields.js (no date prefix)
❌ Will ignore:  run-cleanup-migration.js (utility script)
```

**Why enforced:**
- The scanner explicitly filters out non-dated files (`isDated = /^\d{8}-/.test(filename)`)
- Ensures deterministic execution order (lexicographic = chronological)
- Prevents platform-specific sorting bugs (Windows vs Linux)
- Makes migration history predictable and auditable

**Excluded migrations (manual-only):**
Some migrations are intentionally excluded from automatic execution for production safety:
- `20250121-cleanup-old-apple-wallet-passes.js` - Performs data deletion; requires manual execution with explicit confirmation

To run excluded migrations:
```bash
# Development
node backend/run-migration.js 20250121-cleanup-old-apple-wallet-passes.js

# Production (requires explicit confirmation)
npm run migrate:manual -- 20250121-cleanup-old-apple-wallet-passes.js
```

---

## 📝 Environment Variables

**AUTO_MIGRATE** (default: true)
- Enables automatic migration execution
- Set to `false` to disable (emergency only)

**MIGRATION_LOCK_TIMEOUT** (default: 30000)
- Milliseconds to wait for advisory lock
- Increase for slow migrations

**MIGRATION_STOP_ON_ERROR** (default: true)
- Stop on first migration error
- Recommended: keep true for production

---

## 🎓 Examples

### Check What Will Run

```bash
$ npm run migrate:pending

Pending migrations:
- 20250202-create-or-sync-business-sessions.js
- 19990101-create-schema-migrations-table.js
```

### Run Migrations

```bash
$ npm run migrate:auto

🚀 Running automatic migrations...
📋 Found 2 pending migrations out of 24 total

🔧 Running migration: 20250202-create-or-sync-business-sessions.js
   ⏱️  Execution time: 234ms
   ✅ Migration applied successfully

🔧 Running migration: 19990101-create-schema-migrations-table.js
   ⏱️  Execution time: 156ms
   ✅ Migration applied successfully

✅ Auto-migrations completed successfully
   Applied: 2, Failed: 0, Total: 24
```

### Check Status

```bash
$ npm run migrate:status

{
  "total": 24,
  "applied": 22,
  "pending": 2,
  "failed": 0,
  "appliedMigrations": [
    {
      "name": "20250131-add-notification-campaign-fields",
      "appliedAt": "2025-02-01T10:30:00.000Z",
      "executionTime": 456,
      "status": "success"
    },
    ...
  ],
  "pendingMigrations": [
    "20250202-create-or-sync-business-sessions",
    "19990101-create-schema-migrations-table"
  ]
}
```

---

## 🔗 Related Documentation

- [Production Deployment Checklist](../guides/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Pre-Deployment Fixes](../guides/PRE_DEPLOYMENT_FIXES.md)
- [Migration README](../../backend/migrations/README.md)
- [Database Setup Guide](../guides/POSTGRESQL-SETUP-GUIDE.md)

---

**Last Updated**: 2025-02-03  
**Maintained By**: Madna Platform Team
