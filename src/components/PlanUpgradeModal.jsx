import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { secureApi, endpoints } from '../config/api';

const PlanUpgradeModal = ({
    isOpen,
    onClose,
    currentPlan = 'free',
    suggestedPlans,
    trialExpired = false,
    message = ''
}) => {
    const { t } = useTranslation(['subscription', 'common']);
    const navigate = useNavigate();
    const [isAnimating, setIsAnimating] = useState(false);
    const [billingInterval, setBillingInterval] = useState('monthly');

    // API Data State
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loyaltyPlans, setLoyaltyPlans] = useState([]);
    const [posPlans, setPosPlans] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Small delay to allow render before animating in
            requestAnimationFrame(() => setIsAnimating(true));
            // Only fetch if we haven't already
            if (plans.length === 0) {
                fetchPlans();
            }
        } else {
            setIsAnimating(false);
        }
    }, [isOpen]);

    const fetchPlans = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await secureApi.get(endpoints.subscriptionPlans);
            const json = await response.json();
            if (json.success && json.data && json.data.plans) {
                const fetchedPlans = json.data.plans;
                setPlans(fetchedPlans);

                // Separate plans by category and sort by price
                const loyalty = fetchedPlans
                    .filter(p => p.category === 'loyalty')
                    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);

                const pos = fetchedPlans
                    .filter(p => p.category === 'pos')
                    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);

                setLoyaltyPlans(loyalty);
                setPosPlans(pos);
            }
        } catch (err) {
            console.error('Failed to fetch plans:', err);
            setError(t('subscription:page.error', 'Failed to load plans. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (plan) => {
        const url = `/subscription/checkout?plan=${plan.name}&interval=${billingInterval}`;
        window.open(url, '_blank');
        onClose();
    };

    const isUpgrade = (planName) => {
        const weights = {
            'free': 0,
            'loyalty_starter': 1,
            'loyalty_growth': 2,
            'loyalty_professional': 3,
            'pos_business': 4,
            'pos_enterprise': 5,
            'pos_premium': 6
        };
        // Safely access weight, default to 0 if not found
        const planWeight = weights[planName] || 0;
        const currentWeight = weights[currentPlan] || 0;

        return planWeight > currentWeight;
    };

    if (!isOpen) return null;

    // Helper Component for Category Badges
    const CategoryBadge = ({ category }) => {
        const isLoyalty = category === 'loyalty';
        const bgColor = isLoyalty
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        const label = isLoyalty ? 'Loyalty' : 'POS';

        return (
            <span className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-md ${bgColor}`}>
                {label}
            </span>
        );
    };

    // Helper Component for Plan Card
    const PlanCard = ({ plan, isActive, canUpgrade }) => {
        // Try to get translated features, fallback to API features
        const translatedFeatures = t(`subscription:plans.${plan.name}.features`, { returnObjects: true });
        const features = Array.isArray(translatedFeatures) ? translatedFeatures : plan.features || [];

        // Recommend Logic: For free users, recommend Growth or Business
        const isRecommended = currentPlan === 'free' && (plan.name === 'loyalty_growth' || plan.name === 'pos_business');

        return (
            <div
                className={`relative rounded-xl border-2 p-6 transition-all duration-200 flex flex-col ${isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-400'
                    : isRecommended
                        ? 'border-blue-400 ring-1 ring-blue-400 shadow-lg scale-[1.02]'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg'
                    }`}
            >
                {isActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap z-10">
                        {t('subscription:plans.current', 'Current Plan')}
                    </div>
                )}

                {!isActive && isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap z-10 shadow-sm">
                        {t('subscription:plans.recommended', 'Recommended')}
                    </div>
                )}

                <CategoryBadge category={plan.category} />

                <div className="text-center mb-6 mt-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.displayName}
                    </h3>
                    <div className="flex justify-center items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {billingInterval === 'monthly' ? plan.monthlyPrice : plan.annualPrice} SAR
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                            /{billingInterval === 'monthly' ? t('subscription:billing.month', 'mo') : t('subscription:billing.year', 'yr')}
                        </span>
                    </div>
                    {billingInterval === 'annual' && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            {t('subscription:billing.billedAnnually', 'Billed annually')}
                        </p>
                    )}
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                    {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-gray-300 text-left">
                                {feature}
                            </span>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isActive || !canUpgrade}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 mt-auto ${isActive
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
                        : canUpgrade
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    {isActive
                        ? t('subscription:plans.active', 'Active Plan')
                        : canUpgrade
                            ? t('subscription:actions.selectPlan', 'Select Plan')
                            : t('subscription:actions.contactSupport', 'Contact Support')
                    }
                </button>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full transform transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>

                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-t-2xl text-center text-white">
                    <h2 className="text-3xl font-bold mb-2">
                        {trialExpired
                            ? (t('subscription:modal.trialExpired.title', 'Trial Period Expired'))
                            : (t('subscription:modal.upgrade.title', 'Upgrade Your Plan'))
                        }
                    </h2>
                    <p className="text-blue-100 text-lg">
                        {trialExpired && message
                            ? message
                            : (t('subscription:modal.upgrade.subtitle', 'Unlock more features and grow your business'))
                        }
                    </p>

                    {/* Pricing Toggle */}
                    <div className="flex justify-center items-center mt-6 gap-3">
                        <span className={`text-sm font-medium leading-relaxed py-1 ${billingInterval === 'monthly' ? 'text-white' : 'text-blue-200'}`}>
                            {t('subscription:billing.monthly', 'Monthly')}
                        </span>
                        <button
                            onClick={() => setBillingInterval(prev => prev === 'monthly' ? 'annual' : 'monthly')}
                            className="relative w-14 h-7 bg-blue-500 rounded-full p-1 transition-colors duration-200 focus:outline-none ring-2 ring-blue-400 ring-offset-2 ring-offset-blue-600"
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${billingInterval === 'annual'
                                    ? 'ltr:translate-x-7 rtl:-translate-x-7'
                                    : 'translate-x-0'
                                    }`}
                            />
                        </button>
                        <span className={`text-sm font-medium leading-relaxed py-1 inline-flex items-center gap-2 ${billingInterval === 'annual' ? 'text-white' : 'text-blue-200'}`}>
                            {t('subscription:billing.annual', 'Annual')}
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                                {t('subscription:billing.savePercent', 'Save 15%')}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-500 dark:text-gray-400">
                                {t('subscription:page.loading', 'Loading plans...')}
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button
                                onClick={fetchPlans}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <ArrowPathIcon className="h-5 w-5" />
                                {t('common:retry', 'Retry')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Loyalty Section */}
                            {loyaltyPlans.length > 0 && (
                                <section>
                                    <div className="mb-6">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-blue-500 pl-4">
                                            {t('subscription:plans.loyalty', 'Loyalty Plans')}
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 pl-5 mt-1">
                                            Build customer loyalty and increase retention
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {loyaltyPlans.map((plan) => (
                                            <PlanCard
                                                key={plan.id}
                                                plan={plan}
                                                isActive={plan.name === currentPlan}
                                                canUpgrade={isUpgrade(plan.name)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {loyaltyPlans.length > 0 && posPlans.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-gray-700" />
                            )}

                            {/* POS Section */}
                            {posPlans.length > 0 && (
                                <section>
                                    <div className="mb-6">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-purple-500 pl-4">
                                            {t('subscription:plans.pos', 'POS Plans')}
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 pl-5 mt-1">
                                            Complete Point of Sale solution for your business
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {posPlans.map((plan) => (
                                            <PlanCard
                                                key={plan.id}
                                                plan={plan}
                                                isActive={plan.name === currentPlan}
                                                canUpgrade={isUpgrade(plan.name)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlanUpgradeModal;
