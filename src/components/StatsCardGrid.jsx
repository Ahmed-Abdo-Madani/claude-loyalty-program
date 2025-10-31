import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MiniStatCard from './MiniStatCard'

function StatsCardGrid({ analytics }) {
  const { t } = useTranslation('dashboard')
  
  // Map existing analytics data to design stats
  const statsCards = [
    {
      id: 'total_customers',
      title: t('overview.totalCustomers'),
      value: analytics?.totalCustomers || 0,
      icon: '👥',
      bgGradient: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30',
      border: 'border-l-4 border-blue-500',
      iconBg: 'bg-blue-500/20',
      valueColor: 'text-blue-900 dark:text-blue-100',
      labelColor: 'text-blue-700 dark:text-blue-300'
    },
    {
      id: 'active_members',
      title: t('overview.activeMembers'),
      value: analytics?.activeMembers || analytics?.cardsIssued || 0,
      icon: '✅',
      bgGradient: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30',
      border: 'border-l-4 border-green-500',
      iconBg: 'bg-green-500/20',
      valueColor: 'text-green-900 dark:text-green-100',
      labelColor: 'text-green-700 dark:text-green-300'
    },
    {
      id: 'vip_customers',
      title: t('overview.vip'),
      value: analytics?.vipCustomers || 0,
      icon: '👑',
      bgGradient: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30',
      border: 'border-l-4 border-purple-500',
      iconBg: 'bg-purple-500/20',
      valueColor: 'text-purple-900 dark:text-purple-100',
      labelColor: 'text-purple-700 dark:text-purple-300'
    },
    {
      id: 'points_redeemed',
      title: t('overview.pointsRedeemed'),
      value: analytics?.rewardsRedeemed || 0,
      icon: '💎',
      bgGradient: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/30',
      border: 'border-l-4 border-indigo-500',
      iconBg: 'bg-indigo-500/20',
      valueColor: 'text-indigo-900 dark:text-indigo-100',
      labelColor: 'text-indigo-700 dark:text-indigo-300'
    }
  ]

  return (
    <div className="mb-3 sm:mb-4">
      {/* Header with Analytics Link */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{t('overview.performanceOverview')}</h2>
        <Link 
          to="/dashboard?tab=analytics"
          className="flex items-center gap-1 text-sm text-primary dark:text-primary hover:underline font-medium"
        >
          <span>{t('overview.advancedAnalytics')}</span>
          <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      
      {/* Compact Horizontal Stats - Single row with horizontal scroll */}
      <div className="flex flex-row gap-2 overflow-x-auto pb-2 -mx-3 px-3 snap-x snap-mandatory">
        {statsCards.map((stat) => (
          <MiniStatCard
            key={stat.id}
            icon={stat.icon}
            label={stat.title}
            value={stat.value}
            bgGradient={stat.bgGradient}
            border={stat.border}
            iconBg={stat.iconBg}
            valueColor={stat.valueColor}
            labelColor={stat.labelColor}
            variant="compact"
            className="flex-shrink-0 min-w-[75px] sm:min-w-0 sm:flex-1 snap-start"
          />
        ))}
      </div>
    </div>
  )
}

export default StatsCardGrid