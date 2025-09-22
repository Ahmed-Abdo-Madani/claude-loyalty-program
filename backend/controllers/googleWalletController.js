import jwt from 'jsonwebtoken'
import crypto from 'crypto'

class GoogleWalletController {
  constructor() {
    // Demo credentials - in production, these would be from Google Cloud Console
    this.serviceAccountEmail = 'wallet-service@loyalty-platform-demo.iam.gserviceaccount.com'
    this.privateKey = this.generateDemoPrivateKey()

    // Bind methods to preserve 'this' context
    this.generatePass = this.generatePass.bind(this)
    this.savePass = this.savePass.bind(this)
  }

  async generatePass(req, res) {
    try {
      const { customerData, offerData, progressData } = req.body

      // Validate required data
      if (!customerData?.customerId || !offerData?.offerId || !offerData?.businessName) {
        return res.status(400).json({
          error: 'Missing required data',
          required: ['customerData.customerId', 'offerData.offerId', 'offerData.businessName']
        })
      }

      console.log('📱 Generating Google Wallet pass for:', {
        customer: customerData.customerId,
        offer: offerData.offerId,
        business: offerData.businessName
      })

      // Generate loyalty class (offer template)
      const loyaltyClass = this.createLoyaltyClass(offerData)

      // Generate loyalty object (customer's card)
      const loyaltyObject = this.createLoyaltyObject(customerData, offerData, progressData)

      // Create JWT payload
      const payload = {
        iss: this.serviceAccountEmail,
        aud: 'google',
        typ: 'savetowallet',
        iat: Math.floor(Date.now() / 1000),
        payload: {
          loyaltyObjects: [loyaltyObject],
          loyaltyClasses: [loyaltyClass]
        }
      }

      // Generate JWT token
      const token = jwt.sign(payload, this.privateKey, {
        algorithm: 'RS256',
        expiresIn: '1h'
      })

      // Create save URL
      const saveUrl = `https://pay.google.com/gp/v/save/${token}`

      console.log('✅ Google Wallet pass generated successfully')

      res.json({
        success: true,
        saveUrl,
        token,
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      })

    } catch (error) {
      console.error('❌ Google Wallet generation failed:', error)
      res.status(500).json({
        error: 'Failed to generate Google Wallet pass',
        message: error.message
      })
    }
  }

  createLoyaltyClass(offerData) {
    const classId = `${offerData.businessId || 'demo'}.${offerData.offerId}`

    return {
      id: classId,
      issuerName: offerData.businessName,
      programName: offerData.title,

      programLogo: {
        sourceUri: {
          uri: `http://localhost:3001/api/wallet/images/logo/${offerData.businessId || 'demo'}`
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: `${offerData.businessName} Logo`
          }
        }
      },

      // Visual styling
      hexBackgroundColor: '#3B82F6',

      // Reward tier information
      rewardsTier: 'Standard',
      rewardsTierLabel: 'Member',

      // Program details
      programDetails: offerData.description || offerData.title,

      // Contact information
      homepageUri: {
        uri: 'http://localhost:3000',
        description: 'Business Website'
      },

      // Terms and conditions
      termsAndConditionsUri: {
        uri: 'http://localhost:3000/terms',
        description: 'Terms and Conditions'
      }
    }
  }

  createLoyaltyObject(customerData, offerData, progressData) {
    const objectId = `${offerData.businessId || 'demo'}.${customerData.customerId}-${offerData.offerId}`
    const classId = `${offerData.businessId || 'demo'}.${offerData.offerId}`

    return {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',

      // Hero image for the card
      heroImage: {
        sourceUri: {
          uri: `http://localhost:3001/api/wallet/images/hero/${offerData.businessId || 'demo'}`
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
          body: `${progressData.stampsEarned || 0} of ${offerData.stampsRequired || 10} stamps`
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
        },
        {
          id: 'member_since',
          header: 'Member Since',
          body: new Date(customerData.joinedDate).toLocaleDateString()
        }
      ],

      // Links module for actions
      linksModuleData: {
        uris: [
          {
            uri: `http://localhost:3000/customer/account/${customerData.customerId}`,
            description: 'View Account',
            id: 'account_link'
          },
          {
            uri: `http://localhost:3000/business/${offerData.businessId}`,
            description: 'Visit Business',
            id: 'business_link'
          }
        ]
      },

      // Barcode for POS scanning
      barcode: {
        type: 'QR_CODE',
        value: customerData.customerId,
        alternateText: `Customer ID: ${customerData.customerId}`
      },

      // Loyalty points display
      loyaltyPoints: {
        balance: {
          string: `${progressData.stampsEarned || 0}/${offerData.stampsRequired || 10}`
        },
        label: 'Stamps Collected'
      },

      // Account information
      accountName: `${customerData.firstName} ${customerData.lastName}`,
      accountId: customerData.customerId,

      // Location relevance (if provided)
      locations: offerData.locations ? offerData.locations.map(location => ({
        latitude: location.lat,
        longitude: location.lng
      })) : []
    }
  }

  generateDemoPrivateKey() {
    // Generate a demo RSA private key for development
    // In production, use the actual private key from Google Cloud Console service account

    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })

    return privateKey
  }

  async savePass(req, res) {
    try {
      const { token } = req.params

      // Verify token
      const decoded = jwt.verify(token, this.privateKey, { algorithms: ['RS256'] })

      console.log('Google Wallet save request for token:', token.substring(0, 20) + '...')

      // In production, this would redirect to Google Wallet
      res.redirect(`https://pay.google.com/gp/v/save/${token}`)

    } catch (error) {
      console.error('Failed to process Google Wallet save:', error)
      res.status(400).json({
        error: 'Invalid or expired token',
        message: error.message
      })
    }
  }
}

export default new GoogleWalletController()