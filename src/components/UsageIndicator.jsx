/**
 * UsageIndicator Component
 * 
 * Shows a compact usage bar for a specific feature (offers, branches, etc.)
 */

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const UsageIndicator = ({
    label,
    current,
    max,
    type, // 'offers', 'branches', etc.
    showUpgradeButton = true
}) => {
    const { t } = useTranslation(['dashboard', 'subscription'])
    const navigate = useNavigate()

    const isUnlimited = max === Infinity || max === null || max === -1
    const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100)

    const getStatusColor = () => {
        if (isUnlimited) return 'bg-emerald-500'
        if (percentage >= 100) return 'bg-red-500'
        if (percentage >= 80) return 'bg-amber-500'
        return 'bg-primary'
    }

    const handleUpgrade = () => {
        navigate('/dashboard?tab=billing-subscription')
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {label}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {current} / {isUnlimited ? '∞' : max}
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${getStatusColor()}`}
                            style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
                        />
                    </div>
                    {!isUnlimited && percentage >= 80 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                            {percentage >= 100
                                ? t('dashboard:planLimits.limitReached', 'Limit reached! Upgrade to add more.')
                                : t('dashboard:planLimits.approaching', 'Approaching limit. Consider upgrading soon.')}
                        </p>
                    )}
                </div>

                {showUpgradeButton && !isUnlimited && (
                    <button
                        onClick={handleUpgrade}
                        className="whitespace-nowrap px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold rounded-lg transition-colors border border-primary/20"
                    >
                        {t('subscription:actions.upgrade', 'Upgrade Plan')}
                    </button>
                )}
            </div>
        </div>
    )
}

export default UsageIndicator
