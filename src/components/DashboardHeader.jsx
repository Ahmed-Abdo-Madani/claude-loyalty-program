import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import LanguageSwitcher from './LanguageSwitcher'

function DashboardHeader({ user }) {
  const { t } = useTranslation('dashboard')
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
        <div className="px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Business Title with Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Business Logo */}
              {logoInfo && (
                <div className="flex-shrink-0">
                  <img
                    src={`/api/business${logoInfo.logo_url}`}
                    alt={`${user?.businessName} Logo`}
                    className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-white shadow-sm"
                  />
                </div>
              )}

              {/* Business Name and Dashboard Text */}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 truncate">
                  {user?.businessName?.toUpperCase() || 'BUSINESS'} <span className="font-normal hidden sm:inline">{t('header.dashboard').toUpperCase()}</span>
                </h1>
                {logoInfo && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {t('header.businessLogoActive')}
                  </p>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center flex-shrink-0 gap-2">
              {/* Language Switcher */}
              <LanguageSwitcher variant="button" showLabels={false} className="" />
              
              {/* Dark Mode Toggle - Visible on mobile since sidebar is hidden */}
              <button
                onClick={toggleTheme}
                className="flex p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 min-h-[44px] min-w-[44px] items-center justify-center touch-target active:scale-95"
                aria-label={isDark ? t('header.switchToLightMode') : t('header.switchToDarkMode')}
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