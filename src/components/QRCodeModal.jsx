import { useState, useEffect, useRef } from 'react'
import QRCodeGenerator from '../utils/qrCodeGenerator'
import useMediaQuery from '../hooks/useMediaQuery'

function QRCodeModal({ offer, onClose }) {
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadFormat, setDownloadFormat] = useState('png')
  const [qrOptions, setQrOptions] = useState({
    size: 256,
    source: 'in_store',
    branchId: offer?.branchId || null
  })
  const [analytics, setAnalytics] = useState({
    scans: 0,
    downloads: 0,
    conversions: 0
  })
  const [expandedSection, setExpandedSection] = useState(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Focus management and keyboard navigation
  useEffect(() => {
    if (!modalRef.current) return

    // Focus the close button on mount
    closeButtonRef.current?.focus()

    // Get all focusable elements within modal
    const getFocusableElements = () => {
      const focusableSelectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      return Array.from(modalRef.current.querySelectorAll(focusableSelectors))
    }

    // Handle keyboard events
    const handleKeyDown = (e) => {
      // Escape key closes modal
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Tab key for focus trap
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements()
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        const activeElement = document.activeElement

        // Shift+Tab on first element -> go to last
        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
        // Tab on last element -> go to first
        else if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (offer) {
      generateQRCode()
      loadAnalytics()
    }
  }, [offer])

  // Auto-regenerate QR when size or source changes (debounced)
  useEffect(() => {
    if (!offer) return
    
    const timeoutId = setTimeout(() => {
      generateQRCode()
    }, 200) // 200ms debounce

    return () => clearTimeout(timeoutId)
  }, [qrOptions.size, qrOptions.source])

  const generateQRCode = async () => {
    if (!offer) return

    setLoading(true)
    try {
      // Use the public_id for QR codes (scalable unique identifier)
      const offerId = offer.public_id || offer.id

      const result = await QRCodeGenerator.generateQRCode(offerId, {
        size: qrOptions.size,
        branchId: qrOptions.branchId,
        source: qrOptions.source
      })

      if (result.success) {
        setQrData(result.data)
        // Track generation event
        QRCodeGenerator.trackQREvent(offerId, 'generated', {
          offerTitle: offer.title,
          branchId: qrOptions.branchId
        })
      } else {
        console.error('QR Generation failed:', result.error)
      }
    } catch (error) {
      console.error('QR Generation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = () => {
    // Load analytics from business-specific localStorage
    const businessId = localStorage.getItem('businessId') || 'default'
    const storageKey = `qr_analytics_${businessId}`
    const events = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const offerId = offer.public_id || offer.id
    const offerEvents = events.filter(e => e.offerId === offerId)

    setAnalytics({
      scans: offerEvents.filter(e => e.eventType === 'scanned').length,
      downloads: offerEvents.filter(e => e.eventType === 'downloaded').length,
      conversions: offerEvents.filter(e => e.eventType === 'converted').length
    })
  }

  const handleDownload = async (format) => {
    if (!qrData) return

    try {
      const result = await QRCodeGenerator.generateForDownload(
        qrData.offerId,
        format,
        {
          size: format === 'png' ? 512 : 256,
          branchId: qrOptions.branchId
        }
      )

      if (result.success) {
        const downloadResult = QRCodeGenerator.downloadQRCode(
          result.data.result,
          result.data.filename,
          format
        )

        if (downloadResult.success) {
          // Track download event
          QRCodeGenerator.trackQREvent(qrData.offerId, 'downloaded', {
            format,
            offerTitle: offer.title
          })

          // Update analytics
          setAnalytics(prev => ({
            ...prev,
            downloads: prev.downloads + 1
          }))
        }
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const copyUrl = () => {
    if (qrData?.url) {
      navigator.clipboard.writeText(qrData.url)
      // Could add a toast notification here
    }
  }

  const regenerateQR = () => {
    generateQRCode()
  }

  // Accordion Section Component
  const AccordionSection = ({ id, title, icon, isExpanded, onToggle, children }) => {
    const contentRef = useRef(null)

    useEffect(() => {
      if (isExpanded && !isDesktop && contentRef.current) {
        setTimeout(() => {
          contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 150)
      }
    }, [isExpanded])

    const handleToggle = () => {
      if (!isDesktop) {
        onToggle()
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleToggle()
      }
    }

    return (
      <div ref={contentRef} className="w-full">
        <button
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-expanded={isDesktop || isExpanded}
          aria-controls={`accordion-${id}`}
          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
            isDesktop
              ? 'bg-transparent border-transparent cursor-default'
              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="font-semibold text-gray-900 dark:text-white text-left">{title}</span>
          </div>
          {!isDesktop && (
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        <div
          id={`accordion-${id}`}
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isDesktop
              ? 'max-h-none opacity-100'
              : isExpanded
              ? 'max-h-[1000px] opacity-100'
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`${isDesktop ? 'pt-0' : 'pt-3'} ${!isDesktop && isExpanded ? 'overflow-y-auto' : ''}`}>{children}</div>
        </div>
      </div>
    )
  }

  if (!offer) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl shadow-lg lg:shadow-2xl max-w-4xl w-full max-h-[95vh] lg:max-h-[90vh] lg:overflow-y-auto border border-gray-200 dark:border-gray-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 id="qr-modal-title" className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              📱 QR Code Generator
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate and manage QR code for "{offer.title}"
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
            {/* QR Code Display - Always Visible */}
            <div className="lg:order-1">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 lg:p-8 border border-gray-200 dark:border-gray-600">
                {loading ? (
                  <div className="w-48 h-48 lg:w-64 lg:h-64 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center mx-auto">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : qrData ? (
                  <div className="text-center">
                    <img
                      src={qrData.qrCodeDataUrl}
                      alt="QR Code"
                      className="w-48 h-48 lg:w-64 lg:h-64 mx-auto border-2 border-white dark:border-gray-700 rounded-xl shadow-lg"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Scan to access loyalty program
                    </p>
                  </div>
                ) : (
                  <div className="w-48 h-48 lg:w-64 lg:h-64 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto border border-red-200 dark:border-red-800">
                    <div className="text-center">
                      <span className="text-red-600 dark:text-red-400 text-4xl mb-2 block">⚠️</span>
                      <span className="text-red-600 dark:text-red-400 text-sm">Failed to generate QR code</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Actions - Always Visible on Mobile */}
              <div className="mt-4 lg:hidden">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDownload('png')}
                    disabled={!qrData}
                    className="px-3 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-all duration-200 text-sm font-semibold border border-blue-200 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Download PNG"
                  >
                    <span className="block text-center">📱</span>
                    <span className="block text-xs mt-1">PNG</span>
                  </button>
                  <button
                    onClick={() => handleDownload('svg')}
                    disabled={!qrData}
                    className="px-3 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-95 transition-all duration-200 text-sm font-semibold border border-green-200 dark:border-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Download SVG"
                  >
                    <span className="block text-center">🎨</span>
                    <span className="block text-xs mt-1">SVG</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Controls and Analytics - Collapsible on Mobile */}
            <div className="lg:order-2 space-y-4 lg:space-y-6">
              {/* Analytics Accordion */}
              <AccordionSection
                id="analytics"
                title="Performance Analytics"
                icon="📊"
                isExpanded={expandedSection === 'analytics'}
                onToggle={() => setExpandedSection(expandedSection === 'analytics' ? null : 'analytics')}
              >
                <div className="bg-white dark:bg-gray-700 rounded-xl p-4 lg:p-6 border border-gray-200 dark:border-gray-600 mt-3">
                  <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-4">
                    <div className="text-center p-2 lg:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-xl lg:text-2xl font-bold text-primary">{analytics.scans}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Scans</div>
                    </div>
                    <div className="text-center p-2 lg:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xl lg:text-2xl font-bold text-green-600">{analytics.conversions}</div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">Signups</div>
                    </div>
                    <div className="text-center p-2 lg:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-xl lg:text-2xl font-bold text-purple-600">{analytics.downloads}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Downloads</div>
                    </div>
                  </div>
                  <div className="text-center py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      📈 Conversion Rate: {analytics.scans > 0 ? Math.round((analytics.conversions / analytics.scans) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </AccordionSection>

              {/* Download Options - Desktop Only (Mobile has primary actions) */}
              <div className="hidden lg:block">
                <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">📥 Download Options</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => handleDownload('png')}
                      disabled={!qrData}
                      className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-semibold border border-blue-200 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📱 PNG Format
                    </button>
                    <button
                      onClick={() => handleDownload('svg')}
                      disabled={!qrData}
                      className="px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-semibold border border-green-200 dark:border-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🎨 SVG Format
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <strong>PNG:</strong> Digital use, social media, apps<br/>
                    <strong>SVG:</strong> Scalable, professional printing, web
                  </div>
                </div>
              </div>

              {/* Settings Accordion */}
              <AccordionSection
                id="settings"
                title="Configuration"
                icon="⚙️"
                isExpanded={expandedSection === 'settings'}
                onToggle={() => setExpandedSection(expandedSection === 'settings' ? null : 'settings')}
              >
                <div className="bg-white dark:bg-gray-700 rounded-xl p-4 lg:p-6 border border-gray-200 dark:border-gray-600 mt-3">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        📏 QR Code Size
                      </label>
                      <select
                        value={qrOptions.size}
                        onChange={(e) => setQrOptions({...qrOptions, size: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      >
                        <option value={128}>📱 Small (128px)</option>
                        <option value={256}>💻 Medium (256px)</option>
                        <option value={512}>🖥️ Large (512px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        📍 Source Tracking
                      </label>
                      <select
                        value={qrOptions.source}
                        onChange={(e) => setQrOptions({...qrOptions, source: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      >
                        <option value="dashboard">🏢 Dashboard</option>
                        <option value="checkout">🛒 Checkout Counter</option>
                        <option value="table">🍽️ Table Tent</option>
                        <option value="window">🪟 Window Display</option>
                        <option value="social">📱 Social Media</option>
                        <option value="print">🖨️ Print Marketing</option>
                      </select>
                    </div>
                  </div>
                </div>
              </AccordionSection>

              {/* Advanced Options Accordion */}
              <AccordionSection
                id="advanced"
                title="Advanced Options"
                icon="🚀"
                isExpanded={expandedSection === 'advanced'}
                onToggle={() => setExpandedSection(expandedSection === 'advanced' ? null : 'advanced')}
              >
                <div className="bg-white dark:bg-gray-700 rounded-xl p-4 lg:p-6 border border-gray-200 dark:border-gray-600 mt-3 space-y-4">
                  {/* URL Copy */}
                  {qrData && (
                    <div>
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        🔗 Landing Page URL
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs break-all font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        {qrData.url}
                      </div>
                      <button
                        onClick={copyUrl}
                        className="mt-2 text-sm text-primary hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                      >
                        � Copy URL
                      </button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={regenerateQR}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all duration-200 text-sm font-semibold border border-gray-200 dark:border-gray-600"
                    >
                      🔄 Regenerate QR Code
                    </button>
                    <button
                      onClick={() => window.open(qrData?.url, '_blank')}
                      className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      disabled={!qrData}
                    >
                      👀 Preview Customer Experience
                    </button>
                  </div>
                </div>
              </AccordionSection>
            </div>
          </div>
        </div>

        {/* Footer - Simplified for Mobile */}
        <div className="flex justify-center lg:justify-end p-4 lg:p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all duration-200 font-semibold shadow-lg"
          >
            ✨ Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRCodeModal