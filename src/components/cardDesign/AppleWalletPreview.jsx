/**
 * AppleWalletPreview Component
 * Realistic preview of Apple Wallet pass
 */

import { useMemo, useState, useEffect } from 'react'
import { apiBaseUrl } from '../../config/api'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'

function AppleWalletPreview({ design, offerData, customerData }) {
  const { t } = useTranslation('cardDesign')
  const {
    background_color = '#1E3A8A', // Default to dark blue
    foreground_color = '#FFFFFF',
    label_color = '#E0F2FE',
    logo_apple_url,
    hero_image_url
  } = design || {}

  const {
    title = t('preview.mockData.loyaltyCard'),
    description = t('preview.mockData.loyaltyRewards'),
    stamps_required = 5,
    businessName = 'Madna'
  } = offerData || {}

  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL('https://example.com/loyalty', {
      width: 150,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err))
  }, [])

  // Mock Data
  const mockProgress = 0
  const mockCompletions = 0
  const mockCustomerName = customerData
    ? `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim()
    : 'Abdullah'

  return (
    <div className="flex flex-col items-center">
      {/* Apple Wallet Pass Container */}
      <div
        className="relative w-[320px] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: background_color }}
      >
        {/* Header Section */}
        <div className="p-4 flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-2">
            {logo_apple_url ? (
              <div className="w-8 h-8 rounded-md bg-white p-0.5 overflow-hidden">
                <img src={logo_apple_url} alt="Logo" className="w-full h-full object-cover rounded-sm" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-xs text-white border border-white/30">
                Logo
              </div>
            )}
            <span className="font-semibold text-lg" style={{ color: foreground_color }}>
              {businessName}
            </span>
          </div>
          <span className="text-sm font-medium opacity-90" style={{ color: foreground_color }}>
            {title}
          </span>
        </div>

        {/* Hero Image Strip */}
        <div className="w-full h-40 bg-black/20 flex items-center justify-center overflow-hidden relative">
          {hero_image_url ? (
            <img src={hero_image_url} alt="Strip" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 opacity-30">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="w-12 h-12 border-2 border-white/40 rounded-lg flex items-center justify-center">
                    ☕
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Stats Section */}
        <div className="w-full p-4 grid grid-cols-3 gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
          {/* Column 1: Progress */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold opacity-70 mb-0.5" style={{ color: label_color }}>
              {t('preview.labels.progress') || 'Progress'}
            </span>
            <span className="text-xl font-medium" style={{ color: foreground_color }}>
              {mockProgress} / {stamps_required}
            </span>
          </div>

          {/* Column 2: Completed */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold opacity-70 mb-0.5" style={{ color: label_color }}>
              {t('preview.labels.completed') || 'Completed'}
            </span>
            <span className="text-xl font-medium" style={{ color: foreground_color }}>
              {mockCompletions}x
            </span>
          </div>

          {/* Column 3: Member Name */}
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold opacity-70 mb-0.5" style={{ color: label_color }}>
              {t('preview.labels.member') || 'Member'}
            </span>
            <span className="text-xl font-medium truncate" style={{ color: foreground_color }}>
              {mockCustomerName}
            </span>
          </div>
        </div>

        {/* QR Code Section (Bottom Attached) */}
        <div className="w-full p-6 pt-8 pb-8 flex flex-col items-center justify-center bg-transparent mt-auto relative z-10">
          {/* QR Container */}
          <div className="bg-white p-3 rounded-xl shadow-sm mb-2">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 object-contain" />
            )}
          </div>
          <span className="text-xs font-medium opacity-90 mt-1" style={{ color: foreground_color }}>
            Scan to earn stamps
          </span>
        </div>

      </div>

      {/* Platform Label */}
      <div className="flex items-center justify-center mt-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-black dark:bg-white"></div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Apple Wallet
        </span>
      </div>
    </div>
  )
}

export default AppleWalletPreview
