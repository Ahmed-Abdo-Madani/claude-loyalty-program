
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../config/api'
import WalletCard from '../WalletCard'
import MonthlyChart from '../MonthlyChart'
import { downloadCSV, convertToCSV } from '../../utils/exportCSV'

export default function MessagingAnalytics() {
    const { t, i18n } = useTranslation('admin')

    // State
    const [stats, setStats] = useState(null)
    const [responseTimes, setResponseTimes] = useState(null)
    const [trends, setTrends] = useState([])
    const [statusDistribution, setStatusDistribution] = useState([])
    const [activeBusinesses, setActiveBusinesses] = useState([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [dateRange, setDateRange] = useState('30d')
    const [exporting, setExporting] = useState(false)

    // Fetch data on mount and when dateRange changes
    useEffect(() => {
        fetchAnalytics()
    }, [dateRange])

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminAccessToken')
        const sessionToken = localStorage.getItem('adminSessionToken')
        return {
            'Authorization': `Bearer ${token}`,
            'X-Session-Token': sessionToken,
            'Content-Type': 'application/json'
        }
    }

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            setError(null)

            // Parallel fetch for all analytics endpoints
            const [
                statsRes,
                responseTimesRes,
                trendsRes,
                statusRes,
                businessesRes
            ] = await Promise.all([
                fetch(`${endpoints.baseURL}/api/admin/messages/analytics/stats`, { headers: getAuthHeaders() }),
                fetch(`${endpoints.baseURL}/api/admin/messages/analytics/response-times`, { headers: getAuthHeaders() }),
                fetch(`${endpoints.baseURL}/api/admin/messages/analytics/trends?period=${dateRange}`, { headers: getAuthHeaders() }),
                fetch(`${endpoints.baseURL}/api/admin/messages/analytics/status-distribution`, { headers: getAuthHeaders() }),
                fetch(`${endpoints.baseURL}/api/admin/messages/analytics/active-businesses?limit=10`, { headers: getAuthHeaders() })
            ])

            // Check for errors
            if (!statsRes.ok || !responseTimesRes.ok || !trendsRes.ok || !statusRes.ok || !businessesRes.ok) {
                throw new Error('Failed to fetch analytics data')
            }

            // Parse responses
            const statsData = await statsRes.json()
            const responseTimesData = await responseTimesRes.json()
            const trendsData = await trendsRes.json()
            const statusData = await statusRes.json()
            const businessesData = await businessesRes.json()

            setStats(statsData.data)
            setResponseTimes(responseTimesData.data)

            // Format trends for MonthlyChart
            // Expected format: [{ month: 'Jan 1', value: 10 }]
            const formattedTrends = trendsData.data.map(item => ({
                month: new Date(item.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
                value: item.conversations,
                messages: item.messages
            }))
            setTrends(formattedTrends)

            setStatusDistribution(statusData.data)
            setActiveBusinesses(businessesData.data)

        } catch (err) {
            console.error('Error fetching analytics:', err)
            setError(t('analytics.messaging.errorLoadingAnalytics'))
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async (format = 'csv') => {
        try {
            setExporting(true)
            const response = await fetch(
                `${endpoints.baseURL}/api/admin/messages/analytics/export?period=${dateRange}&format=${format}`,
                { headers: getAuthHeaders() }
            )

            if (!response.ok) throw new Error('Export failed')

            if (format === 'json' || format === 'csv') {
                // For CSV/JSON, we might get JSON data back and convert client-side or server sends file
                // Our backend now sends JSON for CSV request (frontend converts), but pipe for PDF
                // Let's adjust based on backend implementation: 
                // Backend: if format=pdf -> pipes PDF. If not -> returns JSON.

                const data = await response.json()
                if (data.success && data.data) {
                    const csvContent = convertToCSV(data.data)
                    downloadCSV(csvContent, `messaging_history_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`)
                }
            } else if (format === 'pdf') {
                // For PDF, backend pipes the file directly
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `messaging_report_${dateRange}.pdf`
                document.body.appendChild(a)
                a.click()
                a.remove()
                window.URL.revokeObjectURL(url)
            }

        } catch (err) {
            console.error('Export error:', err)
            alert(t('analytics.messaging.exportFailed'))
        } finally {
            setExporting(false)
        }
    }

    const formatDuration = (minutes) => {
        if (!minutes) return '0m'
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)

        if (hours > 0) {
            return `${hours}h ${mins}m`
        }
        return `${mins}m`
    }

    const formatNumber = (num) => {
        return new Intl.NumberFormat(i18n.language).format(num || 0)
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                    onClick={fetchAnalytics}
                    className="px-4 py-2 bg-white border border-red-200 rounded hover:bg-red-50 text-red-700"
                >
                    {t('analytics.messaging.retry')}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    <h2 className="text-lg font-bold text-gray-800">{t('analytics.messaging.title')}</h2>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm bg-gray-50 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="7d">{t('analytics.messaging.last7Days')}</option>
                        <option value="30d">{t('analytics.messaging.last30Days')}</option>
                        <option value="90d">{t('analytics.messaging.last90Days')}</option>
                    </select>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                            <span>{exporting ? '⏳' : '📥'}</span>
                            {t('analytics.messaging.exportHistory')}
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                        >
                            <span>📄</span>
                            PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <WalletCard
                    title={t('analytics.messaging.totalConversations')}
                    value={formatNumber(stats?.total_conversations)}
                    icon="💬"
                    color="blue"
                />
                <WalletCard
                    title={t('analytics.messaging.messagesToday')}
                    value={formatNumber(stats?.messages_today)}
                    icon="📨"
                    color="purple"
                />
                <WalletCard
                    title={t('analytics.messaging.averageResponseTime')}
                    value={formatDuration(responseTimes?.avg_first_response_time)}
                    icon="⏱️"
                    color="orange"
                />
                <WalletCard
                    title={t('analytics.messaging.averageResolutionTime') || 'Avg Resolution Time'} // Fallback text until translation added
                    value={formatDuration(responseTimes?.avg_resolution_time)}
                    icon="✅"
                    color="green"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversation Trends */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">{t('analytics.messaging.conversationVolume')}</h3>
                        <p className="text-sm text-gray-500">{t('analytics.messaging.conversationsCreated')}</p>
                    </div>
                    <div className="h-64">
                        {trends.length > 0 ? (
                            <MonthlyChart
                                data={trends.map(t => ({ month: t.month, value: t.value }))}
                                color="#8b5cf6" // purple-500
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                {t('analytics.messaging.noData')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Message Volume Trends */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">{t('analytics.messaging.messageVolume')}</h3>
                        <p className="text-sm text-gray-500">{t('analytics.messaging.messagesSent')}</p>
                    </div>
                    <div className="h-64">
                        {trends.length > 0 ? (
                            <MonthlyChart
                                data={trends.map(t => ({ month: t.month, value: t.messages }))}
                                color="#3b82f6" // blue-500
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                {t('analytics.messaging.noData')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Response Metrics & Active Businesses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Response Metrics Detail */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('analytics.messaging.averageResponseTime')}</h3>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">{t('analytics.messaging.firstResponseTime')}</span>
                            <span className="font-bold text-gray-900">{formatDuration(responseTimes?.avg_first_response_time)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">{t('analytics.messaging.overallResponseTime')}</span>
                            <span className="font-bold text-gray-900">{formatDuration(responseTimes?.avg_response_time)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                            <span className="text-green-700">{t('analytics.messaging.fastestResponse')}</span>
                            <span className="font-bold text-green-900">{formatDuration(responseTimes?.fastest_response)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                            <span className="text-red-700">{t('analytics.messaging.slowestResponse')}</span>
                            <span className="font-bold text-red-900">{formatDuration(responseTimes?.slowest_response)}</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">{t('analytics.messaging.statusDistribution')}</h4>
                        <div className="space-y-2">
                            {statusDistribution.map(status => (
                                <div key={status.status} className="flex flex-col">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="capitalize">{t(`analytics.messaging.${status.status}`)}</span>
                                        <span className="font-medium text-gray-900">{status.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${status.status === 'open' ? 'bg-green-500' :
                                                status.status === 'closed' ? 'bg-gray-500' : 'bg-yellow-500'
                                                }`}
                                            style={{ width: `${status.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Most Active Businesses */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">{t('analytics.messaging.mostActiveBusinesses')}</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('analytics.messaging.businessName')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('analytics.messaging.totalMessages')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('analytics.messaging.totalConversations')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activeBusinesses.length > 0 ? (
                                    activeBusinesses.map((business, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold mr-3">
                                                        {business.business_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{business.business_name}</div>
                                                        <div className="text-xs text-gray-500">{business.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {formatNumber(business.message_count)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatNumber(business.conversation_count)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-10 text-center text-gray-500">
                                            {t('analytics.messaging.noData')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
