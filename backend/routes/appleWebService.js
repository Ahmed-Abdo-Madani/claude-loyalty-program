/**
 * Apple Web Service Protocol Routes
 *
 * Implements the 5 required REST endpoints for Apple Wallet pass updates:
 * 1. POST   /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber} - Register device
 * 2. GET    /v1/devices/{deviceLibraryId}/registrations/{passTypeId}?passesUpdatedSince={tag} - Get updated passes
 * 3. GET    /v1/passes/{passTypeId}/{serialNumber} - Get latest pass
 * 4. DELETE /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber} - Unregister device
 * 5. POST   /v1/log - Log errors from devices
 *
 * Official Documentation:
 * https://developer.apple.com/library/archive/documentation/PassKit/Reference/PassKit_WebService/WebService.html
 */

import express from 'express'
import logger from '../config/logger.js'
import metrics from '../utils/metrics.js'
import WalletPass from '../models/WalletPass.js'
import Device from '../models/Device.js'
import DeviceRegistration from '../models/DeviceRegistration.js'
import DeviceLog from '../models/DeviceLog.js'
import appleWalletController, { resolveApplePassType } from '../controllers/appleWalletController.js'
import { CustomerProgress, Offer, Business, Customer } from '../models/index.js'
import CardDesignService from '../services/CardDesignService.js'
import CustomerService from '../services/CustomerService.js'
import { createContentDispositionHeader } from '../utils/passGenerator.js'

const router = express.Router()

/**
 * Authentication Middleware
 * Verifies Authorization: ApplePass {authenticationToken} header
 */
function verifyAuthToken(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('ApplePass ')) {
    logger.warn('Missing or invalid Authorization header', {
      path: req.path,
      authHeader: authHeader ? 'present but invalid format' : 'missing'
    })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Extract token from "ApplePass {token}"
  const token = authHeader.substring(10)
  req.authToken = token

  next()
}

/**
 * ENDPOINT 1: Register Device for Pass Updates
 * POST /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 *
 * Called when user adds pass to Wallet app
 */
