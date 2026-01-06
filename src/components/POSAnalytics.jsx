import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'
import { secureApiRequest } from '../utils/secureAuth'
import WalletCard from './WalletCard'
import MonthlyChart from './MonthlyChart'

export default function POSAnalytics({ demoData }) {
  const { t, i18n } = useTranslation('dashboard')

  // Currency formatter for SAR
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  // Number formatter
  const formatNumber = (number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US').format(number || 0)
  }

  // Percentage formatter
  const formatPercentage = (percentage) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(percentage || 0)
  }

  // Parse growth string to numeric value (e.g., "+5.0%" -> 5.0)
  const parseGrowthString = (growthValue) => {
    // Handle edge cases
    if (growthValue === null || growthValue === undefined || growthValue === '') {
      return null
    }

    // If already numeric, return as-is
    if (typeof growthValue === 'number') {
      return growthValue
    }

    // Extract numeric portion from string (e.g., "+5.0%" -> "5.0")
    const match = String(growthValue).match(/([+-]?\d+\.?\d*)/)
    if (match && match[1]) {
      const numericValue = parseFloat(match[1])
      return isNaN(numericValue) ? null : numericValue
    }

    return null
  }

  // Mapping demo data to state if provided
  const initialAnalytics = demoData ? {
    summary: {
      totalSales: demoData.dailySales.reduce((acc, curr) => acc + curr.total, 0),
      totalRevenue: demoData.dailySales.reduce((acc, curr) => acc + curr.total, 0) * 0.95,
      avgTransaction: 45.50,
      totalTax: demoData.dailySales.reduce((acc, curr) => acc + curr.total, 0) * 0.15,
      salesGrowth: '+12.5%',
      revenueGrowth: '+10.2%'
    },
    paymentBreakdown: [
      { method: 'Cash', amount: 450, percentage: 30 },
      { method: 'Card', amount: 1050, percentage: 70 }
    ],
    trends: demoData.dailySales.map(item => ({ date: item.date, sales: item.total })),
    topProducts: [
      { name: 'Demo Product 1', quantity: 45, revenue: 900 },
      { name: 'Demo Product 2', quantity: 30, revenue: 600 }
    ],
    categories: [
      { name: 'Category 1', amount: 1000, percentage: 66 },
      { name: 'Category 2', amount: 500, percentage: 33 }
    ],
    hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: Math.floor(Math.random() * 20) }))
  } : null

  // State Management
  const [analytics, setAnalytics] = useState(initialAnalytics)
  const [loading, setLoading] = useState(!demoData)
  const [error, setError] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [branches, setBranches] = useState([])
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)
  const [failedEndpoints, setFailedEndpoints] = useState([])
  const [loadingProgress, setLoadingProgress] = useState('')

  // Load branches on mount
  useEffect(() => {
    loadBranches()
  }, [])

  // Load analytics when filters change
  useEffect(() => {
    if (!demoData && (selectedPeriod !== 'custom' || (customStartDate && customEndDate))) {
      loadAnalytics()
    }
  }, [selectedPeriod, selectedBranch, customStartDate, customEndDate, demoData])

  // Load branches for filter dropdown
  const loadBranches = async () => {
    try {
      const res = await secureApi.get(endpoints.myBranches)
      const data = await res.json()
      if (data.success) {
        console.log('Branches loaded:', data.data?.length || 0)
        setBranches(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load branches:', error)
    }
  }

  // Calculate date range based on selected period
  const getDateRange = () => {
    const end = new Date()
    let start = new Date()

    if (selectedPeriod === 'custom') {
      return {
        startDate: customStartDate,
        endDate: customEndDate
      }
    }

    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    }[selectedPeriod] || 30

    start.setDate(start.getDate() - days)

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }
  }

  // Load analytics data with enhanced error handling and debugging
  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      setFailedEndpoints([])
      setIsEmpty(false)

      const { startDate, endDate } = getDateRange()
      const queryParams = new URLSearchParams({
        startDate,
        endDate
      })

      if (selectedBranch) {
        queryParams.append('branchId', selectedBranch)
      }

      console.log('📊 Loading POS Analytics with params:', {
        startDate,
        endDate,
        branchId: selectedBranch || 'all'
      })

      // Fetch analytics with individual error handling for graceful degradation
      const failed = []
      let summaryData = null
      let topProductsData = null
      let trendsData = null
      let paymentData = null
      let categoryData = null
      let hourlyData = null

      // 1. Sales Summary
      try {
        setLoadingProgress('Loading sales summary...')
        console.log('🔄 Fetching sales summary:', `${endpoints.posAnalyticsSummary}?${queryParams}`)
        const summaryRes = await secureApi.get(`${endpoints.posAnalyticsSummary}?${queryParams}`)

        // Check HTTP status
        if (!summaryRes.ok) {
          const errorText = await summaryRes.text()
          throw new Error(`HTTP ${summaryRes.status}: ${errorText || summaryRes.statusText}`)
        }

        summaryData = await summaryRes.json()

        // Check backend success flag
        if (summaryData.success === false) {
          throw new Error(summaryData.error || 'Request failed')
        }

        console.log('✅ Sales summary loaded:', summaryData.data?.summary)

        // Log diagnostics if zero sales found
        if (summaryData.data?.summary?.totalSales === 0) {
          console.warn('⚠️  No sales found. Full response:', summaryData)
          if (summaryData.diagnostics) {
            console.warn('⚠️  Backend diagnostics:', summaryData.diagnostics)
            console.warn('📅 Date range queried:', summaryData.diagnostics.dateRange)
            console.warn('💡 Suggestion:', summaryData.diagnostics.suggestion)
          }
        }

        // Validate response structure
        if (!summaryData.data || !summaryData.data.summary) {
          console.warn('⚠️  Sales summary response missing expected structure:', summaryData)
        }
      } catch (err) {
        console.error('❌ Failed to load sales summary:', err)
        failed.push({ endpoint: 'sales summary', error: err.message })
      }

      // 2. Top Products
      try {
        setLoadingProgress('Loading top products...')
        console.log('🔄 Fetching top products:', `${endpoints.posAnalyticsTopProducts}?${queryParams}`)
        const topProductsRes = await secureApi.get(`${endpoints.posAnalyticsTopProducts}?${queryParams}`)

        if (!topProductsRes.ok) {
          const errorText = await topProductsRes.text()
          throw new Error(`HTTP ${topProductsRes.status}: ${errorText || topProductsRes.statusText}`)
        }

        topProductsData = await topProductsRes.json()

        if (topProductsData.success === false) {
          throw new Error(topProductsData.error || 'Request failed')
        }

        console.log('✅ Top products loaded:', topProductsData.data?.topProducts?.length, 'products')

        if (!topProductsData.data || !Array.isArray(topProductsData.data.topProducts)) {
          console.warn('⚠️  Top products response missing expected structure:', topProductsData)
        }
      } catch (err) {
        console.error('❌ Failed to load top products:', err)
        failed.push({ endpoint: 'top products', error: err.message })
      }

      // 3. Sales Trends
      try {
        setLoadingProgress('Loading sales trends...')
        console.log('🔄 Fetching sales trends:', `${endpoints.posAnalyticsTrends}?${queryParams}&granularity=daily`)
        const trendsRes = await secureApi.get(`${endpoints.posAnalyticsTrends}?${queryParams}&granularity=daily`)

        if (!trendsRes.ok) {
          const errorText = await trendsRes.text()
          throw new Error(`HTTP ${trendsRes.status}: ${errorText || trendsRes.statusText}`)
        }

        trendsData = await trendsRes.json()

        if (trendsData.success === false) {
          throw new Error(trendsData.error || 'Request failed')
        }

        console.log('✅ Sales trends loaded:', trendsData.data?.trends?.length, 'data points')

        if (!trendsData.data || !Array.isArray(trendsData.data.trends)) {
          console.warn('⚠️  Sales trends response missing expected structure:', trendsData)
        }
      } catch (err) {
        console.error('❌ Failed to load sales trends:', err)
        failed.push({ endpoint: 'sales trends', error: err.message })
      }

      // 4. Payment Breakdown
      try {
        setLoadingProgress('Loading payment breakdown...')
        console.log('🔄 Fetching payment breakdown:', `${endpoints.posAnalyticsPaymentBreakdown}?${queryParams}`)
        const paymentRes = await secureApi.get(`${endpoints.posAnalyticsPaymentBreakdown}?${queryParams}`)

        if (!paymentRes.ok) {
          const errorText = await paymentRes.text()
          throw new Error(`HTTP ${paymentRes.status}: ${errorText || paymentRes.statusText}`)
        }

        paymentData = await paymentRes.json()

        if (paymentData.success === false) {
          throw new Error(paymentData.error || 'Request failed')
        }

        console.log('✅ Payment breakdown loaded:', paymentData.data?.breakdown?.length, 'payment methods')

        if (!paymentData.data || !Array.isArray(paymentData.data.breakdown)) {
          console.warn('⚠️  Payment breakdown response missing expected structure:', paymentData)
        }
      } catch (err) {
        console.error('❌ Failed to load payment breakdown:', err)
        failed.push({ endpoint: 'payment breakdown', error: err.message })
      }

      // 5. Category Performance
      try {
        setLoadingProgress('Loading category performance...')
        console.log('🔄 Fetching category performance:', `${endpoints.posAnalyticsCategoryPerformance}?${queryParams}`)
        const categoryRes = await secureApi.get(`${endpoints.posAnalyticsCategoryPerformance}?${queryParams}`)

        if (!categoryRes.ok) {
          const errorText = await categoryRes.text()
          throw new Error(`HTTP ${categoryRes.status}: ${errorText || categoryRes.statusText}`)
        }

        categoryData = await categoryRes.json()

        if (categoryData.success === false) {
          throw new Error(categoryData.error || 'Request failed')
        }

        console.log('✅ Category performance loaded:', categoryData.data?.categories?.length, 'categories')

        if (!categoryData.data || !Array.isArray(categoryData.data.categories)) {
          console.warn('⚠️  Category performance response missing expected structure:', categoryData)
        }
      } catch (err) {
        console.error('❌ Failed to load category performance:', err)
        failed.push({ endpoint: 'category performance', error: err.message })
      }

      // 6. Hourly Distribution
      try {
        setLoadingProgress('Loading hourly distribution...')
        console.log('🔄 Fetching hourly distribution:', `${endpoints.posAnalyticsHourlyDistribution}?${queryParams}`)
        const hourlyRes = await secureApi.get(`${endpoints.posAnalyticsHourlyDistribution}?${queryParams}`)

        if (!hourlyRes.ok) {
          const errorText = await hourlyRes.text()
          throw new Error(`HTTP ${hourlyRes.status}: ${errorText || hourlyRes.statusText}`)
        }

        hourlyData = await hourlyRes.json()

        if (hourlyData.success === false) {
          throw new Error(hourlyData.error || 'Request failed')
        }

        console.log('✅ Hourly distribution loaded:', hourlyData.data?.hourlyDistribution?.length, 'hours')

        if (!hourlyData.data || !Array.isArray(hourlyData.data.hourlyDistribution)) {
          console.warn('⚠️  Hourly distribution response missing expected structure:', hourlyData)
        }
      } catch (err) {
        console.error('❌ Failed to load hourly distribution:', err)
        failed.push({ endpoint: 'hourly distribution', error: err.message })
      }

      // Set failed endpoints for display
      if (failed.length > 0) {
        console.warn('⚠️  Some analytics endpoints failed:', failed)
        setFailedEndpoints(failed)
      }

      // Build analytics object with available data
      const analyticsData = {
        summary: summaryData?.data?.summary || {},
        paymentBreakdown: paymentData?.data?.breakdown || [],
        branchBreakdown: summaryData?.data?.branchBreakdown || [],
        topProducts: topProductsData?.data?.topProducts || [],
        trends: trendsData?.data?.trends || [],
        loyaltyStats: summaryData?.data?.loyaltyStats || {},
        categories: categoryData?.data?.categories || [],
        hourlyDistribution: hourlyData?.data?.hourlyDistribution || []
      }

      setAnalytics(analyticsData)

      // If all endpoints failed, show error instead of empty state
      if (failed.length === 6) {
        console.error('❌ All analytics endpoints failed')
        setError(t('pos.analytics.error') || 'Failed to load analytics')
        return
      }

      // Check if data is empty (all arrays empty and summary has no sales)
      const hasNoData = (
        (!analyticsData.summary.totalSales || analyticsData.summary.totalSales === 0) &&
        analyticsData.topProducts.length === 0 &&
        analyticsData.trends.length === 0 &&
        analyticsData.categories.length === 0
      )

      if (hasNoData && failed.length === 0) {
        console.log('ℹ️  No sales data found for the selected period')
        setIsEmpty(true)
      }

      console.log('✅ Analytics loading complete:', {
        totalSales: analyticsData.summary.totalSales || 0,
        topProductsCount: analyticsData.topProducts.length,
        trendsCount: analyticsData.trends.length,
        isEmpty: hasNoData,
        failedEndpoints: failed.length
      })

    } catch (err) {
      console.error('❌ Critical error loading analytics:', err)
      setError(t('pos.analytics.error'))
    } finally {
      setLoading(false)
      setLoadingProgress('')
    }
  }

  // Handle export to CSV with enhanced logging
  const handleExport = async () => {
    try {
      setExportError(null)
      const { startDate, endDate } = getDateRange()
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        format: 'csv'
      })

      if (selectedBranch) {
        queryParams.append('branchId', selectedBranch)
      }

      console.log('📥 Exporting analytics to CSV:', {
        startDate,
        endDate,
        branchId: selectedBranch || 'all'
      })

      const response = await secureApiRequest(
        `${endpoints.posAnalyticsExport}?${queryParams}`,
        {
          method: 'GET'
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Export failed with status:', response.status, errorText)
        throw new Error(t('pos.analytics.exportFailed'))
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pos-analytics-${startDate}-to-${endDate}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log('✅ Analytics exported successfully')

    } catch (error) {
      console.error('❌ Failed to export analytics:', {
        error: error.message,
        stack: error.stack
      })
      setExportError(error.message || t('pos.analytics.exportFailed'))
      // Clear error after 5 seconds
      setTimeout(() => setExportError(null), 5000)
    }
  }

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period)
    if (period === 'custom') {
      setShowCustomDatePicker(true)
    } else {
      setShowCustomDatePicker(false)
    }
  }

  // Handle custom date application
  const handleApplyCustomDate = () => {
    if (customStartDate && customEndDate) {
      setShowCustomDatePicker(false)
      loadAnalytics()
    }
  }

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('pos.analytics.loading')}</p>
          {loadingProgress && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">{loadingProgress}</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400 mb-4 font-semibold">{error}</p>
          {failedEndpoints.length > 0 && (
            <details className="mb-4 text-left bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Show Error Details
              </summary>
              <div className="text-xs text-red-600 dark:text-red-400 space-y-2">
                {failedEndpoints.map((failed, idx) => (
                  <div key={idx} className="border-l-2 border-red-400 pl-2">
                    <strong>{failed.endpoint}:</strong> {failed.error}
                  </div>
                ))}
              </div>
            </details>
          )}
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            {t('pos.analytics.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    const { startDate, endDate } = getDateRange()

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-2xl px-4">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('pos.analytics.noData.title') || 'No Sales Data Yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('pos.analytics.noData.message') || 'There are no sales recorded for the selected period. Start making sales to see analytics here.'}
          </p>

          {/* Date Range Display */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>{t('pos.analytics.empty.rangeLabel')}</strong>
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {new Date(startDate).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {' → '}
              {new Date(endDate).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              ({t(`pos.analytics.period.${selectedPeriod}`)})
            </p>
          </div>

          {/* Helpful Suggestions */}
          <div className="text-left bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              {t('pos.analytics.empty.suggestionsTitle')}
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>{t('pos.analytics.empty.suggestions.changeDateRange')}</li>
              <li>{t('pos.analytics.empty.suggestions.createSales')}</li>
              <li>{t('pos.analytics.empty.suggestions.checkStatus')}</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {t('common.retry')}
            </button>
            {selectedPeriod !== '90d' && (
              <button
                onClick={() => {
                  setSelectedPeriod('90d')
                  setShowCustomDatePicker(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('pos.analytics.empty.tryLast90Days')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t('pos.analytics.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          {t('pos.analytics.subtitle')}
        </p>
      </div>

      {/* Inline Loading Progress (for refreshes) */}
      {loading && analytics && loadingProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">{loadingProgress}</span>
        </div>
      )}

      {/* Failed Endpoints Warning Banner */}
      {failedEndpoints.length > 0 && !error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Some analytics failed to load
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                <p className="mb-2">The following sections could not be loaded:</p>
                <ul className="list-disc list-inside space-y-1">
                  {failedEndpoints.map((failed, idx) => (
                    <li key={idx}>
                      <strong>{failed.endpoint}:</strong> {failed.error}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <button
                  onClick={loadAnalytics}
                  className="text-sm font-medium text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 underline"
                >
                  Retry loading analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>📊</span>
          {t('pos.analytics.filters.filtersHeader')}
        </h3>

        {/* Period Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('pos.analytics.filters.timePeriod')}
          </label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {['7d', '30d', '90d', 'custom'].map(period => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${selectedPeriod === period
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {t(`pos.analytics.period.${period}`)}
              </button>
            ))}
          </div>

          {/* Inline Custom Date Picker */}
          {selectedPeriod === 'custom' && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('pos.analytics.filters.from')}
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('pos.analytics.filters.to')}
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 flex justify-end">
                  <button
                    onClick={handleApplyCustomDate}
                    disabled={!customStartDate || !customEndDate}
                    className="px-6 py-2 min-h-[44px] bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('pos.analytics.filters.apply')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Branch Filter */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span>🏪</span>
            <span>{t('pos.analytics.filters.branchFilter')}</span>
          </label>
          <select
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value || null)}
            disabled={branches.length === 0}
            className="w-full sm:w-1/2 lg:w-1/3 px-4 py-3 min-h-[44px] text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {branches.length === 0 ? (
              <option value="">{t('pos.analytics.filters.noBranches')}</option>
            ) : (
              <>
                <option value="">{t('pos.analytics.filters.allBranches')}</option>
                {branches.map(branch => (
                  <option key={branch.public_id} value={branch.public_id}>
                    {i18n.language === 'ar' && branch.name_ar ? branch.name_ar : branch.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Export Error Message */}
      {exportError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {exportError}
              </p>
            </div>
            <button
              onClick={() => setExportError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Export Action Bar */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleExport}
          className="px-6 py-3 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <span>📊</span>
          {t('pos.analytics.export')}
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <WalletCard
          title={t('pos.analytics.summary.totalSales')}
          value={formatNumber(analytics?.summary?.totalSales)}
          icon="💰"
          color="primary"
          trend={parseGrowthString(analytics?.summary?.salesGrowth)}
        />
        <WalletCard
          title={t('pos.analytics.summary.totalRevenue')}
          value={`${formatCurrency(analytics?.summary?.totalRevenue)} ${t('common.sar')}`}
          icon="📈"
          color="green"
          trend={parseGrowthString(analytics?.summary?.revenueGrowth)}
        />
        <WalletCard
          title={t('pos.analytics.summary.avgTransaction')}
          value={`${formatCurrency(analytics?.summary?.avgTransaction)} ${t('common.sar')}`}
          icon="🧾"
          color="blue"
        />
        <WalletCard
          title={t('pos.analytics.summary.taxCollected')}
          value={`${formatCurrency(analytics?.summary?.totalTax)} ${t('common.sar')}`}
          icon="🏛️"
          color="purple"
        />
      </div>

      {/* Payment Method Breakdown */}
      {analytics?.paymentBreakdown && analytics.paymentBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">💳</span>
            {t('pos.analytics.paymentBreakdown')}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {analytics.paymentBreakdown.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">
                      {payment.paymentMethod === 'cash' ? '💵' : payment.paymentMethod === 'card' ? '💳' : payment.paymentMethod === 'gift_offer' ? '🎁' : '🔄'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 dark:text-white capitalize block truncate">
                      {t(`pos.analytics.paymentMethods.${payment.paymentMethod}`)}
                    </span>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatNumber(payment.count)} {t('pos.analytics.transactions')} • {formatPercentage(payment.percentage)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2 hidden sm:block">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${payment.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(payment.total)} {t('common.sar')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Selling Products */}
      {analytics?.topProducts && analytics.topProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">🏆</span>
            {t('pos.analytics.topProducts')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('pos.analytics.product')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('pos.analytics.quantity')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('pos.analytics.revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.topProducts.map((product, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {i18n.language === 'ar' && product.productNameAr ? product.productNameAr : product.productName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(product.totalQuantity)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(product.totalRevenue)} {t('common.sar')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Performance - Hidden for debugging */}
      {false && analytics?.categories && analytics.categories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">📂</span>
            {t('pos.analytics.categoryPerformance')}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {analytics.categories.map((category, idx) => {
              const isUncategorized = category.categoryId === 'uncategorized' || category.categoryId === null
              return (
                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl ${isUncategorized ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{isUncategorized ? '⚠️' : '📦'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 dark:text-white block truncate flex items-center gap-2">
                        {i18n.language === 'ar' && category.categoryNameAr ? category.categoryNameAr : category.categoryName}
                        {isUncategorized && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400" title={t('products.card.noCategory')}>
                            ({t('products.card.noCategory')})
                          </span>
                        )}
                      </span>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatNumber(category.totalQuantity)} {t('pos.analytics.items')} • {formatPercentage(category.percentage)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2 hidden sm:block">
                      <div
                        className="h-2 rounded-full bg-green-600 transition-all duration-300"
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(category.totalRevenue)} {t('common.sar')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sales Trends Chart */}
      {analytics?.trends && analytics.trends.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">📊</span>
            {t('pos.analytics.salesTrends')}
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <MonthlyChart
              dataSeries={analytics.trends.map(trend => {
                const trendDate = new Date(trend.period)
                const label = trendDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                  month: 'short',
                  day: 'numeric'
                })
                return {
                  month: label,
                  value: parseFloat(trend.totalRevenue) || 0,
                  growth: true // Calculate growth based on previous period if needed
                }
              })}
            />
          </div>
        </div>
      )}

      {/* Hourly Distribution Chart */}
      {analytics?.hourlyDistribution && analytics.hourlyDistribution.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">🕒</span>
            {t('pos.analytics.hourlyDistribution')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('pos.analytics.hourlyDistributionSubtitle')}
          </p>
          <div className="relative">
            <div className="flex items-end justify-between h-48 gap-1">
              {analytics.hourlyDistribution.map((data, idx) => {
                const maxRevenue = Math.max(...analytics.hourlyDistribution.map(d => d.totalRevenue), 1)
                const height = (data.totalRevenue / maxRevenue) * 100

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group">
                    {/* Bar */}
                    <div className="w-full max-w-8 flex items-end justify-center mb-2 relative">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-300 hover:from-indigo-700 hover:to-indigo-500 cursor-pointer"
                        style={{ height: `${height}%` }}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            <div className="font-semibold">{data.hour}:00</div>
                            <div>{formatNumber(data.salesCount)} {t('pos.analytics.sales')}</div>
                            <div>{formatCurrency(data.totalRevenue)} {t('common.sar')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hour Label */}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {data.hour}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Peak hours indicator */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="inline-block w-3 h-3 rounded bg-indigo-600"></span>
                <span>{t('pos.analytics.peakHoursIndicator')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branch Comparison Section */}
      {!selectedBranch && branches.length > 1 && analytics?.branchBreakdown?.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>🏪</span>
                  {t('pos.analytics.filters.branchComparison')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('pos.analytics.branchComparisonSubtitle')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.branchBreakdown
                .sort((a, b) => b.total - a.total)
                .map((branch, index) => {
                  const isTopPerforming = index === 0
                  const totalRevenue = analytics.summary?.totalRevenue || 0
                  const contribution = totalRevenue > 0 ? (branch.total / totalRevenue) * 100 : 0

                  return (
                    <div
                      key={branch.branchId}
                      onClick={() => setSelectedBranch(branch.branchId)}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${isTopPerforming
                        ? 'border-2 border-green-500 dark:border-green-400'
                        : 'border border-gray-200 dark:border-gray-700'
                        }`}
                    >
                      {isTopPerforming && (
                        <div className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 mb-2">
                          <span>⭐</span>
                          <span>{t('pos.analytics.filters.topPerforming')}</span>
                        </div>
                      )}

                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">
                        {i18n.language === 'ar' && branch.branchNameAr ? branch.branchNameAr : branch.branchName}
                      </h4>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('pos.analytics.summary.totalSales')}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatNumber(branch.count)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('pos.analytics.summary.totalRevenue')}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(branch.total)} {t('common.sar')}
                          </span>
                        </div>
                      </div>

                      {/* Contribution Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <span>{formatPercentage(contribution)}% {t('pos.analytics.filters.contributionToTotal')}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${contribution}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-blue-600 dark:text-blue-400 text-center mt-2">
                        {t('pos.analytics.filters.clickToFilter')}
                      </p>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Branch Performance (always show when branch breakdown exists) */}
      {branches.length > 1 && analytics?.branchBreakdown && analytics.branchBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">🏪</span>
            {t('pos.analytics.branchPerformance')}
          </h3>
          <div className="space-y-3">
            {analytics.branchBreakdown
              .sort((a, b) => b.total - a.total)
              .map((branch, idx) => {
                const isSelected = selectedBranch === branch.branchId
                const totalRevenue = analytics.summary?.totalRevenue || 0
                const contribution = totalRevenue > 0 ? (branch.total / totalRevenue) * 100 : 0

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg transition-all ${isSelected
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {i18n.language === 'ar' && branch.branchNameAr ? branch.branchNameAr : branch.branchName}
                        {isSelected && (
                          <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            Selected
                          </span>
                        )}
                      </span>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(branch.total)} {t('common.sar')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatNumber(branch.count)} {t('pos.analytics.sales')}
                        </div>
                      </div>
                    </div>

                    {/* Contribution Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>{formatPercentage(contribution)}% {t('pos.analytics.filters.contributionToTotal')}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isSelected ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-500'
                            }`}
                          style={{ width: `${contribution}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Insights & Tips Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6 mb-8">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
          <span className="mr-2">💡</span>
          {t('pos.analytics.insights')}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2 sm:space-y-3 text-sm text-blue-700 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{t('pos.analytics.tip1')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{t('pos.analytics.tip2')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{t('pos.analytics.tip3')}</span>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3 text-sm text-blue-700 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{t('pos.analytics.tip4')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{t('pos.analytics.tip5')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
