import { useTranslation } from 'react-i18next'
import StatusBadge from './StatusBadge'

function BranchCard({
  branch,
  onEdit,
  onDelete,
  onToggleStatus,
  onAnalytics,
  onManageOffers
}) {
  const { t } = useTranslation('dashboard')
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
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
    <div className="card-compact bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
      {/* Header with Branch Name and Actions */}
      <div className="flex items-start justify-between card-header-compact">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 mb-1">
            <span className="text-base">{getBranchTypeIcon(branch.isMain)}</span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {branch.name}
            </h3>
            {branch.isMain && (
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 py-0.5 rounded-full text-xs font-medium">
                {t('branches.mainBranch')}
              </span>
            )}
          </div>
          {/* Status Badge */}
          <StatusBadge status={branch.status} />
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => onEdit(branch)}
            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors duration-200 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation"
            title={t('branches.editBranch')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {!branch.isMain && (
            <button
              onClick={() => onDelete(branch.public_id || branch.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation"
              title={t('branches.deleteBranch')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Branch Details - Compact */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-start space-x-1.5">
          <span className="text-gray-400 dark:text-gray-500 mt-0.5 text-sm">📍</span>
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-1 line-clamp-2">
            {branch.address}
            {branch.city && `, ${branch.city}`}
            {branch.state && `, ${branch.state}`}
            {branch.zip_code && ` ${branch.zip_code}`}
          </span>
        </div>

        {branch.phone && (
          <div className="flex items-center space-x-1.5">
            <span className="text-gray-400 dark:text-gray-500 text-sm">📞</span>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{branch.phone}</span>
          </div>
        )}

        {branch.manager_name && (
          <div className="flex items-center space-x-1.5">
            <span className="text-gray-400 dark:text-gray-500 text-sm">👤</span>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{branch.manager_name}</span>
          </div>
        )}
      </div>

      {/* Performance Metrics - Inline horizontal */}
      <div className="flex items-center justify-between gap-3 mb-3 px-2 py-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
        <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
          <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {branch.customers || 0}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t('branches.customers')}</div>
        </div>
        <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
          <div className="text-base sm:text-lg font-bold text-primary">
            {branch.activeOffers || 0}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t('branches.offers')}</div>
        </div>
        <div className="flex-1 text-center">
          <div className={`text-base sm:text-lg font-bold ${getPerformanceColor(branch.monthlyRevenue || 0)}`}>
            {formatCurrency(branch.monthlyRevenue || 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t('branches.monthly')}</div>
        </div>
      </div>

      {/* Action Bar - Compact */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Analytics Button - Icon only on mobile */}
          <button
            onClick={() => onAnalytics && onAnalytics(branch)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:text-primary dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
            title={t('branches.viewAnalytics')}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline font-medium">{t('branches.viewAnalytics')}</span>
          </button>

          {/* Manage Offers Button - Icon only on mobile */}
          <button
            onClick={() => onManageOffers && onManageOffers(branch)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:text-primary dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
            title={t('branches.manageOffers')}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span className="hidden sm:inline font-medium">{t('branches.manageOffers')}</span>
          </button>
        </div>

        {/* Status Toggle Button - Compact */}
        <button
          onClick={() => onToggleStatus(branch.public_id || branch.id, branch.status)}
          className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 min-h-[36px] sm:min-h-[40px] ${
            branch.status === 'active'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
          }`}
          title={branch.status === 'active' ? t('branches.deactivateBranch') : t('branches.activateBranch')}
        >
          {branch.status === 'active' ? `⏸️ ${t('branches.pause')}` : `▶️ ${t('branches.activate')}`}
        </button>
      </div>
    </div>
  )
}

export default BranchCard