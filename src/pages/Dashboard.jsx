import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OffersTab from '../components/OffersTab'
import BranchesTab from '../components/BranchesTab'
import WalletAnalytics from '../components/WalletAnalytics'
import ScannerTab from '../components/ScannerTab'
import CustomersTab from '../components/CustomersTab'
import DashboardSidebar from '../components/DashboardSidebar'
import DashboardHeader from '../components/DashboardHeader'
import StatsCardGrid from '../components/StatsCardGrid'
import QuickActions from '../components/QuickActions'
import ActivityFeed from '../components/ActivityFeed'
import MonthlyChart from '../components/MonthlyChart'
import LogoUpload from '../components/LogoUpload'
import { isAuthenticated, logout, getAuthData } from '../utils/secureAuth'
import { endpoints, secureApi } from '../config/api'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check secure authentication
    if (!isAuthenticated()) {
      console.warn('🔒 Invalid authentication - redirecting to login')
      navigate('/auth?mode=signin')
      return
    }

    // Get user info from secure auth data
    const authData = getAuthData()
    setUser({
      businessName: authData.businessName,
      userEmail: authData.userEmail,
      businessId: authData.businessId // Now secure ID
    })

    console.log('🔒 Dashboard loaded with secure business ID:', authData.businessId)

    // Load dashboard data
    loadDashboardData()
  }, [navigate])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Use secure API requests with authentication headers
      const [analyticsResponse, activityResponse] = await Promise.all([
        secureApi.get(endpoints.myAnalytics),
        secureApi.get(endpoints.myActivity)
      ])

      const analyticsData = await analyticsResponse.json()
      const activityData = await activityResponse.json()

      if (analyticsData.success) {
        setAnalytics(analyticsData.data)
      }

      if (activityData.success) {
        setRecentActivity(activityData.data)
      }

      console.log('🔒 Dashboard data loaded successfully')

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Use fallback data if API fails
      setAnalytics({
        totalCustomers: 0,
        cardsIssued: 0,
        rewardsRedeemed: 0,
        growthPercentage: '+0%'
      })
      setRecentActivity([])
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    console.log('🔒 Logging out - clearing secure authentication data')
    logout() // Uses secure logout function
  }

  // Quick Actions handlers - preserving existing functionality
  const handleNewOffer = () => {
    setActiveTab('offers') // Switch to offers tab to create new offer
  }

  const handleScanQR = () => {
    setActiveTab('scanner') // Switch to scanner tab
  }

  const handleViewReports = () => {
    setActiveTab('analytics') // Switch to analytics tab
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <div className="lg:ml-20 xl:ml-64">
        {/* Header */}
        <DashboardHeader user={user} />

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Stats Overview */}
          <StatsCardGrid analytics={analytics} />

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors duration-300">
            {/* Tab Navigation - Horizontal for sub-navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'offers', label: 'My Offers', icon: '🎯' },
                  { id: 'scanner', label: 'QR Scanner', icon: '📱' },
                  { id: 'branches', label: 'Branches', icon: '🏪' },
                  { id: 'customers', label: 'Customers', icon: '👥' },
                  { id: 'wallet', label: 'Mobile Wallets', icon: '📱' },
                  { id: 'analytics', label: 'Analytics', icon: '📈' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                    disabled={tab.disabled}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 flex items-center ${
                      tab.disabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
                        : activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                    {tab.comingSoon && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-300 dark:border-yellow-700">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top Row - Main Dashboard Items */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Quick Actions - Left Column */}
                    <div className="lg:col-span-1">
                      <QuickActions
                        onNewOffer={handleNewOffer}
                        onScanQR={handleScanQR}
                        onViewReports={handleViewReports}
                      />
                    </div>

                    {/* Recent Activity - Middle Column */}
                    <div className="lg:col-span-1">
                      <ActivityFeed recentActivity={recentActivity} />
                    </div>

                    {/* Monthly Performance - Right Column */}
                    <div className="lg:col-span-1 xl:col-span-1">
                      <MonthlyChart analytics={analytics} />
                    </div>
                  </div>

                  {/* Bottom Row - Business Settings */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Business Logo Upload */}
                    <div className="lg:col-span-1">
                      <LogoUpload
                        onLogoUpdate={(logoData) => {
                          // Refresh dashboard header when logo is updated
                          window.location.reload()
                        }}
                      />
                    </div>

                    {/* Future settings components can go here */}
                    <div className="lg:col-span-1">
                      {/* Placeholder for additional business settings */}
                    </div>

                    <div className="lg:col-span-1">
                      {/* Placeholder for additional business settings */}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'offers' && (
                <OffersTab />
              )}

              {activeTab === 'scanner' && (
                <ScannerTab />
              )}

              {activeTab === 'branches' && (
                <BranchesTab />
              )}

              {activeTab === 'customers' && (
                <CustomersTab />
              )}

              {activeTab === 'wallet' && (
                <WalletAnalytics />
              )}

              {activeTab === 'analytics' && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="text-lg mb-2">📈 Advanced Analytics</div>
                  <div>Detailed analytics and reporting features coming soon!</div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard