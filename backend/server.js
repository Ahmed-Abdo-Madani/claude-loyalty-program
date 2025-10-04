import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import logger from './config/logger.js'
import walletRoutes from './routes/wallet.js'
import passRoutes from './routes/passes.js'
import adminRoutes from './routes/admin.js'
import businessRoutes from './routes/business.js'
import customerRoutes from './routes/customers.js'
import notificationRoutes from './routes/notifications.js'
import segmentRoutes from './routes/segments.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Critical: Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔴 Unhandled Promise Rejection - Critical', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise
  })

  // In production, consider graceful shutdown for unhandled rejections
  if (process.env.NODE_ENV === 'production') {
    logger.error('Initiating graceful shutdown due to unhandled rejection')
    setTimeout(() => {
      process.exit(1)
    }, 1000) // Give logger time to flush
  }
})

process.on('uncaughtException', (error) => {
  logger.error('🔴 Uncaught Exception - Server must restart', {
    error: error.message,
    stack: error.stack
  })

  // Always exit on uncaught exceptions - the process is in an undefined state
  setTimeout(() => {
    process.exit(1)
  }, 1000) // Give logger time to flush
})

// Configure CORS based on environment
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://app.madna.me',           // Production frontend
      'https://madna.me',               // Main domain
      'https://www.madna.me'            // WWW subdomain
    ]
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://192.168.8.114:3000',           // Network access
      'http://192.168.8.114:5173',           // Network access for Vite dev
      'https://f139ff85db6a.ngrok-free.app', // Your ngrok HTTPS tunnel
      /^https:\/\/.*\.ngrok-free\.app$/,     // Allow any ngrok-free subdomain
      /^https:\/\/.*\.ngrok\.io$/,           // Allow ngrok.io domains
      /^https:\/\/.*\.ngrok\.app$/           // Allow ngrok.app domains
    ]

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',      // Added for admin JWT tokens
    'x-session-token',
    'x-business-id'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }))

// Health check endpoint - MUST be before rate limiting to avoid blocking Render health checks
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'loyalty-platform-backend',
    version: '1.0.0'
  })
})

// Trust proxy for production deployment (needed for accurate IP detection)
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

// Rate limiting (ALL ENVIRONMENTS - protects against DoS attacks)
// Note: /health endpoint is exempt (defined above before this middleware)
const requestCounts = new Map()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 100 : 500 // Higher limit for dev/testing

// Periodic cleanup to prevent memory growth from old IP entries
setInterval(() => {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW
  let cleaned = 0

  for (const [ip, data] of requestCounts.entries()) {
    if (data.timestamp < windowStart) {
      requestCounts.delete(ip)
      cleaned++
    }
  }

  if (cleaned > 0) {
    logger.debug(`Rate limiter cleanup: removed ${cleaned} expired IP entries`)
  }
}, 5 * 60 * 1000) // Clean every 5 minutes

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW

  // Get or initialize client data
  const clientData = requestCounts.get(clientIP) || { count: 0, timestamp: now }

  // Reset if outside window
  if (clientData.timestamp < windowStart) {
    clientData.count = 1
    clientData.timestamp = now
  } else {
    clientData.count++
  }

  requestCounts.set(clientIP, clientData)

  // Check if limit exceeded
  if (clientData.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((clientData.timestamp + RATE_LIMIT_WINDOW - now) / 1000)

    logger.warn('Rate limit exceeded', {
      ip: clientIP,
      count: clientData.count,
      limit: RATE_LIMIT_MAX,
      path: req.path
    })

    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: retryAfter
    })
  }

  next()
})

// Static file serving for images
app.use('/static', express.static('public'))

// API Routes
app.use('/api/wallet', walletRoutes)
app.use('/api/passes', passRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/segments', segmentRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  })
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.madna.me'
    : `http://localhost:${PORT}`

  logger.info(`🚀 Madna Loyalty Platform Backend running on port ${PORT}`)
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`📍 Base URL: ${baseUrl}`)

  if (process.env.NODE_ENV !== 'production') {
    logger.info(`🌐 Network access: http://192.168.8.114:${PORT}`)
  }

  logger.info(`❤️ Health check: ${baseUrl}/health`)
  logger.info(`🏢 Business API: ${baseUrl}/api/business`)
  logger.info(`👥 Customer API: ${baseUrl}/api/customers`)
  logger.info(`📱 Wallet API: ${baseUrl}/api/wallet`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
  })
})