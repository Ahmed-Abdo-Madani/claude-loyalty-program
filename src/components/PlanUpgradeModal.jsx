import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const PlanUpgradeModal = ({
    isOpen,
    onClose,
    currentPlan = 'free',
    suggestedPlans
}) => {
    const { t } = useTranslation(['subscription', 'common']);
    const navigate = useNavigate();
    const [isAnimating, setIsAnimating] = useState(false);
    const [billingInterval, setBillingInterval] = useState('monthly');

    useEffect(() => {
        if (isOpen) {
            // Small delay to allow render before animating in
            requestAnimationFrame(() => setIsAnimating(true));
        } else {
            setIsAnimating(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const defaultPlans = [
        {
            id: 'loyalty_growth',
            name: t('subscription:plans.loyalty_growth.name', 'Loyalty Growth'),
            price: { monthly: 99, annual: 85 },
            features: [
                t('subscription:plans.loyalty_growth.features.0', 'Up to 2,000 Customers'),
                t('subscription:plans.loyalty_growth.features.1', '5 Active Offers'),
                t('subscription:plans.loyalty_growth.features.2', 'Up to 3 Locations'),
                t('subscription:plans.loyalty_growth.features.3', 'Advanced Analytics'),
                t('subscription:plans.loyalty_growth.features.4', 'Priority Support')
            ]
        },
        {
            id: 'loyalty_professional',
            name: t('subscription:plans.loyalty_professional.name', 'Loyalty Professional'),
            price: { monthly: 299, annual: 250 },
            features: [
                t('subscription:plans.loyalty_professional.features.0', 'Unlimited Customers'),
                t('subscription:plans.loyalty_professional.features.1', 'Unlimited Offers'),
                t('subscription:plans.loyalty_professional.features.2', 'Unlimited Locations'),
                t('subscription:plans.loyalty_professional.features.3', 'Custom Branding'),
                t('subscription:plans.loyalty_professional.features.4', 'API Access')
            ],
            recommended: true
        },
        {
            id: 'pos_enterprise',
            name: t('subscription:plans.pos_enterprise.name', 'POS Enterprise'),
            price: { monthly: 599, annual: 500 },
            features: [
                t('subscription:plans.pos_enterprise.features.0', 'Unlimited Registers'),
                t('subscription:plans.pos_enterprise.features.1', 'Multi-location Support'),
                t('subscription:plans.pos_enterprise.features.2', 'Advanced Inventory'),
                t('subscription:plans.pos_enterprise.features.3', 'Kitchen Display System')
            ]
        }
    ];

    const plans = suggestedPlans || defaultPlans;

    const handleSelectPlan = (planId) => {
        onClose();
        navigate('/subscription/checkout', {
            state: {
                selectedPlan: planId,
                billingInterval
            }
        });
    };

    const isUpgrade = (planId) => {
        const weights = {
            'free': 0,
            'loyalty_starter': 1,
            'loyalty_growth': 2,
            'loyalty_professional': 3,
            'pos_business': 4,
            'pos_enterprise': 5,
            'pos_premium': 6
        };
        return (weights[planId] || 0) > (weights[currentPlan] || 0);
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full transform transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
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
                        {t('subscription:modal.upgrade.title', 'Upgrade Your Plan')}
                    </h2>
                    <p className="text-blue-100 text-lg">
                        {t('subscription:modal.upgrade.subtitle', 'Unlock more features and grow your business')}
                    </p>

                    {/* Pricing Toggle */}
                    <div className="flex justify-center items-center mt-6 gap-3">
                        <span className={`text-sm font-medium ${billingInterval === 'monthly' ? 'text-white' : 'text-blue-200'}`}>
                            {t('subscription:billing.monthly', 'Monthly')}
                        </span>
                        <button
                            onClick={() => setBillingInterval(prev => prev === 'monthly' ? 'annual' : 'monthly')}
                            className="relative w-14 h-7 bg-blue-500 rounded-full p-1 transition-colors duration-200 focus:outline-none ring-2 ring-blue-400 ring-offset-2 ring-offset-blue-600"
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${billingInterval === 'annual' ? 'translate-x-7' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                        <span className={`text-sm font-medium ${billingInterval === 'annual' ? 'text-white' : 'text-blue-200'}`}>
                            {t('subscription:billing.annual', 'Annual')}
                            <span className="ml-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                {t('subscription:billing.savePercent', 'Save 15%')}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plans.map((plan) => {
                            const isActive = plan.id === currentPlan;
                            const canUpgrade = isUpgrade(plan.id);

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-xl border-2 p-6 transition-all duration-200 ${isActive
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-400'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            {t('subscription:plans.current', 'Current Plan')}
                                        </div>
                                    )}

                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            {plan.name}
                                        </h3>
                                        <div className="flex justify-center items-baseline gap-1">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {billingInterval === 'monthly' ? plan.price.monthly : plan.price.annual} SAR
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                /{t('subscription:billing.month', 'mo')}
                                            </span>
                                        </div>
                                        {billingInterval === 'annual' && (
                                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                                {t('subscription:billing.billedAnnually', 'Billed annually')}
                                            </p>
                                        )}
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                <span className="text-sm text-gray-600 dark:text-gray-300 text-left">
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleSelectPlan(plan.id)}
                                        disabled={isActive || !canUpgrade}
                                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${isActive
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
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanUpgradeModal;
