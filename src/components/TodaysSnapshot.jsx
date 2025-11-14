import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  CurrencyDollarIcon, 
  ShoppingCartIcon, 
  ChartBarIcon, 
  UsersIcon 
} from '@heroicons/react/24/outline'
import { secureApi, endpoints } from '../config/api'

function TodaysSnapshot() {
  const { t } = useTranslation('dashboard')
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    ordersCount: 0,
    averageOrderValue: 0,
    activeCustomers: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTodaysMetrics()
  }, [])

  const fetchTodaysMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      // NOTE: This endpoint doesn't exist yet in the backend
      // Using fallback data until /api/pos/sales/today is implemented
      // When implemented, this will fetch real-time POS data
      
      // Temporarily commenting out API call to prevent dashboard crash
      /*
      const response = await secureApi.get(`${endpoints.posSales}/today`)
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // If endpoint doesn't exist (404) or other error, use fallback silently
        console.warn('POS sales endpoint not available, using fallback data')
        setMetrics({
          totalSales: 0,
          ordersCount: 0,
          averageOrderValue: 0,
          activeCustomers: 0
        })
        setLoading(false)
        return
      }

      const data = await response.json()

      if (data.success) {
        // Coerce all metrics to numbers with NaN fallback to 0
        const totalSales = Number(data.data.totalSales)
        const ordersCount = Number(data.data.ordersCount)
        const averageOrderValue = Number(data.data.averageOrderValue)
        const activeCustomers = Number(data.data.activeCustomers)

        setMetrics({
          totalSales: Number.isNaN(totalSales) ? 0 : totalSales,
          ordersCount: Number.isNaN(ordersCount) ? 0 : ordersCount,
          averageOrderValue: Number.isNaN(averageOrderValue) ? 0 : averageOrderValue,
          activeCustomers: Number.isNaN(activeCustomers) ? 0 : activeCustomers
        })
      } else {
        throw new Error(data.message || 'Failed to fetch today\'s metrics')
      }
      */

      // Use fallback data for now
      console.info('TodaysSnapshot: Using placeholder data (endpoint not implemented yet)')
      setMetrics({
        totalSales: 0,
        ordersCount: 0,
        averageOrderValue: 0,
        activeCustomers: 0
      })
      
    } catch (err) {
      console.error('Error fetching today\'s metrics:', err)
      // Don't show error to user if endpoint doesn't exist yet
      // Just use fallback data silently
      setMetrics({
        totalSales: 0,
        ordersCount: 0,
        averageOrderValue: 0,
        activeCustomers: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const metricCards = [
    {
      id: 'total_sales',
      label: t('todaysSnapshot.totalSales'),
      value: `${metrics.totalSales.toFixed(2)} ${t('common.sar')}`,
      icon: <CurrencyDollarIcon className="w-6 h-6" />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'orders_count',
      label: t('todaysSnapshot.ordersCount'),
      value: metrics.ordersCount,
      icon: <ShoppingCartIcon className="w-6 h-6" />,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      id: 'avg_order_value',
      label: t('todaysSnapshot.averageOrderValue'),
      value: `${metrics.averageOrderValue.toFixed(2)} ${t('common.sar')}`,
      icon: <ChartBarIcon className="w-6 h-6" />,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      id: 'active_customers',
      label: t('todaysSnapshot.activeCustomers'),
      value: metrics.activeCustomers,
      icon: <UsersIcon className="w-6 h-6" />,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  ]

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {t('todaysSnapshot.title')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          {t('todaysSnapshot.title')}
        </h3>
        <button
          onClick={fetchTodaysMetrics}
          disabled={loading}
          className="text-sm text-primary hover:text-primary-dark disabled:opacity-50 transition-colors"
          aria-label={t('todaysSnapshot.refresh')}
        >
          {t('todaysSnapshot.refresh')}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{t('todaysSnapshot.error')}</p>
        </div>
      )}

      {/* Metrics Grid: 2x2 on mobile, 4 columns on tablet+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metricCards.map((metric) => (
          <div
            key={metric.id}
            className={`${metric.bgColor} ${metric.borderColor} border rounded-lg p-4 flex flex-col items-center text-center transition-all hover:shadow-md`}
          >
            {/* Icon */}
            <div className={`${metric.iconColor} mb-2`}>
              {metric.icon}
            </div>

            {/* Value */}
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {metric.value}
            </div>

            {/* Label */}
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* Today's Date Footer */}
      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        {t('todaysSnapshot.asOf')}: {new Date().toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </div>
  )
}

export default TodaysSnapshot
