# Apple Push Notification Service (APNs) Certificate Setup Guide

**Purpose**: Enable real-time push notifications for Apple Wallet passes
**Platform**: Apple Developer Portal
**Certificate Type**: Apple Push Notification service SSL (Production)
**Pass Type ID**: `pass.me.madna.api`

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Apple Developer account with admin access
- [ ] Access to Team ID: `NFQ6M7TFY2`
- [ ] OpenSSL installed (`openssl version` to check)
- [ ] Pass Type ID certificate already working (you have this ✅)

---

## 🔐 Step-by-Step: Create APNs Certificate

### Step 1: Generate Certificate Signing Request (CSR)

Open terminal and run:

```bash
# Navigate to certificates directory
cd backend/certificates

# Generate private key for APNs
openssl genrsa -out apns-prod-key.pem 2048

# Generate CSR
openssl req -new -key apns-prod-key.pem -out apns-prod-request.csr
```

**When prompted, enter:**
```
Country Name: SA
State/Province: (your province/region)
Locality: (your city)
Organization Name: ahmed abdelgader  (or your registered business name)
Organizational Unit: Development
Common Name: pass.me.madna.api APNs
Email Address: (your email)
Challenge Password: (leave empty, press Enter)
Optional Company Name: (leave empty, press Enter)
```

**Result**: You'll have two files:
- `apns-prod-key.pem` - Private key (keep secret!)
- `apns-prod-request.csr` - Certificate signing request (upload to Apple)

---

### Step 2: Create Certificate in Apple Developer Portal

1. **Go to Apple Developer Portal**
   - Open: https://developer.apple.com/account/
   - Sign in with your Apple ID

2. **Navigate to Certificates**
   - Click **Certificates, Identifiers & Profiles** (left sidebar)
   - Click **Certificates** (under "Certificates" section)

3. **Create New Certificate**
   - Click the **+** button (top right)
   - Scroll down to **Services** section
   - Select **Apple Push Notification service SSL (Production)**
   - Click **Continue**

4. **Select Pass Type ID**
   - Choose your Pass Type ID: **pass.me.madna.api**
   - Click **Continue**

5. **Upload CSR**
   - Click **Choose File**
   - Select `apns-prod-request.csr` (generated in Step 1)
   - Click **Continue**

6. **Download Certificate**
   - Click **Download**
   - Save as `apns-prod-cert.cer`
   - Move to `backend/certificates/apns-prod-cert.cer`

---

### Step 3: Convert Certificate to .p12 Format

The backend needs a `.p12` file (combines certificate + private key):

```bash
cd backend/certificates

# Convert .cer to .pem format
openssl x509 -in apns-prod-cert.cer -inform DER -out apns-prod-cert.pem -outform PEM

# Combine certificate and private key into .p12
openssl pkcs12 -export -out apns-prod.p12 \
  -inkey apns-prod-key.pem \
  -in apns-prod-cert.pem \
  -password pass:YourSecurePassword123

# Replace "YourSecurePassword123" with your chosen password
# REMEMBER THIS PASSWORD - you'll need it in .env!
```

**Result**: You'll have `apns-prod.p12` ready for backend

---

### Step 4: Update Environment Variables

Add to `backend/.env`:

```env
# Apple Push Notification Service (APNs)
APPLE_APNS_CERT_PATH=./certificates/apns-prod.p12
APPLE_APNS_CERT_PASSWORD=YourSecurePassword123
APPLE_APNS_PRODUCTION=true
```

**For production (Render.com/Railway):**
- Base64-encode the .p12 file:
  ```bash
  base64 backend/certificates/apns-prod.p12 > apns-prod-base64.txt
  ```
- Add environment variable: `APPLE_APNS_CERT_BASE64` with encoded content

---

### Step 5: Verify Certificate

Test that the certificate is valid:

```bash
cd backend/certificates

# Check certificate details
openssl pkcs12 -in apns-prod.p12 -passin pass:YourSecurePassword123 -nokeys -clcerts | openssl x509 -noout -text

# Look for:
# - Subject: CN=pass.me.madna.api
# - Validity dates (should be 1 year from creation)
# - Issuer: Apple Inc.
```

**Expected output:**
```
Certificate:
    Subject: UID=pass.me.madna.api, CN=Apple Push Services: pass.me.madna.api, OU=NFQ6M7TFY2, O=ahmed abdelgader, C=SA
    Issuer: CN=Apple Worldwide Developer Relations Certification Authority, OU=G4, O=Apple Inc., C=US
    Validity
        Not Before: Jan 20 12:00:00 2025 GMT
        Not After : Jan 20 12:00:00 2026 GMT
```

