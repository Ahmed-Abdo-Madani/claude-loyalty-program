# Database Migrations Guide

## Overview

Migrations are database schema changes that must be explicitly run to update the database structure. Sequelize models define the application's expected database schema, but **Sequelize does not automatically sync schema changes in production**. After pulling code with new model definitions, you must run the corresponding migration to update the database.

## Automatic Migrations (Production)

### Overview

The platform now includes **automatic migration tracking and execution**. Migrations run automatically during production deployments without manual intervention.

### How It Works

**Two-Layer Approach:**

1. **Render preDeploy Command** (Primary)
   - Runs: `node scripts/deploy-migrations.js`
   - When: After Docker build, before traffic switches
   - Benefit: Zero-downtime deployments
   - Requires: Render Starter plan or higher

2. **Server Startup Check** (Safety Net)
   - Runs: `AutoMigrationRunner.runPendingMigrations()`
   - When: During server initialization in `server.js`
   - Benefit: Validates schema, catches missed migrations
   - Controlled by: `AUTO_MIGRATE` environment variable

### Migration Tracking Table

**Table**: `schema_migrations`

**Columns**:
- `migration_name` - Filename without .js extension
- `applied_at` - When migration was applied
- `execution_time_ms` - How long it took
- `status` - success, failed, or running
- `error_message` - Error details if failed
- `checksum` - SHA-256 hash for integrity validation

**Query migration status**:
```sql
SELECT migration_name, applied_at, execution_time_ms, status 
FROM schema_migrations 
ORDER BY applied_at DESC 
LIMIT 10;
```

### NPM Scripts

**Check migration status**:
```bash
npm run migrate:status
# Shows: applied migrations, pending migrations, failed migrations
```

**List pending migrations**:
```bash
npm run migrate:pending
# Shows: migrations that haven't been applied yet
```

**Run pending migrations manually**:
```bash
npm run migrate:auto
# Runs all pending migrations in order
```

**Dry-run (test without executing)**:
```bash
npm run migrate:auto:dry-run
# Shows what would run without actually executing
```

**Validate migration integrity**:
```bash
npm run migrate:validate
# Checks if applied migrations have been modified (checksum validation)
```

**Interactive CLI**:
```bash
npm run migrate:cli
# Opens interactive menu for migration management
```

### Deployment Workflow

**Normal Deployment** (Automatic):
1. Push code to GitHub
2. Render detects changes and starts build
3. Docker image is built
4. **preDeploy runs**: `node scripts/deploy-migrations.js`
5. Pending migrations execute automatically
6. If migrations succeed: Traffic switches to new version
7. If migrations fail: Deployment aborts, old version keeps running
8. Server starts and validates schema

**Manual Deployment** (Emergency):
1. Set `AUTO_MIGRATE=false` in Render environment variables
2. Deploy code
3. SSH into Render instance or use Render shell
4. Run: `npm run migrate:auto`
5. Verify: `npm run migrate:status`
6. Re-enable: Set `AUTO_MIGRATE=true`

### Safety Features

**Advisory Locks**:
- Prevents concurrent migration execution
- Uses Postgres advisory locks: `pg_try_advisory_lock()`
- Automatically released on completion or error
- Timeout: 30 seconds (configurable via `MIGRATION_LOCK_TIMEOUT`)

**Idempotency**:
- Each migration checks for existing columns/tables
- Safe to run multiple times
- Skips already-applied migrations

**Checksum Validation**:
- Detects if migration files were modified after being applied
- Warns about integrity violations
- Helps prevent accidental schema drift

**Transaction Safety**:
- Each migration runs in its own transaction
- Automatic rollback on error
- All-or-nothing execution per migration

**Fail-Fast in Production**:
- Server refuses to start if migrations fail
- Prevents serving traffic with incomplete schema
- Clear error messages with remediation steps

### Disabling Auto-Migrations

**When to disable**:
- Emergency hotfix that doesn't require schema changes
- Testing deployment pipeline
- Debugging migration issues

**How to disable**:
```bash
# In Render environment variables
AUTO_MIGRATE=false
```

**Important**: Remember to re-enable after the emergency!

### Monitoring

**Check migration logs**:
```bash
# In Render dashboard, check deployment logs for:
✅ Auto-migrations completed successfully
   Applied: 2, Failed: 0, Total: 24
```

**Check server startup logs**:
```bash
# Should see:
✅ Database schema is up to date (no pending migrations)
# Or:
✅ Auto-migrations completed successfully
```

