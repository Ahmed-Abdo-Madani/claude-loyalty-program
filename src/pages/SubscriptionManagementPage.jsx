
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { secureApi, endpoints } from '../config/api'
import SEO from '../components/SEO'

export default function SubscriptionManagementPage() {
  const { t, i18n } = useTranslation(['subscription', 'dashboard'])
  const navigate = useNavigate()

  // State management
  const [loading, setLoading] = useState(true)
  const [subscriptionDetails, setSubscriptionDetails] = useState(null)
  const [error, setError] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  // Fetch subscription details on mount
  useEffect(() => {
    fetchSubscriptionDetails()
  }, [])

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await secureApi.get(endpoints.subscriptionDetails)
      const data = await response.json()

      if (data.success) {
        setSubscriptionDetails(data.data)
      } else {
        setError(data.message || t('subscription:errors.fetchFailed'))
      }
    } catch (err) {
      console.error('Failed to fetch subscription details:', err)
      setError(t('subscription:errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true)
      const response = await secureApi.post(endpoints.subscriptionPortal, {})
      const data = await response.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        alert(data.message || 'Failed to redirect to billing portal')
      }
    } catch (err) {
      console.error('Failed to get portal URL:', err)
      alert(t('subscription:errors.portalFailed') || 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  // Get usage progress color
  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir={i18n.dir()}>
        <SEO titleKey="subscription:management.title" noindex={true} />
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('subscription:management.loading')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir={i18n.dir()}>
        <SEO titleKey="subscription:management.title" noindex={true} />
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-900 dark:text-red-100 mb-4">{error}</p>
            <button
              onClick={fetchSubscriptionDetails}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              {t('subscription:actions.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { subscription, limits, usage, trial_info } = subscriptionDetails || {}
  const isFreePlan = subscription?.plan_type === 'free'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir={i18n.dir()}>
      <SEO titleKey="subscription:management.title" noindex={true} />

      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header & Hero Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-blue-100 font-medium mb-1">{t('subscription:management.currentPlan')}</p>
                  <h1 className="text-4xl font-bold capitalize mb-2">
                    {t(`subscription:plans.${subscription?.plan_type}.name`)}
                  </h1>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${subscription?.status === 'active' ? 'bg-green-400/20 text-green-100' :
                      'bg-yellow-400/20 text-yellow-100'
                    }`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${subscription?.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                      }`}></span>
                    {t(`subscription:status.${subscription?.status}`)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 font-medium mb-1">{t('subscription:management.renewalDate')}</p>
                  <p className="text-2xl font-bold">
                    {subscription?.next_billing_date
                      ? new Date(subscription.next_billing_date).toLocaleDateString(i18n.language)
                      : t('subscription:lifetime')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                {!isFreePlan && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="px-6 py-3 bg-white text-primary rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-lg disabled:opacity-75 flex items-center gap-2"
                  >
                    {portalLoading ? (
                      <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                    {t('subscription:actions.manageBilling')}
                  </button>
                )}
                <button
                  onClick={() => navigate('/subscription/plans')}
                  className={`px-6 py-3 rounded-xl font-bold transition-colors shadow-lg border-2 ${!isFreePlan ? 'bg-transparent border-white text-white hover:bg-white/10' : 'bg-white text-primary hover:bg-gray-50 border-white'
                    }`}
                >
                  {isFreePlan ? t('subscription:actions.upgradeNow') : t('subscription:actions.viewPlans')}
                </button>
              </div>
            </div>
          </div>

          {/* Trial Info Card */}
          {trial_info ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border-l-4 border-blue-500 flex flex-col justify-center">
              <h3 className="text-gray-500 dark:text-gray-400 font-medium uppercase text-xs tracking-wider mb-2">{t('subscription:trial.title')}</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {trial_info.days_remaining} {t('subscription:trial.days')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('subscription:trial.remainingDescription')}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(trial_info.days_remaining / 14) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold">{t('subscription:active.title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('subscription:active.description')}</p>
            </div>
          )}
        </div>

        {/* Usage Stats Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('subscription:usage.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: 'customers', label: t('subscription:usage.customers'), current: usage?.customers, limit: limits?.customers, icon: 'Users' },
              { key: 'locations', label: t('subscription:usage.locations'), current: usage?.locations, limit: limits?.locations, icon: 'MapPin' },
              { key: 'offers', label: t('subscription:usage.offers'), current: usage?.offers, limit: limits?.offers, icon: 'Tag' },
              { key: 'pos', label: t('subscription:usage.posOperations'), current: usage?.pos_operations, limit: limits?.pos_operations, icon: 'Terminal' },
            ].map((item) => (
              <div key={item.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{item.label}</span>
                  {/* Simple Icon Placeholder based on type */}
                  <span className="text-gray-400">
                    {item.key === 'customers' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    {item.key === 'locations' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    {item.key === 'offers' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                    {item.key === 'pos' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                  </span>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{item.current || 0}</span>
                  <span className="text-gray-400 mb-1">/ {item.limit === null ? '∞' : item.limit}</span>
                </div>
                {item.limit !== null && (
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor((item.current || 0) / item.limit * 100)}`}
                      style={{ width: `${Math.min((item.current || 0) / item.limit * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
