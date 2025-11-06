import { GoogleAuth } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import CardDesignService from '../services/CardDesignService.js'
import WalletPass from '../models/WalletPass.js'
import logger from '../config/logger.js'

class RealGoogleWalletController {
  constructor() {
    // Load Google Cloud credentials from environment variables or file
    this.isGoogleWalletEnabled = this.initializeGoogleWallet()

    if (!this.isGoogleWalletEnabled) {
      console.log('⚠️ Google Wallet: Service disabled - credentials not available')
      return
    }

    this.issuerId = process.env.GOOGLE_ISSUER_ID || '3388000000023017940'
    this.projectId = process.env.GOOGLE_PROJECT_ID || 'madna-platform'

    // Base URLs for Google Wallet Objects API
    this.baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1'

    // Bind methods
    this.generatePass = this.generatePass.bind(this)
    this.savePass = this.savePass.bind(this)
    this.pushProgressUpdate = this.pushProgressUpdate.bind(this)
  }

  initializeGoogleWallet() {
    try {
      // Try to load from environment variables (production)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        console.log('✅ Google Wallet: Loading credentials from environment variables')
        this.credentials = {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }

        // Initialize Google Auth with environment credentials
        this.auth = new GoogleAuth({
          credentials: this.credentials,
          scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
        })

        return true
      }

      // Try to load from file (development)
      const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials/madna-platform-d8bf716cd142.json'
      const credentialsPath = path.join(process.cwd(), credentialsFile)

      if (fs.existsSync(credentialsPath)) {
        console.log('✅ Google Wallet: Loading credentials from file')
        this.credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
        this.credentialsPath = credentialsPath

        // Initialize Google Auth with file
        this.auth = new GoogleAuth({
          keyFile: this.credentialsPath,
          scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
        })

        return true
      }

      // No credentials available
      console.log('⚠️ Google Wallet: No credentials available (neither environment variables nor file)')
      return false

    } catch (error) {
      console.error('❌ Google Wallet: Failed to initialize credentials:', error.message)
      return false
    }
  }

  async generatePass(req, res) {
    try {
      // Check if Google Wallet is enabled
      if (!this.isGoogleWalletEnabled) {
        return res.status(503).json({
          error: 'Google Wallet service unavailable',
          message: 'Google Wallet credentials not configured',
          mock: true
      })
    }

    let { customerData, offerData, progressData } = req.body

    // Debug logging for stamp values (keeping this for Google Wallet debugging)
    console.log('🔍 Google Wallet: Generating pass', {
      customer: customerData.customerId,
      offer: offerData.offerId,
      stamps_required: offerData?.stamps_required
    })      // Validate required data
      if (!customerData?.customerId || !offerData?.offerId || !offerData?.businessName) {
        return res.status(400).json({
          error: 'Missing required data',
          required: ['customerData.customerId', 'offerData.offerId', 'offerData.businessName']
        })
      }

      console.log('📱 Google Wallet: Pass generation started', {
        customer: customerData.customerId,
        offer: offerData.offerId,
        business: offerData.businessName
      })

      // Get authenticated client
      const authClient = await this.auth.getClient()

      // FIX 6: Normalize progress data for consistency with pushProgressUpdate
      let normalizedProgress
      if (progressData && (progressData.constructor.name === 'CustomerProgress' || typeof progressData.toJSON === 'function')) {
        // It's a Sequelize model instance - convert to plain object
        console.log('🔄 Detected Sequelize instance in generatePass, normalizing to camelCase...')
        const plainData = progressData.toJSON ? progressData.toJSON() : progressData.get({ plain: true })
        normalizedProgress = {
          currentStamps: plainData.current_stamps,
          maxStamps: plainData.max_stamps,
          rewardsClaimed: plainData.rewards_claimed,
          isCompleted: plainData.is_completed
        }
        console.log('✅ Normalized progress data for generatePass:', normalizedProgress)
      } else {
        // Already a plain object - ensure camelCase fields exist with defensive default
        const pd = progressData || {}
        normalizedProgress = {
          currentStamps: pd.currentStamps ?? pd.current_stamps ?? 0,
          maxStamps: pd.maxStamps ?? pd.max_stamps ?? 10,
          rewardsClaimed: pd.rewardsClaimed ?? pd.rewards_claimed ?? 0,
          isCompleted: pd.isCompleted ?? pd.is_completed ?? false
        }
        console.log('✅ Using plain object with camelCase normalization for generatePass:', normalizedProgress)
      }

      // Replace progressData with normalized version
      progressData = normalizedProgress

      // Calculate customer tier
      const CustomerService = (await import('../services/CustomerService.js')).default
      const tierData = await CustomerService.calculateCustomerTier(customerData.customerId, offerData.offerId)
      if (tierData) {
        console.log('🏆 Customer tier:', tierData)
        // Add tier data to progress data
        progressData.tierData = tierData
        progressData.rewardsClaimed = tierData.rewardsClaimed
        console.log('✅ Updated rewardsClaimed from tier data in generatePass:', progressData.rewardsClaimed)
      } else {
        console.warn('⚠️ Tier calculation returned null in generatePass, using normalized data')
        // Ensure rewardsClaimed is set even when tier calculation fails
        progressData.rewardsClaimed = progressData.rewardsClaimed ?? 0
        console.log('✅ Using fallback rewardsClaimed in generatePass:', progressData.rewardsClaimed)
      }

      // Step 1: Create or update loyalty class
      const loyaltyClass = await this.createOrUpdateLoyaltyClass(authClient, offerData)

      // Step 2: Create loyalty object (customer's specific card)
      const loyaltyObject = await this.createLoyaltyObject(authClient, customerData, offerData, progressData)

      // Step 3: Generate signed JWT for Save to Google Wallet
      const jwt = this.generateSaveToWalletJWT(loyaltyObject)

      // Step 4: Create save URL
      const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`

      // ✨ Step 5: Record wallet pass in database (CRITICAL - don't skip!)
      // Create wallet pass record in database
      // Note: Only pass Google-specific fields (wallet_object_id, device_info)
      // Apple-specific fields (authentication_token, last_updated_tag, manifest_etag, pass_data_json)
      // are intentionally omitted and will be set to NULL by WalletPassService
      const WalletPassService = (await import('../services/WalletPassService.js')).default
      const walletPass = await WalletPassService.createWalletPass(
        customerData.customerId,
        offerData.offerId,
        'google',
        {
          wallet_object_id: loyaltyObject.id,
          device_info: {
            user_agent: req.headers['user-agent'],
            generated_at: new Date().toISOString()
          }
        }
      )
      console.log('✨ Google Wallet pass recorded in database successfully')

      // Verify the wallet pass was created with correct field values
      if (walletPass.last_updated_tag !== null) {
        logger.warn('⚠️ Unexpected: last_updated_tag is not NULL for Google Wallet pass', {
          passId: walletPass.id,
          last_updated_tag: walletPass.last_updated_tag
        })
      }
      if (walletPass.authentication_token !== null) {
        logger.warn('⚠️ Unexpected: authentication_token is not NULL for Google Wallet pass', {
          passId: walletPass.id,
          authentication_token: 'present (masked)'
        })
      }

      console.log('✅ Google Wallet: Pass generated successfully')

      res.json({
        success: true,
        saveUrl,
        jwt,
        classId: loyaltyClass.id,
        objectId: loyaltyObject.id,
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      })

    } catch (error) {
      console.error('❌ Real Google Wallet generation failed:', error)

      // Check if error is related to last_updated_tag constraint
      const isConstraintError = error.message?.includes('last_updated_tag') ||
                               error.message?.includes('not-null constraint') ||
                               error.original?.column === 'last_updated_tag'

      const errorResponse = {
        error: 'Failed to generate Google Wallet pass',
        message: error.message,
        details: error.response?.data || error.stack
      }

      // Add helpful information if it's a schema issue
      if (isConstraintError) {
        errorResponse.hint = 'Database schema issue detected. The last_updated_tag column may have an incorrect NOT NULL constraint.'
        errorResponse.fix_available = true
        errorResponse.migration = 'Run migration: backend/migrations/20250125-fix-last-updated-tag-nullable.js'
        errorResponse.documentation = 'See PRODUCTION-DEPLOYMENT.md for details'
      }

      res.status(500).json(errorResponse)
    }
  }

  /**
   * Generate progress text with star emojis for Google Wallet display
   * Phase 4: Align preview with Google Wallet capabilities
   * @param {number} earned - Stamps earned
   * @param {number} required - Stamps required
   * @returns {string} Formatted progress text with stars
   */
  generateProgressText(earned, required) {
    const filledStars = '⭐'.repeat(earned)
    const emptyStars = '☆'.repeat(required - earned)
    const stars = filledStars + emptyStars
    const remaining = required - earned

    if (remaining === 0) {
      return `🎉 Reward Ready!\n${stars}\nYou've collected all ${required} stamps!`
    } else if (remaining === 1) {
      return `${stars}\n${earned} of ${required} stamps collected\nOnly 1 more stamp to go! 🎯`
    } else {
      return `${stars}\n${earned} of ${required} stamps collected\n${remaining} more stamps until reward! 🎁`
    }
  }

  async createOrUpdateLoyaltyClass(authClient, offerData) {
    const classId = `${this.issuerId}.${String(offerData.offerId).replace(/[^a-zA-Z0-9]/g, '_')}`

    // Phase 4: Load card design if available (with backward compatibility)
    let design = null
    try {
      design = await CardDesignService.getDesignByOffer(offerData.offerId)
      if (design) {
        console.log('🎨 Using custom card design for Google Wallet class:', offerData.offerId)
        console.log('🎨 Design values:', {
          logo_url: design.logo_url,
          logo_google_url: design.logo_google_url,
          background_color: design.background_color,
          hero_image_url: design.hero_image_url
        })
      } else {
        console.log('📝 No custom design found, using defaults for:', offerData.offerId)
      }
    } catch (error) {
      console.warn('⚠️ Failed to load card design, using defaults:', error.message)
    }

    // Calculate logo URI with triple fallback
    const logoUri = design?.logo_google_url || design?.logo_url || 'https://img.icons8.com/color/200/loyalty-card.png'
    const backgroundColor = design?.background_color || '#3B82F6'

    console.log('🔧 Google Wallet class config:', {
      logoUri,
      backgroundColor,
      hasHeroImage: !!design?.hero_image_url
    })

    const loyaltyClass = {
      id: classId,
      issuerName: offerData.businessName,
      programName: offerData.title,

      // Program logo - Use custom logo or default
      programLogo: {
        sourceUri: {
          uri: logoUri
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: `${offerData.businessName} Logo`
          }
        }
      },

      // Visual styling - Use custom colors or defaults
      hexBackgroundColor: backgroundColor,

      // Hero image (if available)
      ...(design?.hero_image_url && {
        heroImage: {
          sourceUri: {
            uri: design.hero_image_url
          },
          contentDescription: {
            defaultValue: {
              language: 'en-US',
              value: `${offerData.businessName} Banner`
            }
          }
        }
      }),

      // Reward tier information
      rewardsTier: 'Standard',
      rewardsTierLabel: 'Member',

      // Program details
      programDetails: offerData.description || offerData.title,

      // Review status (required)
      reviewStatus: 'UNDER_REVIEW',

      // Enable push notifications for this class
      hasUsers: true,

      // Contact information
      homepageUri: {
        uri: process.env.BASE_URL || 'https://loyalty-platform.com',
        description: 'Business Website'
      }
    }

    try {
      // Get access token properly
      const accessToken = await authClient.getAccessToken()

      // Try to get existing class first
      const response = await fetch(`${this.baseUrl}/loyaltyClass/${classId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return await response.json()
      }

      // Create new class
      const createResponse = await fetch(`${this.baseUrl}/loyaltyClass`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loyaltyClass)
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(`Failed to create loyalty class: ${JSON.stringify(error)}`)
      }

      return await createResponse.json()

    } catch (error) {
      console.error('Failed to create/update loyalty class:', error)
      throw error
    }
  }

  async createLoyaltyObject(authClient, customerData, offerData, progressData) {
    // Validate customer ID format
    if (!customerData.customerId || !customerData.customerId.startsWith('cust_')) {
      console.error(`❌ Invalid customer ID format: ${customerData.customerId}. Expected cust_* format.`)
      throw new Error(`Invalid customer ID format: ${customerData.customerId}. Google Wallet requires cust_* format.`)
    }

    // Validate required data
    if (!offerData.stamps_required) {
      throw new Error(`stamps_required is missing from offerData: ${JSON.stringify(offerData)}`)
    }

    // Fetch existing pass to determine state and expiration
    const existingPass = await WalletPass.findOne({
      where: {
        customer_id: customerData.customerId,
        offer_id: offerData.offerId,
        wallet_type: 'google'
      }
    })

    const objectId = `${this.issuerId}.${customerData.customerId}_${offerData.offerId}`.replace(/[^a-zA-Z0-9._\-]/g, '_')
    const classId = `${this.issuerId}.${String(offerData.offerId).replace(/[^a-zA-Z0-9\-]/g, '_')}`

    const loyaltyObject = {
      id: objectId,
      classId: classId,
      state: existingPass && existingPass.pass_status === 'completed' ? 'COMPLETED' : 
             existingPass && (existingPass.pass_status === 'expired' || existingPass.pass_status === 'revoked') ? 'EXPIRED' : 
             'ACTIVE',

      // Account information
      accountName: `${customerData.firstName} ${customerData.lastName}`,
      accountId: customerData.customerId,

      // Loyalty points - Enhanced with star emoji and completion count (Phase 4)
      // Comment 2: Coerce rewardsClaimed to number before assigning
      loyaltyPoints: {
        balance: {
          int: (() => {
            const val = Number(progressData.rewardsClaimed)
            return (Number.isFinite(val) && val >= 0) ? val : 0
          })()
        },
        label: 'Rewards Earned',
        // Add localized labels for international support
        localizedLabel: {
          defaultValue: {
            language: 'en-US',
            value: 'Rewards Earned'
          },
          translatedValues: [
            {
              language: 'ar',
              value: 'المكافآت المكتسبة'
            }
          ]
        }
      },

      // Text modules for card content - Enhanced with tier info (Phase 4)
      textModulesData: [
        {
          id: 'progress_visual',
          header: 'Your Progress',
          body: this.generateProgressText(progressData.currentStamps ?? progressData.current_stamps ?? 0, offerData.stamps_required)
        },
        ...(progressData.tierData && progressData.tierData.currentTier ? [{
          id: 'tier',
          header: 'Member Status',
          body: `${progressData.tierData.currentTier.icon} ${progressData.tierData.currentTier.name}`
        }] : []),
        ...(progressData.tierData && !progressData.tierData.isTopTier && progressData.tierData.nextTier ? [{
          id: 'next_tier',
          header: 'Next Tier',
          body: `${progressData.tierData.rewardsToNextTier} more rewards for ${progressData.tierData.nextTier.name}`
        }] : []),
        {
          id: 'reward',
          header: '🎁 Reward',
          body: offerData.rewardDescription || 'Free Item'
        },
        {
          id: 'location',
          header: '📍 Valid At',
          body: offerData.branchName || 'All Locations'
        }
      ]
    }

    // Determine barcode type based on offer preference
    // Default to QR_CODE if preference is not set for backward compatibility
    let barcodePreference = offerData.barcode_preference || 'QR_CODE'
    let barcodeType = barcodePreference === 'PDF417' ? 'PDF_417' : 'QR_CODE'
    
    // Calculate barcode value to check size
    const barcodeValue = JSON.stringify({
      customerId: customerData.customerId,
      offerId: offerData.offerId,
      businessId: offerData.businessId,
      timestamp: new Date().toISOString()
    })
    
    // PDF417 size guard: PDF417 typically supports ~1850 alphanumeric characters
    // QR codes support up to ~4296 alphanumeric characters
    const PDF417_MAX_LENGTH = 1850
    if (barcodePreference === 'PDF417' && barcodeValue.length > PDF417_MAX_LENGTH) {
      logger.warn('⚠️ Google Wallet: PDF417 barcode payload exceeds safe limit, falling back to QR_CODE', {
        messageLength: barcodeValue.length,
        maxLength: PDF417_MAX_LENGTH,
        exceededBy: barcodeValue.length - PDF417_MAX_LENGTH
      })
      barcodePreference = 'QR_CODE'
      barcodeType = 'QR_CODE'
    }
    
    logger.info('📊 Google Wallet: Barcode format selection:', { 
      preference: barcodePreference, 
      googleType: barcodeType,
      valueLength: barcodeValue.length
    })

    // Add barcode for POS scanning
    loyaltyObject.barcode = {
      type: barcodeType,
      value: barcodeValue,
      alternateText: `Customer: ${customerData.customerId}`
    }

    // Links module for actions
    loyaltyObject.linksModuleData = {
      uris: [
        {
          uri: `${process.env.BASE_URL}/customer/account/${customerData.customerId}`,
          description: 'View Account',
          id: 'account_link'
        }
      ]
    }

    // Enable push notifications for field updates
    loyaltyObject.notifyPreference = 'notifyOnUpdate'

    // Add validTimeInterval if pass has scheduled expiration
    if (existingPass && existingPass.scheduled_expiration_at) {
      loyaltyObject.validTimeInterval = {
        end: {
          date: new Date(existingPass.scheduled_expiration_at).toISOString().split('T')[0] // YYYY-MM-DD format
        }
      }
      console.log('⏰ Pass expiration scheduled:', loyaltyObject.validTimeInterval.end.date)
    }

    try {
      // Get access token properly
      const accessToken = await authClient.getAccessToken()

      // First, try to get existing object
      const getResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (getResponse.ok) {
        // Object exists, update it
        const updateResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loyaltyObject)
        })

        if (!updateResponse.ok) {
          const error = await updateResponse.json()
          throw new Error(`Failed to update loyalty object: ${JSON.stringify(error)}`)
        }

        return await updateResponse.json()
      }

      // Object doesn't exist, create new one
      const response = await fetch(`${this.baseUrl}/loyaltyObject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loyaltyObject)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to create loyalty object: ${JSON.stringify(error)}`)
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to create/update loyalty object:', error)
      throw error
    }
  }

  generateSaveToWalletJWT(loyaltyObject) {
    // Create claims for the JWT with explicit timing
    const now = Math.floor(Date.now() / 1000)
    const claims = {
      iss: this.credentials.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: now,
      exp: now + 3600, // Explicit 1 hour expiration
      payload: {
        loyaltyObjects: [loyaltyObject]
      }
    }

    // Sign the JWT (don't use expiresIn since we set exp manually)
    return jwt.sign(claims, this.credentials.private_key, {
      algorithm: 'RS256'
    })
  }

  async savePass(req, res) {
    try {
      // Check if Google Wallet is enabled
      if (!this.isGoogleWalletEnabled) {
        return res.status(503).json({
          error: 'Google Wallet service unavailable',
          message: 'Google Wallet credentials not configured'
        })
      }

      const { token } = req.params

      // Verify the JWT token
      const decoded = jwt.verify(token, this.credentials.private_key, { algorithms: ['RS256'] })

      // Redirect to Google Wallet
      res.redirect(`https://pay.google.com/gp/v/save/${token}`)

    } catch (error) {
      console.error('Failed to process Google Wallet save:', error)
      res.status(400).json({
        error: 'Invalid or expired token',
        message: error.message
      })
    }
  }

  async updateLoyaltyObject(objectId, updateData) {
    try {
      const authClient = await this.auth.getClient()
      const accessToken = await authClient.getAccessToken()

      // Step 1: Update the loyalty object
      const response = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to update loyalty object: ${JSON.stringify(error)}`)
      }

      const updatedObject = await response.json()

      // Step 2: Send push notification to user's device
      await this.sendPushNotification(objectId, authClient)

      return updatedObject

    } catch (error) {
      console.error('Failed to update loyalty object:', error)
      throw error
    }
  }

  // Send push notification to update Google Wallet pass on user's device
  async sendPushNotification(objectId, authClient) {
    try {
      console.log('🔔 Google Wallet: Sending push notification for', objectId)

      const accessToken = await authClient.getAccessToken()

      // Method 1: Try the Google Wallet Push API with TEXT_AND_NOTIFY
      try {
        const pushResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}/addMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              messageType: 'TEXT_AND_NOTIFY',
              header: 'Loyalty Progress Updated',
              body: 'Your stamp collection has been updated!',
              actionUri: {
                uri: process.env.BASE_URL || 'http://localhost:3001'
              }
            }
          })
        })

        if (pushResponse.ok) {
          console.log('✅ Google Wallet: Push notification sent via addMessage API')
          return {
            success: true,
            method: 'addMessage'
          }
        } else {
          const error = await pushResponse.text()
          console.warn('⚠️ Google Wallet: addMessage API failed:', error)
        }
      } catch (addMessageError) {
        console.warn('⚠️ Google Wallet: addMessage API not available:', addMessageError.message)
      }

      // Method 2: Field Update with Notify Preference (for loyaltyPoints.balance)
      // This is the preferred method for loyalty point updates according to Google Wallet API
      console.log('🔄 Google Wallet: Attempting field update notification...')
      return {
        success: true,
        method: 'fieldUpdate',
        message: 'Field update will trigger notification via notifyPreference'
      }

    } catch (error) {
      console.warn('⚠️ Google Wallet: Push notification error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send custom message notification to Google Wallet pass
   * Used by WalletNotificationService for offers, reminders, birthdays, etc.
   *
   * @param {string} objectId - Google Wallet object ID
   * @param {string} header - Message header/title
   * @param {string} body - Message body text
   * @returns {Object} Result with success status
   */
  async sendCustomMessage(objectId, header, body) {
    try {
      // Check if Google Wallet is enabled
      if (!this.isGoogleWalletEnabled) {
        return {
          success: false,
          error: 'Google Wallet service not available',
          message: 'Google Wallet credentials not configured'
        }
      }

      console.log('📨 Google Wallet: Sending custom message', {
        objectId,
        header: header.substring(0, 50),
        body: body.substring(0, 50)
      })

      const authClient = await this.auth.getClient()
      const accessToken = await authClient.getAccessToken()

      // First verify object exists
      const checkResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!checkResponse.ok) {
        const error = await checkResponse.text()
        console.error('❌ Google Wallet object not found:', {
          status: checkResponse.status,
          objectId,
          error
        })

        return {
          success: false,
          error: 'Wallet pass not found',
          message: `Google Wallet object ${objectId} does not exist`,
          status: checkResponse.status
        }
      }

      // Send notification using addMessage API
      const pushResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}/addMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            messageType: 'TEXT_AND_NOTIFY',
            header: header,
            body: body,
            actionUri: {
              uri: process.env.BASE_URL || 'http://localhost:3001'
            }
          }
        })
      })

      if (!pushResponse.ok) {
        const error = await pushResponse.text()

        // Check if it's a rate limit error
        if (error.includes('QuotaExceededException')) {
          const dailyLimit = parseInt(process.env.WALLET_NOTIFICATION_DAILY_LIMIT || '10')
          console.warn('⚠️ Google Wallet: Rate limit exceeded for', objectId)
          return {
            success: false,
            error: 'Rate limit exceeded',
            message: `Wallet notification rate limit reached (${dailyLimit} notifications per pass per 24 hours)`,
            quota_exceeded: true,
            daily_limit: dailyLimit
          }
        }

        console.error('❌ Google Wallet: Failed to send custom message:', error)
        return {
          success: false,
          error: 'Failed to send notification',
          message: error,
          status: pushResponse.status
        }
      }

      console.log('✅ Google Wallet: Custom message sent successfully')

      return {
        success: true,
        objectId,
        sent_at: new Date().toISOString(),
        message: {
          header,
          body
        }
      }

    } catch (error) {
      console.error('❌ Google Wallet: sendCustomMessage error:', error)
      return {
        success: false,
        error: 'Failed to send custom message',
        message: error.message
      }
    }
  }

  // Push updates to Google Wallet when progress changes
  async pushProgressUpdate(customerId, offerId, progressData) {
    try {
      // Validate customer ID format
      if (!customerId || !customerId.startsWith('cust_')) {
        console.error(`❌ Invalid customer ID format for wallet update: ${customerId}. Expected cust_* format.`)
        return {
          success: false,
          error: `Invalid customer ID format: ${customerId}. Google Wallet requires cust_* format.`
        }
      }

      // Comment 3: Guard against missing or invalid progressData
      if (!progressData) {
        console.warn('⚠️ progressData is missing, fetching fresh data from database...')
        const CustomerProgress = (await import('../models/CustomerProgress.js')).default
        const freshProgress = await CustomerProgress.findOne({
          where: {
            customer_id: customerId,
            offer_id: offerId
          }
        })

        if (!freshProgress) {
          console.error('❌ Progress not found in database for customer:', customerId, 'offer:', offerId)
          return {
            success: false,
            error: 'Progress data not found'
          }
        }

        console.log('✅ Fetched fresh progress from database')
        progressData = freshProgress.toJSON()
      }

      // FIX 1: Normalize Progress Data - Convert Sequelize instance to plain object with camelCase
      let normalizedProgress
      if (progressData && (progressData.constructor.name === 'CustomerProgress' || typeof progressData.toJSON === 'function')) {
        // It's a Sequelize model instance - convert to plain object
        console.log('🔄 Detected Sequelize instance, normalizing to camelCase...')
        const plainData = progressData.toJSON ? progressData.toJSON() : progressData.get({ plain: true })
        normalizedProgress = {
          currentStamps: plainData.current_stamps,
          maxStamps: plainData.max_stamps,
          rewardsClaimed: plainData.rewards_claimed,
          isCompleted: plainData.is_completed
        }
        console.log('✅ Normalized progress data:', normalizedProgress)
      } else {
        // Already a plain object - ensure camelCase fields exist
        normalizedProgress = {
          currentStamps: progressData.currentStamps ?? progressData.current_stamps,
          maxStamps: progressData.maxStamps ?? progressData.max_stamps,
          rewardsClaimed: progressData.rewardsClaimed ?? progressData.rewards_claimed,
          isCompleted: progressData.isCompleted ?? progressData.is_completed
        }
        console.log('✅ Using plain object with camelCase normalization:', normalizedProgress)
      }

      // Replace progressData with normalized version for consistent usage
      progressData = normalizedProgress

      // Check if Google Wallet is enabled
      if (!this.isGoogleWalletEnabled) {
        console.log('⚠️ Google Wallet: Service disabled, skipping push update')
        return {
          success: false,
          disabled: true,
          message: 'Google Wallet service not available'
        }
      }

      console.log('📱 Google Wallet: Pushing update', {
        customer: customerId,
        stamps: `${progressData.currentStamps}/${progressData.maxStamps}`
      })

      // FIX 2: Enhanced defensive logging with correct camelCase field names
      console.log('🔍 Progress data before tier calculation:', {
        currentStamps: progressData.currentStamps,
        rewardsClaimed: progressData.rewardsClaimed,
        isCompleted: progressData.isCompleted
      })

      // Calculate customer tier
      const CustomerService = (await import('../services/CustomerService.js')).default
      const tierData = await CustomerService.calculateCustomerTier(customerId, offerId)
      
      // FIX 3: Defensive fallback for tier calculation
      if (tierData) {
        console.log('🏆 Customer tier calculated successfully:', tierData)
        // Add tier data to progress data for display in wallet
        progressData.tierData = tierData
        progressData.rewardsClaimed = tierData.rewardsClaimed
        console.log('✅ Updated rewardsClaimed from tier data:', progressData.rewardsClaimed)
      } else {
        console.warn('⚠️ Tier calculation returned null, using normalized progress data')
        // Ensure rewardsClaimed is set even when tier calculation fails
        progressData.rewardsClaimed = progressData.rewardsClaimed ?? 0
        console.log('✅ Using fallback rewardsClaimed:', progressData.rewardsClaimed)
      }

      // Verify rewardsClaimed is properly set (defensive check)
      if (progressData.rewardsClaimed === undefined) {
        console.error('❌ CRITICAL: rewardsClaimed is undefined after normalization and tier calculation')
        progressData.rewardsClaimed = 0
      }

      console.log('📊 Final progress data after tier calculation:', {
        currentStamps: progressData.currentStamps,
        rewardsClaimed: progressData.rewardsClaimed,
        isCompleted: progressData.isCompleted,
        hasTierData: !!progressData.tierData
      })

      // Create object ID using same format as creation - CRITICAL FIX: Use identical regex pattern
      const objectId = `${this.issuerId}.${customerId}_${offerId}`.replace(/[^a-zA-Z0-9._\-]/g, '_')

      // First verify object exists before attempting update
      const authClient = await this.auth.getClient()
      const accessToken = await authClient.getAccessToken()
      
      const checkResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!checkResponse.ok) {
        const error = await checkResponse.text()
        console.error('❌ Object verification failed:', {
          status: checkResponse.status,
          statusText: checkResponse.statusText,
          error: error,
          objectId: objectId
        })
        
        // If object doesn't exist, we need to create it first
        if (checkResponse.status === 404) {
          console.log('🔧 Object not found, attempting to create it first...')
          
          try {
            // Get offer data to create the missing object
            const { Offer } = await import('../models/index.js')
            const offer = await Offer.findByPk(offerId)
            
            if (!offer) {
              throw new Error(`Offer ${offerId} not found in database`)
            }

            // Create the missing loyalty object
            const customerData = {
              customerId: customerId,
              firstName: 'Customer', // Default values for scanning
              lastName: 'User'
            }
            
            const offerData = {
              offerId: offerId,  // Use secure public ID, not integer id
              businessName: offer.business?.business_name || 'Business',
              title: offer.title,
              description: offer.description,
              stamps_required: offer.stamps_required
            }
            
            const defaultProgressData = {
              current_stamps: 0,
              max_stamps: offer.stamps_required,
              is_completed: false
            }

            console.log('🔨 Creating missing loyalty object with data:', {
              customerData,
              offerData: { ...offerData, businessName: offerData.businessName.substring(0, 20) + '...' }
            })

            // Create loyalty class first
            await this.createOrUpdateLoyaltyClass(authClient, offerData)
            
            // Create loyalty object
            const createdObject = await this.createLoyaltyObject(authClient, customerData, offerData, defaultProgressData)
            
            console.log('✅ Missing object created successfully:', createdObject.id)
            
            // Now proceed with the update using the actual progress data
            
          } catch (createError) {
            console.error('❌ Failed to create missing object:', createError.message)
            throw new Error(`Object ${objectId} not found and creation failed: ${createError.message}`)
          }
        } else {
          throw new Error(`Object ${objectId} verification failed. Status: ${checkResponse.status} - ${error}`)
        }
      } else {
        console.log('✅ Object exists, proceeding with update...')
      }

      // Prepare update data for Google Wallet - MAP FIELD NAMES CORRECTLY
      // FIX 4: Add defensive logging before creating update payload
      console.log('🔍 Preparing update payload with values:', {
        rewardsClaimed: progressData.rewardsClaimed,
        currentStamps: progressData.currentStamps,
        maxStamps: progressData.maxStamps,
        hasTierData: !!progressData.tierData
      })

      // Comment 2: Coerce rewardsClaimed to number before sending to Google Wallet
      let completions = Number(progressData.rewardsClaimed)
      if (!Number.isFinite(completions) || completions < 0) {
        console.error('❌ WARNING: Invalid completions value, defaulting to 0:', {
          original: progressData.rewardsClaimed,
          coerced: completions
        })
        completions = 0
      }

      const updateData = {
        loyaltyPoints: {
          balance: {
            int: completions  // Use coerced numeric value
          },
          label: 'Rewards Earned'
        },
        textModulesData: [
          {
            id: 'progress_visual',
            header: 'Progress',
            body: `${progressData.currentStamps} of ${progressData.maxStamps} stamps`
          }
        ]
      }

      console.log('📤 Update payload being sent to Google Wallet:', {
        loyaltyPointsBalance: updateData.loyaltyPoints.balance.int,
        progressVisual: updateData.textModulesData[0].body
      })

      // Add tier information if available
      if (progressData.tierData) {
        // Coerce tier rewardsClaimed to number as well
        const tierCompletions = Number(progressData.tierData.rewardsClaimed)
        if (Number.isFinite(tierCompletions) && tierCompletions >= 0) {
          updateData.loyaltyPoints.balance.int = tierCompletions
        }
        updateData.loyaltyPoints.balance.int = progressData.tierData.rewardsClaimed || 0
        
        updateData.textModulesData.push({
          id: 'tier',
          header: 'Loyalty Tier',
          body: `${progressData.tierData.currentTier.name} (${progressData.tierData.rewardsClaimed} completions)`
        })

        if (progressData.tierData.nextTier) {
          updateData.textModulesData.push({
            id: 'next_tier',
            header: 'Next Tier',
            body: `${progressData.tierData.rewardsToNextTier} more rewards to reach ${progressData.tierData.nextTier.name}`
          })
        }
      }

      // If reward is earned, update the status
      if (progressData.isCompleted) {
        updateData.state = 'COMPLETED'
        updateData.textModulesData.push({
          id: 'reward_status',
          header: '🎉 Reward Earned!',
          body: 'Visit the business to claim your free item'
        })
      }

      console.log('📦 Complete update payload:', JSON.stringify(updateData, null, 2))

      // Update the loyalty object in Google Wallet
      const result = await this.updateLoyaltyObject(objectId, updateData)
      
      console.log('📱 Update response received:', result)

      // FIX 5: Enhanced verification logging
      console.log('🔍 Verifying update success...')
      const verifyResponse = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (verifyResponse.ok) {
        const updatedObject = await verifyResponse.json()
        const currentBalance = updatedObject.loyaltyPoints?.balance?.int
        // Comment 2: Use the coerced completions value for verification
        const expectedBalance = completions
        
        console.log('🔍 Verification results:', {
          expected: expectedBalance,
          actual: currentBalance,
          matches: currentBalance === expectedBalance
        })

        // Verify tier information if it was included
        if (progressData.tierData) {
          const tierModule = updatedObject.textModulesData?.find(m => m.id === 'tier')
          console.log('🔍 Tier verification:', {
            tierIncludedInUpdate: true,
            tierModuleFound: !!tierModule,
            tierModuleBody: tierModule?.body,
            expectedTier: progressData.tierData.currentTier.name
          })

          if (!tierModule) {
            console.error('❌ WARNING: Tier module was sent but not found in updated object')
          }
        }

        // Log complete response for debugging
        console.log('📋 Complete verification response:', {
          loyaltyPoints: updatedObject.loyaltyPoints,
          textModulesData: updatedObject.textModulesData,
          state: updatedObject.state
        })

        if (currentBalance !== expectedBalance) {
          console.error('❌ VERIFICATION FAILED: Balance mismatch!', {
            sentValue: expectedBalance,
            receivedValue: currentBalance,
            updatePayload: updateData,
            fullResponse: updatedObject
          })
        } else {
          console.log('✅ Verification passed: Balance matches expected value')
        }
      } else {
        console.warn('⚠️ Could not verify update success')
      }

      console.log('✅ Google Wallet push notification sent successfully')

      return {
        success: true,
        objectId,
        updated: new Date().toISOString(),
        progress: progressData,
        result,
        pushNotification: await this.sendPushNotification(objectId, authClient)
      }
    } catch (error) {
      console.error('❌ Google Wallet push update failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Expire a Google Wallet pass by setting state to EXPIRED
   * Called by PassLifecycleService when pass expires
   */
  async expirePass(objectId) {
    try {
      const accessToken = await this.auth.getAccessToken()

      const updateData = {
        state: 'EXPIRED'
      }

      const response = await fetch(`${this.baseUrl}/loyaltyObject/${objectId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to expire pass: ${error}`)
      }

      console.log(`✅ Google Wallet pass ${objectId} marked as EXPIRED`)

      return {
        success: true,
        objectId,
        expired: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Failed to expire Google Wallet pass:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default new RealGoogleWalletController()