---

## 🔒 Security Checklist

### Files to Keep Secret
- ❌ **NEVER commit to Git:**
  - `apns-prod-key.pem` (private key)
  - `apns-prod.p12` (combined certificate)
  - `apns-prod-cert.cer` (certificate)
  - `apns-prod-cert.pem` (certificate in PEM format)

- ✅ **Safe to commit:**
  - `apns-prod-request.csr` (signing request - optional, can delete after use)

### .gitignore Configuration

Verify these entries exist in `backend/.gitignore`:
```
# Certificate files
certificates/*.cer
certificates/*.pem
certificates/*.p12
certificates/*.key
```

---

## 📝 Certificate File Summary

After completion, you'll have:

```
backend/certificates/
├── pass.p12                    # Pass Type ID cert (already working ✅)
├── AppleWWDRCAG4.pem          # Apple WWDR cert (already working ✅)
├── apns-prod-key.pem          # APNs private key (NEW - keep secret!)
├── apns-prod-cert.cer         # APNs certificate (NEW)
├── apns-prod-cert.pem         # APNs certificate PEM (NEW)
├── apns-prod.p12              # APNs combined (NEW - keep secret!)
└── apns-prod-request.csr      # CSR (optional, can delete)
```

---

## 🧪 Testing APNs Connection

Once certificate is configured, test the connection:

```javascript
// backend/test-apns.js
import apn from 'apn'
import fs from 'fs'

const options = {
  cert: fs.readFileSync('./certificates/apns-prod-cert.pem'),
  key: fs.readFileSync('./certificates/apns-prod-key.pem'),
  production: true
}

const apnProvider = new apn.Provider(options)

// Test connection
apnProvider.client.on('connected', () => {
  console.log('✅ Connected to APNs successfully!')
  apnProvider.shutdown()
})

apnProvider.client.on('error', (err) => {
  console.error('❌ APNs connection error:', err)
})
```

Run test:
```bash
node backend/test-apns.js
```

---

## 🚀 Next Steps After Certificate Setup

1. **Install apn package**:
   ```bash
   npm install apn
   ```

2. **Create ApplePushNotificationService.js**:
   - Initialize APNs provider
   - Send empty push notification to trigger pass update
   - Handle APNs responses

3. **Update appleWalletController.js**:
   - Replace placeholder `sendCustomMessage()` with real APNs implementation
   - Replace placeholder `pushProgressUpdate()` with real APNs implementation

4. **Update scan flow**:
   - After updating `customer_progress`, trigger push notification
   - Send to all registered devices for that pass

5. **Test with real iPhone**:
   - Install pass
   - Earn stamp at POS
   - Verify push notification received
   - Verify pass updates automatically

---

## 🔍 Troubleshooting

### Error: "Invalid certificate"
- **Cause**: Wrong password or corrupted .p12 file
- **Solution**: Regenerate .p12 with correct password

### Error: "APNs connection failed"
- **Cause**: Wrong environment (production vs. sandbox)
- **Solution**: Ensure `production: true` in APNs configuration

### Error: "Topic not allowed"
- **Cause**: Topic doesn't match Pass Type ID
- **Solution**: Use Pass Type ID as topic: `pass.me.madna.api`

### Error: "Invalid device token"
- **Cause**: Using test device token or wrong format
- **Solution**: Use actual push token from device registration

---

## 📚 Official Documentation

- APNs Provider API: https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_certificate-based_connection_to_apns
- Wallet Push Notifications: https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes
- npm apn package: https://www.npmjs.com/package/apn

---

## ⏰ Certificate Renewal

APNs certificates expire after **1 year** (similar to Pass Type ID certificates).

**Your certificate will expire**: January 20, 2026

**Set reminder**: December 20, 2025 (30 days before expiration)

**Renewal process**:
1. Generate new CSR (Step 1)
2. Create new certificate in Apple Developer Portal
3. Download and convert to .p12
4. Update .env with new password
5. Restart backend
6. **Old passes continue to work** during transition

---

**Status**: Ready to create APNs certificate
**Estimated Time**: 15-20 minutes
**Difficulty**: Easy (follow steps carefully)
**Cost**: Free (included with Apple Developer account)

