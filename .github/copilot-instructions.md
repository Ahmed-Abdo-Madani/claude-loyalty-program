# Loyalty Program Platform – AI Coding Guide

## Architecture Overview

**Stack**: React 18 + Vite + Tailwind (port 3000) | Express + Sequelize + PostgreSQL (port 3001)  
**Mobile Wallets**: Apple PassKit (.pkpass files with PKCS7 signing) + Google Wallet Objects (JWT)  
**Security Model**: Secure public IDs only (biz_*, off_*, branch_*, cust_*) – **never expose integer IDs**

### Critical Design Decisions

- **Multi-tenancy**: All business data isolated by `business_id` (secure ID). Every API call validates business ownership.
- **Wallet Architecture**: Backend generates signed passes; frontend never touches certificates. Apple passes use real PKCS7 signatures with production certificates.
- **QR Flow**: Customers scan QR codes containing encrypted tokens. Backend validates via `SecureQRService` and updates `CustomerProgress`.

---

## Development Workflows (Windows PowerShell)

**Start full stack** (recommended):
```powershell
.\start-dev.ps1  # Kills ports 3000/3001, starts backend then frontend
# OR
npm run dev:full
```

**Individual servers**:
```powershell
npm run backend:dev  # Backend only (port 3001)
npm run dev          # Frontend only (port 3000)
```

**Health checks**: `GET /health` – Must respond before app is considered running  
**Static files**: `/uploads` (persistent disk in production), `/static`  
**CORS**: Pre-configured for localhost, 192.168.8.114, ngrok (dev); madna.me domains (prod)

---

## Authentication & Multi-Tenancy (CRITICAL)

### Business API Calls

**Every request** to `/api/business/*` **must** include:
```js
headers: {
  'x-session-token': sessionToken,  // From login response
  'x-business-id': businessId       // Secure ID (biz_*)
}
```

**Frontend helpers** (use these exclusively):
```js
import { endpoints, secureApi } from '@/config/api'
import { getSecureAuthHeaders, secureApiRequest } from '@/utils/secureAuth'

// Automatic headers
await secureApi.post(endpoints.offers, { title: '9+1 Coffee', stamps_required: 10 })

// Manual headers
const headers = getSecureAuthHeaders()
```

**Backend validation**: Routes use middleware to extract/validate `x-business-id` and ensure queries filter by it.

---

## Database Layer (Sequelize)

### Models & Associations

**Location**: `backend/models/*`  
**Key models**: Business, Offer, Branch, Customer, CustomerProgress, WalletPass, OfferCardDesign, Device, DeviceRegistration

**Association pattern** (ALL foreign keys use `public_id`):
```js
Business.hasMany(Offer, {
  foreignKey: 'business_id',
  sourceKey: 'public_id',  // ← Secure ID, not integer id
  as: 'offers'
})

Offer.belongsTo(Business, {
  foreignKey: 'business_id',
  targetKey: 'public_id'  // ← Secure ID
})
```

### Field Naming Convention

| Database Column       | Model Property        | API/DTO Property       |
|-----------------------|-----------------------|------------------------|
| `current_stamps`      | `current_stamps`      | `stampsEarned`         |
| `max_stamps`          | `max_stamps`          | `stampsRequired`       |
| `is_completed`        | `is_completed`        | `status`               |
| `authentication_token`| `authentication_token`| (sensitive, redacted)  |

**Always map** DB fields → DTO fields when returning API responses.

### Migrations (pgAdmin Recommended)

**SQL migrations**: `backend/migrations/*.sql` – Run directly in pgAdmin Query Tool  
**JS migrations**: `backend/migrations/*.js` – Use `node backend/migrations/<file>.js`  
**Dev DB issue**: Connection hangs on .js migrations; prefer SQL for manual execution

---

## Apple Wallet Integration (Production)

### Certificate Infrastructure

**Certificates loaded on startup** by `appleCertificateValidator.js`:
- Pass Type ID Certificate (.p12) – Signs manifests
- WWDR Certificate (.pem) – Completes certificate chain
- **Location**: `backend/certificates/` (git-ignored)

**Pass Generation Flow**:
1. `appleWalletController.generatePass()` creates `pass.json` with real Pass Type ID (`pass.me.madna.api`)
2. Generates images (logo, strip/hero) with Sharp
3. Creates manifest with SHA-1 hashes of all files
4. `applePassSigner.signManifest()` creates PKCS7 detached signature
5. Packages .pkpass ZIP with pass.json, manifest.json, signature, images
6. Records in DB via `WalletPassService.createWalletPass()` with auth token + ETag

### Authentication Token Algorithm (MUST MATCH)

**Controller & Model must use identical algorithm**:
```js
// backend/controllers/appleWalletController.js
generateAuthToken(customerId, offerId) {
  const data = `${customerId}:${offerId}:${Date.now()}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)
}

// backend/models/WalletPass.js
WalletPass.generateAuthToken = function(customerId, offerId) {
  const data = `${customerId}:${offerId}:${Date.now()}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)
}
```

**Critical**: Use `offerId` (not `serialNumber`). Store token in `wallet_passes.authentication_token`.

### Apple Web Service Protocol

**Routes**: `backend/routes/appleWebService.js` mounted at `/api/apple`  
**Endpoints**:
- `POST /v1/devices/:deviceLibraryId/registrations/:passTypeId/:serialNumber` – Device registration
- `GET /v1/devices/:deviceLibraryId/registrations/:passTypeId` – Get updatable passes
- `GET /v1/passes/:passTypeId/:serialNumber` – Download updated pass (with ETag caching)
- `POST /v1/log` – Device error logs (stored in `DeviceLog` model)

**ETag Caching** (manifest_etag):
- Computed from manifest SHA-256 hash: `computeManifestETag(manifest)`
- Stored in `wallet_passes.manifest_etag`
- Compared with `If-None-Match` header → Return 304 Not Modified if match
- **Reduces bandwidth by 15-30%**

---

## Logging & Security (Production)

### Sensitive Data Redaction

**Logger** (`backend/config/logger.js`) **auto-redacts** in production:
- `authenticationToken` → `abcdef12...[REDACTED]`
- `serialNumber` → `cust_abc...[REDACTED]`
- `push_token`, `device_id`, ETags

**Usage**:
```js
import logger from './config/logger.js'

// Auto-redacted in production
logger.safe.info('Pass generated', { authenticationToken, serialNumber })

// Debug-only logs (hidden in production)
logger.debug('Full pass.json:', passData)
if (logger.isDebugMode()) {
  logger.info('Detailed manifest:', manifest)
}
```

**Environment control**:
- `NODE_ENV=production` → info level, full redaction
- `NODE_ENV=development` → debug level, no redaction
- `LOG_LEVEL=debug` → Verbose logs with redaction

---

## Storage & Static Assets

### Persistent Uploads (CRITICAL)

**Problem**: Container redeploys wipe `/uploads` → 404s on logos/images  
**Solution**: Use `UPLOADS_DIR` and `UPLOADS_BASE_URL` env vars

**Configuration** (Render persistent disk):
```bash
UPLOADS_DIR=/opt/render/project/src/backend/uploads
UPLOADS_BASE_URL=https://api.madna.me/uploads
```

**Implementation**:
```js
// backend/services/ImageProcessingService.js
const uploadDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
const baseUrl = process.env.UPLOADS_BASE_URL || process.env.BASE_URL

// URL generation (avoid double /uploads)
const url = process.env.UPLOADS_BASE_URL 
  ? `/designs/processed/${filename}`  // WITH UPLOADS_BASE_URL
  : `/uploads/designs/processed/${filename}`  // Without (dev)
```

**Server.js**:
```js
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDir))
```

---

## QR Scanning Flow

**Frontend** (`src/components/EnhancedQRScanner.jsx`):
- Scans URL: `https://.../scan/{customerToken}/{offerHash}`
- Scans Google Wallet JSON: `{ customerId, offerId, businessId }`
- Computes `offerHash = MD5(${offerId}:${businessId}:loyalty-platform)`
- Calls `onScanSuccess(token, offerHash, raw)`

**Backend** (`backend/routes/business.js` → `/api/business/scan/verify`):
- Validates `customerToken` (encrypted with `CustomerService.encodeCustomerToken`)
- Verifies `offerHash` matches expected hash
- Updates `CustomerProgress.current_stamps`
- Triggers Apple/Google Wallet push notifications

---

## Common Pitfalls & Fixes

### 1. Auth Token Mismatch (401 errors)
**Symptom**: Devices can't register/fetch passes  
**Cause**: Controller generates token with wrong data (serialNumber instead of offerId)  
**Fix**: Ensure `generateAuthToken(customerId, offerId)` everywhere. Never mutate token on GET.

### 2. stampsEarned: undefined
**Cause**: DB uses `current_stamps`, API expects `stampsEarned`  
**Fix**: Map on return: `stampsEarned: progress.current_stamps || 0`

### 3. manifest_etag missing
**Cause**: Column doesn't exist (migration not run)  
**Fix**: Run `backend/migrations/20250122-add-manifest-etag-to-wallet-passes.sql` in pgAdmin

### 4. Upload files disappear after deploy
**Cause**: Ephemeral container filesystem  
**Fix**: Set `UPLOADS_DIR` + `UPLOADS_BASE_URL` with persistent disk mount

---

## Key Files Reference

**Backend Core**:
- `backend/server.js` – Entry point, route mounting, global error handlers
- `backend/models/index.js` – Model associations (all use `public_id`)
- `backend/config/logger.js` – Winston logger with sensitive data redaction

**Apple Wallet**:
- `backend/controllers/appleWalletController.js` – Pass generation, signing, ETag
- `backend/routes/appleWebService.js` – Web Service Protocol endpoints
- `backend/utils/applePassSigner.js` – PKCS7 signature generation
- `backend/utils/appleCertificateValidator.js` – Certificate loading/validation
- `backend/models/WalletPass.js` – Pass storage, auth token methods

**Frontend API**:
- `src/config/api.js` – Centralized endpoints + secureApi wrapper
- `src/utils/secureAuth.js` – Auth headers, localStorage, logout
- `src/components/EnhancedQRScanner.jsx` – QR scanning + format handling

---

## Testing Commands

**Backend tests**:
```powershell
node backend/migrations/20250122-add-manifest-etag-to-wallet-passes.js
curl http://localhost:3001/health
```

**Apple Wallet pass generation**:
```powershell
curl -X POST http://localhost:3001/api/wallet/apple/generate `
  -H "Content-Type: application/json" `
  -d '{"customerId":"cust_123","offerId":"off_456","businessId":"biz_789"}'
```

**Frontend API test**:
```js
import { endpoints, secureApi } from '@/config/api'
const response = await secureApi.get(endpoints.myOffers)
console.log(response.data)
```
