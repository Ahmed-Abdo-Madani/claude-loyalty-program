# Documentation Index

This directory contains all project documentation organized into three main sections: active guides, migration documentation, and historical archives.

## 📁 Directory Structure

```
docs/
├── guides/          # Active reference documentation
├── migrations/      # Database migration guides
└── archive/         # Historical implementation reports
```

## 📚 Active Guides (`guides/`)

### Getting Started
- **[DEVELOPMENT.md](guides/DEVELOPMENT.md)** - Complete development environment setup and workflow
- **[QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md)** - Quick reference for common tasks and commands
- **[QUICK-FIX-GUIDE.md](guides/QUICK-FIX-GUIDE.md)** - Troubleshooting guide for common issues
- **[DEBUGGING-PLAN.md](guides/DEBUGGING-PLAN.md)** - Debugging strategies and tools

### Deployment & Production
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](guides/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Comprehensive production deployment guide
- **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](guides/PRODUCTION_DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification checklist
- **[DEPLOYMENT-NEXT-STEPS.md](guides/DEPLOYMENT-NEXT-STEPS.md)** - Post-deployment tasks and monitoring
- **[DEPLOYMENT_GUIDE_WALLET_DIFFERENTIATION.md](guides/DEPLOYMENT_GUIDE_WALLET_DIFFERENTIATION.md)** - Wallet differentiation deployment
- **[README_PRODUCTION.md](guides/README_PRODUCTION.md)** - Production-specific documentation

### Database Setup
- **[POSTGRESQL-SETUP-GUIDE.md](guides/POSTGRESQL-SETUP-GUIDE.md)** - PostgreSQL installation and configuration
- **[ADMIN_CREDENTIALS.md](guides/ADMIN_CREDENTIALS.md)** - Admin credentials management guide

### Apple Wallet Integration
- **[APPLE-WALLET-CLEANUP-GUIDE.md](guides/APPLE-WALLET-CLEANUP-GUIDE.md)** - Apple Wallet implementation cleanup procedures
- **[PERPETUAL-PASSES-DOCUMENTATION.md](guides/PERPETUAL-PASSES-DOCUMENTATION.md)** - Perpetual passes feature documentation

### Feature Guides
- **[CARD-DESIGN-QUICKSTART.md](guides/CARD-DESIGN-QUICKSTART.md)** - Quick start guide for card design features
- **[ICON-LIBRARY-TESTING-GUIDE.md](guides/ICON-LIBRARY-TESTING-GUIDE.md)** - Icon library testing procedures
- **[ICONS_PATH_RUNTIME_CONFIG.md](guides/ICONS_PATH_RUNTIME_CONFIG.md)** - Icon path configuration guide
- **[DEVICE-MODEL-SCHEMA-CLARIFICATION.md](guides/DEVICE-MODEL-SCHEMA-CLARIFICATION.md)** - Device model schema documentation

## 🗄️ Migration Documentation (`migrations/`)

### Migration Guides
- **[RUNNING-SQL-MIGRATIONS.md](migrations/RUNNING-SQL-MIGRATIONS.md)** - How to run SQL migrations
- **[MIGRATION-INSTRUCTIONS.md](migrations/MIGRATION-INSTRUCTIONS.md)** - General migration instructions
- **[QUICK-MIGRATION-GUIDE.md](migrations/QUICK-MIGRATION-GUIDE.md)** - Quick migration reference
- **[DATABASE-MIGRATION-PLAN.md](migrations/DATABASE-MIGRATION-PLAN.md)** - Database migration planning guide
- **[MIGRATION-007-DEPLOYMENT-GUIDE.md](migrations/MIGRATION-007-DEPLOYMENT-GUIDE.md)** - Specific migration deployment guide
- **[BUSINESS-OFFER-ID-SECURITY-MIGRATION-PLAN.md](migrations/BUSINESS-OFFER-ID-SECURITY-MIGRATION-PLAN.md)** - Security migration plan

## 📦 Archive (`archive/`)

The archive directory contains historical implementation reports, completion status files, and planning documents from various development phases. These files are preserved for reference but represent completed work.

### Archive Categories
- **Apple Wallet Implementation** - Apple Wallet integration completion reports
- **Branch Manager Portal** - Branch manager features and fixes
- **Customer Management** - Customer-related features and bug fixes
- **Google Wallet Integration** - Google Wallet implementation reports
- **Mobile Optimization** - Mobile-first design and optimization
- **Phase Completion Reports** - Phase 1, 2, and 3 completion summaries
- **Tier System** - Loyalty tier configuration and validation
- **Testing & Analysis** - Performance tests, stress tests, and impact reports
- **Planning Documents** - Historical implementation plans

## 🔗 Quick Links

### Most Commonly Used
- [Main README](../README.md) - Project overview and quick start
- [Deployment Guide](../DEPLOYMENT.md) - Primary deployment documentation
- [Development Guide](guides/DEVELOPMENT.md) - Development environment setup
- [Quick Reference](guides/QUICK_REFERENCE.md) - Common commands and tasks
- [Troubleshooting](guides/QUICK-FIX-GUIDE.md) - Fix common issues

### For New Developers
1. Start with [DEVELOPMENT.md](guides/DEVELOPMENT.md)
2. Review [QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md)
3. Set up database with [POSTGRESQL-SETUP-GUIDE.md](guides/POSTGRESQL-SETUP-GUIDE.md)
4. Refer to [DEBUGGING-PLAN.md](guides/DEBUGGING-PLAN.md) when troubleshooting

### For Deployments
1. Review [PRODUCTION_DEPLOYMENT_CHECKLIST.md](guides/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
2. Follow [PRODUCTION_DEPLOYMENT_GUIDE.md](guides/PRODUCTION_DEPLOYMENT_GUIDE.md)
3. Complete [DEPLOYMENT-NEXT-STEPS.md](guides/DEPLOYMENT-NEXT-STEPS.md)

## 📝 Contributing to Documentation

When adding new documentation:

1. **Active Guides** → `docs/guides/` - For current reference documentation
2. **Migration Docs** → `docs/migrations/` - For database migration guides
3. **Completed Work** → `docs/archive/` - For implementation completion reports

### File Naming Conventions
- Use uppercase with hyphens: `MY-GUIDE-NAME.md`
- Be descriptive and specific
- Include date suffix for time-sensitive docs: `MIGRATION-2025-01-15.md`

### Documentation Standards
- Include a clear title and overview
- Add table of contents for long documents
- Use code blocks for commands and code examples
- Include screenshots or diagrams where helpful
- Keep documentation up-to-date as features change

## 🔍 Search Tips

- Use your IDE's file search to find specific documentation
- Search within files for specific topics or error messages
- Check the archive for historical context on completed features

---

**Last Updated:** January 2025  
**Maintained By:** Development Team
