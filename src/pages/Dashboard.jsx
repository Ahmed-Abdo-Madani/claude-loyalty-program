import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import OffersTab from '../components/OffersTab'
import BranchesTab from '../components/BranchesTab'
import WalletAnalytics from '../components/WalletAnalytics'
import ScannerTab from '../components/ScannerTab'
import CustomersTab from '../components/CustomersTab'
import DashboardSidebar from '../components/DashboardSidebar'
import DashboardHeader from '../components/DashboardHeader'
import MobileBottomNav from '../components/MobileBottomNav'
import StatsCardGrid from '../components/StatsCardGrid'
import QuickActions from '../components/QuickActions'
import ActivityFeed from '../components/ActivityFeed'
import MonthlyChart from '../components/MonthlyChart'
import LogoUpload from '../components/LogoUpload'
import { isAuthenticated, logout, getAuthData } from '../utils/secureAuth'
import { endpoints, secureApi } from '../config/api'

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Initialize activeTab from URL query parameter (default to 'overview')
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'overview'
  })
  
  const [user, setUser] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  // Sync activeTab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') || 'overview'
    if (tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [searchParams, location.search])

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
        // Fetch customer analytics to get VIP count
        const customerAnalyticsResponse = await secureApi.get(endpoints.customerAnalytics)
        const customerAnalyticsData = await customerAnalyticsResponse.json()
        
        // Add VIP customers to analytics data
        const enrichedAnalytics = {
          ...analyticsData.data,
          vipCustomers: customerAnalyticsData.success ? (customerAnalyticsData.data.vip_customers || 0) : 0
        }
        
        setAnalytics(enrichedAnalytics)
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
        growthPercentage: '+0%',
        vipCustomers: 0
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

  // Update URL when tab changes
  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName }, { replace: true })
    setActiveTab(tabName)
  }

  // Quick Actions handlers - preserving existing functionality
  const handleNewOffer = () => {
    handleTabChange('offers') // Switch to offers tab to create new offer
  }

  const handleScanQR = () => {
    handleTabChange('scanner') // Switch to scanner tab
  }

  const handleViewReports = () => {
    handleTabChange('analytics') // Switch to analytics tab
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-20 lg:pb-0">
      {/* Sidebar Navigation - Desktop Only */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Mobile Bottom Navigation - Mobile Only */}
      <MobileBottomNav />

      {/* Main Content Area */}
      <div className="ml-0 lg:ml-64">
        {/* Header */}
        <DashboardHeader user={user} />

        {/* Dashboard Content */}
        <main className="p-3 sm:p-6">
          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors duration-300">
            {/* Tab Navigation - Hidden on mobile (use bottom nav), visible on tablet+ */}
            <div className="hidden sm:block border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
              <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6">
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
                    onClick={() => !tab.disabled && handleTabChange(tab.id)}
                    disabled={tab.disabled}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 flex items-center touch-target min-h-[44px] ${
                      tab.disabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
                        : activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    <span>{tab.label}</span>
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
            <div className="p-3 sm:p-5">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Overview - Only on Overview Tab */}
                  <StatsCardGrid analytics={analytics} />
                  
                  {/* Top Row - Main Dashboard Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {/* Quick Actions - Left Column */}
                    <div className="md:col-span-1">
                      <QuickActions
                        onNewOffer={handleNewOffer}
                        onScanQR={handleScanQR}
                        onViewReports={handleViewReports}
                      />
                    </div>

                    {/* Recent Activity - Middle Column */}
                    <div className="md:col-span-1">
                      <ActivityFeed recentActivity={recentActivity} />
                    </div>

                    {/* Monthly Performance - Right Column */}
                    <div className="md:col-span-2 xl:col-span-1">
                      <MonthlyChart analytics={analytics} />
                    </div>
                  </div>

                  {/* Bottom Row - Business Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {/* Business Logo Upload */}
                    <div className="md:col-span-1">
                      <LogoUpload
                        onLogoUpdate={(logoData) => {
                          // Refresh dashboard header when logo is updated
                          window.location.reload()
                        }}
                      />
                    </div>

                    {/* Future settings components can go here */}
                    <div className="md:col-span-1">
                      {/* Placeholder for additional business settings */}
                    </div>

                    <div className="md:col-span-2 xl:col-span-1">
                      {/* Placeholder for additional business settings */}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'offers' && (
                <OffersTab analytics={analytics} />
              )}

              {activeTab === 'scanner' && (
                <ScannerTab analytics={analytics} />
              )}

              {activeTab === 'branches' && (
                <BranchesTab analytics={analytics} />
              )}

              {activeTab === 'customers' && (
                <CustomersTab analytics={analytics} />
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