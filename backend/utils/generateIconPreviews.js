import sharp from 'sharp'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Go up from backend/utils/ to project root, then into uploads/
const ICONS_PATH = process.env.ICONS_PATH || join(__dirname, '..', '..', 'uploads', 'icons', 'stamps')
const PREVIEWS_PATH = join(ICONS_PATH, 'previews')

/**
 * Normalize SVG dimensions for consistent rendering
 * Ensures viewBox="0 0 100 100" and removes explicit width/height
 * @param {string} svgContent - Raw SVG content
 * @returns {string} - Normalized SVG content
 */
function normalizeSVGDimensions(svgContent) {
  let normalized = svgContent

  // Remove existing viewBox
  normalized = normalized.replace(/viewBox="[^"]*"/gi, '')
  
  // Remove width and height attributes from <svg> tag
  normalized = normalized.replace(/<svg([^>]*)\swidth="[^"]*"/gi, '<svg$1')
  normalized = normalized.replace(/<svg([^>]*)\sheight="[^"]*"/gi, '<svg$1')
  
  // Add standard viewBox to the <svg> tag
  normalized = normalized.replace(/<svg/i, '<svg viewBox="0 0 100 100"')
  
  return normalized
}

/**
 * Generate PNG preview from SVG icon
 * @param {string} svgPath - Path to SVG file
 * @param {string} outputPath - Path for output PNG
 * @param {Object} options - Generation options
 * @param {number} options.size - Output size in pixels (default: 50)
 * @returns {Promise<boolean>} - Success status
 */
async function generatePreview(svgPath, outputPath, options = {}) {
  try {
    const { size = 50 } = options
    
    // Read and normalize SVG
    const rawSVG = readFileSync(svgPath, 'utf-8')
    const normalizedSVG = normalizeSVGDimensions(rawSVG)
    
    // Write normalized SVG back to disk
    writeFileSync(svgPath, normalizedSVG, 'utf-8')
    
    // Generate preview with transparent background
    const svgBuffer = Buffer.from(normalizedSVG, 'utf-8')
    await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(outputPath)
    
    console.log(`✅ Generated ${size}x${size} preview: ${outputPath}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to generate preview for ${svgPath}:`, error.message)
    return false
  }
}

/**
 * Generate previews for all filled SVG icons
 */
async function generateAllPreviews() {
  console.log('🎨 Starting icon preview generation...')
  console.log(`📁 Icons path: ${ICONS_PATH}`)
  console.log(`📁 Previews path: ${PREVIEWS_PATH}`)

  // Ensure previews directory exists
  if (!existsSync(PREVIEWS_PATH)) {
    mkdirSync(PREVIEWS_PATH, { recursive: true })
    console.log(`📁 Created previews directory: ${PREVIEWS_PATH}`)
  }

  // Get all filled SVG icons (we only generate previews from filled versions)
  const files = readdirSync(ICONS_PATH)
  const filledIcons = files.filter(f => f.endsWith('-filled.svg'))

  console.log(`\n📋 Found ${filledIcons.length} filled icon(s) to process\n`)

  let successCount = 0
  let failCount = 0

  for (const iconFile of filledIcons) {
    // Extract icon ID by removing '-filled.svg' suffix
    const iconId = iconFile.replace('-filled.svg', '')
    const svgPath = join(ICONS_PATH, iconFile)
    // Use {id}.png naming convention (e.g., coffee-01.png)
    const previewPath = join(PREVIEWS_PATH, `${iconId}.png`)

    console.log(`🔄 Processing: ${iconFile} → ${iconId}.png`)
    const success = await generatePreview(svgPath, previewPath, { size: 50 })

    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Successfully generated: ${successCount} preview(s)`)
  if (failCount > 0) {
    console.log(`❌ Failed to generate: ${failCount} preview(s)`)
  }
  console.log(`${'='.repeat(50)}\n`)

  return { successCount, failCount }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  generateAllPreviews()
    .then(({ successCount, failCount }) => {
      if (failCount === 0) {
        console.log('🎉 All icon previews generated successfully!')
        process.exit(0)
      } else {
        console.log('⚠️ Some previews failed to generate')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error)
      process.exit(1)
    })
}

export { generatePreview, generateAllPreviews, normalizeSVGDimensions }
