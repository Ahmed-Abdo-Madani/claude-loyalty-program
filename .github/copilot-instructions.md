# Loyalty Program Platform - AI Development Guide

## Architecture Overview

This is a full-stack loyalty program platform with React frontend, Node.js/Express backend, PostgreSQL database, and mobile wallet integration (Apple Wallet + Google Pay).

**Key Components:**
- **Frontend**: React 18 + Tailwind CSS + Vite (port 3000)
- **Backend**: Express.js + Sequelize ORM (port 3001) 
- **Database**: PostgreSQL with Sequelize models
- **Mobile Wallets**: Apple PassKit + Google Wallet API integration
- **QR Scanning**: Native camera access with `qr-scanner` library + audio/vibration feedback
- **Security**: JWT-based QR tokens, secure UUID-like IDs (migration planned)

## Critical Development Patterns

### 1. Dual-Server Development Workflow
```powershell
# Use the PowerShell startup script for full development
.\start-dev.ps1  # Starts both frontend (3000) and backend (3001)
```

The platform requires both servers running simultaneously. Backend serves APIs, frontend handles UI. CORS is configured for `localhost:3000`, `localhost:5173` (Vite), `192.168.8.114` (network), and ngrok tunnels for mobile testing.

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

# Port cleanup (Windows PowerShell)
npm run clean-ports                 # Kill processes on 3000/3001

# Database operations
# Backend models handle sync automatically on startup
```

## Security Architecture (MIGRATION COMPLETE - Phase 2)

**🔒 STATUS: SECURE ARCHITECTURE ACTIVE** *(Updated: September 27, 2025)*

### ✅ Implemented Security Features
- **Secure IDs**: Business/offer IDs are cryptographically secure and non-enumerable
- **JWT QR Codes**: Customer progress tokens encrypted with HMAC-SHA256  
- **Database Migration**: Complete secure schema with public_id primary keys
- **API Endpoints**: All business routes require and validate secure IDs
- **Authentication**: Session tokens + secure business ID validation

### 🔒 Current Secure ID Formats (Active)
```javascript
// Production secure ID formats (ACTIVE)
businessId: "biz_4afb22bac12305436d6c3d585b"  // 30 chars, crypto-secure
offerId: "off_968d972402a85d91a73266b09b"     // 30 chars, non-enumerable  
branchId: "branch_e0f012d4f4d6ba89fdc4"       // 27 chars, collision-resistant
customerId: "cust_5a6119a16bb51550894a"       // 25 chars, unique per customer

// JWT QR tokens (ACTIVE)
qrToken: "eyJhbGciOiJIUzI1NiJ9.eyJjdXN0b21lcklkIjoiY3VzdF81YTYxMTlhMTZiYjUxNTUwODk0YSIsIm9mZmVySWQiOiJvZmZfOTY4ZDk3MjQwMmE4NWQ5MWE3MzI2NmIwOWIiLCJidXNpbmVzc0lkIjoiYml6XzRhZmIyMmJhYzEyMzA1NDM2ZDZjM2Q1ODViIiwiaWF0IjoxNjk1ODI2ODAwfQ.secure-hmac-signature"
```

### 🛡️ Security Implementation Status
- ✅ **Database Layer**: Secure primary keys active, foreign key constraints using public_id
- ✅ **Model Layer**: All Sequelize models use secure public_id as primary key
- ✅ **API Authentication**: Business login returns secure business_id, all endpoints validate
- ✅ **Business Endpoints**: CRUD operations use secure IDs in URLs and database queries  
- ✅ **Security Controls**: Cross-business access blocked, data isolation enforced
- ⏳ **Frontend Integration**: React components need secure ID handling (Next Phase)
- ⏳ **Customer QR Flow**: Wallet passes need secure ID integration (Next Phase)

### 🔧 Development Guidelines (Secure Architecture)
```javascript
// ✅ CORRECT - Use secure IDs in API calls
const business = await Business.findByPk('biz_4afb22bac12305436d6c3d585b')
const offers = await Offer.findAll({ where: { business_id: business.public_id } })

// ✅ CORRECT - Authentication headers with secure IDs
headers: {
  'x-session-token': sessionToken,
  'x-business-id': 'biz_4afb22bac12305436d6c3d585b'  // Secure business ID
}

// ❌ WRONG - Don't use integer IDs (legacy, insecure)
const business = await Business.findByPk(123) // NEVER USE
```

**Critical**: All new development must use secure IDs exclusively. The platform has migrated away from integer IDs for security.

## Key Files for Understanding Flow

- `backend/server.js` - Entry point, CORS config, route mounting
- `backend/models/index.js` - Database relationships and seeding
- `src/App.jsx` - Frontend routing structure
- `src/config/api.js` - API endpoint definitions
- `backend/controllers/realGoogleWalletController.js` - Wallet integration patterns

When modifying wallet functionality, test with both Apple and Google wallet endpoints. When adding new business features, ensure proper authentication middleware in route handlers.