import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import logger from '../config/logger.js'
import crypto from 'crypto'

/**
 * Image Processing Service
 *
 * Handles image processing for wallet pass compliance:
 * - Resizing and cropping for Google Wallet (circular)
 * - Resizing for Apple Wallet (rectangular)
 * - Image optimization and compression
 * - Format validation
 */
class ImageProcessingService {
  constructor() {
    // Upload directories
    this.uploadDir = path.join(process.cwd(), 'uploads', 'designs')
    this.logoDir = path.join(this.uploadDir, 'logos')
    this.heroDir = path.join(this.uploadDir, 'heroes')
    this.processedDir = path.join(this.uploadDir, 'processed')

    // Base URL for absolute image URLs (Phase 4: Wallet Integration Fix)
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001'

    // Ensure directories exist
    this.initializeDirectories()
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true })
      await fs.mkdir(this.logoDir, { recursive: true })
      await fs.mkdir(this.heroDir, { recursive: true })
      await fs.mkdir(this.processedDir, { recursive: true })
      logger.info('✅ Image upload directories initialized')
    } catch (error) {
      logger.error('❌ Failed to initialize upload directories:', error)
    }
  }

  /**
   * Generate unique filename
   * @param {string} originalFilename - Original file name
   * @param {string} suffix - Suffix to add (e.g., 'google', 'apple')
   * @returns {string}
   */
  generateUniqueFilename(originalFilename, suffix = '') {
    const ext = path.extname(originalFilename)
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    const safeSuffix = suffix ? `_${suffix}` : ''
    return `${timestamp}_${random}${safeSuffix}${ext}`
  }

  /**
   * Validate image format and size
   * @param {Buffer} imageBuffer - Image buffer
   * @param {object} options - Validation options
   * @returns {Promise<object>} { isValid, errors, metadata }
   */
  async validateImage(imageBuffer, options = {}) {
    const {
      maxSizeBytes = 5 * 1024 * 1024,  // 5MB default
      allowedFormats = ['jpeg', 'jpg', 'png', 'webp'],
      minWidth = 100,
      minHeight = 100
    } = options

    const errors = []

    try {
      // Check file size
      if (imageBuffer.length > maxSizeBytes) {
        errors.push(`File size (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${maxSizeBytes / 1024 / 1024}MB)`)
      }

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata()

      // Check format
      if (!allowedFormats.includes(metadata.format)) {
        errors.push(`Format ${metadata.format} not allowed. Allowed: ${allowedFormats.join(', ')}`)
      }

      // Check dimensions
      if (metadata.width < minWidth || metadata.height < minHeight) {
        errors.push(`Image dimensions (${metadata.width}x${metadata.height}) below minimum (${minWidth}x${minHeight})`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: imageBuffer.length
        }
      }

    } catch (error) {
      logger.error('❌ Image validation failed:', error)
      return {
        isValid: false,
        errors: ['Failed to process image. It may be corrupted.'],
        metadata: null
      }
    }
  }

  /**
   * Process logo for Google Wallet (circular, 660x660px minimum)
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} originalFilename - Original filename
   * @returns {Promise<object>} { path, url, size }
   */
  async processLogoForGoogle(imageBuffer, originalFilename) {
    try {
      logger.info('🎨 Processing logo for Google Wallet (circular mask)...')

      // Validate image
      const validation = await this.validateImage(imageBuffer, {
        minWidth: 200,  // Minimum input size
        minHeight: 200
      })

      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`)
      }

      // Process image: resize to 660x660px, ensure square, optimize
      const filename = this.generateUniqueFilename(originalFilename, 'google')
      const outputPath = path.join(this.processedDir, filename)

      await sharp(imageBuffer)
        .resize(660, 660, {
          fit: 'cover',  // Crop to fill square
          position: 'center'
        })
        .png({ quality: 90, compressionLevel: 9 })  // High quality PNG
        .toFile(outputPath)

      const stats = await fs.stat(outputPath)

      logger.info(`✅ Google Wallet logo processed: ${filename} (${(stats.size / 1024).toFixed(2)}KB)`)

      return {
        path: outputPath,
        url: `${this.baseUrl}/uploads/designs/processed/${filename}`,
        size: stats.size,
        dimensions: { width: 660, height: 660 }
      }

    } catch (error) {
      logger.error('❌ Failed to process logo for Google Wallet:', error)
      throw error
    }
  }

  /**
   * Process logo for Apple Wallet (rectangular, 160x50px for 1x, 320x100px for 2x)
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} originalFilename - Original filename
   * @returns {Promise<object>} { path, url, size }
   */
  async processLogoForApple(imageBuffer, originalFilename) {
    try {
      logger.info('🍎 Processing logo for Apple Wallet (rectangular)...')

      // Validate image
      const validation = await this.validateImage(imageBuffer, {
        minWidth: 100,
        minHeight: 30
      })

      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`)
      }

      // Process image: resize to 320x100px (2x retina), maintain aspect ratio
      const filename = this.generateUniqueFilename(originalFilename, 'apple')
      const outputPath = path.join(this.processedDir, filename)

      await sharp(imageBuffer)
        .resize(320, 100, {
          fit: 'inside',  // Maintain aspect ratio, fit within bounds
          background: { r: 255, g: 255, b: 255, alpha: 0 }  // Transparent background
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath)

      const stats = await fs.stat(outputPath)

      logger.info(`✅ Apple Wallet logo processed: ${filename} (${(stats.size / 1024).toFixed(2)}KB)`)

      return {
        path: outputPath,
        url: `${this.baseUrl}/uploads/designs/processed/${filename}`,
        size: stats.size,
        dimensions: { width: 320, height: 100 }
      }

    } catch (error) {
      logger.error('❌ Failed to process logo for Apple Wallet:', error)
      throw error
    }
  }

  /**
   * Process hero image (1032x336px optimal for both platforms)
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} originalFilename - Original filename
   * @returns {Promise<object>} { path, url, size }
   */
  async processHeroImage(imageBuffer, originalFilename) {
    try {
      logger.info('🖼️ Processing hero image (1032x336px)...')

      // Validate image
      const validation = await this.validateImage(imageBuffer, {
        minWidth: 500,
        minHeight: 200,
        maxSizeBytes: 10 * 1024 * 1024  // 10MB for hero images
      })

      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`)
      }

      // Process image: resize to 1032x336px, crop to fill
      const filename = this.generateUniqueFilename(originalFilename, 'hero')
      const outputPath = path.join(this.processedDir, filename)

      await sharp(imageBuffer)
        .resize(1032, 336, {
          fit: 'cover',  // Crop to fill dimensions
          position: 'center'
        })
        .jpeg({ quality: 85, progressive: true })  // Progressive JPEG for web
        .toFile(outputPath)

      const stats = await fs.stat(outputPath)

      logger.info(`✅ Hero image processed: ${filename} (${(stats.size / 1024).toFixed(2)}KB)`)

      return {
        path: outputPath,
        url: `${this.baseUrl}/uploads/designs/processed/${filename}`,
        size: stats.size,
        dimensions: { width: 1032, height: 336 }
      }

    } catch (error) {
      logger.error('❌ Failed to process hero image:', error)
      throw error
    }
  }

  /**
   * Process complete logo set (original + Google + Apple versions)
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} originalFilename - Original filename
   * @returns {Promise<object>} { original, google, apple }
   */
  async processLogoComplete(imageBuffer, originalFilename) {
    try {
      logger.info('🎨 Processing complete logo set...')

      // Save original
      const originalFile = this.generateUniqueFilename(originalFilename, 'original')
      const originalPath = path.join(this.logoDir, originalFile)
      await fs.writeFile(originalPath, imageBuffer)

      const originalStats = await fs.stat(originalPath)

      // Process for Google Wallet
      const googleLogo = await this.processLogoForGoogle(imageBuffer, originalFilename)

      // Process for Apple Wallet
      const appleLogo = await this.processLogoForApple(imageBuffer, originalFilename)

      logger.info('✅ Complete logo set processed successfully')

      return {
        original: {
          path: originalPath,
          url: `${this.baseUrl}/uploads/designs/logos/${originalFile}`,
          size: originalStats.size
        },
        google: googleLogo,
        apple: appleLogo
      }

    } catch (error) {
      logger.error('❌ Failed to process complete logo set:', error)
      throw error
    }
  }

  /**
   * Optimize existing image (reduce file size while maintaining quality)
   * @param {string} imagePath - Path to image file
   * @returns {Promise<object>} { originalSize, newSize, savedBytes }
   */
  async optimizeImage(imagePath) {
    try {
      logger.info(`🔧 Optimizing image: ${imagePath}`)

      const originalStats = await fs.stat(imagePath)
      const originalSize = originalStats.size

      const imageBuffer = await fs.readFile(imagePath)
      const metadata = await sharp(imageBuffer).metadata()

      let optimized
      if (metadata.format === 'png') {
        optimized = await sharp(imageBuffer)
          .png({ quality: 85, compressionLevel: 9 })
          .toBuffer()
      } else {
        optimized = await sharp(imageBuffer)
          .jpeg({ quality: 85, progressive: true })
          .toBuffer()
      }

      await fs.writeFile(imagePath, optimized)

      const newSize = optimized.length
      const savedBytes = originalSize - newSize
      const savedPercent = ((savedBytes / originalSize) * 100).toFixed(2)

      logger.info(`✅ Image optimized: ${(originalSize / 1024).toFixed(2)}KB → ${(newSize / 1024).toFixed(2)}KB (saved ${savedPercent}%)`)

      return {
        originalSize,
        newSize,
        savedBytes,
        savedPercent: parseFloat(savedPercent)
      }

    } catch (error) {
      logger.error(`❌ Failed to optimize image ${imagePath}:`, error)
      throw error
    }
  }

  /**
   * Delete image file
   * @param {string} imagePath - Path to image file
   * @returns {Promise<boolean>}
   */
  async deleteImage(imagePath) {
    try {
      await fs.unlink(imagePath)
      logger.info(`✅ Deleted image: ${imagePath}`)
      return true
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`⚠️ Image not found: ${imagePath}`)
        return false
      }
      logger.error(`❌ Failed to delete image ${imagePath}:`, error)
      throw error
    }
  }

  /**
   * Get image dimensions
   * @param {Buffer|string} image - Image buffer or path
   * @returns {Promise<object>} { width, height, format }
   */
  async getImageDimensions(image) {
    try {
      const imageInput = typeof image === 'string' ? await fs.readFile(image) : image
      const metadata = await sharp(imageInput).metadata()

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      }

    } catch (error) {
      logger.error('❌ Failed to get image dimensions:', error)
      throw error
    }
  }

  /**
   * Extract dominant color from image (useful for auto-suggesting colors)
   * @param {Buffer|string} image - Image buffer or path
   * @returns {Promise<string>} Hex color (e.g., '#3B82F6')
   */
  async extractDominantColor(image) {
    try {
      const imageInput = typeof image === 'string' ? await fs.readFile(image) : image

      // Resize to small size for faster processing
      const { dominant } = await sharp(imageInput)
        .resize(100, 100, { fit: 'cover' })
        .stats()

      const { r, g, b } = dominant

      // Convert to hex
      const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase()

      logger.info(`✅ Extracted dominant color: ${hex}`)
      return hex

    } catch (error) {
      logger.error('❌ Failed to extract dominant color:', error)
      // Return default color on failure
      return '#3B82F6'
    }
  }

  /**
   * Create circular mask for preview (client-side preview simulation)
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Buffer>} Circular masked image
   */
  async createCircularMask(imageBuffer) {
    try {
      const size = 660

      // Create circular mask
      const mask = Buffer.from(
        `<svg width="${size}" height="${size}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
        </svg>`
      )

      const circularImage = await sharp(imageBuffer)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .composite([{
          input: mask,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer()

      return circularImage

    } catch (error) {
      logger.error('❌ Failed to create circular mask:', error)
      throw error
    }
  }
}

// Export singleton instance
export default new ImageProcessingService()
