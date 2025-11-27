import { useTranslation } from 'react-i18next'
import { 
  PlusIcon, 
  QrCodeIcon, 
  ChartBarIcon, 
  ShoppingBagIcon, 
  MapPinIcon, 
  Cog6ToothIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline'

function QuickActions({ onNewOffer, onScanQR, onViewReports, onManageProducts, onManageBranches, onSettings, onGenerateMenuQR }) {
  const { t } = useTranslation(['dashboard', 'common'])
  
  const actions = [
    {
      id: 'new_offer',
      label: t('quickActions.newOffer'),
      icon: <PlusIcon className="w-5 h-5" />,
      action: onNewOffer,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
    },
    {
      id: 'manage_products',
      label: t('quickActions.manageProducts'),
      icon: <ShoppingBagIcon className="w-5 h-5" />,
      action: onManageProducts,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-900/30'
    },
    {
      id: 'menu_qr',
      label: t('common:menu.generateMenuQR'),
      icon: <DocumentTextIcon className="w-5 h-5" />,
      action: onGenerateMenuQR,
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      iconColor: 'text-pink-600 dark:text-pink-400',
      hoverBg: 'hover:bg-pink-100 dark:hover:bg-pink-900/30'
    },
    {
      id: 'scan_qr',
      label: t('quickActions.scanQR'),
      icon: <QrCodeIcon className="w-5 h-5" />,
      action: onScanQR,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30'
    },
    {
      id: 'view_reports',
      label: t('quickActions.reports'),
      icon: <ChartBarIcon className="w-5 h-5" />,
      action: onViewReports,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
    },
    {
      id: 'manage_branches',
      label: t('quickActions.manageBranches'),
      icon: <MapPinIcon className="w-5 h-5" />,
      action: onManageBranches,
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      hoverBg: 'hover:bg-teal-100 dark:hover:bg-teal-900/30'
    },
    {
      id: 'settings',
      label: t('quickActions.settings'),
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      action: onSettings,
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      iconColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-900/30'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('quickActions.title')}</h3>

      {/* Grid Layout: 2 columns on mobile, 3 on tablet, 4 on desktop (to accommodate 7 actions) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            disabled={!action.action}
            className={`flex flex-col items-center justify-center space-y-2 p-4 rounded-lg ${action.bgColor} ${action.hoverBg} ${action.iconColor} active:scale-95 transition-all duration-200 text-center group touch-manipulation min-h-[100px] ${!action.action ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              {action.icon}
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions