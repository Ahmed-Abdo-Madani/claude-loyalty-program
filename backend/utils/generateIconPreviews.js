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
 * Generate PNG preview from SVG icon (50x50px)
 * @param {string} svgPath - Path to SVG file
 * @param {string} outputPath - Path for output PNG
 */
async function generatePreview(svgPath, outputPath) {
  try {
    const svgBuffer = readFileSync(svgPath)
    await sharp(svgBuffer)
      .resize(50, 50, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath)
    console.log(`✅ Generated preview: ${outputPath}`)
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
    const iconName = iconFile.replace('-filled.svg', '')
    const svgPath = join(ICONS_PATH, iconFile)
    const previewPath = join(PREVIEWS_PATH, `${iconName}-preview.png`)

    console.log(`🔄 Processing: ${iconFile}`)
    const success = await generatePreview(svgPath, previewPath)

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

export { generatePreview, generateAllPreviews }
