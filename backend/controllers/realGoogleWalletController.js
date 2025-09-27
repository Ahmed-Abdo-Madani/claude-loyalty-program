import { GoogleAuth } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

class RealGoogleWalletController {
  constructor() {
    // Load Google Cloud credentials
    const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials/madna-platform-d8bf716cd142.json'
    this.credentialsPath = path.join(process.cwd(), credentialsFile)
    this.credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'))

    this.issuerId = process.env.GOOGLE_ISSUER_ID || '3388000000023017940'
    this.projectId = process.env.GOOGLE_PROJECT_ID || 'madna-platform'

    console.log('🔧 Google Wallet Configuration:')
    console.log('  Issuer ID:', this.issuerId)
    console.log('  Project ID:', this.projectId)
    console.log('  Service Account:', this.credentials.client_email)

    // Initialize Google Auth
    this.auth = new GoogleAuth({
      keyFile: this.credentialsPath,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
    })

    // Base URLs for Google Wallet Objects API
    this.baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1'

    // Bind methods
    this.generatePass = this.generatePass.bind(this)
    this.savePass = this.savePass.bind(this)
    this.pushProgressUpdate = this.pushProgressUpdate.bind(this)
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

      console.log('📱 Generating REAL Google Wallet pass for:', {
        customer: customerData.customerId,
        offer: offerData.offerId,
        business: offerData.businessName,
        issuer: this.issuerId
      })

      // Get authenticated client
      const authClient = await this.auth.getClient()

      // Step 1: Create or update loyalty class
      const loyaltyClass = await this.createOrUpdateLoyaltyClass(authClient, offerData)
      console.log('✅ Loyalty class created/updated:', loyaltyClass.id)

      // Step 2: Create loyalty object (customer's specific card)
      const loyaltyObject = await this.createLoyaltyObject(authClient, customerData, offerData, progressData)
      console.log('✅ Loyalty object created:', loyaltyObject.id)

      // Step 3: Generate signed JWT for Save to Google Wallet
      const jwt = this.generateSaveToWalletJWT(loyaltyObject)

      // Step 4: Create save URL
      const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`

      console.log('✅ Real Google Wallet pass generated successfully')

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
      res.status(500).json({
        error: 'Failed to generate Google Wallet pass',
        message: error.message,
        details: error.response?.data || error.stack
      })
    }
  }

  async createOrUpdateLoyaltyClass(authClient, offerData) {
    const classId = `${this.issuerId}.${String(offerData.offerId).replace(/[^a-zA-Z0-9]/g, '_')}`

    const loyaltyClass = {
      id: classId,
      issuerName: offerData.businessName,
      programName: offerData.title,

      // Program logo (using reliable CDN image)
      programLogo: {
        sourceUri: {
          uri: 'https://img.icons8.com/color/200/loyalty-card.png'
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

      // Review status (required)
      reviewStatus: 'UNDER_REVIEW',

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
        console.log(`Loyalty class ${classId} already exists`)
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
    const objectId = `${this.issuerId}.${customerData.customerId}_${offerData.offerId}`.replace(/[^a-zA-Z0-9._]/g, '_')
    const classId = `${this.issuerId}.${String(offerData.offerId).replace(/[^a-zA-Z0-9]/g, '_')}`

    const loyaltyObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',

      // Account information
      accountName: `${customerData.firstName} ${customerData.lastName}`,
      accountId: customerData.customerId,

      // Loyalty points
      loyaltyPoints: {
        balance: {
          string: `${progressData.current_stamps || 0}/${offerData.stamps_required || 10}`
        },
        label: 'Stamps Collected'
      },

      // Text modules for card content
      textModulesData: [
        {
          id: 'progress',
          header: 'Progress',
          body: `${progressData.current_stamps || 0} of ${offerData.stamps_required || 10} stamps`
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

      // Barcode for POS scanning
      barcode: {
        type: 'QR_CODE',
        value: JSON.stringify({
          customerId: customerData.customerId,
          offerId: offerData.offerId,
          businessId: offerData.businessId,
          timestamp: new Date().toISOString()
        }),
        alternateText: `Customer: ${customerData.customerId}`
      },

      // Links module for actions
      linksModuleData: {
        uris: [
          {
            uri: `${process.env.BASE_URL}/customer/account/${customerData.customerId}`,
            description: 'View Account',
            id: 'account_link'
          }
        ]
      }
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
        console.log(`Loyalty object ${objectId} already exists, updating...`)
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
      console.log(`Creating new loyalty object ${objectId}`)
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
      const { token } = req.params

      // Verify the JWT token
      const decoded = jwt.verify(token, this.credentials.private_key, { algorithms: ['RS256'] })

      console.log('Google Wallet save request for token:', token.substring(0, 20) + '...')

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

      return await response.json()

    } catch (error) {
      console.error('Failed to update loyalty object:', error)
      throw error
    }
  }

  // Push updates to Google Wallet when progress changes
  async pushProgressUpdate(customerId, offerId, progressData) {
    try {
      console.log('📱 Google Wallet Update Started:', {
        customerId,
        offerId,
        issuerId: this.issuerId,
        progressData: {
          current_stamps: progressData.current_stamps,
          max_stamps: progressData.max_stamps,
          is_completed: progressData.is_completed
        }
      })

      // Create object ID using same format as creation - CRITICAL FIX: Use identical regex pattern
      const objectId = `${this.issuerId}.${customerId}_${offerId}`.replace(/[^a-zA-Z0-9._]/g, '_')
      console.log(`🎯 Target Object ID: ${objectId}`)

      // First verify object exists before attempting update
      const authClient = await this.auth.getClient()
      const accessToken = await authClient.getAccessToken()
      
      console.log('🔍 Verifying object exists...')
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
              offerId: offer.id,
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
      const updateData = {
        loyaltyPoints: {
          balance: {
            string: `${progressData.current_stamps}/${progressData.max_stamps}`
          },
          label: 'Stamps Collected'
        },
        textModulesData: [
          {
            id: 'progress',
            header: 'Progress',
            body: `${progressData.current_stamps} of ${progressData.max_stamps} stamps`
          }
        ]
      }

      // If reward is earned, update the status
      if (progressData.is_completed) {
        updateData.state = 'COMPLETED'
        updateData.textModulesData.push({
          id: 'reward_status',
          header: '🎉 Reward Earned!',
          body: 'Visit the business to claim your free item'
        })
      }

      console.log('📦 Update payload:', JSON.stringify(updateData, null, 2))

      // Update the loyalty object in Google Wallet
      const result = await this.updateLoyaltyObject(objectId, updateData)
      
      console.log('📱 Update response received:', result)

      // Verify the update was successful by fetching the updated object
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
        const currentBalance = updatedObject.loyaltyPoints?.balance?.string
        const expectedBalance = `${progressData.current_stamps}/${progressData.max_stamps}`
        
        console.log('🔍 Verification results:', {
          expected: expectedBalance,
          actual: currentBalance,
          matches: currentBalance === expectedBalance
        })
        
        if (currentBalance !== expectedBalance) {
          console.warn('⚠️ Update verification failed: Balance mismatch')
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
        result
      }
    } catch (error) {
      console.error('❌ Google Wallet push update failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default new RealGoogleWalletController()