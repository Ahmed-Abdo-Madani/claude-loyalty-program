
import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';

const CompetitorComparison = () => {
    const { t } = useTranslation('landing');

    // Use localized competitor names
    const competitors = t('pricing.comparison.competitors', { returnObjects: true }) || ['Madna', 'Comp A', 'Comp B'];
    const features = ['pricing', 'customer_limits', 'pos_features', 'analytics', 'support'];

    const getStatus = (competitorIndex, featureIndex) => {
        // Logic to visually differentiate Madna vs others
        // Madna (index 0) always has CheckIcon (green)
        // Others have mixed results for demo purposes
        if (competitorIndex === 0) return true;
        if (featureIndex === 0) return false; // Transparent Pricing
        if (featureIndex === 2) return false; // POS Integration
        return featureIndex % 2 === 0; // Random checkmarks for others
    };

    return (
        <div className="w-full overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                    {t('pricing.comparison.title')}
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                    <thead>
                        <tr>
                            <th className="p-4 text-left rtl:text-right bg-gray-50 dark:bg-gray-900 min-w-[200px]"></th>
                            {competitors.map((comp, idx) => (
                                <th
                                    key={idx}
                                    className={`p-4 font-bold text-lg min-w-[150px] ${idx === 0
                                        ? 'text-primary bg-primary/5 dark:bg-primary/10 border-t-4 border-t-primary'
                                        : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {comp}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {features.map((featureKey, fIdx) => (
                            <tr key={fIdx} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-4 text-left rtl:text-right font-medium text-gray-700 dark:text-gray-300 border-r dark:border-gray-700">
                                    {t(`pricing.comparison.features.${featureKey}`)}
                                </td>
                                {competitors.map((_, cIdx) => {
                                    const isAvailable = getStatus(cIdx, fIdx);
                                    return (
                                        <td
                                            key={cIdx}
                                            className={`p-4 ${cIdx === 0 ? 'bg-primary/5 dark:bg-primary/10' : ''
                                                }`}
                                        >
                                            <div className="flex justify-center">
                                                {isAvailable ? (
                                                    <CheckIcon className="h-6 w-6 text-green-500" />
                                                ) : (
                                                    <XMarkIcon className="h-6 w-6 text-red-400" />
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View (Card style fallback for very small screens if needed, 
          though overflow-x-auto handles tables reasonably well) */}
        </div>
    );
};

export default CompetitorComparison;
