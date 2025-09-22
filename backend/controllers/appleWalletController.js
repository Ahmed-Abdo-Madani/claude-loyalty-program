import crypto from 'crypto'
import archiver from 'archiver'
import forge from 'node-forge'
import sharp from 'sharp'
import { PassGenerator } from '../utils/passGenerator.js'

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

      // Validate required data
      if (!customerData?.customerId || !offerData?.offerId || !offerData?.businessName) {
        return res.status(400).json({
          error: 'Missing required data',
          required: ['customerData.customerId', 'offerData.offerId', 'offerData.businessName']
        })
      }

      console.log('🍎 Generating Apple Wallet pass for:', {
        customer: customerData.customerId,
        offer: offerData.offerId,
        business: offerData.businessName
      })

      // Generate pass data
      const passData = this.createPassJson(customerData, offerData, progressData)

      // Generate pass images
      const images = await this.generatePassImages(offerData)

      // Create manifest with file hashes
      const manifest = this.createManifest(passData, images)

      // For demo purposes, we'll skip digital signing since it requires Apple certificates
      // In production, you would call this.signManifest(manifest)
      const signature = await this.createDemoSignature()

      // Create .pkpass ZIP file
      const pkpassBuffer = await this.createPkpassZip(passData, manifest, signature, images)

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

  createPassJson(customerData, offerData, progressData) {
    const serialNumber = `${customerData.customerId}-${offerData.offerId}-${Date.now()}`

    return {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.loyaltyplatform.storecard',
      serialNumber,
      teamIdentifier: 'DEMO123456', // Demo team ID
      organizationName: offerData.businessName,
      description: `${offerData.businessName} Loyalty Card`,

      // Visual styling
      logoText: offerData.businessName,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(59, 130, 246)',
      labelColor: 'rgb(255, 255, 255)',

      // Store Card structure
      storeCard: {
        primaryFields: [
          {
            key: 'progress',
            label: 'Progress',
            value: `${progressData.stampsEarned || 0} of ${offerData.stampsRequired || 10}`,
            textAlignment: 'PKTextAlignmentCenter'
          }
        ],

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

        auxiliaryFields: [
          {
            key: 'member_since',
            label: 'Member Since',
            value: new Date(customerData.joinedDate).toLocaleDateString(),
            textAlignment: 'PKTextAlignmentLeft'
          },
          {
            key: 'customer_id',
            label: 'ID',
            value: customerData.customerId.slice(-6),
            textAlignment: 'PKTextAlignmentRight'
          }
        ],

        backFields: [
          {
            key: 'customer_name',
            label: 'Customer',
            value: `${customerData.firstName} ${customerData.lastName}`
          },
          {
            key: 'offer_details',
            label: 'Offer Details',
            value: offerData.description || offerData.title
          },
          {
            key: 'terms',
            label: 'Terms & Conditions',
            value: 'Valid at participating locations. Cannot be combined with other offers. Subject to availability.'
          }
        ]
      },

      // Barcode for POS scanning
      barcodes: [
        {
          message: customerData.customerId,
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: `Customer ID: ${customerData.customerId}`
        }
      ],

      // Pass relevance and location
      relevantDate: new Date().toISOString(),
      maxDistance: 1000,

      // Demo URLs (in production, these would be real endpoints)
      webServiceURL: `http://localhost:3001/api/passes/`,
      authenticationToken: this.generateAuthToken(customerData.customerId, serialNumber)
    }
  }

  async generatePassImages(offerData) {
    // Generate placeholder images using Sharp
    // In production, these would be actual business logos and branding

    const logoBuffer = await sharp({
      create: {
        width: 58,
        height: 58,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 }
      }
    })
    .png()
    .toBuffer()

    const stripBuffer = await sharp({
      create: {
        width: 624,
        height: 168,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 }
      }
    })
    .png()
    .toBuffer()

    return {
      'logo.png': logoBuffer,
      'logo@2x.png': logoBuffer,
      'strip.png': stripBuffer,
      'strip@2x.png': stripBuffer
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

  async createDemoSignature() {
    // Demo signature for development
    // In production, this would use real Apple certificates:
    // - Pass Type ID Certificate (.p12)
    // - Apple WWDR Certificate (.pem)
    // - Private key for signing

    return Buffer.from('DEMO_SIGNATURE_FOR_DEVELOPMENT_ONLY', 'utf8')
  }

  async createPkpassZip(passData, manifest, signature, images) {
    return new Promise((resolve, reject) => {
      const chunks = []
      const archive = archiver('zip', { zlib: { level: 9 } })

      archive.on('data', chunk => chunks.push(chunk))
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)

      // Add pass.json
      archive.append(JSON.stringify(passData, null, 2), { name: 'pass.json' })

      // Add manifest.json
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

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

      console.log(`Updating Apple Wallet pass ${passId}:`, updateData)

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
}

export default new AppleWalletController()