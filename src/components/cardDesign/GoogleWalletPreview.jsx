/**
 * GoogleWalletPreview Component
 * Realistic preview of Google Wallet loyalty card
 * Phase 2 - Frontend Components
 */

function GoogleWalletPreview({ design, offerData }) {
  const {
    background_color = '#3B82F6',
    foreground_color = '#FFFFFF',
    logo_google_url,
    hero_image_url,
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

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Google Wallet Card */}
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: background_color }}
      >
        {/* Card Content */}
        <div className="p-6">
          {/* Header with Logo */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3
                className="text-xl font-bold mb-1 line-clamp-1"
                style={{ color: foreground_color }}
              >
                {title}
              </h3>
              <p
                className="text-sm opacity-90 line-clamp-2"
                style={{ color: foreground_color }}
              >
                {description}
              </p>
            </div>

            {/* Circular Logo */}
            {logo_google_url && (
              <div
                className="w-16 h-16 rounded-full overflow-hidden ml-3 flex-shrink-0 border-2"
                style={{ borderColor: foreground_color + '40' }}
              >
                <img
                  src={logo_google_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Progress Section - Google Wallet Accurate Display (Phase 4) */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: foreground_color + '30' }}>
            {type === 'stamps' && (
              <div className="space-y-3">
                {/* Loyalty Points Label */}
                <div className="flex justify-between items-center">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: foreground_color }}
                  >
                    ⭐ Stamps Collected
                  </span>
                  <span
                    className="text-sm opacity-90"
                    style={{ color: foreground_color }}
                  >
                    {mockProgress} / {stamps_required}
                  </span>
                </div>

                {/* Visual Progress with Stars - Matches Google Wallet Text Module */}
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: foreground_color + '10' }}
                >
                  <p
                    className="text-xs font-semibold mb-2 opacity-90"
                    style={{ color: foreground_color }}
                  >
                    Your Progress
                  </p>
                  <div
                    className="text-lg leading-relaxed text-center py-2"
                    style={{ color: foreground_color }}
                  >
                    {'⭐'.repeat(mockProgress)}{'☆'.repeat(stamps_required - mockProgress)}
                  </div>
                  <p
                    className="text-xs text-center mt-2 opacity-75"
                    style={{ color: foreground_color }}
                  >
                    {mockProgress} of {stamps_required} stamps collected
                    <br />
                    {stamps_required - mockProgress === 0
                      ? '🎉 Reward Ready!'
                      : stamps_required - mockProgress === 1
                      ? 'Only 1 more stamp to go! 🎯'
                      : `${stamps_required - mockProgress} more stamps until reward! 🎁`
                    }
                  </p>
                </div>

                {/* Additional Info Modules - Matches Google Wallet Text Modules */}
                <div
                  className="rounded-lg p-3 space-y-2"
                  style={{ backgroundColor: foreground_color + '05' }}
                >
                  <div>
                    <p
                      className="text-xs font-semibold opacity-75"
                      style={{ color: foreground_color }}
                    >
                      🎁 Reward
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: foreground_color }}
                    >
                      {description || 'Free Item'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {type === 'points' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: foreground_color }}
                  >
                    ⭐ Points Balance
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: foreground_color }}
                  >
                    {mockProgress}
                  </span>
                </div>
                <p
                  className="text-xs opacity-75"
                  style={{ color: foreground_color }}
                >
                  {stamps_required - mockProgress} more to next reward
                </p>
              </div>
            )}
          </div>

          {/* Barcode Placeholder */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: foreground_color + '30' }}>
            <div
              className="h-16 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: foreground_color + '10' }}
            >
              <div className="flex space-x-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full"
                    style={{
                      height: `${20 + Math.random() * 20}px`,
                      backgroundColor: foreground_color,
                      opacity: 0.8
                    }}
                  />
                ))}
              </div>
            </div>
            <p
              className="text-xs text-center mt-2 opacity-75"
              style={{ color: foreground_color }}
            >
              Scan to collect stamps
            </p>
          </div>
        </div>

        {/* Hero Image at Bottom - Matches Google Wallet Display */}
        {hero_image_url && (
          <div className="w-full h-32 overflow-hidden border-t" style={{ borderColor: foreground_color + '20' }}>
            <img
              src={hero_image_url}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Platform Label */}
      <div className="flex items-center justify-center mt-3 space-x-2">
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Google Wallet Preview
        </span>
      </div>

      {/* Platform Limitations Disclaimer */}
      <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              Accurate Google Wallet Display
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              This preview matches Google Wallet's actual capabilities. Your custom colors, logo, and hero image will appear exactly as shown. Stamp progress is displayed with star emojis (⭐) per Google's platform requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoogleWalletPreview
