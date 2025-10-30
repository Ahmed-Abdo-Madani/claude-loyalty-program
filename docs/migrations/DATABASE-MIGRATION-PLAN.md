# 🗄️ Database Migration Plan: JSON → PostgreSQL

## 📋 **Migration Overview**

**Current State:** JSON file-based DataStore with 7 data entities
**Target State:** PostgreSQL with Sequelize ORM
**Estimated Time:** 2-3 days
**Risk Level:** Medium (good existing schemas available)

---

## 🎯 **Phase 1: Setup & Dependencies**

### **1.1 Install Dependencies**
```bash
cd backend
npm install pg sequelize sequelize-cli
npm install --save-dev @types/sequelize  # TypeScript support (optional)
```

### **1.2 Database Setup**
```bash
# Install PostgreSQL (if not installed)
# Windows: Download from postgresql.org
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql

# Create databases
createdb loyalty_platform_dev
createdb loyalty_platform_test
```

### **1.3 Environment Variables**
Add to `backend/.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loyalty_platform_dev
DB_USER=postgres
DB_PASSWORD=your_password

# Test Database
DB_TEST_NAME=loyalty_platform_test
```

---

## 🏗️ **Phase 2: Model Creation**

### **2.1 Core Models to Create**
Based on existing schemas and DataStore analysis:

```
backend/models/
├── Business.js      ✅ (Created)
├── Branch.js        📝 (TODO)
├── Offer.js         📝 (TODO)
├── Customer.js      📝 (TODO)
├── CustomerProgress.js  📝 (TODO)
├── ScanTransaction.js   📝 (TODO)
├── BusinessCategory.js  📝 (TODO)
└── index.js         📝 (TODO - Model associations)
```

### **2.2 Model Relationships**
```javascript
// Key associations to implement:
Business.hasMany(Branch, { foreignKey: 'business_id' })
Business.hasMany(Offer, { foreignKey: 'business_id' })
Business.hasMany(Customer, { through: 'BusinessCustomer' })

Offer.belongsTo(Business, { foreignKey: 'business_id' })
Offer.hasMany(CustomerProgress, { foreignKey: 'offer_id' })

Customer.hasMany(CustomerProgress, { foreignKey: 'customer_id' })
Customer.hasMany(ScanTransaction, { foreignKey: 'customer_id' })
```

---

## 📊 **Phase 3: Data Migration**

### **3.1 Migration Script Structure**
```
backend/migrations/
├── migrate-from-json.js     ✅ (Created)
├── migrate-businesses.js    📝 (TODO)
├── migrate-branches.js      📝 (TODO)
├── migrate-offers.js        📝 (TODO)
├── migrate-customers.js     📝 (TODO)
└── validate-migration.js    📝 (TODO)
```

### **3.2 Current Data Volume**
- **Businesses:** 5 records
- **Branches:** 11 records
- **Offers:** 7 records
- **Customers:** 6 records
- **Progress:** ~0 records (new feature)
- **Transactions:** ~0 records (new feature)

### **3.3 Migration Execution Plan**
```bash
# 1. Backup current data
cp backend/data/platform-data.json backend/data/platform-data-backup.json

# 2. Run migration
node backend/migrations/migrate-from-json.js

# 3. Validate migration
node backend/migrations/validate-migration.js

# 4. Test API endpoints
npm run test  # After creating tests
```

---

## 🔄 **Phase 4: Service Layer Refactoring**

### **4.1 Replace DataStore Methods**

| Current DataStore Method | New Service Method |
|---|---|
| `dataStore.getBusinesses()` | `BusinessService.getAllBusinesses()` |
| `dataStore.addBusiness()` | `BusinessService.createBusiness()` |
| `dataStore.updateBusinessStatus()` | `BusinessService.updateBusinessStatus()` |
| `dataStore.calculateAnalytics()` | `BusinessService.getBusinessAnalytics()` |
| `dataStore.getOffers()` | `OfferService.getAllOffers()` |
| `dataStore.getCustomerProgress()` | `CustomerService.getProgress()` |

### **4.2 Service Layer Files to Create**
```
backend/services/
├── BusinessService.js    ✅ (Created)
├── OfferService.js       📝 (TODO)
├── CustomerService.js    📝 (TODO)
├── BranchService.js      📝 (TODO)
├── AnalyticsService.js   📝 (TODO)
└── index.js              📝 (TODO)
```

---

## 🛠️ **Phase 5: Route Updates**

### **5.1 Routes to Update**
**Primary File:** `backend/routes/business.js` (82 DataStore references)

**Example Refactor:**
```javascript
// OLD (DataStore)
router.get('/offers', async (req, res) => {
  await dataStore.init()
  const offers = dataStore.getOffers()
  res.json({ success: true, data: offers })
})

// NEW (Service Layer)
router.get('/offers', async (req, res) => {
  try {
    const offers = await OfferService.getAllOffers(req.query)
    res.json({ success: true, data: offers })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})
```

### **5.2 Route Files to Update**
- `backend/routes/business.js` - **Primary (82 references)**
- `backend/routes/admin.js` - **Secondary**
- `backend/controllers/*` - **Wallet controllers**

---

## ⚡ **Phase 6: Performance & Features**

### **6.1 Performance Improvements**
- **Connection Pooling:** 10-20 connections
- **Query Optimization:** Proper indexes on foreign keys
- **Caching:** Redis for frequently accessed data
- **Pagination:** Limit queries to 50-100 records

### **6.2 New Database Features**
- **ACID Transactions** for wallet operations
- **Concurrent Scanning** support
- **Advanced Analytics** with SQL aggregations
- **Data Integrity** with foreign key constraints
- **Arabic Text** full-text search (PostgreSQL)

---

## 🧪 **Phase 7: Testing & Validation**

### **7.1 Test Plan**
```bash
# 1. Unit tests for services
npm run test:unit

# 2. Integration tests for database
npm run test:integration

# 3. API endpoint tests
npm run test:api

# 4. Data consistency validation
node backend/migrations/validate-migration.js

# 5. Performance testing
npm run test:performance
```

### **7.2 Rollback Strategy**
1. **Keep JSON backup** during initial weeks
2. **Dual-write mode** (write to both DB and JSON)
3. **Feature flags** for database vs. JSON routes
4. **Monitoring** for database performance issues

---

## 🚀 **Phase 8: Deployment**

### **8.1 Development Environment**
```bash
# 1. Start PostgreSQL
pg_ctl start

# 2. Run migrations
npm run db:migrate

# 3. Start application
npm run dev
```

### **8.2 Production Deployment**
- **Database:** AWS RDS or DigitalOcean Managed PostgreSQL
- **Migrations:** Automated via CI/CD
- **Monitoring:** Database performance metrics
- **Backup:** Daily automated backups

---

## ✅ **Migration Checklist**

### **Prerequisites**
- [ ] PostgreSQL installed and running
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Backup of current JSON data created

### **Core Migration**
- [x] Database configuration created
- [x] Business model implemented
- [x] Migration script template created
- [x] Business service layer created
- [ ] All models implemented (6 remaining)
- [ ] All service layers created (4 remaining)
- [ ] Migration scripts completed (4 remaining)
- [ ] Route updates completed (82 references)

### **Testing & Validation**
- [ ] Unit tests created
- [ ] Integration tests created
- [ ] Data migration validated
- [ ] API endpoints tested
- [ ] Performance benchmarked

### **Production Ready**
- [ ] Connection pooling configured
- [ ] Error handling improved
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Rollback plan tested

---

## 🔥 **Quick Start Commands**

```bash
# Install dependencies
npm install pg sequelize

# Setup database
createdb loyalty_platform_dev

# Create first migration
node backend/migrations/migrate-from-json.js

# Test the migration
curl http://localhost:3001/api/business/my/analytics
```

---

## 🤔 **Recommendations**

### **Priority Order:**
1. **Start with Business model** (most critical, already done)
2. **Migrate Offers next** (core functionality)
3. **Add Customer & Progress** (scanning features)
4. **Branches & Categories** (supporting data)
5. **Analytics optimization** (performance)

### **Risk Mitigation:**
- **Test extensively** with current data
- **Keep JSON backup** for first month
- **Implement feature flags** for gradual rollout
- **Monitor performance** closely after migration

This migration will significantly improve the platform's **scalability**, **data integrity**, and **performance** while enabling advanced features like real-time analytics and concurrent user support.