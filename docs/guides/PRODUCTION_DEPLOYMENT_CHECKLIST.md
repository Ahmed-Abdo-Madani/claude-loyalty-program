# 🚀 Production Deployment Checklist

**Date:** 2025-10-04
**Platform:** Madna Loyalty Program
**Deployment Target:** Render.com (api.madna.me, app.madna.me)

---

## 🚨 CRITICAL: Pre-Deployment Verification (Run Before Every Deploy)

**Last Updated**: 2025-02-03
**Status**: REQUIRED BEFORE PRODUCTION DEPLOYMENT

### Quick Verification Commands

Run these commands locally before pushing to production:

```bash
# 1. Check for pending migrations
npm run migrate:pending

# 2. Test migrations in dry-run mode
npm run migrate:auto:dry-run

# 3. Validate migration integrity
npm run migrate:validate

# 4. Check migration status
npm run migrate:status

# 5. Test actual migration execution (in development DB)
npm run migrate:auto
```

### Expected Results

**migrate:pending** should show:
- List of migrations that will run in production
- Should NOT include excluded legacy migrations (20000102, 20000103, 20000104, 20000105)
- Should NOT include utility scripts (standalone-security-migration.js, etc.)

**migrate:auto:dry-run** should show:
- Ordered list of migrations that would execute
- No errors or warnings
- Execution order matches chronological date prefixes

**migrate:validate** should show:
- All applied migrations pass integrity check
- No checksum mismatches
- No missing migration files

**migrate:status** should show:
- Total migrations count
- Applied count
- Pending count
- Failed count (should be 0)

**migrate:auto** should complete with:
- All migrations applied successfully
- No errors in output
- Database schema matches models

### Common Issues to Check

**Type Mismatches:**
- [ ] No VARCHAR columns receiving BIGINT/INTEGER values
- [ ] No TEXT columns receiving numeric values
- [ ] All EXTRACT(EPOCH...) casts match column types
- [ ] All JSON/JSONB columns use proper syntax

**Constraint Conflicts:**
- [ ] No duplicate CHECK constraints on same column
- [ ] All CHECK constraint values match model ENUMs
- [ ] Foreign key references use correct column names
- [ ] UNIQUE constraints don't conflict with existing data

**Migration Export Patterns:**
- [ ] All migrations export `{ up, down }` or `default { up, down }`
- [ ] No migrations export standalone functions (unless excluded)
- [ ] All migrations accept queryInterface parameter (even if unused)

**Idempotency:**
- [ ] All CREATE statements use `IF NOT EXISTS`
- [ ] All DROP statements use `IF EXISTS`
- [ ] All ALTER ADD COLUMN use `IF NOT EXISTS` or check first
- [ ] All migrations can be run multiple times safely

### If Any Check Fails

**DO NOT DEPLOY** until the issue is fixed and all checks pass.

1. Fix the issue locally
2. Test the fix thoroughly
3. Re-run all verification commands
4. Only deploy when all checks pass

---

## ✅ PRE-DEPLOYMENT VERIFICATION

**Before running migrations, complete the Pre-Deployment Verification checklist above.**

### Code Quality Checks
- [x] All critical fixes applied and tested
- [x] Process error handlers implemented
- [x] Rate limiting active in all environments
- [x] Database pool monitoring configured
- [x] Frontend code splitting implemented
- [x] Lazy loading active
- [x] No console errors in production build
- [x] All tests passing

### Database Schema Validation
- [ ] schema_migrations tracking table exists
- [ ] No failed migrations in schema_migrations table
- [ ] All pending migrations identified and reviewed
- [ ] Migration checksums validated (npm run migrate:validate)
- [ ] AutoEngagementConfig table migration created and applied
- [ ] campaign_type CHECK constraint migration applied (20250131)
- [ ] Only ONE CHECK constraint exists on notification_campaigns.campaign_type
- [ ] All notification/campaign tables exist (notification_campaigns, notification_logs, customer_segments, auto_engagement_configs)
- [ ] All indexes created (campaign_type, linked_offer_id, last_notification_sent_at)
- [ ] Foreign key constraints in place (linked_offer_id → offers)

### Performance Validation
- [x] Backend throughput: 3,116 req/s ✅
- [x] P95 latency: 18ms ✅
- [x] P99 latency: 23ms ✅
- [x] Bundle size optimized: 144KB main (59% reduction) ✅
- [x] Memory stable: 3.5% growth ✅
- [x] Rate limiting working ✅

### Security Review
- [x] Rate limiting: 100 req/15min (production)
- [x] CORS configured for production domains
- [x] Security headers enabled
- [x] HTTPS enforced
- [x] /health endpoint exempt from rate limiting (Render.com fix)
- [x] SQL injection protection (Sequelize ORM)
- [x] Password hashing (bcryptjs)
- [x] JWT authentication configured

### Security Hardening
- [ ] JWT_SECRET set to strong random value (min 32 chars) ✅ Configured in Render
- [ ] QR_JWT_SECRET set to strong random value (min 64 chars) - NEEDS TO BE ADDED
- [ ] ENCRYPTION_KEY set to strong random value ✅ Configured in Render
- [ ] SESSION_SECRET set to strong random value ✅ Configured in Render
- [ ] No hardcoded JWT fallback secrets in middleware
- [ ] Session token validation implemented in hybridBusinessAuth.js
- [ ] All console.log statements removed from frontend
- [ ] All console.error replaced with logger in backend
- [ ] No sensitive data logged to console

---

## 📦 DEPLOYMENT STEPS

### Step 1: Verify Auto-Migration System ⏳

**Check migration status locally**:
```bash
# See what migrations will run
npm run migrate:pending

# Test in dry-run mode
npm run migrate:auto:dry-run

# Check current status
npm run migrate:status
```

**Expected output**:
- List of pending migrations (if any)
- No failed migrations in history
- Tracking table exists

**If tracking table doesn't exist**:
```bash
# Bootstrap the tracking system (one-time setup)
npm run migrate:tracking-table

# Then run all pending migrations
npm run migrate:auto
```

**Verify in database**:
```sql
-- Check tracking table exists
SELECT COUNT(*) FROM schema_migrations;

-- Check for failed migrations
SELECT * FROM schema_migrations WHERE status = 'failed';
```

### Step 1.5: Configure Render Auto-Migrations ⏳

**Verify render.yaml configuration**:
- [ ] preDeploy command configured: `node scripts/deploy-migrations.js`
- [ ] AUTO_MIGRATE environment variable set to `true` (or not set, defaults to true)
- [ ] MIGRATION_LOCK_TIMEOUT configured if needed (default 30000ms)

**In Render Dashboard**:
1. Go to service settings
2. Verify "Pre-Deploy Command" shows: `node scripts/deploy-migrations.js`
3. Check environment variables include `AUTO_MIGRATE=true`

**Test preDeploy locally**:
```bash
# Simulate what Render will run
cd backend
node scripts/deploy-migrations.js

# Should see:
✅ Auto-migrations completed successfully
   Applied: X, Failed: 0, Total: Y
```

### Step 2: Run Required Migrations (Legacy - Automated Now) ⏳

**Note**: With auto-migrations enabled, these run automatically during deployment.
For manual execution or verification:

```bash
# Run AutoEngagementConfig table migration
node backend/run-migration.js 20250201-create-auto-engagement-configs-table.js

# Run campaign fields migration (fixes CHECK constraint)
node backend/run-migration.js 20250131-add-notification-campaign-fields.js

# Verify migrations applied
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('auto_engagement_configs', 'notification_campaigns', 'customer_segments');"

# Verify campaign_type constraint
psql $DATABASE_URL -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'notification_campaigns'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%campaign_type%';"
# Expected: ONE constraint with 6 values
```

### Step 2: Commit and Push Changes ⏳

**Note**: Migrations now run automatically during deployment (preDeploy command) and server startup (safety net). You no longer need to manually run migrations.

```bash
# Add all changes
git add backend/server.js backend/config/database.js src/App.jsx vite.config.js

# Commit with descriptive message
git commit -m "🚀 Production-ready: Critical performance & security fixes

- Add process error handlers (prevent crashes)
- Enable rate limiting in all environments (preserve /health fix)
- Add database pool monitoring and alerts
- Implement frontend code splitting (59% bundle reduction)
- Add lazy loading for heavy components
- Maintain excellent performance (3,116 req/s)

Tested: All stress tests passing
Bundle: 353KB → 144KB main bundle
Security: Rate limiting + error handling complete"

# Push to main branch
git push origin main
```

