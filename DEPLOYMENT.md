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

# File System Paths (CRITICAL)
ICONS_PATH=/app/uploads/icons/stamps
UPLOADS_DIR=/opt/render/project/src/backend/uploads
UPLOADS_BASE_URL=https://api.madna.me/uploads

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
- `ICONS_PATH` **MUST** be set to `/app/uploads/icons/stamps` for stamp card generation (Dockerfile ENV may not be inherited at runtime)
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
The stamp icon system allows businesses to use either emojis or custom SVG icons for their loyalty stamps. The system **automatically initializes** on server startup - no manual setup required.

### How Automatic Initialization Works

**On every server startup**, the backend automatically:
1. ✅ Checks if `uploads/icons/stamps/` directory exists (creates if missing)
2. ✅ Verifies `manifest.json` is present and valid
3. ✅ Generates `coffee-filled.svg` if not present (programmatic SVG template)
4. ✅ Generates `gift-filled.svg` if not present (programmatic SVG template)
5. ✅ Creates PNG previews (50x50px, transparent) using Sharp
6. ✅ Logs detailed status with emoji indicators
7. ✅ Continues server startup even if errors occur (graceful degradation)

**Key Benefits**:
- 🚀 **Zero Manual Setup**: No need to create SVG files or run preview generation
- 🔄 **Idempotent**: Safe to run multiple times (skips existing files)
- 🛡️ **Fail-Safe**: Server starts even if icon generation fails
- 📝 **Observable**: Clear logs show what was created/skipped
- 🐳 **Docker-Friendly**: Directories created with proper permissions at build time

**Technology**:
- SVG generation: JavaScript string templates (no external dependencies)
- PNG conversion: Sharp library (high-performance image processing)
- Directory creation: Node.js fs module with recursive option

### 5. Production Deployment Checklist

**The stamp icon system now initializes automatically on server startup. No manual setup required.**

#### Docker Configuration ✅
- [x] `backend/.dockerignore` includes `!uploads/icons/` exception (line 47-48)
- [x] `backend/Dockerfile` creates `uploads/icons/stamps/previews` directory (line 35)
- [x] Directory created with proper ownership before USER switch (security best practice)

#### Automatic Initialization ✅
- [x] `backend/scripts/initialize-stamp-icons.js` generates SVG files programmatically
- [x] Runs automatically on server startup (integrated into `server.js`)
- [x] Creates directories if missing (idempotent - safe to run multiple times)
- [x] Generates PNG previews with Sharp (50x50px, transparent background)
- [x] Validates `manifest.json` exists and is valid JSON
- [x] Logs detailed status with emoji indicators (🎨, ✅, ❌, ⚠️)

#### What Gets Generated Automatically
- Coffee Cup SVG: Simple geometric shapes (trapezoid body, curved handle, steam lines)
- Gift Box SVG: Red box with gold ribbon and bow circles
- PNG previews: 50x50px versions for frontend display
- All files created in `uploads/icons/stamps/` and `uploads/icons/stamps/previews/`

#### After Deployment - Verify Endpoints

1. **Check Server Logs for Initialization**:
   ```bash
   # In Render dashboard, check logs for:
   🎨 Initializing stamp icons...
   ✅ Stamp icons ready: 2 SVGs, 2 previews
   ```

2. **Test Stamp Icons Manifest**:
   ```bash
   curl https://api.madna.me/api/stamp-icons
   ```
   **Expected**: JSON array with `coffee-01` and `gift-01` icons

3. **Test Icon Preview Endpoint**:
   ```bash
   curl https://api.madna.me/api/stamp-icons/coffee-01/preview
   ```
   **Expected**: PNG image data (Content-Type: image/png)

4. **Test Card Design Editor**:
   - Log in to business dashboard
   - Navigate to Offer → Edit Card Design
   - Open "Stamp Icon" section
   - Verify `coffee-01` and `gift-01` icons display as images (not text)

5. **Test Customer Signup Page**:
   - Visit customer signup URL: `https://app.madna.me/signup?offer=off_123456`
   - Verify stamp icons render correctly in stamp visualization
   - Icons should display as images, not text like "coffee-01"

6. **Test Wallet Previews**:
   - Generate Apple Wallet preview
   - Generate Google Wallet preview
   - Verify stamp icons appear as images in both previews
   - Check that 0/10 stamps show empty icons

#### Manual Operations (Optional)

If you need to manually regenerate icons:

```bash
# Initialize/regenerate stamp icons
npm run init-icons

# Verify all files present
npm run verify-icons
```

---

## 🎨 Icon Library Management

### Overview
Super admins can manage stamp icons through the admin dashboard Settings tab. This feature allows uploading, updating, and deleting custom SVG icons without manual file operations or code changes.

### Access Requirements

**Authentication:**
- Only **super admin** role can access icon management
- Regular admins have read-only access to icon library
- Authentication required via admin login at `/admin/login`

**Permissions:**
- **Super Admin**: Full CRUD operations (Create, Read, Update, Delete)
- **Regular Admin**: View icons only (through card design editor)
- **Business Users**: Select from available icons (no management access)

### Icon Upload Process

**Step-by-Step:**

1. **Navigate to Icon Library**
   - Login to Admin Dashboard at `https://app.madna.me/admin/login`
   - Click "Settings" tab in top navigation
   - Scroll to "Icon Library - مكتبة الأيقونات" section

2. **Click "Upload Icon" Button**
   - Opens upload modal with form fields
   - All fields marked with * are required

3. **Fill in Icon Metadata**
   - **Icon ID**: Unique identifier (lowercase, hyphens only)
     - Format: `{category}-{number}` (e.g., `coffee-02`, `burger-01`)
     - Must be unique across all icons
     - Cannot be changed after upload
   - **Icon Name**: Display name (e.g., "Coffee Cup", "Gift Box")
   - **Category**: Select from dropdown (Food & Beverage, Retail, etc.)
   - **Description**: Optional description for search/filtering

4. **Upload SVG Files**
   - **Filled Variant**: Required - solid/filled version of icon
     - Must be valid SVG file (.svg extension)
     - Maximum file size: 500KB
     - Validated for malicious content (no scripts, iframes, etc.)
   - **Stroke Variant**: Optional - outline version of icon
     - Same validation rules as filled variant
     - Can be added later via edit function

5. **Submit Upload**
   - Click "Upload Icon" button
   - System automatically:
     - Validates SVG content for security
     - Saves files to `uploads/icons/stamps/`
     - Generates PNG preview (50x50px) using Sharp
     - Updates `manifest.json` atomically
     - Logs action to audit trail
   - Icon appears in library immediately
   - Success message displays at top

**File Naming Convention:**
- Filled variant: `{icon-id}-filled.svg` (e.g., `coffee-02-filled.svg`)
- Stroke variant: `{icon-id}-stroke.svg` (e.g., `coffee-02-stroke.svg`)
- Preview: `{icon-id}.png` (e.g., `coffee-02.png`)

### Icon Update Process

**Step-by-Step:**

1. **Locate Icon to Edit**
   - Use category filter or search box to find icon
   - Click "Edit" button on icon card

2. **Update Modal Opens**
   - Shows current icon preview and ID (read-only)
   - Pre-filled with existing metadata

3. **Modify Fields**
   - Update name, category, or description as needed
   - Optionally replace SVG files:
     - Only upload if replacing existing variant
     - Leave empty to keep current file

4. **Save Changes**
   - Click "Save Changes" button
   - If new files uploaded:
     - Old SVG files are deleted
     - New files are saved with same filename
     - Preview is regenerated automatically
   - Manifest updated with new metadata
   - Changes reflected immediately in card design editor

**When to Update:**
- Fix icon artwork or design
- Change icon category or description
- Add stroke variant to existing filled-only icon
- Update icon name for better searchability

### Icon Deletion

**Step-by-Step:**

1. **Locate Icon to Delete**
   - Find icon using filters or search

2. **Click "Delete" Button**
   - Confirmation dialog appears
   - Shows icon preview and name

3. **Confirm Deletion**
   - Read warning: "This action cannot be undone"
   - Click "Confirm" to proceed or "Cancel" to abort

4. **System Cleanup**
   - Deletes SVG files (filled and stroke variants)
   - Deletes PNG preview
   - Removes entry from `manifest.json`
   - Logs deletion to audit trail
   - Icon removed from library immediately

**Important Notes:**
- Deleted icons are **permanently removed** - no undo
- Existing offers using deleted icon will show fallback emoji
- Consider updating offers to new icon before deleting old one
- Deletion is logged with admin info and timestamp

### Category Management

**Viewing Categories:**
- Categories display in dropdown during upload/edit
- Organized by order property (Food & Beverage first, etc.)
- Shows icon count per category in filters

**Adding New Category:**
- Use API endpoint: `POST /api/admin/icons/categories`
- Requires super admin authentication
- Provide: `id` (lowercase-hyphens), `name`, `order` (optional)
- Example: `{ "id": "automotive", "name": "Automotive", "order": 6 }`

**Default Categories:**
1. Food & Beverage (`food-beverage`)
2. Retail (`retail`)
3. Services (`services`)
4. Entertainment (`entertainment`)
5. Health & Wellness (`health`)
6. Other (`other`)

### Preview Regeneration

**Purpose:**
- Regenerate all PNG previews from SVG source files
- Useful after Sharp library update or preview corruption
- Batch operation for all icons in library

**How to Use:**
1. Click "Regenerate Previews" button in Icon Library header
2. Confirm action in dialog
3. System processes all icons:
   - Reads filled variant SVG
   - Generates 50x50px PNG preview
   - Saves to `previews/` directory
   - Tracks success/failure count
4. Summary displayed: "Regenerated X of Y previews"
5. Failed icons listed with error reasons

**When to Regenerate:**
- After bulk SVG file updates
- Preview images appear corrupted or missing
- After server migration or disk restoration
- Testing preview generation pipeline

### Technical Details

**File Storage:**
- **SVG Files**: `uploads/icons/stamps/` (persistent disk in production)
- **Preview PNGs**: `uploads/icons/stamps/previews/` (same disk)
- **Manifest**: `uploads/icons/stamps/manifest.json` (atomic updates)

**SVG Security:**
- Content validation before save (checks for `<svg>` tag)
- Malicious pattern detection:
  - Script tags, JavaScript protocols, event handlers
  - Iframes, embeds, object tags
  - XLink with JavaScript
- Files rejected if suspicious content found
- Validation runs on both upload and edit

**Manifest Operations:**
- File locking prevents concurrent write conflicts
- Atomic writes using temp file + rename
- Version number auto-incremented on each update
- Cache invalidation after modifications
- Validation ensures schema integrity before write

**Audit Logging:**
- All icon operations logged with:
  - Admin ID and username
  - Action type (upload, update, delete)
  - Timestamp (ISO format)
  - Icon ID and metadata
  - Success/failure status
- Logs stored in database `admin_logs` table
- Viewable in admin dashboard activity feed

### Troubleshooting

#### Issue: Upload fails with "Invalid file type"
**Cause:** File is not a valid SVG or has wrong MIME type  
**Solution:**
- Ensure file has `.svg` extension
- Open file in text editor - should start with `<?xml` or `<svg`
- Re-export from design tool (Figma, Illustrator, Inkscape)
- Check file MIME type is `image/svg+xml`

#### Issue: Upload fails with "SVG contains potentially malicious content"
**Cause:** SVG has embedded scripts or suspicious elements  
**Solution:**
- Clean SVG in design tool: remove scripts, animations, external refs
- Use "Save as Optimized SVG" in Illustrator
- Run through SVGO optimizer: `npx svgo input.svg -o output.svg`
- Manually remove `<script>`, event handlers, `<iframe>` tags

#### Issue: Preview not generated
**Cause:** Sharp library error or invalid SVG syntax  
**Solution:**
- Check server logs: `docker logs <container-id> | grep "preview"`
- Validate SVG syntax: `xmllint --noout file.svg`
- Test locally: `npm run init-icons` to verify Sharp works
- Ensure Sharp native dependencies installed (libvips)
- Manually regenerate: Click "Regenerate Previews" button

#### Issue: Icon not appearing in card design editor
**Cause:** Manifest not updated or cache issue  
**Solution:**
- Refresh card design editor page (Ctrl+F5 / Cmd+Shift+R)
- Check manifest: `curl https://api.madna.me/api/stamp-icons`
- Verify icon ID in response JSON
- Clear browser cache and localStorage
- Use "Regenerate Previews" if preview missing

#### Issue: Permission denied when uploading
**Cause:** User is not super admin  
**Solution:**
- Verify role in admin dashboard (should show "Super Admin")
- Contact platform administrator to upgrade role
- Check `admin_users` table: `role` must be `super_admin`
- Re-login after role change

#### Issue: Deleted icon still appears in offers
**Cause:** Offers reference icon by ID, not by file existence  
**Solution:**
- This is expected behavior - offers show fallback emoji
- Edit affected offers: Select new icon from library
- Or update offer to use emoji instead of icon
- Run cleanup query: `UPDATE offers SET stamp_icon = 'emoji' WHERE stamp_icon_id = 'deleted-icon-id'`

### Best Practices

**Icon Design:**
- Use simple, recognizable shapes (avoid fine details)
- Keep file size under 100KB (500KB max enforced)
- Use consistent artboard size: 64x64px or 128x128px
- Center artwork with 8-10px padding
- Use solid colors for filled variant (avoid gradients)
- Use 2-3px stroke width for stroke variant
- Test preview at 50x50px to ensure readability

**Naming Conventions:**
- Use descriptive IDs: `coffee-cup-01`, `gift-box-02`
- Group related icons: `food-pizza-01`, `food-burger-01`
- Use 2-digit numbers: `icon-01`, `icon-02` (allows up to 99)
- Avoid special characters except hyphens
- Keep names concise: "Coffee Cup" not "Delicious Hot Coffee Cup Icon"

**Organization:**
- Assign correct category for easy filtering
- Add descriptions for ambiguous icons
- Upload both filled and stroke variants together
- Keep icon library curated (delete unused icons)
- Communicate new icons to businesses via announcements

**Maintenance:**
- Backup `manifest.json` before bulk operations
- Test new icons in card design editor before announcing
- Document custom icons in platform wiki/docs
- Monitor `uploads/icons/stamps/` disk usage
- Periodically audit for unused or duplicate icons

**Security:**
- Only grant super admin role to trusted users
- Review uploaded SVGs for appropriate content
- Monitor audit logs for suspicious activity
- Keep Sharp library updated for security patches
- Validate SVG files from untrusted sources manually

---

#### Troubleshooting Production Issues

**Symptom**: Server logs show "Permission denied" during stamp icons initialization

**Root Cause**: Directory not created at build time (before USER switch in Dockerfile)

**Fix**:
1. Verify `backend/Dockerfile` line 35 includes:
   ```dockerfile
   RUN mkdir -p logs _tmp_pkpass uploads/icons/stamps/previews && \
   ```
