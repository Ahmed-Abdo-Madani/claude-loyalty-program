import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'
import { secureApiRequest } from '../utils/secureAuth'
import WalletCard from './WalletCard'
import MonthlyChart from './MonthlyChart'

export default function POSAnalytics() {
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
  
  // State Management
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [branches, setBranches] = useState([])
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  
  // Load branches on mount
  useEffect(() => {
    loadBranches()
  }, [])
  
  // Load analytics when filters change
  useEffect(() => {
    if (selectedPeriod !== 'custom' || (customStartDate && customEndDate)) {
      loadAnalytics()
    }
  }, [selectedPeriod, selectedBranch, customStartDate, customEndDate])
  
  // Load branches for filter dropdown
  const loadBranches = async () => {
    try {
      const res = await secureApi.get(endpoints.myBranches)
      const data = await res.json()
      if (data.success) {
        setBranches(data.branches || [])
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
  
  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { startDate, endDate } = getDateRange()
      const queryParams = new URLSearchParams({
        startDate,
        endDate
      })
      
      if (selectedBranch) {
        queryParams.append('branchId', selectedBranch)
      }
      
      // Fetch analytics in parallel
      const [summaryRes, topProductsRes, trendsRes, paymentRes, categoryRes, hourlyRes] = await Promise.all([
        secureApi.get(`${endpoints.posAnalyticsSummary}?${queryParams}`),
        secureApi.get(`${endpoints.posAnalyticsTopProducts}?${queryParams}`),
        secureApi.get(`${endpoints.posAnalyticsTrends}?${queryParams}&granularity=daily`),
        secureApi.get(`${endpoints.posAnalyticsPaymentBreakdown}?${queryParams}`),
        secureApi.get(`${endpoints.posAnalyticsCategoryPerformance}?${queryParams}`),
        secureApi.get(`${endpoints.posAnalyticsHourlyDistribution}?${queryParams}`)
      ])
      
      // Parse responses with .json()
      const summaryData = await summaryRes.json()
      const topProductsData = await topProductsRes.json()
      const trendsData = await trendsRes.json()
      const paymentData = await paymentRes.json()
      const categoryData = await categoryRes.json()
      const hourlyData = await hourlyRes.json()
      
      setAnalytics({
        summary: summaryData.data?.summary || {},
        paymentBreakdown: paymentData.data?.breakdown || [],
        branchBreakdown: summaryData.data?.branchBreakdown || [],
        topProducts: topProductsData.data?.topProducts || [],
        trends: trendsData.data?.trends || [],
        loyaltyStats: summaryData.data?.loyaltyStats || {},
        categories: categoryData.data?.categories || [],
        hourlyDistribution: hourlyData.data?.hourlyDistribution || []
      })
      
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError(t('pos.analytics.error'))
    } finally {
      setLoading(false)
    }
  }
  
  // Handle export to CSV
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
      
      const response = await secureApiRequest(
        `${endpoints.posAnalyticsExport}?${queryParams}`,
        {
          method: 'GET'
        }
      )
      
      if (!response.ok) {
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
      
    } catch (error) {
      console.error('Failed to export analytics:', error)
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
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
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
      
      {/* Filters Section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Period Filter */}
        <div className="flex flex-wrap gap-2">
          {['7d', '30d', '90d', 'custom'].map(period => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`pos.analytics.period.${period}`)}
            </button>
          ))}
        </div>
        
        {/* Branch Filter (if multi-branch) */}
        {branches.length > 1 && (
          <select
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value || null)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('pos.analytics.filters.allBranches')}</option>
            {branches.map(branch => (
              <option key={branch.public_id} value={branch.public_id}>
                {i18n.language === 'ar' && branch.name_ar ? branch.name_ar : branch.name}
              </option>
            ))}
          </select>
        )}
        
        {/* Export Button */}
        <button
          onClick={handleExport}
          className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
        >
          <span>📊</span>
          {t('pos.analytics.export')}
        </button>
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
      
      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pos.analytics.filters.from')}
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pos.analytics.filters.to')}
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleApplyCustomDate}
              disabled={!customStartDate || !customEndDate}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('pos.analytics.filters.apply')}
            </button>
          </div>
        </div>
      )}
      
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <WalletCard
          title={t('pos.analytics.summary.totalSales')}
          value={formatNumber(analytics?.summary?.totalSales)}
          icon="💰"
          color="primary"
          trend={analytics?.summary?.salesGrowth}
        />
        <WalletCard
          title={t('pos.analytics.summary.totalRevenue')}
          value={`${formatCurrency(analytics?.summary?.totalRevenue)} ${t('common.sar')}`}
          icon="📈"
          color="green"
          trend={analytics?.summary?.revenueGrowth}
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
      
      {/* Category Performance */}
      {analytics?.categories && analytics.categories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">📂</span>
            {t('pos.analytics.categoryPerformance')}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {analytics.categories.map((category, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 dark:text-white block truncate">
                      {i18n.language === 'ar' && category.categoryNameAr ? category.categoryNameAr : category.categoryName}
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
            ))}
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
      
      {/* Branch Performance (if multi-branch) */}
      {branches.length > 1 && analytics?.branchBreakdown && analytics.branchBreakdown.length > 0 && !selectedBranch && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">🏪</span>
            {t('pos.analytics.branchPerformance')}
          </h3>
          <div className="space-y-3">
            {analytics.branchBreakdown.map((branch, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">
                  {i18n.language === 'ar' && branch.branchNameAr ? branch.branchNameAr : branch.branchName}
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
            ))}
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
