import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OffersTab from '../components/OffersTab'
import BranchesTab from '../components/BranchesTab'
import WalletAnalytics from '../components/WalletAnalytics'
import ScannerTab from '../components/ScannerTab'
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

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button className="md:hidden p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="text-2xl font-bold text-primary ml-2">
                🎯 Loyalty Platform
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative group">
                <button className="flex items-center space-x-2 text-gray-700 hover:text-primary transition-colors">
                  <span>{user.businessName}</span>
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
                    {user.businessName.charAt(0).toUpperCase()}
                  </div>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                      {user.userEmail}
                    </div>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Account Settings
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Billing
                    </a>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-primary">{analytics?.totalCustomers || 0}</div>
            <div className="text-gray-600">Active Customers</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-secondary">{analytics?.cardsIssued || 0}</div>
            <div className="text-gray-600">Cards Issued</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-accent">{analytics?.rewardsRedeemed || 0}</div>
            <div className="text-gray-600">Rewards Redeemed</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{analytics?.growthPercentage || '+0%'}</div>
            <div className="text-gray-600">Redemption Rate</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>{activity.message}</span>
                        <span className="text-sm text-gray-500">{activity.timeAgo}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-lg mb-2">👋 Welcome to your dashboard!</div>
                      <div>Start creating offers and managing branches to see activity here.</div>
                    </div>
                  )}
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
              <div>
                <h2 className="text-xl font-semibold mb-4">Customer List</h2>
                <div className="text-center py-12 text-gray-500">
                  Customer management interface coming soon...
                </div>
              </div>
            )}

            {activeTab === 'wallet' && (
              <WalletAnalytics />
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Analytics & Reports</h2>
                <div className="text-center py-12 text-gray-500">
                  Analytics dashboard coming soon...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard