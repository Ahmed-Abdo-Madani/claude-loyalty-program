import { useState, useEffect } from 'react'

function WalletAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWalletAnalytics()
  }, [])

  const loadWalletAnalytics = () => {
    // Load analytics from localStorage (demo purposes)
    const events = JSON.parse(localStorage.getItem('qr_analytics') || '[]')
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
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-2xl font-bold text-primary">{analytics.totalWalletAdds}</div>
          <div className="text-gray-600 text-sm">Wallet Cards Added</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">{analytics.walletConversionRate}%</div>
          <div className="text-gray-600 text-sm">Signup → Wallet Rate</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">{analytics.totalSignups}</div>
          <div className="text-gray-600 text-sm">Total Signups</div>
        </div>
      </div>

      {/* Wallet Type Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📱 Wallet Type Distribution</h3>
        <div className="space-y-3">
          {Object.entries(analytics.byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">
                  {type === 'apple' ? '🍎' : type === 'google' ? '📱' : '❓'}
                </span>
                <span className="capitalize">{type} Wallet</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      type === 'apple' ? 'bg-gray-800' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${(count / analytics.totalWalletAdds) * 100}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8">{count}</span>
              </div>
            </div>
          ))}

          {analytics.totalWalletAdds === 0 && (
            <div className="text-center py-4 text-gray-500">
              No wallet cards added yet. Share your QR codes to get started!
            </div>
          )}
        </div>
      </div>

      {/* Source Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Wallet Adds by Source</h3>
        <div className="space-y-3">
          {Object.entries(analytics.bySource).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">
                  {source === 'checkout' ? '🛒' :
                   source === 'table' ? '🪑' :
                   source === 'window' ? '🪟' :
                   source === 'social' ? '📱' : '🔗'}
                </span>
                <span className="capitalize">{source.replace(/([A-Z])/g, ' $1')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${(count / analytics.totalWalletAdds) * 100}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-8">{count}</span>
              </div>
            </div>
          ))}

          {analytics.totalWalletAdds === 0 && (
            <div className="text-center py-4 text-gray-500">
              No wallet data yet. Customer QR scans will appear here.
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🕐 Recent Wallet Activity</h3>
        <div className="space-y-3">
          {analytics.recentWalletAdds.map((event, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {event.walletType === 'apple' ? '🍎' : '📱'}
                </span>
                <div>
                  <div className="text-sm font-medium">
                    Customer added {event.walletType} wallet card
                  </div>
                  <div className="text-xs text-gray-500">
                    From: {event.source || 'direct'} • Customer: {event.customerId}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}

          {analytics.recentWalletAdds.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No recent wallet activity. Activity will appear here when customers add cards to their wallets.
            </div>
          )}
        </div>
      </div>

      {/* Tips and Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-800 mb-3">💡 Wallet Optimization Tips</h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• Higher wallet adoption rates indicate stronger customer engagement</li>
          <li>• Apple Wallet cards show at lock screen when customers are near your location</li>
          <li>• Google Wallet cards can send push notifications for special offers</li>
          <li>• Customers with wallet cards visit 3x more frequently than email-only customers</li>
          <li>• Encourage wallet adoption at checkout: "Add this to your phone for easy access!"</li>
        </ul>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadWalletAnalytics}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          🔄 Refresh Analytics
        </button>
      </div>
    </div>
  )
}

export default WalletAnalytics