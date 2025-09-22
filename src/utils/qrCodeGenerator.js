import QRCode from 'qrcode'

// QR Code Generator Utility
class QRCodeGenerator {
  constructor() {
    this.baseUrl = 'http://localhost:3000/join' // Will be environment-specific in production
  }

  // Generate unique offer ID (UUID-like)
  generateOfferId(title, businessId = 'default') {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    const prefix = title.toLowerCase().replace(/[^a-z0-9]/g, '').substr(0, 8)
    return `${prefix}-${timestamp}-${random}`
  }

  // Create offer URL with parameters
  createOfferUrl(offerId, options = {}) {
    const { branchId, source, ref } = options
    const url = new URL(`${this.baseUrl}/${offerId}`)

    if (branchId) url.searchParams.set('branch', branchId)
    if (source) url.searchParams.set('source', source)
    if (ref) url.searchParams.set('ref', ref)

    return url.toString()
  }

  // Generate QR code as data URL
  async generateQRCode(offerId, options = {}) {
    try {
      const url = this.createOfferUrl(offerId, options)

      const qrOptions = {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: options.size || 256
      }

      const qrCodeDataUrl = await QRCode.toDataURL(url, qrOptions)

      return {
        success: true,
        data: {
          qrCodeDataUrl,
          url,
          offerId,
          timestamp: new Date().toISOString(),
          options: qrOptions
        }
      }
    } catch (error) {
      console.error('QR Code generation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Generate QR code for download (different formats)
  async generateForDownload(offerId, format = 'png', options = {}) {
    try {
      const url = this.createOfferUrl(offerId, options)

      const baseOptions = {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        }
      }

      let result

      switch (format.toLowerCase()) {
        case 'png':
          result = await QRCode.toDataURL(url, {
            ...baseOptions,
            type: 'image/png',
            width: options.size || 512,
            quality: 0.95
          })
          break

        case 'svg':
          result = await QRCode.toString(url, {
            ...baseOptions,
            type: 'svg',
            width: options.size || 512
          })
          break

        case 'utf8':
          result = await QRCode.toString(url, {
            type: 'utf8',
            small: true
          })
          break

        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      return {
        success: true,
        data: {
          result,
          format,
          url,
          offerId,
          filename: `qr-${offerId}.${format}`,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error(`QR Code generation failed for format ${format}:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Create downloadable file blob
  createDownloadBlob(dataUrl, format = 'png') {
    if (format === 'svg') {
      return new Blob([dataUrl], { type: 'image/svg+xml' })
    }

    // Convert data URL to blob for PNG/JPEG
    const byteCharacters = atob(dataUrl.split(',')[1])
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: `image/${format}` })
  }

  // Trigger download
  downloadQRCode(dataUrl, filename, format = 'png') {
    try {
      const blob = this.createDownloadBlob(dataUrl, format)
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      console.error('Download failed:', error)
      return { success: false, error: error.message }
    }
  }

  // Generate multiple QR codes for batch operations
  async generateBatch(offers, options = {}) {
    const results = []

    for (const offer of offers) {
      const result = await this.generateQRCode(offer.id, {
        ...options,
        branchId: offer.branchId
      })

      results.push({
        offerId: offer.id,
        offerTitle: offer.title,
        ...result
      })
    }

    return results
  }

  // Validate QR code URL
  validateQRUrl(url) {
    try {
      const urlObj = new URL(url)
      const isValidDomain = urlObj.hostname === new URL(this.baseUrl).hostname
      const hasValidPath = urlObj.pathname.startsWith('/join/')

      return {
        isValid: isValidDomain && hasValidPath,
        domain: urlObj.hostname,
        path: urlObj.pathname,
        params: Object.fromEntries(urlObj.searchParams)
      }
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      }
    }
  }

  // Analytics helper - track QR code events
  trackQREvent(offerId, eventType, metadata = {}) {
    const event = {
      offerId,
      eventType, // 'generated', 'downloaded', 'scanned', 'converted'
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata
    }

    // Store in localStorage for demo purposes
    // In production, this would send to analytics service
    const events = JSON.parse(localStorage.getItem('qr_analytics') || '[]')
    events.push(event)
    localStorage.setItem('qr_analytics', JSON.stringify(events))

    console.log('QR Event Tracked:', event)
  }
}

// Export singleton instance
export default new QRCodeGenerator()