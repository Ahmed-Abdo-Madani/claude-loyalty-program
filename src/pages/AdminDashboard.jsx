import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../config/api'
import BusinessesTable from '../components/BusinessesTable'
import IconLibraryManager from '../components/IconLibraryManager'
import LanguageSwitcher from '../components/LanguageSwitcher'

function AdminDashboard() {
  const { t } = useTranslation('admin')
  const [activeTab, setActiveTab] = useState('overview')
  const [adminInfo, setAdminInfo] = useState(null)
  const [platformData, setPlatformData] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Check admin authentication
  useEffect(() => {
    const isAdminAuthenticated = localStorage.getItem('adminAuthenticated')
    const adminInfoStr = localStorage.getItem('adminInfo')

    if (!isAdminAuthenticated || !adminInfoStr) {
      navigate('/admin/login')
      return
    }

    try {
      const admin = JSON.parse(adminInfoStr)
      setAdminInfo(admin)
    } catch (error) {
      console.error('Error parsing admin info:', error)
      navigate('/admin/login')
    }
  }, [navigate])

  // Fetch platform data
  useEffect(() => {
    if (adminInfo) {
      fetchPlatformData()
    }
  }, [adminInfo])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminAccessToken')
    const sessionToken = localStorage.getItem('adminSessionToken')
    return {
      'Authorization': `Bearer ${token}`,
      'X-Session-Token': sessionToken,
      'Content-Type': 'application/json'
    }
  }

  const fetchPlatformData = async () => {
    try {
      setLoading(true)

      // Fetch overview analytics
      const overviewResponse = await fetch(`${endpoints.baseURL}/api/admin/analytics/overview`, {
        headers: getAuthHeaders()
      })

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json()
        setAnalytics(overviewData.data.overview)
      }

      // Fetch businesses
      const businessResponse = await fetch(`${endpoints.baseURL}/api/admin/businesses?limit=10`, {
        headers: getAuthHeaders()
      })

      if (businessResponse.ok) {
        const businessData = await businessResponse.json()
        setBusinesses(businessData.data.businesses)
      }

    } catch (error) {
      console.error('Error fetching platform data:', error)
      setError(t('dashboard.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('adminAuthenticated')
    localStorage.removeItem('adminAccessToken')
    localStorage.removeItem('adminSessionToken')
    localStorage.removeItem('adminInfo')
    navigate('/admin/login')
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num)
  }

  if (!adminInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">👑</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('dashboard.title')}</h1>
                <p className="text-sm text-gray-500">{t('dashboard.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher variant="button" showLabels={false} className="" />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{adminInfo.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{adminInfo.role.replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('dashboard.signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {[
              { id: 'overview', name: t('tabs.overview'), icon: '📊' },
              { id: 'businesses', name: t('tabs.businesses'), icon: '🏢' },
              { id: 'analytics', name: t('tabs.analytics'), icon: '📈' },
              { id: 'settings', name: t('tabs.settings'), icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('dashboard.loadingPlatformData')}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('overview.title')}</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-blue-600 text-xl">🏢</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">{t('overview.totalBusinesses')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.total_businesses)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-green-600 text-xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">{t('overview.activeBusinesses')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.active_businesses)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-purple-600 text-xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">{t('overview.totalCustomers')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.total_customers)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <span className="text-orange-600 text-xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">{t('overview.totalRedemptions')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.total_redemptions)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('overview.quickActions')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
                  <div className="text-2xl mb-2">⏳</div>
                  <h4 className="font-medium text-gray-900">{t('overview.pendingApprovals')}</h4>
                  <p className="text-sm text-gray-500">{t('overview.businessesWaiting', { count: analytics.pending_businesses })}</p>
                </button>

                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-medium text-gray-900">{t('overview.analyticsReport')}</h4>
                  <p className="text-sm text-gray-500">{t('overview.generateMonthlyReport')}</p>
                </button>

                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
                  <div className="text-2xl mb-2">🔧</div>
                  <h4 className="font-medium text-gray-900">{t('overview.systemHealth')}</h4>
                  <p className="text-sm text-gray-500">{t('overview.monitorPlatformStatus')}</p>
                </button>
              </div>
            </div>

            {/* Recent Businesses */}
            {businesses.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('overview.recentBusinesses')}</h3>
                <div className="space-y-3">
                  {businesses.slice(0, 5).map((business) => (
                    <div key={business.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{business.business_name}</h4>
                        <p className="text-sm text-gray-500">{business.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          business.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : business.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {t(`businessManagement.statusBadge.${business.status}`)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <BusinessesTable />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('analytics.analyticsDashboard')}</h2>
            <p className="text-gray-600">
              {t('analytics.advancedAnalyticsComingSoon')}
            </p>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t('settings.platformSettings')}
            </h2>
            
            {/* Settings Sections */}
            <div className="space-y-6">
              {/* Icon Library Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🎨</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('settings.iconLibrarySection')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('settings.manageStampIcons')}
                </p>
                <IconLibraryManager />
              </div>
              
              {/* Future Settings Sections */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⚙️</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('settings.systemConfiguration')}
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  {t('settings.additionalSettingsComingSoon')}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard