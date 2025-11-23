import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSubscriptionData } from '../utils/secureAuth'
import SEO from '../components/SEO'

const SubscriptionPlansPage = () => {
  const { t, i18n } = useTranslation('subscription')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [error, setError] = useState(null)

  // Plan definitions matching backend SubscriptionService.js
  const plans = {
    free: {
      name: 'free',
      price: 0,
      period: t('plans.free.period'),
      description: t('plans.free.description'),
      features: Array.isArray(t('plans.free.features', { returnObjects: true })) 
        ? t('plans.free.features', { returnObjects: true })
        : [],
      icon: '🆓'
    },
    professional: {
      name: 'professional',
      price: 210,
      period: t('plans.professional.period'),
      description: t('plans.professional.description'),
      features: Array.isArray(t('plans.professional.features', { returnObjects: true }))
        ? t('plans.professional.features', { returnObjects: true })
        : [],
      icon: '💼',
      popular: true
    },
    enterprise: {
      name: 'enterprise',
      basePrice: 570,
      pricePerLocation: 180,
      period: t('plans.enterprise.period'),
      description: t('plans.enterprise.description'),
      priceNote: t('plans.enterprise.priceNote'),
      features: Array.isArray(t('plans.enterprise.features', { returnObjects: true }))
        ? t('plans.enterprise.features', { returnObjects: true })
        : [],
      icon: '🏢'
    }
  }

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
      setError(null)

      // First try to get from localStorage
      const storedSubscription = getSubscriptionData()
      if (storedSubscription) {
        setSubscriptionData(storedSubscription)
        setLoading(false)
        return
      }

      // Fallback: fetch from backend
      // For now, this is a placeholder - actual endpoint will be implemented in future phase
      // We'll use the data from login response stored in localStorage
      setSubscriptionData({
        current_plan: 'free',
        subscription_status: 'trial',
        trial_info: null,
        limits: { offers: 1, customers: 100, posOperations: 20, locations: 1 },
        usage: { offers: 0, customers: 0, posOperations: 0, locations: 0 }
      })
      setLoading(false)
    } catch (err) {
      console.error('Failed to load subscription data:', err)
      setError(t('page.error'))
      setLoading(false)
    }
  }

  const handlePlanSelect = (planType) => {
    if (planType === subscriptionData?.current_plan) {
      // Already on this plan
      return
    }

    setSelectedPlan(planType)
    
    // Determine if upgrade or downgrade
    const planOrder = { free: 0, professional: 1, enterprise: 2 }
    const currentOrder = planOrder[subscriptionData?.current_plan || 'free']
    const newOrder = planOrder[planType]

    if (newOrder > currentOrder) {
      // Upgrade - navigate to checkout
      navigate('/subscription/checkout', {
        state: {
          planType: planType,
          locationCount: 1,
          currentPlan: subscriptionData?.current_plan
        }
      })
    } else {
      // Downgrade - show modal with warning
      setModalType('downgrade')
      setShowModal(true)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedPlan(null)
    setModalType(null)
  }

  const getUsagePercentage = (current, limit) => {
    if (limit === -1 || limit === 'unlimited') return 0
    if (limit === 0) return 100
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400'
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('page.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadSubscriptionData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {t('page.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={i18n.dir()}>
      <SEO titleKey="page.title" descriptionKey="page.subtitle" noindex={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('page.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('page.subtitle')}
          </p>
        </div>

        {/* Trial Status Banner */}
        {subscriptionData?.trial_info && subscriptionData.subscription_status === 'trial' && (
          <div className={`mb-8 p-4 rounded-lg border ${
            subscriptionData.trial_info.days_remaining > 3
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : subscriptionData.trial_info.days_remaining > 0
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {subscriptionData.trial_info.days_remaining > 0 ? '⏰' : '⚠️'}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {subscriptionData.trial_info.days_remaining > 0
                      ? t('trial.ending')
                      : t('trial.expired')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {subscriptionData.trial_info.days_remaining > 0
                      ? t('trial.daysRemaining', { days: subscriptionData.trial_info.days_remaining })
                      : t('trial.upgradePrompt')}
                    {subscriptionData.trial_info.trial_ends_at && (
                      <span className="mx-2">•</span>
                    )}
                    {subscriptionData.trial_info.trial_ends_at &&
                      t('trial.endsOn', { date: formatDate(subscriptionData.trial_info.trial_ends_at) })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handlePlanSelect('professional')}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold whitespace-nowrap"
              >
                {t('actions.upgradeNow')}
              </button>
            </div>
          </div>
        )}

        {/* Current Plan Section */}
        {subscriptionData && (
          <div className="mb-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t('currentPlan.title')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('currentPlan.plan')}
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                  {t(`plans.${subscriptionData.current_plan}.name`)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('currentPlan.status')}
                </p>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                  subscriptionData.subscription_status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : subscriptionData.subscription_status === 'trial'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  {t(`status.${subscriptionData.subscription_status}`)}
                </span>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('currentPlan.usage')}
              </h3>
              
              {/* Offers */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('currentPlan.offers')}
                  </span>
                  <span className={`text-sm font-semibold ${getUsageColor(
                    getUsagePercentage(subscriptionData.usage?.offers || 0, subscriptionData.limits?.offers || 0)
                  )}`}>
                    {subscriptionData.usage?.offers || 0} / {
                      subscriptionData.limits?.offers === -1 
                        ? t('currentPlan.unlimited')
                        : subscriptionData.limits?.offers || 0
                    }
                  </span>
                </div>
                {subscriptionData.limits?.offers !== -1 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(
                        getUsagePercentage(subscriptionData.usage?.offers || 0, subscriptionData.limits?.offers || 0)
                      )}`}
                      style={{ width: `${getUsagePercentage(subscriptionData.usage?.offers || 0, subscriptionData.limits?.offers || 0)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Customers */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('currentPlan.customers')}
                  </span>
                  <span className={`text-sm font-semibold ${getUsageColor(
                    getUsagePercentage(subscriptionData.usage?.customers || 0, subscriptionData.limits?.customers || 0)
                  )}`}>
                    {subscriptionData.usage?.customers || 0} / {
                      subscriptionData.limits?.customers === -1 
                        ? t('currentPlan.unlimited')
                        : subscriptionData.limits?.customers || 0
                    }
                  </span>
                </div>
                {subscriptionData.limits?.customers !== -1 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(
                        getUsagePercentage(subscriptionData.usage?.customers || 0, subscriptionData.limits?.customers || 0)
                      )}`}
                      style={{ width: `${getUsagePercentage(subscriptionData.usage?.customers || 0, subscriptionData.limits?.customers || 0)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* POS Operations */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('currentPlan.posOperations')}
                  </span>
                  <span className={`text-sm font-semibold ${getUsageColor(
                    getUsagePercentage(subscriptionData.usage?.posOperations || 0, subscriptionData.limits?.posOperations || 0)
                  )}`}>
                    {subscriptionData.usage?.posOperations || 0} / {
                      subscriptionData.limits?.posOperations === -1 
                        ? t('currentPlan.unlimited')
                        : subscriptionData.limits?.posOperations || 0
                    } {subscriptionData.limits?.posOperations !== -1 && t('currentPlan.perMonth')}
                  </span>
                </div>
                {subscriptionData.limits?.posOperations !== -1 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(
                        getUsagePercentage(subscriptionData.usage?.posOperations || 0, subscriptionData.limits?.posOperations || 0)
                      )}`}
                      style={{ width: `${getUsagePercentage(subscriptionData.usage?.posOperations || 0, subscriptionData.limits?.posOperations || 0)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Locations */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('currentPlan.locations')}
                  </span>
                  <span className={`text-sm font-semibold ${getUsageColor(
                    getUsagePercentage(subscriptionData.usage?.locations || 0, subscriptionData.limits?.locations || 0)
                  )}`}>
                    {subscriptionData.usage?.locations || 0} / {
                      subscriptionData.limits?.locations === -1 
                        ? t('currentPlan.unlimited')
                        : subscriptionData.limits?.locations || 0
                    }
                  </span>
                </div>
                {subscriptionData.limits?.locations !== -1 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(
                        getUsagePercentage(subscriptionData.usage?.locations || 0, subscriptionData.limits?.locations || 0)
                      )}`}
                      style={{ width: `${getUsagePercentage(subscriptionData.usage?.locations || 0, subscriptionData.limits?.locations || 0)}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plans Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.entries(plans).map(([planKey, plan]) => {
            const isCurrentPlan = subscriptionData?.current_plan === planKey
            return (
              <div
                key={planKey}
                className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all hover:scale-105 hover:shadow-xl ${
                  isCurrentPlan ? 'border-2 border-primary' : 'border border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold">
                      {t('plans.professional.popular')}
                    </span>
                  </div>
                )}

                {/* Plan Icon */}
                <div className="text-4xl mb-4 text-center">{plan.icon}</div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                  {t(`plans.${planKey}.name`)}
                </h3>

                {/* Price */}
                <div className="text-center mb-4">
                  {planKey === 'enterprise' ? (
                    <>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {plan.basePrice} <span className="text-lg">SAR</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{plan.period}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{plan.priceNote}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {plan.price} <span className="text-lg">SAR</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{plan.period}</p>
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>

                {/* Features List */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handlePlanSelect(planKey)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {isCurrentPlan ? t('actions.currentPlan') : t('actions.selectPlan')}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upgrade/Downgrade Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t(`modal.${modalType}.title`, { plan: t(`plans.${selectedPlan}.name`) })}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t(`modal.${modalType}.subtitle`, {
                currentPlan: t(`plans.${subscriptionData?.current_plan}.name`),
                newPlan: t(`plans.${selectedPlan}.name`)
              })}
            </p>

            {modalType === 'downgrade' && (
              <>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    {t('modal.downgrade.warning')}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('modal.downgrade.effectiveDate')}
                </p>
              </>
            )}

            {/* Downgrade Actions */}
            {modalType === 'downgrade' && (
              <>
                {/* Coming Soon Message for Downgrade */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    {t('modal.downgrade.comingSoon')}
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-400">
                    {t('modal.downgrade.comingSoonMessage')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                  >
                    {t('actions.cancel')}
                  </button>
                  <button
                    disabled
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded-lg cursor-not-allowed font-semibold"
                    title={t('modal.downgrade.comingSoon')}
                  >
                    {t('actions.confirm')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionPlansPage
