# 🎯 Loyalty Program Platform

A cost-effective and scalable loyalty program management platform designed for businesses to enhance customer retention through simple, powerful loyalty programs.

## 🌟 **Features**

### **For Businesses**
- ⚡ **5-minute setup** - Create loyalty programs in minutes
- 📱 **QR Code generation** - Unique codes for each offer
- 🎯 **Multiple program types** - Stamps, points, discounts
- 📊 **Real-time analytics** - Track customer engagement
- 🏪 **Multi-location support** - Manage multiple branches
- 🎨 **Custom stamp icons** - SVG support with automatic PNG preview generation

### **For Customers**
- 📱 **Mobile wallet integration** - Apple Wallet & Google Pay with emoji stamp visualization
- 🔍 **QR code scanning** - Instant program enrollment
- ⭐ **Progress tracking** - Visual stamp/point collection (⭐, ☕, 🍕, etc.)
- 🎁 **Automatic rewards** - Seamless redemption process
- 📧 **Smart notifications** - Birthday offers & reminders

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
├── 📄 README.md                          # This file
├── 📄 package.json                       # Dependencies and scripts
├── 📄 SCALABILITY-ROADMAP.md            # Scaling strategy & roadmap
├── 📁 wireframes-*.md                    # UI/UX wireframes
├── 📁 src/
│   ├── 📄 main.jsx                       # React entry point
│   ├── 📄 App.jsx                        # Main app component
│   ├── 📄 index.css                      # Global styles
│   ├── 📁 pages/
│   │   ├── 📄 LandingPage.jsx           # Main marketing page
│   │   ├── 📄 AuthPage.jsx              # Sign in/up forms
│   │   ├── 📄 Dashboard.jsx             # Business owner interface
│   │   └── 📄 CustomerSignup.jsx        # Customer enrollment
│   └── 📁 components/
│       ├── 📄 Header.jsx                # Navigation header
│       ├── 📄 Hero.jsx                  # Landing page hero
│       ├── 📄 Benefits.jsx              # Feature showcase
│       ├── 📄 HowItWorks.jsx           # Process explanation
│       ├── 📄 CTA.jsx                   # Call-to-action section
│       └── 📄 Footer.jsx                # Site footer
└── 📁 config files (vite, tailwind, etc.)
```

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

3. **Generate stamp icon previews**
   ```bash
   cd backend
   npm run generate-icon-previews
   ```
   Note: Sample icons (coffee, gift) are included by default.

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

### **Available Scripts**

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🎨 **Wireframes & Design**

The project includes comprehensive wireframes for all major pages:

1. **[Main Landing Page](wireframes-main-page.md)** - Marketing and conversion
2. **[Business Dashboard](wireframes-dashboard.md)** - Offer management
3. **[Customer Signup](wireframes-customer-signup.md)** - Mobile enrollment

### **Design System**
- **Primary Color**: `#3B82F6` (Blue)
- **Secondary Color**: `#10B981` (Green)
- **Accent Color**: `#F59E0B` (Orange)
- **Typography**: Inter font family
- **Components**: Tailwind CSS utility classes

## 📊 **Database Schema**

```sql
-- Core entities
businesses (id, email, business_name, created_at)
branches (id, business_id, name, address, active)
offers (id, business_id, title, description, stamps_required, active)
customers (id, first_name, last_name, whatsapp, birthday)
customer_cards (id, customer_id, offer_id, stamps_earned, redeemed)
```

[View complete schema](SCALABILITY-ROADMAP.md#database-scaling-strategy)

## 🔮 **Roadmap**

### **Phase 1: MVP (Current)**
- ✅ Landing page and wireframes
- ✅ React application structure
- 🔄 QR code generation
- 🔄 Mobile wallet integration
- 🔄 Customer signup flow

### **Phase 2: Production Ready**
- Backend API development
- Database setup and authentication
- Payment processing integration
- Testing and deployment

### **Phase 3: Growth Features**
- Advanced analytics dashboard
- Multiple offer types (points, tiers)
- Email/SMS notifications
- POS system integrations

[View complete roadmap](SCALABILITY-ROADMAP.md)

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

```bash
# Deploy API server
git push origin main
# Auto-deploys via webhook with Docker build
```

**Key Features:**
- Docker-based deployment (see `backend/Dockerfile`)
- System-level emoji fonts (`fonts-noto-color-emoji`)
- Ensures consistent emoji rendering in Apple Wallet passes
- First deployment: 5-10 minutes (Docker build)
- Subsequent deployments: 2-3 minutes (cached layers)

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