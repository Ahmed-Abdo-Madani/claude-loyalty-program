import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import {
  HomeIcon,
  GiftIcon,
  MapPinIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  CreditCardIcon,
  SunIcon,
  MoonIcon,
  ChevronDoubleLeftIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

function DashboardSidebar({ activeTab, setActiveTab, user, analytics, onSignOut }) {
  const { t } = useTranslation('dashboard')
  const { isDark, toggleTheme } = useTheme()

  // Navigation items with Heroicons
  const navigationItems = [
    { id: 'overview', label: t('sidebar.overview'), icon: HomeIcon },
    { id: 'offers', label: t('sidebar.myOffers'), icon: GiftIcon },
    { id: 'branches', label: t('sidebar.branches'), icon: MapPinIcon },
    { id: 'products', label: t('sidebar.products'), icon: ShoppingBagIcon },
    { id: 'analytics', label: t('sidebar.analytics'), icon: ChartBarIcon },
    { id: 'settings', label: t('sidebar.settings'), icon: Cog6ToothIcon },
    { id: 'billing-subscription', label: t('sidebar.billingSubscription'), icon: CreditCardIcon }
  ]

  const handleTabClick = (tabId) => {
    const item = navigationItems.find(item => item.id === tabId)
    if (item && item.disabled) return
    setActiveTab(tabId)
  }

  // Calculate if any limit is approaching (>= 80%)
  const approachingLimits = []
  if (analytics?.planLimits) {
    const { offers, locations } = analytics.planLimits
    if (offers !== Infinity && (analytics.totalOffers / offers) >= 0.8) {
      approachingLimits.push({ type: 'offers', label: t('sidebar.myOffers') })
    }
    if (locations !== Infinity && (analytics.totalBranches / locations) >= 0.8) {
      approachingLimits.push({ type: 'branches', label: t('sidebar.branches') })
    }
  }

  const isApproaching = approachingLimits.length > 0

  return (
    <aside className={`
      hidden lg:flex
      fixed left-0 top-0 z-40 h-screen w-64
      flex-col
      bg-gradient-to-br from-slate-900 via-[#1e293b] to-slate-950
      dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#020617]
      border-r border-white/5 shadow-2xl
      overflow-hidden
    `}>
      {/* Sidebar Header */}
      <div className="p-6 border-b border-white/10 glass-card">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-primary to-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">
              {user?.businessName || 'Business'}
            </h1>
            <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">Control Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 relative group
                  ${item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isActive
                      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full shadow-[0_0_8px_white]" />
                )}
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium text-sm tracking-wide">{item.label}</span>

                {item.comingSoon && (
                  <span className="ml-auto text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full border border-white/10">
                    SOON
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Upgrade Nudge */}
      {isApproaching && (
        <div className="px-4 mb-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/10 border border-primary/20 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🚀</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">{t('sidebar.upgradeRequired', 'Upgrade Required')}</span>
              </div>
              <p className="text-[11px] text-white/70 mb-3 leading-relaxed">
                {t('sidebar.approachingLimit', 'You are approaching your plan limits. Upgrade now to unlock more.')}
              </p>
              <button
                onClick={() => setActiveTab('billing-subscription')}
                className="w-full py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                {t('sidebar.viewPlans', 'View Plans')}
              </button>
            </div>
            {/* Animated background pulse */}
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>
        </div>
      )}

      {/* Sidebar Footer */}
      <div className="p-4 mt-auto border-t border-white/10 bg-black/20">
        {/* User Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 mb-4 group cursor-pointer hover:bg-white/10 transition-colors">
          <div className="w-9 h-9 bg-gradient-to-tr from-slate-700 to-slate-600 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white/10">
            <span className="text-white font-bold text-xs">
              {user?.businessName?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-xs truncate group-hover:text-primary-light transition-colors">{user?.businessName}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.userEmail}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            title={isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          >
            {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>

          <button
            onClick={onSignOut}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 text-rose-400/60 hover:text-rose-400 hover:bg-rose-400/10 transition-all active:scale-95"
            title={t('sidebar.signOut')}
          >
            <ChevronDoubleLeftIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default DashboardSidebar