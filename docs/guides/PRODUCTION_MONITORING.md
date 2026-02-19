# Production Monitoring Guide

## Post-Migration Health Checks

### Daily Checks (First Week)
```sql
-- 1. Verify migration stability
SELECT migration_name, status, execution_time_ms 
FROM schema_migrations 
WHERE applied_at > NOW() - INTERVAL '7 days'
ORDER BY applied_at DESC;

-- 2. Check new table usage
SELECT 
  'conversations' AS table_name, COUNT(*) AS row_count FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'message_templates', COUNT(*) FROM message_templates;

-- 3. Monitor ENUM usage
SELECT current_plan, COUNT(*) 
FROM businesses 
WHERE current_plan IN ('loyalty_starter', 'loyalty_growth', 'loyalty_professional', 'pos_business', 'pos_enterprise', 'pos_premium')
GROUP BY current_plan;

-- 4. Verify wallet pass generation still works
SELECT wallet_type, COUNT(*) 
FROM wallet_passes 
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY wallet_type;
```

### Error Monitoring
Watch Render logs for:
- `relation "..." does not exist` → Migration didn't apply
- `constraint violation` → Data integrity issue
- `ENUM value not found` → Model/DB mismatch
- `500 Internal Server Error` on wallet endpoints → Critical issue

### Performance Metrics
- Migration execution time: Target <3 seconds total
- Server startup time: Target <10 seconds
- Wallet pass generation: Target <500ms per pass
- Messaging API response: Target <200ms
