import express from 'express'
import Branch from '../models/Branch.js'
import CustomerProgress from '../models/CustomerProgress.js'
import CustomerService from '../services/CustomerService.js'
import { requireBranchManagerAuth, generateManagerToken } from '../middleware/branchManagerAuth.js'
import PassLifecycleService from '../services/PassLifecycleService.js'
import WalletPass from '../models/WalletPass.js'
import Offer from '../models/Offer.js'
import logger from '../config/logger.js'
import { Op } from 'sequelize'

const router = express.Router()

// ============================================
// Rate Limiting for Login Endpoint
// ============================================
const loginAttempts = new Map()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// Periodic cleanup to prevent memory growth
setInterval(() => {
  const now = Date.now()
  let cleaned = 0

  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    logger.debug(`Login rate limiter cleanup: removed ${cleaned} expired entries`)
  }
}, 5 * 60 * 1000) // Clean every 5 minutes

/**
 * Middleware: Rate limit login attempts per branch
 */
const rateLimitLogin = (req, res, next) => {
  const branchId = req.body.branchId

  if (!branchId) {
    return next() // Let the route handler validate missing branchId
  }

  const now = Date.now()
  const attempts = loginAttempts.get(branchId)

  // Check if branch is currently locked out
  if (attempts) {
    // Reset if window expired
    if (now - attempts.firstAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(branchId)
    } else if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const remainingTime = Math.ceil((LOGIN_WINDOW_MS - (now - attempts.firstAttempt)) / 1000 / 60)
      logger.warn('Login rate limit exceeded', {
        branchId,
        attempts: attempts.count,
        remainingMinutes: remainingTime
      })

      return res.status(429).json({
        success: false,
        error: `Too many login attempts. Please try again in ${remainingTime} minutes.`
      })
    }
  }

  next()
}

/**
 * Track failed login attempt
 */
const trackFailedLogin = (branchId) => {
  const now = Date.now()
  const attempts = loginAttempts.get(branchId)

  if (!attempts) {
    loginAttempts.set(branchId, {
      count: 1,
      firstAttempt: now
    })
  } else {
    attempts.count++
  }
}

/**
 * Clear login attempts on successful login
 */
const clearLoginAttempts = (branchId) => {
  loginAttempts.delete(branchId)
}

/**
 * Route 1: Branch Manager Login (with rate limiting)
 * POST /api/branch-manager/login
 */
router.post('/login', rateLimitLogin, async (req, res) => {
  try {
    const { branchId, pin } = req.body

    if (!branchId || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID and PIN are required'
      })
    }

    // Find branch
    const branch = await Branch.findOne({
      where: { public_id: branchId }
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      })
    }

    // Verify manager login is enabled
    if (!branch.manager_pin_enabled) {
      return res.status(403).json({
        success: false,
        error: 'Manager login is disabled for this branch'
      })
    }

    // Verify PIN
    const isValidPin = await branch.verifyManagerPin(pin)

    if (!isValidPin) {
      logger.warn('Failed manager login attempt', { branchId })
      
      // Track failed attempt for rate limiting
      trackFailedLogin(branchId)
      
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN'
      })
    }

    // Clear login attempts on successful login
    clearLoginAttempts(branchId)

    // Generate manager token (8-hour expiration)
    const token = generateManagerToken(branch.public_id, branch.name)

    logger.info('Manager logged in successfully', {
      branchId: branch.public_id,
      branchName: branch.name
    })

    res.json({
      success: true,
      token,
      branch: {
        id: branch.public_id,
        name: branch.name,
        businessName: branch.business_name || 'Business'
      }
    })
  } catch (error) {
    logger.error('Manager login error:', error)
    res.status(500).json({
      success: false,
      error: 'Login failed'
    })
  }
})

/**
 * Route 2: Verify Manager Session
 * GET /api/branch-manager/verify
 */
router.get('/verify', requireBranchManagerAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      branch: {
        id: req.branch.public_id,
        name: req.branch.name,
        businessName: req.branch.business_name || 'Business'
      }
    })
  } catch (error) {
    logger.error('Manager verification error:', error)
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    })
  }
})

/**
 * Route 3: Scan Customer QR
 * POST /api/branch-manager/scan/:customerToken/:offerHash?
 * Reuses existing scan logic but with manager auth
 * Supports legacy token-only format (offerHash optional)
 */
router.post('/scan/:customerToken/:offerHash?', requireBranchManagerAuth, async (req, res) => {
  try {
    let customerToken, offerHash
    const businessId = req.branch.business_id

    // 🆕 DETECT QR CODE FORMAT (matching business.js logic)
    const firstParam = req.params.customerToken
    const secondParam = req.params.offerHash

    // Check if this is the new enhanced format (customerToken:offerHash in first param)
    if (!secondParam && firstParam.includes(':')) {
      // NEW FORMAT: Single parameter with embedded colon
      console.log('🔍 Branch Manager: Detected ENHANCED QR code format (customerToken:offerHash)')
      const parts = firstParam.split(':')
      customerToken = parts[0]
      offerHash = parts[1]
    } else if (secondParam) {
      // OLD FORMAT: Two separate parameters
      console.log('🔍 Branch Manager: Detected LEGACY QR code format (separate params)')
      customerToken = firstParam
      offerHash = secondParam
    } else if (!secondParam && !firstParam.includes(':')) {
      // LEGACY TOKEN-ONLY FORMAT: Base64 token without offer hash
      console.log('🔍 Branch Manager: Detected LEGACY token-only QR format (pre-enhanced passes)')
      customerToken = firstParam
      offerHash = null
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code format. Expected either "customerToken:offerHash" or separate parameters'
      })
    }

    console.log('🔍 Branch Manager scan attempt:', { 
      customerToken: customerToken.substring(0, 20) + '...', 
      offerHash, 
      businessId 
    })

    // Comment 1: Decode customer token and validate properly
    const tokenData = CustomerService.decodeCustomerToken(customerToken)
    
    if (!tokenData.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer token'
      })
    }

    // Comment 1: Verify business ID matches
    if (tokenData.businessId !== req.branch.business_id) {
      return res.status(403).json({
        success: false,
        error: 'Customer token does not match branch business'
      })
    }

    // Comment 1: Extract customerId for subsequent uses
    const customerId = tokenData.customerId

    // 🆕 HANDLE LEGACY TOKEN-ONLY FORMAT (auto-select offer if null)
    let targetOffer
    if (offerHash === null) {
      console.log('🔍 Branch Manager: Legacy token-only format - auto-selecting offer')
      targetOffer = await CustomerService.findOfferForBusiness(businessId)
      
      if (!targetOffer) {
        return res.status(400).json({
          success: false,
          error: 'Could not determine offer for this QR code. Please scan a newer QR code.'
        })
      }
      
      console.log(`✅ Branch Manager: Auto-selected offer ${targetOffer.public_id}`)
    } else {
      // Comment 4: Use helper method instead of manual query and loop
      logger.debug('Finding offer by hash for business:', req.branch.business_id)
      targetOffer = await CustomerService.findOfferByHash(offerHash, req.branch.business_id)

      if (!targetOffer) {
        logger.warn('No matching offer found for hash')
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code or offer not available'
        })
      }
    }

    // Extract offer ID from the matched offer
    const offerId = targetOffer.public_id

    // Comment 2: Find or create customer progress (don't reject new customers)
    let progress = await CustomerProgress.findOne({
      where: {
        customer_id: customerId,
        offer_id: offerId
      }
    })

    if (!progress) {
      logger.info('Creating new customer progress for manager scan', {
        customerId,
        offerId,
        businessId: req.branch.business_id
      })
      progress = await CustomerService.createCustomerProgress(customerId, offerId, req.branch.business_id)
    }

    // Award stamp
    await progress.addStamp()

    // Primary Fix: Reload progress with associations after addStamp()
    // This ensures wallet controllers receive complete data without needing to fetch it themselves
    await progress.reload({
      include: [
        { association: 'offer', required: false },
        { association: 'business', required: false },
        { association: 'customer', required: false }
      ]
    })

    logger.info('Manager scanned customer', {
      branchId: req.branchId,
      customerId,
      offerId,
      currentStamps: progress.current_stamps,
      maxStamps: progress.max_stamps,
      completed: progress.is_completed,
      hasOfferAssociation: !!progress.offer,
      hasBusinessAssociation: !!progress.business
    })

    // Secondary Fix: Convert Sequelize instance to plain object
    // This normalizes field names and ensures consistent data format
    const progressData = progress.toJSON()
    logger.info('📤 Normalized progress data for wallet updates:', {
      rewardsClaimed: progressData.rewards_claimed,
      currentStamps: progressData.current_stamps,
      isCompleted: progressData.is_completed,
      hasOffer: !!progressData.offer,
      hasBusiness: !!progressData.business
    })

    // Comment 5: Push wallet progress updates (best-effort, non-fatal)
    const walletUpdates = []
    try {
      // Import wallet controllers and service
      const WalletPassService = (await import('../services/WalletPassService.js')).default
      const appleWalletController = (await import('../controllers/appleWalletController.js')).default
      const googleWalletController = (await import('../controllers/realGoogleWalletController.js')).default

      // Get customer's active wallet passes for this offer
      const activeWallets = await WalletPassService.getCustomerWallets(customerId, offerId)

      if (activeWallets.length === 0) {
        logger.debug('No wallet passes found for customer - skipping wallet updates')
      } else {
        logger.debug(`Found ${activeWallets.length} wallet pass(es) for customer`)

        // Update each wallet type the customer has
        for (const wallet of activeWallets) {
          try {
            if (wallet.wallet_type === 'apple') {
              const appleUpdate = await appleWalletController.pushProgressUpdate(
                customerId,
                offerId,
                progressData  // Secondary Fix: Pass plain object instead of Sequelize instance
              )
              walletUpdates.push({
                platform: 'Apple Wallet',
                walletPassId: wallet.id,
                ...appleUpdate
              })

              // Quaternary Fix: Log the update result
              logger.info('✅ Apple Wallet update result:', {
                success: appleUpdate.success,
                serialNumber: appleUpdate.serialNumber,
                updatedAt: appleUpdate.updated
              })

              // Tertiary Fix: Remove redundant updateLastPush() for Apple Wallet
              // Apple's pushProgressUpdate() already updates last_updated_at and last_updated_tag
              // via updatePassData() method, so this call is redundant
            } else if (wallet.wallet_type === 'google') {
              const googleUpdate = await googleWalletController.pushProgressUpdate(
                customerId,
                offerId,
                progressData  // Secondary Fix: Pass plain object instead of Sequelize instance
              )
              walletUpdates.push({
                platform: 'Google Wallet',
                walletPassId: wallet.id,
                ...googleUpdate
              })

              // Quaternary Fix: Log the update result
              logger.info('✅ Google Wallet update result:', {
                success: googleUpdate.success,
                objectId: googleUpdate.objectId,
                updatedAt: googleUpdate.updated
              })

              // Tertiary Fix: Keep updateLastPush() for Google Wallet
              // Google's pushProgressUpdate() does NOT update the local database,
              // so this is the only database update for Google Wallet passes
              await wallet.updateLastPush()
              logger.info('✅ Updated Google Wallet last_updated_at timestamp')
            }
          } catch (singleWalletError) {
            logger.warn(`Failed to update ${wallet.wallet_type} wallet:`, singleWalletError.message)
            walletUpdates.push({
              platform: `${wallet.wallet_type} Wallet`,
              walletPassId: wallet.id,
              success: false,
              error: singleWalletError.message
            })
          }
        }

        // Quaternary Fix: Add summary logging after wallet updates
        const successfulUpdates = walletUpdates.filter(u => u.success !== false).length
        const failedUpdates = walletUpdates.length - successfulUpdates
        logger.info('📊 Wallet updates summary:', {
          total: walletUpdates.length,
          successful: successfulUpdates,
          failed: failedUpdates,
          platforms: walletUpdates.map(u => u.platform)
        })
      }
    } catch (walletError) {
      logger.warn('Failed to push wallet updates (non-fatal):', walletError.message)
    }

    // Comment 1: Verify response fields are strings before returning
    res.json({
      success: true,
      customerId: String(customerId),       // Ensure string type
      offerId: String(offerId),              // Ensure string type
      rewardEarned: progress.is_completed,
      progress: {
        currentStamps: progress.current_stamps,
        maxStamps: progress.max_stamps,
        isCompleted: progress.is_completed,
        rewardsClaimed: progress.rewards_claimed
      },
      walletUpdates: walletUpdates.length > 0 ? walletUpdates : undefined
    })
  } catch (error) {
    logger.error('Manager scan error:', error)
    res.status(500).json({
      success: false,
      error: 'Scan failed'
    })
  }
})

