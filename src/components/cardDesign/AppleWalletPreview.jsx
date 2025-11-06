/**
 * AppleWalletPreview Component
 * Realistic preview of Apple Wallet pass
 * Phase 2 - Frontend Components
 */

import { useMemo } from 'react'
import { hexToRgbString } from '../../utils/colorUtils'
import { apiBaseUrl } from '../../config/api'
import { useTranslation } from 'react-i18next'

function AppleWalletPreview({ design, offerData, customerData }) {
  const { t } = useTranslation('cardDesign')
  const {
    background_color = '#3B82F6',
    foreground_color = '#FFFFFF',
    label_color = '#E0F2FE',
    logo_apple_url,
    stamp_icon = '⭐',
    progress_display_style = 'bar',
    stamp_display_type = 'icon', // 'icon' or 'logo'
    barcode_preference = 'PDF417' // Default to PDF417 to match backend
  } = design || {}

  const {
    title = t('preview.mockData.loyaltyCard'),
    description = t('preview.mockData.loyaltyRewards'),
    stamps_required = 10,
    type = 'stamps',
    businessName = t('preview.mockData.businessName')
  } = offerData || {}

  // Mock customer data for preview if not provided
  const mockCustomerName = customerData 
    ? `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim()
    : t('preview.mockData.customerName')

  // Mock progress for preview
  const mockProgress = Math.floor(stamps_required * 0.6) // 60% complete
  const progressPercentage = (mockProgress / stamps_required) * 100

  // Mock tier data for preview - Always show tier (New Member for 0 completions)
  const mockCompletions = 0 // Show 0 to demonstrate New Member tier
  const mockTier = {
    name: t('preview.tier.newMember'),
    nameAr: t('preview.tier.newMember'),
    icon: '👋',
    color: '#6B7280'
  }

  // Convert hex to RGB for Apple Wallet style
  const bgRgb = hexToRgbString(background_color)
  const fgRgb = hexToRgbString(foreground_color)
  const labelRgb = hexToRgbString(label_color)

  // Helper function to render stamp icon (emoji or icon ID)
  const renderStampIcon = (stampIcon) => {
    if (!stampIcon) return '⭐'
    
    // Check if it's an emoji (1-4 chars, no hyphen)
    const isEmoji = stampIcon.length <= 4 && !stampIcon.includes('-')
    
    if (isEmoji) {
      return stampIcon
    }
    
    // It's an icon ID, render as image
    return (
      <img
        src={`${apiBaseUrl}/api/stamp-icons/${stampIcon}/preview`}
        alt="stamp icon"
        className="inline-block w-4 h-4 object-contain"
        onError={(e) => {
          // Fallback to star emoji if image fails to load
          e.target.style.display = 'none'
          e.target.insertAdjacentHTML('afterend', '⭐')
        }}
      />
    )
  }

  // Memoized barcode patterns to prevent flicker on re-render
  // Seeded by offer title or ID for consistency
  const barcodePatterns = useMemo(() => {
    // Create a simple seed from offer title/ID for consistent pseudo-random values
    const seed = offerData?.title || offerData?.id || 'default'
    const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    // Seeded pseudo-random function
    const seededRandom = (index) => {
      const x = Math.sin(seedNum + index) * 10000
      return x - Math.floor(x)
    }

    // Generate PDF417 pattern (5 horizontal bars with varying widths)
    const pdf417Bars = Array.from({ length: 5 }).map((_, i) => ({
      width: `${60 + seededRandom(i) * 40}%`,
      marginLeft: `${seededRandom(i + 10) * 20}%`
    }))

    // Generate QR code pattern (8x8 grid of on/off blocks)
    const qrGrid = Array.from({ length: 8 }).map((_, row) =>
      Array.from({ length: 8 }).map((_, col) => ({
        isOn: seededRandom(row * 8 + col) > 0.5
      }))
    )

    return { pdf417Bars, qrGrid }
  }, [offerData?.title, offerData?.id])

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Apple Wallet Pass */}
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: background_color }}
      >
        {/* Pass Header */}
        <div className="p-6 pb-4">
          {/* Logo and Business Name Header - PHASE 1 */}
          <div className="flex items-start justify-between mb-6">
            {logo_apple_url && (
              <img
                src={logo_apple_url}
                alt="Logo"
                className="h-10 object-contain"
                style={{ maxWidth: '160px' }}
              />
            )}
            <div className="text-right ml-3">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: foreground_color, maxWidth: '180px' }}
                title={businessName}
              >
                {businessName}
              </p>
            </div>
          </div>

          {/* Main Title */}
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: foreground_color }}
          >
            {title}
          </h2>

          {/* Description */}
          <p
            className="text-sm opacity-90 line-clamp-2"
            style={{ color: foreground_color }}
          >
            {description}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: foreground_color + '30' }} />

        {/* Pass Body */}
        <div className="p-6 space-y-4">
          {/* Progress Display */}
          {type === 'stamps' && progress_display_style === 'bar' && (
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: label_color }}
                >
                  {t('preview.labels.progress')}
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: foreground_color }}
                >
                  {mockProgress} / {stamps_required}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: foreground_color + '25' }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: foreground_color
                  }}
                />
              </div>
            </div>
          )}

          {type === 'stamps' && progress_display_style === 'grid' && (
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: label_color }}
                >
                  {t('preview.labels.stampsCollected')}
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: foreground_color }}
                >
                  {mockProgress} / {stamps_required}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: Math.min(stamps_required, 10) }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded flex items-center justify-center overflow-hidden
                      ${i < mockProgress ? 'opacity-100' : 'opacity-25'}`}
                    style={{
                      backgroundColor: foreground_color + '20'
                    }}
                  >
                    {stamp_display_type === 'logo' && logo_apple_url ? (
                      <img
                        src={logo_apple_url}
                        alt="Stamp"
                        className="w-full h-full object-cover p-1"
                      />
                    ) : (
                      <span className="text-xl" style={{ color: foreground_color }}>
                        {renderStampIcon(stamp_icon)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Counter - Always show (even at 0) */}
          {type === 'stamps' && (
            <div className="pt-2">
              <div className="flex justify-between items-baseline">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: label_color }}
                >
                  {t('preview.labels.completed')}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: foreground_color }}
                >
                  {mockCompletions}x
                </span>
              </div>
            </div>
          )}

          {/* Customer Tier - Always show */}
          {type === 'stamps' && mockTier && (
            <div className="pt-2">
              <div className="flex justify-between items-baseline">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: label_color }}
                >
                  {/* Empty label for cleaner appearance */}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: foreground_color }}
                >
                  {mockTier.icon} {mockTier.name}
                </span>
              </div>
            </div>
          )}

          {type === 'points' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: label_color }}
                >
                  {t('preview.labels.pointsBalance')}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: foreground_color }}
                >
                  {mockProgress}
                </p>
              </div>
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: label_color }}
                >
                  {t('preview.labels.nextReward')}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: foreground_color }}
                >
                  {stamps_required}
                </p>
              </div>
            </div>
          )}

          {/* PHASE 2: Customer Name - Auxiliary Field (Right Side Under Hero) */}
          <div className="pt-2">
            <div className="text-right">
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: label_color }}
              >
                {t('preview.labels.member')}
              </p>
              <p
                className="text-base font-medium"
                style={{ color: foreground_color }}
              >
                {mockCustomerName}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: label_color }}
              >
                {t('preview.labels.memberSince')}
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: foreground_color }}
              >
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: label_color }}
              >
                {t('preview.labels.reward')}
              </p>
              <p
                className="text-sm font-medium line-clamp-1"
                style={{ color: foreground_color }}
              >
                {t('preview.mockData.freeItem')}
              </p>
            </div>
          </div>
        </div>

        {/* Barcode Section */}
        <div className="border-t" style={{ borderColor: foreground_color + '30' }} />
        <div className="p-6 pt-4">
          {/* Conditional Barcode Rendering */}
          {barcode_preference === 'PDF417' ? (
            // PDF417: Full-width rectangular barcode (airline boarding pass style)
            <div
              className="h-16 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="flex flex-col gap-0.5 w-full px-4">
                {/* Render 5 horizontal bars with memoized widths */}
                {barcodePatterns.pdf417Bars.map((bar, i) => (
                  <div
                    key={i}
                    className="h-2 bg-black rounded-sm"
                    style={{
                      width: bar.width,
                      marginLeft: bar.marginLeft
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            // QR_CODE: Square centered barcode (traditional QR code grid style)
            <div
              className="rounded-lg flex items-center justify-center p-4"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              {/* Square aspect ratio container */}
              <div className="w-24 h-24 grid grid-cols-8 gap-0.5 p-1 bg-white">
                {/* Render 8x8 grid of blocks with memoized pattern */}
                {barcodePatterns.qrGrid.flat().map((block, i) => (
                  <div
                    key={i}
                    className={`rounded-sm ${block.isOn ? 'bg-black' : 'bg-gray-100'}`}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Barcode number - keep as-is */}
          <p
            className="text-xs text-center mt-3 opacity-75 font-mono"
            style={{ color: foreground_color }}
          >
            LOYALTY-{Math.random().toString(36).substring(2, 10).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Platform Label */}
      <div className="flex items-center justify-center mt-3 gap-2">
        <div className="w-3 h-3 rounded-full bg-black dark:bg-white"></div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {t('preview.apple.title')}
        </span>
      </div>

      {/* Platform Capabilities Info */}
      <div className="mt-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-xs font-medium text-green-900 dark:text-green-100">
              {t('preview.apple.fullDesignControl')}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              {t('preview.apple.fullDesignControlDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppleWalletPreview
