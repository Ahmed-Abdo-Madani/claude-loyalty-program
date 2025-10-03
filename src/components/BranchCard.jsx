import StatusBadge from './StatusBadge'

function BranchCard({
  branch,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onAnalytics,
  onManageOffers
}) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getBranchTypeIcon = (isMain) => {
    return isMain ? '🏠' : '🏪'
  }

  const getPerformanceColor = (revenue) => {
    if (revenue > 5000) return 'text-green-600 dark:text-green-400'
    if (revenue > 2000) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700">
      {/* Header with Branch Name and Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">{getBranchTypeIcon(branch.isMain)}</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {branch.name}
            </h3>
            {branch.isMain && (
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                Main
              </span>
            )}
          </div>
          {/* Status Badge */}
          <StatusBadge status={branch.status} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => onEdit(branch)}
            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Edit Branch"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {!branch.isMain && (
            <button
              onClick={() => onDelete(branch.public_id || branch.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Delete Branch"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Branch Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start space-x-2">
          <span className="text-gray-400 dark:text-gray-500 mt-0.5">📍</span>
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
            {branch.address}
            {branch.city && `, ${branch.city}`}
            {branch.state && `, ${branch.state}`}
            {branch.zip_code && ` ${branch.zip_code}`}
          </span>
        </div>

        {branch.phone && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 dark:text-gray-500">📞</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{branch.phone}</span>
          </div>
        )}

        {branch.manager_name && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 dark:text-gray-500">👤</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{branch.manager_name}</span>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {branch.customers || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Customers</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-primary">
            {branch.activeOffers || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Offers</div>
        </div>
        <div className="text-center">
          <div className={`text-xl font-bold ${getPerformanceColor(branch.monthlyRevenue || 0)}`}>
            {formatCurrency(branch.monthlyRevenue || 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Monthly</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Analytics Button */}
          <button
            onClick={() => onAnalytics && onAnalytics(branch)}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:text-primary dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="View Analytics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>

          {/* Manage Offers Button */}
          <button
            onClick={() => onManageOffers && onManageOffers(branch)}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:text-primary dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Manage Offers"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </button>

          {/* Duplicate Button */}
          <button
            onClick={() => onDuplicate(branch.public_id || branch.id)}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:text-primary dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Duplicate Branch"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Status Toggle Button */}
        <button
          onClick={() => onToggleStatus(branch.public_id || branch.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 touch-manipulation min-h-[44px] ${
            branch.status === 'active'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
          }`}
          title={branch.status === 'active' ? 'Deactivate Branch' : 'Activate Branch'}
        >
          {branch.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
        </button>
      </div>

      {/* Performance Indicator */}
      {branch.customers > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>Performance Score</span>
            <span>{Math.min(100, Math.round((branch.monthlyRevenue / 100) + (branch.customers / 10)))}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((branch.monthlyRevenue / 100) + (branch.customers / 10)))}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchCard