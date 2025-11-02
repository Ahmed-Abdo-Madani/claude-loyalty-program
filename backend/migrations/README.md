# Database Migrations Guide

## Overview

Migrations are database schema changes that must be explicitly run to update the database structure. Sequelize models define the application's expected database schema, but **Sequelize does not automatically sync schema changes in production**. After pulling code with new model definitions, you must run the corresponding migration to update the database.

## Running Migrations

### Basic Usage

Run a migration from the project root directory:

```bash
node backend/run-migration.js <migration-file-name>
```

### Example

```bash
node backend/run-migration.js 20250131-add-notification-campaign-fields.js
```

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

## Migration File Structure

### Naming Convention

Format: `YYYYMMDD-description.js`

Examples:
- `20250202-create-or-sync-business-sessions.js` - **Handles schema drift** (creates or alters table)
- `20250131-add-notification-campaign-fields.js`
- `20250114-add-wallet-notification-tracking.js`
- `20250129-add-loyalty-tiers-to-offers.js`

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
- Example: `20250202-create-or-sync-business-sessions.js`

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
