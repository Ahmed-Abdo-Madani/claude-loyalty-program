import StatusBadge from './StatusBadge'

function OfferCard({ offer, onEdit, onDelete, onToggleStatus, onQRCode, onAnalytics, onDuplicate, onDesignCard }) {
  // Normalize status to lowercase for consistent comparisons
  const isActive = (offer.status || '').toLowerCase() === 'active'

  return (
    <div className="card-compact bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
      {/* Header with Title and Actions */}
      <div className="flex items-start justify-between card-header-compact">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 truncate">
            {offer.title}
          </h3>
          {/* Status Badge */}
          <StatusBadge status={offer.status} />
        </div>

        {/* Action Buttons - Compact on desktop, normal on mobile */}
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => onEdit(offer)}
            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors duration-200 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation"
            title="Edit Offer Details & Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(offer.public_id || offer.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation"
            title="Delete Offer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Offer Description */}
      {offer.description && (
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {offer.description}
        </p>
      )}

      {/* Primary Actions - Simplified Button Group */}
      <div className="mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => onQRCode(offer)}
            className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center space-x-1.5 min-h-[36px] sm:min-h-[40px]"
            title="View & Share QR Code"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="text-xs sm:text-sm">QR Code</span>
          </button>
          <button
            onClick={() => onDesignCard && onDesignCard(offer)}
            className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center space-x-1.5 min-h-[36px] sm:min-h-[40px]"
            title="Customize Wallet Card Design"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span className="text-xs sm:text-sm">Card Design</span>
          </button>
        </div>
      </div>

      {/* Compact Info */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400">Branch:</span>
          <span className="text-gray-900 dark:text-white font-medium truncate ml-2">{offer.branch || 'All Branches'}</span>
        </div>
        {offer.is_time_limited && (
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">Expires:</span>
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              {offer.end_date ? new Date(offer.end_date).toLocaleDateString() : 'No end date'}
            </span>
          </div>
        )}
      </div>

      {/* Action Bar - Compact secondary actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Analytics Button - Always visible text */}
          <button
            onClick={() => onAnalytics && onAnalytics(offer)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
            title="View Offer Performance & Customer Insights"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">Analytics</span>
          </button>

          {/* Duplicate Button - Always visible text */}
          <button
            onClick={() => onDuplicate(offer.public_id || offer.id)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
            title="Create Copy of This Offer"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">Duplicate</span>
          </button>
        </div>

        {/* Status Toggle Button - Always visible text with status indicators */}
        <button
          onClick={() => onToggleStatus(offer.public_id || offer.id, offer.status)}
          className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
          title={isActive ? 'Pause Offer (Stops New Customer Sign-ups)' : 'Activate Offer (Allow New Sign-ups)'}
        >
          {isActive ? (
            <>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium">Pause</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium">Activate</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default OfferCard