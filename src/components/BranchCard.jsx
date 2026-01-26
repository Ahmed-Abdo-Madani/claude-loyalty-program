import { useTranslation } from 'react-i18next'
import StatusBadge from './StatusBadge'
import {
  BuildingStorefrontIcon,
  HomeModernIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  TrashIcon,
  PencilSquareIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

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

  const isActive = branch.status === 'active'

  return (
    <div className="card-compact bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
      {/* Header with Branch Name and Actions */}
      <div className="flex items-start justify-between card-header-compact">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {branch.isMain ? (
              <HomeModernIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            ) : (
              <BuildingStorefrontIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            )}
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

        {/* Action Buttons - Edit and Delete only */}
        <div className="flex items-center space-x-1 ml-2">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(branch); }}
            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors duration-200 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation"
            title={t('branches.editBranch')}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          {!branch.isMain && (
            <button
              type="button"
              onClick={() => onDelete(branch.public_id || branch.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation"
              title={t('branches.deleteBranch')}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Branch Details - Enhanced with Heroicons */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start space-x-2">
          <MapPinIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-1 line-clamp-2">
            {branch.address}
            {branch.city && `, ${branch.city}`}
            {branch.state && `, ${branch.state}`}
            {branch.zip_code && ` ${branch.zip_code}`}
          </span>
        </div>

        {branch.phone && (
          <div className="flex items-center space-x-2">
            <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{branch.phone}</span>
          </div>
        )}

        {branch.manager_name && (
          <div className="flex items-center space-x-2">
            <UserIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{branch.manager_name}</span>
          </div>
        )}
      </div>

      {/* Action Bar - Redesigned with status toggle on left, actions on right */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        {/* Status Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleStatus(branch.public_id || branch.id, branch.status)}
          className="flex items-center space-x-1.5 px-2 sm:px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
          title={isActive ? t('branches.deactivateBranch') : t('branches.activateBranch')}
        >
          {isActive ? (
            <>
              <PauseCircleIcon className="w-4 h-4" />
              <span className="font-medium">{t('offers.pause')}</span>
            </>
          ) : (
            <>
              <PlayCircleIcon className="w-4 h-4" />
              <span className="font-medium">{t('offers.activate')}</span>
            </>
          )}
        </button>

        {/* Action Button Group */}
        <div className="flex items-center space-x-2">
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
            className="flex items-center space-x-1.5 px-2 sm:px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
            title={t('branches.posAccess')}
          >
            <KeyIcon className="w-4 h-4" />
            <span className="font-medium">{t('branches.posAccess')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default BranchCard