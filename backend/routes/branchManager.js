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
 * POST /api/branch-manager/scan/:customerToken/:offerHash
 * Reuses existing scan logic but with manager auth
 */
router.post('/scan/:customerToken/:offerHash', requireBranchManagerAuth, async (req, res) => {
  try {
    const { customerToken, offerHash } = req.params

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

    // Comment 4: Use helper method instead of manual query and loop
    logger.debug('Finding offer by hash for business:', req.branch.business_id)
    const targetOffer = await CustomerService.findOfferByHash(offerHash, req.branch.business_id)

    if (!targetOffer) {
      logger.warn('No matching offer found for hash')
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code or offer not available'
      })
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

    logger.info('Manager scanned customer', {
      branchId: req.branchId,
      customerId,
      offerId,
      currentStamps: progress.current_stamps,
      maxStamps: progress.max_stamps,
      completed: progress.is_completed
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
                progress
              )
              walletUpdates.push({
                platform: 'Apple Wallet',
                walletPassId: wallet.id,
                ...appleUpdate
              })

              // Update last push timestamp
              await wallet.updateLastPush()
            } else if (wallet.wallet_type === 'google') {
              const googleUpdate = await googleWalletController.pushProgressUpdate(
                customerId,
                offerId,
                progress
              )
              walletUpdates.push({
                platform: 'Google Wallet',
                walletPassId: wallet.id,
                ...googleUpdate
              })

              // Update last push timestamp
              await wallet.updateLastPush()
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

    // Call claimReward() to auto-reset stamps - use req.branch.public_id
    await progress.claimReward(req.branch.public_id, notes)

    logger.info('🔄 Stamps reset to 0, new cycle started')
    logger.info('📊 Total completions:', progress.rewards_claimed)

    // Calculate customer tier
    const tierData = await CustomerService.calculateCustomerTier(customerId, offerId)
    if (tierData) {
      logger.info('🏆 Customer tier:', tierData)
    }

    // Trigger immediate pass updates (Apple and Google Wallet)
    try {
      // Import controllers dynamically to avoid circular dependencies
      const { default: appleWalletController } = await import('../controllers/appleWalletController.js')
      const { default: googleWalletController } = await import('../controllers/realGoogleWalletController.js')

      // Push updates to wallet passes
      await appleWalletController.pushProgressUpdate(customerId, offerId, progress)
      await googleWalletController.pushProgressUpdate(customerId, offerId, progress)

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
