# Pre-Deployment Fixes Required

**Date**: 2025-02-01
**Status**: CRITICAL - Must complete before production deployment
**Estimated Time**: 3-4 hours

---

## 🔴 Critical Blockers (Must Fix)

### 1. Create AutoEngagementConfig Table Migration

**Priority**: CRITICAL
**Time**: 30 minutes
**File**: `backend/migrations/20250201-create-auto-engagement-configs-table.js`

**Why**: The AutoEngagementConfig model exists but the database table doesn't. Server will crash when auto-engagement cron runs.

**Steps**:
1. Create migration file following the pattern from `20250131-add-notification-campaign-fields.js`
2. Include all fields from `backend/models/AutoEngagementConfig.js`
3. Add indexes, foreign keys, and CHECK constraints
4. Test migration locally first
5. Run in production: `node backend/run-migration.js 20250201-create-auto-engagement-configs-table.js`

**Verification**:
```sql
SELECT * FROM auto_engagement_configs LIMIT 1;
```

---

### 2. Fix campaign_type CHECK Constraint Conflict

**Priority**: CRITICAL
**Time**: 15 minutes
**File**: Existing migration `20250131-add-notification-campaign-fields.js`

**Why**: Multiple CHECK constraints exist on campaign_type column, blocking promotional campaign creation.

**Steps**:
1. Verify migration file is correct (it is)
2. Run migration: `node backend/run-migration.js 20250131-add-notification-campaign-fields.js`
3. Migration will drop ALL legacy constraints and create one authoritative constraint
4. Verify only one constraint exists

**Verification**:
```sql
SELECT conname FROM pg_constraint 
WHERE conrelid = 'notification_campaigns'::regclass 
AND contype = 'c' 
AND pg_get_constraintdef(oid) LIKE '%campaign_type%';
-- Should return exactly ONE row: check_campaign_type
```

**Test**:
- Create a campaign with `campaign_type: 'custom_promotion'`
- Should succeed without constraint violation

---

### 3. Add Missing QR_JWT_SECRET Environment Variable

**Priority**: CRITICAL (Security)
**Time**: 5 minutes
**Platform**: Render.com Dashboard

**Why**: QR code signing requires a dedicated secret. Currently missing from production environment.

**Steps**:
1. Generate secret: `openssl rand -base64 64`
2. Add to Render.com environment variables:
   - Name: `QR_JWT_SECRET`
   - Value: <generated-secret>
3. Redeploy application

**Verification**:
- Check server logs for QR code generation
- No errors about missing QR_JWT_SECRET

---

### 4. Remove Hardcoded JWT Secrets

**Priority**: CRITICAL (Security)
**Time**: 20 minutes
**Files**: 
- `backend/middleware/adminAuth.js`
- `backend/middleware/branchManagerAuth.js`

**Why**: Hardcoded fallback secrets are a security vulnerability.

**Changes**:
- Remove `|| 'your-admin-jwt-secret'` fallback in adminAuth.js (line 26)
- Remove `|| 'dev-branch-manager-jwt-secret-change-in-production'` fallback in branchManagerAuth.js (lines 53, 114, 138)
- Add explicit checks that fail if JWT_SECRET is missing
- Replace console.* with logger.*

**Verification**:
- Search codebase for hardcoded secrets: `grep -r "your-admin-jwt-secret" backend/`
- Should return no results

---

### 5. Implement Session Token Validation

**Priority**: HIGH (Security)
**Time**: 45 minutes
**File**: `backend/middleware/hybridBusinessAuth.js`

**Why**: TODO comment at line 83 indicates session validation is not implemented.

**Changes**:
- Import AdminSession model
- Query session by token and business_id
- Verify session is active and not expired
- Update last_used_at on successful validation
- Return 401 if session invalid

**Verification**:
- Test login and API calls
- Try using another business's session token - should fail with 401

---

## 🟡 High Priority (Should Fix)

### 6. Clean Up Console Logging

**Priority**: HIGH
**Time**: 45 minutes
**Files**: Multiple frontend and backend files

**Why**: Console logs leak sensitive data and clutter production logs.

**Frontend files to clean**:
- `src/config/api.js` - Remove API base URL log
- `src/pages/AuthPage.jsx` - Remove business ID logs
- `src/pages/Dashboard.jsx` - Remove business data logs
- `src/components/CustomersTab.jsx` - Remove customer loading logs
- `src/components/BranchesTab.jsx` - Remove branch loading logs
- `src/components/OffersTab.jsx` - Remove offer loading logs
- And 10+ other component files

**Backend files to clean**:
- `backend/routes/notifications.js` - Replace console.error with logger.error
- `backend/middleware/adminAuth.js` - Replace console.log with logger.warn

**Pattern**:
- Remove all `console.log` statements from production code

---

### 7. Update Environment Variable Documentation

**Priority**: MEDIUM
**Time**: 15 minutes
**File**: `backend/.env.example`

**Why**: Documentation should match production configuration.

**Changes**:
- Add all missing environment variables
- Document production vs development patterns
- Add security warnings for critical secrets
- Include generation commands

---

## ✅ Deployment Sequence

**Total Time**: ~4 hours

1. **Local Testing** (1 hour)
   - Create AutoEngagementConfig migration
   - Run both migrations locally
   - Test campaign creation
   - Test auto-engagement config creation
   - Verify no errors

2. **Code Cleanup** (1 hour)
   - Remove hardcoded secrets
   - Implement session validation
   - Clean up console logging
   - Update .env.example

3. **Commit and Push** (15 minutes)
   - Commit all changes
   - Push to main branch
   - Verify CI/CD passes (if configured)

