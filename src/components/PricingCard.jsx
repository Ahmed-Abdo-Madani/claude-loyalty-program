
import React from 'react';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';

const PricingCard = ({ plan, billingInterval, isPopular, onSelectPlan }) => {
    const { t } = useTranslation('landing');
    const isAnnual = billingInterval === 'annual';

    return (
        <div
            className={`relative flex flex-col p-6 bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isPopular
                ? 'border-primary shadow-lg ring-1 ring-primary'
                : 'border-gray-200 dark:border-gray-700'
                }`}
        >
            {(isPopular && plan.badge) && (
                <div className="absolute top-0 right-0 -mt-3 mr-4 rtl:mr-0 rtl:ml-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary text-white">
                        {plan.badge}
                    </span>
                </div>
            )}

            <div className="mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 min-h-[40px]">
                    {plan.description}
                </p>
            </div>

            <div className="mb-6">
                <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {plan.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2 rtl:ml-0 rtl:mr-2 text-sm">
                        {isAnnual ? '/year' : '/month'}
                    </span>
                </div>
                {isAnnual && (
                    <p className="mt-1 text-xs text-green-600 font-medium">
                        {t('pricing.hero.save')}
                    </p>
                )}
            </div>

            <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="ml-3 rtl:ml-0 rtl:mr-3 text-sm text-gray-600 dark:text-gray-300">
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onSelectPlan}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isPopular
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30'
                    }`}
            >
                {t('pricing.cta.getStarted')}
            </button>
        </div>
    );
};

export default PricingCard;
