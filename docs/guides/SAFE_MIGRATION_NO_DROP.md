# Safe No-Drop Migration Checklist & Guide

## 1. Risk Assessment
| Risk Category | Details | Mitigation |
|--------------|---------|------------|
| **ENUM Irreversibility** | Adding values to `enum_subscriptions_plan_type` and others cannot be undone transactionally or easily rolled back. | **Verify thoroughly** on staging/copy before running. Accept that new values will persist even after rollback unless manual surgery is performed. |
| **Data Conflicts** | `uuid_generate_v4()` collision (extremely rare) or existing data violating new constraints. | Pre-deployment checks on production copy. |
| **Validation Failures** | Startup checks in `server.js` (e.g., matching campaign types) might fail if migrations don't apply correctly. | Use `SKIP_SCHEMA_VALIDATION=true` env var as emergency bypass. |
| **Transaction Locking** | `ALTER TYPE` might lock tables if active queries are using the ENUM. | Deploy during low-traffic window; migration is instantaneous but requires lock. |

## 2. Pre-Deployment Checklist
- [ ] **Baseline:** Document production DB state (tables, ENUMs).
- [ ] **Test Run:** Apply all 14 migrations on a *fresh copy* of production DB.
- [ ] **Validate:** Run `backend/scripts/validate-schema.sql` on the copy.
- [ ] **Startup:** Start backend against the copy; ensure no exit(1).
- [ ] **Endpoints:** Verify `/api/wallet/generate-pass` and `/api/subscriptions/plans` on the copy.
- [ ] **Backup:** Ensure point-in-time recovery is active on Render.

## 2.5. Pre-Deployment Testing (Zero-Downtime Verification)

Before triggering the deployment, run the production copy verification script to ensure 100% safety.

1. **Configure Environment:**
   Create a `.env.test` file (or use local variables) with:
   ```env
   PRODUCTION_DATABASE_URL=postgresql://user:pass@prod-host:5432/loyalty_prod
   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/loyalty_test
   ```

2. **Run Dry-Run (Planning):**
   ```bash
   npm run test:prod-copy:dry-run
   ```
   *   Verify the list of 14 pending migrations.
   *   Confirm keyserver/endpoints to be tested.

3. **Run Full Simulation:**
   ```bash
   npm run test:prod-copy
   ```
   *   **What happens:**
       *   Dumps production schema & critical data (Customers, Passes, Businesses).
       *   Loads data into `loyalty_test` DB.
       *   Applies all pending migrations.
       *   Validates schema changes (tables, columns, constraints).
       *   Tests critical Wallet API endpoints against the migrated data.
   *   **Output:** Generates `MIGRATION_SCHEMA_DIFF_*.md` and `MIGRATION_ROLLBACK_PLAN_*.md`.

4. **Review Results:**
   *   ✅ **Success:** All checks pass. Proceed to deploy.
   *   ❌ **Failure:** Check `logs/migration-test-errors-*.log`. **DO NOT DEPLOY.**

### Troubleshooting Common Issues
*   **`pg_dump: command not found`**: Ensure PostgreSQL client tools are installed and in your PATH.
*   **`Migration failed: constraint violation`**: Incompatible data in production. Check `logs/migration-test-*.log` for specific record IDs.
*   **`Endpoint test failed: 500 error`**: Check `TEST_SERVER_BASE_URL` or application logs. Ensure the test server is running if not auto-started.

## 3. Deployment Flow (Step-by-Step)
1.  **Stop Non-Critical Workers:** (Optional) Pause background jobs if possible.
2.  **Deploy Code:** Push `main` branch to Render.
3.  **Auto-Migration:** Render runs `preDeploy` script (`deploy-migrations.js`).
    *   *System automatically applies pending migrations.*
    *   *If failure:* Deployment aborts, old version stays running (Zero Downtime).
4.  **Health Check:** New instance starts.
    *   `server.js` validates schema compatibility.
    *   *If validation fails:* New instance crashes, Render allows old version to keep serving.
5.  **Traffic Switch:** Render routes traffic to new instance only after healthy start.
6.  **Post-Deploy Verification:** Run manual checks below.

## 4. Production Verification Steps
Perform these checks immediately after deployment:

**A. API Health & Metadata**
```bash
# 1. System Health
curl https://api.madna.me/health
# Expect: {"status":"healthy", ...}

# 2. Migration Status
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://api.madna.me/api/admin/migrations
# Expect: {"pending": 0, "total": 14}
```

**B. Critical Business Functions**
1.  **Wallet Pass:** Generate a pass for an existing customer.
    *   *Action:* POST `/api/wallet/generate-pass`
    *   *Expect:* 200 OK + Valid PKPass URL.
2.  **Subscription Plans:** Fetch available plans.
    *   *Action:* GET `/api/subscriptions/plans`
    *   *Expect:* Response includes new tiers (`loyalty_starter`, `pos_business`, etc.).
3.  **Messaging (New):** List conversations (should be empty but successful).
    *   *Action:* GET `/api/admin/messages/conversations`
    *   *Expect:* 200 OK `[]`.

**C. Data Integrity**
1.  **Customer Data:** Fetch a known customer profile.
2.  **Business Profile:** Check if a business profile loads with new fields (e.g., `menu_phone` should be null/empty, not undefined error).

## 5. Rollback Procedures

### Scenario A: Deployment Failed (Code/Migration Error)
*   **System Action:** Render automatically cancels deployment. Old version remains active.
*   **Manual Action:** None required for immediate stability. Fix code and retry.

### Scenario B: Application Broken After Successful Deploy
*   **Action:** Revert code to previous commit.
    ```bash
    git revert -m 1 HEAD
    git push origin main
    ```
*   **Database:** **DO NOT** drop ENUM values. New tables/columns can remain (benign) or be dropped manually.

### Scenario C: Manual Database Rollback (Emergency/Data Corruption)
*   **Warning:** Destructive. Only use if absolutely necessary.
*   **Steps:**
    1.  Enable Maintenance Mode: `MAINTENANCE_MODE=true`
    2.  Connect to DB via CLI/pgAdmin.
    3.  Run Rollback Script:
        ```sql
        \i backend/scripts/rollback-migrations.sql
        ```
    4.  *Note:* This drops `messages` table and columns. **It DOES NOT revert ENUM changes.**
    5.  Re-deploy previous code version.
    6.  Disable maintenance mode.

## 6. Success Criteria
- [ ] All migrations applied (`schema_migrations` matches).
- [ ] Server validates `campaign_type` constraints on startup.
- [ ] No regression in Wallet Pass generation.
- [ ] New ENUM types are visible in API responses.
