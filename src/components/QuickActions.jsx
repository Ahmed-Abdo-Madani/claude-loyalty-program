import { useTranslation } from 'react-i18next'

function QuickActions({ onNewOffer, onScanQR, onViewReports }) {
  const { t } = useTranslation('dashboard')
  
  const actions = [
    {
      id: 'new_offer',
      label: t('quickActions.newOffer'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: onNewOffer,
      description: t('quickActions.newOfferDesc'),
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
    },
    {
      id: 'scan_qr',
      label: t('quickActions.scanQR'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      action: onScanQR,
      description: t('quickActions.scanQRDesc'),
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30'
    },
    {
      id: 'view_reports',
      label: t('quickActions.reports'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      action: onViewReports,
      description: t('quickActions.reportsDesc'),
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4">
      <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('quickActions.title')}</h3>

      <div className="flex flex-row gap-2 sm:gap-3 overflow-x-auto">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`flex flex-col items-center justify-center space-y-1 p-3 rounded-lg ${action.bgColor} ${action.hoverBg} ${action.iconColor} active:scale-95 transition-all duration-200 text-center group touch-manipulation min-h-[44px] flex-1 min-w-[90px]`}
            title={action.description}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
              {action.icon}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions