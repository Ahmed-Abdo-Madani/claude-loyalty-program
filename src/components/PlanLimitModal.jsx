/**
 * PlanLimitModal Component
 * 
 * Displays when a user attempts an operation that exceeds their plan limits.
 * Shows current usage, plan limits, and provides upgrade options.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function PlanLimitModal({
    isOpen,
    onClose,
    limitType = 'general', // 'offers', 'branches', 'customers', 'posOperations'
    currentUsage = 0,
    planLimit = 1,
    currentPlan = 'free',
    suggestedPlan = 'professional'
}) {
    const { t } = useTranslation(['subscription', 'dashboard'])
    const navigate = useNavigate()
    const [isAnimating, setIsAnimating] = useState(true)

    if (!isOpen) return null

    const limitConfig = {
        offers: {
            icon: '🎁',
            title: t('dashboard:planLimits.offersLimitReached', 'Offer Limit Reached'),
            description: t('dashboard:planLimits.offersLimitDesc', 'You\'ve reached the maximum number of offers for your current plan.'),
            actionLabel: t('dashboard:planLimits.createMoreOffers', 'Create unlimited offers')
        },
        branches: {
            icon: '🏪',
            title: t('dashboard:planLimits.branchesLimitReached', 'Branch Limit Reached'),
            description: t('dashboard:planLimits.branchesLimitDesc', 'You\'ve reached the maximum number of locations for your current plan.'),
            actionLabel: t('dashboard:planLimits.addMoreBranches', 'Add more locations')
        },
        customers: {
            icon: '👥',
            title: t('dashboard:planLimits.customersLimitReached', 'Customer Limit Reached'),
            description: t('dashboard:planLimits.customersLimitDesc', 'You\'ve reached the maximum number of customers for your current plan.'),
            actionLabel: t('dashboard:planLimits.growCustomerBase', 'Grow your customer base')
        },
        posOperations: {
            icon: '💳',
            title: t('dashboard:planLimits.posLimitReached', 'POS Operations Limit Reached'),
            description: t('dashboard:planLimits.posLimitDesc', 'You\'ve used all your POS operations for this month.'),
            actionLabel: t('dashboard:planLimits.unlimitedPos', 'Unlock unlimited POS')
        },
        general: {
            icon: '⚠️',
            title: t('dashboard:planLimits.planLimitReached', 'Plan Limit Reached'),
            description: t('dashboard:planLimits.generalLimitDesc', 'You\'ve reached a limit on your current plan.'),
            actionLabel: t('dashboard:planLimits.upgradeForMore', 'Upgrade for more features')
        }
    }

    const config = limitConfig[limitType] || limitConfig.general

    const planNames = {
        free: t('subscription:plans.free.name', 'Free'),
        professional: t('subscription:plans.loyalty.name', 'Loyalty Program'),
        enterprise: t('subscription:plans.pos.name', 'POS Program')
    }

    const planPrices = {
        free: 0,
        professional: 60,
        enterprise: 210
    }

    const handleUpgrade = () => {
        onClose()
        navigate('/subscription/checkout', {
            state: {
                selectedPlan: suggestedPlan,
                fromLimitModal: true,
                limitType
            }
        })
    }

    const handleViewPlans = () => {
        onClose()
        navigate('/subscription')
    }

    const usagePercentage = planLimit > 0 ? Math.min((currentUsage / planLimit) * 100, 100) : 100

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{config.icon}</span>
                        <div>
                            <h2 className="text-xl font-bold">{config.title}</h2>
                            <p className="text-amber-100 text-sm mt-1">{config.description}</p>
                        </div>
                    </div>
                </div>

                {/* Usage indicator */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('dashboard:planLimits.currentUsage', 'Current Usage')}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {currentUsage} / {planLimit === Infinity ? '∞' : planLimit}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${usagePercentage >= 100
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : usagePercentage >= 80
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                            style={{ width: `${usagePercentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        {t('dashboard:planLimits.onPlan', 'You\'re on the')} <span className="font-semibold">{planNames[currentPlan]}</span> {t('dashboard:planLimits.plan', 'plan')}
                    </p>
                </div>

                {/* Upgrade suggestion */}
                <div className="p-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🚀</span>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {t('dashboard:planLimits.upgradeTo', 'Upgrade to')} {planNames[suggestedPlan]}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {config.actionLabel}
                                </p>
                                <p className="text-lg font-bold text-primary mt-2">
                                    {planPrices[suggestedPlan]} SAR
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                        /{t('subscription:currentPlan.perMonth', 'per month')}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3 mt-6">
                        <button
                            onClick={handleUpgrade}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                        >
                            {t('subscription:actions.upgradeNow', 'Upgrade Now')} →
                        </button>
                        <button
                            onClick={handleViewPlans}
                            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                        >
                            {t('subscription:actions.viewPlans', 'View All Plans')}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
                        >
                            {t('dashboard:planLimits.maybeLater', 'Maybe Later')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlanLimitModal
