import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import OffersTab from '../components/OffersTab'
import BranchesTab from '../components/BranchesTab'
import ProductsTab from '../components/ProductsTab'
import WalletAnalytics from '../components/WalletAnalytics'
import POSAnalytics from '../components/POSAnalytics'
import ScannerTab from '../components/ScannerTab'
import CustomersTab from '../components/CustomersTab'
import DashboardSidebar from '../components/DashboardSidebar'
import DashboardHeader from '../components/DashboardHeader'
import MobileBottomNav from '../components/MobileBottomNav'
import QuickActions from '../components/QuickActions'
import TodaysSnapshot from '../components/TodaysSnapshot'
import QRCodeModal from '../components/QRCodeModal'
import { isAuthenticated, logout, getAuthData } from '../utils/secureAuth'
import { endpoints, secureApi } from '../config/api'
import SEO from '../components/SEO'

const SubscriptionManagementPage = lazy(() => import('./SubscriptionManagementPage'))

function Dashboard() {
  const { t, i18n } = useTranslation('dashboard')
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
  const [showMenuQRModal, setShowMenuQRModal] = useState(false)

  // Sync activeTab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') || 'overview';
    const normalizedTab = ['subscription', 'subscription-manage', 'payment-history'].includes(tabParam)
      ? 'billing-subscription'
      : tabParam;
    if (normalizedTab !== activeTab) {
      setActiveTab(normalizedTab);
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

    // Comment 2: Redirect suspended businesses to suspended account page
    if (authData.businessStatus === 'suspended') {
      console.warn('🚫 Business is suspended - redirecting to suspended page')
      navigate('/subscription/suspended')
      return
    }

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

        // Add VIP customers and verification status to analytics data
        const enrichedAnalytics = {
          ...analyticsData.data,
          vipCustomers: customerAnalyticsData.success ? (customerAnalyticsData.data.vip_customers || 0) : 0,
          isVerified: analyticsData.data.is_verified,
          profileCompletion: analyticsData.data.profile_completion
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

  const handleGenerateMenuQR = () => {
    setShowMenuQRModal(true)
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('overview.loading')}</p>
        </div>
      </div>
    )
  }

  // Update tab content rendering logic
  const resolvedTab = ['subscription', 'subscription-manage', 'payment-history'].includes(activeTab)
    ? 'billing-subscription'
    : activeTab;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-20 lg:pb-0">
      <SEO titleKey="pages.dashboard.title" descriptionKey="pages.dashboard.description" noindex={true} />

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
              <nav className="flex gap-4 sm:gap-8 px-4 sm:px-6">
                {[
                  { id: 'overview', label: t('tabs.overview'), icon: '📊' },
                  { id: 'offers', label: t('tabs.myOffers'), icon: '🎯' },
                  // { id: 'scanner', label: t('tabs.qrScanner'), icon: '📱' },
                  { id: 'branches', label: t('tabs.branches'), icon: '🏪' },
                  { id: 'products', label: t('tabs.products'), icon: '🛍️' },
                  // Temporarily hidden - can be re-enabled in future
                  // { id: 'customers', label: t('tabs.customers'), icon: '👥' },
                  // { id: 'wallet', label: t('tabs.mobileWallets'), icon: '📱' },
                  { id: 'analytics', label: t('tabs.analytics'), icon: '📈' },
                  { id: 'billing-subscription', label: t('tabs.billingSubscription'), icon: '💳' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && handleTabChange(tab.id)}
                    disabled={tab.disabled}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 flex items-center touch-target min-h-[44px] ${tab.disabled
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
                        {t('tabs.comingSoon')}
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
                  {/* Profile Completion Prompt */}
                  {analytics && analytics.profileCompletion < 100 && (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white mb-6 relative overflow-hidden">
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                            <span>🚀</span> {i18n.language === 'ar' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
                          </h3>
                          <p className="text-blue-100/90 text-sm max-w-2xl">
                            {i18n.language === 'ar'
                              ? 'نشاطك التجاري الآن في وضع البدء السريع. أكمل بياناتك (رقم السجل التجاري، الهوية الوطنية) لتتمكن من نشر العروض وتفعيل برنامج الولاء بشكل كامل.'
                              : 'Your business is in Quick Start mode. Complete your details (CR Number, National ID) to publish offers and fully activate your loyalty program.'}
                          </p>
                          <div className="mt-4 w-full max-w-xs bg-white/20 rounded-full h-2">
                            <div
                              className="bg-white h-2 rounded-full transition-all duration-500"
                              style={{ width: `${analytics.profileCompletion}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-blue-100 mt-1 block">
                            {analytics.profileCompletion}% {i18n.language === 'ar' ? 'مكتمل' : 'completed'}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate('/complete-profile')}
                          className="px-6 py-2.5 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-md whitespace-nowrap"
                        >
                          {i18n.language === 'ar' ? 'أكمل الآن' : 'Complete Now'}
                        </button>
                      </div>
                      {/* Decorative background element */}
                      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    </div>
                  )}

                  {/* Today's Snapshot - Real-time POS Metrics */}
                  <TodaysSnapshot />

                  {/* Quick Actions - Expanded to 7 Actions */}
                  <QuickActions
                    onNewOffer={handleNewOffer}
                    onScanQR={handleScanQR}
                    onViewReports={handleViewReports}
                    onManageProducts={() => handleTabChange('products')}
                    onManageBranches={() => handleTabChange('branches')}
                    onGenerateMenuQR={handleGenerateMenuQR}
                  />
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

              {activeTab === 'products' && (
                <ProductsTab analytics={analytics} />
              )}

              {activeTab === 'customers' && (
                <CustomersTab analytics={analytics} />
              )}

              {activeTab === 'wallet' && (
                <WalletAnalytics />
              )}

              {activeTab === 'analytics' && (
                <POSAnalytics />
              )}

              {resolvedTab === 'billing-subscription' && (
                <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
                  <SubscriptionManagementPage />
                </Suspense>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Menu QR Code Modal */}
      {showMenuQRModal && user && (
        <QRCodeModal
          type="menu"
          identifier={user.businessId}
          options={{ type: 'business' }}
          onClose={() => setShowMenuQRModal(false)}
        />
      )}
    </div>
  )
}

export default Dashboard