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

## � Production Environment Configuration

### Critical: APNs for Wallet Passes

**IMPORTANT**: Apple Wallet passes **MUST** use production APNs, even during development and testing.

```env
# REQUIRED: Set to true for Wallet passes
APNS_PRODUCTION=true

# Topic MUST equal Pass Type ID
APNS_TOPIC=pass.me.madna.api
APPLE_PASS_TYPE_ID=pass.me.madna.api
```

### Why Production-Only?

1. **Apple Wallet Requirement**: Sandbox APNs doesn't work with Wallet passes
2. **Same Certificate**: Your Pass Type ID certificate is already a production certificate
3. **No Separation**: Unlike app notifications, Wallet notifications don't have dev/prod split

### Environment Variables Checklist

```env
# Base Configuration
BASE_URL=https://api.madna.me
NODE_ENV=production

# Pass Type ID (for signing)
APPLE_PASS_TYPE_ID=pass.me.madna.api
APPLE_TEAM_ID=NFQ6M7TFY2
APPLE_PASS_CERTIFICATE_PATH=./certificates/pass.p12
APPLE_PASS_CERTIFICATE_PASSWORD=YourPassword
APPLE_WWDR_CERTIFICATE_PATH=./certificates/AppleWWDRCAG4.pem

# APNs Configuration (MUST match above)
APNS_TOPIC=pass.me.madna.api
APNS_CERT_PATH=./certificates/pass.p12
APNS_CERT_PASSWORD=YourPassword
APNS_PRODUCTION=true  # ← CRITICAL: Must be true!
```

### Verification at Startup

When your server starts, look for these logs:

```
✅ APNs service initialized successfully
🍎 APNs Configuration:
   topic: pass.me.madna.api (MUST match Pass Type ID)
   environment: PRODUCTION
   certificateType: file (./certificates/pass.p12)
   status: READY
```

### Health Check Endpoint

Add this to verify configuration:

```bash
# Check APNs is configured correctly
curl https://api.madna.me/health | jq .apns

# Expected response:
{
  "configured": true,
  "environment": "PRODUCTION",
  "topic": "pass.me.madna.api"
}
```

---

## � Understanding Apple Wallet Notifications

### Silent vs. Visible Notifications

Apple Wallet pass updates are **silent by default** - this is intentional design by Apple to prevent notification spam.

**How it works:**
1. Backend sends APNs push notification with **empty payload** (`{}`)
2. Push type is marked as `'background'` (no alert/banner/sound)
3. Device receives notification and fetches updated pass from webServiceURL
4. Pass updates in background - user only sees changes when opening Wallet app

**Reference:** See `backend/services/ApnsService.js` lines 182-188 for implementation.

### The `changeMessage` Feature

To show **visible lock-screen notifications** for important events, Apple provides the `changeMessage` property.

**How it works:**
- Add `changeMessage` to specific fields in pass.json
- When field value **actually changes**, iOS shows a notification
- The `%@` placeholder is replaced with the new field value
- Notification appears on lock screen and in notification center
- Respects user's notification settings for Wallet app

**Syntax:**
```json
{
  "key": "tier",
  "label": "Status",
  "value": "🥈 Silver Member",
  "changeMessage": "Congratulations! You are now %@"
}
```

**Result:** When tier changes from "Bronze" to "Silver", user sees:
> "Congratulations! You are now 🥈 Silver Member"

### Implementation Examples

**✅ Good use cases (important milestones):**

```javascript
// Tier upgrades - rare, worth celebrating
{
  key: 'tier',
  value: '🥈 Silver Member',
  changeMessage: 'Congratulations! You are now %@'
}

// Reward completions - achievement notification
{
  key: 'completions',
  value: '4x',
  changeMessage: '🎉 Rewards completed: %@'
}
```

**❌ Bad use cases (too frequent):**

```javascript
// Progress updates - changes every stamp, causes fatigue
{
  key: 'progress',
  value: '5 of 10',
  changeMessage: 'Progress: %@' // DON'T DO THIS
}
```

### Best Practices

1. **Use selectively** - Only for important events (tier changes, completions)
2. **Avoid notification fatigue** - Don't add to frequently-updated fields
3. **Keep messages short** - iOS truncates long text (~50 characters max)
4. **Include emoji** - Makes notifications more engaging (🎉, ✨, 🏆)
5. **Test with real devices** - Simulator doesn't support APNs
6. **Respect user settings** - Users can disable Wallet notifications

### Localization Considerations

For Arabic-speaking businesses, consider localized messages:

```javascript
// English (default)
changeMessage: 'Congratulations! You are now %@'

// Arabic
changeMessage: 'مبروك! أنت الآن %@'
```

**Current implementation:** Uses English (works universally). Consider adding i18n support based on business language preference in future updates.

### Troubleshooting

**Notifications not appearing?**
- ✅ Verify field value actually changed (same value = no notification)
- ✅ Check iOS Settings → Wallet → Notifications (must be enabled)
- ✅ Test with real device (simulator doesn't support APNs)
- ✅ Confirm APNs service initialized successfully (check server logs)

**Too many notifications?**
- ❌ Remove `changeMessage` from frequently-updated fields
- ❌ Use `changeMessage` only for milestones, not progress updates

**Wrong language?**
- 🌐 Consider implementing i18n based on business settings
- 🌐 Tier names already support Arabic via `tierData.currentTier.nameAr`

### Technical Details

**Requirements:**
- MUST include `%@` placeholder (replaced with field value)
- Only triggers when field value changes (not on every pass update)
- Cannot include custom data beyond the field value
- Text appears in iOS notification banner and lock screen
- Plays notification sound (if user has sounds enabled)

**Impact on existing passes:**
- Adding `changeMessage` only affects NEW pass updates
- Existing passes start showing notifications on next update
- No migration needed - forward-compatible change
- Users who disabled Wallet notifications won't see alerts

### Reference Links

- [Apple Wallet Pass Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/wallet)
- [PassKit Field Reference](https://developer.apple.com/documentation/walletpasses/pass)
- [Adding a Web Service to Update Passes](https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes)

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

