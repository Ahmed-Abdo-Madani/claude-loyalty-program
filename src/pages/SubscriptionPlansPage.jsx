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
    loyalty: {
      name: 'loyalty',
      price: 60,
      period: t('plans.loyalty.period'),
      description: t('plans.loyalty.description'),
      features: Array.isArray(t('plans.loyalty.features', { returnObjects: true }))
        ? t('plans.loyalty.features', { returnObjects: true })
        : [],
      icon: '💼',
      popular: true
    },
    pos: {
      name: 'pos',
      price: 210,
      period: t('plans.pos.period'),
      description: t('plans.pos.description'),
      features: Array.isArray(t('plans.pos.features', { returnObjects: true }))
        ? t('plans.pos.features', { returnObjects: true })
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
    const planOrder = { free: 0, loyalty: 1, pos: 2 }
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

  // Map internal database plan keys to frontend plan keys
  const mapPlanKey = (dbKey) => {
    const mapping = {
      'professional': 'loyalty',
      'enterprise': 'pos',
      'free': 'free'
    };
    return mapping[dbKey] || dbKey;
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-500 mesh-gradient-bg" dir={i18n.dir()}>
      <SEO titleKey="page.title" descriptionKey="page.subtitle" noindex={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero Section - Bold Modern */}
        <div className="text-center mb-16 sm:mb-24 reveal-stagger">
          <h1 className="text-display text-5xl sm:text-7xl lg:text-8xl text-slate-900 dark:text-white mb-6 leading-none">
            {t('page.title')}
          </h1>
          <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 max-w-prose mx-auto">
            {t('page.subtitle')}
          </p>
        </div>

        {/* Back Navigation - Modern Minimal */}
        <div className="flex justify-center mb-12 sm:mb-16 reveal-stagger" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => navigate('/dashboard?tab=billing-subscription')}
            className="group flex items-center gap-2 px-8 py-4 rounded-full bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-all text-sm font-bold uppercase tracking-widest min-h-[44px]"
          >
            <span className={`transform transition-transform group-hover:-translate-x-1 ${i18n.dir() === 'rtl' ? 'rotate-180' : ''}`}>←</span>
            {t('actions.backToBilling')}
          </button>
        </div>

        {/* Dynamic & Asymmetric Pricing Layout */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {Object.entries(plans).map(([planKey, plan], index) => {
            const mappedCurrentPlan = mapPlanKey(subscriptionData?.current_plan);
            const isCurrentPlan = mappedCurrentPlan === planKey;
            const isProfessional = planKey === 'loyalty';

            return (
              <div
                key={planKey}
                className={`reveal-stagger lg:col-span-4 ${isProfessional
                  ? 'lg:col-span-4 lg:order-2 lg:scale-110 z-20'
                  : planKey === 'free' ? 'lg:order-1' : 'lg:order-3'
                  }`}
                style={{ animationDelay: `${(index + 3) * 150}ms` }}
              >
                <div
                  className={`relative glass-card p-8 sm:p-10 transition-all duration-500 flex flex-col h-full overflow-hidden ${isProfessional
                    ? 'border-2 border-[hsl(var(--electric-indigo))] dark:border-[hsl(var(--neon-teal))] indigo-glow dark:teal-glow'
                    : 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xl'
                    }`}
                >
                  {/* Plan Accent */}
                  {plan.popular && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-[hsl(var(--electric-indigo))] dark:bg-[hsl(var(--neon-teal))] text-white dark:text-slate-950 text-[10px] font-black uppercase tracking-tighter px-6 py-1 rotate-45 translate-x-4 translate-y-2">
                        {t('plans.loyalty.popular')}
                      </div>
                    </div>
                  )}

                  {/* Plan Content */}
                  <div className="mb-10 text-center sm:text-left">
                    <div className="text-4xl mb-6 flex justify-center sm:justify-start">
                      <span className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                        {plan.icon}
                      </span>
                    </div>
                    <h2 className="text-display text-3xl sm:text-4xl text-slate-900 dark:text-white mb-2">
                      {t(`plans.${planKey}.name`)}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price - The Focus Point (Sticky on Mobile) */}
                  <div className="mb-10 text-center sm:text-left sticky top-0 sm:relative bg-inherit py-4 sm:py-0 z-10 -mx-8 sm:mx-0 px-8 sm:px-0 border-b border-transparent sm:border-0 dark:data-[sticky=true]:bg-slate-900 data-[sticky=true]:border-slate-200 dark:data-[sticky=true]:border-slate-800 transition-colors">
                    <div className="flex items-baseline justify-center sm:justify-start gap-1">
                      <span className="text-display text-5xl sm:text-6xl text-slate-900 dark:text-white">
                        {plan.price}
                      </span>
                      <span className="text-xl font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                        SAR
                      </span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-tighter text-slate-400 dark:text-slate-600 mt-2">
                      {plan.period}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-5 mb-12 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 group">
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] transition-colors group-hover:bg-[hsl(var(--electric-indigo))] dark:group-hover:bg-[hsl(var(--neon-teal))] group-hover:text-white dark:group-hover:text-slate-950">
                          ✓
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 text-sm font-medium leading-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePlanSelect(planKey)}
                    disabled={isCurrentPlan}
                    className={`w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all transform active:scale-95 ${isCurrentPlan
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-transparent'
                      : isProfessional
                        ? 'bg-[hsl(var(--electric-indigo))] dark:bg-[hsl(var(--neon-teal))] text-white dark:text-slate-950 hover:shadow-indigo-500/50 dark:hover:shadow-teal-500/50 hover:shadow-2xl'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-xl'
                      }`}
                  >
                    {isCurrentPlan ? t('actions.currentPlan') : t('actions.selectPlan')}
                  </button>
                </div>
              </div>
            );
          })}
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
              {t(`modal.${modalType}.title`, { plan: t(`plans.${selectedPlan}.name`) })}
            </h3>

            <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">
              {t(`modal.${modalType}.subtitle`, {
                currentPlan: t(`plans.${subscriptionData?.current_plan}.name`),
                newPlan: t(`plans.${selectedPlan}.name`)
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
