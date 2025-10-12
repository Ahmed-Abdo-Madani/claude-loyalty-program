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
        {/* Hero Image (if exists) */}
        {hero_image_url && (
          <div className="w-full h-32 overflow-hidden">
            <img
              src={hero_image_url}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          </div>
        )}

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

          {/* Progress Section */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: foreground_color + '30' }}>
            {type === 'stamps' && progress_display_style === 'grid' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: foreground_color }}
                  >
                    Stamps
                  </span>
                  <span
                    className="text-sm opacity-90"
                    style={{ color: foreground_color }}
                  >
                    {mockProgress} / {stamps_required}
                  </span>
                </div>
                {/* Stamp Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: stamps_required }).map((_, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg flex items-center justify-center text-2xl
                        ${i < mockProgress ? 'opacity-100' : 'opacity-30'}`}
                      style={{
                        backgroundColor: foreground_color + (i < mockProgress ? '20' : '10'),
                        color: foreground_color
                      }}
                    >
                      {stamp_icon}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {type === 'stamps' && progress_display_style === 'bar' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: foreground_color }}
                  >
                    Progress
                  </span>
                  <span
                    className="text-sm opacity-90"
                    style={{ color: foreground_color }}
                  >
                    {mockProgress} / {stamps_required} {stamp_icon}
                  </span>
                </div>
                {/* Progress Bar */}
                <div
                  className="h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: foreground_color + '20' }}
                >
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${progressPercentage}%`,
                      backgroundColor: foreground_color
                    }}
                  />
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
                    Points Balance
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
      </div>

      {/* Platform Label */}
      <div className="flex items-center justify-center mt-3 space-x-2">
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Google Wallet Preview
        </span>
      </div>
    </div>
  )
}

export default GoogleWalletPreview
