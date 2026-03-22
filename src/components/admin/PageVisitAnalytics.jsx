import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../config/api'
import WalletCard from '../WalletCard'

export default function PageVisitAnalytics() {
    const { t, i18n } = useTranslation('admin')

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchStats()
    }, [])

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminAccessToken')
        const sessionToken = localStorage.getItem('adminSessionToken')
        return {
            'Authorization': `Bearer ${token}`,
            'X-Session-Token': sessionToken,
            'Content-Type': 'application/json'
        }
    }

    const fetchStats = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`${endpoints.baseURL}/api/admin/analytics/page-views`, {
                headers: getAuthHeaders()
            })

            if (!response.ok) {
                throw new Error('Failed to fetch page view stats')
            }

            const json = await response.json()
            setData(json.data)
        } catch (err) {
            console.error('Error fetching page view analytics:', err)
            setError(t('analytics.pageVisits.errorLoading'))
        } finally {
            setLoading(false)
        }
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
                    onClick={fetchStats}
                    className="px-4 py-2 bg-white border border-red-200 rounded hover:bg-red-50 text-red-700"
                >
                    {t('analytics.pageVisits.retry')}
                </button>
            </div>
        )
    }

    const landingPageVisits = data?.visits_per_page?.find(p => p.page_path === '/')?.visit_count || 0
    
    const dailyVisits = data?.daily_visits || []
    const maxCount = Math.max(...dailyVisits.map(d => d.count), 1)

    return (
        <div className="space-y-6">
            {/* Header bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🌐</span>
                    <h2 className="text-lg font-bold text-gray-800">{t('analytics.pageVisits.title')}</h2>
                </div>
                <button
                    onClick={fetchStats}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                >
                    <span>🔄</span>
                    {t('analytics.pageVisits.refresh')}
                </button>
            </div>

            {/* Summary cards row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <WalletCard
                    title={t('analytics.pageVisits.totalVisits')}
                    value={formatNumber(data?.total_visits)}
                    icon="👁️"
                    color="blue"
                />
                <WalletCard
                    title={t('analytics.pageVisits.uniqueSessions')}
                    value={formatNumber(data?.unique_sessions)}
                    icon="👤"
                    color="purple"
                />
                <WalletCard
                    title={t('analytics.pageVisits.landingPageVisits')}
                    value={formatNumber(landingPageVisits)}
                    icon="🏠"
                    color="green"
                />
                <WalletCard
                    title={t('analytics.pageVisits.bounceRate')}
                    value={`${data?.bounce_rate || 0}%`}
                    icon="📉"
                    color="orange"
                />
            </div>

            {/* Two-column row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Visits Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('analytics.pageVisits.dailyVisits')}</h3>
                    <div className="flex-1 mt-auto h-64">
                        {dailyVisits.length > 0 ? (
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {dailyVisits.map((d, i) => {
                                    const rectWidth = 100 / dailyVisits.length
                                    const heightPercent = (d.count / maxCount) * 100
                                    const scaledHeight = (heightPercent * 0.85) || 1
                                    const y = 85 - scaledHeight
                                    
                                    return (
                                        <g key={d.date}>
                                            <title>{t('analytics.pageVisits.dailyVisitsTooltip', { date: d.date, count: d.count })}</title>
                                            <rect
                                                x={i * rectWidth + (rectWidth * 0.1)}
                                                y={y}
                                                width={rectWidth * 0.8}
                                                height={scaledHeight}
                                                className="fill-purple-500 hover:fill-purple-600 transition-colors cursor-pointer"
                                                rx="1"
                                            />
                                            {(i === 0 || i === dailyVisits.length - 1 || i % 5 === 0) && (
                                                <text
                                                    x={(i * rectWidth) + (rectWidth / 2)}
                                                    y="95"
                                                    textAnchor="middle"
                                                    className="fill-gray-500 text-[3px]"
                                                >
                                                    {new Date(d.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                                                </text>
                                            )}
                                        </g>
                                    )
                                })}
                            </svg>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                {t('analytics.pageVisits.noData')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Visits per Page table */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('analytics.pageVisits.visitsPerPage')}</h3>
                    
                    {data?.visits_per_page?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <th className="pb-3">{t('analytics.pageVisits.page')}</th>
                                        <th className="pb-3">{t('analytics.pageVisits.path')}</th>
                                        <th className="pb-3 text-right">{t('analytics.pageVisits.visits')}</th>
                                        <th className="pb-3 w-1/3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.visits_per_page.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="py-3 pr-2 text-sm text-gray-900 font-medium whitespace-nowrap">{row.page_name}</td>
                                            <td className="py-3 px-2 text-xs text-gray-500 truncate max-w-[150px]">{row.page_path}</td>
                                            <td className="py-3 px-2 text-sm text-gray-900 text-right font-medium">{formatNumber(row.visit_count)}</td>
                                            <td className="py-3 pl-4">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-purple-500 h-2 rounded-full" 
                                                        style={{ width: `${data?.total_visits > 0 ? Math.max((row.visit_count / data.total_visits) * 100, 1) : 0}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400">
                            {t('analytics.pageVisits.noData')}
                        </div>
                    )}
                </div>
            </div>

            {/* Top User Journeys section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">{t('analytics.pageVisits.topJourneys')}</h3>
                    <p className="text-sm text-gray-500">{t('analytics.pageVisits.topJourneysSubtitle')}</p>
                </div>

                {data?.top_paths?.length > 0 ? (
                    <div className="space-y-3">
                        {data.top_paths.slice(0, 10).map((journey, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-medium truncate max-w-[200px]">
                                        {journey.referrer_path || t('analytics.pageVisits.direct')}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium truncate max-w-[200px]">
                                        {journey.page_path}
                                    </span>
                                </div>
                                <span className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap self-end sm:self-auto">
                                    {formatNumber(journey.count)} {t('analytics.pageVisits.visits')}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center text-gray-400">
                        {t('analytics.pageVisits.noData')}
                    </div>
                )}
            </div>
        </div>
    )
}
