/**
 * Debug Script: Extract and Analyze Apple Wallet Pass
 *
 * This script generates a test Apple Wallet pass and extracts its contents
 * to help debug installation issues.
 *
 * Usage: node backend/scripts/debug-extract-pass.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'
import crypto from 'crypto'
import appleWalletController from '../controllers/appleWalletController.js'
import appleCertificateValidator from '../utils/appleCertificateValidator.js'
import applePassSigner from '../utils/applePassSigner.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔍 ========================================')
console.log('   Apple Wallet Pass Debug & Extraction')
console.log('========================================\n')

async function generateTestPass() {
  try {
    // Validate certificates first
    console.log('📋 Step 1: Validating Apple Wallet certificates...')
    await appleCertificateValidator.validateAndLoad()
    console.log('✅ Certificates validated\n')

    // Create test data
    console.log('📋 Step 2: Creating test pass data...')
    const testCustomerData = {
      customerId: 'cust_debug_test_12345',
      firstName: 'Debug',
      lastName: 'User',
      joinedDate: new Date().toISOString()
    }

    const testOfferData = {
      offerId: 'off_debug_test_67890',
      businessName: 'Test Business احمد', // Include Arabic to test encoding
      title: 'Debug Test Offer',
      description: 'Test offer for debugging',
      stampsRequired: 10,
      rewardDescription: 'Free Test Item',
      branchName: 'Debug Branch'
    }

    const testProgressData = {
      stampsEarned: 3
    }

    // Generate pass.json
    const passData = appleWalletController.createPassJson(
      testCustomerData,
      testOfferData,
      testProgressData,
      null // no design
    )

    console.log('✅ Pass.json created\n')

    // Generate images
    console.log('📋 Step 3: Generating pass images...')
    const images = await appleWalletController.generatePassImages(testOfferData, null)
    console.log(`✅ Generated ${Object.keys(images).length} image files:`)
    Object.keys(images).forEach(name => {
      console.log(`   - ${name} (${images[name].length} bytes)`)
    })
    console.log('')

    // Create manifest
    console.log('📋 Step 4: Creating manifest.json...')
    const manifest = appleWalletController.createManifest(passData, images)
    console.log(`✅ Manifest created with ${Object.keys(manifest).length} files\n`)

    // Sign manifest
    console.log('📋 Step 5: Signing manifest...')
    const signature = await applePassSigner.signManifest(manifest)
    console.log(`✅ Signature created (${signature.length} bytes)\n`)

    // Create .pkpass ZIP
    console.log('📋 Step 6: Creating .pkpass bundle...')
    const pkpassBuffer = await createPkpassZip(passData, manifest, signature, images)
    console.log(`✅ .pkpass bundle created (${pkpassBuffer.length} bytes)\n`)

    // Save to disk
    const outputPath = path.join(__dirname, '..', 'debug-test-pass.pkpass')
    fs.writeFileSync(outputPath, pkpassBuffer)
    console.log(`✅ Saved to: ${outputPath}\n`)

    return { outputPath, passData, manifest, images }

  } catch (error) {
    console.error('❌ Error generating pass:', error)
    throw error
  }
}

async function createPkpassZip(passData, manifest, signature, images) {
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

async function extractAndAnalyze(passData, manifest, images) {
  console.log('📋 Step 7: Analyzing pass contents...\n')

  console.log('📦 Files that will be in .pkpass bundle:')
  console.log('─'.repeat(60))

  const passJsonStr = JSON.stringify(passData, null, 2)
  console.log(`   pass.json ${passJsonStr.length.toString().padStart(10)} bytes`)

  const manifestStr = JSON.stringify(manifest, null, 2)
  console.log(`   manifest.json ${manifestStr.length.toString().padStart(10)} bytes`)
  console.log(`   signature ${' (varies)'.padStart(10)}`)

  Object.entries(images).forEach(([filename, buffer]) => {
    console.log(`   ${filename.padEnd(25)} ${buffer.length.toString().padStart(10)} bytes`)
  })
  console.log('─'.repeat(60))
  console.log(`   Total files: ${2 + 1 + Object.keys(images).length}\n`)

  // Analyze pass.json
  const passJson = passData

  console.log('📄 ========== PASS.JSON CONTENTS ==========')
  console.log(JSON.stringify(passJson, null, 2))
  console.log('==========================================\n')

  // Validate required fields
  console.log('✅ Required Fields Validation:')
  const requiredFields = [
    'formatVersion',
    'passTypeIdentifier',
    'serialNumber',
    'teamIdentifier',
    'organizationName',
    'description'
  ]

  requiredFields.forEach(field => {
    if (passJson[field]) {
      console.log(`   ✅ ${field}: ${passJson[field]}`)
    } else {
      console.log(`   ❌ ${field}: MISSING!`)
    }
  })

  console.log('\n✅ Style Key:')
  const styleKeys = ['boardingPass', 'coupon', 'eventTicket', 'storeCard', 'generic']
  const foundStyle = styleKeys.find(key => passJson[key])
  if (foundStyle) {
    console.log(`   ✅ ${foundStyle}: present`)
  } else {
    console.log(`   ❌ No style key found!`)
  }

  console.log('\n📊 Optional Fields:')
  if (passJson.barcodes) console.log(`   ✅ barcodes: ${passJson.barcodes.length} barcode(s)`)
  if (passJson.backgroundColor) console.log(`   ✅ backgroundColor: ${passJson.backgroundColor}`)
  if (passJson.foregroundColor) console.log(`   ✅ foregroundColor: ${passJson.foregroundColor}`)
  if (passJson.labelColor) console.log(`   ✅ labelColor: ${passJson.labelColor}`)
  if (passJson.logoText) console.log(`   ✅ logoText: ${passJson.logoText}`)
  console.log('')

  // Analyze manifest.json
  console.log('📄 ========== MANIFEST.JSON CONTENTS ==========')
  console.log(JSON.stringify(manifest, null, 2))
  console.log('===============================================\n')

  // Check for required icon.png
  console.log('🖼️  Image Files Check:')
  const requiredImages = ['icon.png', 'icon@2x.png']
  requiredImages.forEach(imgName => {
    if (images[imgName]) {
      console.log(`   ✅ ${imgName}: present (${images[imgName].length} bytes)`)
    } else {
      console.log(`   ❌ ${imgName}: MISSING! (REQUIRED)`)
    }
  })

  const optionalImages = ['icon@3x.png', 'logo.png', 'logo@2x.png', 'strip.png', 'strip@2x.png']
  optionalImages.forEach(imgName => {
    if (images[imgName]) {
      console.log(`   ✅ ${imgName}: present (${images[imgName].length} bytes)`)
    }
  })
  console.log('')
}

async function main() {
  try {
    // Generate test pass
    const { outputPath, passData, manifest, images } = await generateTestPass()

    // Analyze contents
    await extractAndAnalyze(passData, manifest, images)

    console.log('🎉 ========================================')
    console.log('   Debug analysis completed successfully!')
    console.log('========================================\n')
    console.log(`📁 .pkpass file location: ${outputPath}`)
    console.log(`📱 You can transfer this file to your iPhone and try installing it\n`)

  } catch (error) {
    console.error('\n❌ Debug script failed:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
main()
