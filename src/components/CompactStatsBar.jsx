/**
 * CompactStatsBar Component
 * 
 * A space-efficient horizontal stats bar for non-Overview tabs.
 * Displays key business metrics in a single line with minimal padding.
 * Target height: 40-50px vs 200-300px of full StatsCardGrid.
 */

import { useTranslation } from 'react-i18next'
import MiniStatCard from './MiniStatCard'

function CompactStatsBar({ analytics }) {
  const { t } = useTranslation('dashboard')
  
  if (!analytics) {
    return null
  }

  const stats = [
    {
      icon: '👥',
      label: t('compactStats.customers'),
      value: analytics.totalCustomers || 0,
      bgGradient: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30',
      border: 'border-l-4 border-blue-500',
      iconBg: 'bg-blue-500/20',
      valueColor: 'text-blue-900 dark:text-blue-100',
      labelColor: 'text-blue-700 dark:text-blue-300'
    },
    {
      icon: '✅',
      label: t('compactStats.active'),
      value: analytics.activeMembers || analytics.cardsIssued || 0,
      bgGradient: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30',
      border: 'border-l-4 border-green-500',
      iconBg: 'bg-green-500/20',
      valueColor: 'text-green-900 dark:text-green-100',
      labelColor: 'text-green-700 dark:text-green-300'
    },
    {
      icon: '👑',
      label: t('compactStats.vip'),
      value: analytics.vipCustomers || 0,
      bgGradient: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30',
      border: 'border-l-4 border-purple-500',
      iconBg: 'bg-purple-500/20',
      valueColor: 'text-purple-900 dark:text-purple-100',
      labelColor: 'text-purple-700 dark:text-purple-300'
    },
    {
      icon: '💎',
      label: t('compactStats.redeemed'),
      value: analytics.rewardsRedeemed || 0,
      bgGradient: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/30',
      border: 'border-l-4 border-indigo-500',
      iconBg: 'bg-indigo-500/20',
      valueColor: 'text-indigo-900 dark:text-indigo-100',
      labelColor: 'text-indigo-700 dark:text-indigo-300'
    }
  ]

  return (
    <div className="mb-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((stat, index) => (
          <MiniStatCard
            key={index}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            bgGradient={stat.bgGradient}
            border={stat.border}
            iconBg={stat.iconBg}
            valueColor={stat.valueColor}
            labelColor={stat.labelColor}
            variant="compact"
          />
        ))}
      </div>
    </div>
  )
}

export default CompactStatsBar
