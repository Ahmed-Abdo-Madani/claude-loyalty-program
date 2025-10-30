# Icon Library Review - Quick Testing Guide

## Pre-Deployment Testing

### 1. Test Auto-Migration (Backend)

**Backup current manifest**:
```powershell
Copy-Item backend/uploads/icons/stamps/manifest.json manifest-backup.json
```

**Create legacy manifest (missing version/categories)**:
```powershell
'{"icons":[{"id":"coffee-01","name":"Coffee Cup","category":"food","fileName":"coffee-filled.svg","filledFile":"coffee-filled.svg","previewFile":"coffee-preview.png"}]}' | Set-Content backend/uploads/icons/stamps/manifest.json
```

**Start backend and check logs**:
```powershell
npm run backend:dev
```

**Expected logs**:
```
📄 Normalizing icons manifest...
✅ Icons manifest auto-migrated to v1 (1/20/2025, 3:45:12 PM)
```

**Verify manifest.json now has**:
```powershell
cat backend/uploads/icons/stamps/manifest.json | ConvertFrom-Json | Format-List
```
- `version: 1`
- `categories: []`
- `lastUpdated: "2025-01-20T..."` ✅

**Restore backup**:
```powershell
Copy-Item manifest-backup.json backend/uploads/icons/stamps/manifest.json
```

---

### 2. Test GET Categories Endpoint

```powershell
# Get admin token first
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@madna.me","password":"YOUR_PASSWORD"}'

$token = $loginResponse.token

# Test categories endpoint
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/icons/categories" `
  -Headers @{"Authorization" = "Bearer $token"}
```

**Expected response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "food",
      "name": "Food & Beverage",
      "order": 1,
      "iconCount": 3
    },
    ...
  ]
}
```

---

### 3. Test Frontend Guards

**Start frontend**:
```powershell
npm run dev
```

**Test scenarios**:
1. **Navigate to Admin Dashboard → Icon Library**
   - Should load without errors ✅

2. **Open browser console (F12)**
   - No React key warnings ✅
   - No "Cannot read property 'map' of undefined" errors ✅

3. **Test Category Filter Dropdown**
   - Dropdown renders "All Categories" + all categories ✅

4. **Test Upload Icon Modal**
   - Click "Upload New Icon" → Category select renders ✅

5. **Test Edit Icon Modal**
   - Click edit on any icon → Category select renders ✅

6. **Test Manage Categories Modal**
   - Click "Manage Categories" → Existing categories list renders ✅

7. **Simulate malformed API response** (advanced):
   ```js
   // In browser console
   localStorage.setItem('test-null-categories', 'true')
   // Then reload page - app should not crash
   ```

---

### 4. Regression Testing

**Test all existing functionality still works**:

- [ ] Upload new icon (with SVG file)
- [ ] Edit existing icon name
- [ ] Delete icon
- [ ] Add new category
- [ ] Filter icons by category
- [ ] Search icons by name
- [ ] Regenerate previews

**Expected**: All operations work as before ✅

---

## Production Deployment Checklist

### Before Deploy
- [ ] Backup current manifest.json from production
- [ ] Review startup logs config (ensure INFO level enabled)
- [ ] Verify disk space for icon uploads
- [ ] Test rollback plan (restore manifest backup)

### During Deploy
- [ ] Monitor startup logs for auto-migration message
- [ ] Check for any error logs in first 5 minutes
- [ ] Verify /health endpoint responds

### After Deploy
- [ ] Login to admin dashboard
- [ ] Navigate to Icon Library Management
- [ ] Verify no console errors
- [ ] Test one icon upload
- [ ] Test one category addition

### Rollback Triggers
- Server fails to start
- Manifest validation errors
- Icon library UI crashes
- Cannot upload new icons

---

## Common Issues & Solutions

### Issue: Server crashes on startup with "ENOENT manifest.json"
**Solution**: Run `npm run backend:dev` once to initialize manifest

### Issue: Migration runs every startup
**Solution**: Check that _writeManifestSync is writing to correct path

### Issue: Categories dropdown empty
**Solution**: Verify manifest.json has categories array (even if empty)

### Issue: React warnings in console
**Solution**: Already fixed - all .map() have keys

---

## Verification Commands

**Check manifest structure**:
```powershell
cat backend/uploads/icons/stamps/manifest.json | ConvertFrom-Json | Format-List
```

**Check server logs**:
```powershell
# In terminal running backend
# Look for:
# ✅ Icons manifest auto-migrated to v1
# OR
# ✅ Icons manifest loaded: v1, X icons, Y categories
```

**Check for errors**:
```powershell
# Backend logs should NOT contain:
# ❌ Failed to normalize icons manifest
# ❌ Error getting categories
```

---

## Success Criteria

✅ **Backend**:
- Server starts without errors
- Auto-migration logs appear (if needed)
- GET /categories endpoint returns valid data
- No validation errors on existing manifests

✅ **Frontend**:
- Icon Library loads without errors
- All category dropdowns render
- No React warnings in console
- All modals open successfully

✅ **Regression**:
- All existing icon operations work
- No breaking changes to API contracts
- Backwards compatible with current data

---

## Support Information

**Log Files**:
- Backend: Console output (or Winston log files)
- Frontend: Browser console (F12)

**Key Files**:
- `backend/services/ManifestService.js` - Core logic
- `backend/uploads/icons/stamps/manifest.json` - Data file
- `src/components/IconLibraryManager.jsx` - UI component

**Monitoring**:
- Health check: `GET /health`
- Startup logs: First 30 seconds after deploy
- Error logs: Check for category/manifest related errors

---

**Last Updated**: January 2025  
**Status**: Ready for Testing ✅
