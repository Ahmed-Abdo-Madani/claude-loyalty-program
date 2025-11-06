# Apple Wallet Setup Guide

Complete guide for setting up and managing Apple Wallet integration for the Madna Loyalty Platform.

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Certificate Management](#certificate-management)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Certificate Renewal](#certificate-renewal)
- [Push Notifications (Future)](#push-notifications-future)

---

## Overview

The Madna Loyalty Platform uses Apple Wallet to provide digital loyalty cards to customers with iOS devices. This integration allows customers to:

- Add loyalty cards to their Apple Wallet app
- View real-time progress on stamps/points
- Receive notifications when progress updates (requires APNs setup)
- Access cards from lock screen at participating locations

### Technical Details

- **Pass Types**: Store Card (storeCard) or Generic (generic) - configurable per offer
  - **StoreCard**: Traditional loyalty card layout with 624×168px strip image
  - **Generic**: Modern layout with 180×180px thumbnail and better field separation
- **Format**: `.pkpass` (PKCS#7 signed ZIP file)
- **Signature**: PKCS#7 detached signature with SHA-1
- **Certificate Chain**: Pass Type ID Certificate + Apple WWDR G4 Certificate
- **Barcode**: Configurable per offer (QR Code or PDF417)

### Pass Type Selection

Businesses can choose between two Apple Wallet pass layouts for each offer:

#### StoreCard Pass (Traditional)
- **Image**: 624×168px strip image displayed horizontally
- **Best for**: Classic loyalty cards, simple stamp visualizations
- **Barcode layout**: Horizontal (PDF417 recommended)
- **Field layout**: Standard pass fields with strip image at top
- **Default option**: Yes

#### Generic Pass (Modern)  
- **Image**: 180×180px square thumbnail displayed on left side
- **Best for**: Modern designs, compact layouts with better field separation
- **Barcode layout**: Rectangular with more vertical space for PDF417
- **Field layout**: Better separation between fields and content
- **Benefits**: Improved PDF417 readability, more balanced design

**Configuration**: Set `apple_pass_type` field on offers table:
```sql
UPDATE offers SET apple_pass_type = 'generic' WHERE id = 'off_xxx';
-- OR
UPDATE offers SET apple_pass_type = 'storeCard' WHERE id = 'off_xxx';  -- default
```

**Image Generation**: The platform automatically generates appropriately sized images:
- StoreCard: 624×168px strip@2x.png
- Generic: 180×180px thumbnail@2x.png

**Stamp Layout**: Automatic proportional adjustments for thumbnail size:
- Padding reduced for compact display (10px vs 20px horizontal)
- Maximum stamp size adjusted (50px vs 100px)
- Grid layout optimized for square format

---

## Current Status

### ✅ Configured

- **Pass Type ID**: `pass.me.madna.api`
- **Team ID**: `NFQ6M7TFY2`
- **Organization**: ahmed abdelgader
- **Country**: SA (Saudi Arabia)
- **Certificate Expiration**: November 16, 2026

### ✅ Working Features

- Certificate validation on server startup
- Pass generation with real Apple certificates
- PKCS#7 signature creation
- Valid `.pkpass` files that install on iOS devices
- Integration with custom card designs
- Database tracking of wallet passes
- **Apple Web Service Protocol endpoints** (`/api/apple/v1/...`)
- **Device registration and unregistration**
- **Pass update fetching**
- **APNs push notifications** (when configured)

### ⚠️ Configuration Required

- APNs certificate setup for production (optional but recommended)

---

## Certificate Management

### Certificate Files

Your certificates are stored in `backend/certificates/`:

```
backend/certificates/
├── pass.p12                    # Pass Type ID Certificate + Private Key
├── pass-cert.pem              # Pass Type ID Certificate (PEM format)
├── pass-private-key.pem       # Private Key (PEM format)
├── AppleWWDRCAG4.pem         # Apple WWDR G4 Certificate
└── pass-cert-request.csr      # Original CSR (can be deleted)
```

### Environment Configuration

Required variables in `backend/.env`:

```env
APPLE_PASS_TYPE_ID=pass.me.madna.api
APPLE_TEAM_ID=NFQ6M7TFY2
APPLE_PASS_CERTIFICATE_PATH=./certificates/pass.p12
APPLE_PASS_CERTIFICATE_PASSWORD=your_password_here
APPLE_WWDR_CERTIFICATE_PATH=./certificates/AppleWWDRCAG4.pem
```

### Certificate Security

**🔒 CRITICAL: Never commit certificates to version control!**

The `.gitignore` file is configured to exclude:
- `*.p12` files
- `*.pem` files
- `*.cer` files
- `*.key` files

Always verify before committing:
```bash
git status
# Ensure no certificate files appear
```

---

## Apple Web Service Protocol

### Endpoint Overview

The platform implements the full Apple Web Service Protocol for pass updates mounted at `/api/apple`:

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/apple/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` | POST | Register device for updates | 200/201 |
| `/api/apple/v1/devices/{deviceId}/registrations/{passTypeId}` | GET | Get updated passes | 200 + JSON |
| `/api/apple/v1/passes/{passTypeId}/{serial}` | GET | Fetch latest pass | 200 + pkpass |
| `/api/apple/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}` | DELETE | Unregister device | 200 |
| `/api/apple/v1/log` | POST | Log errors from device | 200 |

### Base URL Configuration

The `webServiceURL` in passes points to:
- **Production**: `https://api.madna.me/api/apple`
- **Development**: `http://localhost:3001/api/apple`

### CORS and Proxy Configuration

All Apple Web Service endpoints:
- ✅ Support OPTIONS preflight requests
- ✅ Handle 204 No Content responses (when no updates)
- ✅ Handle 304 Not Modified responses (for unchanged passes)
- ✅ Require `Authorization: ApplePass {token}` header (except GET updates and log)

**Important for Reverse Proxies**:
- Do not strip `/api/apple` prefix
- Preserve `If-Modified-Since` headers
- Allow empty request/response bodies
- Support all HTTP methods (GET, POST, DELETE)

### Authentication

Passes include an `authenticationToken` that devices must send:
```
Authorization: ApplePass abc123def456...
```

The token is validated on:
- Device registration (POST)
- Pass fetch (GET `/v1/passes/...`)
- Device unregistration (DELETE)

### Testing Endpoints

```bash
# Health check (no auth required)
curl http://localhost:3001/health

# Test device registration (requires valid token)
curl -X POST \
  -H "Authorization: ApplePass YOUR_TOKEN" \
  http://localhost:3001/api/apple/v1/devices/test123/registrations/pass.me.madna.api/SERIAL123

# Check for updates (no auth required)
curl http://localhost:3001/api/apple/v1/devices/test123/registrations/pass.me.madna.api
```

---

## Testing

### Running the Test Suite

Test the Apple Wallet integration:

```bash
cd backend
node test-apple-wallet.js
```

### Test Coverage

The test suite validates:

1. ✅ Certificate loading and validation
2. ✅ Certificate information retrieval
3. ✅ Manifest creation with SHA-1 hashes
4. ✅ PKCS#7 signature generation
5. ✅ Signature verification
6. ✅ Environment configuration
7. ✅ Certificate file existence

### Expected Output

```
================================================================================
🍎 APPLE WALLET INTEGRATION TEST
================================================================================

📋 TEST 1: Certificate Validation
--------------------------------------------------------------------------------
✅ PASS: Certificates loaded and validated successfully
   📋 Pass Type ID: pass.me.madna.api
   🏢 Team ID: NFQ6M7TFY2
   📅 Certificate valid until: 2026-11-16

[... more tests ...]

================================================================================
✅ ALL TESTS PASSED!
🎉 Apple Wallet integration is working correctly
📱 You can now generate valid .pkpass files for iOS devices
================================================================================
```

### Testing Pass Installation

1. **Generate a pass** through the platform
2. **Transfer** the `.pkpass` file to an iOS device (AirDrop, email, etc.)
3. **Open** the file on the iOS device
4. **Verify** it opens in Wallet app and installs successfully

---

## Troubleshooting

### Problem: "Certificate validation failed"

**Possible causes:**
- Wrong password in `.env`
- Certificate files not in correct location
- Corrupted certificate files

**Solution:**
```bash
# Verify certificate password
cd backend/certificates
openssl pkcs12 -in pass.p12 -passin pass:YOUR_PASSWORD -nokeys -clcerts

# Verify file paths
ls -la backend/certificates/
```

### Problem: "Invalid signature" when installing pass

**Possible causes:**
- Certificate not loaded properly
- Wrong Pass Type ID or Team ID
- WWDR certificate missing or expired

**Solution:**
- Run test suite: `node backend/test-apple-wallet.js`
- Check server logs for certificate validation errors
- Verify environment variables match certificate

### Problem: "Cannot Add Pass" on iOS

**Possible causes:**
- Pass Type ID mismatch
- Invalid certificate chain
- Expired certificate

**Solution:**
1. Check certificate expiration date
2. Verify Pass Type ID matches certificate
3. Ensure WWDR certificate is G4 version
4. Test signature validation in test suite

### Problem: Server won't start

**Error:** `Apple Wallet certificate validation failed`

**Solution:**
- Check all environment variables are set
- Verify certificate files exist
- Check certificate password is correct
- Review server logs for specific error

### Problem: 401 Unauthorized during device registration

**Symptoms:**
- Device cannot register for pass updates
- Logs show: `❌ Invalid authentication token`
- HTTP 401 response

**Possible causes:**
- `authenticationToken` in pass doesn't match database
- Pass was regenerated with new token
- Token not stored correctly in `wallet_passes` table

**Solution:**
```bash
# Check database for pass
psql -d loyalty_platform_dev -c "SELECT wallet_serial, authentication_token FROM wallet_passes WHERE wallet_serial='SERIAL_HERE';"

# Regenerate pass if token missing
# The pass will be created with a new authentication token
```

### Problem: 404 Not Found during device registration

**Symptoms:**
- POST to `/api/apple/v1/devices/...` returns 404
- Device shows "Cannot Connect to Server"

**Possible causes:**
- `webServiceURL` in pass is incorrect
- Reverse proxy stripping `/api/apple` prefix
- Server not running or unreachable

**Solution:**
1. Verify `webServiceURL` in pass JSON:
   ```json
   {
     "webServiceURL": "https://api.madna.me/api/apple"
   }
   ```

2. Test endpoint directly:
   ```bash
   curl -X POST \
     -H "Authorization: ApplePass test_token" \
     https://api.madna.me/api/apple/v1/devices/abc123/registrations/pass.me.madna.api/serial123
   ```

3. Check server logs for request receipt

4. Verify proxy configuration preserves path:
   ```nginx
   # Nginx example - correct
   location /api/apple {
     proxy_pass http://backend:3001/api/apple;
   }
   
   # Wrong - strips prefix
   location /api/apple/ {
     proxy_pass http://backend:3001/;
   }
   ```

### Problem: Pass doesn't auto-update

**Symptoms:**
- Stamps added but pass doesn't refresh automatically
- Must manually open/close pass to see updates

**Possible causes:**
- APNs not configured
- No push token stored for device
- Device not registered

**Solution:**
1. Check APNs configuration in logs:
   ```
   ✅ APNs Service initialized successfully
   ```

2. Verify device registered:
   ```sql
   SELECT * FROM device_registrations 
   WHERE wallet_pass_id IN (
     SELECT id FROM wallet_passes WHERE wallet_serial='SERIAL_HERE'
   );
   ```

3. Check push notifications sent:
   ```
   📤 Sending APNs pass update notification...
   ✅ APNs notification sent successfully
   ```

4. Enable APNs if not configured (see `docs/APPLE-APNS-CERTIFICATE-SETUP.md`)

**Note:** Server will continue to start even if Apple Wallet certificates fail to load. Google Wallet will still work.

---

## Certificate Renewal

### When to Renew

Apple Wallet certificates expire after **1 year**. Your current certificate expires:

**📅 November 16, 2026**

Set a reminder to renew **30 days before expiration** (mid-October 2026).

### Renewal Process

1. **Log in to Apple Developer Portal**
   - https://developer.apple.com/account/

2. **Navigate to Certificates**
   - Certificates, Identifiers & Profiles → Certificates

3. **Create New Certificate**
   - Click **+** button
   - Select **Pass Type ID Certificate**
   - Choose your Pass Type ID: `pass.me.madna.api`

4. **Generate New CSR** (if needed)
   ```bash
   cd backend/certificates
   openssl genrsa -out pass-private-key-new.pem 2048
   openssl req -new -key pass-private-key-new.pem -out pass-cert-request-new.csr
   ```

5. **Upload CSR and Download Certificate**
   - Upload the new CSR file
   - Download the new certificate as `pass-new.cer`

6. **Convert to .p12 Format**
   ```bash
   openssl x509 -inform DER -in pass-new.cer -out pass-cert-new.pem
   openssl pkcs12 -export -out pass-new.p12 -inkey pass-private-key-new.pem -in pass-cert-new.pem
   ```

7. **Update Environment Variables**
   - Update `.env` with new certificate password
   - No other changes needed (Pass Type ID and Team ID remain the same)

8. **Backup Old Certificates**
   ```bash
   mkdir backend/certificates/archive-2026
   mv backend/certificates/pass.p12 backend/certificates/archive-2026/
   mv backend/certificates/pass-cert.pem backend/certificates/archive-2026/
   ```

9. **Install New Certificates**
   ```bash
   mv pass-new.p12 pass.p12
   mv pass-cert-new.pem pass-cert.pem
   ```

10. **Test and Restart**
    ```bash
    node backend/test-apple-wallet.js
    # Restart the server
    ```

### Important Notes

- ⚠️ **Old passes continue to work** after certificate renewal
- ⚠️ **New passes require new certificate** - cannot generate new passes with expired certificate
- ⚠️ **Update notifications require valid certificate** - pass updates won't work with expired cert

---

## Push Notifications (Future)

### What You Need

To enable real-time pass updates (when customer earns stamps), you need:

1. **APNs Certificate** (.p12 file)
   - Different from Pass Type ID certificate
   - Created in Apple Developer Portal
   - Enables push notifications to Wallet app

2. **NPM Package**: `apn`
   ```bash
   npm install apn
   ```

3. **Environment Variables**:
   ```env
   APPLE_APNS_CERT_PATH=./certificates/apns-cert.p12
   APPLE_APNS_KEY_PATH=./certificates/apns-key.pem
   ```

### APNs Certificate Setup Process

1. **Apple Developer Portal** → **Certificates** → **+**
2. Select **Apple Push Notification service SSL (Production)**
3. Choose your Pass Type ID
4. Upload CSR
5. Download certificate
6. Export as `.p12` with password
7. Update environment variables
8. Implement push notification in `appleWalletController.js`

### Push Notification Flow

1. Customer earns a stamp (QR scan)
2. Backend updates database
3. Backend sends APNs notification (empty payload)
4. iOS Wallet app receives notification
5. Wallet app fetches updated pass from `webServiceURL`
6. Pass updates on device automatically

**Status**: Not yet implemented (passes work without push, manual refresh needed)

---

## API Endpoints

### Generate Apple Wallet Pass

```http
POST /api/wallet/apple/generate
Content-Type: application/json

{
  "customerData": {
    "customerId": "cust_xxx",
    "firstName": "John",
    "lastName": "Doe",
    "joinedDate": "2024-01-15"
  },
  "offerData": {
    "offerId": "off_xxx",
    "businessName": "Coffee Shop",
    "title": "Free Coffee",
    "description": "Get a free coffee after 10 purchases",
    "stampsRequired": 10
  },
  "progressData": {
    "stampsEarned": 3
  }
}
```

**Response**: `.pkpass` file download

### Download Pass (Not Yet Implemented)

```http
GET /api/wallet/apple/download/:passId
```

### Update Pass (Not Yet Implemented)

```http
POST /api/wallet/apple/update/:passId
Content-Type: application/json

{
  "stampsEarned": 5,
  "stampsRequired": 10
}
```

---

## Architecture

### Certificate Validation Flow

```
Server Startup
    ↓
Load appleCertificateValidator
    ↓
Validate Environment Variables
    ↓
Load .p12 Certificate → Extract Certificate + Private Key
    ↓
Load WWDR Certificate
    ↓
Verify Certificate Chain
    ↓
Check Expiration Date
    ↓
Store in Memory ✅
```

### Pass Generation Flow

```
Client Request
    ↓
appleWalletController.generatePass()
    ↓
Load Card Design (optional)
    ↓
Create pass.json → With real Pass Type ID & Team ID
    ↓
Generate Images → Logo, strip/hero
    ↓
Create Manifest → SHA-1 hashes of all files
    ↓
applePassSigner.signManifest() → PKCS#7 signature
    ↓
Create .pkpass ZIP → pass.json, manifest.json, signature, images
    ↓
Record in Database → WalletPassService
    ↓
Return .pkpass file ✅
```

---

## Support & Resources

### Official Documentation

- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [PassKit Framework](https://developer.apple.com/documentation/passkit)
- [Pass Design and Creation](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/)

### Internal Resources

- Certificate Validator: `backend/utils/appleCertificateValidator.js`
- Pass Signer: `backend/utils/applePassSigner.js`
- Controller: `backend/controllers/appleWalletController.js`
- Test Suite: `backend/test-apple-wallet.js`

### Getting Help

1. **Run test suite**: `node backend/test-apple-wallet.js`
2. **Check server logs**: Look for Apple Wallet certificate validation messages
3. **Verify environment**: Ensure all `.env` variables are set correctly
4. **Check certificate expiration**: Certificates expire annually

---

## Changelog

### 2025-10-17 - Initial Production Setup
- ✅ Configured Pass Type ID: `pass.me.madna.api`
- ✅ Implemented real certificate signing with PKCS#7
- ✅ Added certificate validation on server startup
- ✅ Created comprehensive test suite
- ✅ Documented setup and renewal process
- ✅ Certificate valid until 2026-11-16

---

**Last Updated**: October 17, 2025
**Certificate Expires**: November 16, 2026
**Next Review**: October 15, 2026 (renewal reminder)
