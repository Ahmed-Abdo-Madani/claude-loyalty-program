import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'

function DashboardHeader({ user }) {
  const { isDark, toggleTheme } = useTheme()
  const [logoInfo, setLogoInfo] = useState(null)

  // Load business logo info
  useEffect(() => {
    loadLogoInfo()
  }, [])

  const loadLogoInfo = async () => {
    try {
      const sessionToken = localStorage.getItem('businessSessionToken')
      const businessId = localStorage.getItem('businessId')

      if (!sessionToken || !businessId) {
        return
      }

      const response = await fetch('/api/business/my/logo-info', {
        headers: {
          'x-session-token': sessionToken,
          'x-business-id': businessId
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data.has_logo) {
          setLogoInfo(result.data)
        }
      }
    } catch (error) {
      console.warn('Failed to load logo info:', error)
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="ml-0 lg:ml-64">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Business Title with Logo */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Business Logo */}
              {logoInfo && (
                <div className="flex-shrink-0">
                  <img
                    src={`/api/business${logoInfo.logo_url}`}
                    alt={`${user?.businessName} Logo`}
                    className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-white shadow-sm"
                  />
                </div>
              )}

              {/* Business Name and Dashboard Text */}
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {user?.businessName?.toUpperCase() || 'BUSINESS'} <span className="font-normal hidden sm:inline">DASHBOARD</span>
                </h1>
                {logoInfo && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                    🏢 Business Logo Active
                  </p>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Dark Mode Toggle - Visible on mobile since sidebar is hidden */}
              <button
                onClick={toggleTheme}
                className="flex p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 min-h-[44px] min-w-[44px] items-center justify-center touch-target"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader