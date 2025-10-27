import { useState, useEffect } from 'react'
import WalletCard from './WalletCard'

function WalletAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWalletAnalytics()
  }, [])

  const loadWalletAnalytics = () => {
    // Load analytics from business-specific localStorage
    const businessId = localStorage.getItem('businessId') || 'default'
    const storageKey = `qr_analytics_${businessId}`
    const events = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const walletEvents = events.filter(e => e.eventType === 'wallet_added')
    const conversionEvents = events.filter(e => e.eventType === 'converted')

    const walletByType = walletEvents.reduce((acc, event) => {
      const type = event.walletType || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const walletBySource = walletEvents.reduce((acc, event) => {
      const source = event.source || 'direct'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    setAnalytics({
      totalSignups: conversionEvents.length,
      totalWalletAdds: walletEvents.length,
      walletConversionRate: conversionEvents.length > 0
        ? Math.round((walletEvents.length / conversionEvents.length) * 100)
        : 0,
      byType: walletByType,
      bySource: walletBySource,
      recentWalletAdds: walletEvents.slice(-5).reverse()
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading wallet analytics...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header Section - Mobile-first */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Mobile Wallets</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Track digital wallet adoption and customer engagement</p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Summary Stats - Mobile-first grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <WalletCard
            title="Wallet Cards Added"
            value={analytics.totalWalletAdds}
            icon="📱"
            color="primary"
            trend={analytics.totalWalletAdds > 0 ? 12 : 0}
          />
          <WalletCard
            title="Conversion Rate"
            value={`${analytics.walletConversionRate}%`}
            subtitle="Signup → Wallet"
            icon="📈"
            color="green"
            trend={analytics.walletConversionRate > 50 ? 8 : analytics.walletConversionRate > 25 ? 3 : -2}
          />
          <WalletCard
            title="Total Signups"
            value={analytics.totalSignups}
            icon="👥"
            color="blue"
            trend={analytics.totalSignups > 0 ? 5 : 0}
          />
        </div>

        {/* Wallet Type Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">📱</span>
            Wallet Type Distribution
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(analytics.byType).map(([type, count]) => (
              <div key={type} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl gap-3 sm:gap-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">
                      {type === 'apple' ? '🍎' : type === 'google' ? '📱' : '❓'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 dark:text-white capitalize block">{type} Wallet</span>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {analytics.totalWalletAdds > 0 ? Math.round((count / analytics.totalWalletAdds) * 100) : 0}% of total
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex-1 sm:w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        type === 'apple' ? 'bg-gray-800 dark:bg-gray-300' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${analytics.totalWalletAdds > 0 ? (count / analytics.totalWalletAdds) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white w-8 text-right">{count}</span>
                </div>
              </div>
            ))}

            {analytics.totalWalletAdds === 0 && (
              <div className="text-center py-6 sm:py-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl">📱</span>
                </div>
                <div className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">No wallet cards yet</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Share your QR codes to get started!</div>
              </div>
            )}
          </div>
        </div>

        {/* Source Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">📊</span>
            Wallet Adds by Source
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(analytics.bySource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-lg">
                      {source === 'checkout' ? '🛒' :
                       source === 'table' ? '🪑' :
                       source === 'window' ? '🪟' :
                       source === 'social' ? '📱' : '🔗'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {source.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {analytics.totalWalletAdds > 0 ? Math.round((count / analytics.totalWalletAdds) * 100) : 0}% of total
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${analytics.totalWalletAdds > 0 ? (count / analytics.totalWalletAdds) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white w-8">{count}</span>
                </div>
              </div>
            ))}

            {analytics.totalWalletAdds === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">No source data yet</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Customer QR scans will appear here</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">🕐</span>
            Recent Wallet Activity
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {analytics.recentWalletAdds.map((event, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 gap-2 sm:gap-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">
                      {event.walletType === 'apple' ? '🍎' : '📱'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      Customer added {event.walletType} wallet card
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      From: {event.source || 'direct'} • Customer: {event.customerId}
                    </div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 pl-13 sm:pl-0">
                  {new Date(event.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}

            {analytics.recentWalletAdds.length === 0 && (
              <div className="text-center py-6 sm:py-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl">🕐</span>
                </div>
                <div className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">No recent activity</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Activity will appear when customers add cards to their wallets</div>
              </div>
            )}
          </div>
        </div>

        {/* Tips and Insights */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
            <span className="mr-2">💡</span>
            Wallet Optimization Tips
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2 sm:space-y-3 text-sm text-blue-700 dark:text-blue-300">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Higher wallet adoption rates indicate stronger customer engagement</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Apple Wallet cards show at lock screen when customers are near your location</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Google Wallet cards can send push notifications for special offers</span>
              </div>
            </div>
            <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Customers with wallet cards visit 3x more frequently than email-only customers</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Encourage wallet adoption at checkout: "Add this to your phone for easy access!"</span>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={loadWalletAnalytics}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default WalletAnalytics