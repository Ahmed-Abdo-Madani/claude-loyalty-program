# ICONS_PATH Runtime Configuration - CRITICAL

## Issue
The `ICONS_PATH` environment variable is defined in the Dockerfile but may not be available at runtime if the hosting platform doesn't inherit ENV directives from the Dockerfile. This causes the stamp icon path resolution to fall back to incorrect paths, disabling stamp card generation.

## Root Cause
- **Dockerfile ENV directives** are build-time only on some platforms
- Runtime environment variables must be set in the platform dashboard
- Without `ICONS_PATH` at runtime, `StampImageGenerator.js` falls back to `../../uploads/icons/stamps` which resolves incorrectly in production containers

## Required Action

### Production Platform Configuration (Render/Heroku/AWS)

Add the following environment variable to your production runtime environment:

```bash
ICONS_PATH=/app/uploads/icons/stamps
```

### Platform-Specific Instructions

#### Render.com
1. Go to your service dashboard → **Environment** tab
2. Add new environment variable:
   - **Key:** `ICONS_PATH`
   - **Value:** `/app/uploads/icons/stamps`
3. Click **Save Changes**
4. Trigger a **Manual Deploy** or wait for next auto-deploy

#### Heroku
```bash
heroku config:set ICONS_PATH=/app/uploads/icons/stamps --app your-app-name
```

#### AWS Elastic Beanstalk
1. Go to **Configuration** → **Software**
2. Under **Environment Properties**, add:
   - **Name:** `ICONS_PATH`
   - **Value:** `/app/uploads/icons/stamps`
3. Apply changes

#### Docker Compose
```yaml
environment:
  - ICONS_PATH=/app/uploads/icons/stamps
```

## Verification Steps

### 1. Check Startup Logs
After deploying with the new environment variable, check the application logs for:

```
✅ Expected output:
📁 Icons base path: /app/uploads/icons/stamps
✅ Icons directory exists
✅ Icons manifest found: 9 icons loaded

❌ Incorrect output (missing ICONS_PATH):
📁 Icons base path: /app/backend/uploads/icons/stamps
⚠️  Icons directory not found at: /app/backend/uploads/icons/stamps
```

### 2. Test Stamp Card Generation
Generate a wallet pass and check for stamp visualization:
- Apple Wallet pass should show stamp icons
- No "fallback image" should be used
- Logs should show: `✅ Loaded stamp icons from cache`

### 3. Verify Container File System
SSH into the container and verify:
```bash
ls -la /app/uploads/icons/stamps/
# Should show: manifest.json and icon files (filled/stroke)

cat /app/uploads/icons/stamps/manifest.json
# Should show valid JSON with 9 icon entries
```

## Technical Details

### Path Resolution Logic (StampImageGenerator.js)
```javascript
const ICONS_BASE_PATH = (() => {
  // 1. Check environment variable (HIGHEST PRIORITY)
  if (process.env.ICONS_PATH) {
    return path.resolve(process.env.ICONS_PATH)
  }
  
  // 2. Production absolute path (if ICONS_PATH not set - FALLBACK)
  if (process.env.NODE_ENV === 'production') {
    return '/app/uploads/icons/stamps'
  }
  
  // 3. Development relative path
  return path.resolve(__dirname, '../../uploads/icons/stamps')
})()
```

**Why Runtime ENV is Critical:**
- The IIFE runs at module load time
- Without `ICONS_PATH` in runtime environment, production falls back to hardcoded `/app/uploads/icons/stamps`
- If Dockerfile ENV isn't inherited, `process.env.ICONS_PATH` is `undefined`
- Setting runtime ENV ensures explicit override

## Dockerfile Reference
```dockerfile
# Build-time ENV (may not be available at runtime)
ENV ICONS_PATH=/app/uploads/icons/stamps

# This copies the icons to the correct location
COPY backend/uploads/icons/stamps /app/uploads/icons/stamps
```

## Impact if Not Set
- ❌ Stamp cards will use fallback images (no icon visualization)
- ❌ Logs will show: `⚠️ Icons directory not found`
- ❌ User experience degraded (missing stamp icons)
- ❌ No critical errors but reduced functionality

## Status Checklist
- [ ] `ICONS_PATH` added to production runtime environment
- [ ] Service restarted/redeployed
- [ ] Startup logs verified (shows correct path)
- [ ] Manifest.json file readable in container
- [ ] Test pass generated with stamp icons
- [ ] No fallback image warnings in logs

## Contact
If issues persist after setting the environment variable:
1. Verify `/app/uploads/icons/stamps/manifest.json` exists in container
2. Check file permissions (`node` user must have read access)
3. Review full startup logs for path resolution diagnostics
4. Verify Dockerfile COPY command includes icon files
