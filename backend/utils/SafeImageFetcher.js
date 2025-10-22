/**
 * Safe Image Fetcher Utility
 * 
 * Fetches external images with:
 * - Timeout protection (3-5s)
 * - Size caps (2-3MB max)
 * - AbortController for cancellation
 * - Content-Length validation
 * - Automatic fallback to placeholders
 */

import logger from '../config/logger.js'

const DEFAULT_TIMEOUT_MS = 5000 // 5 seconds
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024 // 3 MB

class SafeImageFetcher {
  /**
   * Fetch image with safety constraints
   * @param {string} url - Image URL to fetch
   * @param {object} options - Configuration options
   * @returns {Promise<Buffer|null>} - Image buffer or null on failure
   */
  static async fetchImage(url, options = {}) {
    const {
      timeoutMs = DEFAULT_TIMEOUT_MS,
      maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
      allowedContentTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      fallbackOnError = true
    } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      logger.info('🔽 Fetching image with safety constraints', {
        url,
        timeoutMs,
        maxSizeBytes,
        allowedContentTypes
      })

      // Fetch with abort signal
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LoyaltyPlatform/1.0 (Apple Wallet Pass Generator)'
        }
      })

      clearTimeout(timeoutId)

      // Check HTTP status
      if (!response.ok) {
        logger.warn('⚠️ Image fetch failed - HTTP error', {
          url,
          status: response.status,
          statusText: response.statusText
        })
        return null
      }

      // Check Content-Type
      const contentType = response.headers.get('content-type')
      if (contentType && !allowedContentTypes.some(type => contentType.includes(type))) {
        logger.warn('⚠️ Image fetch failed - invalid content type', {
          url,
          contentType,
          allowed: allowedContentTypes
        })
        return null
      }

      // Check Content-Length (if provided)
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const size = parseInt(contentLength, 10)
        if (size > maxSizeBytes) {
          logger.warn('⚠️ Image fetch rejected - exceeds size limit', {
            url,
            size,
            maxSizeBytes,
            sizeMB: (size / 1024 / 1024).toFixed(2)
          })
          return null
        }
        logger.info('📊 Image size check passed', {
          url,
          size,
          sizeMB: (size / 1024 / 1024).toFixed(2)
        })
      } else {
        logger.warn('⚠️ No Content-Length header, streaming with size check', { url })
      }

      // Stream response and check size
      const chunks = []
      let totalSize = 0

      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        totalSize += value.length
        
        // Enforce size cap during streaming
        if (totalSize > maxSizeBytes) {
          reader.cancel()
          logger.warn('⚠️ Image fetch aborted - size limit exceeded during streaming', {
            url,
            totalSize,
            maxSizeBytes,
            sizeMB: (totalSize / 1024 / 1024).toFixed(2)
          })
          return null
        }
        
        chunks.push(value)
      }

      const buffer = Buffer.concat(chunks)
      
      logger.info('✅ Image fetched successfully', {
        url,
        size: buffer.length,
        sizeMB: (buffer.length / 1024 / 1024).toFixed(2)
      })

      return buffer

    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        logger.warn('⏱️ Image fetch timeout', {
          url,
          timeoutMs,
          error: 'Request exceeded timeout limit'
        })
      } else {
        logger.error('❌ Image fetch error', {
          url,
          error: error.message,
          errorType: error.name,
          stack: error.stack
        })
      }

      return null
    }
  }

  /**
   * Fetch multiple images in parallel with safety constraints
   * @param {Array<string>} urls - Array of image URLs
   * @param {object} options - Configuration options
   * @returns {Promise<Array<Buffer|null>>} - Array of buffers (null for failures)
   */
  static async fetchMultiple(urls, options = {}) {
    const promises = urls.map(url => this.fetchImage(url, options))
    return await Promise.all(promises)
  }

  /**
   * Fetch image with automatic retry
   * @param {string} url - Image URL to fetch
   * @param {number} maxRetries - Maximum retry attempts
   * @param {object} options - Configuration options
   * @returns {Promise<Buffer|null>} - Image buffer or null on failure
   */
  static async fetchWithRetry(url, maxRetries = 2, options = {}) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`🔄 Fetch attempt ${attempt}/${maxRetries}`, { url })
      
      const result = await this.fetchImage(url, options)
      
      if (result) {
        return result
      }
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000 // Exponential backoff
        logger.info(`⏳ Retrying in ${delay}ms...`, { url })
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    logger.error('❌ All fetch attempts failed', { url, maxRetries })
    return null
  }
}

export default SafeImageFetcher
