/**
 * Stamp Image Generator Service
 *
 * Dynamically generates hero/strip images for Apple Wallet passes
 * with visual stamp representations overlaid on background images.
 *
 * Features:
 * - Uses SVG shapes (no font dependencies!) for universal compatibility
 * - Supports icon stamps (⭐, ☕, 🍕, 🎁, 🍔, 🍰, 🎯, 💎, 🏆, etc.)
 * - Supports logo stamps (business logo repeated)
 * - Fully dynamic & centered grid layouts based on actual stamp count
 * - Works with or without custom hero images
 * - Larger, proportional stamps for better visibility
 * - NO text overlay (progress shown in pass fields)
 * - Works reliably across all platforms (dev, production, any OS)
 */

import sharp from 'sharp'
import fetch from 'node-fetch'
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
        const response = await fetch(heroImageUrl)
        if (response.ok) {
          const imageBuffer = Buffer.from(await response.arrayBuffer())
          // Resize to Apple Wallet strip size (624x168 @ 2x)
          const resized = await sharp(imageBuffer)
            .resize(624, 168, { fit: 'cover' })
            .png()
            .toBuffer()
          logger.info('✅ Hero image loaded and resized')
          return resized
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
   */
  static determineLayout(stampsRequired, style) {
    // Hero image dimensions
    const IMAGE_WIDTH = 624
    const IMAGE_HEIGHT = 168
    const HORIZONTAL_PADDING = 40  // 20px left + 20px right
    const VERTICAL_PADDING = 30    // 15px top + 15px bottom
    const MAX_STAMP_SIZE = 100     // Maximum stamp size cap

    const availableWidth = IMAGE_WIDTH - HORIZONTAL_PADDING
    const availableHeight = IMAGE_HEIGHT - VERTICAL_PADDING

    if (style === 'bar') {
      // Simple horizontal bar (single row)
      const cols = Math.min(stampsRequired, 10)
      const rows = 1

      // Dynamic sizing for bar layout
      const maxStampWidth = (availableWidth * 0.80) / cols
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
    let STAMP_FILL_RATIO
    if (stampsRequired <= 5) {
      STAMP_FILL_RATIO = 0.80  // 80% for very small counts (1-5 stamps)
    } else if (stampsRequired <= 12) {
      STAMP_FILL_RATIO = 0.90  // 90% for medium counts (6-12 stamps) - INCREASED for better sizing!
    } else {
      STAMP_FILL_RATIO = 0.75  // 75% for larger counts (13+ stamps)
    }

    const maxStampWidth = (availableWidth * STAMP_FILL_RATIO) / cols
    const maxStampHeight = (availableHeight * STAMP_FILL_RATIO) / rows

    // Use the smaller dimension to maintain circular stamps
    // Apply 100px maximum cap
    const calculatedSize = Math.min(maxStampWidth, maxStampHeight)
    const stampSize = Math.floor(Math.min(calculatedSize, MAX_STAMP_SIZE))

    // STEP 3: Calculate spacing (proportional to stamp size)
    const spacing = Math.floor(stampSize * 0.20)  // 20% of stamp size

    // STEP 4: Calculate actual grid dimensions
    const totalWidth = (cols * stampSize) + ((cols - 1) * spacing)
    const totalHeight = (rows * stampSize) + ((rows - 1) * spacing)

    // STEP 5: Center the grid in the hero image
    const startX = Math.floor((IMAGE_WIDTH - totalWidth) / 2)
    const startY = Math.floor((IMAGE_HEIGHT - totalHeight) / 2)

    // STEP 6: Calculate fill percentage for logging
    const gridArea = totalWidth * totalHeight
    const imageArea = IMAGE_WIDTH * IMAGE_HEIGHT
    const fillPercentage = ((gridArea / imageArea) * 100).toFixed(1)

    logger.info('📐 Dynamic stamp sizing calculated:', {
      stampsRequired,
      gridLayout: `${rows} rows × ${cols} cols`,
      availableSpace: `${availableWidth}×${availableHeight}px`,
      calculatedStampSize: `${Math.floor(calculatedSize)}px`,
      appliedStampSize: `${stampSize}px (max: ${MAX_STAMP_SIZE}px)`,
      spacing: `${spacing}px`,
      gridDimensions: `${totalWidth}×${totalHeight}px`,
      position: `(${startX}, ${startY})`,
      fillPercentage: `${fillPercentage}%`
    })

    return {
      rows,
      cols,
      stampSize,
      spacing,
      startX,
      startY
    }
  }

  /**
   * Calculate optimal grid dimensions (rows × cols)
   * Prefers WIDER grids (fewer rows) for better visual flow
   */
  static calculateOptimalGrid(stampsRequired) {
    // Prefer wider grids with fewer rows
    if (stampsRequired <= 6) {
      // Single row for 1-6 stamps
      return { rows: 1, cols: stampsRequired }
    } else if (stampsRequired <= 12) {
      // Two rows for 7-12 stamps (wider grid)
      return { rows: 2, cols: Math.ceil(stampsRequired / 2) }
    } else if (stampsRequired <= 18) {
      // Three rows for 13-18 stamps
      return { rows: 3, cols: Math.ceil(stampsRequired / 3) }
    } else if (stampsRequired <= 24) {
      // Four rows for 19-24 stamps
      return { rows: 4, cols: Math.ceil(stampsRequired / 4) }
    } else {
      // Five rows for 25+ stamps
      return { rows: 5, cols: Math.ceil(stampsRequired / 5) }
    }
  }

  /**
   * Get SVG path for stamp icon
   * Returns SVG shape instead of emoji (no font dependencies!)
   */
  static getStampIconSVG(iconChar, size, filled) {
    const iconSize = size * 0.6  // Icon at 60% of circle size for better fit
    const halfSize = iconSize / 2

    // Map emoji characters to SVG shapes
    const iconMap = {
      '⭐': {
        // Star shape (5-pointed star)
        filled: `<path d="M ${halfSize} 0 L ${halfSize * 0.61} ${halfSize * 1.90} L 0 ${halfSize * 0.74} L ${halfSize * 1.61} ${halfSize * 0.74} L ${halfSize} ${halfSize * 1.90} Z" transform="translate(-${halfSize}, -${halfSize * 0.95})"/>`,
        outline: `<path d="M ${halfSize} 0 L ${halfSize * 0.61} ${halfSize * 1.90} L 0 ${halfSize * 0.74} L ${halfSize * 1.61} ${halfSize * 0.74} L ${halfSize} ${halfSize * 1.90} Z" transform="translate(-${halfSize}, -${halfSize * 0.95})" fill="none" stroke-width="3"/>`
      },
      '☕': {
        // Coffee cup shape
        filled: `<rect x="${-halfSize * 0.7}" y="${-halfSize * 0.5}" width="${iconSize * 0.7}" height="${iconSize * 0.8}" rx="3"/>
                <path d="M ${halfSize * 0.75} ${-halfSize * 0.3} Q ${halfSize * 1.3} ${-halfSize * 0.1} ${halfSize * 0.75} ${halfSize * 0.3}" fill="none" stroke-width="2.5"/>`,
        outline: `<rect x="${-halfSize * 0.7}" y="${-halfSize * 0.5}" width="${iconSize * 0.7}" height="${iconSize * 0.8}" rx="3" fill="none" stroke-width="2.5"/>
                 <path d="M ${halfSize * 0.75} ${-halfSize * 0.3} Q ${halfSize * 1.3} ${-halfSize * 0.1} ${halfSize * 0.75} ${halfSize * 0.3}" fill="none" stroke-width="2.5"/>`
      },
      '🍕': {
        // Pizza slice shape
        filled: `<path d="M 0 ${-halfSize} L ${halfSize * 0.9} ${halfSize * 0.9} L ${-halfSize * 0.9} ${halfSize * 0.9} Z"/>
                <circle cx="${-halfSize * 0.3}" cy="${halfSize * 0.2}" r="${halfSize * 0.15}" fill="${'rgba(255,255,255,0.6)'}"/>
                <circle cx="${halfSize * 0.3}" cy="${halfSize * 0.3}" r="${halfSize * 0.15}" fill="${'rgba(255,255,255,0.6)'}"/>`,
        outline: `<path d="M 0 ${-halfSize} L ${halfSize * 0.9} ${halfSize * 0.9} L ${-halfSize * 0.9} ${halfSize * 0.9} Z" fill="none" stroke-width="3"/>`
      },
      '🎁': {
        // Gift box shape
        filled: `<rect x="${-halfSize * 0.7}" y="${-halfSize * 0.4}" width="${iconSize * 0.7}" height="${iconSize * 0.8}" rx="2"/>
                <rect x="${-halfSize * 0.7}" y="${-halfSize * 0.4}" width="${iconSize * 0.7}" height="${iconSize * 0.25}" rx="2" fill="${'rgba(255,255,255,0.3)'}"/>
                <line x1="0" y1="${-halfSize * 0.4}" x2="0" y2="${halfSize * 0.9}" stroke-width="3"/>`,
        outline: `<rect x="${-halfSize * 0.7}" y="${-halfSize * 0.4}" width="${iconSize * 0.7}" height="${iconSize * 0.8}" rx="2" fill="none" stroke-width="2.5"/>`
      },
      '🍔': {
        // Burger shape
        filled: `<ellipse cx="0" cy="${-halfSize * 0.6}" rx="${halfSize * 0.9}" ry="${halfSize * 0.3}"/>
                <rect x="${-halfSize * 0.9}" y="${-halfSize * 0.3}" width="${iconSize * 0.9}" height="${iconSize * 0.5}"/>
                <ellipse cx="0" cy="${halfSize * 0.5}" rx="${halfSize * 0.9}" ry="${halfSize * 0.35}"/>`,
        outline: `<path d="M ${-halfSize * 0.9} ${-halfSize * 0.6} Q 0 ${-halfSize} ${halfSize * 0.9} ${-halfSize * 0.6} L ${halfSize * 0.9} ${halfSize * 0.3} Q 0 ${halfSize * 0.7} ${-halfSize * 0.9} ${halfSize * 0.3} Z" fill="none" stroke-width="2.5"/>`
      },
      '🍰': {
        // Cake slice shape
        filled: `<path d="M ${-halfSize * 0.7} ${halfSize * 0.7} L ${-halfSize * 0.5} ${-halfSize * 0.7} L ${halfSize * 0.7} ${-halfSize * 0.5} L ${halfSize * 0.9} ${halfSize * 0.7} Z"/>
                <line x1="${-halfSize * 0.1}" y1="${halfSize * 0.7}" x2="0" y2="${-halfSize * 0.2}" stroke-width="2" stroke="${'rgba(255,255,255,0.5)'}"/>`,
        outline: `<path d="M ${-halfSize * 0.7} ${halfSize * 0.7} L ${-halfSize * 0.5} ${-halfSize * 0.7} L ${halfSize * 0.7} ${-halfSize * 0.5} L ${halfSize * 0.9} ${halfSize * 0.7} Z" fill="none" stroke-width="2.5"/>`
      },
      '🎯': {
        // Target shape (concentric circles)
        filled: `<circle cx="0" cy="0" r="${halfSize * 0.9}"/>
                <circle cx="0" cy="0" r="${halfSize * 0.6}" fill="${'rgba(255,255,255,0.4)'}"/>
                <circle cx="0" cy="0" r="${halfSize * 0.3}"/>`,
        outline: `<circle cx="0" cy="0" r="${halfSize * 0.9}" fill="none" stroke-width="3"/>
                 <circle cx="0" cy="0" r="${halfSize * 0.5}" fill="none" stroke-width="2"/>`
      },
      '💎': {
        // Diamond shape
        filled: `<path d="M 0 ${-halfSize} L ${halfSize * 0.5} ${-halfSize * 0.3} L ${halfSize * 0.7} ${halfSize * 0.9} L 0 ${halfSize * 0.5} L ${-halfSize * 0.7} ${halfSize * 0.9} L ${-halfSize * 0.5} ${-halfSize * 0.3} Z"/>
                <path d="M ${-halfSize * 0.5} ${-halfSize * 0.3} L 0 ${halfSize * 0.5} L ${halfSize * 0.5} ${-halfSize * 0.3}" fill="${'rgba(255,255,255,0.3)'}"/>`,
        outline: `<path d="M 0 ${-halfSize} L ${halfSize * 0.7} ${-halfSize * 0.2} L ${halfSize * 0.5} ${halfSize * 0.9} L 0 ${halfSize * 0.5} L ${-halfSize * 0.5} ${halfSize * 0.9} L ${-halfSize * 0.7} ${-halfSize * 0.2} Z" fill="none" stroke-width="2.5"/>`
      },
      '🏆': {
        // Trophy shape
        filled: `<rect x="${-halfSize * 0.4}" y="${-halfSize * 0.3}" width="${iconSize * 0.4}" height="${iconSize * 0.6}" rx="2"/>
                <ellipse cx="0" cy="${-halfSize * 0.3}" rx="${halfSize * 0.5}" ry="${halfSize * 0.25}"/>
                <rect x="${-halfSize * 0.15}" y="${halfSize * 0.3}" width="${iconSize * 0.15}" height="${iconSize * 0.35}"/>
                <rect x="${-halfSize * 0.4}" y="${halfSize * 0.65}" width="${iconSize * 0.4}" height="${iconSize * 0.1}"/>`,
        outline: `<path d="M ${-halfSize * 0.4} ${-halfSize * 0.3} L ${-halfSize * 0.4} ${halfSize * 0.2} L ${-halfSize * 0.15} ${halfSize * 0.3} L ${-halfSize * 0.15} ${halfSize * 0.65} L ${-halfSize * 0.4} ${halfSize * 0.65} L ${-halfSize * 0.4} ${halfSize * 0.75} L ${halfSize * 0.4} ${halfSize * 0.75} L ${halfSize * 0.4} ${halfSize * 0.65} L ${halfSize * 0.15} ${halfSize * 0.65} L ${halfSize * 0.15} ${halfSize * 0.3} L ${halfSize * 0.4} ${halfSize * 0.2} L ${halfSize * 0.4} ${-halfSize * 0.3} Z" fill="none" stroke-width="2.5"/>`
      }
    }

    // Default to star if emoji not found
    const icon = iconMap[iconChar] || iconMap['⭐']
    return filled ? icon.filled : icon.outline
  }

  /**
   * Generate SVG with stamp grid including circular backgrounds
   * Uses SVG shapes instead of emoji text (no font dependencies!)
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

    // Generate EXACT number of stamps as stampsRequired
    // Each stamp has: circular background + SVG shape icon
    for (let row = 0; row < layout.rows && stampIndex < stampsRequired; row++) {
      for (let col = 0; col < layout.cols && stampIndex < stampsRequired; col++) {
        const filled = stampIndex < stampsEarned
        const iconOpacity = filled ? 1.0 : 0.4  // Filled: full opacity, Empty: 40%

        // Calculate circle position and size
        const circleRadius = layout.stampSize * 0.5  // Circle radius: 50% of stamp size

        // Position circle at grid location
        const circleCenterX = layout.startX + col * (layout.stampSize + layout.spacing) + circleRadius
        const circleCenterY = layout.startY + row * (layout.stampSize + layout.spacing) + circleRadius

        // Get SVG icon shape
        const iconSVG = this.getStampIconSVG(stampIcon, layout.stampSize, filled)

        stamps.push(`
          <!-- Circular background with stroke -->
          <circle
            cx="${circleCenterX}"
            cy="${circleCenterY}"
            r="${circleRadius}"
            fill="${backgroundColor}"
            fill-opacity="0.8"
            stroke="${foregroundColor}"
            stroke-width="3"
          />
          <!-- Stamp icon - SVG shape (centered in circle) -->
          <g transform="translate(${circleCenterX}, ${circleCenterY})" opacity="${iconOpacity}">
            <g fill="${foregroundColor}" stroke="${foregroundColor}" filter="url(#stampShadow)">
              ${iconSVG}
            </g>
          </g>
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
          <!-- Shadow for stamp icons for better contrast -->
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
}

export default StampImageGenerator