router.post('/v1/devices/:deviceLibraryId/registrations/:passTypeId/:serialNumber', verifyAuthToken, async (req, res) => {
  try {
    const { deviceLibraryId, passTypeId, serialNumber } = req.params
    const { pushToken } = req.body

    logger.info('📱 Device registration request', {
      deviceLibraryId,
      passTypeId,
      serialNumber,
      hasPushToken: !!pushToken
    })

    // Validate push token
    if (!pushToken) {
      logger.warn('❌ Missing push token in registration request')
      return res.status(400).json({ error: 'pushToken is required' })
    }

    // Find wallet pass by serial number
    const walletPass = await WalletPass.findBySerialNumber(serialNumber)

    if (!walletPass) {
      logger.warn('❌ Wallet pass not found', { serialNumber })
      return res.status(404).json({ error: 'Pass not found' })
    }

    // Verify authentication token
    const expectedAuthToken = await walletPass.getAuthenticationToken()
    if (req.authToken !== expectedAuthToken) {
      logger.warn('❌ Invalid authentication token', {
        serialNumber,
        providedToken: req.authToken.substring(0, 8) + '...',
        expectedToken: expectedAuthToken.substring(0, 8) + '...'
      })
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Find or create device
    const device = await Device.findOrCreateDevice(
      deviceLibraryId,
      pushToken,
      {
        user_agent: req.headers['user-agent'],
        registered_at: new Date().toISOString()
      }
    )

    // Register device for this pass
    const registration = await DeviceRegistration.registerDevice(device.id, walletPass.id)

    const isNewRegistration = registration.registered_at.getTime() === registration.last_checked_at.getTime()

    logger.info(`✅ Device ${isNewRegistration ? 'registered' : 'updated'}`, {
      deviceLibraryId,
      serialNumber,
      deviceId: device.id,
      registrationId: registration.id
    })

    // Return 201 for new registration, 200 for update
    return res.status(isNewRegistration ? 201 : 200).json({
      success: true,
      message: isNewRegistration ? 'Device registered' : 'Device updated'
    })

  } catch (error) {
    logger.error('❌ Device registration failed', {
      error: error.message,
      stack: error.stack,
      params: req.params
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * ENDPOINT 2: Get Serial Numbers for Updated Passes
 * GET /v1/devices/{deviceLibraryId}/registrations/{passTypeId}?passesUpdatedSince={tag}
 *
 * Device requests list of passes that have been updated since a given tag
 */
router.get('/v1/devices/:deviceLibraryId/registrations/:passTypeId', async (req, res) => {
  try {
    const { deviceLibraryId, passTypeId } = req.params
    const { passesUpdatedSince } = req.query

    logger.info('🔄 Device checking for updates', {
      deviceLibraryId,
      passTypeId,
      passesUpdatedSince: passesUpdatedSince || 'none'
    })

    // Find device by library identifier
    const device = await Device.findOne({
      where: { device_library_identifier: deviceLibraryId }
    })

    if (!device) {
      logger.warn('❌ Device not found', { deviceLibraryId })
      return res.status(404).json({ error: 'Device not found' })
    }

    // Update device last seen
    await device.updateLastSeen()

    // Get updated passes for this device
    const updatedSerialNumbers = await DeviceRegistration.getUpdatedPassesForDevice(
      device.id,
      passTypeId,
      passesUpdatedSince || '0'
    )

    // If no updates, return 204 No Content
    if (updatedSerialNumbers.length === 0) {
      logger.info('✅ No updates for device', { deviceLibraryId })
      return res.status(204).send()
    }

    // Return list of updated serial numbers with new lastUpdated tag
    const lastUpdated = Math.floor(Date.now() / 1000).toString()

    logger.info('✅ Returning updated passes', {
      deviceLibraryId,
      count: updatedSerialNumbers.length,
      serialNumbers: updatedSerialNumbers
    })

    return res.status(200).json({
      serialNumbers: updatedSerialNumbers,
      lastUpdated
    })

  } catch (error) {
    logger.error('❌ Failed to get updated passes', {
      error: error.message,
      stack: error.stack,
      params: req.params
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * ENDPOINT 3: Get Latest Version of Pass
 * GET /v1/passes/{passTypeId}/{serialNumber}
 *
 * Device requests the latest .pkpass file
 * CRITICAL: Must support If-Modified-Since AND If-None-Match headers and return 304 if unchanged
 */
router.get('/v1/passes/:passTypeId/:serialNumber', verifyAuthToken, async (req, res) => {
  try {
    const { passTypeId, serialNumber } = req.params
    const ifModifiedSince = req.headers['if-modified-since']
    const ifNoneMatch = req.headers['if-none-match']

    logger.info('📥 Device requesting latest pass', {
      passTypeId,
      serialNumber,
      ifModifiedSince: ifModifiedSince || 'none',
      ifNoneMatch: ifNoneMatch || 'none'
    })

    // Find wallet pass by serial number
    const walletPass = await WalletPass.findOne({
      where: { wallet_serial: serialNumber },
      include: [
        { model: CustomerProgress, as: 'progress' },
        { model: Customer, as: 'customer' },
        { model: Offer, as: 'offer' },
        { model: Business, as: 'business' }
      ]
    })

    if (!walletPass) {
      logger.warn('❌ Pass not found', { serialNumber })
      return res.status(404).json({ error: 'Pass not found' })
    }

    // Verify authentication token
    const expectedAuthToken = await walletPass.getAuthenticationToken()
    if (req.authToken !== expectedAuthToken) {
      logger.warn('❌ Invalid authentication token', {
        serialNumber,
        providedToken: req.authToken.substring(0, 8) + '...'
      })
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check If-None-Match header (ETag - more reliable than Last-Modified)
    if (ifNoneMatch && walletPass.manifest_etag) {
      // Remove weak indicator if present and compare
      const clientETag = ifNoneMatch.replace(/^W\//, '').trim()
      const serverETag = walletPass.manifest_etag.trim()
      
      if (clientETag === serverETag) {
        logger.info('✅ ETag match, returning 304 Not Modified', {
          serialNumber,
          etag: serverETag
        })
        res.setHeader('ETag', serverETag)
        if (walletPass.last_updated_at) {
          res.setHeader('Last-Modified', walletPass.last_updated_at.toUTCString())
        }
        return res.status(304).send()
      }
    }

    // Fallback: Check If-Modified-Since header (less reliable across servers/timezones)
    if (ifModifiedSince && walletPass.last_updated_at) {
      const modifiedSinceDate = new Date(ifModifiedSince)
      const lastUpdatedDate = new Date(walletPass.last_updated_at)

      if (lastUpdatedDate <= modifiedSinceDate) {
        logger.info('✅ Pass not modified (Last-Modified), returning 304', {
          serialNumber,
          lastUpdated: lastUpdatedDate.toISOString(),
          modifiedSince: modifiedSinceDate.toISOString()
        })
        if (walletPass.manifest_etag) {
          res.setHeader('ETag', walletPass.manifest_etag)
        }
        res.setHeader('Last-Modified', lastUpdatedDate.toUTCString())
        return res.status(304).send()
      }
    }

    // Regenerate pass with latest data
    logger.info('🔄 Regenerating pass with latest data...', { serialNumber })

    // Prepare customer data
    const customerData = {
      customerId: walletPass.customer_id,
      firstName: walletPass.customer?.first_name || 'Valued',
      lastName: walletPass.customer?.last_name || '',
      joinedDate: walletPass.created_at || new Date()
    }

    // Prepare offer data
    const offerData = {
      offerId: walletPass.offer_id,
      businessId: walletPass.business_id,
      businessName: walletPass.business?.business_name || walletPass.offer?.title,
      title: walletPass.offer?.title,
      description: walletPass.offer?.description,
      stampsRequired: walletPass.offer?.stamps_required || 10,
      rewardDescription: walletPass.offer?.reward_description || 'Free Item',
      branchName: walletPass.offer?.branch || 'All Locations'
    }

    // Prepare progress data
    const progressData = {
      stampsEarned: walletPass.progress?.current_stamps || 0
    }

    // Calculate tier data to ensure consistency with pushProgressUpdate()
    // This prevents the web service endpoint from overwriting correct tier data
    // Wrapped in try/catch to fall back gracefully on error instead of 500
    try {
      logger.info('🎯 Calculating tier data for customer:', walletPass.customer_id, 'offer:', walletPass.offer_id)
      const tierData = await CustomerService.calculateCustomerTier(walletPass.customer_id, walletPass.offer_id)
      
      if (tierData) {
        // Enrich progressData with tier information (matches appleWalletController.pushProgressUpdate pattern)
        progressData.rewardsClaimed = tierData.rewardsClaimed || 0
        progressData.tierData = tierData
        logger.info('✅ Tier data calculated:', {
          rewardsClaimed: progressData.rewardsClaimed,
          currentTier: tierData.currentTier?.name || 'None',
          tierIcon: tierData.currentTier?.icon || ''
        })
      } else {
        // Defensive fallback: set default values to prevent undefined errors
        progressData.rewardsClaimed = 0
        progressData.tierData = {
          currentTier: {
            name: 'New Member',
            icon: '👋',
            minRewards: 0,
            maxRewards: null
          },
          nextTier: null,
          rewardsClaimed: 0,
          rewardsToNextTier: null
        }
        logger.warn('⚠️ No tier data found, using defensive fallback')
      }

      logger.info('📊 Enriched progressData:', {
        stampsEarned: progressData.stampsEarned,
        rewardsClaimed: progressData.rewardsClaimed,
        tier: progressData.tierData?.currentTier?.name
      })
    } catch (error) {
      // Fall back to default tier on any error to prevent 500 responses
      logger.error('❌ Error calculating tier data:', error)
      progressData.rewardsClaimed = 0
      progressData.tierData = {
        currentTier: {
          name: 'New Member',
          icon: '👋',
          minRewards: 0,
          maxRewards: null
        },
        nextTier: null,
        rewardsClaimed: 0,
        rewardsToNextTier: null
      }
      logger.warn('⚠️ Using defensive fallback due to tier calculation error')
    }

    // Load card design if available
    let design = null
    try {
      design = await CardDesignService.getDesignByOffer(walletPass.offer_id)
    } catch (error) {
      logger.warn('⚠️ Failed to load card design:', error.message)
    }

    // CRITICAL: Use existing serial number AND authentication token from database (don't generate new ones!)
    const existingSerialNumber = walletPass.wallet_serial
    const existingAuthToken = walletPass.authentication_token
    logger.info('🔄 Using existing serial number:', existingSerialNumber)
    logger.info('🔄 Using existing auth token:', existingAuthToken?.substring(0, 8) + '...')

    // Generate pass data (pass.json) with SAME serial number and SAME auth token
    const passData = appleWalletController.createPassJson(customerData, offerData, progressData, design, existingSerialNumber, existingAuthToken)

    // Determine pass type before generating images
    const applePassType = resolveApplePassType(offerData)
    logger.info('🍎 Resolved Apple Wallet pass type:', applePassType)

    // Generate pass images with resolved pass type
    const images = await appleWalletController.generatePassImages(offerData, design, progressData, applePassType)

    // Create manifest
    const manifest = appleWalletController.createManifest(passData, images)

    // Compute ETag from manifest (more reliable than Last-Modified)
    const manifestETag = appleWalletController.computeManifestETag(manifest)
    logger.info('🔖 Computed manifest ETag:', manifestETag)

    // Sign manifest
    const applePassSigner = (await import('../utils/applePassSigner.js')).default
    const signature = await applePassSigner.signManifest(manifest)

    // Create .pkpass ZIP
    const pkpassBuffer = await appleWalletController.createPkpassZip(passData, manifest, signature, images)

    // Update pass data in database with current timestamp AND manifest ETag (single save operation)
    const updateTimestamp = new Date()
    await walletPass.updatePassData(passData, manifestETag)
    
    // Reload the record to get the updated last_updated_at value
    await walletPass.reload()

    // Set response headers with ETag (primary) and Last-Modified (fallback)
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
    res.setHeader('ETag', manifestETag)
    res.setHeader('Last-Modified', (walletPass.last_updated_at || updateTimestamp).toUTCString())
    res.setHeader('Cache-Control', 'private, must-revalidate')
    
    // Set Content-Disposition with sanitized filename (multi-level fallback)
    const passFilename = walletPass.offer?.title || walletPass.business?.business_name || 'loyalty-card'
    logger.debug('Setting Content-Disposition header', { 
      filename: passFilename,
      hasOfferTitle: !!walletPass.offer?.title,
      hasBusinessName: !!walletPass.business?.business_name
    })
    res.setHeader('Content-Disposition', createContentDispositionHeader(
      passFilename,
      { extension: 'pkpass', fallback: 'loyalty-card', maxLength: 50 }
    ))
    res.setHeader('Content-Length', pkpassBuffer.length)

    logger.info('✅ Pass regenerated and sent', {
      serialNumber,
      size: pkpassBuffer.length,
      etag: manifestETag
    })

    return res.send(pkpassBuffer)

  } catch (error) {
    logger.error('❌ Failed to get latest pass', {
      error: error.message,
      stack: error.stack,
      params: req.params
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * ENDPOINT 4: Unregister Device
 * DELETE /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 *
 * Called when user deletes pass from Wallet app
 */
router.delete('/v1/devices/:deviceLibraryId/registrations/:passTypeId/:serialNumber', verifyAuthToken, async (req, res) => {
  try {
    const { deviceLibraryId, passTypeId, serialNumber } = req.params

    logger.info('🗑️  Device unregistration request', {
      deviceLibraryId,
      passTypeId,
      serialNumber
    })

    // Find device
    const device = await Device.findOne({
      where: { device_library_identifier: deviceLibraryId }
    })

    if (!device) {
      logger.warn('❌ Device not found', { deviceLibraryId })
      return res.status(404).json({ error: 'Device not found' })
    }

    // Find wallet pass
    const walletPass = await WalletPass.findBySerialNumber(serialNumber)

    if (!walletPass) {
      logger.warn('❌ Pass not found', { serialNumber })
      return res.status(404).json({ error: 'Pass not found' })
    }

    // Verify authentication token
    const expectedAuthToken = await walletPass.getAuthenticationToken()
    if (req.authToken !== expectedAuthToken) {
      logger.warn('❌ Invalid authentication token', { serialNumber })
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Unregister device from pass
    const unregistered = await DeviceRegistration.unregisterDevice(device.id, walletPass.id)

    if (unregistered) {
      logger.info('✅ Device unregistered successfully', {
        deviceLibraryId,
        serialNumber
      })
      return res.status(200).json({ success: true, message: 'Device unregistered' })
    } else {
      logger.warn('⚠️ Registration not found', {
        deviceLibraryId,
        serialNumber
      })
      return res.status(404).json({ error: 'Registration not found' })
    }

  } catch (error) {
    logger.error('❌ Device unregistration failed', {
      error: error.message,
      stack: error.stack,
      params: req.params
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * ENDPOINT 5: Log Errors from Devices
 * POST /v1/log
 *
 * PassKit posts error logs to help debug issues
 * Enhanced with central logging, metrics, and database storage
 */
router.post('/v1/log', async (req, res) => {
  try {
    const { logs } = req.body

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'logs array is required' })
    }

    const userAgent = req.headers['user-agent']
    const ipAddress = req.ip || req.connection.remoteAddress

    // Increment metrics counter for monitoring/alerting
    metrics.increment('passkit.device_logs.received', logs.length)

    // Extract device library ID if present in logs
    let deviceId = null
    try {
      // Try to find device from user agent in device_info JSONB column
      // This is best-effort; logs may not always have device context
      if (userAgent) {
        const device = await Device.findOne({
          where: sequelize.where(
            sequelize.cast(sequelize.json('device_info.user_agent'), 'text'),
            userAgent
          ),
          order: [['last_seen_at', 'DESC']]
        })
        if (device) {
          deviceId = device.id
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not identify device for log', { error: error.message })
    }

    // Process and store each log entry
    const storedLogs = []
    for (const [index, logMessage] of logs.entries()) {
      // Forward to central logging with distinct label
      logger.warn('📱 [PASSKIT-DEVICE-LOG] Device error', {
        logIndex: index,
        message: logMessage,
        userAgent,
        ipAddress,
        deviceId,
        timestamp: new Date().toISOString()
      })

      // Store in database for analysis (if table exists)
      try {
        const deviceLog = await DeviceLog.logMessage(logMessage, {
          deviceId,
          logLevel: 'error',
          userAgent,
          ipAddress,
          metadata: {
            logIndex: index,
            totalLogs: logs.length,
            receivedAt: new Date().toISOString()
          }
        })
        storedLogs.push(deviceLog.id)
      } catch (dbError) {
        // Log database errors but don't fail the request
        // Table may not exist if migration hasn't been run yet
        if (dbError.message?.includes('relation "device_logs" does not exist')) {
          logger.debug('⚠️ device_logs table does not exist yet - run migration 20250127-add-device-logs-table.js')
        } else {
          logger.error('❌ Failed to store device log in database', {
            error: dbError.message,
            stack: dbError.stack,
            logMessage: logMessage.substring(0, 100)
          })
        }
        // Continue processing other logs even if DB storage fails
      }

      // Track specific error patterns for alerting
      if (logMessage.includes('signature')) {
        metrics.increment('passkit.errors.signature', 1)
      } else if (logMessage.includes('certificate')) {
        metrics.increment('passkit.errors.certificate', 1)
      } else if (logMessage.includes('manifest')) {
        metrics.increment('passkit.errors.manifest', 1)
      } else if (logMessage.includes('image')) {
        metrics.increment('passkit.errors.image', 1)
      } else {
        metrics.increment('passkit.errors.other', 1)
      }
    }

    // Check for alert thresholds
    const errorRate = metrics.getRate('passkit.device_logs.received', 60) // per second
    if (errorRate > 10) {
      logger.error('🚨 [ALERT] High PassKit error rate detected!', {
        rate: errorRate,
        threshold: 10,
        recentLogs: logs.slice(0, 3)
      })
      metrics.increment('passkit.alerts.high_error_rate', 1)
    }

    logger.info('✅ Logged device errors', {
      count: logs.length,
      stored: storedLogs.length,
      deviceId
    })

    return res.status(200).json({
      success: true,
      logsReceived: logs.length,
      logsStored: storedLogs.length
    })

  } catch (error) {
    logger.error('❌ Failed to log device errors', {
      error: error.message,
      stack: error.stack
    })
    metrics.increment('passkit.device_logs.processing_errors', 1)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
