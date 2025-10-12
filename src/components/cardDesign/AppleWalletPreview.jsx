/**
 * AppleWalletPreview Component
 * Realistic preview of Apple Wallet pass
 * Phase 2 - Frontend Components
 */

import { hexToRgbString } from '../../utils/colorUtils'

function AppleWalletPreview({ design, offerData }) {
  const {
    background_color = '#3B82F6',
    foreground_color = '#FFFFFF',
    label_color = '#E0F2FE',
    logo_apple_url,
    stamp_icon = '⭐',
    progress_display_style = 'bar'
  } = design || {}

  const {
    title = 'Loyalty Card',
    description = 'Your loyalty rewards',
    stamps_required = 10,
    type = 'stamps'
  } = offerData || {}

  // Mock progress for preview
  const mockProgress = Math.floor(stamps_required * 0.6) // 60% complete
  const progressPercentage = (mockProgress / stamps_required) * 100

  // Convert hex to RGB for Apple Wallet style
  const bgRgb = hexToRgbString(background_color)
  const fgRgb = hexToRgbString(foreground_color)
  const labelRgb = hexToRgbString(label_color)

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Apple Wallet Pass */}
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: background_color }}
      >
        {/* Pass Header */}
        <div className="p-6 pb-4">
          {/* Logo and Title */}
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
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: label_color }}
              >
                Loyalty Card
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
                    className={`aspect-square rounded flex items-center justify-center text-xl
                      ${i < mockProgress ? 'opacity-100' : 'opacity-25'}`}
                    style={{
                      backgroundColor: foreground_color + '20',
                      color: foreground_color
                    }}
                  >
                    {stamp_icon}
                  </div>
                ))}
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
    </div>
  )
}

export default AppleWalletPreview
