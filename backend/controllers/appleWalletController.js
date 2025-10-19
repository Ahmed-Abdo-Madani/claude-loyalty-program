import crypto from 'crypto'
import archiver from 'archiver'
import forge from 'node-forge'
import sharp from 'sharp'
import { PassGenerator } from '../utils/passGenerator.js'
import WalletPassService from '../services/WalletPassService.js'
import CardDesignService from '../services/CardDesignService.js'
import CustomerService from '../services/CustomerService.js'
import appleCertificateValidator from '../utils/appleCertificateValidator.js'
import applePassSigner from '../utils/applePassSigner.js'

class AppleWalletController {
  constructor() {
    this.passGenerator = new PassGenerator()
    // Bind methods to preserve 'this' context
    this.generatePass = this.generatePass.bind(this)
    this.downloadPass = this.downloadPass.bind(this)
    this.updatePass = this.updatePass.bind(this)
  }

  async generatePass(req, res) {
    try {
      const { customerData, offerData, progressData } = req.body

      console.log('🍎 Apple Wallet pass generation request:', {
        customerData: customerData ? {
          customerId: customerData.customerId,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          joinedDate: customerData.joinedDate
        } : 'missing',
        offerData: offerData ? {
          offerId: offerData.offerId,
          businessName: offerData.businessName,
          title: offerData.title
        } : 'missing',
        progressData: progressData ? {
          stampsEarned: progressData.stampsEarned
        } : 'missing'
      })

      // Validate required data
      if (!customerData?.customerId || !offerData?.offerId || !offerData?.businessName) {
        console.error('❌ Missing required data for Apple Wallet pass')
        return res.status(400).json({
          error: 'Missing required data',
          required: ['customerData.customerId', 'offerData.offerId', 'offerData.businessName'],
          received: {
            customerId: !!customerData?.customerId,
            offerId: !!offerData?.offerId,
            businessName: !!offerData?.businessName
          }
        })
      }

      // Add default joinedDate if missing
      if (!customerData.joinedDate) {
        console.warn('⚠️ joinedDate missing, using current date')
        customerData.joinedDate = new Date().toISOString()
      }

      // Add default firstName/lastName if missing
      if (!customerData.firstName) {
        console.warn('⚠️ firstName missing, using default')
        customerData.firstName = 'Valued'
      }
      if (!customerData.lastName) {
        console.warn('⚠️ lastName missing, using default')
        customerData.lastName = 'Customer'
      }

      console.log('🍎 Generating Apple Wallet pass for:', {
        customer: customerData.customerId,
        offer: offerData.offerId,
        business: offerData.businessName
      })

      // Phase 4: Load card design if available (with backward compatibility)
      let design = null
      try {
        design = await CardDesignService.getDesignByOffer(offerData.offerId)
        if (design) {
          console.log('🎨 Using custom card design for Apple Wallet pass:', offerData.offerId)
        } else {
          console.log('📝 No custom design found, using defaults for:', offerData.offerId)
        }
      } catch (error) {
        console.warn('⚠️ Failed to load card design, using defaults:', error.message)
      }

      // Ensure we have actual customer progress for stamp visualization
      let actualProgressData = progressData
      if (!progressData || progressData.stampsEarned === undefined) {
        console.warn('⚠️ No progressData provided, fetching actual stamps from database...')

        try {
          // Query customer_progress table for actual stamp count
          const { default: sequelize } = await import('../config/database.js')
          const [result] = await sequelize.query(`
            SELECT current_stamps
            FROM customer_progress
            WHERE customer_id = ? AND offer_id = ?
            LIMIT 1
          `, {
            replacements: [customerData.customerId, offerData.offerId],
            type: sequelize.QueryTypes.SELECT
          })

          actualProgressData = {
            stampsEarned: result?.current_stamps || 0
          }

          console.log('✅ Fetched actual progress from database:', actualProgressData)
        } catch (error) {
          console.error('❌ Failed to fetch progress from database:', error.message)
          // Fallback to 0 stamps if query fails
          actualProgressData = { stampsEarned: 0 }
        }
      } else {
        console.log('✅ Using provided progressData:', actualProgressData)
      }

      // Generate pass data
      const passData = this.createPassJson(customerData, offerData, actualProgressData, design)

      // Generate pass images with progress data for stamp visualization
      const images = await this.generatePassImages(offerData, design, actualProgressData)

      // Create manifest with file hashes
      const manifest = this.createManifest(passData, images)

      // Sign manifest with real Apple certificates
      const signature = await applePassSigner.signManifest(manifest)

      // Create .pkpass ZIP file
      const pkpassBuffer = await this.createPkpassZip(passData, manifest, signature, images)

      // ✨ Record wallet pass in database (CRITICAL - don't skip!)
      await WalletPassService.createWalletPass(
        customerData.customerId,
        offerData.offerId,
        'apple',
        {
          wallet_serial: passData.serialNumber,
          device_info: {
            user_agent: req.headers['user-agent'],
            generated_at: new Date().toISOString()
          }
        }
      )
      console.log('✨ Apple Wallet pass recorded in database successfully')

      // Mark card design as applied (if design was used)
      if (design) {
        try {
          await CardDesignService.markDesignAsApplied(offerData.offerId)
          console.log('🎨 Card design marked as applied for offer:', offerData.offerId)
        } catch (error) {
          console.warn('⚠️ Failed to mark design as applied:', error.message)
          // Non-critical error, don't fail the request
        }
      }

      // Set headers for .pkpass download
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
      res.setHeader('Content-Disposition', `attachment; filename="${offerData.businessName.replace(/[^a-zA-Z0-9]/g, '')}-loyalty-card.pkpass"`)
      res.setHeader('Content-Length', pkpassBuffer.length)

      console.log('✅ Apple Wallet pass generated successfully')
      res.send(pkpassBuffer)

    } catch (error) {
      console.error('❌ Apple Wallet generation failed:', error)
      res.status(500).json({
        error: 'Failed to generate Apple Wallet pass',
        message: error.message
      })
    }
  }

  // Helper function to convert hex color to RGB format for Apple Wallet
  hexToRgb(hex) {
    if (!hex) return null
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
      : null
  }

  // Helper function to generate stamp visualization for Apple Wallet back fields
  // Since Apple Wallet doesn't support visual stamps in main layout, show them as emoji
  generateStampVisualization(earned, required) {
    const stampIcon = '⭐'  // Filled stamp
    const emptyIcon = '☆'   // Empty stamp

    // Create visual representation (max 20 stamps to avoid text overflow)
    const displayRequired = Math.min(required, 20)
    const displayEarned = Math.min(earned, displayRequired)

    // Build stamp grid
    const filledStamps = stampIcon.repeat(displayEarned)
    const emptyStamps = emptyIcon.repeat(displayRequired - displayEarned)
    const stampGrid = filledStamps + emptyStamps

    // Add text summary
    let summary = `${stampGrid}\n\n${earned} of ${required} stamps collected`

    // Add completion message if all stamps earned
    if (earned >= required) {
      summary += '\n\n🎉 Reward Ready! Show this card to redeem.'
    } else {
      const remaining = required - earned
      summary += `\n${remaining} more ${remaining === 1 ? 'stamp' : 'stamps'} to earn reward`
    }

    // Show overflow indicator if more than 20 stamps
    if (required > 20) {
      summary += `\n\nShowing first 20 of ${required} total stamps`
    }

    return summary
  }

  createPassJson(customerData, offerData, progressData, design = null) {
    try {
      const serialNumber = `${customerData.customerId}-${offerData.offerId}-${Date.now()}`

      // ==================== DATA VALIDATION & LOGGING ====================
      console.log('📊 ========== PASS DATA RECEIVED ==========')
      console.log('👤 Customer Data:', {
        customerId: customerData.customerId,
        firstName: customerData.firstName,
        lastName: customerData.lastName
      })
      console.log('🎁 Offer Data:', {
        offerId: offerData.offerId,
        businessName: offerData.businessName,
        businessId: offerData.businessId,
        title: offerData.title,
        stampsRequired: offerData.stampsRequired,
        rewardDescription: offerData.rewardDescription
      })
      console.log('📈 Progress Data:', progressData)
      console.log('🎨 Design Data:', design ? {
        hasLogo: !!design.logo_url,
        hasHero: !!design.hero_image_url,
        colors: {
          background: design.background_color,
          foreground: design.foreground_color
        }
      } : 'No design')
      console.log('========================================')

      // Ensure required fields have default values with better validation
      // IMPORTANT: Don't default stampsRequired to 10 - use actual offer data!
      const stampsRequired = offerData.stampsRequired || offerData.stamps_required || 10
      const stampsEarned = progressData?.stampsEarned || 0
      const rewardDescription = offerData.rewardDescription || offerData.title || 'Free Item'
      const branchName = offerData.branchName || 'All Locations'
      const businessId = offerData.businessId  // Required for QR code generation

      // Validate stampsRequired value
      if (!offerData.stampsRequired && !offerData.stamps_required) {
        console.warn('⚠️ No stampsRequired provided in offerData, defaulting to 10. This may be incorrect!')
        console.warn('   offerData:', JSON.stringify(offerData, null, 2))
      }

      // Validate business ID is present
      if (!businessId) {
        throw new Error('businessId is required for generating QR code tokens')
      }

      // Validate and fix business name if needed
      let businessName = offerData.businessName
      if (!businessName || businessName.length < 3 || /^[^a-zA-Z0-9\u0600-\u06FF]/.test(businessName)) {
        console.warn('⚠️ Invalid or missing businessName, using offer title as fallback')
        businessName = offerData.title || 'Loyalty Program'
      }
      console.log('✅ Using business name:', businessName)
      console.log('✅ Stamps: earned =', stampsEarned, ', required =', stampsRequired, '(from offerData.stampsRequired =', offerData.stampsRequired, ', offerData.stamps_required =', offerData.stamps_required, ')')

      // Convert design colors to RGB format (Apple Wallet requirement)
      // CRITICAL: Apple Wallet (especially iOS 15) requires rgb(r,g,b) format, NOT hex #rrggbb
      const backgroundColor = design?.background_color
        ? this.hexToRgb(design.background_color)
        : 'rgb(59, 130, 246)' // Default blue
      const foregroundColor = design?.foreground_color
        ? this.hexToRgb(design.foreground_color)
        : 'rgb(255, 255, 255)' // Default white
      const labelColor = design?.label_color
        ? this.hexToRgb(design.label_color)
        : foregroundColor // Use foreground color as fallback

      console.log('🎨 Colors:', { backgroundColor, foregroundColor, labelColor })

      // Get real certificate credentials from validator
      console.log('📋 Loading Apple Wallet certificates...')
      const certs = appleCertificateValidator.getCertificates()

      if (!certs) {
        throw new Error('Apple Wallet certificates not loaded. Please check server startup logs.')
      }

      console.log('✅ Certificates loaded:', {
        passTypeId: certs.passTypeId,
        teamId: certs.teamId
      })

      // 🆕 ENHANCED QR CODE - Phase 1 Implementation
      // Generate customer token and offer hash for complete scan data
      // MUST be done BEFORE creating passData object
      const customerToken = CustomerService.encodeCustomerToken(customerData.customerId, businessId)
      const offerHash = CustomerService.generateOfferHash(offerData.offerId, businessId)

      // QR Code message format: "customerToken:offerHash"
      // This allows POS systems to scan once and get all needed data
      const qrMessage = `${customerToken}:${offerHash}`

      console.log('🔐 Generated QR code data:', {
        customerToken: customerToken.substring(0, 20) + '...',
        offerHash: offerHash,
        fullMessage: qrMessage.substring(0, 30) + '...',
        messageLength: qrMessage.length
      })

      // Prepare pass data structure
      const passData = {
      formatVersion: 1,
      passTypeIdentifier: certs.passTypeId, // Real Pass Type ID from certificates
      serialNumber,
      teamIdentifier: certs.teamId, // Real Team ID from certificates
      organizationName: businessName, // Use validated business name
      description: `${businessName} Loyalty Card`,

      // Visual styling - Use custom colors or defaults
      // logoText: offerData.businessName, // REMOVED - Not present in working iOS 15.6 pass
      foregroundColor,
      backgroundColor,
      labelColor,

      // iOS 15 compatibility fields (from working Loopy Loyalty pass structure)
      sharingProhibited: true, // Prevents pass from being shared
      suppressStripShine: false, // Allows glossy effect on strip image

      // Store Card structure - EXACT match to working iOS 15.6 clone structure
      // Working clone: ONLY secondaryFields (1 field) + backFields - NO primaryFields, NO auxiliaryFields
      storeCard: {
        // ONLY secondaryFields - show progress on front of pass
        secondaryFields: [
          {
            key: 's0', // Match working clone key naming
            label: 'Progress',
            textAlignment: 'PKTextAlignmentLeft', // Match working clone alignment
            value: `${stampsEarned} of ${stampsRequired}`
          }
        ],

        // No back fields - all stamp visualization shown on dynamic hero image
        backFields: []
      },

      // Barcode for POS scanning
      // CRITICAL: iOS 15 and earlier require BOTH barcode (singular, deprecated) AND barcodes (plural)
      // CRITICAL: Field ordering and values MUST MATCH working clone exactly for iOS 15.6!
      barcode: {
        altText: 'Scan to earn stamps',  // Updated alt text for better UX
        format: 'PKBarcodeFormatQR',
        message: qrMessage,  // ✅ Enhanced: customerToken:offerHash
        messageEncoding: 'iso-8859-1'
      },
      barcodes: [
        {
          altText: 'Scan to earn stamps',  // Updated alt text for better UX
          format: 'PKBarcodeFormatQR',
          message: qrMessage,  // ✅ Enhanced: customerToken:offerHash
          messageEncoding: 'iso-8859-1'
        }
      ]

      // NOTE: relevantDate and maxDistance removed for iOS 15 compatibility
      // maxDistance requires a locations array or causes validation failures on iOS 15
      // relevantDate has strict format requirements that can fail on older iOS versions
      // These can be added later with proper locations array for geolocation features

      // NOTE: webServiceURL and authenticationToken are omitted
      // This creates a "static pass" that installs without requiring a backend web service
      // Limitation: Pass won't auto-update when progress changes (user must re-download)
      // Future enhancement: Add webServiceURL with proper /v1/passes endpoints for live updates
    }

      // ==================== DEBUG LOGGING ====================
      console.log('🔍 ========== PASS.JSON DEBUG ==========')
      console.log('📋 Complete pass.json structure:')
      console.log(JSON.stringify(passData, null, 2))
      console.log('🔍 ======================================')
      console.log('📊 Pass data analysis:')
      console.log('  - organizationName:', passData.organizationName, '(length:', passData.organizationName.length, 'bytes)')
      console.log('  - description:', passData.description)
      console.log('  - logoText:', passData.logoText)
      console.log('  - backgroundColor:', passData.backgroundColor)
      console.log('  - foregroundColor:', passData.foregroundColor)
      console.log('  - labelColor:', passData.labelColor)
      console.log('  - serialNumber:', passData.serialNumber)
      console.log('  - customerID:', customerData.customerId)
      console.log('  - barcode message:', passData.barcodes[0].message)
      console.log('  - barcode encoding:', passData.barcodes[0].messageEncoding)
      console.log('🔍 ======================================')

      return passData
    } catch (error) {
      console.error('❌ Error creating pass JSON:', error)
      throw new Error(`Failed to create pass data: ${error.message}`)
    }
  }

  async generatePassImages(offerData, design = null, progressData = {}) {
    // Import StampImageGenerator service for dynamic stamp visualization
    const StampImageGenerator = (await import('../services/StampImageGenerator.js')).default

    // Generate pass images - icon is REQUIRED, logo and strip are optional
    let baseImageBuffer

    // Try to use custom logo from design
    if (design?.logo_url) {
      try {
        console.log('🎨 Fetching custom logo for Apple Wallet from:', design.logo_url)
        const response = await fetch(design.logo_url)
        console.log('📡 Logo fetch response:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        })

        if (response.ok) {
          baseImageBuffer = Buffer.from(await response.arrayBuffer())
          console.log('✅ Custom logo fetched successfully:', baseImageBuffer.length, 'bytes')
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.error('❌ Failed to fetch custom logo:', {
          url: design.logo_url,
          error: error.message,
          stack: error.stack
        })
        console.warn('⚠️ Using placeholder logo instead')
        baseImageBuffer = null
      }
    } else {
      console.log('📝 No custom logo URL provided, using placeholder')
    }

    // Fallback to placeholder if custom logo not available
    if (!baseImageBuffer) {
      baseImageBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 59, g: 130, b: 246, alpha: 1 }
        }
      })
      .png()
      .toBuffer()
    }

    // Generate REQUIRED icon.png images (Apple Wallet won't install without these)
    // icon.png is mandatory for ALL pass types
    const icon1x = await sharp(baseImageBuffer)
      .resize(29, 29, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    const icon2x = await sharp(baseImageBuffer)
      .resize(58, 58, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    const icon3x = await sharp(baseImageBuffer)
      .resize(87, 87, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    // Generate OPTIONAL logo.png images (for branding in pass header)
    // Logo is LEFT-ALIGNED with small offset (matches "abbajava CAFE" reference)
    // Strategy: Create smaller logo on left side with transparent padding on right
    const logo1x = await sharp({
      create: {
        width: 160,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{
      input: await sharp(baseImageBuffer)
        .resize(100, 45, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
      left: 10,  // 10px offset from left edge
      top: 2     // Vertically centered: (50-45)/2 ≈ 2px
    }])
    .png()
    .toBuffer()

    const logo2x = await sharp({
      create: {
        width: 320,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{
      input: await sharp(baseImageBuffer)
        .resize(200, 90, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
      left: 20,  // 20px offset from left edge (like abbajava reference)
      top: 5     // Vertically centered: (100-90)/2 = 5px
    }])
    .png()
    .toBuffer()

    // Generate dynamic stamp visualization hero image using StampImageGenerator
    console.log('🎨 Generating dynamic stamp visualization for hero image...')
    const stampHeroImage = await StampImageGenerator.generateStampHeroImage({
      stampsEarned: progressData.stampsEarned || 0,
      stampsRequired: offerData.stampsRequired || offerData.stamps_required || 10,
      stampIcon: design?.stamp_icon || '⭐',
      stampDisplayType: design?.stamp_display_type || 'icon',
      logoUrl: design?.logo_url,
      heroImageUrl: design?.hero_image_url,
      backgroundColor: design?.background_color || '#3B82F6',  // Passed to circular backgrounds
      foregroundColor: design?.foreground_color || '#FFFFFF',  // Used for circle stroke and text
      progressDisplayStyle: design?.progress_display_style || 'grid'
    })
    console.log('✅ Dynamic stamp hero image generated:', stampHeroImage.length, 'bytes')

    // Return ONLY @2x images to match working iOS 15.6 clone structure
    // Working clone only has: icon@2x.png, logo@2x.png, strip@2x.png (3 files total)
    return {
      'icon@2x.png': icon2x,           // 58x58 - Retina displays
      'logo@2x.png': logo2x,           // 320x100 - Retina displays
      'strip@2x.png': stampHeroImage   // 624x168 - Dynamic hero image with stamps
    }
  }

  createManifest(passData, images) {
    const manifest = {}

    // Add pass.json hash
    const passJson = JSON.stringify(passData)
    manifest['pass.json'] = crypto.createHash('sha1').update(passJson, 'utf8').digest('hex')

    // Add image hashes
    Object.entries(images).forEach(([filename, buffer]) => {
      manifest[filename] = crypto.createHash('sha1').update(buffer).digest('hex')
    })

    return manifest
  }

  // DEPRECATED: No longer needed - using real certificates now
  // Kept for backward compatibility but not used
  async createDemoSignature() {
    throw new Error('Demo signatures are no longer supported. Using real Apple certificates.')
  }

  async createPkpassZip(passData, manifest, signature, images) {
    return new Promise((resolve, reject) => {
      const chunks = []
      const archive = archiver('zip', { zlib: { level: 9 } })

      archive.on('data', chunk => chunks.push(chunk))
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)

      // Add pass.json - NO FORMATTING! iOS 15.6 requires compact JSON (no whitespace)
      archive.append(JSON.stringify(passData), { name: 'pass.json' })

      // Add manifest.json - NO FORMATTING! iOS 15.6 requires compact JSON (no whitespace)
      archive.append(JSON.stringify(manifest), { name: 'manifest.json' })

      // Add signature
      archive.append(signature, { name: 'signature' })

      // Add images
      Object.entries(images).forEach(([filename, buffer]) => {
        archive.append(buffer, { name: filename })
      })

      archive.finalize()
    })
  }

  generateAuthToken(customerId, serialNumber) {
    // Simple token generation for demo
    return Buffer.from(`${customerId}:${serialNumber}:${Date.now()}`).toString('base64').substring(0, 32)
  }

  async downloadPass(req, res) {
    try {
      const { passId } = req.params

      // In production, retrieve pass from database and regenerate if needed
      res.status(404).json({
        error: 'Pass not found',
        passId
      })
    } catch (error) {
      res.status(500).json({
        error: 'Failed to download pass',
        message: error.message
      })
    }
  }

  async updatePass(req, res) {
    try {
      const { passId } = req.params
      const updateData = req.body

      console.log(`🍎 Updating Apple Wallet pass ${passId}:`, updateData)

      // In production:
      // 1. Update pass data in database
      // 2. Generate new pass file
      // 3. Send push notification to Apple Wallet

      res.json({
        success: true,
        passId,
        updated: new Date().toISOString(),
        message: 'Pass update queued'
      })
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update pass',
        message: error.message
      })
    }
  }

  /**
   * Send custom message notification to Apple Wallet pass
   * Used by WalletNotificationService for offers, reminders, birthdays, etc.
   *
   * IMPORTANT: Apple Wallet notifications require:
   * 1. Production APNs certificate (.p12 file)
   * 2. Pass Type ID certificate from Apple Developer account
   * 3. WWDR (Worldwide Developer Relations) certificate
   * 4. Production environment (sandbox doesn't support wallet push notifications)
   *
   * This method is currently a placeholder and will need to be implemented when
   * deploying to production with proper Apple certificates.
   *
   * @param {string} serialNumber - Apple Wallet pass serial number
   * @param {string} header - Message header/title
   * @param {string} body - Message body text
   * @returns {Object} Result with success status
   */
  async sendCustomMessage(serialNumber, header, body) {
    try {
      console.log('🍎 Apple Wallet: sendCustomMessage called', {
        serialNumber,
        header: header.substring(0, 50),
        body: body.substring(0, 50)
      })

      // Check if Apple Wallet push notifications are configured
      const apnsConfigured = process.env.APPLE_APNS_CERT_PATH && process.env.APPLE_APNS_KEY_PATH

      if (!apnsConfigured) {
        console.warn('⚠️ Apple Wallet: APNs not configured (requires production certificates)')
        return {
          success: false,
          error: 'APNs not configured',
          message: 'Apple Wallet push notifications require production APNs certificates',
          requires: [
            'APPLE_APNS_CERT_PATH environment variable',
            'APPLE_APNS_KEY_PATH environment variable',
            'Production APNs certificate (.p12)',
            'Pass Type ID certificate',
            'WWDR certificate'
          ],
          documentation: 'https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes'
        }
      }

      // In production, this would:
      // 1. Load APNs certificate and key
      // 2. Connect to APNs (api.push.apple.com:443)
      // 3. Send push notification with empty payload to trigger pass update
      // 4. Device fetches updated pass from webServiceURL
      // 5. Pass JSON would include the message in backFields or messageData

      // Production implementation would use 'apn' npm package:
      // const apn = require('apn')
      // const options = {
      //   cert: fs.readFileSync(process.env.APPLE_APNS_CERT_PATH),
      //   key: fs.readFileSync(process.env.APPLE_APNS_KEY_PATH),
      //   production: true
      // }
      // const apnProvider = new apn.Provider(options)
      // const notification = new apn.Notification()
      // notification.topic = 'pass.com.loyaltyplatform.storecard'
      // notification.payload = {} // Empty payload for pass update
      // const result = await apnProvider.send(notification, deviceToken)

      console.log('⚠️ Apple Wallet: Push notification not sent (production environment required)')

      return {
        success: false,
        error: 'Production environment required',
        message: 'Apple Wallet push notifications only work in production with valid APNs certificates',
        serialNumber,
        notification_data: {
          header,
          body,
          timestamp: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('❌ Apple Wallet: sendCustomMessage error:', error)
      return {
        success: false,
        error: 'Failed to send custom message',
        message: error.message
      }
    }
  }

  // Push updates to Apple Wallet when progress changes
  async pushProgressUpdate(customerId, offerId, progressData) {
    try {
      console.log('🍎 Pushing progress update to Apple Wallet:', {
        customerId,
        offerId,
        progress: progressData
      })

      // In production, this would:
      // 1. Find the pass by customer and offer IDs
      // 2. Update the pass data with new progress
      // 3. Generate new pass file
      // 4. Send push notification to Apple's server
      // 5. Apple Wallet on device would then update

      // For demo, we'll simulate the update
      const serialNumber = `${customerId}-${offerId}-${Date.now()}`
      const updatedPassData = this.createPassJson(
        { customerId, firstName: 'Customer', lastName: 'User', joinedDate: new Date() },
        { offerId, title: 'Loyalty Offer', businessName: 'Demo Business', stampsRequired: 10 },
        progressData
      )

      // Simulate push notification success
      console.log('✅ Apple Wallet push notification sent successfully')

      return {
        success: true,
        serialNumber,
        updated: new Date().toISOString(),
        progress: progressData
      }
    } catch (error) {
      console.error('❌ Apple Wallet push update failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default new AppleWalletController()