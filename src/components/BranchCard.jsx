import { useTranslation } from 'react-i18next'
import StatusBadge from './StatusBadge'

function BranchCard({
  branch,
  onEdit,
  onDelete,
  onToggleStatus,
  onRefresh,
  onManagerAccess
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
            type="button"
            onClick={() => onToggleStatus(branch.public_id || branch.id, branch.status)}
            className={`p-2 rounded-lg transition-colors duration-200 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation ${
              branch.status === 'active'
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30'
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
            }`}
            title={branch.status === 'active' ? t('branches.deactivateBranch') : t('branches.activateBranch')}
          >
            {branch.status === 'active' ? '⏸️' : '▶️'}
          </button>
          {!branch.isMain && (
            <button
              type="button"
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

      {/* Action Bar - Compact */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        {/* Manager Access Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            onManagerAccess(branch);
          }}
          className="px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 min-h-[36px] sm:min-h-[40px] bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
          title={t('branches.managerAccess')}
        >
          🔐 {t('branches.managerAccess')}
        </button>
        
        {/* Edit Button - Compact */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(branch); }}
          className="px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 min-h-[36px] sm:min-h-[40px] bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
          title={t('branches.editBranch')}
        >
          ✏️ {t('common.edit')}
        </button>
      </div>
    </div>
  )
}

export default BranchCard