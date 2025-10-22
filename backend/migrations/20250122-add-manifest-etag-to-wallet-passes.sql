-- ============================================================================
-- Migration: Add manifest_etag Column to wallet_passes
-- Date: October 22, 2025
-- Purpose: Enable ETag-based HTTP caching for Apple Wallet pass updates
-- ============================================================================

-- IMPORTANT: Run this script in pgAdmin Query Tool
-- 1. Open pgAdmin
-- 2. Connect to your database
-- 3. Right-click on database → Query Tool
-- 4. Paste this script
-- 5. Execute (F5 or click Execute button)

-- ============================================================================
-- STEP 1: Add manifest_etag column
-- ============================================================================

DO $$ 
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'wallet_passes' 
        AND column_name = 'manifest_etag'
    ) THEN
        -- Add the column
        ALTER TABLE wallet_passes 
        ADD COLUMN manifest_etag VARCHAR(32) NULL;
        
        RAISE NOTICE 'Column manifest_etag added successfully';
    ELSE
        RAISE NOTICE 'Column manifest_etag already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add column comment (documentation)
-- ============================================================================

COMMENT ON COLUMN wallet_passes.manifest_etag IS 
'ETag computed from manifest hash for HTTP caching (Apple Wallet only)';

-- ============================================================================
-- STEP 3: Create index for faster lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wallet_passes_manifest_etag 
ON wallet_passes(manifest_etag);

-- ============================================================================
-- VERIFICATION: Check if migration was successful
-- ============================================================================

-- Show column details
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'wallet_passes' 
    AND column_name = 'manifest_etag';

-- Show index details
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'wallet_passes' 
    AND indexname = 'idx_wallet_passes_manifest_etag';

-- Count existing records (all should have NULL manifest_etag initially)
SELECT 
    COUNT(*) as total_passes,
    COUNT(manifest_etag) as passes_with_etag,
    COUNT(*) - COUNT(manifest_etag) as passes_without_etag
FROM wallet_passes;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify column exists in verification query above';
    RAISE NOTICE '2. Restart your application';
    RAISE NOTICE '3. Generate a new Apple Wallet pass';
    RAISE NOTICE '4. Check that manifest_etag is populated';
END $$;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- Uncomment and run these lines if you need to rollback the migration:
/*
DROP INDEX IF EXISTS idx_wallet_passes_manifest_etag;
ALTER TABLE wallet_passes DROP COLUMN IF EXISTS manifest_etag;
SELECT 'Rollback completed - manifest_etag column removed' AS status;
*/
