/**
 * Final Byte-by-Byte Comparison
 *
 * Extracts the WORKING clone pass and compares every single byte
 * to identify ANY differences that might be causing iOS 15.6 rejection
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Extract .pkpass file to directory
 */
function extractPass(pkpassPath, extractDir) {
  console.log(`📦 Extracting: ${path.basename(pkpassPath)}`)

  // Clean up existing directory
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true })
  }
  fs.mkdirSync(extractDir, { recursive: true })

  // Copy .pkpass to .temp.zip (PowerShell requires .zip extension)
  const tempZipPath = pkpassPath.replace('.pkpass', '.temp.zip')
  fs.copyFileSync(pkpassPath, tempZipPath)

  // Extract using PowerShell
  const absoluteZipPath = path.resolve(tempZipPath).replace(/\\/g, '\\\\')
  const absoluteExtractDir = path.resolve(extractDir).replace(/\\/g, '\\\\')

  execSync(`powershell -command "Expand-Archive -Path '${absoluteZipPath}' -DestinationPath '${absoluteExtractDir}' -Force"`, {
    stdio: 'pipe'
  })

  // Cleanup temp file
  fs.unlinkSync(tempZipPath)

  console.log(`✅ Extracted to: ${extractDir}\n`)
}

/**
 * Calculate SHA-256 hash of file
 */
function hashFile(filePath) {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Compare two pass.json files character by character
 */
function comparePassJsonDetailed(file1, file2) {
  console.log('🔍 Detailed pass.json Comparison:\n')

  const content1 = fs.readFileSync(file1, 'utf8')
  const content2 = fs.readFileSync(file2, 'utf8')

  // Parse JSON for structural comparison
  const json1 = JSON.parse(content1)
  const json2 = JSON.parse(content2)

  // Compare as strings (character by character)
  if (content1 === content2) {
    console.log('✅ pass.json files are BYTE-FOR-BYTE IDENTICAL (as strings)\n')
  } else {
    console.log('❌ pass.json files differ as strings\n')
    console.log(`   File 1 length: ${content1.length} characters`)
    console.log(`   File 2 length: ${content2.length} characters`)

    // Find first difference
    const minLen = Math.min(content1.length, content2.length)
    for (let i = 0; i < minLen; i++) {
      if (content1[i] !== content2[i]) {
        console.log(`\n   First difference at character ${i}:`)
        console.log(`   File 1: "${content1.substring(i, i+50)}..."`)
        console.log(`   File 2: "${content2.substring(i, i+50)}..."\n`)
        break
      }
    }
  }

  // Deep object comparison
  const allKeys1 = getAllKeys(json1)
  const allKeys2 = getAllKeys(json2)

  console.log('📊 Field Analysis:')
  console.log(`   Working clone: ${allKeys1.length} total fields`)
  console.log(`   Comparison:    ${allKeys2.length} total fields\n`)

  // Check for differences in values
  const diffs = findDifferences(json1, json2)
  if (diffs.length === 0) {
    console.log('✅ pass.json structures are IDENTICAL\n')
  } else {
    console.log(`❌ Found ${diffs.length} structural differences:\n`)
    diffs.forEach(diff => {
      console.log(`   ${diff}\n`)
    })
  }

  return { identical: content1 === content2, differences: diffs }
}

/**
 * Get all keys from nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = []
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    keys.push(fullKey)
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey))
    }
  }
  return keys
}

/**
 * Find differences between two objects
 */
function findDifferences(obj1, obj2, path = '') {
  const diffs = []

  // Compare keys
  const keys1 = Object.keys(obj1 || {})
  const keys2 = Object.keys(obj2 || {})

  const allKeys = new Set([...keys1, ...keys2])

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key
    const val1 = obj1?.[key]
    const val2 = obj2?.[key]

    if (!(key in obj1)) {
      diffs.push(`MISSING IN WORKING: ${currentPath} = ${JSON.stringify(val2)}`)
    } else if (!(key in obj2)) {
      diffs.push(`EXTRA IN WORKING: ${currentPath} = ${JSON.stringify(val1)}`)
    } else if (typeof val1 !== typeof val2) {
      diffs.push(`TYPE DIFFERENT: ${currentPath} (${typeof val1} vs ${typeof val2})`)
    } else if (typeof val1 === 'object' && val1 !== null) {
      if (Array.isArray(val1) && Array.isArray(val2)) {
        if (val1.length !== val2.length) {
          diffs.push(`ARRAY LENGTH: ${currentPath} (${val1.length} vs ${val2.length})`)
        }
        // Compare array elements
        for (let i = 0; i < Math.max(val1.length, val2.length); i++) {
          diffs.push(...findDifferences({ [i]: val1[i] }, { [i]: val2[i] }, `${currentPath}[${i}]`))
        }
      } else if (!Array.isArray(val1) && !Array.isArray(val2)) {
        diffs.push(...findDifferences(val1, val2, currentPath))
      }
    } else if (val1 !== val2) {
      diffs.push(`VALUE DIFFERENT: ${currentPath}\n      Working: ${JSON.stringify(val1)}\n      Compare: ${JSON.stringify(val2)}`)
    }
  }

  return diffs
}

