import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { getSubscriptionData } from '../utils/secureAuth'
import LanguageSwitcher from './LanguageSwitcher'

function DashboardHeader({ user }) {
  const { t } = useTranslation('dashboard')
  const { t: tSubscription, i18n } = useTranslation('subscription')
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [logoInfo, setLogoInfo] = useState(null)
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [showTrialBanner, setShowTrialBanner] = useState(false)
  const [showPaymentFailureBanner, setShowPaymentFailureBanner] = useState(false)
  const [paymentFailureData, setPaymentFailureData] = useState(null)

  // Load business logo info
  useEffect(() => {
    loadLogoInfo()
  }, [])

  // Load subscription data and check payment failure status
  useEffect(() => {
    const businessId = localStorage.getItem('businessId')
    const paymentDismissalKey = `payment-banner-dismissed-${businessId}`
    
    // Check if payment failure banner was dismissed
    if (!sessionStorage.getItem(paymentDismissalKey)) {
      const subscription = getSubscriptionData()
      
      // Show payment failure banner if subscription is past_due
      if (subscription?.subscription_status === 'past_due') {
        setPaymentFailureData({
          retry_count: subscription.retry_count || 0,
          grace_period_end: subscription.grace_period_end,
          next_retry_date: subscription.next_retry_date
        })
        setShowPaymentFailureBanner(true)
      }
    }

    // Set up interval to check payment failure status every 10 minutes
    const paymentInterval = setInterval(() => {
      const businessId = localStorage.getItem('businessId')
      const paymentDismissalKey = `payment-banner-dismissed-${businessId}`
      
      if (sessionStorage.getItem(paymentDismissalKey)) {
        setShowPaymentFailureBanner(false)
        return
      }

      const updatedSubscription = getSubscriptionData()
      
      if (updatedSubscription?.subscription_status === 'past_due') {
        setPaymentFailureData({
          retry_count: updatedSubscription.retry_count || 0,
          grace_period_end: updatedSubscription.grace_period_end,
          next_retry_date: updatedSubscription.next_retry_date
        })
        setShowPaymentFailureBanner(true)
      } else {
        setShowPaymentFailureBanner(false)
      }
    }, 600000) // 10 minutes

    return () => clearInterval(paymentInterval)
  }, [])

  // Load subscription data and check trial status
  useEffect(() => {
    const businessId = localStorage.getItem('businessId')
    const dismissalKey = `trial-banner-dismissed-${businessId}`
    
    // Check if banner was dismissed in this session
    if (sessionStorage.getItem(dismissalKey)) {
      return
    }

    const subscription = getSubscriptionData()
    
    if (subscription?.trial_info && subscription.subscription_status === 'trial') {
      setSubscriptionData(subscription)
      
      // Show banner if trial is ending (<=3 days) or expired
      const daysRemaining = subscription.trial_info.days_remaining || 0
      if (daysRemaining <= 3 || daysRemaining < 0) {
        setShowTrialBanner(true)
      }
    }

    // Set up interval to update days remaining every hour
    const interval = setInterval(() => {
      const businessId = localStorage.getItem('businessId')
      const dismissalKey = `trial-banner-dismissed-${businessId}`
      
      // Check if banner was dismissed
      if (sessionStorage.getItem(dismissalKey)) {
        setShowTrialBanner(false)
        return
      }

      const updatedSubscription = getSubscriptionData()
      
      if (updatedSubscription?.trial_info && updatedSubscription.subscription_status === 'trial') {
        setSubscriptionData(updatedSubscription)
        
        // Re-evaluate if banner should show based on latest data
        const daysRemaining = updatedSubscription.trial_info.days_remaining || 0
        if (daysRemaining <= 3 || daysRemaining < 0) {
          setShowTrialBanner(true)
        } else {
          setShowTrialBanner(false)
        }
      } else {
        // Trial ended or account upgraded - hide banner
        setShowTrialBanner(false)
      }
    }, 3600000) // 1 hour

    return () => clearInterval(interval)
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

  const handleDismissPaymentBanner = () => {
    const businessId = localStorage.getItem('businessId')
    const paymentDismissalKey = `payment-banner-dismissed-${businessId}`
    sessionStorage.setItem(paymentDismissalKey, 'true')
    setShowPaymentFailureBanner(false)
  }

  const handleUpdatePayment = () => {
    // Navigate to checkout with reactivation flag
    const subscription = getSubscriptionData()
    const planType = subscription?.plan_type || 'basic'
    const locationCount = subscription?.location_count || 1
    navigate(`/subscription/checkout?reactivation=true&plan=${planType}&locations=${locationCount}`)
  }

  const handleDismissBanner = () => {
    const businessId = localStorage.getItem('businessId')
    const dismissalKey = `trial-banner-dismissed-${businessId}`
    sessionStorage.setItem(dismissalKey, 'true')
    setShowTrialBanner(false)
  }

  const handleUpgradeClick = () => {
    navigate('/subscription/plans');
  }

  const calculateDaysRemaining = (dateString) => {
    if (!dateString) return null
    const targetDate = new Date(dateString)
    const today = new Date()
    const diffTime = targetDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString))
  }

  return (
    <>
      {/* Payment Failure Banner - Higher priority than trial banner */}
      {showPaymentFailureBanner && paymentFailureData && (
        <div className={`sticky top-0 z-50 border-b transition-colors ${
          paymentFailureData.retry_count >= 3 || paymentFailureData.grace_period_end
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="ml-0 lg:ml-64">
            <div className="px-4 py-3 sm:px-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {paymentFailureData.retry_count >= 3 ? '🚨' : '⚠️'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                      {paymentFailureData.grace_period_end
                        ? tSubscription('paymentBanner.title.gracePeriod')
                        : paymentFailureData.retry_count >= 3
                        ? tSubscription('paymentBanner.title.final')
                        : tSubscription('paymentBanner.title.retry')}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {paymentFailureData.grace_period_end
                        ? tSubscription('paymentBanner.gracePeriodEnd', {
                            date: formatDate(paymentFailureData.grace_period_end)
                          })
                        : paymentFailureData.next_retry_date
                        ? tSubscription('paymentBanner.nextRetry', {
                            date: formatDate(paymentFailureData.next_retry_date)
                          })
                        : tSubscription('paymentBanner.urgentAction')}
                    </p>
                    {paymentFailureData.retry_count > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {tSubscription('paymentBanner.retryCount', {
                          current: paymentFailureData.retry_count,
                          max: 3
                        })}
                      </p>
                    )}
                    {paymentFailureData.grace_period_end && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                        {tSubscription('paymentBanner.daysRemaining', {
                          days: calculateDaysRemaining(paymentFailureData.grace_period_end)
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <button
                    onClick={handleUpdatePayment}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap ${
                      paymentFailureData.retry_count >= 3 || paymentFailureData.grace_period_end
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    {tSubscription('paymentBanner.updatePayment')}
                  </button>
                  <button
                    onClick={handleDismissPaymentBanner}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm whitespace-nowrap"
                  >
                    {tSubscription('banner.dismiss')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trial Expiration Banner */}
      {showTrialBanner && subscriptionData?.trial_info && (
        <div className={`sticky top-0 z-40 border-b transition-colors ${
          subscriptionData.trial_info.days_remaining > 3
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : subscriptionData.trial_info.days_remaining > 0
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="ml-0 lg:ml-64">
            <div className="px-4 py-3 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {subscriptionData.trial_info.days_remaining > 0 ? '⏰' : '⚠️'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                      {subscriptionData.trial_info.days_remaining > 0
                        ? tSubscription('banner.trialEnding', { days: subscriptionData.trial_info.days_remaining })
                        : tSubscription('banner.trialExpired')}
                    </p>
                    {subscriptionData.trial_info.trial_ends_at && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(subscriptionData.trial_info.trial_ends_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={handleUpgradeClick}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold text-sm whitespace-nowrap"
                  >
                    {tSubscription('actions.upgradeNow')}
                  </button>
                  <button
                    onClick={handleDismissBanner}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm whitespace-nowrap"
                  >
                    {tSubscription('banner.dismiss')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
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
    </>
  )
}

export default DashboardHeader