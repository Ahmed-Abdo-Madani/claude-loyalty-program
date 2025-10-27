import { useTheme } from '../contexts/ThemeContext'

function DashboardSidebar({ activeTab, setActiveTab, user, onSignOut }) {
  const { isDark, toggleTheme } = useTheme()

  // Navigation items with icons - preserving exact existing functionality
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'offers', label: 'My Offers', icon: '🎁' },
    { id: 'scanner', label: 'QR Scanner', icon: '📱' },
    { id: 'branches', label: 'Branches', icon: '📍' },
    { id: 'customers', label: 'Customers', icon: '👥', disabled: true, comingSoon: true },
    { id: 'wallet', label: 'Mobile Wallets', icon: '💳' },
    { id: 'analytics', label: 'Analytics', icon: '📊' }
  ]

  const handleTabClick = (tabId) => {
    // Check if the tab is disabled
    const item = navigationItems.find(item => item.id === tabId)
    if (item && item.disabled) {
      return // Don't navigate to disabled tabs
    }

    setActiveTab(tabId) // Preserve existing state management
  }

  return (
    <>
      {/* Sidebar - Desktop Only (hidden on mobile, bottom nav used instead) */}
      <aside className={`
        hidden lg:block
        fixed left-0 top-0 z-40 h-screen w-64
        bg-gradient-to-b from-primary via-blue-600 to-purple-700
        dark:from-purple-900 dark:via-purple-800 dark:to-indigo-900
        flex flex-col overflow-y-auto
      `}>

        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            {/* App Icon */}
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            {/* Business Name */}
            <div>
              <h1 className="text-white font-bold text-lg">
                {user?.businessName || 'Business'}
              </h1>
              <p className="text-white/70 text-sm">DASHBOARD</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleTabClick(item.id)}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 relative
                    ${item.disabled
                      ? 'text-white/40 cursor-not-allowed'
                      : activeTab === item.id
                        ? 'bg-white/20 text-white border-l-4 border-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div className="font-medium flex items-center space-x-2">
                    <span>{item.label}</span>
                    {item.comingSoon && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30">
                        Soon
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-white/20">
          {/* User Profile */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">
                {user?.businessName?.charAt(0)?.toUpperCase() || 'B'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{user?.businessName}</p>
              <p className="text-white/70 text-sm truncate">{user?.userEmail}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center space-x-3 p-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <span className="text-lg flex-shrink-0">
                {isDark ? '☀️' : '🌙'}
              </span>
              <span className="font-medium">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="w-full flex items-center space-x-3 p-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <span className="text-lg flex-shrink-0">🚪</span>
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default DashboardSidebar