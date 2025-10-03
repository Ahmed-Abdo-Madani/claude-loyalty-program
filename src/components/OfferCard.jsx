import StatusBadge from './StatusBadge'

function OfferCard({ offer, onEdit, onDelete, onToggleStatus, onQRCode, onAnalytics, onDuplicate }) {

  const getOfferTypeIcon = (type) => {
    switch (type) {
      case 'stamps': return '🎫'
      case 'points': return '💎'
      case 'discount': return '🏷️'
      default: return '🎁'
    }
  }

  const getOfferTypeLabel = (type) => {
    switch (type) {
      case 'stamps': return 'Stamps Required'
      case 'points': return 'Points Required'
      case 'discount': return 'Discount Amount'
      default: return 'Requirements'
    }
  }

  const formatRequirement = (offer) => {
    if (offer.type === 'stamps') {
      return offer.stamps_required || 0
    } else if (offer.type === 'points') {
      return offer.stamps_required || 0 // API uses stamps_required for all types
    } else if (offer.type === 'discount') {
      return `${offer.discount_percentage || 0}%`
    }
    return offer.stamps_required || 0
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700">
      {/* Header with Title and Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">
            {offer.title}
          </h3>
          {/* Status Badge */}
          <StatusBadge status={offer.status} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => onEdit(offer)}
            className="p-2 sm:p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Edit Offer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(offer.public_id || offer.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
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
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {offer.description}
        </p>
      )}

      {/* QR Code Section - Prominent and Accessible */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          {/* Desktop Layout: Side by side */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  📱 QR Code
                </h4>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                  Ready
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Generate and share your offer QR code
              </p>
            </div>
            <button
              onClick={() => onQRCode(offer)}
              className="px-4 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center space-x-2 min-h-[44px]"
              title="Generate QR Code for this offer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Get QR Code</span>
            </button>
          </div>

          {/* Mobile Layout: Stacked */}
          <div className="sm:hidden space-y-3">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  📱 QR Code
                </h4>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                  Ready
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Generate and share your offer QR code
              </p>
            </div>
            <button
              onClick={() => onQRCode(offer)}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center space-x-2 min-h-[48px]"
              title="Generate QR Code for this offer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Get QR Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            {getOfferTypeLabel(offer.type)}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatRequirement(offer)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Times Redeemed
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {offer.redeemed || 0}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Branch:</span>
          <span className="text-gray-900 dark:text-white font-medium">{offer.branch || 'All Branches'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Customers:</span>
          <span className="text-gray-900 dark:text-white font-medium">{offer.customers || 0}</span>
        </div>
        {offer.is_time_limited && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Expires:</span>
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              {offer.end_date ? new Date(offer.end_date).toLocaleDateString() : 'No end date'}
            </span>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Analytics Button */}
          <button
            onClick={() => onAnalytics && onAnalytics(offer)}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:text-primary dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="View Analytics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>

          {/* Duplicate Button */}
          <button
            onClick={() => onDuplicate(offer.public_id || offer.id)}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:text-primary dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Duplicate Offer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Status Toggle Button */}
        <button
          onClick={() => onToggleStatus(offer.public_id || offer.id, offer.status)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 touch-manipulation min-h-[44px] ${
            offer.status === 'active'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
          }`}
          title={offer.status === 'active' ? 'Pause Offer' : 'Activate Offer'}
        >
          {offer.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
        </button>
      </div>

      {/* Performance Indicator */}
      {offer.customers > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>Redemption Rate</span>
            <span>{Math.round((offer.redeemed / offer.customers) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((offer.redeemed / offer.customers) * 100, 100)}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OfferCard