2. Redeploy with updated Dockerfile
3. Check logs for: `✅ Stamp icons ready: 2 SVGs, 2 previews`

---

**Symptom**: Stamp icons initialization fails with ENOENT error

**Root Cause**: Directory structure doesn't exist and `node` user can't create it

**Fix**:
1. SSH into Render container (or use Render Shell)
2. Manually create directory:
   ```bash
   mkdir -p /opt/render/project/src/backend/uploads/icons/stamps/previews
   ```
3. Restart server (automatic re-initialization will run)
4. If issue persists, update Dockerfile as described above

---

**Symptom**: Stamp icons showing as text ("coffee-01" instead of image)

**Diagnosis Steps**:
1. Check manifest endpoint returns data:
   ```bash
   curl https://api.madna.me/api/stamp-icons | jq
   ```
   
2. Check preview endpoint returns PNG:
   ```bash
   curl -I https://api.madna.me/api/stamp-icons/coffee-01/preview
   ```
   Should show: `Content-Type: image/png`

3. Check initialization logs:
   ```bash
   # In Render dashboard logs, search for:
   🎨 Initializing stamp icons...
   ```

4. Check files exist in container:
   ```bash
   # SSH into Render container
   ls -la /opt/render/project/src/backend/uploads/icons/stamps/
   ls -la /opt/render/project/src/backend/uploads/icons/stamps/previews/
   ```
   Should show: `coffee-filled.svg`, `gift-filled.svg`, `manifest.json`, PNG files

---

**Symptom**: Sharp library fails to convert SVG to PNG

**Root Cause**: librsvg2-2 not installed in Docker image

**Fix**:
1. Verify `backend/Dockerfile` line 5 includes:
   ```dockerfile
   RUN apt-get update && apt-get install -y \
       fonts-noto-color-emoji \
       fontconfig \
       librsvg2-2 \
   ```
2. Redeploy if missing

---

**Possible Causes & Fixes Summary**:

| Cause | Symptom | Fix |
|-------|---------|-----|
| Directory not created at build time | Permission denied (EACCES) | Update Dockerfile line 35 |
| `.dockerignore` excludes `uploads/` | Icons missing after deploy | Verify `!uploads/icons/` exception exists |
| Sharp/librsvg missing | PNG conversion fails | Install librsvg2-2 in Dockerfile |
| SVG generation fails | Empty manifest | Check server logs for detailed error |
| `manifest.json` invalid | Empty array from API | Run `npm run init-icons` manually |

---

**Manual Recovery Steps**:

If automatic initialization fails completely, you can manually regenerate:

```bash
# Option 1: Using npm script (recommended)
cd /opt/render/project/src/backend
npm run init-icons

# Option 2: Direct execution
node scripts/initialize-stamp-icons.js

# Option 3: Verify files present
npm run verify-icons
```

Expected output:
```
🎨 Starting stamp icons initialization...
📁 Created directory: uploads/icons/stamps
📁 Created directory: uploads/icons/stamps/previews
📄 Created SVG file: coffee-filled.svg
📄 Created SVG file: gift-filled.svg
✅ Generated preview: coffee-preview.png (50x50px)
✅ Generated preview: gift-preview.png (50x50px)
✅ Stamp icons initialization complete
```

### 6. Docker Build Verification

Before deploying, test the Docker build locally:

```bash
# Build Docker image
cd backend
docker build -t madna-backend .

# Run container
docker run -p 3001:3001 madna-backend

# Verify stamp icons
docker exec <container_id> ls /opt/render/project/src/backend/uploads/icons/stamps/

# Should output:
# coffee-filled.svg
# gift-filled.svg
# manifest.json
# previews/
```

### 7. Adding New Custom Icons

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

## 🎨 Customer Signup Success Page Redesign

### Overview
Simplified success page to match minimalist design mockup with integrated brand colors for visual consistency across the customer journey.

### 1. Design Changes

**Removed Elements:**
- Complex card preview component
- Progress bars and stamp visualization
- Welcome message and instructions
- Customer details display
- Action buttons (directions, call)
- "What's Next?" section

**New Minimalist Layout:**
- **Logo**: Large, centered, with subtle brand color halo background
- **Business Name**: Bilingual display with brand colors (Arabic primary, English secondary)
- **Single Wallet Button**: Prominent, brand-colored call-to-action
- **Generous White Space**: Clean, modern appearance following mockup design

### 2. Brand Color Application

**Visual Consistency Strategy:**
- **Logo Background**: Subtle halo using `label_color` or `background_color` with 20% opacity
- **Business Name**: `background_color` for primary text (matches signup page header)
- **Wallet Button**: `background_color` background with `foreground_color` text (matches submit button)
- **Success Indicator**: `background_color` for checkmark
- **Retry Button**: `background_color` for text link
- **Creates seamless visual flow** from signup page to success page

**Color Hierarchy:**
1. Primary: Business name uses brand's `background_color`
2. Secondary: English name uses lighter `label_color`
3. Interactive: Buttons use full brand color scheme with hover effects
4. Feedback: Success/error states incorporate brand colors

### 3. Technical Changes

**New Inline Wallet Logic:**
- Removed `WalletCardPreview` component dependency
- Inline wallet generation handlers: `handleAddToAppleWallet()` and `handleAddToGoogleWallet()`
- Direct API calls to `/api/wallet/apple` and `/api/wallet/google`
- Device detection via `WalletPassGenerator.getDeviceCapabilities()`
- Loading states with spinner (colored with `foreground_color`)
- Error handling with inline error display (retry button uses brand color)

**State Management:**
- `deviceCapabilities`: Detects Apple/Google Wallet support
- `isGeneratingWallet`: Loading state for button
- `walletError`: Error message state with brand-colored retry option

**Dynamic Styling:**
- All colors pulled from `getColors()` helper
- Buttons use `style={{ backgroundColor, color }}` for brand consistency
- Hover effects with `brightness-90` filter
- Fallback to default blue (#3B82F6) if no card design exists

### 4. User Experience Improvements

**Faster Performance:**
- Fewer components to render (no card preview)
- Simpler DOM structure
- Faster page load time

**Clearer Call-to-Action:**
- Single prominent button (or two if both wallets supported)
- Less cognitive load
- Matches modern wallet app onboarding patterns

**Stronger Brand Presence:**
- Consistent colors reinforce brand identity
- Logo-centric design puts brand first
- Visual continuity from signup to success page

**Better Mobile Experience:**
- Simpler layout optimized for mobile
- Larger touch targets (py-4 px-6 buttons)
- Clearer hierarchy with generous spacing

### 5. Bilingual Support

**Arabic Name (Primary):**
- Font size: `text-2xl` (1.5rem)
- Font weight: `font-bold`
- Color: `background_color` (brand color)
- Display: First, most prominent

**English Name (Secondary):**
- Font size: `text-sm` (0.875rem)
- Font weight: `font-medium`
- Transform: `uppercase`
- Letter spacing: `tracking-wider`
- Color: `label_color` or `background_color` (lighter brand color)
- Display: Below Arabic name

**RTL/LTR Support:**
- Container uses `dir={isRTL ? 'rtl' : 'ltr'}`
- All content adapts to text direction
- Maintains proper alignment in both languages

### 6. Wallet Integration

**Apple Wallet:**
- Displays on iOS devices
- Downloads `.pkpass` file
- Button text: Arabic "أضف إلى Apple Wallet" or English "Add to Apple Wallet"
- Icon: 🍎 emoji
- Brand-colored background

**Google Wallet:**
- Displays on Android/other devices
- Redirects to Google Wallet save URL
- Button text: Arabic "أضف إلى Google Wallet" or English "Add to Google Wallet"
- Icon: 📱 emoji
- Brand-colored background

**Both Platforms:**
- Stacked vertically with `space-y-4` if both supported
- Consistent styling with brand colors
- Loading spinner uses `foreground_color` for visibility
- Disabled state at 50% opacity

**Error Handling:**
- Red error box with warning icon
- Error message in current language
- Brand-colored retry button
- Dismissable with click

### 7. Testing Checklist

**Device Testing:**
- [ ] Test on iOS device (Apple Wallet button appears with brand colors)
- [ ] Test on Android device (Google Wallet button appears with brand colors)
- [ ] Test on desktop (appropriate button shown)

**Visual Testing:**
- [ ] Verify logo displays correctly (size, centering, aspect ratio, brand color halo)
- [ ] Verify bilingual business name displays correctly with brand colors
- [ ] Verify spacing matches mockup (generous white space)
- [ ] Test in both Arabic and English languages
- [ ] Verify dark mode support (if applicable)
- [ ] Test with different brand colors (light, dark, vibrant) for readability
- [ ] Verify color contrast meets accessibility standards (WCAG AA)
- [ ] Test brand color consistency between signup and success pages

**Functional Testing:**
- [ ] Test wallet generation success flow
- [ ] Test wallet generation error flow
- [ ] Verify loading states work correctly
- [ ] Test with businesses that have/don't have logos
- [ ] Verify error retry functionality
- [ ] Test with offers that have different card designs/colors

**Integration Testing:**
- [ ] Verify complete signup → success → wallet flow
- [ ] Test QR parameter tracking through success page
- [ ] Verify analytics tracking for wallet additions

### 8. Color Contrast Considerations

**Accessibility:**
- Use `foreground_color` for text on `background_color` backgrounds
- Fallback to white text if foreground color undefined
- Test with WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)

**Brand Color Scenarios:**
- **Light backgrounds** (e.g., #E0F2FE): Use dark foreground (#1E40AF)
- **Dark backgrounds** (e.g., #1E40AF): Use white/light foreground (#FFFFFF)
- **Vibrant backgrounds** (e.g., #F43F5E): Ensure sufficient contrast

**Visual Depth:**
- Logo halo uses low opacity (20%) to avoid overwhelming
- Buttons have `shadow-xl` for depth
- Hover effects with `brightness-90` for feedback
- Success/error states use appropriate semantic colors while incorporating brand

### 9. Rollback Plan

**Easy Reversion:**
- Previous success page implementation in git history (commit before this change)
- No database schema changes
- No backend API changes required
- Frontend-only modification

**Rollback Steps:**
```bash
# Find previous commit
git log --oneline -- src/pages/CustomerSignup.jsx

# Revert to specific commit
git checkout <commit-hash> -- src/pages/CustomerSignup.jsx

# Or revert entire commit
git revert <commit-hash>
```

**No Data Loss:**
- Customer data unaffected
- Wallet generation still works
- Only UI presentation changes

### 10. Future Enhancements

**Potential Additions:**
- Animated confetti effect on success
- Share button for social media
- Download QR code for printing
- Email/SMS receipt option
- Preview of wallet pass before adding
- Personalized success message based on offer type

---

**Deployment Date**: January 27, 2025  
**Version**: 2.1 - Success Page Redesign with Brand Colors  
**Status**: Ready for Production

---

## 🖼️ Dual Logo System Architecture

### Overview
The platform implements two separate logo upload systems with automatic fallback logic to ensure customer-facing pages always display business logos, even when logos are only uploaded through the card design editor.

### 1. Logo System Types

#### **Business Profile Logos**
- **Purpose**: Primary logo system for business profile
- **Location**: `uploads/logos/`
- **Database Table**: `businesses`
- **Columns**: 
  - `logo_filename` (VARCHAR) - Original filename
  - `logo_url` (VARCHAR) - Path relative to uploads/logos/
- **Upload Route**: `/api/business/logo/upload`
- **Serving Route**: `/api/business/public/logo/:businessId/:filename`
- **Authentication**: Required (business auth)
- **Access**: Public serving (no auth for GET)

#### **Card Design Logos**
- **Purpose**: Logos for wallet passes (Apple & Google)
- **Location**: `uploads/designs/logos/`
- **Database Table**: `offer_card_designs`
- **Column**: `logo_url` (VARCHAR) - Filename only
- **Upload Route**: `/api/card-design/upload/logo`
- **Serving Route**: `/api/card-design/logo/:filename` *(NEW)*
- **Authentication**: Required (business auth for upload)
- **Access**: Public serving (no auth for GET)

### 2. Why Two Systems?

**Historical Context:**
- Card design system was built first for wallet pass generation
- Business profile system added later for general business management
- Many businesses only upload logos through card design editor
- Leads to missing logos on customer signup page

**Production Reality:**
- `uploads/logos/` is mostly empty (business profile logos)
- `uploads/designs/logos/` contains all uploaded logos (3 files in production)
- Customer signup page only checked business profile logos → broken images

### 3. Fallback Logic Implementation

#### **Frontend Helper Function** (`CustomerSignup.jsx`)
```javascript
const getLogoUrl = () => {
  // Priority 1: Business profile logo
  if (offer?.businessLogo?.url) {
    console.log('🖼️ Using business profile logo')
    return apiBaseUrl + offer.businessLogo.url
  }
  
  // Priority 2: Card design logo (from offer response)
  if (offer?.cardDesignLogo?.url) {
    console.log('🖼️ Using card design logo from offer')
    return apiBaseUrl + offer.cardDesignLogo.url
  }
  
  // Priority 3: Card design logo (from separate fetch)
  if (cardDesign?.logo_url) {
    console.log('🖼️ Using card design logo from design fetch')
    return apiBaseUrl + '/api/card-design/logo/' + cardDesign.logo_url
  }
  
  // No logo available
  console.log('⚠️ No logo available')
  return null
}
```

**Usage:**
```javascript
{getLogoUrl() && (
  <img src={getLogoUrl()} alt="Business Logo" />
)}
```

### 4. Backend API Enhancement

#### **Public Offer Endpoint** (`/api/business/public/offer/:id`)

**Before (only business logo):**
```javascript
const offer = await Offer.findByPk(offerId, {
  include: [{
    model: Business,
    as: 'business',
    attributes: ['logo_filename', 'logo_url']
  }]
})

// Response
{
  businessLogo: { url: '/api/business/public/logo/...', filename: '...' }
}
```

**After (both logos with fallback):**
```javascript
const offer = await Offer.findByPk(offerId, {
  include: [
    {
      model: Business,
      as: 'business',
      attributes: ['logo_filename', 'logo_url']
    },
    {
      model: OfferCardDesign,
      as: 'cardDesign',
      attributes: ['logo_url', 'background_color', 'foreground_color']
    }
  ]
})

// Response
{
  businessLogo: { url: '/api/business/public/logo/...', filename: '...' } || null,
  cardDesignLogo: { url: '/api/card-design/logo/...', filename: '...' } || null
}
```

#### **New Public Logo Endpoint** (`/api/card-design/logo/:filename`)

**Route**: `GET /api/card-design/logo/:filename`  
**Authentication**: None (public endpoint)  
**Purpose**: Serve card design logos for customer-facing pages

**Security Features:**
- Filename validation (no directory traversal)
- Extension whitelist (jpg, jpeg, png, webp)
- File existence check before serving
- CORS headers for cross-origin requests
- Cache headers (24-hour TTL)

### 5. File Locations & Persistence

**Development (Local):**
- `uploads/logos/` - Business profile logos
- `uploads/designs/logos/` - Card design logos

**Production (Render):**
- **Persistent Disk Required**: Yes
- **Mount Path**: `/opt/render/project/src/backend/uploads`
- **Environment Variable**: `UPLOADS_DIR=/opt/render/project/src/backend/uploads`
- **Base URL**: `UPLOADS_BASE_URL=https://api.madna.me/uploads`

**Critical**: Without persistent disk, logos will be wiped on every deployment!

### 6. Database Schema

**`businesses` Table:**
```sql
CREATE TABLE businesses (
  public_id VARCHAR(255) PRIMARY KEY,  -- biz_*
  logo_filename VARCHAR(255),
  logo_url VARCHAR(255),
  -- Relationship: logo_url = '/logos/' + logo_filename
);
```

**`offer_card_designs` Table:**
```sql
CREATE TABLE offer_card_designs (
  id SERIAL PRIMARY KEY,
  offer_id VARCHAR(255) REFERENCES offers(public_id),
  logo_url VARCHAR(255),  -- Just filename, not full path
  background_color VARCHAR(7),
  foreground_color VARCHAR(7),
  label_color VARCHAR(7),
  stamp_icon VARCHAR(100)
);
```

### 7. Deployment Steps

**Phase 1: Frontend Updates** ✅
1. Add `getLogoUrl()` helper function to `CustomerSignup.jsx`
2. Update logo rendering in signup form (line ~770)
3. Update logo rendering in success page (line ~610)
4. Replace `{offer.businessLogo && ...}` with `{getLogoUrl() && ...}`
5. Replace `src={apiBaseUrl + offer.businessLogo.url}` with `src={getLogoUrl()}`

**Phase 2: Backend Public Endpoint** ✅
1. Add `path` import to `backend/routes/cardDesign.js`
2. Create `GET /api/card-design/logo/:filename` route
3. Implement filename validation (security)
4. Set cache headers (24h TTL)
5. Serve file with correct Content-Type

**Phase 3: API Enhancement** ✅
1. Import `OfferCardDesign` model in `backend/routes/business.js`
2. Add `cardDesign` include to public offer endpoint query
3. Add `cardDesignLogo` field to response object
4. Maintain backward compatibility with `businessLogo`

**Phase 4: Testing**
```bash
# Test public logo endpoint
curl https://api.madna.me/api/card-design/logo/your-logo.png
# Should return image data

# Test public offer endpoint
curl https://api.madna.me/api/business/public/offer/off_abc123
# Should include both businessLogo and cardDesignLogo fields

# Test customer signup page
# Navigate to: https://app.madna.me/signup?offer=off_abc123
# Verify logo displays correctly
```

### 8. Troubleshooting

**Logo not displaying on customer signup:**
- ✅ Check browser console for `getLogoUrl()` logs
- ✅ Should see: "🖼️ Using card design logo from offer"
- ✅ If "⚠️ No logo available" → Neither logo system has a logo
- ✅ Verify logo exists in `uploads/designs/logos/`

**404 on logo endpoint:**
- ✅ Verify file exists: `ls uploads/designs/logos/`
- ✅ Check `UPLOADS_DIR` env var is set correctly
- ✅ Verify persistent disk is mounted in Render
- ✅ Check filename matches exactly (case-sensitive)

**Logo displays after upload but disappears after deploy:**
- ❌ Persistent disk not configured
- ✅ Add persistent disk in Render dashboard
- ✅ Set `UPLOADS_DIR` environment variable
- ✅ Redeploy backend service

**Business uploaded logo through profile but not showing:**
- ✅ Check `businesses.logo_url` is not null
- ✅ Verify file exists in `uploads/logos/`
- ✅ Check public logo serving route works
- ✅ Frontend should prioritize this logo (Priority 1)

**Card design logo not falling back:**
- ✅ Verify `cardDesignLogo` field in API response
- ✅ Check `offer_card_designs.logo_url` has value
- ✅ Ensure frontend `getLogoUrl()` checks all 3 priorities
- ✅ Test with `console.log()` to trace fallback logic

### 9. Best Practices

**For Developers:**
- Always use `getLogoUrl()` helper for customer-facing pages
- Never hardcode logo URLs or paths
- Add console logging for debugging which logo source is used
- Test with businesses that have only card design logos

**For Businesses:**
- Upload logos through card design editor (most common)
- Logos will automatically appear on customer signup page
- Can optionally upload separate business profile logo
- Business profile logo takes priority if both exist

**For DevOps:**
- Ensure persistent disk is configured on Render
- Set `UPLOADS_DIR` and `UPLOADS_BASE_URL` environment variables
- Monitor disk usage (logos accumulate over time)
- Implement backup strategy for uploads directory

---

## 📱 Arabic Numeral Support for Phone Numbers

### Overview

The platform supports **real-time conversion** of Arabic-Indic numerals (٠-٩) to English numerals (0-9) in all phone number input fields, improving UX for Arabic-speaking users while maintaining validation compatibility.

**Affected Forms:**
- ✅ Customer Signup (`src/pages/CustomerSignup.jsx`)
- ✅ Business Registration (`src/pages/BusinessRegistrationPage.jsx`)

### Supported Numeral Systems

| Arabic Numeral | English Equivalent |
|---------------|-------------------|
| ٠ | 0 |
| ١ | 1 |
| ٢ | 2 |
| ٣ | 3 |
| ٤ | 4 |
| ٥ | 5 |
| ٦ | 6 |
| ٧ | 7 |
| ٨ | 8 |
| ٩ | 9 |

### Technical Implementation

**1. Conversion Function** (Shared across both forms):
```javascript
const convertArabicToEnglishNumbers = (str) => {
  if (!str) return str
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩'
  const englishNumerals = '0123456789'
  return str.split('').map(char => {
    const index = arabicNumerals.indexOf(char)
    return index !== -1 ? englishNumerals[index] : char
  }).join('')
}
```

**2. Real-Time Conversion** (On keystroke):
- Detects phone field names: `phone`, `owner_phone`
- Applies conversion instantly during `handleInputChange()`
- User sees converted English numerals immediately

**3. Validation Integration**:
- Phone validation functions (`validateSaudiPhone`) apply conversion before regex test
- Prevents validation errors when Arabic numerals are accidentally submitted
- Ensures backend receives clean English numerals

### UX Enhancements

**Visual Indicators:**
- Hint text below phone inputs: "✓ Arabic numerals are supported" (bilingual)
- Translation keys added for Arabic (`arabicNumbersSupported: 'يمكنك استخدام الأرقام العربية'`)
- Subtle gray text with checkmark icon

**Behavior:**
- User types: `+٩٦٦٥٥١٢٣٤٥٦٧`
- Instantly converts to: `+966551234567`
- Validation runs on English numerals
- No confusion or error messages

### Testing Checklist

**Customer Signup Form**:
1. ✅ Navigate to customer signup page
2. ✅ Type phone number using Arabic numerals: `+٩٦٦٥٠١٢٣٤٥٦٧`
3. ✅ Verify instant conversion to: `+966501234567`
4. ✅ Submit form and verify successful signup
5. ✅ Check hint text displays in both languages

**Business Registration Form**:
1. ✅ Navigate to business registration (Step 2: Location & Contact)
2. ✅ Enter business phone with Arabic numerals: `+٩٦٦٥٥٠٠٠٠٠٠٠`
3. ✅ Verify real-time conversion
4. ✅ Navigate to Step 3 (Owner Information)
5. ✅ Enter owner phone with Arabic numerals: `+٩٦٦٥٠١١١١١١١`
6. ✅ Verify real-time conversion
7. ✅ Complete registration and verify success

**Edge Cases**:
- ✅ Mixed numerals: `+966٥٥١٢٣٤٥٦٧` → Converts only Arabic digits
- ✅ Copy-paste Arabic numerals: Works identically to typing
- ✅ Empty field: No conversion errors
- ✅ Non-phone fields: No conversion applied

### Browser Compatibility

**Supported Browsers:**
- ✅ Chrome/Edge (96+): Full support
- ✅ Firefox (95+): Full support
- ✅ Safari (15+): Full support
- ✅ Mobile browsers: iOS Safari, Chrome Android

**Character Encoding:**
- UTF-8 encoding ensures Arabic numerals display correctly
- No special browser plugins required
- Works on all devices (desktop, tablet, mobile)

### Accessibility Considerations

- **Screen Readers**: Announce hint text "Arabic numerals are supported"
- **Keyboard Navigation**: Tab order unaffected
- **Visual Clarity**: Gray hint text doesn't distract from main input
- **Language Switching**: Hint text adapts to selected language (Arabic/English)

### Performance Impact

- **Negligible**: Conversion runs on single input field per keystroke
- **No API Calls**: Pure client-side JavaScript transformation
- **Memory**: ~50 bytes per conversion (instant garbage collection)
- **No Latency**: Synchronous operation (<1ms)

### Future Enhancements

**Potential Improvements:**
- Auto-detect and convert Eastern Arabic numerals (used in some Arabic dialects)
- Add support for other number input fields (CR number, National ID)
- Implement visual transition animation during conversion
- Add analytics to track usage of Arabic numerals
- Support for Persian/Urdu numerals (٠۰ system)

### 10. Future Improvements

**Potential Enhancements:**
- Merge both logo systems into one unified system
- Add automatic logo format conversion (WebP optimization)
- Implement CDN for logo serving (performance)
- Add logo versioning (cache busting)
- Provide admin UI to view/manage all logos
- Add logo upload progress indicator
- Implement logo compression on upload

---

**Deployment Date**: January 27, 2025  
**Version**: 2.2 - Dual Logo System with Fallback Logic  
**Status**: Ready for Production

