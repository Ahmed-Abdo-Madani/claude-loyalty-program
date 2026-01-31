import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    UsersIcon,
    MapPinIcon,
    TagIcon,
    CreditCardIcon
} from '@heroicons/react/24/outline';

const UsageMetrics = ({
    usage = {},
    limits = {},
    showTitle = true,
    variant = 'default'
}) => {
    const { t } = useTranslation();

    const metrics = [
        {
            key: 'customers',
            icon: UsersIcon,
            label: t('subscription:usage.customers'),
            current: usage.customers || 0,
            limit: limits.customers,
            color: 'blue'
        },
        {
            key: 'locations',
            icon: MapPinIcon,
            label: t('subscription:usage.locations'),
            current: usage.locations || 0,
            limit: limits.locations,
            color: 'indigo'
        },
        {
            key: 'offers',
            icon: TagIcon,
            label: t('subscription:usage.offers'),
            current: usage.offers || 0,
            limit: limits.offers,
            color: 'purple'
        },
        {
            key: 'pos_operations',
            icon: CreditCardIcon,
            label: t('subscription:usage.posOperations'),
            current: usage.pos_operations || 0,
            limit: limits.pos_operations,
            color: 'pink'
        }
    ];

    const getProgressColor = (current, limit) => {
        if (!limit) return 'bg-blue-500';
        const percentage = (current / limit) * 100;
        if (percentage > 90) return 'bg-red-500';
        if (percentage > 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const calculatePercentage = (current, limit) => {
        if (!limit) return 100;
        return Math.min(Math.max((current / limit) * 100, 0), 100);
    };

    return (
        <div className={`w-full ${variant === 'compact' ? 'p-2' : 'p-4'}`}>
            {showTitle && (
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {t('subscription:usage.title', 'Usage Metrics')}
                </h3>
            )}

            <div className={`grid grid-cols-1 ${variant === 'compact' ? 'gap-2' : 'gap-4 sm:grid-cols-2 lg:grid-cols-4'}`}>
                {metrics.map((metric) => (
                    <div
                        key={metric.key}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className={`p-2 rounded-lg bg-${metric.color}-50 dark:bg-${metric.color}-900/20`}>
                                <metric.icon className={`h-5 w-5 text-${metric.color}-600 dark:text-${metric.color}-400`} />
                            </div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                {metric.limit ? `${Math.round((metric.current / metric.limit) * 100)}%` : '∞'}
                            </span>
                        </div>

                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                            {metric.label}
                        </p>

                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                {metric.current}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                / {metric.limit === null ? '∞' : metric.limit}
                            </span>
                        </div>

                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(metric.current, metric.limit)}`}
                                style={{ width: `${calculatePercentage(metric.current, metric.limit)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UsageMetrics;
