import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import walletRoutes from './routes/wallet.js'
import passRoutes from './routes/passes.js'
import adminRoutes from './routes/admin.js'
import businessRoutes from './routes/business.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://192.168.8.114:3000',           // Network access
    'http://192.168.8.114:5173',           // Network access for Vite dev
    'https://f139ff85db6a.ngrok-free.app', // Your ngrok HTTPS tunnel
    /^https:\/\/.*\.ngrok-free\.app$/,     // Allow any ngrok-free subdomain
    /^https:\/\/.*\.ngrok\.io$/,           // Allow ngrok.io domains
    /^https:\/\/.*\.ngrok\.app$/           // Allow ngrok.app domains
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-session-token', 'x-business-id'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}))
app.use(express.json())
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }))

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Loyalty Platform Backend running on port ${PORT}`)
  console.log(`📍 Local access: http://localhost:${PORT}`)
  console.log(`🌐 Network access: http://192.168.8.114:${PORT}`)
  console.log(`📱 Wallet API endpoints available at http://192.168.8.114:${PORT}/api/wallet`)
  console.log(`🎫 Pass endpoints available at http://192.168.8.114:${PORT}/api/passes`)
  console.log(`👑 Admin API endpoints available at http://192.168.8.114:${PORT}/api/admin`)
  console.log(`🏢 Business API endpoints available at http://192.168.8.114:${PORT}/api/business`)
  console.log(`❤️ Health check: http://192.168.8.114:${PORT}/health`)
  console.log(`🔑 Business login: POST http://192.168.8.114:${PORT}/api/business/login`)
})