import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { secureApi, endpoints } from '../config/api'
import { getSubscriptionData, setSubscriptionData } from '../utils/secureAuth'
import SEO from '../components/SEO'

export default function SubscriptionManagementPage() {
  const { t, i18n } = useTranslation(['subscription', 'dashboard'])
  const navigate = useNavigate()
  const moyasarFormRef = useRef(null)

  // State management
  const [loading, setLoading] = useState(true)
  const [subscriptionDetails, setSubscriptionDetails] = useState(null)
  const [error, setError] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [proratedAmount, setProratedAmount] = useState(null)
  const [creditAmount, setCreditAmount] = useState(null)
  const [moyasarLoaded, setMoyasarLoaded] = useState(false)

  // Check if Moyasar is loaded
  useEffect(() => {
    if (window.Moyasar) {
      setMoyasarLoaded(true)
    } else {
      // Poll for Moyasar availability
      const pollInterval = setInterval(() => {
        if (window.Moyasar) {
          setMoyasarLoaded(true)
          clearInterval(pollInterval)
        }
      }, 200)
      
      // Timeout after 10 seconds
      setTimeout(() => clearInterval(pollInterval), 10000)
      
      return () => clearInterval(pollInterval)
    }
  }, [])

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

  // Handle upgrade
  const handleUpgrade = async () => {
    if (!selectedPlan) return

    try {
      setProcessing(true)
      
      const hasPaymentMethod = subscriptionDetails?.subscription?.payment_method?.has_token
      
      if (hasPaymentMethod) {
        // Process upgrade with stored payment method
        const response = await secureApi.put(endpoints.subscriptionUpgrade, {
          newPlanType: selectedPlan,
          locationCount: 1,
          useStoredPayment: true
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Capture prorated amount from response
          if (data.payment?.amount) {
            setProratedAmount(data.payment.amount)
          }
          
          // Update localStorage with new subscription data
          setSubscriptionData(data.subscription)
          
          // Refresh subscription details
          await fetchSubscriptionDetails()
          
          setShowUpgradeModal(false)
          alert(t('subscription:management.upgradeSuccess'))
        } else {
          alert(data.message || t('subscription:errors.upgradeFailed'))
        }
      } else {
        // Redirect to checkout page
        navigate(`/subscription/checkout?plan=${selectedPlan}&location=1`)
      }
    } catch (err) {
      console.error('Upgrade failed:', err)
      alert(t('subscription:errors.upgradeFailed'))
    } finally {
      setProcessing(false)
    }
  }

  // Handle downgrade
  const handleDowngrade = async () => {
    if (!selectedPlan) return

    try {
      setProcessing(true)
      
      const response = await secureApi.put(endpoints.subscriptionDowngrade, {
        newPlanType: selectedPlan
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Capture credit amount from response
        if (data.data?.credit_amount) {
          setCreditAmount(data.data.credit_amount)
        }
        
        // Update localStorage
        const currentData = getSubscriptionData()
        setSubscriptionData({
          ...currentData,
          pending_downgrade: {
            plan: selectedPlan,
            effective_date: data.data.effective_date
          }
        })
        
        // Refresh subscription details
        await fetchSubscriptionDetails()
        
        setShowDowngradeModal(false)
        
        // Show credit note if available
        const message = data.data?.credit_amount 
          ? t('subscription:modal.downgrade.creditNote', { amount: data.data.credit_amount }) + '\n' + t('subscription:management.downgradeScheduled', { date: new Date(data.data.effective_date).toLocaleDateString(i18n.language) })
          : t('subscription:management.downgradeScheduled', { date: new Date(data.data.effective_date).toLocaleDateString(i18n.language) })
        
        alert(message)
      } else {
        alert(data.message || t('subscription:errors.downgradeFailed'))
      }
    } catch (err) {
      console.error('Downgrade failed:', err)
      alert(t('subscription:errors.downgradeFailed'))
    } finally {
      setProcessing(false)
    }
  }

  // Handle cancel
  const handleCancel = async () => {
    try {
      setProcessing(true)
      
      const response = await secureApi.put(endpoints.subscriptionCancel, {
        reason: cancellationReason
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update localStorage
        const currentData = getSubscriptionData()
        setSubscriptionData({
          ...currentData,
          subscription_status: 'cancelled',
          access_until: data.data.access_until
        })
        
        // Refresh subscription details
        await fetchSubscriptionDetails()
        
        setShowCancelModal(false)
        alert(t('subscription:cancel.cancelledMessage', { date: new Date(data.data.access_until).toLocaleDateString(i18n.language) }))
      } else {
        alert(data.message || t('subscription:errors.cancelFailed'))
      }
    } catch (err) {
      console.error('Cancel failed:', err)
      alert(t('subscription:errors.cancelFailed'))
    } finally {
      setProcessing(false)
    }
  }

  // Initialize Moyasar form when payment method modal opens
  useEffect(() => {
    if (!showPaymentMethodModal || !moyasarFormRef.current || !moyasarLoaded) {
      return
    }

    if (!window.Moyasar) {
      console.error('Moyasar not available for payment method update')
      return
    }

    let moyasarInstance = null
    
    const initTimer = setTimeout(() => {
      try {
        setProcessing(true)
        
        // Minimal amount for payment method update (1 SAR in halalas)
        const amount = 100
        
        moyasarInstance = window.Moyasar.init({
          element: moyasarFormRef.current,
          language: i18n.language === 'ar' ? 'ar' : 'en',
          amount: amount,
          currency: 'SAR',
          description: 'Payment method update',
          publishable_api_key: process.env.REACT_APP_MOYASAR_PUBLISHABLE_KEY || process.env.MOYASAR_PUBLISHABLE_KEY,
          callback_url: `${window.location.origin}/subscription/payment-callback`,
          methods: ['creditcard'],
          on_completed: function(payment) {
            console.log('Payment completed for method update:', payment)
            if (payment.id) {
              handlePaymentMethodUpdate(payment.id)
            }
          },
          on_failure: function(error) {
            console.error('Payment method update failed:', error)
            alert(error.message || t('subscription:paymentMethodUpdate.failure'))
            setProcessing(false)
          }
        })
        
        setProcessing(false)
      } catch (err) {
        console.error('Failed to initialize Moyasar form:', err)
        setProcessing(false)
      }
    }, 100)
    
    return () => {
      clearTimeout(initTimer)
      if (moyasarInstance && typeof moyasarInstance.destroy === 'function') {
        moyasarInstance.destroy()
      }
    }
  }, [showPaymentMethodModal, moyasarLoaded, i18n.language])

  // Handle payment method update
  const handlePaymentMethodUpdate = async (moyasarPaymentId) => {
    try {
      setProcessing(true)
      
      const response = await secureApi.put(endpoints.subscriptionPaymentMethod, {
        moyasarPaymentId
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh subscription details
        await fetchSubscriptionDetails()
        
        setShowPaymentMethodModal(false)
        alert(t('subscription:paymentMethodUpdate.success'))
      } else {
        alert(data.message || t('subscription:paymentMethodUpdate.failure'))
      }
    } catch (err) {
      console.error('Payment method update failed:', err)
      alert(t('subscription:paymentMethodUpdate.failure'))
    } finally {
      setProcessing(false)
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

  const { subscription, limits, usage, trial_info, recent_payments } = subscriptionDetails || {}

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir={i18n.dir()}>
      <SEO titleKey="subscription:management.title" noindex={true} />
      
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('subscription:management.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('subscription:management.subtitle')}
          </p>
        </div>

        {/* Current Subscription Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('subscription:management.currentSubscription')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Details */}
            <div>
              <div className="mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  {t('subscription:planLabel')}
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {t(`subscription:plans.${subscription?.plan_type}.name`)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    subscription?.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    subscription?.status === 'trial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    subscription?.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {t(`subscription:status.${subscription?.status}`)}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  {t('subscription:management.monthlyPrice')}
                </label>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {subscription?.amount} {subscription?.currency || 'SAR'}
                </span>
              </div>

              {trial_info && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {t('subscription:trial.daysRemaining', { days: trial_info.days_remaining })}
                  </p>
                </div>
              )}
            </div>

            {/* Billing Details */}
            <div>
              <div className="mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  {t('subscription:management.currentPeriodStart')}
                </label>
                <span className="text-gray-900 dark:text-white">
                  {subscription?.billing_cycle_start ? new Date(subscription.billing_cycle_start).toLocaleDateString(i18n.language) : '-'}
                </span>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  {t('subscription:management.currentPeriodEnd')}
                </label>
                <span className="text-gray-900 dark:text-white">
                  {subscription?.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString(i18n.language) : '-'}
                </span>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  {t('subscription:management.paymentMethod')}
                </label>
                {subscription?.payment_method?.has_token ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white">
                      {t('subscription:management.cardEnding', { last4: subscription.payment_method.last4 })}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      ({subscription.payment_method.brand})
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('subscription:management.noPaymentMethod')}
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowPaymentMethodModal(true)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {subscription?.payment_method?.has_token ? t('subscription:management.updatePaymentMethod') : t('subscription:management.addPaymentMethod')}
              </button>
            </div>
          </div>
        </div>

        {/* Usage & Limits Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('subscription:usage.title')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Offers */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-300">{t('subscription:usage.offers')}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {usage?.offers || 0} / {limits?.offers === null ? '∞' : limits?.offers}
                </span>
              </div>
              {limits?.offers !== null && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressColor((usage?.offers || 0) / limits.offers * 100)}`}
                    style={{ width: `${Math.min((usage?.offers || 0) / limits.offers * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Customers */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-300">{t('subscription:usage.customers')}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {usage?.customers || 0} / {limits?.customers === null ? '∞' : limits?.customers}
                </span>
              </div>
              {limits?.customers !== null && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressColor((usage?.customers || 0) / limits.customers * 100)}`}
                    style={{ width: `${Math.min((usage?.customers || 0) / limits.customers * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Locations */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-300">{t('subscription:usage.locations')}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {usage?.locations || 0} / {limits?.locations === null ? '∞' : limits?.locations}
                </span>
              </div>
              {limits?.locations !== null && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressColor((usage?.locations || 0) / limits.locations * 100)}`}
                    style={{ width: `${Math.min((usage?.locations || 0) / limits.locations * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* POS Operations */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-300">{t('subscription:usage.posOperations')}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {usage?.pos_operations || 0} / {limits?.pos_operations === null ? '∞' : limits?.pos_operations}
                </span>
              </div>
              {limits?.pos_operations !== null && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressColor((usage?.pos_operations || 0) / limits.pos_operations * 100)}`}
                    style={{ width: `${Math.min((usage?.pos_operations || 0) / limits.pos_operations * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('subscription:management.subscriptionActions')}
          </h2>
          
          <div className="flex flex-wrap gap-4">
            {subscription?.plan_type !== 'enterprise' && (
              <button
                onClick={() => {
                  setSelectedPlan(subscription?.plan_type === 'free' ? 'professional' : 'enterprise')
                  setShowUpgradeModal(true)
                }}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold"
              >
                {t('subscription:actions.upgrade')}
              </button>
            )}

            {subscription?.plan_type !== 'free' && subscription?.status !== 'cancelled' && (
              <button
                onClick={() => {
                  setSelectedPlan(subscription?.plan_type === 'enterprise' ? 'professional' : 'free')
                  setShowDowngradeModal(true)
                }}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
              >
                {t('subscription:actions.downgrade')}
              </button>
            )}

            <button
              onClick={() => navigate('/dashboard/subscription')}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
            >
              {t('subscription:actions.viewPlans')}
            </button>

            {subscription?.status !== 'cancelled' && subscription?.plan_type !== 'free' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
              >
                {t('subscription:actions.cancelSubscription')}
              </button>
            )}
          </div>
        </div>

        {/* Billing History */}
        {recent_payments && recent_payments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('subscription:management.billingHistory')}
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">{t('subscription:billingHistory.date')}</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">{t('subscription:billingHistory.amount')}</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">{t('subscription:billingHistory.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_payments.map((payment, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {new Date(payment.date).toLocaleDateString(i18n.language)}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {payment.amount} {payment.currency || 'SAR'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {t(`subscription:billingHistory.${payment.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUpgradeModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('subscription:modal.upgrade.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('subscription:modal.upgrade.subtitle', { plan: t(`subscription:plans.${selectedPlan}.name`) })}
              </p>
              {subscription?.payment_method?.has_token && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                    {t('subscription:modal.upgrade.proratedExplanation')}
                  </p>
                  {proratedAmount && (
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {t('subscription:modal.upgrade.proratedAmount', { amount: proratedAmount })}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {t('subscription:actions.cancel')}
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {processing ? t('subscription:actions.processing') : 
                   subscription?.payment_method?.has_token ? t('subscription:modal.upgrade.withStoredPayment') : t('subscription:modal.upgrade.withoutStoredPayment')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Downgrade Modal */}
        {showDowngradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDowngradeModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('subscription:modal.downgrade.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('subscription:modal.downgrade.subtitle', { plan: t(`subscription:plans.${selectedPlan}.name`) })}
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-900 dark:text-yellow-100 mb-2">
                  {t('subscription:modal.downgrade.effectiveDate', { date: subscription?.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString(i18n.language) : '-' })}
                </p>
                {creditAmount && (
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                    {t('subscription:modal.downgrade.creditNote', { amount: creditAmount })}
                  </p>
                )}
              </div>
              {selectedPlan && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                    {t('subscription:modal.downgrade.featuresLost')}
                  </p>
                  <ul className="text-xs text-red-800 dark:text-red-200 list-disc list-inside space-y-1">
                    {selectedPlan === 'free' && (
                      <>
                        <li>Limited to 1 loyalty offer</li>
                        <li>Maximum 100 customers</li>
                        <li>20 POS operations per month</li>
                        <li>Advanced analytics removed</li>
                      </>
                    )}
                    {selectedPlan === 'professional' && (
                      <>
                        <li>Limited to 1 location</li>
                        <li>Maximum 1,000 customers</li>
                        <li>No dedicated account manager</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDowngradeModal(false)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {t('subscription:actions.cancel')}
                </button>
                <button
                  onClick={handleDowngrade}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {processing ? t('subscription:actions.processing') : t('subscription:modal.downgrade.confirmDowngrade')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCancelModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('subscription:cancel.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('subscription:cancel.subtitle')}
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-900 dark:text-red-100 mb-2">
                  {t('subscription:cancel.warning')}
                </p>
                <p className="text-sm text-red-900 dark:text-red-100">
                  {t('subscription:cancel.accessUntil', { date: subscription?.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString(i18n.language) : '-' })}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {t('subscription:cancel.reasonLabel')}
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{t('subscription:cancel.reasonPlaceholder')}</option>
                  <option value="expensive">{t('subscription:cancel.reasons.expensive')}</option>
                  <option value="notUsing">{t('subscription:cancel.reasons.notUsing')}</option>
                  <option value="competitor">{t('subscription:cancel.reasons.competitor')}</option>
                  <option value="other">{t('subscription:cancel.reasons.other')}</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {t('subscription:cancel.keepSubscription')}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {processing ? t('subscription:actions.processing') : t('subscription:cancel.confirmCancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Update Modal */}
        {showPaymentMethodModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !processing && setShowPaymentMethodModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('subscription:paymentMethodUpdate.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('subscription:paymentMethodUpdate.subtitle')}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {t('subscription:paymentMethodUpdate.securityNote')}
                </p>
              </div>
              
              {/* Moyasar Form Container */}
              <div ref={moyasarFormRef} className="moyasar-form-container mb-4">
                {processing && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                {!moyasarLoaded && !processing && (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    Loading payment form...
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowPaymentMethodModal(false)}
                disabled={processing}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {t('subscription:paymentMethodUpdate.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
