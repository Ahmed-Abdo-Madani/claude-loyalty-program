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
import WalletPass from '../models/WalletPass.js'
import Device from '../models/Device.js'
import DeviceRegistration from '../models/DeviceRegistration.js'
import appleWalletController from '../controllers/appleWalletController.js'
import { CustomerProgress, Offer, Business, Customer } from '../models/index.js'
import CardDesignService from '../services/CardDesignService.js'

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
 * CRITICAL: Must support If-Modified-Since header and return 304 if unchanged
 */
router.get('/v1/passes/:passTypeId/:serialNumber', verifyAuthToken, async (req, res) => {
  try {
    const { passTypeId, serialNumber } = req.params
    const ifModifiedSince = req.headers['if-modified-since']

    logger.info('📥 Device requesting latest pass', {
      passTypeId,
      serialNumber,
      ifModifiedSince: ifModifiedSince || 'none'
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

    // Check If-Modified-Since header
    if (ifModifiedSince && walletPass.last_updated_at) {
      const modifiedSinceDate = new Date(ifModifiedSince)
      const lastUpdatedDate = new Date(walletPass.last_updated_at)

      if (lastUpdatedDate <= modifiedSinceDate) {
        logger.info('✅ Pass not modified, returning 304', {
          serialNumber,
          lastUpdated: lastUpdatedDate.toISOString(),
          modifiedSince: modifiedSinceDate.toISOString()
        })
        return res.status(304).send()
      }
    }

    // Regenerate pass with latest data
    logger.info('🔄 Regenerating pass with latest data...', { serialNumber })

    // Prepare customer data
    const customerData = {
      customerId: walletPass.customer_id,
      firstName: walletPass.customer?.first_name || 'Valued',
      lastName: walletPass.customer?.last_name || 'Customer',
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

    // Generate pass images
    const images = await appleWalletController.generatePassImages(offerData, design, progressData)

    // Create manifest
    const manifest = appleWalletController.createManifest(passData, images)

    // Sign manifest
    const applePassSigner = (await import('../utils/applePassSigner.js')).default
    const signature = await applePassSigner.signManifest(manifest)

    // Create .pkpass ZIP
    const pkpassBuffer = await appleWalletController.createPkpassZip(passData, manifest, signature, images)

    // Update pass data in database
    await walletPass.updatePassData(passData)

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
    res.setHeader('Last-Modified', walletPass.last_updated_at.toUTCString())
    res.setHeader('Content-Disposition', `attachment; filename="${walletPass.offer?.title || 'loyalty-card'}.pkpass"`)
    res.setHeader('Content-Length', pkpassBuffer.length)

    logger.info('✅ Pass regenerated and sent', {
      serialNumber,
      size: pkpassBuffer.length
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
 */
router.post('/v1/log', async (req, res) => {
  try {
    const { logs } = req.body

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'logs array is required' })
    }

    // Log each error from device
    logs.forEach((logMessage, index) => {
      logger.warn('📱 PassKit device log', {
        logIndex: index,
        message: logMessage,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      })
    })

    logger.info('✅ Logged device errors', { count: logs.length })

    return res.status(200).json({ success: true })

  } catch (error) {
    logger.error('❌ Failed to log device errors', {
      error: error.message,
      stack: error.stack
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