**Query migration history**:
```sql
SELECT 
  migration_name,
  applied_at,
  execution_time_ms,
  status
FROM schema_migrations
ORDER BY applied_at DESC;
```

## Running Migrations

### Automatic (Recommended)

Migrations run automatically during production deployments. No manual intervention required.

**Check status**:
```bash
npm run migrate:status
```

**Test locally**:
```bash
npm run migrate:auto:dry-run  # See what would run
npm run migrate:auto          # Run pending migrations
```

### Manual (Legacy/Emergency)

For emergency situations or local development:

Run a migration from the project root directory:

```bash
node backend/run-migration.js <migration-file-name>
```

**Example**:
```bash
node backend/run-migration.js 20250131-add-notification-campaign-fields.js
```

**Note**: Manual execution is only needed if auto-migrations are disabled or for testing individual migrations.

### What Happens

1. The migration runner loads the specified migration file
2. Executes the `up()` function which contains SQL commands
3. Logs progress and success/failure
4. Updates the database schema

**Important:** Always run from the project root directory, not from within the `backend/` or `migrations/` folders.

## Checking Migration Status

### Verify Columns Exist

Check if a specific column was added:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'customer_segments'
AND column_name = 'last_notification_sent_at';
```

List all columns in a table:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notification_campaigns'
ORDER BY ordinal_position;
```

### Verify Indexes Exist

Check indexes on a table:

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'customer_segments';
```

### Verify Constraints

Check foreign keys and constraints:

```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'notification_campaigns';
```

## Rollback Instructions

Each migration has two functions:
- `up()` - Applies the migration (adds columns, indexes, etc.)
- `down()` - Rolls back the migration (removes columns, indexes, etc.)

### How to Rollback

Rollback is currently manual. To rollback a migration:

1. Modify `backend/run-migration.js` temporarily
2. Change the line that calls `migration.up()` to `migration.down()`
3. Run the migration script: `node backend/run-migration.js <migration-file-name>`
4. Restore `run-migration.js` to its original state

### Rollback Example

```javascript
// In run-migration.js, change this:
await migration.up()

// To this:
await migration.down()
```

⚠️ **Warning:** Rollback may cause **data loss**. The `down()` function drops columns, which deletes all data in those columns. Only rollback if you're certain you want to lose that data.

## Migration Best Practices

### 1. Always Check for Existing Columns

Migrations should be idempotent (safe to run multiple times):

```javascript
const [existingCols] = await sequelize.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'my_table' 
  AND column_name = 'my_column'
`)

if (existingCols.length > 0) {
  console.log('⚠️  Column already exists, skipping...')
  return
}
```

### 2. Use Transactions When Possible

Wrap multiple operations in a transaction:

```javascript
const transaction = await sequelize.transaction()
try {
  await sequelize.query('ALTER TABLE ...', { transaction })
  await sequelize.query('CREATE INDEX ...', { transaction })
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
  throw error
}
```

### 3. Type Strategy: STRING + CHECK Constraint (Not Postgres ENUM)

**Policy:** For enumerated values, use `VARCHAR` columns with `CHECK` constraints instead of native Postgres `ENUM` types.

**Rationale:**
- Easier migrations when adding/removing values (no `ALTER TYPE` complexity)
- Simpler rollback procedures (drop constraint vs recreating entire type)
- Model validation via Sequelize `validate.isIn` provides application-level type safety
- CHECK constraint provides database-level enforcement

**Example in Model:**
```javascript
campaign_type: {
  type: DataTypes.STRING(50),
  allowNull: true,
  validate: {
    isIn: {
      args: [['lifecycle', 'promotional', 'transactional', 'new_offer_announcement', 'custom_promotion', 'seasonal_campaign']],
      msg: 'campaign_type must be one of: lifecycle, promotional, transactional, ...'
    }
  }
}
```

**Example in Migration:**
```javascript
// Add column as VARCHAR
await sequelize.query(`
  ALTER TABLE notification_campaigns 
  ADD COLUMN campaign_type VARCHAR(50)
`)

// Add CHECK constraint
await sequelize.query(`
  ALTER TABLE notification_campaigns 
  ADD CONSTRAINT check_campaign_type 
  CHECK (campaign_type IN (
    'lifecycle', 
    'promotional', 
    'transactional', 
    'new_offer_announcement', 
    'custom_promotion', 
    'seasonal_campaign'
  ))
`)
```

**Do NOT use:** `DataTypes.ENUM` in models or `CREATE TYPE` in migrations unless there's a specific architectural decision to change this policy documented here.

### 4. Test on Development First

**Never** run a migration directly in production without testing:

1. Run migration on local development database
2. Verify application works correctly
3. Test rollback on development database
4. Only then run in staging/production

### 4. Never Modify Existing Migrations

Once a migration has been run in production, **never modify it**. Instead:

- Create a new migration to make additional changes
- Keep a history of all schema changes
- Allows team members to see the evolution of the schema

### 5. Document Breaking Changes

If a migration contains breaking changes:

- Add comments in the migration file
- Update this README with notes
- Notify team members before deploying
- Consider adding data migration logic

## Troubleshooting

## Troubleshooting Auto-Migrations

### Error: "Could not acquire migration lock"

**Cause**: Another instance is running migrations or a previous run didn't release the lock

**Solution**:
```sql
-- Check for active locks
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- Force release (use with caution)
SELECT pg_advisory_unlock_all();
```

### Error: "Migration checksum mismatch"

**Cause**: Migration file was modified after being applied

**Solution**:
1. Review the migration file changes
2. If changes are intentional, create a new migration instead
3. Never modify applied migrations
4. Run `npm run migrate:validate` to see all mismatches

### Error: "schema_migrations table does not exist"

**Cause**: Tracking table migration hasn't been run

**Solution**:
```bash
npm run migrate:tracking-table
# Or:
node backend/run-migration.js 19990101-create-schema-migrations-table.js
```

### Deployment Failed: "Migration timeout"

**Cause**: Migration took longer than lock timeout (default 30s)

**Solution**:
1. Increase timeout: Set `MIGRATION_LOCK_TIMEOUT=60000` in Render env vars
2. Optimize slow migration (add indexes after data migration, not during)
3. Check database performance

### Server Won't Start: "Pending migrations detected"

**Cause**: Auto-migrations are disabled but pending migrations exist

**Solution**:
```bash
# Enable auto-migrations
AUTO_MIGRATE=true

# Or run manually
npm run migrate:auto
```

## Troubleshooting Manual Migrations

### Error: "Column already exists"

**Cause:** The migration was already run, or another migration created the column.

**Solution:** This is safe to ignore. The migration will skip adding duplicate columns. If you need to verify, check the database schema directly.

### Error: "Relation does not exist"

**Cause:** The table referenced in the migration doesn't exist.

**Solution:** 
- Check that the model has been synced (run earlier migrations first)
- Verify table name spelling (PostgreSQL is case-sensitive)
- Check if the table was renamed in a previous migration

### Error: "Constraint violation"

**Cause:** Existing data violates the new constraint (e.g., adding `NOT NULL` to a column with nulls).

**Solution:**
- Add a data migration to fix existing data first
- Or make the constraint nullable initially
- Or add a default value

### Error: "Cannot connect to database"

**Cause:** Database credentials are incorrect or database is not running.

**Solution:**
- Check `.env` file has correct `DATABASE_URL`
- Verify PostgreSQL is running: `pg_isready`
- Check firewall/network settings
- Verify database exists: `psql -l`

### Error: "Permission denied"

**Cause:** Database user doesn't have permission to alter tables.

**Solution:**
- Grant necessary permissions: `GRANT ALL ON DATABASE mydb TO myuser;`
- Or run as superuser (not recommended for production)
- Check `pg_hba.conf` authentication settings

### Error: Migration Hangs After Adding Columns

**Symptom:** Migration appears to add columns successfully but then hangs indefinitely, never completing or closing the database connection.

**Example Output:**
```
📝 Adding current_plan column...
✅ Column current_plan added
📝 Setting current_plan to "free" for existing businesses...
✅ Default values set
[hangs here - never completes]
```

**Cause:** Using `queryInterface.addColumn()` with transactions can cause deadlocks or hanging connections, especially when:
- Using the unsupported `after` option (MySQL-specific, not supported in PostgreSQL)
- Combining `queryInterface` methods with `sequelize.query()` in the same transaction
- Transaction is not properly committed or rolled back

**Solution:** Use raw SQL queries via `sequelize.query()` instead of `queryInterface` methods:

**Before (problematic):**
```javascript
export async function up(queryInterface, DataTypes) {
  const transaction = await sequelize.transaction()
  
  await queryInterface.addColumn(TABLE_NAME, 'current_plan', {
    type: DataTypes.ENUM('free', 'professional', 'enterprise'),
    allowNull: false,
    defaultValue: 'free',
    after: 'logo_file_size'  // ❌ Not supported in PostgreSQL
  }, { transaction })
  
  await transaction.commit()
}
```

**After (fixed):**
```javascript
export async function up() {
  // Check if column exists
  const [columnExists] = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'current_plan'
  `)
  
  if (columnExists.length === 0) {
    // Create ENUM type
    await sequelize.query(`
      CREATE TYPE enum_businesses_current_plan AS ENUM ('free', 'professional', 'enterprise')
    `)
    
    // Add column
    await sequelize.query(`
      ALTER TABLE businesses 
      ADD COLUMN current_plan enum_businesses_current_plan NOT NULL DEFAULT 'free'
    `)
  }
}
```

**Key differences:**
- Remove function parameters (`queryInterface`, `DataTypes`) - get them directly from sequelize
- Remove explicit transaction wrapping - each SQL query auto-commits
- Remove `after` option - not supported in PostgreSQL
- Use raw SQL for ENUM creation and column addition
- Check for existing columns/types before creating to ensure idempotency

**Related issues:**
- If columns were partially added before the hang, check the database schema before re-running
- Drop any partially created ENUM types: `DROP TYPE IF EXISTS enum_name CASCADE`
- Check for hanging transactions: `SELECT * FROM pg_stat_activity WHERE datname = 'your_db'`

## Migration File Structure

### Naming Convention

**ENFORCED Format:** `YYYYMMDD-description.js`

**Critical:** The auto-migration system **only executes** files following this format. Non-compliant filenames are automatically excluded to ensure deterministic execution order across all environments.

Examples:
- `20250221-add-grace-period-end-to-subscriptions.js` - **Handles schema drift** (creates or alters table)
- `20250131-add-notification-campaign-fields.js`
- `20250114-add-wallet-notification-tracking.js`
- `20250129-add-loyalty-tiers-to-offers.js`

**Why enforced:**
- Ensures lexicographic sorting = chronological sorting
- Prevents environment-specific execution order bugs
- Makes migration history predictable and auditable
- Non-dated files (e.g., `run-cleanup-migration.js`) are treated as utility scripts and excluded

**Excluded migrations (manual-only):**
Some migrations are intentionally excluded from automatic execution for safety:
- `20250121-cleanup-old-apple-wallet-passes.js` - Deletes data; must be run manually with explicit confirmation

To run excluded migrations manually:
```bash
node backend/run-migration.js 20250121-cleanup-old-apple-wallet-passes.js
```

### Migration Types

**Create Migrations:** Create new tables from scratch
- Safe to run multiple times (checks if table exists first)
- Example: `20250201-create-business-sessions-table.sql`

**Alter Migrations:** Modify existing tables (add/remove columns)
- Must check if column already exists
- Example: `20250131-add-notification-campaign-fields.js`

**Sync Migrations:** Handle schema drift (create OR alter)
- Checks if table exists; creates if missing, alters if present
- **Use for tables created outside migration system**
- Example: `20250221-add-grace-period-end-to-subscriptions.js`

### Required Exports

Each migration must export:

```javascript
export async function up() {
  // Code to apply migration
}

export async function down() {
  // Code to rollback migration
}

export default { up, down }
```

### Logging Standards

Use clear, emoji-enhanced logging:

```javascript
console.log('🔧 Starting migration: Description...')
console.log('✅ Step completed')
console.log('⚠️  Warning message')
console.log('❌ Error occurred')
console.log('🎉 Migration completed successfully!')
```

## Common Migration Patterns

### Adding a Column

```javascript
await sequelize.query(`
  ALTER TABLE my_table 
  ADD COLUMN my_column VARCHAR(50)
`)
```

### Adding an Index

```javascript
await sequelize.query(`
  CREATE INDEX idx_my_table_my_column 
  ON my_table (my_column)
`)
```

### Adding a Foreign Key

```javascript
await sequelize.query(`
  ALTER TABLE my_table 
  ADD CONSTRAINT fk_my_table_other 
  FOREIGN KEY (other_id) 
  REFERENCES other_table(id) 
  ON DELETE CASCADE
`)
```

### Adding a CHECK Constraint

```javascript
await sequelize.query(`
  ALTER TABLE my_table 
  ADD CONSTRAINT check_my_column 
  CHECK (my_column IN ('value1', 'value2', 'value3'))
`)
```

### Adding a Comment

```javascript
await sequelize.query(`
  COMMENT ON COLUMN my_table.my_column 
  IS 'Description of what this column contains'
`)
```

## Need Help?

- Check existing migrations in `backend/migrations/` for examples
- Review Sequelize documentation: https://sequelize.org/docs/v6/other-topics/migrations/
- Review PostgreSQL ALTER TABLE docs: https://www.postgresql.org/docs/current/sql-altertable.html
- Ask team members who have written migrations before
