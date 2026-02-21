# 🎯 Loyalty Program Platform

A cost-effective and scalable loyalty program management platform designed for businesses to enhance customer retention through simple, powerful loyalty programs.

## 🌟 **Features**

### **For Businesses**
- ⚡ **5-minute setup** - Create loyalty programs in minutes
- 📱 **QR Code generation** - Unique codes for each offer with mobile-optimized modal (no scrolling required on mobile devices)
- 🎯 **Multiple program types** - Stamps, points, discounts
- 📊 **Real-time analytics** - Track customer engagement
- 🏪 **Multi-location support** - Manage multiple branches
- 🎨 **Custom stamp icons** - SVG icons generated automatically on server startup
- 🚀 **Streamlined scanning** - Branch manager portal with PIN-based authentication and one-tap prize confirmation (auto-confirms prizes for 3-second transactions, optimized for high-volume operations)

### **For Customers**
- 📱 **Mobile wallet integration** - Apple Wallet & Google Pay with perpetual loyalty passes (auto-reset after each reward)
- 🏆 **Customizable tier system** - Gamified loyalty experience with business-defined tier names, thresholds, and icons
- 🔄 **Perpetual passes** - One pass forever, reusable indefinitely for continuous engagement
- 🔍 **QR code scanning** - Instant program enrollment
- ⭐ **Progress tracking** - Visual stamp/point collection with completion counters and tier progression
- 🎁 **Automatic rewards** - Seamless redemption process with stamps auto-reset
- 📧 **Smart notifications** - Birthday offers & reminders
- ✨ **Bilingual support** - Arabic numeral conversion for phone inputs (see [DEPLOYMENT.md](DEPLOYMENT.md#-arabic-numeral-support-for-phone-numbers))

## 🏗️ **Architecture**

### **Technology Stack**
- **Frontend**: React.js + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Mobile Wallets**: Apple PassKit + Google Wallet API
- **QR Codes**: qrcode.js library
- **Hosting**: Vercel (frontend) + Railway (backend)

### **Key Design Principles**
- 🎯 **Mobile-first** - Optimized for mobile customer experience
- 💰 **Cost-effective** - Minimal infrastructure requirements
- 📈 **Scalable** - Designed to handle growth from startup to enterprise
- 🔒 **Secure** - Privacy-focused with minimal data collection
- ⚡ **Fast** - Quick setup and instant customer onboarding

## 📁 **Project Structure**

```
claude-loyalty-program/
├── 📄 README.md                          # This file - Project overview
├── 📄 DEPLOYMENT.md                      # Production deployment guide
├── 📄 package.json                       # Dependencies and scripts
├── � docs/                              # 📚 Documentation hub
│   ├── �📄 README.md                      # Documentation index
│   ├── 📁 guides/                        # Active reference guides
│   │   ├── 📄 DEVELOPMENT.md            # Development setup
│   │   ├── 📄 QUICK_REFERENCE.md        # Common commands
│   │   ├── 📄 DEBUGGING-PLAN.md         # Troubleshooting
│   │   └── 📄 ...more guides            # See docs/README.md
│   ├── 📁 migrations/                    # Migration documentation
│   └── 📁 archive/                       # Historical reports
├── 📁 tests/                             # 🧪 Testing & analysis tools
│   ├── 📄 README.md                      # Testing guide
│   ├── 📄 stress-test.js                # Load testing
│   ├── 📄 performance-test.js           # Performance benchmarks
│   └── 📄 ...more tests                 # See tests/README.md
├── 📁 src/                               # Frontend source code
│   ├── 📄 main.jsx                       # React entry point
│   ├── 📄 App.jsx                        # Main app component
│   ├── 📄 index.css                      # Global styles
│   ├── 📁 pages/                         # Page components
│   │   ├── 📄 LandingPage.jsx           # Main marketing page
│   │   ├── 📄 AuthPage.jsx              # Sign in/up forms
│   │   ├── 📄 Dashboard.jsx             # Business owner interface
│   │   └── 📄 CustomerSignup.jsx        # Customer enrollment
│   └── 📁 components/                    # Reusable components
│       ├── 📄 Header.jsx                # Navigation header
│       ├── 📄 Hero.jsx                  # Landing page hero
│       ├── 📄 Benefits.jsx              # Feature showcase
│       ├── 📄 HowItWorks.jsx           # Process explanation
│       ├── 📄 CTA.jsx                   # Call-to-action section
│       └── 📄 Footer.jsx                # Site footer
├── 📁 backend/                           # Backend source code
│   ├── 📄 server.js                      # Express server
│   ├── 📁 routes/                        # API routes
│   ├── 📁 controllers/                   # Business logic
│   ├── 📁 models/                        # Database models
│   ├── 📁 services/                      # Service layer
│   └── 📁 migrations/                    # Database migrations
└── 📁 config files                       # Build & config files
```

## 📚 **Documentation**

### Quick Access
- **[Documentation Index](docs/README.md)** - Complete documentation hub
- **[No-Drop Migration Guide](docs/guides/NO_DROP_MIGRATION.md)** - Safe production deployment with live data
- **[Development Guide](docs/guides/DEVELOPMENT.md)** - Setup and development workflow
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Testing Guide](tests/README.md)** - Testing tools and procedures
- **[Quick Reference](docs/guides/QUICK_REFERENCE.md)** - Common commands and tasks
- **[Troubleshooting](docs/guides/QUICK-FIX-GUIDE.md)** - Fix common issues

### For New Developers
1. Start with **[DEVELOPMENT.md](docs/guides/DEVELOPMENT.md)** for environment setup
2. Review **[QUICK_REFERENCE.md](docs/guides/QUICK_REFERENCE.md)** for common commands
3. Set up database with **[POSTGRESQL-SETUP-GUIDE.md](docs/guides/POSTGRESQL-SETUP-GUIDE.md)**
4. Refer to **[DEBUGGING-PLAN.md](docs/guides/DEBUGGING-PLAN.md)** when troubleshooting

### For Deployments
- **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](docs/guides/PRODUCTION_DEPLOYMENT_CHECKLIST.md)**
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](docs/guides/PRODUCTION_DEPLOYMENT_GUIDE.md)**
- **[DEPLOYMENT-NEXT-STEPS.md](docs/guides/DEPLOYMENT-NEXT-STEPS.md)**

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Git
- Docker (for production deployment with emoji font support)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd claude-loyalty-program
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

   Update `.env` with your configuration:
   - `JWT_SECRET`: Required for authentication (default provided for development)
   - `DATABASE_URL`: PostgreSQL connection string (if using database)
   - `APPLE_PASS_CERTIFICATE_PATH`: Path to Apple Wallet certificate (for wallet features)
   - `VITE_PUBLIC_SITE_URL`: Frontend public URL for Open Graph/canonical tags (e.g., `https://app.madna.me` in production)
   - `PRERENDER_TOKEN` (Backend): Optional Prerender.io token for social media crawler support

   For development, the default values in `.env.example` work out of the box.

   For production, see `DEPLOYMENT.md` for secure configuration guidelines.

   **SEO & Social Media**: Set `VITE_PUBLIC_SITE_URL` to your production frontend domain to enable proper Open Graph tags for WhatsApp/Facebook previews. Without `PRERENDER_TOKEN`, crawlers will see fallback meta tags from `index.html`.

4. **Run Database Migrations**

   After setting up the database, run all migrations:

   ```bash
   cd backend
   npm run migrate:branch-manager
   npm run migrate:pass-lifecycle
   npm run migrate:pass-status-constraint
   ```

   These migrations add:
   - Branch manager authentication fields
   - Pass lifecycle management fields
   - Database constraint fixes

   For detailed migration information, see `DEPLOYMENT.md`.

   **Important**: Migration scripts must close database connections before exiting. If a migration hangs after showing "Database pool initialized", it's missing `await sequelize.close()` before `process.exit()`. See `DEPLOYMENT.md` for the correct pattern.

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   **Note**: Stamp icons (coffee, gift) are automatically generated on backend startup. No manual setup required. The system creates SVG files programmatically and generates PNG previews using Sharp.

6. **Wallet button assets** ✅
   
   Official Apple and Google Wallet button designs are already included in `public/assets/wallet-buttons/`. These comply with platform branding guidelines and support both English and Arabic. No additional setup required. See [DEPLOYMENT.md](DEPLOYMENT.md#61-official-wallet-button-assets) for details.

7. **Open browser**
   ```
   http://localhost:3000
   ```

### **Available Scripts**

**Main Development**:
```bash
npm run dev      # Start development server (frontend + backend)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

**Stamp Icons System** (optional - automatic in normal operation):
```bash
cd backend
npm run init-icons    # Manually generate/regenerate stamp icons
npm run verify-icons  # Check all stamp icon files are present
```

**Other Backend Scripts**:
```bash
cd backend
npm run dev                      # Start backend only
npm run generate-icon-previews   # Legacy preview generation (deprecated)
npm run migrate:gender           # Run gender field migration
```

## 📊 **Database Schema**

```sql
-- Core entities
businesses (id, email, business_name, created_at)
branches (id, business_id, name, address, active)
offers (id, business_id, title, description, stamps_required, active)
customers (id, first_name, last_name, whatsapp, birthday)
customer_cards (id, customer_id, offer_id, stamps_earned, redeemed)
```

For complete database schema and migration guides, see [Database Documentation](docs/migrations/).

## 🔮 **Roadmap**

### **Phase 1: MVP (Current)**
- ✅ Landing page and core features
- ✅ React application structure
- ✅ QR code generation
- ✅ Mobile wallet integration (Apple Wallet & Google Pay)
- ✅ Customer signup flow

### **Phase 2: Production Ready**
- ✅ Backend API development
- ✅ Database setup and authentication
- ✅ Payment processing integration
- ✅ Testing and deployment

### **Phase 3: Growth Features**
- ✅ Advanced analytics dashboard
- ✅ Multiple offer types (points, tiers)
- ✅ Email/SMS notifications
- 🔄 POS system integrations

For detailed feature planning and architecture decisions, see [Documentation Guides](docs/guides/).

## 💰 **Business Model**

### **Pricing Strategy**
- 🆓 **Free Tier**: 1 offer, 100 customers
- 💼 **Professional** ($29/mo): Unlimited offers, 1K customers
- 🏢 **Enterprise** ($99/mo): Multi-location, API access

### **Revenue Projections**
- **Year 1**: $50K ARR
- **Year 2**: $250K ARR
- **Year 3**: $1M ARR

## 🔧 **Development**

### **Adding New Features**

1. **Frontend Components**
   ```bash
   # Create new component
   touch src/components/NewComponent.jsx

   # Add to appropriate page
   # Update routing in App.jsx if needed
   ```

2. **New Pages**
   ```bash
   # Create page component
   touch src/pages/NewPage.jsx

   # Add route in App.jsx
   <Route path="/new" element={<NewPage />} />
   ```

3. **Styling**
   - Use Tailwind utility classes
   - Add custom components in `index.css`
   - Follow mobile-first responsive design

### **Code Standards**
- ✅ Use functional components with hooks
- ✅ Follow React best practices
- ✅ Implement proper error handling
- ✅ Add PropTypes for type checking
- ✅ Use meaningful component and variable names

## 🚀 **Deployment**

### **Frontend (Vercel)**
```bash
# Build and deploy
npm run build
vercel --prod
```

### **Backend (Render with Docker)**
The backend uses **Docker deployment** to ensure reliable emoji font support for Apple Wallet stamp images.

| Scenario | Command | DB Impact | Wallet Passes |
|----------|---------|-----------|---------------|
| **No-Drop (recommended for production with live data)** | `git push origin main` | Migrations applied incrementally; all data preserved | ✅ Unaffected |
| **Fresh start (dev/staging only)** | Drop DB → `git push origin main` | All data wiped; schema rebuilt from scratch | ❌ All passes invalidated |

> For production deployments with live customers, always use the **No-Drop** path. See [`docs/guides/NO_DROP_MIGRATION.md`](docs/guides/NO_DROP_MIGRATION.md) for the full guide.

**Key Features:**
- Docker-based deployment (see `backend/Dockerfile`)
- System-level emoji fonts (`fonts-noto-color-emoji`)
- Ensures consistent emoji rendering in Apple Wallet passes
- First deployment: 5-10 minutes (Docker build)
- Subsequent deployments: 2-3 minutes (cached layers)
- **Dual Logo System**: Automatic fallback from business profile to card design logos for seamless customer experience (see [DEPLOYMENT.md](DEPLOYMENT.md#-dual-logo-system-architecture))

**Note:** The `render.yaml` configuration uses `env: docker` instead of native Node.js runtime to install required system fonts for emoji stamp visualization.

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### **Database (PostgreSQL)**
```bash
# Run migrations
npm run migrate
# Seed initial data
npm run seed
```

## 📈 **Monitoring & Analytics**

### **Key Metrics to Track**
- **User Acquisition**: Signups per day/week
- **Engagement**: Active businesses, customer enrollments
- **Performance**: Page load times, API response times
- **Business**: Revenue, churn rate, feature adoption

### **Tools**
- **Analytics**: Google Analytics, Mixpanel
- **Performance**: Vercel Analytics, New Relic
- **Errors**: Sentry, LogRocket
- **Uptime**: Pingdom, StatusPage

## 🔧 **Troubleshooting**

### **Status Management Best Practices**

#### **Offer Status Management**

**When to Use Each Status:**
- **Active**: Offer is live and accepting new customers
- **Paused**: Temporarily suspend new signups while allowing existing customers to continue
- **Inactive**: Deactivate offer (e.g., seasonal offer out of season)
- **Expired**: Automatically set when time-limited offer passes end_date

**Best Practices:**
- Use "Paused" instead of "Inactive" for temporary suspensions
- Set time limits for promotional campaigns to auto-expire
- Monitor offer status before marketing campaigns
- Existing customers can always complete their loyalty journey

**Common Workflows:**
```bash
# Pause offer during inventory shortage
Dashboard → Offers → Select Offer → Status: Paused

# Resume offer when ready
Dashboard → Offers → Select Offer → Status: Active

# Create time-limited campaign
Dashboard → Create Offer → Enable Time Limit → Set End Date
```

#### **Branch Status Management**

**When to Use Each Status:**
- **Active**: Branch is operational and accepting POS operations
- **Inactive**: Branch is temporarily closed (e.g., renovation, holiday)
- **Closed**: Branch is permanently closed

**POS Access Control:**
- `pos_access_enabled`: Independent toggle for POS operations
- Use when you want branch visible but POS disabled
- Useful for training, maintenance, or gradual rollout

**Best Practices:**
- Set branch to "Inactive" during temporary closures
- Use POS Access toggle for maintenance windows
- Communicate status changes to branch managers
- Provide business contact info for support

**Common Workflows:**
```bash
# Temporarily disable POS for maintenance
Dashboard → Branches → Select Branch → Toggle POS Access: OFF

# Close branch for renovation
Dashboard → Branches → Select Branch → Status: Inactive

# Permanently close branch
Dashboard → Branches → Select Branch → Status: Closed
```

#### **Status Validation Reference**

For detailed information on status validation rules, error codes, and troubleshooting:
- **[Status Validation Documentation](docs/STATUS_VALIDATION.md)** - Complete reference guide
- **[Testing Guide](tests/README.md)** - Run status validation tests

**Quick Status Check:**
```bash
# Test offer status validation
node backend/test/offer-status-validation.test.js

# Test branch status validation
node backend/test/branch-status-validation.test.js

# Run all status validation tests
node backend/test/status-validation-integration.test.js
```

### **Common Issues**

#### **Google Wallet Pass Generation Fails**

**Error**: `null value in column "last_updated_tag" violates not-null constraint`

**Solution**: Run the database migration to fix the schema:

```bash
cd backend
node migrations/20250125-fix-last-updated-tag-nullable.js
```

**Root Cause**: The `last_updated_tag` column is Apple Wallet-specific and should allow NULL values for Google Wallet passes. This error indicates a schema drift issue in production.

**Verification**:
```bash
# Check if the fix was applied
psql $DATABASE_URL -c "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'wallet_passes' AND column_name = 'last_updated_tag';"
# Expected: is_nullable = 'YES'
```

For detailed information, see [PRODUCTION-DEPLOYMENT.md](PRODUCTION-DEPLOYMENT.md).

#### **Emoji Stamps Not Showing in Apple Wallet Passes**

**Solution**: Ensure Docker deployment is configured properly

1. Verify `render.yaml` uses `env: docker`
2. Check Docker image includes `fonts-noto-color-emoji` package
3. Verify `FONTCONFIG_PATH=/etc/fonts` is set
4. Review build logs for font installation success

For detailed font configuration, see [DEPLOYMENT.md](DEPLOYMENT.md#step-3-font-configuration-for-emoji-rendering).

#### **Database Connection Issues in Production**

**Error**: `ECONNREFUSED` when connecting to database

**Solution**: Update migration scripts to support `DATABASE_URL` environment variable

Check that your migration scripts support both connection formats:
```javascript
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        // ... other parameters
      }
)
```

### **Wallet Passes After a Production Deploy**

If you're deploying changes to production with live wallet passes, preserving the database is critical.

- **Will existing Apple/Google Wallet passes stop working?** No, as long as the `wallet_passes` table and its columns (`authentication_token`, `last_updated_tag`, `wallet_object_id`) are preserved.
- **Do customers need to re-add their passes?** No, passes update in-place via push notifications (Apple) or background sync (Google).
- **What if a migration fails mid-way?** Render aborts the deploy; your old code keeps serving.
- For complete details on deploying safely, refer to the [No-Drop Migration Guide](docs/guides/NO_DROP_MIGRATION.md).



#### **Development Server Issues**

**Port Already in Use**:
```bash
# Find process using port 3000/3001
netstat -ano | findstr :3000
# Kill the process
taskkill /PID <process_id> /F
```

**Dependencies Not Installing**:
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **Getting Help**

For issues not covered here:

1. Check existing issues: [GitHub Issues]()
2. Review deployment guides: [DEPLOYMENT.md](DEPLOYMENT.md)
3. Check production troubleshooting: [PRODUCTION-DEPLOYMENT.md](PRODUCTION-DEPLOYMENT.md)
4. Contact support: support@loyaltyplatform.com

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 **Support**

- 📧 **Email**: support@loyaltyplatform.com
- 💬 **Discord**: [Join our community]()
- 📚 **Documentation**: [docs.loyaltyplatform.com]()
- 🐛 **Bug Reports**: [GitHub Issues]()

---

**Built with ❤️ for businesses that want to build lasting customer relationships.**