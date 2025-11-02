import { useTranslation } from 'react-i18next'

function ActivityFeed({ recentActivity }) {
  const { t } = useTranslation('dashboard')
  
  // Sample activity icons based on activity type
  const getActivityIcon = (message) => {
    const msg = message.toLowerCase()
    if (msg.includes('member') || msg.includes('joined')) return '👤'
    if (msg.includes('points') || msg.includes('redeemed')) return '💎'
    if (msg.includes('offer') || msg.includes('created')) return '🎁'
    if (msg.includes('scan') || msg.includes('stamp')) return '📱'
    return '📝'
  }

  const getActivityColor = (message) => {
    const msg = message.toLowerCase()
    if (msg.includes('member') || msg.includes('joined')) return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    if (msg.includes('points') || msg.includes('redeemed')) return 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    if (msg.includes('offer') || msg.includes('created')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
    if (msg.includes('scan') || msg.includes('stamp')) return 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('activityFeed.title')}</h3>

      {recentActivity && recentActivity.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={activity.id || index} className="flex items-start space-x-2 sm:space-x-3 relative">
              {/* Activity Icon */}
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.message)}`}>
                <span className="text-sm sm:text-base">{getActivityIcon(activity.message)}</span>
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium">
                      {activity.message}
                    </p>

                    {/* Optional activity details */}
                    {activity.details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.details}
                      </p>
                    )}
                  </div>
                  
                  {/* Time ago - below on mobile, aligned right on desktop */}
                  <span className="text-xs text-gray-500 dark:text-gray-400 sm:text-right sm:flex-shrink-0">
                    {activity.timeAgo}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* View All Activities Link */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200 min-h-[44px] touch-target">
              {t('activityFeed.viewAll')}
            </button>
          </div>
        </div>
      ) : (
        // Empty state matching design
        <div className="text-center py-6 sm:py-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <div className="text-base sm:text-lg mb-2 text-gray-600 dark:text-gray-400">{t('activityFeed.welcome')}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 px-4">
            {t('activityFeed.getStarted')}
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityFeed