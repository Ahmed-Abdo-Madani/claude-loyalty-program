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
   * @returns {Promise<{success: boolean, buffer: Buffer|null, reason?: string, status?: number}>} - Fetch result
   */
  static async fetchImage(url, options = {}) {
    const {
      timeoutMs = DEFAULT_TIMEOUT_MS,
      maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
      allowedContentTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
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
        return {
          success: false,
          buffer: null,
          status: response.status,
          reason: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      // Check Content-Type
      const contentType = response.headers.get('content-type')
      if (contentType && !allowedContentTypes.some(type => contentType.includes(type))) {
        logger.warn('⚠️ Image fetch failed - invalid content type', {
          url,
          contentType,
          allowed: allowedContentTypes
        })
        return {
          success: false,
          buffer: null,
          status: response.status,
          reason: `Invalid Content-Type: ${contentType}. Expected one of: ${allowedContentTypes.join(', ')}`
        }
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
          return {
            success: false,
            buffer: null,
            status: response.status,
            reason: `File too large (${(size / 1024 / 1024).toFixed(2)}MB exceeds ${maxSizeBytes / 1024 / 1024}MB limit)`
          }
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
          return {
            success: false,
            buffer: null,
            status: response.status,
            reason: `File too large during streaming (exceeded ${maxSizeBytes / 1024 / 1024}MB limit)`
          }
        }
        
        chunks.push(value)
      }

      const buffer = Buffer.concat(chunks)
      
      logger.info('✅ Image fetched successfully', {
        url,
        size: buffer.length,
        sizeMB: (buffer.length / 1024 / 1024).toFixed(2)
      })

      return {
        success: true,
        buffer,
        status: response.status
      }

    } catch (error) {
      clearTimeout(timeoutId)

      let reason = error.message
      if (error.name === 'AbortError') {
        reason = `Request timed out after ${timeoutMs}ms`
        logger.warn('⏱️ Image fetch timeout', {
          url,
          timeoutMs,
          error: reason
        })
      } else {
        logger.error('❌ Image fetch error', {
          url,
          error: error.message,
          errorType: error.name,
          stack: error.stack
        })
      }

      return {
        success: false,
        buffer: null,
        reason: reason
      }
    }
  }

  /**
   * Fetch multiple images in parallel with safety constraints
   * @param {Array<string>} urls - Array of image URLs
   * @param {object} options - Configuration options
   * @returns {Promise<Array<{success: boolean, buffer: Buffer|null, reason?: string, status?: number}>>} - Array of fetch results
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
   * @returns {Promise<{success: boolean, buffer: Buffer|null, reason?: string, status?: number}>} - Fetch result
   */
  static async fetchWithRetry(url, maxRetries = 2, options = {}) {
    let lastResult = { success: false, buffer: null, reason: 'No attempts made' }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`🔄 Fetch attempt ${attempt}/${maxRetries}`, { url })
      
      const result = await this.fetchImage(url, options)
      
      if (result.success) {
        return result
      }
      
      lastResult = result

      if (attempt < maxRetries) {
        const delay = attempt * 1000 // Exponential backoff
        logger.info(`⏳ Retrying in ${delay}ms...`, { url })
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    logger.error('❌ All fetch attempts failed', { url, maxRetries, reason: lastResult.reason })
    return lastResult
  }
}

export default SafeImageFetcher