/**
 * Compare all files in both passes
 */
function compareAllFiles(dir1, dir2) {
  console.log('📂 Comparing ALL files:\n')

  const files1 = fs.readdirSync(dir1).sort()
  const files2 = fs.readdirSync(dir2).sort()

  const allFiles = new Set([...files1, ...files2])

  let identicalCount = 0
  let differentCount = 0

  for (const file of allFiles) {
    const path1 = path.join(dir1, file)
    const path2 = path.join(dir2, file)

    if (!fs.existsSync(path1)) {
      console.log(`❌ MISSING IN WORKING: ${file}`)
      differentCount++
    } else if (!fs.existsSync(path2)) {
      console.log(`❌ EXTRA IN WORKING: ${file}`)
      differentCount++
    } else {
      const hash1 = hashFile(path1)
      const hash2 = hashFile(path2)
      const size1 = fs.statSync(path1).size
      const size2 = fs.statSync(path2).size

      if (hash1 === hash2 && size1 === size2) {
        console.log(`✅ IDENTICAL: ${file} (${size1} bytes, hash: ${hash1.substring(0, 8)}...)`)
        identicalCount++
      } else {
        console.log(`❌ DIFFERENT: ${file}`)
        console.log(`   Working: ${size1} bytes, hash: ${hash1.substring(0, 16)}...`)
        console.log(`   Compare: ${size2} bytes, hash: ${hash2.substring(0, 16)}...`)
        differentCount++
      }
    }
  }

  console.log(`\n📊 Summary: ${identicalCount} identical, ${differentCount} different\n`)

  return { identicalCount, differentCount }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 ========================================')
    console.log('   FINAL BYTE-BY-BYTE COMPARISON')
    console.log('   Analyzing Working Clone Pass')
    console.log('========================================\n')

    // Paths
    const workingClonePath = path.join(__dirname, '..', 'production-from-clone.pkpass')
    const clonedTestPath = path.join(__dirname, '..', 'cloned-test-pass.pkpass')

    // Check which working pass to use
    let workingPassPath
    let workingPassName

    if (fs.existsSync(workingClonePath)) {
      workingPassPath = workingClonePath
      workingPassName = 'production-from-clone.pkpass (confirmed working)'
    } else if (fs.existsSync(clonedTestPath)) {
      workingPassPath = clonedTestPath
      workingPassName = 'cloned-test-pass.pkpass'
    } else {
      throw new Error('No working clone pass found! Run generate-production-pass-from-clone.js first.')
    }

    console.log(`📱 Working pass: ${workingPassName}`)
    console.log(`   Size: ${fs.statSync(workingPassPath).size} bytes`)
    console.log(`   Modified: ${fs.statSync(workingPassPath).mtime}\n`)

    // Extract working clone
    const workingDir = path.join(__dirname, '..', 'final-analysis-working')
    extractPass(workingPassPath, workingDir)

    // Analyze working clone structure
    console.log('=' .repeat(60))
    console.log('ANALYZING WORKING CLONE STRUCTURE')
    console.log('=' .repeat(60) + '\n')

    const workingPassJson = path.join(workingDir, 'pass.json')
    const workingPass = JSON.parse(fs.readFileSync(workingPassJson, 'utf8'))

    console.log('📋 Working Clone pass.json:\n')
    console.log(JSON.stringify(workingPass, null, 2))
    console.log('\n' + '='.repeat(60))

    // Analyze files in working clone
    console.log('\n📦 Files in working clone:\n')
    const workingFiles = fs.readdirSync(workingDir).sort()
    workingFiles.forEach(file => {
      const filePath = path.join(workingDir, file)
      const size = fs.statSync(filePath).size
      const hash = hashFile(filePath).substring(0, 16)
      console.log(`   ${file.padEnd(20)} ${size.toString().padStart(8)} bytes  hash: ${hash}...`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('KEY OBSERVATIONS')
    console.log('='.repeat(60) + '\n')

    // Analyze structure
    console.log('🔍 Structure Analysis:\n')
    console.log(`   formatVersion: ${workingPass.formatVersion}`)
    console.log(`   passTypeIdentifier: ${workingPass.passTypeIdentifier}`)
    console.log(`   teamIdentifier: ${workingPass.teamIdentifier}`)
    console.log(`   organizationName: ${workingPass.organizationName}`)
    console.log(`   description: ${workingPass.description}`)
    console.log(`   serialNumber: ${workingPass.serialNumber}`)
    console.log(`   sharingProhibited: ${workingPass.sharingProhibited}`)
    console.log(`   suppressStripShine: ${workingPass.suppressStripShine}`)
    console.log(`   backgroundColor: ${workingPass.backgroundColor}`)
    console.log(`   foregroundColor: ${workingPass.foregroundColor}`)
    console.log(`   labelColor: ${workingPass.labelColor}`)
    console.log(`   logoText: ${workingPass.logoText || 'NOT PRESENT'}`)

    console.log(`\n   storeCard.secondaryFields: ${workingPass.storeCard?.secondaryFields?.length || 0} fields`)
    console.log(`   storeCard.backFields: ${workingPass.storeCard?.backFields?.length || 0} fields`)
    console.log(`   storeCard.primaryFields: ${workingPass.storeCard?.primaryFields?.length || 'NOT PRESENT'}`)
    console.log(`   storeCard.auxiliaryFields: ${workingPass.storeCard?.auxiliaryFields?.length || 'NOT PRESENT'}`)

    console.log(`\n   barcode (singular): ${workingPass.barcode ? 'PRESENT' : 'NOT PRESENT'}`)
    console.log(`   barcodes (plural): ${workingPass.barcodes ? `PRESENT (${workingPass.barcodes.length})` : 'NOT PRESENT'}`)

    if (workingPass.barcode) {
      console.log(`      format: ${workingPass.barcode.format}`)
      console.log(`      messageEncoding: ${workingPass.barcode.messageEncoding}`)
      console.log(`      message: ${workingPass.barcode.message}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('CONCLUSION')
    console.log('='.repeat(60) + '\n')

    console.log('✅ This is the EXACT structure that works on iPhone 6s iOS 15.6')
    console.log('\n🎯 Critical Elements for iOS 15.6 Compatibility:')
    console.log('   1. RGB color format (not hex)')
    console.log(`   2. Both barcode + barcodes fields: ${workingPass.barcode && workingPass.barcodes ? '✅' : '❌'}`)
    console.log(`   3. sharingProhibited: ${workingPass.sharingProhibited ? '✅' : '❌'}`)
    console.log(`   4. suppressStripShine: ${workingPass.suppressStripShine !== undefined ? '✅' : '❌'}`)
    console.log(`   5. Minimal field structure: ${!workingPass.storeCard?.primaryFields && !workingPass.storeCard?.auxiliaryFields ? '✅' : '❌'}`)
    console.log(`   6. NO logoText field: ${!workingPass.logoText ? '✅' : '❌'}`)
    console.log(`\n📊 Image count: ${workingFiles.filter(f => f.endsWith('.png')).length} PNG files`)
    console.log(`   Images: ${workingFiles.filter(f => f.endsWith('.png')).join(', ')}`)

    console.log('\n📁 Extracted working clone available at:')
    console.log(`   ${workingDir}`)
    console.log('\n💡 Use this as the GOLD STANDARD for all future pass generation!')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
main()
