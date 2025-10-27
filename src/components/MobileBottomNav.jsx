import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  GiftIcon, 
  QrCodeIcon, 
  MapPinIcon, 
  UsersIcon, 
  CreditCardIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  GiftIcon as GiftIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  MapPinIcon as MapPinIconSolid,
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
  const location = useLocation()
  
  // Navigation items matching DashboardSidebar structure
  const navigationItems = [
    {
      name: 'Overview',
      path: '/dashboard?tab=overview',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
      tabName: 'overview'
    },
    {
      name: 'Offers',
      path: '/dashboard?tab=offers',
      icon: GiftIcon,
      iconSolid: GiftIconSolid,
      tabName: 'offers'
    },
    {
      name: 'Scanner',
      path: '/dashboard?tab=scanner',
      icon: QrCodeIcon,
      iconSolid: QrCodeIconSolid,
      tabName: 'scanner'
    },
    {
      name: 'Branches',
      path: '/dashboard?tab=branches',
      icon: MapPinIcon,
      iconSolid: MapPinIconSolid,
      tabName: 'branches'
    },
    {
      name: 'Customers',
      path: '/dashboard?tab=customers',
      icon: UsersIcon,
      iconSolid: UsersIconSolid,
      tabName: 'customers'
    },
    {
      name: 'Analytics',
      path: '/dashboard?tab=analytics',
      icon: ChartBarIcon,
      iconSolid: ChartBarIconSolid,
      tabName: 'analytics'
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
      <div className="flex justify-around items-center h-16">
        {navigationItems.map((item) => {
          const active = isActive(item)
          const Icon = active ? item.iconSolid : item.icon
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`
                flex flex-col items-center justify-center
                min-h-[44px] min-w-[44px] px-2 py-1
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
              <Icon className="w-6 h-6 mb-0.5" />
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
