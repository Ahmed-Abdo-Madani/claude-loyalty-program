/**
 * Compare Working Pass vs Our Generated Pass
 *
 * This script extracts and compares a working .pkpass file from another website
 * with our generated pass to identify differences.
 *
 * Usage: node backend/scripts/compare-passes.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔍 ========================================')
console.log('   Apple Wallet Pass Comparison Tool')
console.log('========================================\n')

function extractPass(pkpassPath, extractDir) {
  console.log(`📦 Extracting: ${path.basename(pkpassPath)}`)

  // Create extract directory
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true })
  }
  fs.mkdirSync(extractDir, { recursive: true })

  // Copy pkpass to temp zip file (PowerShell requires .zip extension)
  const tempZipPath = pkpassPath.replace('.pkpass', '.temp.zip')
  fs.copyFileSync(pkpassPath, tempZipPath)

  const absoluteZipPath = path.resolve(tempZipPath)
  const absoluteExtractDir = path.resolve(extractDir)

  try {
    execSync(`powershell -command "Expand-Archive -Path '${absoluteZipPath}' -DestinationPath '${absoluteExtractDir}' -Force"`, {
      stdio: 'pipe'
    })
    console.log(`✅ Extracted to: ${extractDir}\n`)

    // Clean up temp zip
    fs.unlinkSync(tempZipPath)
  } catch (error) {
    // Clean up temp zip on error
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath)
    }
    console.error(`❌ Failed to extract: ${error.message}`)
    throw error
  }

  return extractDir
}

function analyzePass(extractDir, label) {
  console.log(`\n📄 ========== ${label} ==========\n`)

  // List all files
  const files = fs.readdirSync(extractDir)
  console.log(`📦 Files (${files.length} total):`)
  files.forEach(file => {
    const stats = fs.statSync(path.join(extractDir, file))
    console.log(`   ${file.padEnd(25)} ${stats.size.toString().padStart(8)} bytes`)
  })
  console.log('')

  // Read and display pass.json
  const passJsonPath = path.join(extractDir, 'pass.json')
  if (fs.existsSync(passJsonPath)) {
    const passJson = JSON.parse(fs.readFileSync(passJsonPath, 'utf8'))

    console.log('📋 pass.json structure:')
    console.log('─'.repeat(60))
    console.log(JSON.stringify(passJson, null, 2))
    console.log('─'.repeat(60))
    console.log('')

    // Key fields
    console.log('🔑 Key Fields:')
    console.log(`   formatVersion: ${passJson.formatVersion}`)
    console.log(`   passTypeIdentifier: ${passJson.passTypeIdentifier}`)
    console.log(`   teamIdentifier: ${passJson.teamIdentifier}`)
    console.log(`   organizationName: ${passJson.organizationName}`)
    console.log(`   description: ${passJson.description}`)

    // Colors
    console.log('\n🎨 Colors:')
    console.log(`   backgroundColor: ${passJson.backgroundColor}`)
    console.log(`   foregroundColor: ${passJson.foregroundColor}`)
    console.log(`   labelColor: ${passJson.labelColor || 'not set'}`)

    // Style
    console.log('\n📱 Pass Style:')
    const styles = ['boardingPass', 'coupon', 'eventTicket', 'generic', 'storeCard']
    const foundStyle = styles.find(s => passJson[s])
    if (foundStyle) {
      console.log(`   Style: ${foundStyle}`)
      console.log(`   Fields: ${JSON.stringify(passJson[foundStyle], null, 2)}`)
    }

    // Barcodes
    console.log('\n📊 Barcodes:')
    if (passJson.barcodes) {
      passJson.barcodes.forEach((barcode, i) => {
        console.log(`   [${i}] format: ${barcode.format}`)
        console.log(`       encoding: ${barcode.messageEncoding}`)
        console.log(`       message: ${barcode.message}`)
      })
    } else if (passJson.barcode) {
      console.log(`   format: ${passJson.barcode.format}`)
      console.log(`   encoding: ${passJson.barcode.messageEncoding}`)
      console.log(`   message: ${passJson.barcode.message}`)
    } else {
      console.log('   No barcodes')
    }

    // Optional fields
    console.log('\n📝 Optional Fields:')
    const optionalFields = [
      'logoText',
      'relevantDate',
      'expirationDate',
      'voided',
      'webServiceURL',
      'authenticationToken',
      'locations',
      'maxDistance',
      'beacons',
      'nfc'
    ]
    optionalFields.forEach(field => {
      if (passJson[field] !== undefined) {
        const value = typeof passJson[field] === 'object'
          ? JSON.stringify(passJson[field])
          : passJson[field]
        console.log(`   ${field}: ${value}`)
      }
    })

    return passJson
  } else {
    console.log('❌ pass.json not found!')
    return null
  }
}

function compareFields(workingPass, ourPass) {
  console.log('\n\n🔍 ========== COMPARISON ==========\n')

  console.log('📊 Field-by-Field Comparison:')
  console.log('─'.repeat(80))

  // Compare all fields
  const allKeys = new Set([
    ...Object.keys(workingPass || {}),
    ...Object.keys(ourPass || {})
  ])

  allKeys.forEach(key => {
    const workingValue = workingPass?.[key]
    const ourValue = ourPass?.[key]

    if (JSON.stringify(workingValue) === JSON.stringify(ourValue)) {
      console.log(`✅ ${key}: SAME`)
    } else if (workingValue === undefined) {
      console.log(`⚠️  ${key}: ONLY IN OUR PASS`)
      console.log(`     Our: ${JSON.stringify(ourValue)}`)
    } else if (ourValue === undefined) {
      console.log(`❌ ${key}: MISSING IN OUR PASS (present in working pass)`)
      console.log(`     Working: ${JSON.stringify(workingValue)}`)
    } else {
      console.log(`❌ ${key}: DIFFERENT`)
      console.log(`     Working: ${JSON.stringify(workingValue)}`)
      console.log(`     Our:     ${JSON.stringify(ourValue)}`)
    }
  })

  console.log('─'.repeat(80))
}

function compareImages(workingDir, ourDir) {
  console.log('\n\n🖼️  ========== IMAGE COMPARISON ==========\n')

  const workingFiles = fs.readdirSync(workingDir).filter(f => f.endsWith('.png'))
  const ourFiles = fs.readdirSync(ourDir).filter(f => f.endsWith('.png'))

  console.log('📦 Image Files:')
  console.log('─'.repeat(80))
  console.log('File Name                 Working Pass    Our Pass        Status')
  console.log('─'.repeat(80))

  const allImages = new Set([...workingFiles, ...ourFiles])

  allImages.forEach(img => {
    const inWorking = workingFiles.includes(img)
    const inOurs = ourFiles.includes(img)

    let workingSize = inWorking ? fs.statSync(path.join(workingDir, img)).size : '-'
    let ourSize = inOurs ? fs.statSync(path.join(ourDir, img)).size : '-'

    let status = ''
    if (inWorking && inOurs) {
      status = workingSize === ourSize ? '✅ SAME' : '⚠️  DIFF SIZE'
    } else if (inWorking && !inOurs) {
      status = '❌ MISSING IN OURS'
    } else {
      status = '⚠️  EXTRA IN OURS'
    }

    console.log(`${img.padEnd(25)} ${workingSize.toString().padStart(8)}    ${ourSize.toString().padStart(8)}        ${status}`)
  })
  console.log('─'.repeat(80))
}

async function main() {
  try {
    const backendDir = path.join(__dirname, '..')

    // Paths to .pkpass files
    const workingPassPath = path.join(backendDir, 'test.pkpass')
    const ourPassPath = path.join(backendDir, 'debug-test-pass.pkpass')

    // Check files exist
    if (!fs.existsSync(workingPassPath)) {
      console.error('❌ Working pass not found: test.pkpass')
      console.log('   Please ensure test.pkpass is in the backend directory')
      process.exit(1)
    }

    if (!fs.existsSync(ourPassPath)) {
      console.error('❌ Our pass not found: debug-test-pass.pkpass')
      console.log('   Run: node backend/scripts/debug-extract-pass.js first')
      process.exit(1)
    }

    // Extract both passes
    const workingExtractDir = path.join(backendDir, 'temp-working-pass')
    const ourExtractDir = path.join(backendDir, 'temp-our-pass')

    extractPass(workingPassPath, workingExtractDir)
    extractPass(ourPassPath, ourExtractDir)

    // Analyze both
    const workingPass = analyzePass(workingExtractDir, 'WORKING PASS (from website)')
    const ourPass = analyzePass(ourExtractDir, 'OUR GENERATED PASS')

    // Compare
    compareFields(workingPass, ourPass)
    compareImages(workingExtractDir, ourExtractDir)

    // Cleanup
    console.log('\n\n🧹 Cleaning up temporary directories...')
    fs.rmSync(workingExtractDir, { recursive: true })
    fs.rmSync(ourExtractDir, { recursive: true })

    console.log('\n✅ Comparison complete!')
    console.log('\n💡 Key Differences to Fix:')
    console.log('   - Check fields marked with ❌ above')
    console.log('   - Missing images need to be added')
    console.log('   - Different values need to be corrected\n')

  } catch (error) {
    console.error('\n❌ Comparison failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
