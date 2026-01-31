import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid'
import { secureApi, endpoints } from '../config/api'
import { getAuthData } from '../utils/secureAuth'
import SEO from '../components/SEO'
import CompetitorComparison from '../components/CompetitorComparison'

// Plan Definitions
const PLAN_DEFINITIONS = {
  // Loyalty Plans
  loyalty_starter: {
    monthly: 49,
    limits: { customers: 500, offers: 5 }
  },
  loyalty_growth: {
    monthly: 99,
    limits: { customers: 2000, offers: 15 }
  },
  loyalty_professional: {
    monthly: 179,
    limits: { customers: 10000, offers: 50 }
  },
  // POS Plans
  pos_business: {
    monthly: 199,
    limits: { terminals: 1, locations: 1 }
  },
  pos_enterprise: {
    monthly: 349,
    limits: { terminals: 3, locations: 3 }
  },
  pos_premium: {
    monthly: 549,
    limits: { terminals: 10, locations: 10 }
  }
}

export default function CheckoutPage() {
  const { t, i18n } = useTranslation('subscription')
  const navigate = useNavigate()
  const location = useLocation()

  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [checkoutUrl, setCheckoutUrl] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  // Get plan details from navigation state or query params
  const searchParams = new URLSearchParams(location.search)
  const planFromQuery = searchParams.get('plan')
  const intervalFromQuery = searchParams.get('interval')
  const locationsFromQuery = parseInt(searchParams.get('locations')) || 1

  const planDetails = location.state || {}

  // Initialize state with defaults or URL params
  const [planType, setPlanType] = useState(planFromQuery || planDetails.planType || 'loyalty_starter')
  const [billingInterval, setBillingInterval] = useState(intervalFromQuery || planDetails.interval || 'monthly') // 'monthly' or 'annual'
  const [locationCount, setLocationCount] = useState(locationsFromQuery || planDetails.locationCount || 1)

  // Get current plan details helper
  const getCurrentPlanDetails = useMemo(() => {
    const safePlanType = PLAN_DEFINITIONS[planType] ? planType : 'loyalty_starter'
    const def = PLAN_DEFINITIONS[safePlanType]

    // Calculate prices
    const monthlyPrice = def.monthly
    const annualPrice = monthlyPrice * 10 // 2 months free
    const isAnnual = billingInterval === 'annual'

    const unitPrice = isAnnual ? annualPrice : monthlyPrice
    const totalPrice = unitPrice * locationCount

    const savings = isAnnual ? (monthlyPrice * 12 * locationCount) - (annualPrice * locationCount) : 0
    const savingsPercent = isAnnual ? 17 : 0 // ~16.6%

    // Get translations
    // Map old keys like 'loyalty' to new structure if needed, or rely on correct keys in json
    // Using explicit implementation from plan
    const translationKey = `plans.${safePlanType}`

    return {
      type: safePlanType,
      name: t(`${translationKey}.name`),
      description: t(`${translationKey}.description`),
      monthlyPrice,
      annualPrice,
      currentPrice: totalPrice,
      limits: def.limits,
      savings,
      savingsPercent,
      isAnnual,
      features: t(`${translationKey}.features`, { returnObjects: true }) || []
    }
  }, [planType, billingInterval, locationCount, t])

  // Check authentication & validate plan on mount
  useEffect(() => {
    const authData = getAuthData()
    if (!authData.isAuthenticated) {
      // Pass current URL state to redirect back after login
      navigate(`/auth?mode=signin&redirect=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }

    // Validate plan type
    if (!PLAN_DEFINITIONS[planType]) {
      setError(t('checkout.invalidPlan') || "Selected plan is not available. Please return to pricing page.")
      setLoading(false)
      return
    }

    fetchCheckoutUrl()
  }, [planType, billingInterval, locationCount]) // Re-fetch if these change

  const fetchCheckoutUrl = async () => {
    try {
      setLoading(true)
      setError(null)
      setCheckoutUrl(null)

      // Update URL without reload to reflect current state
      const newSearchParams = new URLSearchParams()
      newSearchParams.set('plan', planType)
      newSearchParams.set('interval', billingInterval)
      if (locationCount > 1) newSearchParams.set('locations', locationCount)
      window.history.replaceState(null, '', `?${newSearchParams.toString()}`)

      const response = await secureApi.post(endpoints.subscriptionCheckout, {
        planType: planType,
        interval: billingInterval,
        locationCount: locationCount
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || t('checkout.configurationError') || 'Payment initialization failed')
      }

      const data = await response.json()
      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl)
      } else {
        throw new Error(t('checkout.configurationError') || 'Invalid checkout configuration')
      }

    } catch (err) {
      console.error('Checkout initialization failed:', err)
      setError(err.message || t('checkout.networkError') || 'Connection failed. Please check your internet and retry.')
    } finally {
      setLoading(false)
    }
  }

  const handleBillingIntervalChange = (val) => {
    setBillingInterval(val ? 'annual' : 'monthly')
  }

  const handleProceed = () => {
    if (checkoutUrl) {
      setProcessing(true)
      // Optional timeout warning if redirect is slow (handled by browser usually, but good for UX)
      setTimeout(() => {
        if (processing) {
          // If still processing after 10s, maybe user cancelled or network slow actions
          // But we are redirecting so we can't do much. 
        }
      }, 10000)
      window.location.href = checkoutUrl
    }
  }

  // Skeleton Loader
  if (loading && !checkoutUrl && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('checkout.loading') || 'Preparing secure checkout...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12" dir={i18n.dir()}>
      <SEO titleKey="checkout.title" placeholders={{ plan: getCurrentPlanDetails.name }} noindex={true} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back Button */}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-colors">
            <span className="rtl:hidden">←</span><span className="ltr:hidden">→</span>&nbsp;
            {t('checkout.backButton') || 'Go Back'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-8 text-center relative overflow-hidden">
            {/* Abstract Pattern overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('/patterns/grid.svg')]"></div>

            <h1 className="text-2xl font-bold text-white mb-2 relative z-10">
              {t('checkout.title') || 'Secure Checkout'}
            </h1>
            <p className="text-blue-100 relative z-10 text-sm md:text-base">
              {t('checkout.secureNote') || 'Complete your subscription securely with Lemon Squeezy'}
            </p>
          </div>

          <div className="p-6 md:p-8">
            {/* Billing Toggle */}
            <div className="flex flex-col items-center justify-center mb-8 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('checkout.billingInterval') || 'Billing Frequency'}
              </span>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <span className={`text-sm ${billingInterval === 'monthly' ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {t('checkout.monthly') || 'Monthly'}
                </span>

                <button
                  onClick={handleBillingIntervalChange}
                  className={`${billingInterval === 'annual' ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                    } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                >
                  <span
                    className={`${billingInterval === 'annual' ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
                      } inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform`}
                  />
                </button>

                <span className={`text-sm ${billingInterval === 'annual' ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {t('checkout.annual') || 'Annual'}
                </span>

                {/* Savings Badge */}
                {billingInterval === 'annual' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 animate-pulse">
                    {t('checkout.savings', { amount: getCurrentPlanDetails.savings, months: 2 }) || `Save ${getCurrentPlanDetails.savings} SAR`}
                  </span>
                )}
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('checkout.planDetails') || 'Plan Details'}
                </h2>
                {getCurrentPlanDetails.type.includes('loyalty') ? (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-bold uppercase tracking-wide rounded-full">
                    Loyalty
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold uppercase tracking-wide rounded-full">
                    POS
                  </span>
                )}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {getCurrentPlanDetails.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getCurrentPlanDetails.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {getCurrentPlanDetails.currentPrice.toLocaleString()} <span className="text-sm font-normal text-gray-500">SAR</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t(billingInterval === 'annual' ? 'checkout.billedAnnually' : 'checkout.billedMonthly') || (billingInterval === 'annual' ? 'Billed annually' : 'Billed monthly')}
                    </div>
                  </div>
                </div>

                {/* Limits Grid */}
                {getCurrentPlanDetails.limits && (
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    {Object.entries(getCurrentPlanDetails.limits).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {t(`checkout.${key}`) || key}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal & Total */}
                <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('checkout.subtotal') || 'Subtotal'}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getCurrentPlanDetails.currentPrice.toLocaleString()} SAR</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold pt-2">
                    <span className="text-gray-900 dark:text-white">{t('checkout.total') || 'Total Due Today'}</span>
                    <span className="text-primary">
                      {getCurrentPlanDetails.currentPrice.toLocaleString()} <span className="text-sm font-normal">SAR</span>
                    </span>
                  </div>
                  {billingInterval === 'annual' && (
                    <div className="text-right text-xs text-green-600 dark:text-green-400 font-medium">
                      {t('checkout.youSave', { amount: getCurrentPlanDetails.savings }) || `You saved ${getCurrentPlanDetails.savings.toLocaleString()} SAR`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                  <button onClick={fetchCheckoutUrl} className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline">
                    {t('checkout.retry') || 'Try Again'}
                  </button>
                </div>
              </div>
            )}

            {/* Proceed Button */}
            <div className="space-y-4 mb-8">
              <button
                onClick={handleProceed}
                disabled={!checkoutUrl || processing}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('checkout.redirecting') || 'Redirecting to Payment...'}</span>
                  </>
                ) : (
                  <>
                    <span>{t('checkout.proceedButton') || 'Proceed to Payment'}</span>
                    <span className="rtl:rotate-180">→</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-400 grayscale opacity-70">
                {/* Simple trust indicators */}
                <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg> SSL Secure</span>
                <span>•</span>
                <span>Lemon Squeezy</span>
                <span>•</span>
                <span>Money-Back Guarantee</span>
              </div>
            </div>

            {/* Plan Features Preview */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                {t('checkout.whatsIncluded') || "What's Included"}
              </h3>
              <ul className="space-y-3">
                {getCurrentPlanDetails.features.slice(0, 6).map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mr-3 rtl:mr-0 rtl:ml-3" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
                {getCurrentPlanDetails.features.length > 6 && (
                  <li className="pl-8 rtl:pr-8 text-xs text-gray-400 italic">
                    {t('checkout.andMore', { count: getCurrentPlanDetails.features.length - 6 }) || `+ ${getCurrentPlanDetails.features.length - 6} more features`}
                  </li>
                )}
              </ul>
            </div>

            {/* Competitor Comparison Collapsible */}
            <div className="border theme-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="w-full flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl">🆚</span> {t('checkout.whyChooseMadna') || 'Why choose Madna vs Competitors?'}
                </span>
                {showComparison ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {/* Animated Height Container */}
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${showComparison ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <CompetitorComparison />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
