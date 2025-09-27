# Loyalty Program Platform - AI Development Guide

## Architecture Overview

This is a full-stack loyalty program platform with React frontend, Node.js/Express backend, PostgreSQL database, and mobile wallet integration (Apple Wallet + Google Pay).

**Key Components:**
- **Frontend**: React 18 + Tailwind CSS + Vite (port 3000)
- **Backend**: Express.js + Sequelize ORM (port 3001) 
- **Database**: PostgreSQL with Sequelize models
- **Mobile Wallets**: Apple PassKit + Google Wallet API integration
- **QR Scanning**: Native camera access with `qr-scanner` library

## Critical Development Patterns

### 1. Dual-Server Development Workflow
```powershell
# Use the PowerShell startup script for full development
.\start-dev.ps1  # Starts both frontend (3000) and backend (3001)
```

The platform requires both servers running simultaneously. Backend serves APIs, frontend handles UI. CORS is configured for `localhost:3000` and `localhost:5173` (Vite dev server).

### 2. Authentication & Session Management
- **Business Auth**: JWT tokens in `x-session-token` header
- **Business ID**: Passed via `x-business-id` header for multi-tenant operations
- **No traditional user auth** - customers identify via QR codes + minimal data (name, WhatsApp)

Example API call pattern:
```javascript
const headers = {
  'x-session-token': sessionToken,
  'x-business-id': businessId,
  'Content-Type': 'application/json'
}
```

### 3. Database Models & Relationships
Key Sequelize models in `backend/models/`:
- `Business` → hasMany `Offer`, `Branch`, `CustomerProgress`
- `Offer` → belongsTo `Business`, hasMany `CustomerProgress`
- `CustomerProgress` → belongsTo `Business` and `Offer`

**Important**: Use model associations, not raw SQL. Example:
```javascript
const business = await Business.findByPk(businessId, {
  include: [{ model: Offer, as: 'offers' }]
})
```

### 4. QR Code Workflow Architecture
1. **Offer QR**: Generated per offer, contains offer ID + business info
2. **Customer Journey**: Scan offer QR → signup form → wallet pass generation
3. **Progress QR**: Each customer gets unique progress QR for stamp collection
4. **Business Scanner**: Scans customer progress QRs to add stamps

QR data format: `{"type":"offer","offerId":123,"businessId":456}` or `{"type":"progress","progressId":"abc123"}`

### 5. Mobile Wallet Integration
Two separate controllers:
- `appleWalletController.js`: Generates .pkpass files using Apple PassKit
- `realGoogleWalletController.js`: Integrates with Google Wallet Objects API

**Critical**: Wallet passes contain progress tracking and are updated via push notifications when stamps are added.

## Project-Specific Conventions

### API Route Structure
```
/api/business/*     - Business dashboard & management
/api/wallet/*       - Mobile wallet pass generation  
/api/passes/*       - Pass distribution & updates
/api/admin/*        - Platform administration
```

### Frontend Route Patterns
```
/                   - Landing page
/dashboard          - Business dashboard (requires auth)
/join/:offerId      - Customer signup flow
/admin/*            - Platform admin interface
```

### Environment Configuration
- Frontend uses `VITE_API_BASE_URL` for API endpoint
- Backend uses `GOOGLE_APPLICATION_CREDENTIALS` for wallet integration
- Development: `localhost:3001` backend, `localhost:3000` frontend
- Network access configured for `192.168.8.114` and ngrok tunnels

### Error Handling Pattern
Controllers use winston logger with structured logging:
```javascript
logger.error('Operation failed', {
  error: error.message,
  businessId: req.businessId,
  operation: 'createOffer'
})
```

### Component Architecture
- Page components in `src/pages/`
- Reusable UI in `src/components/`
- API configuration in `src/config/api.js`
- Utilities in `src/utils/`

## Critical Integration Points

### Wallet Pass Updates
When customer earns stamps, the system must:
1. Update database (`CustomerProgress` model)
2. Generate new wallet pass with updated stamp count
3. Push update to customer's mobile wallet
4. Log analytics event

### QR Scanner Component
`EnhancedQRScanner.jsx` handles:
- Camera permissions and initialization
- Real-time QR detection with audio/vibration feedback
- Error handling for unsupported browsers
- Flashlight toggle for low-light scanning

### Business Registration Flow
Multi-step process in `BusinessRegistrationPage.jsx`:
1. Business details form
2. Category selection from predefined list
3. Owner verification
4. Account creation with auto-login

## Development Commands

```bash
# Full stack development
npm run dev:full                    # Both servers with port cleanup
.\start-dev.ps1                     # PowerShell version (recommended)

# Individual services  
npm run dev                         # Frontend only (Vite)
npm run backend:dev                 # Backend only (nodemon)

# Database operations
# Backend models handle sync automatically on startup
```

## Key Files for Understanding Flow

- `backend/server.js` - Entry point, CORS config, route mounting
- `backend/models/index.js` - Database relationships and seeding
- `src/App.jsx` - Frontend routing structure
- `src/config/api.js` - API endpoint definitions
- `backend/controllers/realGoogleWalletController.js` - Wallet integration patterns

When modifying wallet functionality, test with both Apple and Google wallet endpoints. When adding new business features, ensure proper authentication middleware in route handlers.