import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import cron from 'node-cron'
import prerender from 'prerender-node'
import logger from './config/logger.js'
import sequelize from './config/database.js'
import walletRoutes from './routes/wallet.js'
import passRoutes from './routes/passes.js'
import appleWebServiceRoutes from './routes/appleWebService.js'
import adminRoutes from './routes/admin.js'
import businessRoutes from './routes/business.js'
import customerRoutes from './routes/customers.js'
import notificationRoutes from './routes/notifications.js'
import segmentRoutes from './routes/segments.js'
import locationRoutes from './routes/locations.js'
import cardDesignRoutes from './routes/cardDesign.js'
import stampIconsRoutes from './routes/stampIcons.js'
import branchManagerRoutes from './routes/branchManager.js'
import autoEngagementRoutes from './routes/autoEngagement.js'
import posRoutes from './routes/pos.js'
import receiptsRoutes from './routes/receipts.js'
import appleCertificateValidator from './utils/appleCertificateValidator.js'
import { initializeStampIcons } from './scripts/initialize-stamp-icons.js'
import ManifestService from './services/ManifestService.js'
import StampImageGenerator from './services/StampImageGenerator.js'
import AutoEngagementService from './services/AutoEngagementService.js'
import { extractLanguage, getLocalizedMessage } from './middleware/languageMiddleware.js'
import AutoMigrationRunner from './services/AutoMigrationRunner.js'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure custom font path for Sharp/librsvg emoji rendering
// Docker deployment: Uses system-installed Noto Color Emoji fonts (/etc/fonts)
// Local development: Uses custom fonts.conf from ./fonts directory
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = path.join(__dirname, 'fonts')
}

dotenv.config()

// Auto-migration configuration (optional)
// AUTO_MIGRATE=true (default) - Automatically run pending migrations on startup
// AUTO_MIGRATE=false - Disable auto-migrations (manual migration required)
// MIGRATION_LOCK_TIMEOUT=30000 - Milliseconds to wait for migration lock

// ============================================
// Environment Validation (PRODUCTION CRITICAL)
// ============================================
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'BASE_URL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    console.error('🔴 FATAL: Missing required environment variables:', missingVars.join(', '))
    console.error('Server cannot start without these variables in production mode')
    process.exit(1)
  }

  // Validate JWT_SECRET strength (minimum 32 characters)
  if (process.env.JWT_SECRET.length < 32) {
    console.error('🔴 FATAL: JWT_SECRET must be at least 32 characters long for production')
    process.exit(1)
  }

  // Validate QR_JWT_SECRET strength (minimum 64 characters for QR tokens)
  if (!process.env.QR_JWT_SECRET) {
    console.error('🔴 FATAL: QR_JWT_SECRET is required for production')
    process.exit(1)
  }
  
  if (process.env.QR_JWT_SECRET.length < 64) {
    console.error('🔴 FATAL: QR_JWT_SECRET must be at least 64 characters long for production')
    console.error('QR tokens require stronger security due to public exposure in QR codes')
    process.exit(1)
  }

  logger.info('✅ Environment validation passed')
}

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
    'x-business-id',
    'x-manager-token',    // Branch manager authentication
    'x-branch-id',        // Branch manager branch ID
    'Accept-Language'     // NEW: Support for language preference
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
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)')
  next()
})

// Language detection middleware (extract from Accept-Language header or query param)
app.use(extractLanguage)

// ============================================
// Prerender.io Middleware for Social Media Crawlers
// ============================================
// This ensures WhatsApp, Facebook, Twitter, etc. receive fully rendered HTML
// with route-specific meta tags instead of generic fallbacks
if (process.env.PRERENDER_TOKEN) {
  prerender.set('prerenderToken', process.env.PRERENDER_TOKEN)
  
  // Whitelist key pages that need social media previews
  prerender.set('whitelist', [
    '/',
    '/features',
    '/pricing',
    '/contact',
    '/help',
    '/privacy',
    '/terms',
    '/business/register',
    '/join/.*',          // Customer signup with offer ID
    '/integrations',
    '/api-docs'
  ])
  
  // Don't cache responses (always get fresh meta tags)
  prerender.set('protocol', 'https')
  
  app.use(prerender)
  
  logger.info('✅ Prerender.io middleware enabled for social media crawlers')
} else {
  logger.warn('⚠️  PRERENDER_TOKEN not set - social media previews will use fallback meta tags')
  logger.warn('   Set PRERENDER_TOKEN environment variable to enable prerendering')
}

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
      error: getLocalizedMessage('server.rateLimitExceeded', req.locale || 'ar'),
      message: getLocalizedMessage('server.rateLimitMessage', req.locale || 'ar', { minutes: Math.ceil(retryAfter / 60) }),
      retryAfter: retryAfter
    })
  }

  next()
})

// Static file serving for images
// Production: Uses UPLOADS_DIR env var pointing to persistent disk mount
// Development: Falls back to ./uploads directory
const uploadsPath = process.env.UPLOADS_DIR || './uploads'
app.use('/static', express.static('public'))
app.use('/uploads', express.static(uploadsPath))

// Warn if uploads are ephemeral in production
if (!process.env.UPLOADS_DIR && process.env.NODE_ENV === 'production') {
  logger.warn('⚠️ UPLOADS_DIR not set in production - uploads will be ephemeral and lost on redeploy!')
}

// API Routes
app.use('/api/wallet', walletRoutes)
app.use('/api/passes', passRoutes)
app.use('/api/apple', appleWebServiceRoutes) // Apple Web Service Protocol (routes have /v1 prefix)
app.use('/api/admin', adminRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/segments', segmentRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/card-design', cardDesignRoutes)
app.use('/api/stamp-icons', stampIconsRoutes)
app.use('/api/branch-manager', branchManagerRoutes)
app.use('/api/auto-engagement', autoEngagementRoutes)
app.use('/api/pos', posRoutes)
app.use('/api/receipts', receiptsRoutes)

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
    error: getLocalizedMessage('server.internalError', req.locale || 'ar'),
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: getLocalizedMessage('server.routeNotFound', req.locale || 'ar'),
    path: req.originalUrl
  })
})

// Initialize database and test connection
async function initializeDatabase() {
  try {
    // Test database connection
    await sequelize.authenticate()
    logger.info('✅ Database connection established')
    return true
  } catch (error) {
    logger.error('❌ Database initialization failed:', error)
    throw error
  }
}

// Start server with database initialization
;(async () => {
  try {
    // Initialize database first
    await initializeDatabase()

    // Auto-run pending migrations (production safety feature)
    if (process.env.AUTO_MIGRATE !== 'false') {
      try {
        logger.info('🔄 Checking for pending database migrations...')
        
        const lockTimeout = parseInt(process.env.MIGRATION_LOCK_TIMEOUT || '30000', 10)
        const stopOnError = process.env.MIGRATION_STOP_ON_ERROR !== 'false'
        
        const migrationResult = await AutoMigrationRunner.runPendingMigrations({
          stopOnError,
          lockTimeout
        })
        
        if (migrationResult.failed > 0) {
          logger.error('❌ CRITICAL: Migration failures detected', {
            total: migrationResult.total,
            applied: migrationResult.applied,
            failed: migrationResult.failed
          })
          
          if (process.env.NODE_ENV === 'production') {
            logger.error('🛑 Exiting to prevent serving with incomplete schema')
            process.exit(1)
          }
        } else if (migrationResult.applied > 0) {
          logger.info('✅ Auto-migrations completed successfully', {
            applied: migrationResult.applied,
            total: migrationResult.total,
            executionTime: migrationResult.totalExecutionTime
          })
        } else {
          logger.info('✅ Database schema is up to date (no pending migrations)')
        }
        
      } catch (error) {
        logger.error('❌ CRITICAL: Auto-migration system failed', {
          error: error.message,
          stack: error.stack
        })
        
        if (process.env.NODE_ENV === 'production') {
          logger.error('🛑 Exiting to prevent serving with unknown schema state')
          process.exit(1)
        } else {
          logger.warn('⚠️ Continuing in development mode despite migration failure')
        }
      }
    } else {
      logger.info('⏭️ Auto-migrations disabled (AUTO_MIGRATE=false)')
      logger.warn('⚠️ Ensure migrations are run manually before deployment!')
    }

    // Verify critical tables exist (auto-migrations should have created them)
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public' 
      AND tablename IN ('wallet_passes', 'schema_migrations')
    `)

    if (tables.length < 2) {
      logger.error('❌ CRITICAL: Required tables missing', {
        found: tables.map(t => t.tablename),
        expected: ['wallet_passes', 'schema_migrations']
      })
      
      if (process.env.NODE_ENV === 'production') {
        logger.error('🛑 Auto-migrations should have created these tables')
        process.exit(1)
      }
    }

    // Validate campaign_type schema matches model definition (Comment 5)
    if (process.env.SKIP_SCHEMA_CHECKS !== 'true') {
      try {
        // Allow bypassing validation in development
        if (process.env.SKIP_SCHEMA_VALIDATION === 'true') {
          logger.warn('⚠️ Schema validation bypassed (SKIP_SCHEMA_VALIDATION=true)')
          logger.warn('   This should only be used during development!')
        } else {
          logger.info('🔍 Validating campaign_type schema...')
          
          // Expected values from NotificationCampaign model
          const expectedValues = [
            'lifecycle',
            'promotional',
            'transactional',
            'new_offer_announcement',
            'custom_promotion',
            'seasonal_campaign'
          ].sort()
        
          // Query database for ALL CHECK constraints on campaign_type (Comment 1)
          const [constraints] = await sequelize.query(`
            SELECT con.conname AS constraint_name, pg_get_constraintdef(con.oid) AS constraint_def
            FROM pg_constraint con
            INNER JOIN pg_class rel ON rel.oid = con.conrelid
            INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            INNER JOIN pg_attribute attr ON attr.attnum = ANY(con.conkey) AND attr.attrelid = con.conrelid
            WHERE rel.relname = 'notification_campaigns'
            AND con.contype = 'c'
            AND attr.attname = 'campaign_type'
          `)
          
          if (constraints.length === 0) {
            logger.error('🔴 SCHEMA MISMATCH: No CHECK constraint found on campaign_type column')
            logger.error('   Expected constraint: check_campaign_type on notification_campaigns.campaign_type')
            logger.error('   Remediation: Run migration 20250131-add-notification-campaign-fields.js')
            logger.error('   Command: node backend/run-migration.js 20250131-add-notification-campaign-fields.js')
            
            if (process.env.NODE_ENV === 'production') {
              logger.error('🛑 Exiting in production due to schema mismatch')
              process.exit(1)
            } else {
              logger.warn('⚠️ Continuing in development mode despite schema mismatch')
            }
          } else if (constraints.length > 1) {
            // Multiple CHECK constraints exist - must be consolidated (Comment 1)
            logger.error('🔴 SCHEMA ERROR: Multiple CHECK constraints found on campaign_type column')
            logger.error(`   Found ${constraints.length} constraints: ${constraints.map(c => c.constraint_name).join(', ')}`)
            logger.error('   Only one CHECK constraint should exist')
            logger.error('   Remediation: Run migration 20250131-add-notification-campaign-fields.js to consolidate')
            logger.error('   Command: node backend/run-migration.js 20250131-add-notification-campaign-fields.js')
            
            if (process.env.NODE_ENV === 'production') {
              logger.error('🛑 Exiting in production due to multiple constraints')
              process.exit(1)
            } else {
              logger.warn('⚠️ Continuing in development mode despite multiple constraints')
            }
          } else {
            // Parse constraint definition using robust quoted token extractor (Comment 1)
            const constraintDef = constraints[0].constraint_def
            const constraintName = constraints[0].constraint_name
            
            // Extract all quoted values using matchAll - handles Postgres casts like ::text, ::character varying
            const quotedMatches = [...constraintDef.matchAll(/'([^']+)'/g)]
            const dbValues = [...new Set(quotedMatches.map(match => match[1]))].sort()
            
            if (dbValues.length === 0) {
              logger.warn('⚠️ Could not extract values from constraint definition')
              logger.warn(`   Constraint: ${constraintDef}`)
              logger.warn('   Schema validation skipped - manual verification recommended')
            } else {
              const isMatch = JSON.stringify(dbValues) === JSON.stringify(expectedValues)
              
              if (isMatch) {
                logger.info(`✅ campaign_type schema validated: ${dbValues.length} values match model definition`)
                logger.info(`   Constraint name: ${constraintName}`)
              } else {
                logger.error('🔴 SCHEMA MISMATCH: Database constraint does not match model definition')
                logger.error(`   Model expects: ${expectedValues.join(', ')}`)
                logger.error(`   Database has: ${dbValues.join(', ')}`)
                logger.error(`   Constraint name: ${constraintName}`)
                logger.error('   Remediation: Run migration 20250131-add-notification-campaign-fields.js')
                logger.error('   Command: node backend/run-migration.js 20250131-add-notification-campaign-fields.js')
                
                if (process.env.NODE_ENV === 'production') {
                  logger.error('🛑 Exiting in production due to schema mismatch')
                  process.exit(1)
                } else {
                  logger.warn('⚠️ Continuing in development mode despite schema mismatch')
                }
              }
            }
          }
        }
      } catch (error) {
        logger.error('❌ Campaign type schema validation failed:', error.message)
        logger.warn('⚠️ Continuing startup - manual schema verification recommended')
      }
    } else {
      logger.info('⏭️ Schema validation checks skipped (SKIP_SCHEMA_CHECKS=true)')
    }

    // Validate auto_engagement_configs table exists
    if (process.env.SKIP_SCHEMA_VALIDATION !== 'true') {
      try {
        logger.info('🔍 Validating auto_engagement_configs table...')
        
        const [tableCheck] = await sequelize.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = 'auto_engagement_configs'
        `)
        
        if (tableCheck.length === 0) {
          logger.error('❌ CRITICAL: auto_engagement_configs table does not exist')
          logger.error('   The auto-engagement cron job will fail!')
          logger.error('   Run migration: node backend/run-migration.js 20250201-create-auto-engagement-configs-table.js')
          
          if (process.env.NODE_ENV === 'production') {
            logger.error('🚨 Exiting to prevent runtime failures...')
            process.exit(1)
          } else {
            logger.warn('⚠️  Continuing in development mode, but auto-engagement will not work')
          }
        } else {
          logger.info('✅ auto_engagement_configs table validated')
          
          // Verify critical columns exist
          const [columnCheck] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'auto_engagement_configs' 
            AND column_name IN ('config_id', 'business_id', 'enabled', 'inactivity_days', 'message_template')
          `)
          
          if (columnCheck.length < 5) {
            logger.warn('⚠️  Some columns missing in auto_engagement_configs table', {
              found: columnCheck.length,
              expected: 5
            })
          }
        }
      } catch (error) {
        logger.error('❌ Failed to validate auto_engagement_configs table', {
          error: error.message
        })
        if (process.env.NODE_ENV === 'production') {
          process.exit(1)
        }
      }
    }

    // Initialize Apple Wallet certificates
    try {
      const certValidation = await appleCertificateValidator.validateAndLoad()
      if (certValidation.isValid) {
        logger.info('✅ Apple Wallet certificates loaded and validated')
      } else {
        logger.warn('⚠️ Apple Wallet certificate validation failed:', certValidation.errors)
        logger.warn('   Apple Wallet passes will not work until certificates are properly configured')
        // Continue startup - Apple Wallet is optional, Google Wallet still works
      }
    } catch (error) {
      logger.warn('⚠️ Apple Wallet certificate loading failed:', error.message)
      logger.warn('   Apple Wallet passes will not work until certificates are properly configured')
      // Continue startup even if Apple Wallet certificates fail
    }

    // Validate stamp icons directory
    try {
      const iconsValid = StampImageGenerator.validateIconsDirectory()
      if (!iconsValid) {
        logger.warn('⚠️ Stamp icons validation failed - passes may not show stamp visualization')
        logger.warn('   Run: node backend/scripts/initialize-stamp-icons.js')
      }
    } catch (error) {
      logger.warn('⚠️ Stamp icons validation error:', error.message)
      // Continue startup - stamp icons are optional
    }

    // Initialize location service
    try {
      const LocationService = (await import('./services/LocationService.js')).default
      await LocationService.initialize()
      logger.info('✅ LocationService initialized successfully')
    } catch (error) {
      logger.warn('⚠️ LocationService initialization failed:', error.message)
      // Continue startup even if location service fails
    }

    // Initialize and check APNs service
    try {
      const ApnsService = (await import('./services/ApnsService.js')).default
      const isReady = ApnsService.isReady()
      
      if (isReady) {
        logger.info('✅ APNs Service initialized successfully', {
          topic: ApnsService.topic || 'N/A',
          certificateSource: ApnsService.isConfigured ? 'configured' : 'not configured',
          status: 'READY'
        })
      } else {
        logger.warn('⚠️ APNs Service not configured - push notifications will not be sent')
        logger.info('   Apple Wallet passes will work but will not auto-update')
        logger.info('   Set APPLE_PASS_CERTIFICATE_BASE64 or APNS_CERT_PATH to enable')
      }
    } catch (error) {
      logger.warn('⚠️ APNs Service initialization failed:', error.message)
      // Continue startup even if APNs fails
    }

    // Initialize stamp icons system
    try {
      console.log('🎨 Initializing stamp icons...')
      const result = await initializeStampIcons()
      if (result.success) {
        console.log(`✅ Stamp icons ready: ${result.svgCount} SVGs, ${result.previewCount} previews`)
      } else {
        console.warn('⚠️ Stamp icons initialization completed with warnings')
        if (result.errors.length > 0) {
          console.warn('   Errors:', result.errors.join(', '))
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize stamp icons:', error.message)
      console.warn('⚠️ Server will start without custom stamp icons (emoji stamps will still work)')
    }

    // Normalize manifest on startup (auto-migration)
    try {
      console.log('📄 [Startup] Normalizing icons manifest...')
      console.log('📄 [Startup] Calling ManifestService.readManifest()...')
      
      const manifest = await ManifestService.readManifest()
      
      console.log('📄 [Startup] Manifest received:', {
        version: manifest.version,
        iconsCount: (manifest.icons || []).length,
        categoriesCount: (manifest.categories || []).length,
        hasLastUpdated: !!manifest.lastUpdated,
        lastUpdated: manifest.lastUpdated
      })
      
      if (manifest.lastUpdated) {
        const updatedDate = new Date(manifest.lastUpdated).toLocaleString()
        console.log(`✅ [Startup] Icons manifest auto-migrated to v${manifest.version || 1} (${updatedDate})`)
      } else {
        console.log(`✅ [Startup] Icons manifest loaded: v${manifest.version || 1}, ${(manifest.icons || []).length} icons, ${(manifest.categories || []).length} categories`)
      }
    } catch (error) {
      console.error('❌ [Startup] Failed to normalize icons manifest:', error.message)
      console.error('❌ [Startup] Error stack:', error.stack)
      console.warn('⚠️ [Startup] Server will start but icon management may have issues')
    }

    // Then start the server
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

      // Initialize auto-engagement cron job
      if (process.env.DISABLE_AUTO_ENGAGEMENT !== 'true') {
        // Run daily at 9:00 AM UTC
        cron.schedule('0 9 * * *', async () => {
          logger.info('🔔 Running scheduled auto-engagement check...');
          try {
            await AutoEngagementService.runDailyCheck();
            logger.info('✅ Scheduled auto-engagement check completed');
          } catch (error) {
            logger.error('❌ Scheduled auto-engagement check failed', {
              error: error.message,
              stack: error.stack
            });
          }
        });

        logger.info('⏰ Auto-engagement cron job initialized (daily at 9:00 AM UTC)');
      } else {
        logger.info('⏸️ Auto-engagement cron job disabled (DISABLE_AUTO_ENGAGEMENT=true)');
      }
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully')
      server.close(() => {
        logger.info('Process terminated')
      })
    })
  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
})()