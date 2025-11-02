-- ========================================
-- Record Legacy Migrations as Applied
-- ========================================
-- Purpose: Mark legacy standalone migrations that were already
--          applied manually during development as 'success' in
--          the schema_migrations tracking table.
--
-- When to run: ONE TIME ONLY after deploying AutoMigrationRunner
-- How to run: Execute in production database via Render shell or psql
--
-- Date: 2025-02-03
-- ========================================

-- Insert legacy migrations with success status
INSERT INTO schema_migrations (migration_name, applied_at, status, execution_time_ms, checksum) 
VALUES 
  ('20000102-add-secure-ids-cautious', NOW(), 'success', 0, NULL),
  ('20000103-simplify-branch-location-fields', NOW(), 'success', 0, NULL),
  ('20000104-create-offer-card-designs-table', NOW(), 'success', 0, NULL),
  ('20000105-aggressive-security-migration', NOW(), 'success', 0, NULL)
ON CONFLICT (migration_name) DO NOTHING;

-- Verify insertion
SELECT 
  migration_name, 
  applied_at, 
  status 
FROM schema_migrations 
WHERE migration_name LIKE '20000%' 
ORDER BY migration_name;

-- Expected output: 4 rows with status='success'

-- ========================================
-- Verification Queries
-- ========================================

-- Check total migrations recorded
SELECT 
  COUNT(*) as total_migrations,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM schema_migrations;

-- List all applied migrations
SELECT 
  migration_name,
  applied_at,
  execution_time_ms,
  status
FROM schema_migrations
ORDER BY applied_at DESC;
