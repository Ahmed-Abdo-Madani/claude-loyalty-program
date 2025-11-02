import { useTranslation } from 'react-i18next'
import BranchCard from './BranchCard'

function BranchGrid({
  branches,
  loading,
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">{t('branches.loading')}</p>
      </div>
    )
  }

  if (!branches || branches.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🏪</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('branches.noBranchesFound')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {t('branches.noBranchesDesc')}
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('branches.tryAdjustingFilters')}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Branches Grid - Compact spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {branches.map((branch) => (
          <BranchCard
            key={branch.public_id || branch.id}
            branch={branch}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onAnalytics={onAnalytics}
            onManageOffers={onManageOffers}
          />
        ))}
      </div>

      {/* Grid Summary - Compact horizontal bar */}
      <div className="flex items-center justify-around gap-2 sm:gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2 sm:px-3 py-2.5 border border-gray-200 dark:border-gray-700">
        <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
          <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {branches.length}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            {t('branches.total')}
          </div>
        </div>
        <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
          <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
            {branches.filter(branch => branch.status === 'active').length}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            {t('branches.active')}
          </div>
        </div>
        <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
          <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
            {branches.reduce((sum, branch) => sum + (branch.customers || 0), 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            {t('branches.customers')}
          </div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(branches.reduce((sum, branch) => sum + (branch.monthlyRevenue || 0), 0))}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            {t('branches.revenue')}
          </div>
        </div>
      </div>
    </>
  )
}

export default BranchGrid