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
      // Generate unique offer ID if not exists
      const offerId = offer.qrCodeId || QRCodeGenerator.generateOfferId(offer.title)

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
    // Load analytics from localStorage (demo purposes)
    const events = JSON.parse(localStorage.getItem('qr_analytics') || '[]')
    const offerEvents = events.filter(e => e.offerId === offer.qrCodeId)

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            QR Code - "{offer.title}"
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <div className="text-center">
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              {loading ? (
                <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : qrData ? (
                <img
                  src={qrData.qrCodeDataUrl}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto border rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-red-600">Failed to generate QR code</span>
                </div>
              )}
            </div>

            {qrData && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>URL:</strong>
                </div>
                <div className="bg-gray-100 p-2 rounded text-xs break-all">
                  {qrData.url}
                </div>
                <button
                  onClick={copyUrl}
                  className="text-xs text-primary hover:text-blue-600"
                >
                  📋 Copy URL
                </button>
              </div>
            )}
          </div>

          {/* Controls and Analytics */}
          <div className="space-y-6">
            {/* Performance Analytics */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📊 Performance</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{analytics.scans}</div>
                  <div className="text-xs text-gray-500">Scans</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.conversions}</div>
                  <div className="text-xs text-gray-500">Signups</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{analytics.downloads}</div>
                  <div className="text-xs text-gray-500">Downloads</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Conversion Rate: {analytics.scans > 0 ? Math.round((analytics.conversions / analytics.scans) * 100) : 0}%
              </div>
            </div>

            {/* Download Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📥 Download Options</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownload('png')}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                >
                  📱 PNG
                </button>
                <button
                  onClick={() => handleDownload('svg')}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                >
                  🎨 SVG
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                PNG: Digital use, social media<br/>
                SVG: Scalable, professional printing
              </div>
            </div>

            {/* QR Code Settings */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⚙️ Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Size
                  </label>
                  <select
                    value={qrOptions.size}
                    onChange={(e) => setQrOptions({...qrOptions, size: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value={128}>Small (128px)</option>
                    <option value={256}>Medium (256px)</option>
                    <option value={512}>Large (512px)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Source Tracking
                  </label>
                  <select
                    value={qrOptions.source}
                    onChange={(e) => setQrOptions({...qrOptions, source: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="checkout">Checkout Counter</option>
                    <option value="table">Table Tent</option>
                    <option value="window">Window Display</option>
                    <option value="social">Social Media</option>
                    <option value="print">Print Marketing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🚀 Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={regenerateQR}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                >
                  🔄 Regenerate QR Code
                </button>
                <button
                  onClick={() => window.open(qrData?.url, '_blank')}
                  className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors text-sm"
                  disabled={!qrData}
                >
                  👀 Preview Customer View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Print Templates (Future Enhancement) */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">🖨️ Print Templates</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 transition-colors">
              📄 Business Card
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 transition-colors">
              📋 Poster
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 transition-colors">
              🏪 Table Tent
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 transition-colors">
              🪟 Window Sign
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Print templates coming soon with custom branding options
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRCodeModal