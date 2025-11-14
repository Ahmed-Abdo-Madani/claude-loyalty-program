import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  HomeIcon, 
  GiftIcon, 
  QrCodeIcon, 
  MapPinIcon,
  ShoppingBagIcon,
  UsersIcon, 
  CreditCardIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  GiftIcon as GiftIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  MapPinIcon as MapPinIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  UsersIcon as UsersIconSolid,
  CreditCardIcon as CreditCardIconSolid,
  ChartBarIcon as ChartBarIconSolid
} from '@heroicons/react/24/solid'

/**
 * Mobile-first bottom navigation component
 * Displays fixed bottom tab bar on mobile devices (below 768px)
 * Hidden on desktop where sidebar is used instead
 */
function MobileBottomNav() {
  const { t } = useTranslation('dashboard')
  const location = useLocation()
  
  // Navigation items - Streamlined to 6 primary tabs
  const navigationItems = [
    {
      name: t('mobileNav.overview'),
      path: '/dashboard?tab=overview',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
      tabName: 'overview'
    },
    {
      name: t('mobileNav.offers'),
      path: '/dashboard?tab=offers',
      icon: GiftIcon,
      iconSolid: GiftIconSolid,
      tabName: 'offers'
    },
    {
      name: t('mobileNav.analytics'),
      path: '/dashboard?tab=analytics',
      icon: ChartBarIcon,
      iconSolid: ChartBarIconSolid,
      tabName: 'analytics'
    },
    {
      name: t('mobileNav.branches'),
      path: '/dashboard?tab=branches',
      icon: MapPinIcon,
      iconSolid: MapPinIconSolid,
      tabName: 'branches'
    },
    {
      name: t('mobileNav.products'),
      path: '/dashboard?tab=products',
      icon: ShoppingBagIcon,
      iconSolid: ShoppingBagIconSolid,
      tabName: 'products'
    },
    {
      name: t('mobileNav.customers'),
      path: '/dashboard?tab=customers',
      icon: UsersIcon,
      iconSolid: UsersIconSolid,
      tabName: 'customers'
    }
  ]

  // Check if navigation item is active
  const isActive = (item) => {
    const searchParams = new URLSearchParams(location.search)
    const currentTab = searchParams.get('tab')
    
    // Treat both 'overview' and missing tab as active for Overview
    if (item.tabName === 'overview') {
      return !currentTab || currentTab === 'overview'
    }
    
    return currentTab === item.tabName
  }

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 safe-area-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-between items-center h-16 px-1">
        {navigationItems.map((item) => {
          const active = isActive(item)
          const Icon = active ? item.iconSolid : item.icon
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`
                flex flex-col items-center justify-center
                flex-1 min-h-[44px] min-w-[44px] px-2 py-2
                transition-all duration-200
                touch-target
                ${active 
                  ? 'text-primary dark:text-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
                active:scale-95
              `}
              aria-label={item.name}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-7 h-7 mb-0.5" />
              <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileBottomNav
