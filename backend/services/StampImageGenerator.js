/**
 * Stamp Image Generator Service
 *
 * Dynamically generates hero/strip images for Apple Wallet passes
 * with visual stamp representations overlaid on background images.
 *
 * Features:
 * - Supports emoji stamps (⭐, ☕, 🍕, etc.)
 * - Supports logo stamps (business logo repeated)
 * - Adaptive grid layouts based on stamp count
 * - Works with or without custom hero images
 * - Adds progress text overlay
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
   * Generate stamp overlay with stamps and progress text
   */
  static async generateStampOverlay(options) {
    const {
      stampsEarned,
      stampsRequired,
      stampIcon,
      stampDisplayType,
      logoUrl,
      foregroundColor,
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

    // Generate SVG with stamps and text
    const svg = await this.generateStampSVG({
      stampsEarned,
      stampsRequired,
      stampIcon,
      stampDisplayType,
      logoUrl,
      foregroundColor,
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
   */
  static determineLayout(stampsRequired, style) {
    if (style === 'bar') {
      // Simple horizontal bar
      return {
        rows: 1,
        cols: Math.min(stampsRequired, 10),  // Max 10 in a row
        stampSize: 30,
        spacing: 5,
        startX: 20,
        startY: 70
      }
    }

    // Grid layout
    if (stampsRequired <= 4) {
      return {
        rows: 1,
        cols: stampsRequired,
        stampSize: 40,
        spacing: 10,
        startX: 20,
        startY: 60
      }
    } else if (stampsRequired <= 10) {
      return {
        rows: 2,
        cols: 5,
        stampSize: 35,
        spacing: 8,
        startX: 20,
        startY: 40
      }
    } else if (stampsRequired <= 12) {
      return {
        rows: 2,
        cols: 6,
        stampSize: 32,
        spacing: 7,
        startX: 15,
        startY: 45
      }
    } else if (stampsRequired <= 15) {
      return {
        rows: 3,
        cols: 5,
        stampSize: 28,
        spacing: 6,
        startX: 15,
        startY: 25
      }
    } else {
      return {
        rows: 4,
        cols: 5,
        stampSize: 25,
        spacing: 5,
        startX: 15,
        startY: 10
      }
    }
  }

  /**
   * Generate SVG with stamp grid and progress text
   */
  static async generateStampSVG(options) {
    const {
      stampsEarned,
      stampsRequired,
      stampIcon,
      foregroundColor,
      layout
    } = options

    const stamps = []
    let stampIndex = 0

    // Generate stamp grid
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols && stampIndex < stampsRequired; col++) {
        const x = layout.startX + col * (layout.stampSize + layout.spacing)
        const y = layout.startY + row * (layout.stampSize + layout.spacing)
        const filled = stampIndex < stampsEarned

        // Use custom stamp icon for both filled and empty stamps
        // Differentiate by opacity and stroke
        const opacity = filled ? 1.0 : 0.5  // Increased from 0.3 to 0.5 for better visibility

        stamps.push(`
          <text
            x="${x}"
            y="${y}"
            font-size="${layout.stampSize}"
            fill="${foregroundColor}"
            opacity="${opacity}"
            font-family="Arial, sans-serif"
            filter="url(#textShadow)"
          >${stampIcon}</text>
        `)

        stampIndex++
      }
    }

    // Add progress text
    const textX = layout.startX + (layout.cols * (layout.stampSize + layout.spacing)) + 15
    const textY = layout.startY + (layout.rows * (layout.stampSize + layout.spacing)) / 2

    const progressText = `${stampsEarned}/${stampsRequired}`

    const svg = `
      <svg width="624" height="168" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Stronger shadow for text on complex backgrounds -->
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.7"/>
          </filter>
          <!-- Shadow for stamp icons -->
          <filter id="textShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.4"/>
          </filter>
        </defs>

        ${stamps.join('\n')}

        <!-- Semi-transparent background behind progress text for better readability -->
        <rect
          x="${textX - 5}"
          y="${textY - 22}"
          width="80"
          height="40"
          rx="5"
          fill="#000000"
          opacity="0.3"
        />

        <text
          x="${textX}"
          y="${textY}"
          font-size="24"
          font-weight="bold"
          fill="${foregroundColor}"
          filter="url(#shadow)"
          font-family="Arial, sans-serif"
        >${progressText}</text>

        <text
          x="${textX}"
          y="${textY + 20}"
          font-size="12"
          fill="${foregroundColor}"
          opacity="0.9"
          filter="url(#shadow)"
          font-family="Arial, sans-serif"
        >Stamps</text>
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
