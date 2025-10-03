import express from 'express'
import AppleWalletController from '../controllers/appleWalletController.js'
import RealGoogleWalletController from '../controllers/realGoogleWalletController.js'

const router = express.Router()

// Apple Wallet routes
router.post('/apple/generate', AppleWalletController.generatePass)
router.get('/apple/download/:passId', AppleWalletController.downloadPass)
router.post('/apple/update/:passId', AppleWalletController.updatePass)

// Google Wallet routes - always use real API
router.post('/google/generate', RealGoogleWalletController.generatePass)
router.get('/google/save/:token', RealGoogleWalletController.savePass)

// Test endpoint for Google Wallet push notifications
router.post('/google/test-push', async (req, res) => {
  try {
    const { customerId, offerId, progressData } = req.body

    console.log('🧪 Testing Google Wallet push notification:', {
      customer: customerId,
      offer: offerId,
      progress: `${progressData.current_stamps}/${progressData.max_stamps}`
    })

    const result = await RealGoogleWalletController.pushProgressUpdate(
      customerId,
      offerId,
      progressData
    )

    res.json({
      success: true,
      message: 'Push notification test completed',
      result: result
    })

  } catch (error) {
    console.error('❌ Push notification test failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Additional test endpoint for the test files
router.post('/test-push', async (req, res) => {
  try {
    const { customerId, offerId, progressData } = req.body

    console.log('🧪 Testing Google Wallet push notification (via test route):', {
      customer: customerId,
      offer: offerId,
      progress: `${progressData.current_stamps}/${progressData.max_stamps}`
    })

    const result = await RealGoogleWalletController.pushProgressUpdate(
      customerId,
      offerId,
      progressData
    )

    res.json({
      success: result.success,
      message: 'Push notification test completed',
      result: result
    })

  } catch (error) {
    console.error('❌ Push notification test failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Image serving for passes
router.get('/images/:type/:businessId', (req, res) => {
  const { type, businessId } = req.params

  // For demo purposes, return placeholder images
  // In production, this would serve actual business logos/images
  const placeholderImages = {
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    strip: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    hero: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }

  res.json({
    url: placeholderImages[type] || placeholderImages.logo,
    businessId,
    type
  })
})

export default router