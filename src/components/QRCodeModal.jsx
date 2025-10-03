import { useState, useEffect } from 'react'
import QRCodeGenerator from '../utils/qrCodeGenerator'

function QRCodeModal({ offer, onClose }) {
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadFormat, setDownloadFormat] = useState('png')
  const [qrOptions, setQrOptions] = useState({
    size: 256,
    source: 'dashboard',
    branchId: offer?.branchId || null
  })
  const [analytics, setAnalytics] = useState({
    scans: 0,
    downloads: 0,
    conversions: 0
  })

  useEffect(() => {
    if (offer) {
      generateQRCode()
      loadAnalytics()
    }
  }, [offer])

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

  if (!offer) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              📱 QR Code Generator
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate and manage QR code for "{offer.title}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Display */}
            <div className="order-2 lg:order-1">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-8 mb-6 border border-gray-200 dark:border-gray-600">
                {loading ? (
                  <div className="w-64 h-64 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center mx-auto">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : qrData ? (
                  <div className="text-center">
                    <img
                      src={qrData.qrCodeDataUrl}
                      alt="QR Code"
                      className="w-64 h-64 mx-auto border-2 border-white dark:border-gray-700 rounded-xl shadow-lg"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Scan to access loyalty program
                    </p>
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto border border-red-200 dark:border-red-800">
                    <div className="text-center">
                      <span className="text-red-600 dark:text-red-400 text-4xl mb-2 block">⚠️</span>
                      <span className="text-red-600 dark:text-red-400 text-sm">Failed to generate QR code</span>
                    </div>
                  </div>
                )}
              </div>

              {qrData && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
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
                      📋 Copy URL
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls and Analytics */}
            <div className="order-1 lg:order-2 space-y-6">
              {/* Performance Analytics */}
              <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  📊 Performance Analytics
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-primary">{analytics.scans}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Scans</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600">{analytics.conversions}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Signups</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-2xl font-bold text-purple-600">{analytics.downloads}</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Downloads</div>
                  </div>
                </div>
                <div className="text-center py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    📈 Conversion Rate: {analytics.scans > 0 ? Math.round((analytics.conversions / analytics.scans) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Download Options */}
              <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">📥 Download Options</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleDownload('png')}
                    className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-semibold border border-blue-200 dark:border-blue-800"
                  >
                    📱 PNG Format
                  </button>
                  <button
                    onClick={() => handleDownload('svg')}
                    className="px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-semibold border border-green-200 dark:border-green-800"
                  >
                    🎨 SVG Format
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <strong>PNG:</strong> Digital use, social media, apps<br/>
                  <strong>SVG:</strong> Scalable, professional printing, web
                </div>
              </div>

              {/* QR Code Settings */}
              <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">⚙️ Configuration</h4>
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

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">🚀 Quick Actions</h4>
                <div className="space-y-3">
                  <button
                    onClick={regenerateQR}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm font-semibold border border-gray-200 dark:border-gray-600"
                  >
                    🔄 Regenerate QR Code
                  </button>
                  <button
                    onClick={() => window.open(qrData?.url, '_blank')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-[1.02]"
                    disabled={!qrData}
                  >
                    👀 Preview Customer Experience
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Print Templates Section */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                🖨️ Print Templates
                <span className="ml-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 text-xs px-2 py-1 rounded-full">Coming Soon</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <button className="px-4 py-3 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 font-medium">
                  📄 Business Card
                </button>
                <button className="px-4 py-3 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 font-medium">
                  📋 Poster A4
                </button>
                <button className="px-4 py-3 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 font-medium">
                  🏪 Table Tent
                </button>
                <button className="px-4 py-3 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 font-medium">
                  🪟 Window Sign
                </button>
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                🎨 Professional print templates with custom branding options will be available soon
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg transform hover:scale-[1.02]"
          >
            ✨ Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRCodeModal