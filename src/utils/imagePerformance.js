/**
 * Image Performance Monitoring Utility
 * Tracks load times, compression ratios, and other image-related metrics.
 * Active only in development mode.
 */

const metrics = {
    loadTimes: [],
    compressions: [],
    errors: [],
    lazyLoadedCount: 0
}

const isDev = import.meta.env.DEV

export const imagePerformance = {
    /**
     * Track image load time
     * @param {string} src - Image source URL
     * @param {number} duration - Load duration in ms
     */
    trackLoadTime: (src, duration) => {
        if (!isDev) return

        metrics.loadTimes.push({ src, duration, timestamp: Date.now() })
        metrics.lazyLoadedCount++

        // Log if significantly slow (> 1s)
        if (duration > 1000) {
            console.warn(`🐢 Slow image load (${duration.toFixed(0)}ms):`, src)
        }
    },

    /**
     * Track compression performance
     * @param {File} original - Original file
     * @param {File} compressed - Compressed file
     * @param {number} durationMs - Compression duration
     */
    trackCompression: (original, compressed, durationMs) => {
        if (!isDev) return

        const ratio = (1 - (compressed.size / original.size)) * 100

        const data = {
            originalSize: (original.size / 1024 / 1024).toFixed(2) + 'MB',
            compressedSize: (compressed.size / 1024 / 1024).toFixed(2) + 'MB',
            reduction: ratio.toFixed(1) + '%',
            duration: durationMs.toFixed(0) + 'ms'
        }

        metrics.compressions.push(data)

        console.group('🖼️ Image Compression Results')
        console.log('Reduction:', data.reduction)
        console.log('New Size:', data.compressedSize)
        console.log('Time:', data.duration)
        console.groupEnd()
    },

    /**
     * Track image load error
     * @param {string} src - Failed image source
     */
    trackError: (src) => {
        if (!isDev) return
        metrics.errors.push({ src, timestamp: Date.now() })
        console.error('❌ Image load failed:', src)
    },

    /**
     * Get current metrics summary
     */
    getSummary: () => {
        if (!isDev) return null

        const avgLoadTime = metrics.loadTimes.reduce((acc, curr) => acc + curr.duration, 0) / (metrics.loadTimes.length || 1)

        return {
            totalImagesLoaded: metrics.lazyLoadedCount,
            avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
            errors: metrics.errors.length,
            compressions: metrics.compressions.length
        }
    },

    /**
     * Log summary to console
     */
    logSummary: () => {
        if (!isDev) return
        console.log('📊 Image Performance Summary:', imagePerformance.getSummary())
    }
}

// Expose to window for debugging
if (isDev) {
    window.imagePerformance = imagePerformance
}

export default imagePerformance
