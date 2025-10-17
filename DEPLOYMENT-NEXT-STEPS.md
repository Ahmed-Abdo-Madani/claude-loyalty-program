# 🚀 Production Deployment - Next Steps

## ✅ What's Complete

1. **Dual-Mode Certificate Loading** - Automatically detects environment:
   - Development: Loads from `./certificates/` files ✅
   - Production: Loads from base64 environment variables ✅

2. **Certificate Encoding Script** - Generates base64 values for Render ✅

3. **Production Documentation** - Complete deployment guide created ✅

4. **Testing** - All local tests pass in development mode ✅

---

## 📋 Your Next Steps

### Step 1: Add Environment Variables to Render

1. **Open Render Dashboard**: https://dashboard.render.com
2. **Navigate to**: Your backend service → **Environment** tab
3. **Add these environment variables**:

#### Copy from `backend/scripts/certificate-env-vars.txt`:

```
APPLE_CERT_P12_BASE64=<very long base64 string from file>
APPLE_CERT_WWDR_BASE64=<very long base64 string from file>
```

#### Verify these existing variables are set:

```
NODE_ENV=production
APPLE_PASS_TYPE_ID=pass.me.madna.api
APPLE_TEAM_ID=NFQ6M7TFY2
APPLE_PASS_CERTIFICATE_PASSWORD=Watashi12Des
BASE_URL=https://your-app.onrender.com
```

4. **Click "Save Changes"** - Render will auto-deploy

---

### Step 2: Monitor Deployment

Watch the deployment logs for these success messages:

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
   📅 Certificate expires: 2026-11-16
```

---

### Step 3: Test in Production

Use your production URL to test wallet pass generation:

```bash
# Test the Apple Wallet API endpoint
curl -X POST https://your-app.onrender.com/api/wallet/apple/generate \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_test123",
    "offerId": "off_test456"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Apple Wallet pass generated successfully",
  "downloadUrl": "https://your-app.onrender.com/api/wallet/apple/download/..."
}
```

---

### Step 4: Test on iPhone

1. Open the download URL from Step 3 in **Safari on iPhone**
2. Download should trigger automatically
3. Tap **Add** to install in Apple Wallet
4. Verify the loyalty card appears correctly

---

## 🔍 Troubleshooting

### If deployment fails:

**Check 1**: Verify all environment variables are set (no typos)

**Check 2**: Look for these errors in logs:
- `Missing environment variable: APPLE_CERT_P12_BASE64` → Variable not added to Render
- `Invalid base64 encoding` → Copy error, re-run encoding script
- `Certificate and private key do not match` → Wrong password or certificate

**Check 3**: Ensure `NODE_ENV=production` is set

---

## 📚 Documentation

For detailed setup instructions, see:
- **Production Deployment Guide**: [backend/PRODUCTION-DEPLOYMENT.md](backend/PRODUCTION-DEPLOYMENT.md)
- **Apple Wallet Setup**: [backend/APPLE-WALLET-SETUP.md](backend/APPLE-WALLET-SETUP.md)

---

## 🔐 Security Cleanup

**After deployment succeeds:**

1. **Delete** `backend/scripts/certificate-env-vars.txt`
   - Contains your private keys in plaintext
   - Store securely in password manager if needed

2. **Verify** certificates are NOT in git:
   - ✅ `.gitignore` excludes `backend/certificates/*.p12`
   - ✅ `.gitignore` excludes `backend/certificates/*.pem`
   - ✅ `certificate-env-vars.txt` is not tracked

---

## ✨ What Changed

### Modified Files:

1. **`backend/utils/appleCertificateValidator.js`**
   - Added dual-mode loading (file vs base64)
   - Auto-detects environment via `NODE_ENV`
   - Updated logging for production clarity

2. **`backend/.env.example`**
   - Documented production environment variables
   - Separated development vs production config

3. **`backend/scripts/encode-certificates.js`**
   - Created encoder script for production deployment

4. **`backend/PRODUCTION-DEPLOYMENT.md`**
   - Complete Render.com deployment guide
   - Troubleshooting steps
   - Security best practices

---

## 🎯 Success Criteria

Deployment is successful when:

- [ ] Server starts without certificate errors
- [ ] Logs show "Production mode: Looking for base64-encoded certificates"
- [ ] Logs show "✅ Apple Wallet certificates validated successfully"
- [ ] API endpoint generates `.pkpass` file
- [ ] Pass downloads and installs on iPhone
- [ ] QR code scans correctly in POS system

---

## 📞 Support

If you encounter issues:

1. Check server logs in Render Dashboard → Logs tab
2. Review [backend/PRODUCTION-DEPLOYMENT.md](backend/PRODUCTION-DEPLOYMENT.md) troubleshooting section
3. Verify environment variables match exactly (including password)

---

**Ready to deploy? Follow Step 1 above! 🚀**
