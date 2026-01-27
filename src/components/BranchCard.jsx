import { useState } from 'react'
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
  onManagerAccess
}) {
  const { t } = useTranslation('dashboard')
  const [showDeactivateWarning, setShowDeactivateWarning] = useState(false)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  const isActive = branch.status === 'active'

  const getPosStatus = () => {
    if (branch.pos_access_enabled === false) return 'disabled'
    if (!branch.manager_pin_enabled) return 'not_configured'
    return 'active'
  }

  const posStatus = getPosStatus()

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
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mt-1">
            <StatusBadge status={branch.status} />

            {posStatus === 'active' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800" title={t('branches.posAccessDesc')}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                {t('branches.posAccessActive')}
              </span>
            )}

            {posStatus === 'disabled' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800" title={t('branches.posAccessDesc')}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                {t('branches.posAccessDisabled')}
              </span>
            )}

            {posStatus === 'not_configured' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600" title={t('branches.posAccessDesc')}>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                {t('branches.posAccessNotConfigured')}
              </span>
            )}
          </div>
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
        {/* Status Toggle Button */}
        <button
          type="button"
          onClick={() => {
            if (isActive) {
              setShowDeactivateWarning(true)
            } else {
              onToggleStatus(branch.public_id || branch.id, branch.status)
            }
          }}
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
      {/* Deactivation Warning Modal */}
      {showDeactivateWarning && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeactivateWarning(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full border border-red-200 dark:border-red-800 animation-scale-in">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t('branches.deactivateBranch')}?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('branches.disablePosAccessMessage')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeactivateWarning(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setShowDeactivateWarning(false)
                    onToggleStatus(branch.public_id || branch.id, branch.status)
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
                >
                  {t('branches.deactivate') || 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchCard