/**
 * AppleWalletPreview Component
 * Realistic preview of Apple Wallet pass
 * Phase 2 - Frontend Components
 */

import { hexToRgbString } from '../../utils/colorUtils'
import { apiBaseUrl } from '../../config/api'

function AppleWalletPreview({ design, offerData, customerData }) {
  const {
    background_color = '#3B82F6',
    foreground_color = '#FFFFFF',
    label_color = '#E0F2FE',
    logo_apple_url,
    stamp_icon = '⭐',
    progress_display_style = 'bar',
    stamp_display_type = 'icon' // 'icon' or 'logo'
  } = design || {}

  const {
    title = 'Loyalty Card',
    description = 'Your loyalty rewards',
    stamps_required = 10,
    type = 'stamps',
    businessName = 'Business Name'
  } = offerData || {}

  // Mock customer data for preview if not provided
  const mockCustomerName = customerData 
    ? `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim()
    : 'John Doe'

  // Mock progress for preview
  const mockProgress = Math.floor(stamps_required * 0.6) // 60% complete
  const progressPercentage = (mockProgress / stamps_required) * 100

  // Mock tier data for preview - Always show tier (New Member for 0 completions)
  const mockCompletions = 0 // Show 0 to demonstrate New Member tier
  const mockTier = {
    name: 'New Member',
    nameAr: 'عضو جديد',
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
                  Progress
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
                  Stamps Collected
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
                  Completed
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
                  Points Balance
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
                  Next Reward
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
                Member
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
                Member Since
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
                Reward
              </p>
              <p
                className="text-sm font-medium line-clamp-1"
                style={{ color: foreground_color }}
              >
                Free Item
              </p>
            </div>
          </div>
        </div>

        {/* Barcode Section */}
        <div className="border-t" style={{ borderColor: foreground_color + '30' }} />
        <div className="p-6 pt-4">
          <div
            className="h-20 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="flex space-x-0.5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-black rounded-sm"
                  style={{
                    height: `${30 + Math.random() * 30}px`
                  }}
                />
              ))}
            </div>
          </div>
          <p
            className="text-xs text-center mt-3 opacity-75 font-mono"
            style={{ color: foreground_color }}
          >
            LOYALTY-{Math.random().toString(36).substring(2, 10).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Platform Label */}
      <div className="flex items-center justify-center mt-3 space-x-2">
        <div className="w-3 h-3 rounded-full bg-black dark:bg-white"></div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Apple Wallet Preview
        </span>
      </div>

      {/* Platform Capabilities Info */}
      <div className="mt-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-xs font-medium text-green-900 dark:text-green-100">
              Full Design Control
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Apple Wallet supports all your design choices including Progress Display style (bar/grid), custom colors, logo, and stamp icons. What you see here is exactly what your customers will see.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppleWalletPreview
