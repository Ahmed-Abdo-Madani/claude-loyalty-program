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