4. **Production Deployment** (30 minutes)
   - Add QR_JWT_SECRET to Render environment variables
   - Run migrations in production database
   - Deploy code
   - Monitor logs

5. **Post-Deployment Testing** (1 hour)
   - Test all critical flows
   - Create test campaign
   - Send test notifications
   - Verify auto-engagement scheduled
   - Monitor for errors

---

## 🚨 Rollback Plan

If critical issues occur:

1. **Immediate**: Rollback deployment in Render dashboard
2. **Database**: Keep migrations applied (they're backward compatible)
3. **Code**: Revert to previous commit
4. **Monitor**: Check logs for 30 minutes after rollback

---

## 📞 Support Checklist

- [ ] Database backup taken before migrations
- [ ] All environment variables documented
- [ ] Migration scripts tested locally
- [ ] Rollback procedure documented
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment window

---

## 📋 Environment Variables Status

**Already Configured in Render** ✅:
- JWT_SECRET
- SESSION_SECRET
- ENCRYPTION_KEY
- APNS_PRODUCTION=true
- APNS_TOPIC=pass.me.madna.api
- APPLE_PASS_TYPE_ID=pass.me.madna.api
- APPLE_TEAM_ID=NFQ6M7TFY2
- UPLOADS_DIR=/app/uploads
- UPLOADS_BASE_URL=https://api.madna.me/uploads
- FRONTEND_URL=https://app.madna.me
- BASE_URL=https://api.madna.me
- DATABASE_URL
- WALLET_NOTIFICATION_DAILY_LIMIT=10

**MISSING - Need to Add** ⚠️:
- QR_JWT_SECRET (generate with: openssl rand -base64 64)

---

## 🎯 Success Criteria

All fixes must be completed and verified before production deployment:

- [ ] ✅ AutoEngagementConfig table migration created
- [ ] ✅ AutoEngagementConfig table exists in production
- [ ] ✅ campaign_type CHECK constraint fixed (only ONE constraint)
- [ ] ✅ Campaign creation works for all 6 types
- [ ] ✅ QR_JWT_SECRET added to Render environment
- [ ] ✅ No hardcoded JWT secrets in code
- [ ] ✅ Session validation implemented and tested
- [ ] ✅ All console.log statements removed
- [ ] ✅ All console.error replaced with logger
- [ ] ✅ .env.example updated
- [ ] ✅ Server starts without errors
- [ ] ✅ Auto-engagement cron scheduled
- [ ] ✅ No schema validation errors

---

## 📊 Testing Matrix

| Test | Expected Result | Status |
|------|----------------|--------|
| Create campaign (lifecycle) | 201 Created | [ ] |
| Create campaign (promotional) | 201 Created | [ ] |
| Create campaign (custom_promotion) | 201 Created | [ ] |
| Create campaign (seasonal_campaign) | 201 Created | [ ] |
| Send segment notification | 200 OK | [ ] |
| Auto-engagement config create | 201 Created | [ ] |
| QR code generation | 200 OK | [ ] |
| Session token validation | 401 if invalid | [ ] |
| Server startup | No schema errors | [ ] |
| Cron job scheduled | Log message present | [ ] |

---

## 🔍 Pre-Deployment Verification Commands

Run these commands before deploying:

```bash
# 1. Verify migrations exist
ls -la backend/migrations/20250131-add-notification-campaign-fields.js
ls -la backend/migrations/20250201-create-auto-engagement-configs-table.js

# 2. Search for hardcoded secrets
grep -r "your-admin-jwt-secret" backend/
grep -r "dev-branch-manager-jwt" backend/
# Should return no results

# 3. Search for console.log in frontend
grep -r "console.log" src/ | grep -v node_modules | wc -l
# Should be 0 or minimal

# 4. Verify .env.example is updated
grep "QR_JWT_SECRET" backend/.env.example
# Should find the variable documented

# 5. Check session validation implemented
grep -A 10 "Validate session token" backend/middleware/hybridBusinessAuth.js
# Should see AdminSession query code
```

---

## 📝 Deployment Commands

Execute in order:

```bash
# 1. Connect to production database
psql $DATABASE_URL

# 2. Run AutoEngagementConfig migration
node backend/run-migration.js 20250201-create-auto-engagement-configs-table.js

# 3. Run campaign_type migration
node backend/run-migration.js 20250131-add-notification-campaign-fields.js

# 4. Verify migrations
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'auto_engagement_configs';

SELECT conname FROM pg_constraint 
WHERE conrelid = 'notification_campaigns'::regclass 
AND contype = 'c' 
AND pg_get_constraintdef(oid) LIKE '%campaign_type%';

# 5. Exit database
\q

# 6. Deploy code (Render auto-deploys on push to main)
git push origin main

# 7. Monitor logs
# Watch Render dashboard logs for:
# - ✅ Auto-engagement cron job scheduled
# - ✅ campaign_type schema validated
# - ✅ auto_engagement_configs table validated
# - No errors about missing tables or constraints
```

---

## 🚀 Post-Deployment Monitoring

**First 5 Minutes**:
- [ ] Server started successfully
- [ ] No schema validation errors
- [ ] Database connections established
- [ ] Cron jobs scheduled

**First 30 Minutes**:
- [ ] Create test campaign (custom_promotion)
- [ ] Send test notification to segment
- [ ] Verify campaign appears in history
- [ ] Check server logs for errors

**First Hour**:
- [ ] Monitor error rates (should be < 1%)
- [ ] Check response times (should be < 100ms)
- [ ] Verify no memory leaks
- [ ] Test all critical user flows

---

**Last Updated**: 2025-02-01
**Prepared By**: Technical Lead
**Review Status**: Ready for Implementation
