import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSubscriptionData } from '../utils/secureAuth'
import { secureApi, endpoints } from '../config/api'
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

  // New state for API plans
  const [plans, setPlans] = useState([])
  const [loyaltyPlans, setLoyaltyPlans] = useState([])
  const [posPlans, setPosPlans] = useState([])
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    loadSubscriptionData()
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setApiLoading(true)
      const response = await secureApi.get(endpoints.subscriptionPlans)
      const data = await response.json()
      const fetchedPlans = data.data?.plans || []

      setPlans(fetchedPlans)

      // Filter and sort plans
      const loyalty = fetchedPlans
        .filter(p => p.category === 'loyalty')
        .sort((a, b) => a.monthlyPrice - b.monthlyPrice)

      const pos = fetchedPlans
        .filter(p => p.category === 'pos')
        .sort((a, b) => a.monthlyPrice - b.monthlyPrice)

      setLoyaltyPlans(loyalty)
      setPosPlans(pos)
      setApiLoading(false)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
      setApiError(t('page.error') || 'Failed to load plans')
      setApiLoading(false)
    }
  }

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
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

  const handlePlanSelect = (planKey, planDetails) => {
    // Check if user is already on this plan
    // We map the current plan key to match API names if needed
    const currentPlanName = mapPlanKey(subscriptionData?.current_plan)

    if (planKey === currentPlanName) {
      // Already on this plan
      return
    }

    setSelectedPlan(planKey)

    // Determine if upgrade or downgrade
    // We need current plan details to compare. 
    const currentPlanDetails = plans.find(p => p.name === currentPlanName) || { monthlyPrice: 0 }

    const isDowngrade = planDetails.monthlyPrice < currentPlanDetails.monthlyPrice;

    if (!isDowngrade) {
      // Upgrade - navigate to checkout
      navigate('/subscription/checkout', {
        state: {
          selectedPlan: planKey,
          planDetails: planDetails,
          category: planDetails.category,
          currentPlan: currentPlanName
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

  // Map internal database plan keys to frontend plan keys
  const mapPlanKey = (dbKey) => {
    if (!dbKey) return 'free'

    // Legacy mapping
    const mapping = {
      'professional': 'loyalty_professional',
      'enterprise': 'pos_enterprise',
      'free': 'free'
    };

    // If it's one of the new keys, return it as is
    if (['loyalty_starter', 'loyalty_growth', 'loyalty_professional',
      'pos_business', 'pos_enterprise', 'pos_premium'].includes(dbKey)) {
      return dbKey;
    }

    return mapping[dbKey] || dbKey;
  };

  const renderPlanCard = (plan, index, isLoyalty) => {
    const isCurrentPlan = mapPlanKey(subscriptionData?.current_plan) === plan.name;
    // Highlight the middle one in each category if there are 3.
    const isHighlight = (isLoyalty && index === 1) || (!isLoyalty && index === 1);

    return (
      <div
        key={plan.name}
        className={`reveal-stagger lg:col-span-4 ${isHighlight
          ? 'lg:col-span-4 lg:order-2 lg:scale-110 z-20'
          : 'lg:order-1'
          }`}
        style={{ animationDelay: `${(index + 3) * 150}ms` }}
      >
        <div
          className={`relative glass-card p-8 sm:p-10 transition-all duration-500 flex flex-col h-full overflow-hidden ${isHighlight
            ? 'border-2 border-[hsl(var(--electric-indigo))] dark:border-[hsl(var(--neon-teal))] indigo-glow dark:teal-glow'
            : 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xl'
            }`}
        >
          {/* Plan Accent */}
          {isHighlight && (
            <div className="absolute top-0 right-0">
              <div className="bg-[hsl(var(--electric-indigo))] dark:bg-[hsl(var(--neon-teal))] text-white dark:text-slate-950 text-[10px] font-black uppercase tracking-tighter px-6 py-1 rotate-45 translate-x-4 translate-y-2">
                {t('plans.loyalty.popular', 'POPULAR')}
              </div>
            </div>
          )}

          {/* Plan Content */}
          <div className="mb-10 text-center sm:text-left">
            <div className="text-4xl mb-6 flex justify-center sm:justify-start">
              <span className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                {isLoyalty ? '💼' : '🏢'}
              </span>
            </div>
            <h2 className="text-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-2">
              {plan.displayName}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {plan.description || (isLoyalty ? t('plans.loyalty.description') : t('plans.pos.description'))}
            </p>
          </div>

          {/* Price */}
          <div className="mb-10 text-center sm:text-left sticky top-0 sm:relative bg-inherit py-4 sm:py-0 z-10 -mx-8 sm:mx-0 px-8 sm:px-0 border-b border-transparent sm:border-0 dark:data-[sticky=true]:bg-slate-900 data-[sticky=true]:border-slate-200 dark:data-[sticky=true]:border-slate-800 transition-colors">
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              <span className="text-display text-5xl sm:text-6xl text-slate-900 dark:text-white">
                {plan.monthlyPrice}
              </span>
              <span className="text-xl font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                SAR
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-tighter text-slate-400 dark:text-slate-600 mt-2">
              {t('plans.monthly', 'PER MONTH')}
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-5 mb-12 flex-grow">
            {plan.features && plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 group">
                <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] transition-colors group-hover:bg-[hsl(var(--electric-indigo))] dark:group-hover:bg-[hsl(var(--neon-teal))] group-hover:text-white dark:group-hover:text-slate-950">
                  ✓
                </div>
                <span className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-tight">
                  {typeof feature === 'string' && feature.startsWith('plans.') ? t(feature) : feature}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <button
            onClick={() => handlePlanSelect(plan.name, plan)}
            disabled={isCurrentPlan}
            className={`w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all transform active:scale-95 ${isCurrentPlan
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-transparent'
              : isHighlight
                ? 'bg-[hsl(var(--electric-indigo))] dark:bg-[hsl(var(--neon-teal))] text-white dark:text-slate-950 hover:shadow-indigo-500/50 dark:hover:shadow-teal-500/50 hover:shadow-2xl'
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-xl'
              }`}
          >
            {isCurrentPlan ? t('actions.currentPlan') : t('actions.selectPlan')}
          </button>
        </div>
      </div>
    );
  };

  if (loading || apiLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('page.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || apiError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || apiError}</p>
          <button
            onClick={() => { loadSubscriptionData(); fetchPlans(); }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {t('page.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-500 mesh-gradient-bg" dir={i18n.dir()}>
      <SEO titleKey="page.title" descriptionKey="page.subtitle" noindex={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16 sm:mb-24 reveal-stagger">
          <h1 className="text-display text-5xl sm:text-7xl lg:text-8xl text-slate-900 dark:text-white mb-6 leading-none">
            {t('page.title')}
          </h1>
          <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 max-w-prose mx-auto">
            {t('page.subtitle')}
          </p>
        </div>

        {/* Back Navigation */}
        <div className="flex justify-center mb-12 sm:mb-16 reveal-stagger" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => navigate('/dashboard?tab=billing-subscription')}
            className="group flex items-center gap-2 px-8 py-4 rounded-full bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-all text-sm font-bold uppercase tracking-widest min-h-[44px]"
          >
            <span className={`transform transition-transform group-hover:-translate-x-1 ${i18n.dir() === 'rtl' ? 'rotate-180' : ''}`}>←</span>
            {t('actions.backToBilling')}
          </button>
        </div>

        {/* Loyalty Plans Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white inline-block border-b-4 border-[hsl(var(--electric-indigo))] pb-2">
              {t('plans.loyalty.categoryName', 'Loyalty Plans')}
            </h2>
          </div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center">
            {loyaltyPlans.map((plan, index) => renderPlanCard(plan, index, true))}
          </div>
        </div>

        {/* POS Plans Section */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white inline-block border-b-4 border-purple-500 pb-2">
              {t('plans.pos.categoryName', 'POS Plans')}
            </h2>
          </div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center">
            {posPlans.map((plan, index) => renderPlanCard(plan, index, false))}
          </div>
        </div>
      </div>

      {/* Modal - Glassmorphic Redesign */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={closeModal}
          ></div>
          <div className="relative glass-card max-w-md w-full p-10 reveal-stagger" style={{ animationDelay: '0ms' }}>
            <h3 className="text-display text-4xl text-slate-900 dark:text-white mb-6">
              {t(`modal.${modalType}.title`, { plan: selectedPlan })}
            </h3>

            <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">
              {t(`modal.${modalType}.subtitle`, {
                currentPlan: subscriptionData?.current_plan,
                newPlan: selectedPlan
              })}
            </p>

            {modalType === 'downgrade' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 leading-relaxed">
                  ⚠️ {t('modal.downgrade.warning')}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={closeModal}
                className="flex-1 px-8 py-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                {t('actions.cancel')}
              </button>
              <button
                disabled
                className="flex-1 px-8 py-4 rounded-xl bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 font-bold cursor-not-allowed flex items-center justify-center gap-2"
              >
                {t('actions.confirm')}
                <span className="text-[10px] bg-slate-400 dark:bg-slate-600 text-white dark:text-slate-800 px-2 py-0.5 rounded-full">{t('actions.soon')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansPage;
