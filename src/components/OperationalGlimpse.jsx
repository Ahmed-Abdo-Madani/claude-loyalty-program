import { useTranslation } from 'react-i18next'
import { 
  MapPinIcon, 
  ShoppingBagIcon, 
  TagIcon, 
  UsersIcon, 
  UserGroupIcon, 
  Cog6ToothIcon, 
  DocumentChartBarIcon, 
  CreditCardIcon 
} from '@heroicons/react/24/outline'

function OperationalGlimpse({ onNavigate, onOpenSettings }) {
  const { t } = useTranslation('dashboard')

  const quickLinks = [
    {
      id: 'branches',
      label: t('operationalGlimpse.branches'),
      icon: <MapPinIcon className="w-6 h-6" />,
      action: () => onNavigate('branches'),
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
    },
    {
      id: 'products',
      label: t('operationalGlimpse.products'),
      icon: <ShoppingBagIcon className="w-6 h-6" />,
      action: () => onNavigate('products'),
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-900/30'
    },
    {
      id: 'categories',
      label: t('operationalGlimpse.categories'),
      icon: <TagIcon className="w-6 h-6" />,
      action: () => onNavigate('products'),
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30'
    },
    {
      id: 'customers',
      label: t('operationalGlimpse.customers'),
      icon: <UsersIcon className="w-6 h-6" />,
      action: () => onNavigate('customers'),
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
    },
    {
      id: 'staff',
      label: t('operationalGlimpse.staff'),
      icon: <UserGroupIcon className="w-6 h-6" />,
      action: () => onNavigate('branches'),
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      hoverBg: 'hover:bg-teal-100 dark:hover:bg-teal-900/30'
    },
    {
      id: 'settings',
      label: t('operationalGlimpse.settings'),
      icon: <Cog6ToothIcon className="w-6 h-6" />,
      action: onOpenSettings,
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      iconColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-900/30'
    },
    {
      id: 'reports',
      label: t('operationalGlimpse.reports'),
      icon: <DocumentChartBarIcon className="w-6 h-6" />,
      action: () => onNavigate('analytics'),
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      iconColor: 'text-pink-600 dark:text-pink-400',
      hoverBg: 'hover:bg-pink-100 dark:hover:bg-pink-900/30'
    },
    {
      id: 'wallet_passes',
      label: t('operationalGlimpse.walletPasses'),
      icon: <CreditCardIcon className="w-6 h-6" />,
      action: () => onNavigate('wallet'),
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      hoverBg: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        {t('operationalGlimpse.title')}
      </h3>

      {/* Grid Layout: 2 columns on mobile, 4 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        {quickLinks.map((link) => (
          <button
            key={link.id}
            onClick={link.action}
            className={`flex flex-col items-center justify-center space-y-2 p-4 rounded-lg ${link.bgColor} ${link.hoverBg} ${link.iconColor} active:scale-95 transition-all duration-200 text-center group touch-manipulation min-h-[100px]`}
          >
            {/* Icon */}
            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              {link.icon}
            </div>

            {/* Label */}
            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white leading-tight">
              {link.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default OperationalGlimpse
