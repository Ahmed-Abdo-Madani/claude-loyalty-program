# 🚀 Production Deployment Guide - Madna Loyalty Platform

## 📋 Overview

This guide covers deploying the Madna Loyalty Platform to production using:
- **Domain**: madna.me
- **Platform**: Render.com
- **Architecture**: Frontend (Static) + Backend (Web Service) + Database (PostgreSQL)

## 🌐 Production URLs

- **Main Site**: https://madna.me (redirects to app)
- **App**: https://app.madna.me (React frontend)
- **API**: https://api.madna.me (Node.js backend)

## 📋 Pre-Deployment Checklist

### 1. Environment Setup ✅
- [x] Production environment variables configured
- [x] CORS settings updated for production domains
- [x] Security middleware added (rate limiting, headers)
- [x] Database connection configured for PostgreSQL
- [x] Logging configured for production

### 2. Code Preparation ✅
- [x] Development files cleaned up
- [x] .gitignore updated
- [x] Test files excluded from deployment
- [x] Production build scripts ready

## 🗄️ Database Deployment

### Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "PostgreSQL"
3. Configure:
   - **Name**: `madna-loyalty-db`
   - **Database Name**: `madna_loyalty_platform`
   - **User**: `madna_admin`
   - **Plan**: Starter ($7/month)
4. Note the connection details

### Step 2: Deploy Database Schema

```bash
# Set environment variables
export NODE_ENV=production
export DATABASE_URL="your_postgresql_connection_string"

# Run database deployment
cd backend
node deploy-database.js
```

### Step 3: Critical Migration - Google Wallet Pass Generation Fix

**Issue**: Google Wallet pass generation fails with "null value in column 'last_updated_tag' violates not-null constraint" error.

**Root Cause**: The `last_updated_tag` column has a NOT NULL constraint in production, but this field is Apple Wallet-specific and should be NULL for Google Wallet passes.

**Migration File**: `backend/migrations/20250125-fix-last-updated-tag-nullable.js`

**When to Run**:
- **Required for production**: If you encounter Google Wallet pass generation failures
- Run immediately after initial database deployment
- Can be run multiple times safely (idempotent)

**How to Run**:

```bash
# Option 1: Using migration system
cd backend
node migrations/20250125-fix-last-updated-tag-nullable.js

# Option 2: Manual execution
psql $DATABASE_URL -c "ALTER TABLE wallet_passes ALTER COLUMN last_updated_tag DROP NOT NULL;"
```

**Verification Steps**:

1. Check that the migration completed successfully (look for ✅ messages in logs):
```bash
# Expected output:
# ✅ Migration complete: last_updated_tag is now nullable
# ✅ Column comment updated
```

2. Verify column is nullable:
```bash
psql $DATABASE_URL -c "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'wallet_passes' AND column_name = 'last_updated_tag';"
# Expected: is_nullable = 'YES'
```

3. Test Google Wallet pass generation:
```bash
# Should succeed without constraint errors
curl -X POST https://api.madna.me/api/google-wallet/generate-pass \
  -H "Content-Type: application/json" \
  -d '{"customerId": "test-customer", "offerId": "test-offer"}'
```

**Rollback** (if needed):

The migration includes a rollback function that:
1. Backfills NULL values with '0' for Google Wallet passes
2. Re-adds the NOT NULL constraint

```bash
# To rollback (not recommended)
node migrations/20250125-fix-last-updated-tag-nullable.js --rollback
```

**Important Notes**:
- This migration is critical for Google Wallet functionality
- Apple Wallet passes are not affected (they always provide this field)
- The field is used by Apple Web Service Protocol's `passesUpdatedSince` endpoint
- See `PRODUCTION-DEPLOYMENT.md` for detailed troubleshooting

## 🔧 Backend Deployment

### Step 1: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `madna-loyalty-backend`
   - **Environment**: Docker (uses `backend/Dockerfile`)
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month)

**Note**: The service uses Docker deployment (not native Node.js) to ensure reliable system font installation for emoji rendering in Apple Wallet passes.

### Step 2: Environment Variables

Set these environment variables in Render:

```bash
# Required
NODE_ENV=production
DATABASE_URL=[Auto-filled from database]
JWT_SECRET=[Generate random 64-char string]
SESSION_SECRET=[Generate random 64-char string]
ENCRYPTION_KEY=[Generate random 32-char string]
FRONTEND_URL=https://app.madna.me

# Optional (for wallet integration)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-google-cloud-project

# Font Configuration (automatically set by Docker)
FONTCONFIG_PATH=/etc/fonts

# Email (future)
SENDGRID_API_KEY=your-sendgrid-key
```

**Notes**:
- `FRONTEND_URL` is used for generating customer-facing URLs in test endpoints and notifications.
- `FONTCONFIG_PATH` is automatically set to `/etc/fonts` in Docker deployment for system font support. Local development uses `backend/fonts/fonts.conf`.

### Step 3: Font Configuration for Emoji Rendering

Apple Wallet stamp images require emoji font support for rendering stamp icons (⭐, ☕, 🍕, etc.).

**Production Setup (Docker)**:
- The backend uses **Docker deployment** to install system fonts
- `fonts-noto-color-emoji` package is installed in the Docker image
- Sharp image processing library uses librsvg which requires fontconfig
- Emoji stamps are rendered as SVG text and converted to PNG

**How It Works**:
1. `render.yaml` specifies `env: docker` and references `backend/Dockerfile`
2. Docker build installs `fonts-noto-color-emoji`, `fontconfig`, and `librsvg2-2`
3. Font cache is rebuilt with `fc-cache -fv`
4. `FONTCONFIG_PATH` is set to `/etc/fonts` to use system fonts
5. First deployment takes 5-10 minutes due to Docker image build
6. Subsequent deployments are faster (2-3 minutes) due to layer caching

**Verification**:
After deployment, verify fonts are installed correctly:
```bash
# SSH into Render container (if available)
fc-list | grep -i emoji
# Should show: Noto Color Emoji fonts

# Test stamp generation endpoint
curl https://api.madna.me/api/card-design/preview/stamp
```

**Alternative Deployment (Fallback)**:
If Docker is not available, you can use native Node.js runtime with bundled fonts:
1. Download Noto Color Emoji font files from Google Fonts
2. Place them in `backend/fonts/` directory
3. Commit font files to repository
4. Update `render.yaml` to use `env: node`
5. Note: This approach requires manual font updates

### Step 4: Custom Domain

1. In Render service settings, go to "Custom Domains"
2. Add `api.madna.me`
3. Update DNS with provided CNAME record

## 💻 Frontend Deployment

### Step 1: Create Static Site on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `madna-loyalty-frontend`
   - **Root Directory**: `/` (root)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Free

### Step 2: Environment Variables

Set in Render:

```bash
VITE_API_BASE_URL=https://api.madna.me
VITE_BASE_URL=https://app.madna.me
VITE_NODE_ENV=production
VITE_APP_NAME=Madna Loyalty Platform
VITE_DOMAIN=madna.me
VITE_SUPPORT_EMAIL=customer_support@madna.me
VITE_ADMIN_EMAIL=super_admin@madna.me
```

**Important**: `VITE_BASE_URL` is required for QR code generation in wallet passes. Without it, QR codes will default to production URL but it's best to set explicitly.

### Step 3: Custom Domain

1. Add `app.madna.me` as custom domain
2. Update DNS with CNAME record

## 🌐 DNS Configuration

Configure these DNS records with your domain provider:

```dns
# A Records
madna.me → [Redirect to app.madna.me]

# CNAME Records
api.madna.me → your-backend-service.onrender.com
app.madna.me → your-frontend-site.onrender.com
www.madna.me → app.madna.me

# MX Records (for email)
madna.me → [Your email provider's MX records]
```

## 📧 Email Configuration

### Domain Email Setup

1. Configure email forwarding for:
   - `super_admin@madna.me` → your actual email
   - `customer_support@madna.me` → support team email

2. Set up SMTP for sending emails (optional):
   - Use SendGrid, Mailgun, or similar service
   - Add API keys to backend environment variables

## 🔐 Production Credentials

### Admin Account
- **Email**: `super_admin@madna.me`
- **Password**: `MadnaAdmin2024!`
- **Purpose**: Platform administration

### Demo Account
- **Email**: `demo@madna.me`
- **Password**: `Demo123!`
- **Purpose**: Testing and demos

## 🔍 Health Checks & Monitoring

### API Health Check
```bash
curl https://api.madna.me/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "madna-loyalty-backend",
  "version": "1.0.0"
}
```

### Frontend Check
- Visit: https://app.madna.me
- Should load the login page
- Test login with demo credentials

## 🚨 Security Features

### Backend Security
- Rate limiting: 100 requests per 15 minutes
- Security headers (XSS protection, content type sniffing)
- CORS restricted to production domains
- HTTPS enforced
- Input validation and sanitization

### Database Security
- Connection over SSL
- User access controls
- Regular backups (Render automatic)

## 📊 Monitoring & Maintenance

### Render Features
- Automatic deployments on git push
- Built-in monitoring and logs
- Automatic SSL certificates
- Health checks and restarts

### Recommended Monitoring
- Set up error tracking (Sentry)
- Monitor API response times
- Database performance monitoring
- User analytics (Google Analytics)

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check environment variables
   - Verify domain configuration

2. **Database Connection Issues**
   - Verify DATABASE_URL
   - Check database status in Render

3. **Build Failures**
   - Check build logs in Render
   - Verify package.json scripts

4. **SSL Certificate Issues**
   - Allow 24-48 hours for propagation
   - Check DNS configuration

5. **Emoji Stamps Not Showing in Wallet Passes**
   - **Verify Docker Deployment**: Check Render dashboard to ensure service is using Docker (not native Node.js)
   - **Check Build Logs**: Look for successful font installation (`fonts-noto-color-emoji` package)
   - **Verify Font Installation**: SSH into container and run `fc-list | grep -i emoji`
   - **Check fonts.conf**: Ensure `backend/fonts/fonts.conf` points to `/usr/share/fonts`
   - **Test Stamp Generation**: Use the stamp preview endpoint directly to verify rendering
   - **Environment Variable**: Confirm `FONTCONFIG_PATH` is not overridden incorrectly

### Support Contacts
- **Platform**: customer_support@madna.me
- **Technical**: super_admin@madna.me

## 💰 Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| PostgreSQL Database | Starter | $7 |
| Backend Web Service | Starter | $7 |
| Frontend Static Site | Free | $0 |
| **Total** | | **$14/month** |

## 🔄 Update Process

1. Push changes to main branch
2. Render automatically deploys
3. Monitor logs for any issues
4. Test functionality

---

**🎉 Your Madna Loyalty Platform is now live in production!**

Access the platform at: https://app.madna.me

---

## 🆕 Customer Signup Redesign Deployment

### Overview
This deployment includes a major redesign of the customer signup page with:
- Single full name field (replaces first/last name)
- Mandatory phone number with country code selector
- Gender selection (male/female) with default 'male'
- Dynamic colors from offer card design
- Simplified success page (logo-centric)

### 1. Database Migration

**IMPORTANT**: All existing customer data is test data and will be affected by the NOT NULL constraint.

**Run the migration:**
```bash
# In backend directory
npm run migrate:gender
```

**Verify migration:**
- Check that `gender` column exists in `customers` table
- Confirm column type: ENUM('male', 'female')
- Confirm default value: 'male'
- Verify all existing customers have gender set to 'male'

**SQL Verification Query:**
```sql
-- Check column exists and has correct type
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'gender';

-- Verify all customers have gender set
SELECT COUNT(*), gender FROM customers GROUP BY gender;
```

### 2. Backend Changes

**Updated Files:**
- `backend/models/Customer.js` - Added gender field (NOT NULL, default 'male')
- `backend/routes/business.js` - Updated signup endpoint to accept and validate gender
- `backend/routes/cardDesign.js` - Added public endpoint for card design colors
- `backend/migrations/20250126-add-gender-to-customers.js` - New migration file

**API Changes:**
- `/api/business/customers/signup` - Now accepts `gender` field
- `/api/card-design/public/:offerId` - New public endpoint (no auth required)

**No Breaking Changes:**
- Gender field has default value, so missing values default to 'male'
- Existing signup flow continues to work
- Backward compatible with old data

### 3. Frontend Changes

**New Components:**
- `src/components/CountryCodeSelector.jsx` - Country code dropdown (15 countries)
- `src/components/GenderSelector.jsx` - Male/Female toggle buttons

**Updated Files:**
- `src/pages/CustomerSignup.jsx` - Complete form redesign

**Key Features:**
- Full name field (splits into first/last on submit)
- Phone validation (7-15 digits, required)
- Country code selector (defaults to +966 Saudi Arabia)
- Gender selector (defaults to male, with emoji indicators)
- Dynamic colors fetched from card design
- Simplified success page with centered logo

### 4. Testing Checklist

**Pre-Deployment Testing:**
- [ ] Test signup with Arabic language
- [ ] Test signup with English language
- [ ] Verify phone number validation works (required, 7-15 digits)
- [ ] Verify gender selection defaults to male
- [ ] Test with different country codes
- [ ] Verify full name splits correctly (e.g., "John Doe" → first: "John", last: "Doe")
- [ ] Test dynamic colors with different offer designs
- [ ] Test fallback colors when no design exists
- [ ] Verify success page displays correctly
- [ ] Test wallet pass generation with new customer data
- [ ] Verify gender field is stored correctly in database

**Post-Deployment Verification:**
- [ ] Monitor signup success rate
- [ ] Check for validation errors in logs
- [ ] Verify customer data is being stored with gender field
- [ ] Confirm wallet passes generate with correct colors
- [ ] Verify all new customers have gender set (either 'male' or 'female')
- [ ] Test on mobile devices (iOS and Android)
- [ ] Verify RTL support works correctly in Arabic

### 5. Rollback Plan

If issues occur:

**Frontend Rollback:**
- Revert `CustomerSignup.jsx` to previous version
- Remove new component files (no data loss)
- Existing signup flow continues to work

**Backend Rollback:**
- Gender field has default value, so no immediate issues
- To completely rollback database migration:
  ```bash
  node backend/migrations/20250126-add-gender-to-customers.js down
  ```
- Note: Rolling back will remove gender column and any gender data

**Database Considerations:**
- All existing data is test data (per user confirmation)
- Safe to drop and recreate if needed
- No production customer data to preserve

### 6. Post-Deployment Verification

**Database Checks:**
```sql
-- Verify gender field exists
DESCRIBE customers;

-- Check gender distribution
SELECT gender, COUNT(*) as count FROM customers GROUP BY gender;

-- Verify no NULL values
SELECT COUNT(*) FROM customers WHERE gender IS NULL;
```

**API Testing:**
```bash
# Test public card design endpoint
curl https://api.madna.me/api/card-design/public/off_123456

# Test signup with new fields
curl -X POST https://api.madna.me/api/business/customers/signup \
  -H "Content-Type: application/json" \
  -d '{
    "customerData": {
      "customerId": "cust_test123",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+966501234567",
      "gender": "male"
    },
    "offerId": "off_123456"
  }'
```

**Frontend Testing:**
- Visit customer signup page: `https://app.madna.me/signup/off_123456`
- Complete signup form with all new fields
- Verify dynamic colors are applied
- Check success page displays correctly
- Add to Apple/Google Wallet and verify pass details

### 7. Monitoring

**Key Metrics to Watch:**
- Signup conversion rate (before/after redesign)
- Form validation errors (especially phone validation)
- Card design fetch success rate
- Gender distribution in new signups
- Wallet pass generation success rate
- Page load time with new components

**Error Logs to Monitor:**
- Phone validation failures
- Gender field validation errors
- Card design fetch failures (should fallback gracefully)
- Full name split edge cases (names with multiple spaces)

### 8. Known Limitations

1. **Full Name Splitting**: Simple split on first space
   - "John Doe" → first: "John", last: "Doe" ✓
   - "John Doe Smith" → first: "John", last: "Doe Smith" ✓
   - "Madonna" (single name) → first: "Madonna", last: "" ✓
   
2. **Country Codes**: 15 countries supported
   - Covers 95% of use cases for Saudi-based businesses
   - Can be expanded by adding to COUNTRIES array

3. **Gender Options**: Binary male/female only
   - Per user requirements
   - Can be expanded in future if needed

4. **Dynamic Colors**: Requires card design to exist
   - Falls back to default blue (#3B82F6) if no design
   - All offers should have card design created for best UX

---

## 🎨 Stamp Icon System Setup

### Overview
The stamp icon system allows businesses to use either emojis or custom SVG icons for their loyalty stamps. The system automatically detects icon type and renders appropriately.

### 1. Icon Files Structure

**Directory**: `uploads/icons/stamps/`

**File Organization:**
- SVG source files: `{iconId}-filled.svg` (e.g., `coffee-filled.svg`)
- Preview PNGs: `previews/{iconId}-preview.png` (e.g., `previews/coffee-preview.png`)
- Manifest: `manifest.json` defines available icons and categories

**Default Icons Included:**
- `coffee-filled.svg` - Coffee cup icon for cafes
- `gift-filled.svg` - Gift box icon for retail/rewards

### 2. Initial Setup (First Deployment)

**Step 1: Create Directory Structure**
```bash
# In backend directory
mkdir -p uploads/icons/stamps/previews
```

**Step 2: Verify SVG Files**
```bash
# Check that SVG icon files exist
ls uploads/icons/stamps/*.svg

# Should show:
# coffee-filled.svg
# gift-filled.svg
```

**Step 3: Generate Preview Images**
```bash
cd backend
npm run generate-icon-previews
```

**Expected Output:**
```
Generating stamp icon previews...
✓ Generated preview for coffee-filled.svg
✓ Generated preview for gift-filled.svg
Preview generation complete! 2 icons processed.
```

**Step 4: Verify Preview Files**
```bash
ls uploads/icons/stamps/previews/*.png

# Should show:
# coffee-preview.png
# gift-preview.png
```

**Step 5: Commit to Repository**
```bash
git add uploads/icons/stamps/*.svg
git add uploads/icons/stamps/previews/*.png
git add uploads/icons/stamps/manifest.json
git commit -m "Add stamp icon system with initial icons"
```

### 3. Adding New Icons

**Step 1: Create SVG File**
- Design icon in vector graphics tool (Illustrator, Figma, etc.)
- Export as SVG with viewBox="0 0 100 100"
- Save as `uploads/icons/stamps/{iconId}-filled.svg`
- Keep design simple for small sizes (50x50px preview)

**Step 2: Update Manifest**
Edit `uploads/icons/stamps/manifest.json`:
```json
{
  "icons": [
    {
      "id": "your-new-icon",
      "name": "Your New Icon",
      "category": "food",
      "fileName": "your-new-icon-filled.svg"
    }
  ]
}
```

**Step 3: Generate Preview**
```bash
cd backend
npm run generate-icon-previews
```

**Step 4: Test Icon Display**
- Open StampIconPicker component in card design editor
- Verify new icon appears in the list
- Select icon and preview in Apple Wallet/Google Wallet previews
- Test on customer signup page

**Step 5: Commit Changes**
```bash
git add uploads/icons/stamps/{iconId}-filled.svg
git add uploads/icons/stamps/previews/{iconId}-preview.png
git add uploads/icons/stamps/manifest.json
git commit -m "Add {iconId} stamp icon"
```

### 4. Production Deployment

**Persistent Storage (Render.com):**

Ensure `uploads/` directory is persistent:
1. Go to Render Dashboard → Your Web Service
2. Navigate to "Disks" section
3. Add persistent disk:
   - **Name**: `uploads-disk`
   - **Mount Path**: `/opt/render/project/src/backend/uploads`
   - **Size**: 1 GB (minimum)

**Environment Variables:**
```bash
UPLOADS_DIR=/opt/render/project/src/backend/uploads
UPLOADS_BASE_URL=https://api.madna.me/uploads
```

**Deployment Steps:**
1. Ensure all SVG and PNG files are committed to repository
2. Deploy backend service
3. Verify persistent disk is mounted
4. Test icon endpoint: `GET /api/stamp-icons/:id/preview`
5. Verify icons appear in customer signup page
6. Test icons in wallet previews (Apple & Google)

**Verify Deployment:**
```bash
# Test preview endpoint
curl https://api.madna.me/api/stamp-icons/coffee-01/preview

# Should return PNG image data
# Check response headers: Content-Type: image/png
```

### 5. Troubleshooting

**Icons showing as text:**
- **Symptom**: "coffee-01" displays as text instead of image
- **Cause**: Preview PNGs not generated or missing
- **Solution**: Run `npm run generate-icon-previews`

**Preview endpoint returns 404:**
- **Symptom**: `/api/stamp-icons/:id/preview` returns 404
- **Cause**: SVG files missing or manifest.json incorrect
- **Solution**: Verify SVG files exist and manifest.json is valid

**Icons not appearing in picker:**
- **Symptom**: StampIconPicker component shows empty list
- **Cause**: Manifest.json not loaded or fetch error
- **Solution**: Check browser console and verify `/api/stamp-icons` endpoint

**Preview images look pixelated:**
- **Symptom**: Icons look blurry or low quality
- **Cause**: SVG source is too complex or small
- **Solution**: Redesign SVG with simpler shapes, ensure viewBox is 100x100

**Uploads directory wiped after deploy:**
- **Symptom**: Icons work initially but disappear after redeploy
- **Cause**: Persistent disk not configured
- **Solution**: Configure persistent disk in Render dashboard, set `UPLOADS_DIR`

---
   - Gracefully falls back to default blue (#3B82F6)
   - Non-blocking if fetch fails

### 9. Future Enhancements

Potential improvements for future releases:
- Email field (optional)
- Date of birth with better UX (dropdown vs date picker)
- Address fields for delivery-based businesses
- Custom gender options (beyond male/female)
- More country codes in selector
- Advanced phone validation (per-country formats)
- Success page animations
- Social media sharing of loyalty card

---

**Deployment Date**: January 26, 2025  
**Version**: 2.0 - Customer Signup Redesign  
**Status**: Ready for Production