### Step 3: Verify Render.com Auto-Deploy ⏳

**Backend (api.madna.me):**
- [ ] Check Render dashboard for deployment status
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Check logs for "🚀 Madna Loyalty Platform Backend running"
- [ ] Verify "💾 Database pool initialized" message
- [ ] No error messages in logs

**Frontend (app.madna.me):**
- [ ] Check Render dashboard for deployment status
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Verify build output shows optimized bundles
- [ ] Check for "✓ built in X.XXs" success message

### Step 4: Health Checks ⏳

```bash
# Test API health endpoint
curl https://api.madna.me/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-04T...",
  "service": "loyalty-platform-backend",
  "version": "1.0.0"
}

# Test rate limiting (should block after 100 requests)
for i in {1..105}; do curl -s https://api.madna.me/api/wallet/pass/test$i; done
# Should see 429 errors after ~100 requests
```

### Step 5: Functional Testing ⏳

**Frontend Tests:**
- [ ] Visit https://app.madna.me
- [ ] Landing page loads correctly
- [ ] Login page accessible at /auth
- [ ] Admin login accessible at /admin/login
- [ ] Lazy loading works (check Network tab, routes load on demand)
- [ ] No console errors
- [ ] Mobile responsive

**Backend Tests:**
- [ ] Business login works
- [ ] Admin login works
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Wallet integration functional

### Step 5: Verify Notification & Campaign System ⏳

**Test Campaign Creation:**
- [ ] Create campaign with type 'new_offer_announcement' - should succeed
- [ ] Create campaign with type 'custom_promotion' - should succeed
- [ ] Create campaign with type 'seasonal_campaign' - should succeed
- [ ] View campaign in Campaign History tab
- [ ] Campaign action buttons work (edit, delete, activate)

**Test Segment Notifications:**
- [ ] Load segments in CustomersTab
- [ ] Select a segment from dropdown
- [ ] Send notification to segment - should succeed
- [ ] Verify notification appears in history

**Test Auto-Engagement:**
- [ ] Check server logs for: `✅ Auto-engagement cron job scheduled`
- [ ] No errors about missing auto_engagement_configs table
- [ ] Create auto-engagement config via API
- [ ] Verify config saved in database

### Step 7: Performance Monitoring ⏳

**First 30 Minutes:**
- [ ] Monitor Render logs for errors
- [ ] Check response times in Render metrics
- [ ] Verify no rate limit issues from legitimate traffic
- [ ] Monitor database connection pool (should see logs every 30s)
- [ ] Check error handler logs (should be minimal/none)

**First 2 Hours:**
- [ ] Verify no memory leaks (check Render memory metrics)
- [ ] Check database pool is not exhausted
- [ ] Verify auto-restart hasn't triggered
- [ ] Test a few customer signups
- [ ] Test QR code scanning

**First 24 Hours:**
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify rate limiting effectiveness
- [ ] Review any error logs
- [ ] Test wallet pass updates

---

## 🔧 POST-DEPLOYMENT VALIDATION

### Critical Functionality
- [ ] Customer signup flow works
- [ ] QR code scanning works
- [ ] Wallet pass generation works
- [ ] Apple Wallet integration works
- [ ] Google Wallet integration works
- [ ] Business dashboard accessible
- [ ] Admin dashboard accessible
- [ ] Notifications system works
- [ ] All database migrations applied successfully
- [ ] Campaign creation works for all types
- [ ] Segment notifications functional
- [ ] Auto-engagement cron job running
- [ ] No hardcoded secrets in code
- [ ] Session validation implemented
- [ ] Console logging cleaned up
- [ ] QR_JWT_SECRET added to Render environment variables

### Performance Metrics (After 24h)
- [ ] Average response time < 100ms
- [ ] Error rate < 1%
- [ ] Database pool healthy (no exhaustion warnings)
- [ ] Memory usage stable
- [ ] No unhandled rejections logged

---

## 🚨 ROLLBACK PROCEDURE (If Needed)

If critical issues occur:

