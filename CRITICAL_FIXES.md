# Critical Fixes Required - Immediate Action

## 🔴 CRITICAL ISSUE #1: Missing Process Error Handlers

**Risk:** Server crashes on unhandled promise rejections
**Impact:** Service downtime, data loss, poor user experience

### Fix for [backend/server.js](backend/server.js):

Add these handlers **after** line 13 (after imports):

```javascript
// Global error handlers - CRITICAL for production stability
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason,
    promise: promise,
    stack: reason?.stack
  })
  // In production, consider graceful shutdown
  if (process.env.NODE_ENV === 'production') {
    logger.error('Server shutting down due to unhandled rejection')
    server.close(() => {
      process.exit(1)
    })
  }
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - Server crashing', {
    error: error.message,
    stack: error.stack
  })
  // Always exit on uncaught exceptions
  process.exit(1)
})
```

---

## 🔴 CRITICAL ISSUE #2: Rate Limiting Only in Production

**Risk:** Development/staging environments vulnerable to DoS
**Impact:** Resource exhaustion, testing disruption

### Fix for [backend/server.js](backend/server.js):

Replace lines 61-113 with:

```javascript
// Trust proxy for production deployment
app.set('trust proxy', 1)

// Security headers (all environments)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})

// Rate limiting (ALL ENVIRONMENTS - adjust limits per env)
const requestCounts = new Map()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 100 : 500 // Higher limit for dev

// Exclude health check from rate limiting
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next()
  }

  const clientIP = req.ip || req.connection.remoteAddress
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW

  // Clean old entries periodically
  if (Math.random() < 0.01) { // 1% of requests
    for (const [ip, data] of requestCounts.entries()) {
      if (data.timestamp < windowStart) {
        requestCounts.delete(ip)
      }
    }
  }

  // Check current client
  const clientData = requestCounts.get(clientIP) || { count: 0, timestamp: now }

  if (clientData.timestamp < windowStart) {
    clientData.count = 1
    clientData.timestamp = now
  } else {
    clientData.count++
  }

  requestCounts.set(clientIP, clientData)

  if (clientData.count > RATE_LIMIT_MAX) {
    logger.warn('Rate limit exceeded', { ip: clientIP, count: clientData.count })
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((clientData.timestamp + RATE_LIMIT_WINDOW - now) / 1000)
    })
  }

  next()
})
```

---

## 🔴 CRITICAL ISSUE #3: Database Connection Pool Monitoring

**Risk:** Pool exhaustion causing request failures
**Impact:** Service degradation, user errors

### Fix for [backend/config/database.js](backend/config/database.js):

Add after line 85:

```javascript
// Monitor database connection pool
sequelize.pool.on('acquire', (connection) => {
  console.log('Connection acquired:', {
    total: sequelize.pool.totalCount,
    idle: sequelize.pool.idleCount,
    waiting: sequelize.pool.waitingCount
  })
})

sequelize.pool.on('release', (connection) => {
  console.log('Connection released:', {
    total: sequelize.pool.totalCount,
    idle: sequelize.pool.idleCount
  })
})

// Warn on pool issues
setInterval(() => {
  const poolInfo = {
    total: sequelize.pool.totalCount,
    idle: sequelize.pool.idleCount,
    waiting: sequelize.pool.waitingCount
  }

  if (poolInfo.waiting > 5) {
    logger.warn('Database pool congestion detected', poolInfo)
  }

  if (poolInfo.idle === 0 && poolInfo.total >= 15) {
    logger.warn('Database pool exhaustion risk', poolInfo)
  }
}, 30000) // Check every 30 seconds
```

---

## 🟠 HIGH PRIORITY: Frontend Bundle Optimization

**Risk:** Slow load times, poor mobile experience
**Impact:** User drop-off, reduced engagement

### Fix for [vite.config.js](vite.config.js):

Replace with optimized configuration:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT) || 3000,
    strictPort: false,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@heroicons/react'],
          'vendor-utils': ['axios', 'date-fns', 'crypto-js'],
          'qr-features': ['qrcode', 'qr-scanner']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
```

### Also add lazy loading to [src/App.jsx](src/App.jsx):

```javascript
import { lazy, Suspense } from 'react'

// Lazy load heavy components
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EnhancedQRScanner = lazy(() => import('./components/EnhancedQRScanner'))

// In routes, wrap with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/admin" element={<AdminDashboard />} />
</Suspense>
```

---

## 🟠 HIGH PRIORITY: Enhanced Error Logging

**Risk:** Difficult debugging in production
**Impact:** Longer incident resolution time

### Add to [backend/config/logger.js](backend/config/logger.js):

```javascript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'loyalty-platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

// Add request ID tracking
logger.addRequestId = (req, res, next) => {
  req.id = Math.random().toString(36).substring(7)
  logger.defaultMeta.requestId = req.id
  next()
}

export default logger
```

---

## 🟡 RECOMMENDED: Request Body Size Limits

**Risk:** Large payloads causing memory issues
**Impact:** DoS vulnerability

### Add to [backend/server.js](backend/server.js) after line 46:

```javascript
// Body parser with size limits
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Log large payloads
    if (buf.length > 1024 * 1024) { // > 1MB
      logger.warn('Large JSON payload received', {
        size: buf.length,
        path: req.path,
        ip: req.ip
      })
    }
  }
}))

app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 10000
}))
```

---

## Testing the Fixes

After applying fixes, run these tests:

```bash
# 1. Test error handling
node -e "Promise.reject('test rejection')"  # Should log and exit gracefully

# 2. Test rate limiting
node rate-limit-test.js  # Should now show rate limiting active

# 3. Test bundle optimization
npm run build && node analyze-bundle.js  # Should show reduced main bundle size

# 4. Test performance
node performance-test.js  # Should maintain 100% success rate

# 5. Test memory stability
node --expose-gc memory-leak-test.js  # Should pass
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Apply all critical fixes
- [ ] Update environment variables
- [ ] Run full test suite
- [ ] Test rate limiting in staging
- [ ] Verify error logging works
- [ ] Monitor database pool metrics
- [ ] Check bundle size reduction
- [ ] Load test with production-like traffic
- [ ] Set up APM/monitoring alerts
- [ ] Document rollback procedure

---

## Emergency Contacts & Escalation

If issues occur after deployment:

1. **Check logs:** `logs/error.log` and `logs/combined.log`
2. **Monitor metrics:** Database pool, memory usage, response times
3. **Rollback command:** (Add your rollback procedure here)
4. **On-call:** (Add on-call engineer contact)

---

**Priority:** CRITICAL
**Estimated Fix Time:** 2-4 hours
**Testing Time:** 1-2 hours
**Total Downtime:** None (zero-downtime deployment possible)
