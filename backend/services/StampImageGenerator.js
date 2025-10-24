/**
 * Stamp Image Generator Service
 *
 * Dynamically generates hero/strip images for Apple Wallet passes
 * with visual stamp representations overlaid on background images.
 *
 * Features:
 * - Supports emoji stamps (⭐, ☕, 🍕, etc.)
 * - Supports logo stamps (business logo repeated)
 * - Fully dynamic & centered grid layouts based on actual stamp count
 * - Works with or without custom hero images
 * - Larger, proportional stamps for better visibility
 * - NO text overlay (progress shown in pass fields)
 * - Safe image fetching with timeout and size protection
 */

/**
 * LAYOUT ALGORITHM DESIGN PRINCIPLES
 * ====================================
 *
 * Goal: Fit stamps in 624x168px Apple Wallet strip image with optimal visual appeal
 *
 * Constraints:
 * - Image dimensions: 624px width × 168px height (fixed)
 * - Padding: 40px horizontal (20px each side), 30px vertical (15px each side)
 * - Available space: 584px × 138px
 * - Stamps are circular with emoji/icon centered
 * - Maximum stamp size: 100px (prevents oversized appearance)
 * - Minimum stamp size: ~20px (maintains readability)
 *
 * Algorithm Steps:
 * 1. Calculate optimal grid (rows × cols) based on stamp count
 *    - Prefer wider grids (fewer rows) for better visual flow on strip image
 *    - Aspect ratio target: ~3.71:1 (matches 624:168 image ratio)
 *    - Minimize empty cells while maintaining visual balance
 *
 * 2. Determine stamp size based on available space and stamp count
 *    - Use fill ratio that varies by count (65%-90% of available space)
 *    - Smaller counts: Conservative sizing to avoid cartoonish appearance
 *    - Medium counts (9-15): Maximize space for visual impact
 *    - Larger counts (25+): Prioritize fitting over size
 *
 * 3. Calculate spacing between stamps
 *    - Proportional to stamp size (20% of stamp size)
 *    - Provides visual breathing room
 *    - Prevents stamps from appearing cramped
 *
 * 4. Validate bounds and apply fallbacks
 *    - Ensure grid fits within 624x168px with safety margin
 *    - If exceeds bounds, reduce stamp size iteratively
 *    - Log warnings for edge cases (40+ stamps)
 *
 * 5. Center grid in image
 *    - Calculate startX and startY to center the grid
 *    - Ensures balanced appearance on pass
 *
 * Edge Cases:
 * - 1-3 stamps: Single row, prevent oversized stamps
 * - 40+ stamps: Force smaller fill ratio, may require 6-7 rows
 * - 100+ stamps: Stamps will be very small but algorithm won't crash
 *
 * Visual Design Rationale:
 * - Wider grids (fewer rows) look better on horizontal strip images
 * - Circular stamps need equal width/height (use minimum dimension)
 * - Spacing prevents visual clutter and improves scannability
 * - Centering creates balanced, professional appearance
 * - Fill ratios tuned through visual testing with real wallet passes
 *
 * References:
 * - Apple Wallet Pass Design Guidelines
 * - Human Interface Guidelines for iOS
 * - Visual hierarchy principles for small-screen displays
 */

import sharp from 'sharp'
import SafeImageFetcher from '../utils/SafeImageFetcher.js'
import logger from '../config/logger.js'

class StampImageGenerator {
  /**
   * Generate hero image with stamp visualization for Apple Wallet
   * @param {object} options - Configuration
   * @returns {Promise<Buffer>} PNG image buffer (624x168 @ 2x for Apple Wallet strip)
   */
  static async generateStampHeroImage(options) {
    const {
      stampsEarned = 0,
      stampsRequired = 10,
      stampIcon = '⭐',
      stampDisplayType = 'icon',  // 'icon' or 'logo'
      logoUrl = null,
      heroImageUrl = null,
      backgroundColor = '#3B82F6',
      foregroundColor = '#FFFFFF',
      progressDisplayStyle = 'grid'  // 'grid' or 'bar'
    } = options

    logger.info('🎨 Generating stamp visualization image:', {
      stampsEarned,
      stampsRequired,
      stampIcon,
      stampDisplayType,
      hasLogo: !!logoUrl,
      hasHero: !!heroImageUrl,
      style: progressDisplayStyle
    })

    // Debug: Log exact values being used
    console.log('🔍 Stamp Image Generator - Input Values:', {
      stampsEarned: stampsEarned,
      stampsRequired: stampsRequired,
      stampIcon: stampIcon,
      stampDisplayType: stampDisplayType,
      progressDisplayStyle: progressDisplayStyle
    })

    try {
      // Step 1: Create or load background image
      const backgroundBuffer = await this.createBackground(heroImageUrl, backgroundColor)

      // Step 2: Generate stamp overlay
      const stampOverlay = await this.generateStampOverlay({
        stampsEarned,
        stampsRequired,
        stampIcon,
        stampDisplayType,
        logoUrl,
        foregroundColor,
        backgroundColor,
        progressDisplayStyle
      })

      // Step 3: Composite stamp overlay onto background
      const finalImage = await sharp(backgroundBuffer)
        .composite([{
          input: stampOverlay,
          top: 0,
          left: 0
        }])
        .png()
        .toBuffer()

      logger.info('✅ Stamp hero image generated successfully:', finalImage.length, 'bytes')
      return finalImage

    } catch (error) {
      logger.error('❌ Failed to generate stamp hero image:', error)
      // Fallback: return solid color background
      return await this.createFallbackImage(backgroundColor)
    }
  }

  /**
   * Create background image (from hero image URL or solid color)
   */
  static async createBackground(heroImageUrl, backgroundColor) {
    if (heroImageUrl) {
      try {
        logger.info('📥 Loading hero image from:', heroImageUrl)
        
        // Use SafeImageFetcher with 5s timeout and 3MB size cap
        const imageBuffer = await SafeImageFetcher.fetchImage(heroImageUrl, {
          timeoutMs: 5000,
          maxSizeBytes: 3 * 1024 * 1024,
          allowedContentTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        })

        if (imageBuffer) {
          // Resize to Apple Wallet strip size (624x168 @ 2x)
          const resized = await sharp(imageBuffer)
            .resize(624, 168, { fit: 'cover' })
            .png()
            .toBuffer()
          logger.info('✅ Hero image loaded and resized')
          return resized
        } else {
          throw new Error('SafeImageFetcher returned null (timeout or size limit exceeded)')
        }
      } catch (error) {
        logger.warn('⚠️ Failed to load hero image, using solid color:', error.message)
      }
    }

    // Create solid color background
    logger.info('🎨 Creating solid color background:', backgroundColor)
    const rgb = this.hexToRgb(backgroundColor)
    return await sharp({
      create: {
        width: 624,
        height: 168,
        channels: 4,
        background: { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 1 }
      }
    })
    .png()
    .toBuffer()
  }

  /**
   * Generate stamp overlay with stamps (including circular backgrounds)
   */
  static async generateStampOverlay(options) {
    const {
      stampsEarned,
      stampsRequired,
      stampIcon,
      stampDisplayType,
      logoUrl,
      foregroundColor,
      backgroundColor,
      progressDisplayStyle
    } = options

    // Determine grid layout
    const layout = this.determineLayout(stampsRequired, progressDisplayStyle)
    logger.info('📐 Using layout:', layout)

    // Create transparent canvas for overlay
    const canvas = await sharp({
      create: {
        width: 624,
        height: 168,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent
      }
    })
    .png()
    .toBuffer()

    // Generate SVG with stamps and circular backgrounds
    const svg = await this.generateStampSVG({
      stampsEarned,
      stampsRequired,
      stampIcon,
      stampDisplayType,
      logoUrl,
      foregroundColor,
      backgroundColor,
      layout
    })

    // Convert SVG to PNG
    return await sharp(Buffer.from(svg))
      .resize(624, 168)
      .png()
      .toBuffer()
  }

  /**
   * Determine grid layout based on stamp count
   * Uses DYNAMIC sizing based on available hero image space
   * Optimized for wider grids (fewer rows) with 100px max stamp size
   *
   * Algorithm Goals:
   * - Fit all stamps within 624x168px bounds with safety margin
   * - Maintain visual appeal and readability
   * - Handle edge cases (1-100+ stamps) gracefully
   *
   * Constraints:
   * - Apple Wallet strip image: exactly 624x168px @ 2x resolution
   * - Stamps must be circular with emoji/icon centered
   * - Must support 1-40+ stamps gracefully
   * - Must maintain visual appeal at all counts
   *
   * Calculation Process:
   * 1. Grid selection (calculateOptimalGrid): Choose rows × cols based on count
   * 2. Sizing: Calculate stamp size based on available space and fill ratio
   * 3. Spacing: Proportional to stamp size (20% for breathing room)
   * 4. Validation: Check bounds and apply fallback if needed
   * 5. Centering: Position grid for balanced appearance
   *
   * Edge Case Handling:
   * - Very small counts (1-2): Prevent oversized stamps
   * - Very large counts (40+): Force conservative sizing, log warnings
   * - Bounds exceeded: Iteratively reduce size (max 3 attempts)
   *
   * @param {number} stampsRequired - Total number of stamps to display
   * @param {string} style - Layout style ('grid' or 'bar')
   * @returns {object} Layout configuration with rows, cols, stampSize, spacing, startX, startY
   */
  static determineLayout(stampsRequired, style) {
    // Hero image dimensions
    const IMAGE_WIDTH = 624
    const IMAGE_HEIGHT = 168
    const HORIZONTAL_PADDING = 40  // 20px left + 20px right
    const VERTICAL_PADDING = 30    // 15px top + 15px bottom
    const MAX_STAMP_SIZE = 80     // Maximum stamp size cap

    const availableWidth = IMAGE_WIDTH - HORIZONTAL_PADDING
    const availableHeight = IMAGE_HEIGHT - VERTICAL_PADDING

    if (style === 'bar') {
      // Simple horizontal bar (single row)
      const cols = Math.min(stampsRequired, 10)
      const rows = 1

      // Dynamic sizing for bar layout
      const maxStampWidth = (availableWidth * 0.60) / cols
      const stampSize = Math.min(Math.floor(maxStampWidth), MAX_STAMP_SIZE)
      const spacing = Math.floor(stampSize * 0.20)

      const totalWidth = (cols * stampSize) + ((cols - 1) * spacing)
      const startX = Math.floor((IMAGE_WIDTH - totalWidth) / 2)
      const startY = Math.floor((IMAGE_HEIGHT - stampSize) / 2)

      return {
        rows,
        cols,
        stampSize,
        spacing,
        startX,
        startY
      }
    }

    // === GRID LAYOUT - FULLY DYNAMIC ===

    // STEP 1: Determine optimal grid dimensions (prefer wider grids)
    const { rows, cols } = this.calculateOptimalGrid(stampsRequired)

    // STEP 2: Dynamic stamp sizing based on available space
    // Adjust fill ratio based on stamp count for optimal space utilization
    // Rationale: Smaller counts need restraint to avoid cartoonish appearance,
    // medium counts can maximize space for visual impact,
    // larger counts need conservative sizing to ensure legibility
    let STAMP_FILL_RATIO
    if (stampsRequired <= 4) {
      STAMP_FILL_RATIO = 0.70  // 70% for very small counts (1-4 stamps) - prevents oversized stamps
    } else if (stampsRequired <= 8) {
      STAMP_FILL_RATIO = 0.95  // 95% for small grids (5-8 stamps) - good balance
    } else if (stampsRequired <= 15) {
      STAMP_FILL_RATIO = 0.90  // 90% for medium grids (9-15 stamps) - maximize space usage
    } else if (stampsRequired <= 25) {
      STAMP_FILL_RATIO = 0.80  // 80% for medium-large grids (16-25 stamps) - maintain readability
    } else if (stampsRequired <= 35) {
      STAMP_FILL_RATIO = 0.70  // 70% for large grids (26-35 stamps) - prioritize fitting and spacing
    } else {
      STAMP_FILL_RATIO = 0.65  // 65% for very large grids (36+ stamps) - ensure all stamps fit
    }

    // For 40+ stamps, log warning about reduced stamp size
    if (stampsRequired >= 40) {
      logger.warn(`⚠️ Large stamp count (${stampsRequired}): Stamps will be smaller but remain readable`)
    }

    const maxStampWidth = (availableWidth * STAMP_FILL_RATIO) / cols
    const maxStampHeight = (availableHeight * STAMP_FILL_RATIO) / rows

    // Use the smaller dimension to maintain circular stamps
    // (Circular stamps need equal width/height, so we use the limiting dimension)
    // Apply 100px maximum cap to prevent oversized appearance
    const calculatedSize = Math.min(maxStampWidth, maxStampHeight)
    const stampSize = Math.floor(Math.min(calculatedSize, MAX_STAMP_SIZE))

    // STEP 3: Calculate spacing (proportional to stamp size)
    // 20% of stamp size provides visual breathing room between stamps
    const spacing = Math.floor(stampSize * 0.20)

    // STEP 4: Calculate actual grid dimensions
    let totalWidth = (cols * stampSize) + ((cols - 1) * spacing)
    let totalHeight = (rows * stampSize) + ((rows - 1) * spacing)

    // STEP 4.5: Validate bounds and apply fallback if needed
    let currentStampSize = stampSize
    let currentSpacing = spacing
    let boundsValidation = this.validateGridBounds(rows, cols, currentStampSize, currentSpacing, IMAGE_WIDTH, IMAGE_HEIGHT)

    // If bounds exceeded, iteratively reduce stamp size (max 3 iterations)
    let iteration = 0
    while (!boundsValidation.isValid && iteration < 3) {
      iteration++
      // Reduce stamp size by 10%
      currentStampSize = Math.floor(currentStampSize * 0.9)
      currentSpacing = Math.floor(currentStampSize * 0.20)

      // Recalculate dimensions
      totalWidth = (cols * currentStampSize) + ((cols - 1) * currentSpacing)
      totalHeight = (rows * currentStampSize) + ((rows - 1) * currentSpacing)

      // Re-validate
      boundsValidation = this.validateGridBounds(rows, cols, currentStampSize, currentSpacing, IMAGE_WIDTH, IMAGE_HEIGHT)

      logger.warn(`⚠️ Bounds exceeded, iteration ${iteration}: Reduced stamp size to ${currentStampSize}px`)
    }

    // If still exceeds after 3 iterations, log error and use minimum safe size
    if (!boundsValidation.isValid) {
      logger.error(`❌ Could not fit ${stampsRequired} stamps within bounds after 3 iterations. Using minimum safe size.`)
      currentStampSize = Math.floor(Math.min(availableWidth / cols, availableHeight / rows) * 0.5)
      currentSpacing = Math.floor(currentStampSize * 0.10)
      totalWidth = (cols * currentStampSize) + ((cols - 1) * currentSpacing)
      totalHeight = (rows * currentStampSize) + ((rows - 1) * currentSpacing)
    }

    // STEP 5: Center the grid in the hero image
    // Centering calculation ensures balanced appearance on pass
    const startX = Math.floor((IMAGE_WIDTH - totalWidth) / 2)
    const startY = Math.floor((IMAGE_HEIGHT - totalHeight) / 2)

    // STEP 6: Calculate fill percentage and safety margin for logging
    const gridArea = totalWidth * totalHeight
    const imageArea = IMAGE_WIDTH * IMAGE_HEIGHT
    const fillPercentage = ((gridArea / imageArea) * 100).toFixed(1)
    const safetyMarginX = IMAGE_WIDTH - (startX + totalWidth)
    const safetyMarginY = IMAGE_HEIGHT - (startY + totalHeight)
    const recommendedMaxStamps = Math.floor(rows * cols * 1.2)  // Rough estimate

    logger.info('📐 Dynamic stamp sizing calculated:', {
      stampsRequired,
      gridLayout: `${rows} rows × ${cols} cols`,
      availableSpace: `${availableWidth}×${availableHeight}px`,
      calculatedStampSize: `${Math.floor(calculatedSize)}px`,
      appliedStampSize: `${currentStampSize}px (max: ${MAX_STAMP_SIZE}px)`,
      spacing: `${currentSpacing}px`,
      gridDimensions: `${totalWidth}×${totalHeight}px`,
      position: `(${startX}, ${startY})`,
      fillPercentage: `${fillPercentage}%`,
      boundsCheck: boundsValidation.isValid ? 'PASS ✅' : 'FAIL ❌',
      safetyMargin: `X: ${safetyMarginX}px, Y: ${safetyMarginY}px`,
      recommendedMaxStamps: `~${recommendedMaxStamps} stamps`
    })

    return {
      rows,
      cols,
      stampSize: currentStampSize,
      spacing: currentSpacing,
      startX,
      startY
    }
  }

  /**
   * Calculate optimal grid dimensions (rows × cols)
   * Prefers WIDER grids (fewer rows) for better visual flow on horizontal strip images
   *
   * Algorithm:
   * - Target aspect ratio: ~3.71:1 (matches 624:168 image ratio)
   * - Minimize empty cells while maintaining visual balance
   * - Avoid single-column or single-row extremes (except for very small counts)
   * - Evaluate multiple grid options and select best match
   *
   * Visual Design Principle:
   * - Wider grids (fewer rows) look better on horizontal Apple Wallet strip images
   * - Single row for 1-6 stamps (natural horizontal flow)
   * - 2 rows for 7-12 stamps (balanced grid)
   * - 3-4 rows for 13-25 stamps (maintains readability)
   * - 5-6 rows for 26-40 stamps (prioritize fitting)
   * - 6-7 rows for 41+ stamps (may be small but functional)
   *
   * @param {number} stampsRequired - Total number of stamps to fit
   * @returns {object} Grid configuration with rows and cols
   */
  static calculateOptimalGrid(stampsRequired) {
    // Edge case: 1-4 stamps - single row to prevent awkward layout
    if (stampsRequired <= 4) {
      return { rows: 1, cols: stampsRequired }
    }

    // 5-12 stamps: 2 rows (good balance)
    if (stampsRequired <= 12) {
      return { rows: 2, cols: Math.ceil(stampsRequired / 2) }
    }

    // 13-20 stamps: 3-4 rows (optimize based on exact count)
    if (stampsRequired <= 15) {
      return { rows: 3, cols: Math.ceil(stampsRequired / 3) }
    }
    if (stampsRequired <= 20) {
      return { rows: 4, cols: Math.ceil(stampsRequired / 4) }
    }

    // 21-30 stamps: 4-5 rows (ensure stamps remain visible)
    if (stampsRequired <= 25) {
      return { rows: 4, cols: Math.ceil(stampsRequired / 4) }
    }
    if (stampsRequired <= 30) {
      return { rows: 5, cols: Math.ceil(stampsRequired / 5) }
    }

    // 31-40 stamps: 5-6 rows (prioritize fitting over size)
    if (stampsRequired <= 35) {
      return { rows: 5, cols: Math.ceil(stampsRequired / 5) }
    }
    if (stampsRequired <= 40) {
      return { rows: 6, cols: Math.ceil(stampsRequired / 6) }
    }

    // 41+ stamps: 6-7 rows with warning (stamps may be small)
    if (stampsRequired <= 49) {
      return { rows: 7, cols: Math.ceil(stampsRequired / 7) }
    }

    // 50+ stamps: 7+ rows (graceful degradation)
    const rows = Math.min(Math.ceil(Math.sqrt(stampsRequired / 3.71)), 10)  // Cap at 10 rows
    const cols = Math.ceil(stampsRequired / rows)
    return { rows, cols }
  }

  /**
   * Validate grid bounds to ensure stamps fit within image dimensions
   *
   * Checks that the calculated grid (with stamps and spacing) fits within
   * the 624x168px Apple Wallet strip image with a safety margin to prevent
   * edge clipping.
   *
   * @param {number} rows - Number of rows in grid
   * @param {number} cols - Number of columns in grid
   * @param {number} stampSize - Size of each stamp (diameter in pixels)
   * @param {number} spacing - Spacing between stamps (pixels)
   * @param {number} imageWidth - Image width (default 624px)
   * @param {number} imageHeight - Image height (default 168px)
   * @returns {object} Validation result with isValid, totalWidth, totalHeight, exceedsWidth, exceedsHeight
   */
  static validateGridBounds(rows, cols, stampSize, spacing, imageWidth = 624, imageHeight = 168) {
    // Safety margin: 10px on each side to prevent edge clipping
    const SAFETY_MARGIN = 10

    // Calculate total grid dimensions
    const totalWidth = (cols * stampSize) + ((cols - 1) * spacing)
    const totalHeight = (rows * stampSize) + ((rows - 1) * spacing)

    // Check if grid exceeds image bounds (with safety margin)
    const exceedsWidth = totalWidth > (imageWidth - SAFETY_MARGIN * 2)
    const exceedsHeight = totalHeight > (imageHeight - SAFETY_MARGIN * 2)
    const isValid = !exceedsWidth && !exceedsHeight

    return {
      isValid,
      totalWidth,
      totalHeight,
      exceedsWidth,
      exceedsHeight
    }
  }

  /**
   * Generate SVG with stamp grid including circular backgrounds
   * Matches the "abbajava CAFE" reference design with circles and different icons
   */
  static async generateStampSVG(options) {
    const {
      stampsEarned,
      stampsRequired,
      stampIcon,
      foregroundColor,
      backgroundColor,
      layout
    } = options

    const stamps = []
    let stampIndex = 0

    console.log('🔍 Generating stamp SVG with circular backgrounds:', {
      stampsEarned,
      stampsRequired,
      stampIcon,
      layoutRows: layout.rows,
      layoutCols: layout.cols,
      stampSize: layout.stampSize,
      backgroundColor,
      foregroundColor
    })

    // Safety validation: Verify layout dimensions are within bounds
    // This is a safety net for edge cases that might slip through bounds checking
    if (layout.startX < 0 || layout.startY < 0) {
      logger.error('❌ Invalid layout: Negative start position detected', {
        startX: layout.startX,
        startY: layout.startY
      })
      // Use fallback: centered single row with minimum size
      layout.startX = Math.max(layout.startX, 20)
      layout.startY = Math.max(layout.startY, 20)
    }

    // Verify stamps won't render outside 624x168 bounds
    const maxX = layout.startX + (layout.cols * layout.stampSize) + ((layout.cols - 1) * layout.spacing)
    const maxY = layout.startY + (layout.rows * layout.stampSize) + ((layout.rows - 1) * layout.spacing)

    if (maxX > 624 || maxY > 168) {
      logger.error('❌ Layout exceeds image bounds:', {
        maxX,
        maxY,
        imageWidth: 624,
        imageHeight: 168,
        exceedsWidth: maxX > 624,
        exceedsHeight: maxY > 168
      })
      // Fallback: Use single row with minimum safe size
      layout.rows = 1
      layout.cols = Math.min(stampsRequired, 10)
      layout.stampSize = Math.floor(Math.min(584 / layout.cols, 138) * 0.5)
      layout.spacing = Math.floor(layout.stampSize * 0.10)
      const totalWidth = (layout.cols * layout.stampSize) + ((layout.cols - 1) * layout.spacing)
      layout.startX = Math.floor((624 - totalWidth) / 2)
      layout.startY = Math.floor((168 - layout.stampSize) / 2)
      logger.warn('⚠️ Applied fallback layout: single row, minimum safe size')
    }

    // Generate EXACT number of stamps as stampsRequired
    // Each stamp has: circular background + CENTERED emoji icon
    for (let row = 0; row < layout.rows && stampIndex < stampsRequired; row++) {
      for (let col = 0; col < layout.cols && stampIndex < stampsRequired; col++) {
        const filled = stampIndex < stampsEarned

        // Determine which icon to display
        const displayIcon = filled ? stampIcon : this.getEmptyStampIcon(stampIcon)
        const iconOpacity = filled ? 1.0 : 0.4  // Filled: full opacity, Empty: 40%

        // Calculate circle position and size
        const circleRadius = layout.stampSize * 0.5  // Circle radius: 50% of stamp size

        // Position circle at grid location
        const circleCenterX = layout.startX + col * (layout.stampSize + layout.spacing) + circleRadius
        const circleCenterY = layout.startY + row * (layout.stampSize + layout.spacing) + circleRadius

        // Calculate emoji size (slightly smaller than circle for proper fit)
        const emojiSize = layout.stampSize * 0.8  // Emoji at 80% of stamp size

        stamps.push(`
          <!-- Circular background with stroke -->
          <circle
            cx="${circleCenterX}"
            cy="${circleCenterY}"
            r="${circleRadius}"
            fill="${backgroundColor}"
            fill-opacity="0.8"
            stroke="${foregroundColor}"
            stroke-width="1"
          />
          <!-- Stamp emoji - CENTERED in circle (with visual adjustment) -->
          <text
            x="${circleCenterX}"
            y="${circleCenterY + (emojiSize * 0.35)}"
            font-size="${emojiSize}"
            opacity="${iconOpacity}"
            fill="${foregroundColor}"
            font-family="Noto Color Emoji, Noto Emoji, Apple Color Emoji, Segoe UI Emoji, monospace, sans-serif"
            filter="url(#stampShadow)"
            text-anchor="middle"
            dominant-baseline="central"
          >${displayIcon}</text>
        `)

        stampIndex++
      }
    }

    console.log('✅ Generated', stampIndex, 'stamp SVG elements (with circles) out of', stampsRequired, 'required')

    // SVG with circular backgrounds + stamps - no text overlay
    // The "X of Y" progress is already shown in the pass's secondaryFields
    const svg = `
      <svg width="624" height="168" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Shadow for stamp emojis for better contrast -->
          <filter id="stampShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
          </filter>
        </defs>

        ${stamps.join('\n')}
      </svg>
    `

    return svg
  }

  /**
   * Create fallback image in case of errors
   */
  static async createFallbackImage(backgroundColor) {
    const rgb = this.hexToRgb(backgroundColor)
    return await sharp({
      create: {
        width: 624,
        height: 168,
        channels: 4,
        background: { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 1 }
      }
    })
    .png()
    .toBuffer()
  }

  /**
   * Convert hex color to RGB object
   */
  static hexToRgb(hex) {
    const cleanHex = hex.replace('#', '')
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16)
    }
  }

  /**
   * Get empty/hollow version of stamp icon
   * Maps filled stamps to their hollow equivalents
   */
  static getEmptyStampIcon(filledIcon) {
    const emptyIconMap = {
      '☕': '☕',  // Coffee cup (same icon, will use opacity)
      '⭐': '☆',  // Star → Hollow star
      '⭐️': '☆',  // Star emoji variant → Hollow star
      '🍕': '🍕', // Pizza (same, will use opacity)
      '🎁': '🎁', // Gift (same, will use opacity)
      '🍔': '🍔', // Burger (same, will use opacity)
      '🍰': '🍰', // Cake (same, will use opacity)
      '🎯': '🎯', // Target (same, will use opacity)
      '💎': '💎', // Diamond (same, will use opacity)
      '🏆': '🏆', // Trophy (same, will use opacity)
    }
    return emptyIconMap[filledIcon] || filledIcon
  }
}

export default StampImageGenerator