/**
 * Route 4: Confirm Prize Given
 * POST /api/branch-manager/confirm-prize/:customerId/:offerId
 */
router.post('/confirm-prize/:customerId/:offerId', requireBranchManagerAuth, async (req, res) => {
  try {
    const { customerId, offerId } = req.params
    const { notes } = req.body

    // Find customer progress
    const progress = await CustomerProgress.findOne({
      where: {
        customer_id: customerId,
        offer_id: offerId
      }
    })

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Customer progress not found'
      })
    }

    if (!progress.is_completed) {
      return res.status(400).json({
        success: false,
        error: 'Progress not completed'
      })
    }

    // Calculate tier BEFORE claimReward to detect upgrades
    const tierBeforeClaim = await CustomerService.calculateCustomerTier(customerId, offerId)
    const tierNameBefore = tierBeforeClaim?.currentTier?.name || null

    // Call claimReward() to auto-reset stamps - use req.branch.public_id
    await progress.claimReward(req.branch.public_id, notes)

    // CRITICAL FIX: Refetch progress from database to get fresh values
    // After claimReward(), the in-memory progress object still has old values
    // Reload the instance to get the updated rewards_claimed, current_stamps, is_completed
    await progress.reload()

    logger.info('🔄 Stamps reset to 0, new cycle started')
    logger.info('📊 Total completions (fresh):', progress.rewards_claimed)
    logger.info('📊 Fresh progress after reset:', {
      rewardsClaimed: progress.rewards_claimed,
      currentStamps: progress.current_stamps,
      isCompleted: progress.is_completed
    })

    // Optional Enhancement: Convert Sequelize instance to plain object before passing to wallet controllers
    // This makes the data flow more explicit and ensures consistent field naming
    const progressData = progress.toJSON()
    logger.info('📤 Normalized progress data for wallet updates:', {
      rewardsClaimed: progressData.rewards_claimed,
      currentStamps: progressData.current_stamps,
      isCompleted: progressData.is_completed
    })

    // Calculate customer tier AFTER claimReward (uses fresh rewards_claimed from database)
    const tierData = await CustomerService.calculateCustomerTier(customerId, offerId)
    const tierNameAfter = tierData?.currentTier?.name || null
    
    // Detect tier upgrade by comparing tier names
    const tierUpgrade = tierNameBefore !== null && tierNameAfter !== null && tierNameBefore !== tierNameAfter
    
    if (tierData) {
      logger.info('🏆 Customer tier after claim:', tierData)
      if (tierUpgrade) {
        logger.info('🎉 Tier upgraded!', { from: tierNameBefore, to: tierNameAfter })
      }
    }

    // Trigger immediate pass updates (Apple and Google Wallet)
    try {
      // Import controllers dynamically to avoid circular dependencies
      const { default: appleWalletController } = await import('../controllers/appleWalletController.js')
      const { default: googleWalletController } = await import('../controllers/realGoogleWalletController.js')

      // Push updates to wallet passes (using plain object for consistency)
      await appleWalletController.pushProgressUpdate(customerId, offerId, progressData)
      await googleWalletController.pushProgressUpdate(customerId, offerId, progressData)

      logger.info('✅ Wallet passes updated with reset progress and tier')
    } catch (walletError) {
      logger.error('⚠️ Failed to update wallet passes:', walletError)
      // Non-critical error, continue with response
    }

    logger.info('Prize confirmed by manager', {
      branchId: req.branch.public_id,
      customerId,
      offerId,
      notes,
      newCycleStarted: true,
      totalCompletions: progress.rewards_claimed
    })

    res.json({
      success: true,
      progress: {
        currentStamps: progress.current_stamps,
        maxStamps: progress.max_stamps,
        isCompleted: progress.is_completed,
        rewardsClaimed: progress.rewards_claimed,
        rewardFulfilledAt: progress.reward_fulfilled_at,
        stampsEarned: progress.current_stamps,
        stampsRequired: progress.max_stamps,
        status: progress.is_completed ? 'completed' : 'active'
      },
      tier: tierData,
      tierUpgrade: tierUpgrade,
      newCycleStarted: true,
      totalCompletions: progress.rewards_claimed
    })
  } catch (error) {
    logger.error('Prize confirmation error:', error)
    res.status(500).json({
      success: false,
      error: 'Prize confirmation failed'
    })
  }
})

/**
 * Route 5: Get Today's Scan Stats
 * GET /api/branch-manager/stats/today
 */
router.get('/stats/today', requireBranchManagerAuth, async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Count unique customers who scanned today (filtered by business)
    const scansToday = await CustomerProgress.count({
      include: [{
        model: Offer,
        as: 'offer',
        where: { business_id: req.branch.business_id },
        attributes: []
      }],
      where: {
        last_scan_date: {
          [Op.gte]: today
        }
      },
      distinct: true,
      col: 'customer_id'
    })

    // Count rewards earned today (filtered by business)
    const rewardsEarned = await CustomerProgress.count({
      include: [{
        model: Offer,
        as: 'offer',
        where: { business_id: req.branch.business_id },
        attributes: []
      }],
      where: {
        completed_at: {
          [Op.gte]: today
        }
      }
    })

    // Unique customers (same as scansToday for consistency)
    const uniqueCustomers = scansToday

    res.json({
      success: true,
      scansToday,
      rewardsEarned,
      uniqueCustomers
    })
  } catch (error) {
    logger.error('Stats retrieval error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats'
    })
  }
})

export default router
