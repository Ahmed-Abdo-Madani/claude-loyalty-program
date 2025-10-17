# Production Deployment Guide - Render.com

This guide explains how to deploy the loyalty platform to Render.com with Apple Wallet integration.

## Prerequisites

✅ Apple Developer Account with certificates configured (see [APPLE-WALLET-SETUP.md](./APPLE-WALLET-SETUP.md))
✅ Certificates working locally (test with `node backend/test-apple-wallet.js`)
✅ Render.com account created
✅ GitHub repository connected to Render

---

## Step 1: Encode Certificates for Production

Since Render doesn't support persistent file storage, we need to encode certificates as base64 environment variables.

### Run the encoding script:

```bash
cd backend
node scripts/encode-certificates.js
```

This will:
- Read your local certificates from `backend/certificates/`
- Encode them to base64 format
- Save the output to `certificate-env-vars.txt`
- Display the values you need to copy

### Expected output:

```
🔐 Apple Wallet Certificate Encoder
====================================

✅ Successfully encoded certificates!

📋 Copy these environment variables to Render:

APPLE_CERT_P12_BASE64=MIIKmwIBAzCCCl8GCSqGSIb3DQEHAaCC...
APPLE_CERT_WWDR_BASE64=LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...

✅ Values saved to: certificate-env-vars.txt
```

**IMPORTANT**: Keep `certificate-env-vars.txt` safe and **NEVER commit it to git**! This file contains your private keys.

---

## Step 2: Configure Render Environment Variables

### 2.1 Navigate to Render Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Select your backend web service
3. Click **Environment** tab

### 2.2 Add Required Environment Variables

Copy the following variables from your local `.env` file and the encoded certificates:

#### Common Variables (Required):
```
APPLE_PASS_TYPE_ID=pass.me.madna.api
APPLE_TEAM_ID=NFQ6M7TFY2
APPLE_PASS_CERTIFICATE_PASSWORD=your_password_here
```

#### Production-Specific Variables (Required):
Copy the base64 values from `certificate-env-vars.txt`:

```
APPLE_CERT_P12_BASE64=MIIKmwIBAzCCCl8GCSqGSIb3DQEHAaCC...
APPLE_CERT_WWDR_BASE64=LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
```

#### Application Variables:
```
NODE_ENV=production
PORT=3001
BASE_URL=https://your-app.onrender.com
```

#### Database Variables (if using PostgreSQL):
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### 2.3 Save and Deploy

Click **Save Changes** - Render will automatically redeploy with the new environment variables.

---

## Step 3: Verify Deployment

### 3.1 Check Server Logs

Watch the deployment logs for certificate validation:

```
🍎 Validating Apple Wallet certificates...
📍 Production mode: Looking for base64-encoded certificates in environment variables
📖 Loading .p12 certificate from environment variable (base64)
✅ .p12 certificate loaded and validated
📖 Loading WWDR certificate from environment variable (base64)
✅ WWDR certificate loaded and validated
✅ Certificate chain verified
✅ Apple Wallet certificates validated successfully
   📋 Pass Type ID: pass.me.madna.api
   🏢 Team ID: NFQ6M7TFY2
   📅 Certificate expires: 2026-01-15
```

### 3.2 Test Apple Wallet Generation

Use the deployed API to test wallet pass generation:

```bash
# Replace with your production URL
curl -X POST https://your-app.onrender.com/api/wallet/apple/generate \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_test123",
    "offerId": "off_test456"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Apple Wallet pass generated successfully",
  "downloadUrl": "https://your-app.onrender.com/api/wallet/apple/download/..."
}
```

### 3.3 Test Pass Download

Visit the download URL in Safari on an iPhone or in a browser to download the `.pkpass` file.

---

## Environment Mode Detection

The application automatically detects the environment:

| Environment | Certificate Loading | Detection Method |
|------------|---------------------|------------------|
| **Development** | Files from `./certificates/` | `NODE_ENV !== 'production'` |
| **Production** | Base64 from env vars | `NODE_ENV === 'production'` |

### Development Mode Logs:
```
📍 Development mode: Looking for certificate files
📖 Loading .p12 certificate from file: /path/to/certificates/pass.p12
📖 Loading WWDR certificate from file: /path/to/certificates/AppleWWDRCAG4.pem
```

### Production Mode Logs:
```
📍 Production mode: Looking for base64-encoded certificates in environment variables
📖 Loading .p12 certificate from environment variable (base64)
📖 Loading WWDR certificate from environment variable (base64)
```

---

## Troubleshooting

### Problem: "Missing environment variable: APPLE_CERT_P12_BASE64"

**Solution**: You forgot to add the base64-encoded certificates to Render.
1. Run `node backend/scripts/encode-certificates.js`
2. Copy the values from `certificate-env-vars.txt`
3. Add them to Render's Environment tab

---

### Problem: "Invalid base64 encoding in APPLE_CERT_P12_BASE64"

**Solution**: The base64 value was copied incorrectly (contains newlines or extra characters).
1. Re-run the encoding script
2. Copy the **entire** base64 string (no line breaks)
3. Make sure there are no spaces before/after the value

---

### Problem: "Certificate and private key do not match"

**Solution**: The wrong certificate was encoded.
1. Verify `backend/certificates/pass.p12` is the correct Pass Type ID certificate
2. Make sure the password in `APPLE_PASS_CERTIFICATE_PASSWORD` matches the .p12 file
3. Re-run the encoding script

---

### Problem: "Certificate chain validation failed"

**Solution**: The WWDR certificate is outdated or incorrect.
1. Download the latest WWDR G4 certificate from Apple:
   https://www.apple.com/certificateauthority/
2. Save as `backend/certificates/AppleWWDRCAG4.pem`
3. Re-run the encoding script

---

### Problem: Certificates work locally but fail in production

**Solution**: Check that `NODE_ENV=production` is set in Render.
1. Go to Render Dashboard → Environment tab
2. Verify `NODE_ENV=production` exists
3. Check server logs show "Production mode: Looking for base64-encoded certificates"

---

## Security Best Practices

### ✅ DO:
- Store certificates as environment variables in production
- Keep `certificate-env-vars.txt` in a secure password manager
- Use strong passwords for .p12 certificates
- Rotate certificates before they expire (monitor expiration in logs)
- Delete `certificate-env-vars.txt` after deployment (keep a backup securely)

### ❌ DON'T:
- Never commit `.p12`, `.pem`, or certificate files to git
- Never commit `certificate-env-vars.txt` to git
- Never share certificate passwords in public channels
- Never store certificates in the codebase
- Never use production certificates in development (use separate Dev certificates if needed)

---

## Certificate Expiration

Apple Pass Type ID certificates expire after **1-2 years**.

### Monitor expiration:
Check server startup logs for warnings:
```
⚠️ Certificate expires in 28 days on 2026-01-15 - RENEW SOON!
```

### Renew certificates:
1. Generate new CSR and certificate in Apple Developer Portal
2. Download and convert to .p12
3. Run encoding script with new certificate
4. Update `APPLE_CERT_P12_BASE64` in Render
5. Redeploy (automatic on Render after env var change)

---

## Production Checklist

Before deploying to production, verify:

- [ ] Local certificates tested with `node backend/test-apple-wallet.js` (all tests pass)
- [ ] Encoding script executed: `node backend/scripts/encode-certificates.js`
- [ ] Base64 certificates copied to Render environment variables
- [ ] `NODE_ENV=production` set in Render
- [ ] `BASE_URL` set to production URL
- [ ] Database credentials configured (if using PostgreSQL)
- [ ] Server logs show "Production mode" and certificate validation success
- [ ] Test API call successfully generates `.pkpass` file
- [ ] Pass downloads and installs on iPhone

---

## Support

For issues with:
- **Apple certificates**: See [APPLE-WALLET-SETUP.md](./APPLE-WALLET-SETUP.md)
- **Render deployment**: [Render Docs](https://render.com/docs)
- **General questions**: Check server logs in Render Dashboard → Logs tab
