-- Migration: Create schema_migrations tracking table
-- 
-- Purpose: Track which migrations have been applied to prevent duplicate execution
-- and provide migration history for the automatic migration system.
-- 
-- This is the foundation migration for the auto-migration system.
-- Must be run first before enabling automatic migrations.
-- 
-- Date: 2025-02-03
-- Usage: Run this in pgAdmin Query Tool or via psql

-- ==============================================================================
-- UP MIGRATION
-- ==============================================================================

-- Check if table exists before creating (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'schema_migrations'
    ) THEN
        -- Create the tracking table
        CREATE TABLE schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
            execution_time_ms INTEGER,
            status VARCHAR(20) NOT NULL DEFAULT 'success',
            error_message TEXT,
            checksum VARCHAR(64)
        );

        -- Add column comments
        COMMENT ON COLUMN schema_migrations.migration_name IS 'Filename without .js extension';
        COMMENT ON COLUMN schema_migrations.applied_at IS 'When migration was applied';
        COMMENT ON COLUMN schema_migrations.execution_time_ms IS 'How long the migration took to execute';
        COMMENT ON COLUMN schema_migrations.status IS 'Migration execution status';
        COMMENT ON COLUMN schema_migrations.error_message IS 'Error details if migration failed';
        COMMENT ON COLUMN schema_migrations.checksum IS 'SHA-256 hash of migration file content for integrity validation';

        -- Add table comment
        COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations for automatic migration system';

        -- Create indexes
        CREATE UNIQUE INDEX idx_schema_migrations_name ON schema_migrations(migration_name);
        CREATE INDEX idx_schema_migrations_applied_at ON schema_migrations(applied_at);
        CREATE INDEX idx_schema_migrations_status ON schema_migrations(status);

        -- Add CHECK constraint for status values
        ALTER TABLE schema_migrations 
        ADD CONSTRAINT check_schema_migrations_status 
        CHECK (status IN ('success', 'failed', 'running'));

        RAISE NOTICE '✅ Schema migrations tracking table created successfully!';
        RAISE NOTICE '   📊 Columns: 7 (id, migration_name, applied_at, execution_time_ms, status, error_message, checksum)';
        RAISE NOTICE '   📇 Indexes: 3 (name, applied_at, status)';
        RAISE NOTICE '   🔒 Constraints: 1 (check_schema_migrations_status)';
    ELSE
        RAISE NOTICE '⚠️  Table schema_migrations already exists, skipping creation';
    END IF;
END
$$;

-- ==============================================================================
-- DOWN MIGRATION (Rollback)
-- ==============================================================================
-- WARNING: This will lose all migration history!
-- Uncomment the lines below to rollback:

/*
DROP INDEX IF EXISTS idx_schema_migrations_status;
DROP INDEX IF EXISTS idx_schema_migrations_applied_at;
DROP INDEX IF EXISTS idx_schema_migrations_name;
DROP TABLE IF EXISTS schema_migrations CASCADE;
*/

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Verify table exists
SELECT 
    tablename, 
    schemaname 
FROM pg_tables 
WHERE tablename = 'schema_migrations';

-- Check columns
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'schema_migrations'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'schema_migrations';

-- Check constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'schema_migrations'::regclass;

-- View migration history (once migrations start running)
-- SELECT 
--     migration_name,
--     applied_at,
--     execution_time_ms,
--     status
-- FROM schema_migrations
-- ORDER BY applied_at DESC
-- LIMIT 20;