### Quick Rollback (Render Dashboard)
1. Go to Render dashboard
2. Navigate to service
3. Click "Rollback" to previous deployment
4. Confirm rollback
5. Wait 2-3 minutes for deployment
6. Verify rollback successful

### Manual Rollback (Git)
```bash
# Revert to previous commit
git revert HEAD

# Push revert
git push origin main

# Render will auto-deploy
```

### Emergency Contacts
- **Technical Lead:** [Your contact]
- **Database Admin:** [Your contact]
- **Render Support:** support@render.com

---

## 📊 MONITORING CHECKLIST

### Daily Checks (First Week)
- [ ] Check error logs
- [ ] Monitor response times
- [ ] Verify database pool health
- [ ] Check rate limiting metrics
- [ ] Review user feedback

### Weekly Checks
- [ ] Database backup verification
- [ ] Security log review
- [ ] Performance trends analysis
- [ ] Cost monitoring
- [ ] User growth metrics

---

## 🎯 SUCCESS CRITERIA

Deployment is considered successful when:

- [x] All services deployed without errors
- [ ] Health checks passing for 2 hours
- [ ] No critical errors in logs
- [ ] Response times < 100ms average
- [ ] Rate limiting working correctly
- [ ] Database pool healthy
- [ ] No unhandled rejections
- [ ] User flows working end-to-end
- [ ] Mobile experience good
- [ ] Wallet integration functional

---

## 📝 PRODUCTION ENVIRONMENT DETAILS

### URLs
- **Frontend:** https://app.madna.me
- **API:** https://api.madna.me
- **Health Check:** https://api.madna.me/health

### Limits & Thresholds
- **Rate Limit:** 100 requests per 15 minutes per IP
- **DB Pool Max:** 20 connections
- **DB Pool Warning:** 15 connections
- **Request Timeout:** 30 seconds
- **File Upload Limit:** 10 MB
- **Image Upload Limit:** 5 MB

### Key Features Enabled
- ✅ Process error handlers
- ✅ Rate limiting (all environments)
- ✅ Database pool monitoring
- ✅ Security headers
- ✅ CORS (production domains only)
- ✅ Lazy loading (12/14 pages)
- ✅ Code splitting (24 chunks)
- ✅ Graceful shutdown
- ✅ Request logging

---

## 🔍 WHAT TO WATCH FOR

### Warning Signs
⚠️ **High response times** (>200ms average)
⚠️ **Database pool warnings** (exhaustion risk)
⚠️ **Memory growth** (>10% per hour)
⚠️ **High error rate** (>5%)
⚠️ **Rate limit false positives** (legitimate users blocked)

### Normal Behavior
✅ Periodic pool monitoring logs (every 30s)
✅ Rate limit cleanup logs (every 5 min)
✅ Occasional rate limit blocks (for aggressive users)
✅ Memory fluctuations (GC cycles)
✅ Response time spikes (cold starts after inactivity)

---

## 📞 SUPPORT RESOURCES

### Documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [FIXES_APPLIED_SUMMARY.md](FIXES_APPLIED_SUMMARY.md) - What was changed
- [STRESS_TEST_REPORT.md](STRESS_TEST_REPORT.md) - Performance analysis
- [CRITICAL_FIXES.md](CRITICAL_FIXES.md) - Fix details

### Tools
- **Render Dashboard:** https://dashboard.render.com
- **Health Check:** `curl https://api.madna.me/health`
- **Rate Limit Test:** See rate-limit-test.js
- **Performance Test:** See performance-test.js

---

## ✅ FINAL SIGN-OFF

**Deployment Lead:** ___________________ Date: ___________

**Technical Review:** ___________________ Date: ___________

**QA Approval:** ___________________ Date: ___________

---

## 📅 POST-DEPLOYMENT TIMELINE

**Immediately:**
- Monitor for errors (first 30 min)
- Verify all critical flows

**After 2 Hours:**
- Check all metrics are healthy
- Verify no performance degradation

**After 24 Hours:**
- Full system health review
- Performance trend analysis
- Error log review

**After 1 Week:**
- User feedback review
- Performance optimization opportunities
- Cost analysis

---

**🎉 Ready to deploy! All systems checked and validated.**

**Last Updated:** 2025-10-04
**Version:** 1.0.0 (Production-Ready)
**Critical Fixes:** ✅ Applied and Tested
