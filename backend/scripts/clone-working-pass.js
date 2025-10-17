/**
 * Clone Working Pass Script
 *
 * Takes the working test.pkpass structure and creates a new pass
 * with your Apple Developer credentials, keeping everything else the same.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import archiver from 'archiver'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import sequelize from '../config/database.js'
import applePassSigner from '../utils/applePassSigner.js'
import appleCertificateValidator from '../utils/appleCertificateValidator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Your Apple Developer credentials
const YOUR_PASS_TYPE_ID = 'pass.me.madna.api'
const YOUR_TEAM_ID = 'NFQ6M7TFY2'

// Working pass template (from the Loopy Loyalty pass that works)
const WORKING_PASS_TEMPLATE = {
  "description": "Test Loyalty Card - Clone",
  "formatVersion": 1,
  "organizationName": "Test Business",
  "passTypeIdentifier": YOUR_PASS_TYPE_ID,  // Your credentials
  "serialNumber": "clone_test_" + Date.now(),  // Unique serial
  "teamIdentifier": YOUR_TEAM_ID,  // Your credentials
  "sharingProhibited": true,
  "storeCard": {
    "backFields": [
      {
        "dataDetectorTypes": [
          "PKDataDetectorTypePhoneNumber",
          "PKDataDetectorTypeLink",
          "PKDataDetectorTypeAddress",
          "PKDataDetectorTypeCalendarEvent"
        ],
        "key": "b0_0",
        "label": "Terms and Conditions",
        "value": "This is a test loyalty card. Valid at participating locations."
      }
    ],
    "secondaryFields": [
      {
        "key": "s0",
        "label": "Progress",
        "textAlignment": "PKTextAlignmentLeft",
        "value": "0 of 10"
      }
    ]
  },
  // CRITICAL: Both singular and plural barcode fields for iOS 15 compatibility
  "barcode": {
    "altText": "Test Customer ID",
    "format": "PKBarcodeFormatQR",
    "message": "test_customer_123",
    "messageEncoding": "iso-8859-1"
  },
  "barcodes": [
    {
      "altText": "Test Customer ID",
      "format": "PKBarcodeFormatQR",
      "message": "test_customer_123",
      "messageEncoding": "iso-8859-1"
    }
  ],
  // CRITICAL: RGB format for colors (not hex)
  "backgroundColor": "rgb(59,130,246)",  // Blue
  "foregroundColor": "rgb(255,255,255)",  // White
  "labelColor": "rgb(255,255,255)",  // White
  "suppressStripShine": false
  // Note: Removed webServiceURL and authenticationToken as we don't need dynamic updates
}

/**
 * Generate simple test images (using same approach as working pass)
 */
async function generateImages() {
  console.log('📷 Generating test images...')

  const images = {}

  // Create simple colored squares for testing (matching working pass structure)
  // Working pass only has @2x versions of icon, logo, strip

  // icon@2x.png - 58x58 pixels (@2x of 29x29)
  const iconBuffer = await sharp({
    create: {
      width: 58,
      height: 58,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 }
    }
  })
    .png()
    .toBuffer()
  images['icon@2x.png'] = iconBuffer

  // logo@2x.png - 320x100 pixels (@2x of 160x50)
  const logoBuffer = await sharp({
    create: {
      width: 320,
      height: 100,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 }
    }
  })
    .png()
    .toBuffer()
  images['logo@2x.png'] = logoBuffer

  // strip@2x.png - 750x246 pixels (@2x of 375x123)
  const stripBuffer = await sharp({
    create: {
      width: 750,
      height: 246,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 }
    }
  })
    .png()
    .toBuffer()
  images['strip@2x.png'] = stripBuffer

  console.log(`✅ Generated ${Object.keys(images).length} images (matching working pass structure)`)

  return images
}

/**
 * Create manifest.json with SHA-1 hashes
 */
function createManifest(passData, images) {
  console.log('📋 Creating manifest.json...')

  const manifest = {}

  // Hash pass.json
  const passJson = JSON.stringify(passData)
  manifest['pass.json'] = crypto.createHash('sha1').update(passJson).digest('hex')

  // Hash all image files
  for (const [filename, buffer] of Object.entries(images)) {
    manifest[filename] = crypto.createHash('sha1').update(buffer).digest('hex')
  }

  console.log(`✅ Manifest created with ${Object.keys(manifest).length} files`)

  return manifest
}

/**
 * Create .pkpass ZIP bundle
 */
async function createPkpassZip(passData, manifest, signature, images) {
  console.log('📦 Creating .pkpass bundle...')

  return new Promise((resolve, reject) => {
    const chunks = []
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    archive.on('data', chunk => chunks.push(chunk))
    archive.on('end', () => {
      const buffer = Buffer.concat(chunks)
      console.log(`✅ .pkpass bundle created (${buffer.length} bytes)`)
      resolve(buffer)
    })
    archive.on('error', reject)

    // Add pass.json
    archive.append(JSON.stringify(passData), { name: 'pass.json' })

    // Add manifest.json
    archive.append(JSON.stringify(manifest), { name: 'manifest.json' })

    // Add signature
    archive.append(signature, { name: 'signature' })

    // Add all image files
    for (const [filename, buffer] of Object.entries(images)) {
      archive.append(buffer, { name: filename })
    }

    archive.finalize()
  })
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 ========================================')
    console.log('   Clone Working Pass Script')
    console.log('========================================\n')

    // Step 1: Load and validate certificates
    console.log('📋 Step 1: Loading Apple Wallet certificates...')
    await appleCertificateValidator.validateAndLoad()

    const certInfo = applePassSigner.getCertificateInfo()
    if (!certInfo) {
      throw new Error('Failed to get certificate information.')
    }
    console.log('✅ Certificates loaded and validated')
    console.log(`   Pass Type ID: ${certInfo.passTypeId}`)
    console.log(`   Team ID: ${certInfo.teamId}\n`)

    // Verify credentials match
    if (certInfo.passTypeId !== YOUR_PASS_TYPE_ID) {
      throw new Error(`Certificate Pass Type ID (${certInfo.passTypeId}) doesn't match YOUR_PASS_TYPE_ID (${YOUR_PASS_TYPE_ID})`)
    }
    if (certInfo.teamId !== YOUR_TEAM_ID) {
      throw new Error(`Certificate Team ID (${certInfo.teamId}) doesn't match YOUR_TEAM_ID (${YOUR_TEAM_ID})`)
    }

    // Step 2: Create pass.json (using working template structure)
    console.log('📋 Step 2: Creating pass.json from working template...')
    const passData = WORKING_PASS_TEMPLATE
    console.log('✅ Pass.json created using proven structure')
    console.log(`   Serial Number: ${passData.serialNumber}`)
    console.log(`   Organization: ${passData.organizationName}`)
    console.log(`   Colors: ${passData.backgroundColor} / ${passData.foregroundColor}\n`)

    // Step 3: Generate images (matching working pass structure)
    console.log('📋 Step 3: Generating images...')
    const images = await generateImages()
    console.log()

    // Step 4: Create manifest
    console.log('📋 Step 4: Creating manifest.json...')
    const manifest = createManifest(passData, images)
    console.log()

    // Step 5: Sign manifest
    console.log('📋 Step 5: Signing manifest...')
    const signature = await applePassSigner.signManifest(manifest)
    console.log(`✅ Signature created (${signature.length} bytes)\n`)

    // Step 6: Create .pkpass bundle
    console.log('📋 Step 6: Creating .pkpass bundle...')
    const pkpassBuffer = await createPkpassZip(passData, manifest, signature, images)
    console.log()

    // Step 7: Save to file
    const outputPath = path.join(__dirname, '..', 'cloned-test-pass.pkpass')
    fs.writeFileSync(outputPath, pkpassBuffer)
    console.log(`✅ Saved to: ${outputPath}`)

    // Step 8: Summary
    console.log('\n🎉 ========================================')
    console.log('   Cloned pass created successfully!')
    console.log('========================================\n')
    console.log('📋 Pass Details:')
    console.log(`   Structure: Copied from working Loopy Loyalty pass`)
    console.log(`   Pass Type ID: ${passData.passTypeIdentifier}`)
    console.log(`   Team ID: ${passData.teamIdentifier}`)
    console.log(`   Serial Number: ${passData.serialNumber}`)
    console.log(`   Colors: RGB format (${passData.backgroundColor})`)
    console.log(`   Barcode: Both singular + plural fields (iOS 15 compatible)`)
    console.log(`   Images: Only @2x versions (matching working pass)`)
    console.log(`   File Size: ${pkpassBuffer.length} bytes`)
    console.log('\n📱 Transfer this file to your iPhone 6s and test installation!')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
main()
