/**
 * GoogleWalletPreview Component
 * Realistic preview of Google Wallet loyalty card
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'

function GoogleWalletPreview({ design, offerData }) {
  const { t } = useTranslation('cardDesign')

  const {
    background_color = '#059669', // Default to green
    foreground_color = '#FFFFFF',
    logo_google_url,
  } = design || {}

  const {
    title = t('preview.mockData.loyaltyCard'),
    stamps_required = 4,
    description
  } = offerData || {}

  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL('https://example.com/loyalty', {
      width: 180,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err))
  }, [])

  // Mock progress
  const mockProgress = 0

  return (
    <div className="flex flex-col items-center">
      {/* Google Wallet Card Container */}
      <div
        className="relative w-[320px] rounded-[24px] overflow-hidden shadow-2xl flex flex-col min-h-[500px]"
        style={{ backgroundColor: background_color }}
      >
        {/* Header Section */}
        <div className="p-6 flex items-center justify-between">
          {/* Logo */}
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white/20">
            {logo_google_url ? (
              <img src={logo_google_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200" />
            )}
          </div>

          {/* Business Name */}
          <h3 className="text-lg font-medium opacity-90 ml-3 flex-1 text-left" style={{ color: foreground_color }}>
            {offerData?.businessName || 'Madna'}
          </h3>

          <button className="text-white/80">
            <span className="sr-only">More options</span>
            •••
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center px-6 pt-4 pb-8 text-center space-y-6">

          {/* Offer Text */}
          <h2 className="text-2xl font-bold leading-tight" style={{ color: foreground_color }}>
            {description || `Buy ${stamps_required} cups and get 1 free`}
          </h2>

          {/* Stamps Collected Pill */}
          <div className="inline-flex items-center gap-1 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-sm font-medium" style={{ color: foreground_color }}>
              Stamps Collected {mockProgress}/{stamps_required}
            </span>
          </div>

          {/* QR Code Card */}
          <div className="bg-white p-4 rounded-2xl shadow-lg mt-4 w-full aspect-square flex items-center justify-center max-w-[220px]">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
            )}
          </div>

          <p className="text-xs opacity-80" style={{ color: foreground_color }}>
            Customer: cust_19a280df1f099b2839b
          </p>

        </div>

        {/* Decorative Geometric Footer Strip */}
        <div className="h-16 w-full bg-[#FEF3C7] relative overflow-hidden flex items-end">
          {/* Simple CSS Geometric Pattern Simulation */}
          <div className="absolute inset-0 opacity-80" style={{
            backgroundImage: `repeating-linear-gradient(
                   45deg,
                   #1fa27a 0px,
                   #1fa27a 10px,
                   transparent 10px,
                   transparent 20px
                 ), repeating-linear-gradient(
                   -45deg,
                   #1fa27a 0px,
                   #1fa27a 10px,
                   transparent 10px,
                   transparent 20px
                 )`
          }}></div>

          {/* Bottom edge decoration */}
          <div className="w-full h-4 bg-[#064E3B] z-10 opacity-20"></div>
        </div>

      </div>

      {/* Platform Label */}
      <div className="flex items-center justify-center mt-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Google Wallet
        </span>
      </div>
    </div>
  )
}

export default GoogleWalletPreview
