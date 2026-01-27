import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import QRCodeGenerator from '../utils/qrCodeGenerator'
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'

function QRCodeModal({ offer, type, identifier, options, onClose }) {
  const { t } = useTranslation(['common', 'cardDesign'])
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrOptions, setQrOptions] = useState({
    size: 512, // Default to high quality
    source: 'dashboard',
    branchId: offer?.branchId || null,
    type: options?.type || 'business'
  })

  useEffect(() => {
    generateQRCode()
  }, [offer, identifier, type])

  const generateQRCode = async () => {
    setLoading(true)
    try {
      if (type === 'menu') {
        if (!identifier) return
        const result = await QRCodeGenerator.generateMenuQRCode(identifier, {
          size: qrOptions.size,
          type: qrOptions.type,
          source: qrOptions.source
        })
        if (result.success) setQrData(result.data)
      } else {
        if (!offer) return
        const offerId = offer.public_id || offer.id
        const result = await QRCodeGenerator.generateQRCode(offerId, {
          size: qrOptions.size,
          branchId: qrOptions.branchId,
          source: qrOptions.source
        })
        if (result.success) setQrData(result.data)
      }
    } catch (error) {
      console.error('QR Generation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (format) => {
    if (!qrData) return
    try {
      let result
      if (type === 'menu') {
        result = await QRCodeGenerator.generateMenuForDownload(identifier, format, {
          size: format === 'png' ? 1024 : 512, // High res for download
          type: qrOptions.type
        })
      } else {
        result = await QRCodeGenerator.generateForDownload(qrData.offerId, format, {
          size: format === 'png' ? 1024 : 512,
          branchId: qrOptions.branchId
        })
      }

      if (result.success) {
        QRCodeGenerator.downloadQRCode(result.data.result, result.data.filename, format)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Only return null if it's not a menu type and offer is missing
  if (type !== 'menu' && !offer) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {type === 'menu' ? t('common:menu.scanCode') : t('cardDesign:qrCode.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {type === 'menu' ? t('common:menu.shareMenu') : offer?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* QR Display */}
        <div className="p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50">
          {loading ? (
            <div className="w-64 h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ) : qrData ? (
            <div className="relative group">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img
                  src={qrData.qrCodeDataUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
            </div>
          ) : (
            <div className="text-red-500">Error generating QR</div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleDownload('png')}
              disabled={loading || !qrData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>PNG</span>
            </button>
            <button
              onClick={() => handleDownload('svg')}
              disabled={loading || !qrData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>SVG</span>
            </button>
          </div>

          {qrData?.url && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate px-4">
                {qrData.url}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QRCodeModal