# 🐘 PostgreSQL Setup Guide for Loyalty Platform

## 📥 **Windows Installation**

### **Option 1: Official PostgreSQL Installer (Recommended)**

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 15 or 16 (latest stable)
   - Run the `.exe` installer

2. **Installation Steps:**
   - ✅ **Server:** Install PostgreSQL Server
   - ✅ **pgAdmin 4:** Web-based administration tool
   - ✅ **Command Line Tools:** psql, createdb, etc.
   - ✅ **Stack Builder:** Additional tools (optional)

3. **Configuration:**
   - **Port:** 5432 (default)
   - **Superuser:** postgres
   - **Password:** Choose a strong password (update .env file)
   - **Locale:** English, United States

### **Option 2: Using Package Manager**

```powershell
# Using Chocolatey
choco install postgresql

# Using winget
winget install PostgreSQL.PostgreSQL
```

---

## ⚙️ **Post-Installation Configuration**

### **1. Verify Installation**
```bash
# Check PostgreSQL version
psql --version

# Check if service is running (Windows)
net start | findstr postgres

# If not running, start it:
net start postgresql-x64-14  # Adjust version number
```

### **2. Create Development Database**
```bash
# Method 1: Using createdb command
createdb -U postgres loyalty_platform_dev

# Method 2: Using psql
psql -U postgres
CREATE DATABASE loyalty_platform_dev;
\q
```

### **3. Create Test Database**
```bash
createdb -U postgres loyalty_platform_test
```

### **4. Update Environment Variables**
Edit `backend/.env` with your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loyalty_platform_dev
DB_USER=postgres
DB_PASSWORD=your_actual_password  # ⚠️ Update this!
DB_TEST_NAME=loyalty_platform_test
```

---

## 🧪 **Test Database Connection**

### **Run Connection Test:**
```bash
cd backend
node test-db-connection.js
```

### **Expected Output:**
```
🔄 Testing database connection...
✅ Database connection successful!
📊 PostgreSQL version: PostgreSQL 15.x on x86_64-pc-windows-msvc
🏗️  Testing table creation...
✅ Test record created: { id: 1, test_message: 'Database connection test successful!', ... }
🧹 Test cleanup completed

🎉 Database is ready for migration!
```

---

## 🔧 **Common Issues & Solutions**

### **Issue 1: psql command not found**
```bash
# Add PostgreSQL to PATH
# Default installation path: C:\Program Files\PostgreSQL\15\bin

# Or use full path:
"C:\Program Files\PostgreSQL\15\bin\psql" --version
```

### **Issue 2: Connection refused (ECONNREFUSED)**
```bash
# Check if PostgreSQL service is running
services.msc  # Look for "postgresql-x64-XX"

# Start service if stopped:
net start postgresql-x64-15  # Adjust version
```

### **Issue 3: Authentication failed (28P01)**
```bash
# Verify password in .env matches PostgreSQL setup
# Try connecting manually:
psql -U postgres -d loyalty_platform_dev
```

### **Issue 4: Database doesn't exist (3D000)**
```bash
# Create the database:
createdb -U postgres loyalty_platform_dev
```

---

## 🚀 **Alternative: Use Docker (Advanced)**

If you prefer Docker or have installation issues:

### **1. Create Docker Compose file:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: loyalty_platform_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### **2. Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

### **3. Update .env:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loyalty_platform_dev
DB_USER=postgres
DB_PASSWORD=password
```

---

## 📱 **GUI Tools (Optional)**

### **pgAdmin 4 (Included with installer)**
- Web interface: http://localhost:5050
- Connect to server: localhost:5432
- View tables, run queries, manage data

### **Alternative Tools:**
- **DBeaver:** Free universal database tool
- **DataGrip:** JetBrains database IDE
- **Azure Data Studio:** Microsoft's database tool

---

## ✅ **Verification Checklist**

Before proceeding with migration:

- [ ] PostgreSQL installed and running
- [ ] Can connect using `psql -U postgres`
- [ ] Created `loyalty_platform_dev` database
- [ ] Updated `.env` with correct credentials
- [ ] Test script runs successfully: `node test-db-connection.js`
- [ ] No connection errors in console

---

## 🆘 **Need Help?**

### **Check Logs:**
```bash
# Windows PostgreSQL logs location:
C:\Program Files\PostgreSQL\15\data\log\

# Check latest log file for errors
```

### **Reset Password (if forgotten):**
1. Edit `pg_hba.conf` file
2. Change authentication method to `trust`
3. Restart PostgreSQL service
4. Connect and change password
5. Revert `pg_hba.conf` changes

### **Uninstall/Reinstall:**
```bash
# Uninstall via Control Panel
# Delete data directory: C:\Program Files\PostgreSQL\
# Reinstall with fresh configuration
```

Once PostgreSQL is installed and configured, you can proceed with the database migration!