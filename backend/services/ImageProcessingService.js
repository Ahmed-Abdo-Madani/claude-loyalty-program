import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import logger from '../config/logger.js'
import crypto from 'crypto'
import R2StorageService from './R2StorageService.js'

/**
 * Image Processing Service
 *
 * Handles image processing for wallet pass compliance:
 * - Resizing and cropping for Google Wallet (circular)
 * - Resizing for Apple Wallet (rectangular)
 * - Image optimization and compression
 * - Format validation
 * 
 * API Contract: All processed image URLs returned by this service are ABSOLUTE URLs
 * - Format: {baseUrl}/designs/{type}/{filename}
 * - Example: https://api.madna.me/designs/logos/logo-abc123.png
 * - baseUrl: Derived from UPLOADS_BASE_URL or BASE_URL environment variables
 * - Consumers should use these URLs directly without additional prefixing
 */
class ImageProcessingService {
  constructor() {
    // Upload directories - Support for persistent disk storage
    // Production: Uses UPLOADS_DIR env var pointing to persistent disk mount
    // Development: Falls back to ./uploads directory
    const uploadsRoot = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
    this.uploadDir = path.join(uploadsRoot, 'designs')
    this.logoDir = path.join(this.uploadDir, 'logos')
    this.heroDir = path.join(this.uploadDir, 'heroes')
    this.processedDir = path.join(this.uploadDir, 'processed')

    // Base URL for absolute image URLs (Phase 4: Wallet Integration Fix)
    // UPLOADS_BASE_URL takes precedence to support CDN or separate upload domain
    this.baseUrl = process.env.UPLOADS_BASE_URL || process.env.BASE_URL || 'http://localhost:3001'

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
        url: `${this.baseUrl}/designs/processed/${filename}`,
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
        url: `${this.baseUrl}/designs/processed/${filename}`,
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
        url: `${this.baseUrl}/designs/processed/${filename}`,
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
          url: `${this.baseUrl}/designs/logos/${originalFile}`,
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

  /**
   * Process product image (generate original, large 800px, thumbnail 200px)
   * All outputs are WebP format
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} originalFilename - Original filename
   * @param {string} productId - Product ID (for filename generation)
   * @returns {Promise<object>} { original, large, thumbnail } URLs and metadata
   */
  async processProductImage(imageBuffer, originalFilename, productId) {
    try {
      logger.info(`📸 Processing product image for product ${productId}...`)

      // Validate image
      const validation = await this.validateImage(imageBuffer, {
        minWidth: 100,
        minHeight: 100,
        maxSizeBytes: 10 * 1024 * 1024, // 10MB limit
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif']
      })

      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`)
      }

      // Base filename: {productId}_{timestamp}
      // Note: We use the productId in the filename as requested
      const timestamp = Date.now()
      const ext = '.webp' // Enforce WebP
      const baseFilename = `${productId}_${timestamp}`

      // Define filenames
      const filenameOriginal = `${baseFilename}_original${ext}`
      const filenameLarge = `${baseFilename}_large${ext}`
      const filenameThumbnail = `${baseFilename}_thumb${ext}`

      // Define R2 Keys
      const keyOriginal = `products/${filenameOriginal}`
      const keyLarge = `products/${filenameLarge}`
      const keyThumbnail = `products/${filenameThumbnail}`

      // Process and Upload in parallel using buffer
      const [originalResult, largeResult, thumbResult] = await Promise.all([
        // 1. Process Original
        sharp(imageBuffer)
          .rotate()
          .withMetadata(false)
          .webp({ quality: 90, effort: 6, smartSubsample: true })
          .toBuffer({ resolveWithObject: true })
          .then(async ({ data, info }) => ({
            url: await R2StorageService.uploadFile(data, keyOriginal, 'image/webp'),
            info
          })),

        // 2. Process Large
        sharp(imageBuffer)
          .rotate()
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .withMetadata(false)
          .webp({ quality: 82, effort: 6, smartSubsample: true })
          .toBuffer({ resolveWithObject: true })
          .then(async ({ data, info }) => ({
            url: await R2StorageService.uploadFile(data, keyLarge, 'image/webp'),
            info
          })),

        // 3. Process Thumbnail
        sharp(imageBuffer)
          .rotate()
          .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
          .withMetadata(false)
          .webp({ quality: 75, effort: 6, smartSubsample: true })
          .toBuffer({ resolveWithObject: true })
          .then(async ({ data, info }) => ({
            url: await R2StorageService.uploadFile(data, keyThumbnail, 'image/webp'),
            info
          }))
      ])

      logger.info(`✅ Product images processed and uploaded to R2 for ${productId}`)

      return {
        original: {
          url: originalResult.url,
          filename: filenameOriginal,
          size: originalResult.info.size,
          width: originalResult.info.width,
          height: originalResult.info.height,
          uploaded_at: new Date().toISOString()
        },
        large: {
          url: largeResult.url,
          filename: filenameLarge,
          size: largeResult.info.size,
          width: largeResult.info.width,
          height: largeResult.info.height
        },
        thumbnail: {
          url: thumbResult.url,
          filename: filenameThumbnail,
          size: thumbResult.info.size,
          width: thumbResult.info.width,
          height: thumbResult.info.height
        }
      }

    } catch (error) {
      logger.error('❌ Failed to process product image:', error)
      throw error
    }
  }

  /**
   * Delete all versions of a product image
   * @param {string} filename - Base filename or filename of one version (we will derive others or search)
   * Note: The plan says "Accept productId or filename parameter", and "Delete all three versions".
   * Implemented logic relies on the naming convention: {productId}_{timestamp}_{suffix}.webp
   * If we get the stored 'image_filename' (which is the original filename or the one stored in DB),
   * we might need to handle how we stored it.
   * Plan Step 3 says: "image_filename: original filename".
   * Wait, Step 3 says: "Process image... Update Product model with... image_filename: original filename".
   * BUT Step 1 says: "Generate unique filenames using pattern: {productId}_{timestamp}.{ext}".
   * AND Step 3 says "delete old product images if they exist (check image_filename field)".
   * 
   * Actually, if we look at ProcessProductImage above:
   * We generate `filenameOriginal = ...`.
   * The DB stores `image_original_url`.
   * It also stores `image_filename`.
   * 
   * If `image_filename` stores the *uploaded* original filename (e.g. "photo.jpg"), that is NOT enough to find the files on disk if we renamed them to `{productId}_{timestamp}...`.
   * However, `image_original_url` contains the generated filename.
   * 
   * I will implement `deleteProductImages` to take the URLs or the specific generated filenames.
   * The Plan says: "Accept productId or filename parameter".
   * If I pass the `image_original_url` or parse the filename from it, I can find the others.
   * 
   * Let's assume we pass the *generated* base filename or we extract it from the URL.
   * Or better, since we have the convention `${productId}_${timestamp}_...`, if we know that, we can delete.
   * 
   * But Step 3 says Product model has fields `image_original_url`, `image_large_url` etc.
   * And `image_filename` which holds "original filename".
   * 
   * So we should use the URLs to derive the file paths to delete.
   * 
   * Let's implement `deleteProductImages` to take an object of filenames or just look for files starting with a prefix?
   * No, "Accept productId or filename parameter".
   * If I pass the generated filename (e.g. from the url), I can find the siblings.
   * 
   * Implementation: Pass the full filename of the original (e.g. "prod123_1234_original.webp") OR just the base.
   * I'll try to support deleting by the specific filenames found in the DB.
   * 
   * Actually, Step 3 says "Delete old product images... check image_filename... delete all three versions".
   * If `image_filename` is just "photo.jpg", we can't find the file.
   * We MUST rely on `image_original_url` to find the actual file on disk.
   * 
   * I'll implement `deleteProductImages(filenames)` where filenames is an array or object, 
   * OR `deleteProductImages(baseFilename)` if I can derive them.
   * 
   * Let's look at the generated names: 
   * `${baseFilename}_original.webp`
   * `${baseFilename}_large.webp`
   * `${baseFilename}_thumb.webp`
   * 
   * If I pass `${baseFilename}`, I can reconstruct the 3 names.
   * How do I get `${baseFilename}`? It is `${productId}_${timestamp}`.
   * 
   * I will implement `deleteProductImages` to accept the 3 specific expected filenames (or urls) to be safe, 
   * or simpler: accept the `image_original_url` (path part) and derive others? 
   * 
   * The Plan says: "Accept productId or filename parameter".
   * I will implement it to accept `filename` which is expected to be the 'main' generated filename if possible, 
   * but since the DB might not store the 'base', I'll make it accept the list of internal filenames to delete.
   * 
   * Wait, `pos.js` Step 3 says: "Delete old product images if they exist (check image_filename field, delete all three versions)".
   * This is tricky if `image_filename` is the USER's original filename.
   * BUT `image_original_url` contains the actual disk filename.
   * 
   * So in `pos.js`, I should probably extract the filenames from the URLs (original, large, thumbnail) and pass them to delete.
   * 
   * I will implement `deleteProductImages(filenames)` where filenames is an array of strings.
   * OR allow it to take `productId` and find them? No, that's dangerous.
   * 
   * Let's go with `deleteProductImages(uris)` where uris is an array of filenames in the products dir.
   */
  async deleteProductImages(filenames) {
    try {
      if (!Array.isArray(filenames)) {
        filenames = [filenames]
      }

      // Filter and extract R2 keys from URLs
      const keys = filenames
        .filter(Boolean)
        .map(entry => {
          try {
            // key is everything after public url - e.g. "products/..."
            const key = new URL(entry).pathname.slice(1);
            // Ensure no leading slash remains (pathname on Windows/some environments might behave differently)
            return key.startsWith('/') ? key.slice(1) : key;
          } catch (e) {
            // Fallback for relative paths or non-URL entries
            return entry.startsWith('/') ? entry.slice(1) : entry
          }
        })

      if (keys.length === 0) return true

      logger.info(`🗑️ Deleting product images from R2: ${keys.join(', ')}`)

      // Delete from R2 in parallel
      const results = await R2StorageService.deleteFiles(keys)
      
      return results.every(r => r === true)
    } catch (error) {
      logger.error('❌ Failed to delete product images from R2:', error)
      return false
    }
  }

}

// Export singleton instance
export default new ImageProcessingService()
