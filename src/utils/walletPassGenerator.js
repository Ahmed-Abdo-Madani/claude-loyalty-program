// Mobile Wallet Pass Generator Utility
// Supports both Apple Wallet (PassKit) and Google Pay (Wallet API)

import CryptoJS from 'crypto-js'

class WalletPassGenerator {
  constructor() {
    this.baseUrl = import.meta.env.VITE_BASE_URL || 'http://192.168.8.114:3000' // Network-accessible URL
  }

  // Generate customer progress QR code URL
  generateProgressQRUrl(customerData, offerData) {
    // ✅ VALIDATE: Customer ID must be in cust_* format
    if (!customerData.customerId || !customerData.customerId.startsWith('cust_')) {
      console.error('❌ Invalid customer ID format:', customerData.customerId)
      throw new Error(`Customer ID must be in cust_* format. Received: ${customerData.customerId}`)
    }

    const customerToken = this.encryptCustomerToken(customerData.customerId, offerData.businessId)
    const offerHash = this.hashOfferId(offerData.offerId, offerData.businessId)
    return `${this.baseUrl}/scan/${customerToken}/${offerHash}`
  }

  // Encrypt customer token for security - FIXED to match backend expectations
  encryptCustomerToken(customerId, businessId) {
    // ✅ VALIDATE: Customer ID must be in cust_* format
    if (!customerId || !customerId.startsWith('cust_')) {
      console.error('❌ Invalid customer ID for token generation:', customerId)
      throw new Error(`Customer ID must be in cust_* format. Received: ${customerId}`)
    }

    const timestamp = Date.now()
    const data = `${customerId}:${businessId}:${timestamp}`
    // Don't truncate - keep full base64 to match backend decoding
    return btoa(data)
  }

  // Hash offer ID for security - FIXED to match backend algorithm
  hashOfferId(offerId, businessId) {
    // Use same algorithm as backend CustomerService.generateOfferHash
    const data = `${offerId}:${businessId}:loyalty-platform`
    return CryptoJS.MD5(data).toString()
  }

  // Generate Apple Wallet Pass (.pkpass file)
  generateAppleWalletPass(customerData, offerData, progressData) {
    // Apple PassKit JSON structure
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.loyaltyplatform.storecard',
      serialNumber: `${customerData.customerId}-${offerData.offerId}-${Date.now()}`,
      teamIdentifier: 'LOYALTY_TEAM_ID', // Would be real Apple Developer Team ID
      organizationName: offerData.businessName,
      description: `${offerData.businessName} Loyalty Card`,

      // Visual styling
      logoText: offerData.businessName,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(59, 130, 246)', // Primary blue
      labelColor: 'rgb(255, 255, 255)',

      // Store Card specific structure
      storeCard: {
        // Primary field (most prominent)
        primaryFields: [
          {
            key: 'progress',
            label: 'Progress',
            value: `${progressData.stampsEarned} of ${offerData.stamps_required || offerData.stampsRequired}`,
            textAlignment: 'PKTextAlignmentCenter'
          }
        ],

        // Secondary fields (middle section)
        secondaryFields: [
          {
            key: 'reward',
            label: 'Reward',
            value: offerData.rewardDescription || 'Free Item',
            textAlignment: 'PKTextAlignmentLeft'
          },
          {
            key: 'location',
            label: 'Location',
            value: offerData.branchName || 'All Locations',
            textAlignment: 'PKTextAlignmentRight'
          }
        ],

        // Auxiliary fields (bottom section)
        auxiliaryFields: [
          {
            key: 'member_since',
            label: 'Member Since',
            value: this.formatDate(customerData.joinedDate),
            textAlignment: 'PKTextAlignmentLeft'
          },
          {
            key: 'expires',
            label: 'Expires',
            value: offerData.expirationDate ? this.formatDate(offerData.expirationDate) : 'Never',
            textAlignment: 'PKTextAlignmentRight'
          }
        ],

        // Back fields (detailed info)
        backFields: [
          {
            key: 'customer_name',
            label: 'Customer',
            value: `${customerData.firstName} ${customerData.lastName}`
          },
          {
            key: 'customer_id',
            label: 'Customer ID',
            value: customerData.customerId
          },
          {
            key: 'offer_details',
            label: 'Offer Details',
            value: offerData.description
          },
          {
            key: 'terms',
            label: 'Terms & Conditions',
            value: 'Valid at participating locations. Cannot be combined with other offers. Subject to availability.'
          }
        ]
      },

      // Barcodes (for scanning at POS and progress tracking)
      barcodes: [
        {
          message: customerData.customerId,
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: `Customer ID: ${customerData.customerId}`
        },
        {
          message: this.generateProgressQRUrl(customerData, offerData),
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: 'Scan to update loyalty progress'
        }
      ],

      // Locations (for lock screen relevance)
      locations: offerData.locations ? offerData.locations.map(location => ({
        latitude: location.lat,
        longitude: location.lng,
        relevantText: `${offerData.businessName} nearby - Show your loyalty card!`
      })) : [],

      // Web service for updates
      webServiceURL: `${this.baseUrl}/api/wallet/passes/`,
      authenticationToken: this.generateAuthToken(customerData.customerId, offerData.offerId),

      // Pass relevance
      relevantDate: new Date().toISOString(),
      maxDistance: 1000, // meters

      // Visual elements
      stripImage: `${this.baseUrl}/api/wallet/images/strip/${offerData.businessId}`,
      thumbnailImage: `${this.baseUrl}/api/wallet/images/thumbnail/${offerData.businessId}`,
      logoImage: `${this.baseUrl}/api/wallet/images/logo/${offerData.businessId}`
    }

    return passData
  }

  // Generate Google Wallet Pass
  generateGoogleWalletPass(customerData, offerData, progressData) {
    // Google Wallet API structure
    const passData = {
      iss: 'loyalty-platform@serviceaccount.com', // Service account email
      aud: 'google',
      typ: 'savetowallet',

      payload: {
        loyaltyObjects: [
          {
            id: `${offerData.businessId}.${customerData.customerId}-${offerData.offerId}`,
            classId: `${offerData.businessId}.${offerData.offerId}`,

            // Customer-specific data
            state: 'ACTIVE',
            heroImage: {
              sourceUri: {
                uri: `${this.baseUrl}/api/wallet/images/hero/${offerData.businessId}`
              },
              contentDescription: {
                defaultValue: {
                  language: 'en-US',
                  value: `${offerData.businessName} Loyalty Program`
                }
              }
            },

            // Text modules for card content
            textModulesData: [
              {
                id: 'progress',
                header: 'Progress',
                body: `${progressData.stampsEarned} of ${offerData.stamps_required || offerData.stampsRequired} stamps`
              },
              {
                id: 'reward',
                header: 'Reward',
                body: offerData.rewardDescription || 'Free Item'
              },
              {
                id: 'location',
                header: 'Valid At',
                body: offerData.branchName || 'All Locations'
              }
            ],

            // Links modules
            linksModuleData: {
              uris: [
                {
                  uri: `${this.baseUrl}/customer/account/${customerData.customerId}`,
                  description: 'View Account',
                  id: 'account_link'
                },
                {
                  uri: `tel:${offerData.businessPhone}`,
                  description: 'Call Business',
                  id: 'call_business'
                }
              ]
            },

            // Barcode for POS scanning and progress updates
            barcode: {
              type: 'QR_CODE',
              value: this.generateProgressQRUrl(customerData, offerData),
              alternateText: 'Scan to update loyalty progress'
            },

            // Points and progress
            loyaltyPoints: {
              balance: {
                string: `${progressData.stampsEarned}/${offerData.stamps_required || offerData.stampsRequired}`
              },
              label: 'Stamps Collected'
            },

            // Account details
            accountName: `${customerData.firstName} ${customerData.lastName}`,
            accountId: customerData.customerId,

            // Location relevance
            locations: offerData.locations ? offerData.locations.map(location => ({
              latitude: location.lat,
              longitude: location.lng
            })) : []
          }
        ],

        loyaltyClasses: [
          {
            id: `${offerData.businessId}.${offerData.offerId}`,

            // Program details
            programName: offerData.title,
            programLogo: {
              sourceUri: {
                uri: `${this.baseUrl}/api/wallet/images/logo/${offerData.businessId}`
              },
              contentDescription: {
                defaultValue: {
                  language: 'en-US',
                  value: `${offerData.businessName} Logo`
                }
              }
            },

            // Issuer details
            issuerName: offerData.businessName,

            // Visual styling
            hexBackgroundColor: '#3B82F6',

            // Reward tier
            rewardsTier: 'Standard',
            rewardsTierLabel: 'Member',

            // Terms and conditions
            programDetails: offerData.description,

            // Contact info
            homepageUri: {
              uri: offerData.businessWebsite || this.baseUrl,
              description: 'Business Website'
            }
          }
        ]
      }
    }

    return passData
  }

  // Generate wallet pass preview (for web display)
  generateWalletPreview(customerData, offerData, progressData) {
    // Handle both snake_case and camelCase property names for compatibility
    const stampsRequired = offerData.stamps_required || offerData.stampsRequired || 0
    const stampsEarned = progressData.stampsEarned || 0
    
    const progressPercentage = stampsRequired > 0 ? Math.round((stampsEarned / stampsRequired) * 100) : 0

    return {
      businessName: offerData.businessName,
      offerTitle: offerData.title,
      customerName: `${customerData.firstName} ${customerData.lastName}`,
      progress: {
        current: stampsEarned,
        required: stampsRequired,
        percentage: progressPercentage,
        remaining: Math.max(0, stampsRequired - stampsEarned)
      },
      stamps: this.generateStampVisual(stampsEarned, stampsRequired),
      status: stampsEarned >= stampsRequired ? 'reward_ready' : 'collecting',
      rewardDescription: offerData.rewardDescription,
      branchName: offerData.branchName,
      memberSince: this.formatDate(customerData.joinedDate),
      lastUpdated: new Date().toISOString(),
      customerId: customerData.customerId,
      colors: {
        primary: '#3B82F6',
        secondary: '#EFF6FF',
        text: '#1F2937',
        accent: '#10B981'
      }
    }
  }

  // Generate visual stamp representation
  generateStampVisual(earned, required) {
    const stamps = []
    for (let i = 0; i < required; i++) {
      stamps.push({
        position: i + 1,
        earned: i < earned,
        icon: i < earned ? '⭐' : '⚪',
        status: i < earned ? 'earned' : 'pending'
      })
    }
    return stamps
  }

  // Create Apple Wallet download URL
  generateAppleWalletUrl(passData) {
    // In production, this would generate a signed .pkpass file
    const passJson = JSON.stringify(passData)
    const encodedPass = btoa(passJson)
    return `${this.baseUrl}/api/wallet/apple/download/${encodedPass}`
  }

  // Create Google Wallet save URL
  generateGoogleWalletUrl(passData) {
    // Google Wallet Save to Wallet URL
    const encodedPass = btoa(JSON.stringify(passData))
    return `https://pay.google.com/gp/v/save/${encodedPass}`
  }

  // Update pass progress (for existing wallet cards)
  async updatePassProgress(customerId, offerId, newProgress) {
    try {
      // This would trigger push notifications to update the pass
      const updateData = {
        customerId,
        offerId,
        progress: newProgress,
        timestamp: new Date().toISOString()
      }

      // Store update for push notification service (business-specific)
      const businessId = localStorage.getItem('businessId') || 'default'
      const storageKey = `wallet_updates_${businessId}`
      const updates = JSON.parse(localStorage.getItem(storageKey) || '[]')
      updates.push(updateData)
      localStorage.setItem(storageKey, JSON.stringify(updates))

      return {
        success: true,
        message: 'Pass update queued for push notification'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Helper methods
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  generateAuthToken(customerId, offerId) {
    // Simple token generation for demo
    // In production, use proper JWT with signing
    return btoa(`${customerId}:${offerId}:${Date.now()}`).substring(0, 32)
  }

  // Validate wallet pass data
  validatePassData(customerData, offerData, progressData) {
    const errors = []

    if (!customerData?.customerId) errors.push('Customer ID required')
    if (!customerData?.firstName) errors.push('Customer first name required')
    if (!offerData?.offerId) errors.push('Offer ID required')
    if (!offerData?.businessName) errors.push('Business name required')
    if (!offerData?.title) errors.push('Offer title required')
    if (typeof progressData?.stampsEarned !== 'number') errors.push('Stamps earned must be a number')
    
    const stampsRequired = offerData?.stamps_required || offerData?.stampsRequired
    if (typeof stampsRequired !== 'number') errors.push('Stamps required must be a number')

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Check device compatibility
  getDeviceCapabilities() {
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isAndroid = /Android/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
    const isChrome = /Chrome/.test(userAgent)

    return {
      supportsAppleWallet: isIOS && isSafari,
      supportsGoogleWallet: isAndroid || isChrome,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
      userAgent
    }
  }
}

// Export singleton instance
export default new WalletPassGenerator()