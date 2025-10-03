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

// Production security middleware
if (process.env.NODE_ENV === 'production') {
  // Trust proxy for Render deployment
  app.set('trust proxy', 1)

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    next()
  })

  // Basic rate limiting (without external packages)
  const requestCounts = new Map()
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
  const RATE_LIMIT_MAX = 100 // requests per window

  app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW

    // Clean old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (data.timestamp < windowStart) {
        requestCounts.delete(ip)
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
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      })
    }

    next()
  })
}

// Static file serving for images
app.use('/static', express.static('public'))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'loyalty-platform-backend',
    version: '1.0.0'
  })
})

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