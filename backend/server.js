import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import walletRoutes from './routes/wallet.js'
import passRoutes from './routes/passes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Frontend URLs
  credentials: true
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

app.listen(PORT, () => {
  console.log(`🚀 Loyalty Platform Backend running on port ${PORT}`)
  console.log(`📱 Wallet API endpoints available at http://localhost:${PORT}/api/wallet`)
  console.log(`🎫 Pass endpoints available at http://localhost:${PORT}/api/passes`)
  console.log(`❤️ Health check: http://localhost:${PORT}/health`)
})