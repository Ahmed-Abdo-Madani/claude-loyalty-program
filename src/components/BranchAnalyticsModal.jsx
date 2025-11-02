import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'

const BranchAnalyticsModal = ({ isOpen, onClose, branch }) => {
  const { t } = useTranslation('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  // Currency formatter matching BranchCard
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount || 0)
  }

  useEffect(() => {
    if (isOpen && branch?.public_id) {
      fetchAnalytics()
    }
  }, [isOpen, branch?.public_id, selectedPeriod])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await secureApi.get(
        `${endpoints.getBranchAnalytics(branch.public_id)}?period=${selectedPeriod}`
      )
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data)
      } else {
        throw new Error(data.message || 'Failed to fetch analytics')
      }
    } catch (err) {
      console.error('❌ Failed to fetch branch analytics:', err)
      setError(err.message || t('branches.analytics.error'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-analytics-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h2 id="branch-analytics-title" className="text-xl font-bold text-gray-900 dark:text-white">
                {t('branches.analytics.title')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {branch.name} {branch.address && `- ${branch.address}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Period Selector */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {['7d', '30d', '90d', 'all'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t(`offers.analytics.period.${period}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t('branches.analytics.loading')}</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {!loading && !error && analytics && (
            <>
              {/* Overview Metrics */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('common.overview')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricCard
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                    label={t('branches.analytics.totalCustomers')}
                    value={analytics.overview?.totalCustomers || 0}
                    color="blue"
                  />
                  <MetricCard
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    }
                    label={t('branches.analytics.activeCustomers')}
                    value={analytics.overview?.activeCustomers || 0}
                    color="green"
                  />
                  <MetricCard
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    }
                    label={t('branches.analytics.totalOffers')}
                    value={analytics.overview?.totalOffers || 0}
                    color="purple"
                  />
                  <MetricCard
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    }
                    label={t('branches.analytics.activeOffers')}
                    value={analytics.overview?.activeOffers || 0}
                    color="yellow"
                  />
                  <MetricCard
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    }
                    label={t('branches.analytics.totalScans')}
                    value={analytics.overview?.totalScans || 0}
                    color="pink"
                  />
                  <MetricCard
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    label={t('branches.analytics.monthlyRevenue')}
                    value={formatCurrency(analytics.overview?.monthlyRevenue)}
                    color="indigo"
                  />
                </div>
              </div>

              {/* Trends Section */}
              {analytics.trends && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('branches.analytics.trends')}
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                    {analytics.trends.signups && analytics.trends.signups.length > 0 ? (
                      <div className="space-y-6">
                        {/* Signups Chart */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('branches.analytics.signupsOverTime')}
                          </h4>
                          <div className="h-48">
                            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                              {/* Grid lines */}
                              <line x1="0" y1="0" x2="400" y2="0" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" />
                              <line x1="0" y1="50" x2="400" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" strokeDasharray="2,2" />
                              <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" strokeDasharray="2,2" />
                              <line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" />
                              
                              {/* Line path */}
                              <polyline
                                points={analytics.trends.signups.map((value, i) => {
                                  const maxValue = Math.max(...analytics.trends.signups, 1)
                                  const x = (i / (analytics.trends.signups.length - 1)) * 400
                                  const y = 150 - (value / maxValue) * 150
                                  return `${x},${y}`
                                }).join(' ')}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                              />
                              
                              {/* Data points */}
                              {analytics.trends.signups.map((value, i) => {
                                const maxValue = Math.max(...analytics.trends.signups, 1)
                                const x = (i / (analytics.trends.signups.length - 1)) * 400
                                const y = 150 - (value / maxValue) * 150
                                return (
                                  <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />
                                )
                              })}
                            </svg>
                          </div>
                        </div>
                        
                        {/* Scans Chart */}
                        {analytics.trends.scans && analytics.trends.scans.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                              {t('branches.analytics.scansOverTime')}
                            </h4>
                            <div className="h-48">
                              <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                                {/* Grid lines */}
                                <line x1="0" y1="0" x2="400" y2="0" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" />
                                <line x1="0" y1="50" x2="400" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" strokeDasharray="2,2" />
                                <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" strokeDasharray="2,2" />
                                <line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" />
                                
                                {/* Line path */}
                                <polyline
                                  points={analytics.trends.scans.map((value, i) => {
                                    const maxValue = Math.max(...analytics.trends.scans, 1)
                                    const x = (i / (analytics.trends.scans.length - 1)) * 400
                                    const y = 150 - (value / maxValue) * 150
                                    return `${x},${y}`
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2"
                                />
                                
                                {/* Data points */}
                                {analytics.trends.scans.map((value, i) => {
                                  const maxValue = Math.max(...analytics.trends.scans, 1)
                                  const x = (i / (analytics.trends.scans.length - 1)) * 400
                                  const y = 150 - (value / maxValue) * 150
                                  return (
                                    <circle key={i} cx={x} cy={y} r="3" fill="#10b981" />
                                  )
                                })}
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-center">
                        {t('branches.analytics.noDataForPeriod')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Insights */}
              {analytics.customers && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('branches.analytics.customerInsights')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Customers */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        {t('branches.analytics.topCustomers')}
                      </h4>
                      {analytics.customers.topCustomers?.length > 0 ? (
                        <ul className="space-y-2">
                          {analytics.customers.topCustomers.map((customer, idx) => (
                            <li key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{customer.name}</span>
                              <span className="text-gray-500 dark:text-gray-400">{customer.visits} visits</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('branches.analytics.noData')}</p>
                      )}
                    </div>

                    {/* Recent Signups */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        {t('branches.analytics.recentSignups')}
                      </h4>
                      {analytics.customers.recentSignups?.length > 0 ? (
                        <ul className="space-y-2">
                          {analytics.customers.recentSignups.map((customer, idx) => (
                            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                              {customer.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('branches.analytics.noData')}</p>
                      )}
                    </div>

                    {/* Retention Rate */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 md:col-span-2">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {t('branches.analytics.retentionRate')}
                      </h4>
                      <p className="text-3xl font-bold text-primary">
                        {analytics.customers.retentionRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Offer Performance */}
              {analytics.offers && analytics.offers.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('branches.analytics.offerPerformance')}
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('branches.analytics.offerName')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('branches.analytics.signups')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('branches.analytics.activeCustomers')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('branches.analytics.completionRate')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {analytics.offers.map((offer, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{offer.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{offer.signups || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{offer.activeCustomers || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{offer.completionRate || 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Manager Activity */}
              {analytics.manager && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('branches.analytics.managerActivity')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {t('branches.analytics.managerScans')}
                      </h4>
                      <p className="text-3xl font-bold text-primary">{analytics.manager.totalScans || 0}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        {t('branches.analytics.recentActivity')}
                      </h4>
                      {analytics.manager.recentActivity?.length > 0 ? (
                        <ul className="space-y-1">
                          {analytics.manager.recentActivity.slice(0, 5).map((activity, idx) => (
                            <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                              {activity.description}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('branches.analytics.noData')}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !error && !analytics && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 mb-2">{t('branches.analytics.noData')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">{t('offers.analytics.noDataHelp')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// MetricCard Component
const MetricCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    pink: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default BranchAnalyticsModal
