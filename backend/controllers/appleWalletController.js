import crypto from 'crypto'
import archiver from 'archiver'
import forge from 'node-forge'
import sharp from 'sharp'
import { PassGenerator, createContentDispositionHeader } from '../utils/passGenerator.js'
import WalletPassService from '../services/WalletPassService.js'
import CardDesignService from '../services/CardDesignService.js'
import CustomerService from '../services/CustomerService.js'
import ManifestService from '../services/ManifestService.js'
import appleCertificateValidator from '../utils/appleCertificateValidator.js'
import applePassSigner from '../utils/applePassSigner.js'
import SafeImageFetcher from '../utils/SafeImageFetcher.js'
import logger from '../config/logger.js'

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

      logger.info('🍎 Apple Wallet pass generation request:', {
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
        logger.error('❌ Missing required data for Apple Wallet pass')
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
        logger.warn('⚠️ joinedDate missing, using current date')
        customerData.joinedDate = new Date().toISOString()
      }

      // Add default firstName/lastName if missing
      if (!customerData.firstName) {
        logger.warn('⚠️ firstName missing, using default')
        customerData.firstName = 'Valued'
      }
      if (!customerData.lastName) {
        logger.warn('⚠️ lastName missing, using empty string')
        customerData.lastName = ''
      }

      logger.info('🍎 Generating Apple Wallet pass for:', {
        customer: customerData.customerId,
        offer: offerData.offerId,
        business: offerData.businessName
      })

      // Phase 4: Load card design if available (with backward compatibility)
      let design = null
      try {
        design = await CardDesignService.getDesignByOffer(offerData.offerId)
        if (design) {
          logger.info('🎨 Using custom card design for Apple Wallet pass:', offerData.offerId)
        } else {
          logger.info('📝 No custom design found, using defaults for:', offerData.offerId)
        }
      } catch (error) {
        logger.warn('⚠️ Failed to load card design, using defaults:', error.message)
      }

      // 🆕 DEFENSIVE FIX: Ensure offerData has all required fields
      // If businessId or stampsRequired missing, fetch from database
      if (!offerData.businessId || !offerData.stampsRequired) {
        logger.warn('⚠️ Missing required offer fields, fetching from database...')
        logger.warn('   Current offerData:', {
          businessId: offerData.businessId,
          stampsRequired: offerData.stampsRequired,
          stamps_required: offerData.stamps_required
        })

        try {
          const { default: sequelize } = await import('../config/database.js')
          const [offerRecord] = await sequelize.query(`
            SELECT business_id, stamps_required, title, description
            FROM offers
            WHERE public_id = ?
            LIMIT 1
          `, {
            replacements: [offerData.offerId],
            type: sequelize.QueryTypes.SELECT
          })

          if (offerRecord) {
            // Populate missing fields from database
            if (!offerData.businessId) {
              offerData.businessId = offerRecord.business_id
              logger.info('✅ Populated businessId from database:', offerRecord.business_id)
            }
            if (!offerData.stampsRequired && !offerData.stamps_required) {
              offerData.stampsRequired = offerRecord.stamps_required
              logger.info('✅ Populated stampsRequired from database:', offerRecord.stamps_required)
            }
          } else {
            throw new Error(`Offer ${offerData.offerId} not found in database`)
          }
        } catch (error) {
          logger.error('❌ Failed to fetch offer data from database:', error.message)
          throw new Error(`Cannot generate pass - missing required fields: ${error.message}`)
        }
      } else {
        logger.info('✅ offerData has required fields (businessId and stampsRequired)')
      }

      // 🆕 COMMENT 2 FIX: Fetch business contact and location data for back fields
      logger.info('🔍 Fetching business data for back fields...')
      try {
        const { default: sequelize } = await import('../config/database.js')
        const [businessRecord] = await sequelize.query(`
          SELECT phone, city, district, region, address, location_hierarchy
          FROM businesses
          WHERE public_id = ?
          LIMIT 1
        `, {
          replacements: [offerData.businessId],
          type: sequelize.QueryTypes.SELECT
        })

        if (businessRecord) {
          // Enrich offerData with business contact and location fields
          offerData.businessPhone = businessRecord.phone || null
          offerData.businessCity = businessRecord.city || null
          offerData.businessDistrict = businessRecord.district || null
          offerData.businessRegion = businessRecord.region || null
          offerData.businessAddress = businessRecord.address || null
          offerData.location_hierarchy = businessRecord.location_hierarchy || null
          
          logger.info('✅ Business data enriched for back fields:', {
            phone: !!businessRecord.phone,
            city: !!businessRecord.city,
            district: !!businessRecord.district,
            region: !!businessRecord.region,
            address: !!businessRecord.address,
            location_hierarchy: !!businessRecord.location_hierarchy
          })
        } else {
          logger.warn('⚠️ Business not found in database:', offerData.businessId)
        }
      } catch (error) {
        logger.error('❌ Failed to fetch business data from database:', error.message)
        // Continue without business data - back fields will be empty
      }

      // Ensure we have actual customer progress for stamp visualization
      let actualProgressData = progressData
      if (!progressData || progressData.stampsEarned === undefined) {
        logger.warn('⚠️ No progressData provided, fetching actual stamps from database...')

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

          logger.info('✅ Fetched actual progress from database:', actualProgressData)
        } catch (error) {
          logger.error('❌ Failed to fetch progress from database:', error.message)
          // Fallback to 0 stamps if query fails
          actualProgressData = { stampsEarned: 0 }
        }
      } else {
        // Ensure stampsEarned is a numeric value with default 0
        actualProgressData = {
          ...progressData,
          stampsEarned: typeof progressData.stampsEarned === 'number' ? progressData.stampsEarned : 0
        }
        logger.info('✅ Using provided progressData with normalized stampsEarned:', actualProgressData)
      }

      // Calculate customer tier
      const tierData = await CustomerService.calculateCustomerTier(customerData.customerId, offerData.offerId)
      if (tierData) {
        logger.info('🏆 Customer tier:', tierData)
        // Add tier data to progress data
        actualProgressData.tierData = tierData
        actualProgressData.rewardsClaimed = tierData.rewardsClaimed
      } else {
        // Even if no tier (shouldn't happen with New Member tier), set rewardsClaimed to 0
        actualProgressData.rewardsClaimed = 0
        logger.info('ℹ️ No tier data, setting rewardsClaimed to 0')
      }

      // Check if pass already exists to reuse authentication token and serial number
      let existingPass = null
      let existingSerialNumber = null
      let existingAuthToken = null
      
      try {
        const WalletPass = (await import('../models/WalletPass.js')).default
        existingPass = await WalletPass.findOne({
          where: {
            customer_id: customerData.customerId,
            offer_id: offerData.offerId,
            wallet_type: 'apple'
          }
        })
        
        if (existingPass) {
          existingSerialNumber = existingPass.wallet_serial
          existingAuthToken = existingPass.authentication_token
          logger.info('🔄 Found existing Apple Wallet pass, reusing credentials:', {
            serialNumber: existingSerialNumber,
            authToken: existingAuthToken?.substring(0, 16) + '...',
            passId: existingPass.id
          })
        }
      } catch (error) {
        logger.warn('⚠️ Failed to check for existing pass:', error.message)
        // Continue with new pass generation
      }

      // Generate pass data (with existing serial/token if available)
      const passData = this.createPassJson(
        customerData,
        offerData,
        actualProgressData,
        design,
        existingSerialNumber,
        existingAuthToken,
        existingPass  // Pass existingPass for lifecycle fields
      )

      // Generate pass images with progress data for stamp visualization
      const images = await this.generatePassImages(offerData, design, actualProgressData)

      // Create manifest with file hashes
      const manifest = this.createManifest(passData, images)

      // Compute ETag from manifest for HTTP caching
      const manifestETag = this.computeManifestETag(manifest)
      logger.info('🔖 Computed manifest ETag for new pass:', manifestETag)

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
          authentication_token: passData.authenticationToken,
          manifest_etag: manifestETag,
          pass_data_json: passData,
          device_info: {
            user_agent: req.headers['user-agent'],
            generated_at: new Date().toISOString()
          }
        }
      )
      logger.info('✨ Apple Wallet pass recorded in database successfully with web service protocol enabled')

      // Mark card design as applied (if design was used)
      if (design) {
        try {
          await CardDesignService.markDesignAsApplied(offerData.offerId)
          logger.info('🎨 Card design marked as applied for offer:', offerData.offerId)
        } catch (error) {
          logger.warn('⚠️ Failed to mark design as applied:', error.message)
          // Non-critical error, don't fail the request
        }
      }

      // Set headers for .pkpass download
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
      res.setHeader('Content-Disposition', createContentDispositionHeader(
        `${offerData.businessName}-loyalty-card`,
        { extension: 'pkpass', maxLength: 40 }
      ))
      res.setHeader('Content-Length', pkpassBuffer.length)

      logger.info('✅ Apple Wallet pass generated successfully')
      res.send(pkpassBuffer)

    } catch (error) {
      logger.error('❌ Apple Wallet generation failed:', error)
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

  // PHASE 3: Helper method to build back fields dynamically based on available data
  buildBackFields(offerData, customerData) {
    const backFields = []

    // 1. Business Phone (if available) - with tap-to-call
    if (offerData.businessPhone || offerData.phone) {
      backFields.push({
        key: 'business_phone',
        label: 'Contact',
        value: offerData.businessPhone || offerData.phone,
        textAlignment: 'PKTextAlignmentLeft',
        dataDetectorTypes: ['PKDataDetectorTypePhoneNumber']
      })
    }

    // 2. Business Location (if available)
    let locationValue = null
    if (offerData.location_hierarchy) {
      locationValue = offerData.location_hierarchy
    } else if (offerData.businessCity || offerData.businessDistrict || offerData.businessRegion) {
      // Build location from components
      const parts = []
      if (offerData.businessCity) parts.push(offerData.businessCity)
      if (offerData.businessDistrict) parts.push(offerData.businessDistrict)
      if (offerData.businessRegion) parts.push(offerData.businessRegion)
      locationValue = parts.join(', ')
    }
    
    if (locationValue) {
      backFields.push({
        key: 'location',
        label: 'Location',
        value: locationValue,
        textAlignment: 'PKTextAlignmentLeft'
      })
    }

    // 3. Business Address (if available) - with tap-to-map
    if (offerData.businessAddress || offerData.address) {
      backFields.push({
        key: 'address',
        label: 'Address',
        value: offerData.businessAddress || offerData.address,
        textAlignment: 'PKTextAlignmentLeft',
        dataDetectorTypes: ['PKDataDetectorTypeAddress']
      })
    }

    // 4. Offer Details (always available)
    const offerDetails = offerData.description 
      ? `${offerData.title}\n${offerData.description}` 
      : offerData.title
    backFields.push({
      key: 'offer_details',
      label: 'Offer',
      value: offerDetails,
      textAlignment: 'PKTextAlignmentLeft'
    })

    // 5. Reward Description (if available)
    if (offerData.rewardDescription) {
      backFields.push({
        key: 'reward',
        label: 'Reward',
        value: offerData.rewardDescription,
        textAlignment: 'PKTextAlignmentLeft'
      })
    }

    // 6. Customer ID (always available)
    backFields.push({
      key: 'customer_id',
      label: 'Member ID',
      value: customerData.customerId,
      textAlignment: 'PKTextAlignmentLeft'
    })

    // Log which fields are populated
    const populatedFields = backFields.map(f => f.key).join(', ')
    logger.info(`📋 Back fields populated: ${populatedFields}`)
    
    return backFields
  }

  createPassJson(customerData, offerData, progressData, design = null, existingSerialNumber = null, existingAuthToken = null, existingPass = null) {
    try {
      // Use existing serial number if provided (for updates), otherwise generate new one
      const serialNumber = existingSerialNumber || `${customerData.customerId}-${offerData.offerId}-${Date.now()}`

      // ==================== DATA VALIDATION & LOGGING ====================
      logger.info('📊 ========== PASS DATA RECEIVED ==========')
      logger.info('👤 Customer Data:', {
        customerId: customerData.customerId,
        firstName: customerData.firstName,
        lastName: customerData.lastName
      })
      logger.info('🎁 Offer Data:', {
        offerId: offerData.offerId,
        businessName: offerData.businessName,
        businessId: offerData.businessId,
        title: offerData.title,
        stampsRequired: offerData.stampsRequired,
        rewardDescription: offerData.rewardDescription
      })
      logger.info('📈 Progress Data:', progressData)
      logger.info('🎨 Design Data:', design ? {
        hasLogo: !!design.logo_url,
        hasHero: !!design.hero_image_url,
        colors: {
          background: design.background_color,
          foreground: design.foreground_color
        }
      } : 'No design')
      logger.info('========================================')

      // Ensure required fields have default values with better validation
      // IMPORTANT: Don't default stampsRequired to 10 - use actual offer data!
      const stampsRequired = offerData.stampsRequired || offerData.stamps_required || 10
      const stampsEarned = progressData?.stampsEarned || 0
      const rewardDescription = offerData.rewardDescription || offerData.title || 'Free Item'
      const branchName = offerData.branchName || 'All Locations'
      const businessId = offerData.businessId  // Required for QR code generation

      // Validate stampsRequired value
      if (!offerData.stampsRequired && !offerData.stamps_required) {
        logger.warn('⚠️ No stampsRequired provided in offerData, defaulting to 10. This may be incorrect!')
        logger.warn('   offerData:', JSON.stringify(offerData, null, 2))
      }

      // Validate business ID is present
      if (!businessId) {
        throw new Error('businessId is required for generating QR code tokens')
      }

      // Validate and fix business name if needed
      let businessName = offerData.businessName
      if (!businessName || businessName.length < 3 || /^[^a-zA-Z0-9\u0600-\u06FF]/.test(businessName)) {
        logger.warn('⚠️ Invalid or missing businessName, using offer title as fallback')
        businessName = offerData.title || 'Loyalty Program'
      }
      logger.info('✅ Using business name:', businessName)
      logger.info('✅ Stamps: earned =', stampsEarned, ', required =', stampsRequired, '(from offerData.stampsRequired =', offerData.stampsRequired, ', offerData.stamps_required =', offerData.stamps_required, ')')

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

      logger.info('🎨 Colors:', { backgroundColor, foregroundColor, labelColor })

      // Get real certificate credentials from validator
      logger.info('📋 Loading Apple Wallet certificates...')
      const certs = appleCertificateValidator.getCertificates()

      if (!certs) {
        throw new Error('Apple Wallet certificates not loaded. Please check server startup logs.')
      }

      logger.info('✅ Certificates loaded:', {
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

      // Validate QR message is ASCII-safe (critical for barcode encoding)
      if (!CustomerService.isAsciiSafe(qrMessage)) {
        logger.error('❌ QR message contains non-ASCII characters, cannot create pass:', {
          customerId: customerData.customerId.substring(0, 8) + '...',
          businessId: businessId.substring(0, 8) + '...',
          offerId: offerData.offerId.substring(0, 8) + '...',
          messagePreview: qrMessage.substring(0, 50) + '...'
        })
        throw new Error('QR message encoding failed: contains non-ASCII characters')
      }

      logger.info('🔐 Generated QR code data (ASCII-safe validated):', {
        customerToken: customerToken.substring(0, 20) + '...',
        offerHash: offerHash,
        fullMessage: qrMessage.substring(0, 30) + '...',
        messageLength: qrMessage.length,
        encoding: 'base64:hex (ASCII-safe)'
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

      // Store Card structure - Enhanced with header fields, auxiliary fields
      // Maintains iOS 15.6 compatibility while adding business and customer information
      storeCard: {
        // PHASE 1: Header fields - Business name in top right corner
        headerFields: [
          {
            key: 'business',
            value: businessName, // Business name from validated variable (line 372)
            textAlignment: 'PKTextAlignmentRight' // Right-aligned in header
          }
        ],

        // Secondary fields - show progress on front of pass
        secondaryFields: [
          {
            key: 's0', // Match working clone key naming
            label: 'Progress',
            textAlignment: 'PKTextAlignmentLeft', // Match working clone alignment
            value: `${stampsEarned} of ${stampsRequired}`
          },
          {
            key: 'completions',
            label: 'Completed',
            textAlignment: 'PKTextAlignmentLeft',
            value: `${progressData.rewardsClaimed || 0}x`
          },
          {
            key: 'tier',
            label: '',
            textAlignment: 'PKTextAlignmentLeft',
            // Always show tier field with fallback to "New Member"
            value: progressData.tierData?.currentTier
              ? `${progressData.tierData.currentTier.icon} ${progressData.tierData.currentTier.name}`
              : '👋 New Member'
          }
        ],

        // PHASE 2: Auxiliary fields - Customer name on right side under hero
        auxiliaryFields: [
          {
            key: 'customer',
            label: 'Member',
            value: [customerData.firstName, customerData.lastName].filter(Boolean).join(' '),
            textAlignment: 'PKTextAlignmentRight' // Right-aligned
          }
        ]
      },

      // PHASE 3: Back fields - Business contact, location, and offer details (TOP-LEVEL per PassKit schema)
      backFields: this.buildBackFields(offerData, customerData),

      // Barcode for POS scanning
      // CRITICAL: iOS 15 and earlier require BOTH barcode (singular, deprecated) AND barcodes (plural)
      // CRITICAL: Field ordering and values MUST MATCH working clone exactly for iOS 15.6!
      // Encoding: UTF-8 (safer for international characters, backward compatible with ASCII QR data)
      // QR payload is base64:hex format (ASCII-safe), but UTF-8 provides future-proofing
      barcode: {
        altText: 'Scan to earn stamps',  // Updated alt text for better UX
        format: 'PKBarcodeFormatQR',
        message: qrMessage,  // ✅ Enhanced: customerToken:offerHash (base64:hex - ASCII-safe)
        messageEncoding: 'UTF-8'
      },
      barcodes: [
        {
          altText: 'Scan to earn stamps',  // Updated alt text for better UX
          format: 'PKBarcodeFormatQR',
          message: qrMessage,  // ✅ Enhanced: customerToken:offerHash (base64:hex - ASCII-safe)
          messageEncoding: 'UTF-8'
        }
      ]

      // NOTE: relevantDate and maxDistance removed for iOS 15 compatibility
      // maxDistance requires a locations array or causes validation failures on iOS 15
      // relevantDate has strict format requirements that can fail on older iOS versions
      // These can be added later with proper locations array for geolocation features
    }

    // ============ APPLE WEB SERVICE PROTOCOL ============
    // Add webServiceURL and authenticationToken for dynamic pass updates
    // This enables device registration and push notifications
    // Apple expects the full base path to PassKit endpoints
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.madna.me'
      : process.env.BASE_URL || 'http://localhost:3001'

    // Full path to Apple Web Service endpoints (mounted at /api/apple with /v1 routes)
    passData.webServiceURL = `${baseUrl}/api/apple`
    // Use existing auth token if provided (for updates), otherwise generate new one
    // CRITICAL: Must use same algorithm as WalletPass.generateAuthToken (customerId + offerId)
    passData.authenticationToken = existingAuthToken || this.generateAuthToken(customerData.customerId, offerData.offerId)

    logger.info('🔐 Apple Web Service Protocol enabled:', {
      webServiceURL: passData.webServiceURL,
      authenticationToken: passData.authenticationToken.substring(0, 16) + '...',
      serialNumber: serialNumber,
      usingExistingToken: !!existingAuthToken,
      generatedFrom: existingAuthToken ? 'database' : `customerId:${customerData.customerId} + offerId:${offerData.offerId}`
    })
    // ===================================================

    // ============ PASS LIFECYCLE FIELDS ============
    // Add expiration date and voided status for completed/expired passes
    // If pass is completed and has scheduled expiration, set expirationDate
    if (existingPass && existingPass.pass_status === 'completed' && existingPass.scheduled_expiration_at) {
      passData.expirationDate = new Date(existingPass.scheduled_expiration_at).toISOString()
      logger.info('⏰ Pass expiration scheduled:', passData.expirationDate)
    }
    
    // If pass is expired or revoked, mark as voided (grays out the pass in Wallet)
    if (existingPass && (existingPass.pass_status === 'expired' || existingPass.pass_status === 'revoked')) {
      passData.voided = true
      logger.info('🚫 Pass marked as voided (status: ' + existingPass.pass_status + ')')
    }
    // ===============================================

      // ==================== DEBUG LOGGING ====================
      logger.info('🔍 ========== PASS.JSON DEBUG ==========')
      logger.info('📋 Complete pass.json structure:')
      logger.info(JSON.stringify(passData, null, 2))
      logger.info('🔍 ======================================')
      logger.info('📊 Pass data analysis:')
      logger.info('  - organizationName:', passData.organizationName, '(length:', passData.organizationName.length, 'bytes)')
      logger.info('  - description:', passData.description)
      logger.info('  - logoText:', passData.logoText)
      logger.info('  - backgroundColor:', passData.backgroundColor)
      logger.info('  - foregroundColor:', passData.foregroundColor)
      logger.info('  - labelColor:', passData.labelColor)
      logger.info('  - serialNumber:', passData.serialNumber)
      logger.info('  - customerID:', customerData.customerId)
      logger.info('  - barcode message:', passData.barcodes[0].message)
      logger.info('  - barcode encoding:', passData.barcodes[0].messageEncoding)
      logger.info('🔍 ======================================')

      return passData
    } catch (error) {
      logger.error('❌ Error creating pass JSON:', error)
      throw new Error(`Failed to create pass data: ${error.message}`)
    }
  }

  async generatePassImages(offerData, design = null, progressData = {}) {
    // Import StampImageGenerator service for dynamic stamp visualization
    const StampImageGenerator = (await import('../services/StampImageGenerator.js')).default

    // Generate pass images - icon is REQUIRED, logo and strip are optional
    let baseImageBuffer

    // Try to use custom logo from design with timeout and size protection
    if (design?.logo_url) {
      try {
        logger.info('🎨 Fetching custom logo for Apple Wallet from:', design.logo_url)
        
        // Use SafeImageFetcher with 5s timeout and 3MB size cap
        baseImageBuffer = await SafeImageFetcher.fetchImage(design.logo_url, {
          timeoutMs: 5000,
          maxSizeBytes: 3 * 1024 * 1024,
          allowedContentTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        })

        if (baseImageBuffer) {
          logger.info('✅ Custom logo fetched successfully:', baseImageBuffer.length, 'bytes')
        } else {
          throw new Error('SafeImageFetcher returned null (timeout or size limit exceeded)')
        }
      } catch (error) {
        logger.error('❌ Failed to fetch custom logo:', {
          url: design.logo_url,
          error: error.message,
          stack: error.stack
        })
        logger.warn('⚠️ Using placeholder logo instead')
        baseImageBuffer = null
      }
    } else {
      logger.info('📝 No custom logo URL provided, using placeholder')
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
      left: 3,  // PHASE 4: 3px offset from left edge (proportional to @2x)
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
      left: 5,  // PHASE 4: 5px offset from left edge (closer to edge alignment)
      top: 5     // Vertically centered: (100-90)/2 = 5px
    }])
    .png()
    .toBuffer()

    // Generate dynamic stamp visualization hero image using StampImageGenerator
    logger.info('🎨 Generating dynamic stamp visualization for hero image...')

    // Determine stamp display mode
    let stampDisplayType = design?.stamp_display_type || 'logo'
    let stampIconId = design?.stamp_icon || 'coffee-01'

    // Comment 2: Validate stampIcon against manifest entries
    try {
      const manifest = ManifestService.readManifest()
      const validIcon = manifest.icons?.find(icon => icon.id === stampIconId)
      
      if (!validIcon) {
        logger.warn(`⚠️ Invalid stamp icon ID '${stampIconId}' not found in manifest`)
        // Fallback to first available icon or known-good default
        const fallbackIcon = manifest.icons?.[0]?.id || 'gift-01'
        logger.info(`🔄 Using fallback icon '${fallbackIcon}' instead of invalid '${stampIconId}'`)
        stampIconId = fallbackIcon
      } else {
        logger.info(`✅ Stamp icon '${stampIconId}' validated against manifest`)
      }
    } catch (error) {
      logger.warn(`⚠️ Could not validate stamp icon against manifest: ${error.message}`)
      // Continue with provided icon ID - StampImageGenerator will handle invalid IDs
    }

    // Validate stamp display configuration
    if (stampDisplayType === 'logo' && !design?.logo_url) {
      logger.warn('⚠️ Logo stamp display selected but no logo available, falling back to SVG icon')
      // Override to use SVG icon as fallback
      stampDisplayType = 'svg'
    }

    logger.info('🎨 Stamp configuration:', {
      displayType: stampDisplayType,
      iconId: stampDisplayType === 'svg' ? stampIconId : 'N/A (using logo)',
      hasLogo: !!design?.logo_url
    })

    const stampHeroImage = await StampImageGenerator.generateStampHeroImage({
      stampsEarned: progressData.stampsEarned || 0,
      stampsRequired: offerData.stampsRequired || offerData.stamps_required || 10,
      stampIcon: stampIconId,  // SVG icon ID (e.g., 'coffee-01') - now validated
      stampDisplayType: stampDisplayType,  // 'svg' or 'logo'
      logoUrl: design?.logo_url,
      heroImageUrl: design?.hero_image_url,
      backgroundColor: design?.background_color || '#3B82F6',
      foregroundColor: design?.foreground_color || '#FFFFFF',
      progressDisplayStyle: design?.progress_display_style || 'grid'
    })
    logger.info('✅ Dynamic stamp hero image generated:', stampHeroImage.length, 'bytes')

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

  /**
   * Compute ETag from manifest for HTTP caching
   * ETag is more reliable than Last-Modified across servers/timezones
   * @param {object} manifest - The manifest object containing file hashes
   * @returns {string} - Strong ETag value (quoted)
   */
  computeManifestETag(manifest) {
    // Create deterministic hash from sorted manifest entries
    const manifestString = JSON.stringify(manifest, Object.keys(manifest).sort())
    const hash = crypto.createHash('sha256').update(manifestString, 'utf8').digest('hex')
    // Return first 16 characters as quoted strong ETag
    return `"${hash.substring(0, 16)}"`
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

  generateAuthToken(customerId, offerId) {
    // CRITICAL: Must match WalletPass.generateAuthToken algorithm exactly
    // Use customerId + offerId for consistency with model
    // This ensures tokens generated here match tokens in database
    const data = `${customerId}:${offerId}:${Date.now()}`
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)
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

      logger.info(`🍎 Updating Apple Wallet pass ${passId}:`, updateData)

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
      logger.info('🍎 Apple Wallet: sendCustomMessage called', {
        serialNumber,
        header: header.substring(0, 50),
        body: body.substring(0, 50)
      })

      // Check if Apple Wallet push notifications are configured
      const apnsConfigured = process.env.APPLE_APNS_CERT_PATH && process.env.APPLE_APNS_KEY_PATH

      if (!apnsConfigured) {
        logger.warn('⚠️ Apple Wallet: APNs not configured (requires production certificates)')
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

      logger.info('⚠️ Apple Wallet: Push notification not sent (production environment required)')

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
      logger.error('❌ Apple Wallet: sendCustomMessage error:', error)
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
      logger.info('🍎 Pushing progress update to Apple Wallet:', {
        customerId,
        offerId,
        progress: progressData
      })

      // DEFENSIVE LOGGING: Verify fresh progress data received
      logger.info('Progress data received in pushProgressUpdate:', {
        currentStamps: progressData.current_stamps,
        rewardsClaimed: progressData.rewards_claimed,
        isCompleted: progressData.is_completed
      })

      // Extract customer name from progressData
      const customerName = progressData.customer_name || 'Valued'
      const [firstName, ...lastNameParts] = customerName.split(' ')
      const lastName = lastNameParts.join(' ') || ''

      // Extract real offer and business data from progressData
      const offer = progressData.offer || {}
      const business = progressData.business || {}

      // Construct complete customerData object
      const customerData = {
        customerId: customerId,
        firstName: firstName || 'Valued',
        lastName: lastName,
        joinedDate: progressData.created_at || new Date()
      }

      // Construct complete offerData object with businessId
      const offerData = {
        offerId: offerId,
        businessId: business.public_id || progressData.business_id, // CRITICAL: Include businessId
        businessName: business.business_name || 'Loyalty Program',
        title: offer.title || 'Loyalty Offer',
        stampsRequired: offer.stamps_required || progressData.max_stamps || 10,
        rewardDescription: offer.description || 'Reward',
        branchName: offer.branch || 'All Locations'
      }

      // 🆕 COMMENT 3 FIX: Fetch business contact and location data for back fields (same as generatePass)
      logger.info('🔍 Fetching business data for back fields in push update...')
      try {
        const { default: sequelize } = await import('../config/database.js')
        const [businessRecord] = await sequelize.query(`
          SELECT phone, city, district, region, address, location_hierarchy
          FROM businesses
          WHERE public_id = ?
          LIMIT 1
        `, {
          replacements: [offerData.businessId],
          type: sequelize.QueryTypes.SELECT
        })

        if (businessRecord) {
          // Enrich offerData with business contact and location fields
          offerData.businessPhone = businessRecord.phone || null
          offerData.businessCity = businessRecord.city || null
          offerData.businessDistrict = businessRecord.district || null
          offerData.businessRegion = businessRecord.region || null
          offerData.businessAddress = businessRecord.address || null
          offerData.location_hierarchy = businessRecord.location_hierarchy || null
          
          logger.info('✅ Business data enriched for back fields in push update:', {
            phone: !!businessRecord.phone,
            city: !!businessRecord.city,
            district: !!businessRecord.district,
            region: !!businessRecord.region,
            address: !!businessRecord.address,
            location_hierarchy: !!businessRecord.location_hierarchy
          })
        } else {
          logger.warn('⚠️ Business not found in database:', offerData.businessId)
        }
      } catch (error) {
        logger.error('❌ Failed to fetch business data in push update:', error.message)
        // Continue without business data - back fields will be empty
      }

      // Construct progress data for stamp visualization
      const stampProgressData = {
        stampsEarned: progressData.current_stamps || 0
      }

      // Calculate customer tier
      const tierData = await CustomerService.calculateCustomerTier(customerId, offerId)
      if (tierData) {
        logger.info('🏆 Customer tier:', tierData)
        // Add tier data to progress data
        stampProgressData.tierData = tierData
        stampProgressData.rewardsClaimed = tierData.rewardsClaimed
      } else {
        // Defensive fallback: set New Member tier and rewardsClaimed to 0
        // This ensures createPassJson always has a tier to display
        stampProgressData.rewardsClaimed = 0
        stampProgressData.tierData = {
          currentTier: {
            name: 'New Member',
            nameAr: 'عضو جديد',
            icon: '👋',
            color: '#6B7280'
          }
        }
        logger.info('ℹ️ No tier data in push update, using default New Member tier')
      }

      // Load card design if available
      let design = null
      try {
        const CardDesignService = (await import('../services/CardDesignService.js')).default
        design = await CardDesignService.getDesignByOffer(offerId)
      } catch (error) {
        logger.warn('⚠️ Failed to load card design for push update:', error.message)
      }

      // Find the wallet pass record in database FIRST to get existing serial number
      const WalletPass = (await import('../models/WalletPass.js')).default
      const walletPass = await WalletPass.findOne({
        where: {
          customer_id: customerId,
          offer_id: offerId,
          wallet_type: 'apple',
          pass_status: 'active'
        }
      })

      if (!walletPass) {
        logger.warn('⚠️ No active Apple Wallet pass found for customer')
        return {
          success: false,
          error: 'No active Apple Wallet pass found'
        }
      }

      // CRITICAL: Use existing serial number AND authentication token from database (don't generate new ones!)
      const existingSerialNumber = walletPass.wallet_serial
      const existingAuthToken = walletPass.authentication_token
      logger.info('🔄 Using existing serial number for update:', existingSerialNumber)
      logger.info('🔄 Using existing auth token for update:', existingAuthToken?.substring(0, 8) + '...')

      // Generate updated pass data with SAME serial number and SAME auth token
      const updatedPassData = this.createPassJson(
        customerData,
        offerData,
        stampProgressData,
        design,
        existingSerialNumber,  // Pass existing serial number!
        existingAuthToken,     // Pass existing auth token!
        walletPass             // Pass walletPass for lifecycle fields
      )

      // Update pass data in database
      await walletPass.updatePassData(updatedPassData)

      // Send APNs push notification to trigger update on device
      const pushResult = await walletPass.sendPushNotification()

      logger.info('✅ Apple Wallet pass updated and push notification sent')

      return {
        success: true,
        serialNumber: updatedPassData.serialNumber,
        updated: new Date().toISOString(),
        progress: stampProgressData,
        pushNotification: pushResult
      }
    } catch (error) {
      logger.error('❌ Apple Wallet push update failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default new AppleWalletController()
