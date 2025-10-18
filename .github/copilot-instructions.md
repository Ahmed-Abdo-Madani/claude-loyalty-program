# Loyalty Program Platform – AI coding guide (concise)

Big picture
- Full-stack: React 18 + Vite + Tailwind (3000) and Express + Sequelize + PostgreSQL (3001).
- Mobile wallets: Apple PassKit and Google Wallet Objects. QR scanner runs in-browser with qr-scanner.
- Security: secure public IDs only (biz_*, off_*, branch_*, cust_*). Never use integer IDs.

Run/dev workflows (Windows PowerShell)
- Full stack: .\start-dev.ps1 or npm run dev:full (kills ports 3000/3001 first).
- Frontend: npm run dev (uses VITE_API_BASE_URL). Backend: npm run backend:dev.
- Health check: GET /health. Static: /static, /uploads. CORS pre-configured for localhost, 192.168.8.114, ngrok.

Auth and multi-tenancy (critical)
- Every business API call must send headers: x-session-token and x-business-id (secure biz_*).
- Frontend helpers: src/utils/secureAuth.js → getSecureAuthHeaders(), secureApiRequest().
- Example: await secureApi.post(endpoints.offers, { ... }) from src/config/api.js (auto-includes headers).

Routing and modules (backend)
- Entry: backend/server.js mounts routes: /api/wallet, /api/passes, /api/admin, /api/business, /api/customers, /api/notifications, /api/segments, /api/locations, /api/card-design.
- Security and stability: global error handlers, security headers, in-memory rate limiter (all envs).
- DB bootstrap: server checks/creates wallet_passes via migrations/create-wallet-passes-table.js on boot.

Data layer conventions
- Use Sequelize models/associations under backend/models/* (Business, Offer, Branch, Customer, CustomerProgress, WalletPass, etc.). No raw SQL for app logic.
- All foreign keys use secure public_id. Validate business isolation in queries.

QR + Wallet flows (what to generate/expect)
- EnhancedQRScanner (src/components/EnhancedQRScanner.jsx) supports:
  • URL: https://.../scan/{customerToken}/{offerHash}
  • Google Wallet JSON: { customerId: "cust_*", offerId: "off_*", businessId? }
  • Apple Wallet numeric customer id fallback
- It computes MD5 offerHash = MD5(`${offerId}:${businessId}:loyalty-platform`). On success it calls onScanSuccess(token, offerHash, raw).
- Google wallet controller (backend/controllers/realGoogleWalletController.js) reads env or creds file, creates class/object, signs JWT, records pass via WalletPassService.

Frontend usage patterns
- API endpoints centralized in src/config/api.js; use secureApi.{get,post,put,patch,delete}.
- Env: VITE_API_BASE_URL must point to backend (http://localhost:3001 in dev).
- Store auth in localStorage keys used by secureAuth.js (businessId=biz_*, sessionToken, etc.).

Do/Don’t
- Do include secure headers on all /api/business/* and related routes.
- Do use only secure IDs (biz_*, off_*, branch_*, cust_*). Reject/convert legacy ints.
- Don’t bypass models/associations; don’t commit secrets; don’t expose raw stack traces to clients.

Key files to read first
- backend/server.js, backend/controllers/realGoogleWalletController.js, backend/models/index.js
- src/config/api.js, src/utils/secureAuth.js, src/components/EnhancedQRScanner.jsx

Example (secure fetch)
```js
import { endpoints, secureApi } from '@/config/api'
await secureApi.post(endpoints.offers, { title: '9+1 Coffee', stamps_required: 10 })
```
