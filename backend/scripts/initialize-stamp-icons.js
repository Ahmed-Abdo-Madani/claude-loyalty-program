/**
 * Stamp Icons Initialization Script
 * 
 * Automatically generates SVG icon files and PNG previews for the stamp icons system.
 * Runs on server startup to ensure icons are available before API starts serving requests.
 * 
 * Features:
 * - Programmatic SVG generation (no manual file creation needed)
 * - Automatic PNG preview generation using Sharp
 * - Idempotent operation (safe to run multiple times)
 * - Graceful error handling with helpful messages
 * - Production-ready logging
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Get current file directory for path resolution
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const ICONS_PATH = path.join(__dirname, '..', '..', 'uploads', 'icons', 'stamps')
const PREVIEWS_PATH = path.join(ICONS_PATH, 'previews')
const MANIFEST_PATH = path.join(ICONS_PATH, 'manifest.json')

// SVG Templates
const COFFEE_SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 25 40 L 75 40 L 70 85 L 30 85 Z" fill="#8B4513"/>
  <path d="M 75 50 Q 90 60 75 70" stroke="#8B4513" stroke-width="8" fill="none"/>
  <path d="M 40 35 Q 42 25 40 15" stroke="#A0826D" stroke-width="3" fill="none" opacity="0.7"/>
  <path d="M 50 35 Q 52 25 50 15" stroke="#A0826D" stroke-width="3" fill="none" opacity="0.7"/>
  <path d="M 60 35 Q 62 25 60 15" stroke="#A0826D" stroke-width="3" fill="none" opacity="0.7"/>
</svg>`

const GIFT_SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="20" y="50" width="60" height="35" fill="#E74C3C" rx="2"/>
  <rect x="15" y="42" width="70" height="10" fill="#C0392B"/>
  <rect x="47" y="42" width="6" height="43" fill="#F8B739"/>
  <circle cx="45" cy="38" r="5" fill="#F8B739"/>
  <circle cx="55" cy="38" r="5" fill="#F8B739"/>
  <circle cx="50" cy="38" r="3" fill="#F39C12"/>
</svg>`

/**
 * Ensure directory exists, creating it if necessary
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      console.log(`✅ Created directory: ${dirPath}`)
      return true
    }
    console.log(`✅ Directory exists: ${dirPath}`)
    return true
  } catch (error) {
    if (error.code === 'EACCES') {
      console.error(`❌ Permission denied creating directory: ${dirPath}`)
      console.error('   Run Dockerfile with proper directory creation before USER node')
    } else if (error.code === 'ENOENT') {
      console.error(`❌ Directory not found: ${dirPath}`)
      console.error('   Check that parent directories exist')
    } else {
      console.error(`❌ Error creating directory: ${error.message}`)
    }
    return false
  }
}

/**
 * Create SVG file from template
 */
function createSVGFile(filename, svgContent) {
  try {
    const filePath = path.join(ICONS_PATH, filename)
    
    // Skip if file already exists (idempotent)
    if (fs.existsSync(filePath)) {
      console.log(`✅ File already exists: ${filename}`)
      return true
    }
    
    fs.writeFileSync(filePath, svgContent, 'utf8')
    console.log(`✅ Created ${filename}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to create ${filename}: ${error.message}`)
    return false
  }
}

/**
 * Generate PNG preview from SVG file
 */
async function generatePreviewFromSVG(svgFilename, previewFilename) {
  try {
    const svgPath = path.join(ICONS_PATH, svgFilename)
    const previewPath = path.join(PREVIEWS_PATH, previewFilename)
    
    // Skip if preview already exists (idempotent)
    if (fs.existsSync(previewPath)) {
      console.log(`✅ Preview already exists: ${previewFilename}`)
      return true
    }
    
    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath)
    
    // Convert to PNG using Sharp
    await sharp(svgBuffer)
      .resize(50, 50, { 
        fit: 'contain', 
        background: { r: 255, g: 255, b: 255, alpha: 0 } 
      })
      .png()
      .toFile(previewPath)
    
    console.log(`✅ Generated ${previewFilename}`)
    return true
  } catch (error) {
    if (error.message.includes('Sharp')) {
      console.error(`❌ Failed to generate ${previewFilename}: Sharp error`)
      console.error('   Ensure Sharp is installed: npm install sharp')
    } else {
      console.error(`❌ Failed to generate ${previewFilename}: ${error.message}`)
    }
    return false
  }
}

/**
 * Verify manifest.json exists and is valid
 */
function verifyManifestExists() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error(`❌ Manifest not found: ${MANIFEST_PATH}`)
      return false
    }
    
    // Try to parse JSON to verify validity
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8')
    JSON.parse(manifestContent)
    
    console.log('✅ Manifest verified: manifest.json')
    return true
  } catch (error) {
    console.error(`❌ Invalid manifest.json: ${error.message}`)
    return false
  }
}

/**
 * Main initialization function
 */
export async function initializeStampIcons() {
  console.log('🎨 Initializing stamp icons system...')
  console.log(`📁 Icons path: ${ICONS_PATH}`)
  console.log(`📁 Previews path: ${PREVIEWS_PATH}`)
  
  const errors = []
  let svgCount = 0
  let previewCount = 0
  
  // 1. Verify manifest exists
  if (!verifyManifestExists()) {
    errors.push('Manifest not found or invalid')
    return { success: false, svgCount, previewCount, errors }
  }
  
  // 2. Ensure directories exist
  if (!ensureDirectoryExists(ICONS_PATH)) {
    errors.push('Failed to create icons directory')
    return { success: false, svgCount, previewCount, errors }
  }
  
  if (!ensureDirectoryExists(PREVIEWS_PATH)) {
    errors.push('Failed to create previews directory')
    return { success: false, svgCount, previewCount, errors }
  }
  
  // 3. Create SVG files
  if (createSVGFile('coffee-filled.svg', COFFEE_SVG_TEMPLATE)) {
    svgCount++
  } else {
    errors.push('Failed to create coffee-filled.svg')
  }
  
  if (createSVGFile('gift-filled.svg', GIFT_SVG_TEMPLATE)) {
    svgCount++
  } else {
    errors.push('Failed to create gift-filled.svg')
  }
  
  // 4. Generate PNG previews
  if (await generatePreviewFromSVG('coffee-filled.svg', 'coffee-preview.png')) {
    previewCount++
  } else {
    errors.push('Failed to generate coffee-preview.png')
  }
  
  if (await generatePreviewFromSVG('gift-filled.svg', 'gift-preview.png')) {
    previewCount++
  } else {
    errors.push('Failed to generate gift-preview.png')
  }
  
  // 5. Log summary
  console.log(`📊 Files created: ${svgCount} SVGs, ${previewCount} previews`)
  
  if (errors.length === 0) {
    console.log('✅ Stamp icons initialized successfully')
    return { success: true, svgCount, previewCount, errors: [] }
  } else {
    console.warn('⚠️ Initialization completed with warnings')
    console.warn('Errors:', errors)
    return { success: false, svgCount, previewCount, errors }
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeStampIcons()
    .then(result => {
      if (result.success) {
        console.log('✅ Initialization successful')
        process.exit(0)
      } else {
        console.error('❌ Initialization failed')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('❌ Fatal error:', error)
      process.exit(1)
    })
}

// Export helper functions for testing
export { ensureDirectoryExists, createSVGFile, generatePreviewFromSVG, verifyManifestExists }
