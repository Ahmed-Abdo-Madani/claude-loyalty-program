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
import UsageMetrics from '../components/UsageMetrics'
import PlanUpgradeModal from '../components/PlanUpgradeModal'
import LogoUploadModal from '../components/LogoUploadModal'
import BusinessSettingsTab from '../components/BusinessSettingsTab'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { isAuthenticated, logout, getAuthData, setSubscriptionData as setSecureSubscriptionData } from '../utils/secureAuth'
import { endpoints, secureApi } from '../config/api'
import SEO from '../components/SEO'


const SubscriptionManagementPage = lazy(() => import('./SubscriptionManagementPage'))


function Dashboard() {
  const { t, i18n } = useTranslation(['dashboard', 'subscription'])
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
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showLogoModal, setShowLogoModal] = useState(false)
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false)
  const [trialExpirationMessage, setTrialExpirationMessage] = useState('')

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

    // Listen for trial expiration events
    const handleTrialExpired = (event) => {
      setTrialExpirationMessage(event.detail.message || 'Your trial has expired. Please upgrade to continue.')
      setShowTrialExpiredModal(true)
    }

    window.addEventListener('trialExpired', handleTrialExpired)

    return () => {
      window.removeEventListener('trialExpired', handleTrialExpired)
    }
  }, [navigate])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Use secure API requests with authentication headers
      const [analyticsResponse, activityResponse, subscriptionResponse] = await Promise.all([
        secureApi.get(endpoints.myAnalytics),
        secureApi.get(endpoints.myActivity),
        secureApi.get(endpoints.subscriptionDetails)
      ])

      const analyticsData = await analyticsResponse.json()
      const activityData = await activityResponse.json()

      let subData = null;
      try {
        const subResponseData = await subscriptionResponse.json();
        if (subResponseData.success) {
          subData = subResponseData.data;
          setSubscriptionData(subData);
          if (subData.subscription) {
            setSecureSubscriptionData(subData.subscription);
          }
        }
      } catch (err) {
        console.warn('Failed to parse subscription data', err);
      }

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
        analytics={analytics}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors duration-300">
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
                              ? 'نشاطك التجاري الآن في وضع البدء السريع. أكمل بياناتك (السجل التجاري، الهوية، شعار النشاط) للنشر.'
                              : 'Your business is in Quick Start mode. Complete your details (CR Number, National ID, Business Logo) to publish offers.'}
                          </p>
                          <div className="mt-4 w-full max-w-xs bg-white/20 rounded-full h-2">
                            <div
                              className="bg-white h-2 rounded-full transition-all duration-500"
                              style={{ width: `${analytics.profileCompletion}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-blue-100 block">
                              {analytics.profileCompletion}% {i18n.language === 'ar' ? 'مكتمل' : 'completed'}
                            </span>

                            {/* Logo Status Indicator */}
                            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${analytics.has_logo ? 'bg-green-500/20 text-blue-50' : 'bg-amber-500/20 text-amber-100'}`}>
                              {analytics.has_logo ? (
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                              ) : (
                                <ExclamationCircleIcon className="w-3.5 h-3.5" />
                              )}
                              {i18n.language === 'ar'
                                ? (analytics.has_logo ? 'تم رفع الشعار' : 'الشعار مفقود')
                                : (analytics.has_logo ? 'Logo Uploaded' : 'Missing Logo')
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => setShowLogoModal(true)}
                            className={`px-4 py-2.5 font-bold rounded-lg transition-colors shadow-md whitespace-nowrap text-sm flex items-center justify-center gap-2 ${analytics.has_logo
                              ? 'bg-blue-800/30 text-white hover:bg-blue-800/40'
                              : 'bg-white text-blue-700 hover:bg-blue-50'
                              }`}
                          >
                            {!analytics.has_logo && <ExclamationCircleIcon className="w-4 h-4" />}
                            {i18n.language === 'ar' ? (analytics.has_logo ? 'تغيير الشعار' : 'رفع الشعار') : (analytics.has_logo ? 'Change Logo' : 'Upload Logo')}
                          </button>

                          <button
                            onClick={() => navigate('/complete-profile')}
                            className="px-6 py-2.5 bg-blue-800/30 text-white font-bold rounded-lg hover:bg-blue-800/40 transition-colors shadow-md whitespace-nowrap text-sm border border-white/10"
                          >
                            {i18n.language === 'ar' ? 'أكمل البيانات' : 'Complete Details'}
                          </button>
                        </div>
                      </div>
                      {/* Decorative background element */}
                      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    </div>
                  )}

                  {/* Trial Expiration Warning Banner */}
                  {subscriptionData?.subscription?.trial_info?.is_trial && (
                    <>
                      {/* Approaching Expiration (1-2 days left) */}
                      {subscriptionData.subscription.trial_info.days_remaining <= 2 &&
                        subscriptionData.subscription.trial_info.days_remaining > 0 && (
                          <div className="bg-gradient-to-r from-amber-600 to-orange-700 rounded-xl shadow-lg p-6 text-white mb-6 relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                                  <span>⏰</span> {i18n.language === 'ar' ? 'الفترة التجريبية تنتهي قريباً' : 'Trial Ending Soon'}
                                </h3>
                                <p className="text-amber-100/90 text-sm max-w-2xl">
                                  {i18n.language === 'ar'
                                    ? `فترتك التجريبية تنتهي خلال ${subscriptionData.subscription.trial_info.days_remaining} ${subscriptionData.subscription.trial_info.days_remaining === 1 ? 'يوم' : 'أيام'}. قم بالترقية الآن لتجنب انقطاع الخدمة.`
                                    : `Your trial ends in ${subscriptionData.subscription.trial_info.days_remaining} day${subscriptionData.subscription.trial_info.days_remaining === 1 ? '' : 's'}. Upgrade now to avoid service interruption.`}
                                </p>
                              </div>
                              <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-6 py-2.5 bg-white text-amber-700 font-bold rounded-lg hover:bg-amber-50 transition-colors shadow-md whitespace-nowrap"
                              >
                                {i18n.language === 'ar' ? 'ترقية الآن' : 'Upgrade Now'}
                              </button>
                            </div>
                            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                          </div>
                        )}

                      {/* Trial Expired */}
                      {subscriptionData.subscription.trial_info.days_remaining <= 0 && (
                        <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-xl shadow-lg p-6 text-white mb-6 relative overflow-hidden border-2 border-red-400">
                          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                                <span>🚫</span> {i18n.language === 'ar' ? 'انتهت الفترة التجريبية' : 'Trial Period Expired'}
                              </h3>
                              <p className="text-red-100/90 text-sm max-w-2xl">
                                {i18n.language === 'ar'
                                  ? 'فترتك التجريبية انتهت. يرجى الترقية إلى خطة مدفوعة لمواصلة استخدام جميع الميزات.'
                                  : 'Your trial period has ended. Please upgrade to a paid plan to continue using all features.'}
                              </p>
                            </div>
                            <button
                              onClick={() => setShowUpgradeModal(true)}
                              className="px-6 py-2.5 bg-white text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors shadow-md whitespace-nowrap animate-pulse"
                            >
                              {i18n.language === 'ar' ? 'ترقية الآن' : 'Upgrade Now'}
                            </button>
                          </div>
                          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Subscription Summary Card - HIDDEN (Maybe in the future) */}
                  {/*
                  {subscriptionData && (
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 text-white overflow-hidden relative">
                      <div className="relative z-10 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{t('dashboard.subscription.title', 'Your Subscription')}</h3>
                            <span className="bg-blue-600 text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                              {t(`subscription:plans.${subscriptionData.subscription?.plan_type || 'free'}.name`)}
                            </span>
                          </div>

                          <p className="text-gray-300 text-sm mb-4 max-w-md">
                            {t('dashboard.subscription.usageSummary', 'Manage your plan and usage limits.')}
                            {subscriptionData.subscription?.trial_info?.is_trial && (
                              <span className="text-amber-400 ml-2 font-semibold">
                                {t('dashboard.subscription.trialEnding', 'Trial ends in {{days}} days', { days: subscriptionData.subscription.trial_info.days_remaining })}
                              </span>
                            )}
                          </p>

                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowUpgradeModal(true)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                              {t('dashboard.subscription.upgradePrompt', 'Upgrade Plan')}
                            </button>
                            <button
                              onClick={() => handleTabChange('billing-subscription')}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              {t('dashboard.subscription.manageBilling', 'Manage Billing')}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                  */}



                  {/* Today's Snapshot - Real-time POS Metrics */}
                  <TodaysSnapshot />

                  {/* Quick Actions - Expanded to 8 Actions */}
                  <QuickActions
                    onNewOffer={handleNewOffer}
                    onScanQR={handleScanQR}
                    onViewReports={handleViewReports}
                    onManageProducts={() => handleTabChange('products')}
                    onManageBranches={() => handleTabChange('branches')}
                    onGenerateMenuQR={handleGenerateMenuQR}
                    onViewMenu={() => user?.businessId && window.open(`/menu/business/${user.businessId}`, '_blank')}
                    onManageSubscription={() => handleTabChange('billing-subscription')}
                  />

                  {/* Detailed Usage Metrics - Moved below Quick Actions */}
                  {subscriptionData && (
                    <UsageMetrics
                      usage={subscriptionData.usage}
                      limits={subscriptionData.limits}
                    />
                  )}
                </div>
              )}

              {activeTab === 'offers' && (
                <OffersTab analytics={analytics} user={user} />
              )}

              {activeTab === 'scanner' && (
                <ScannerTab analytics={analytics} />
              )}

              {activeTab === 'branches' && (
                <BranchesTab
                  analytics={analytics}
                  planType={subscriptionData?.subscription?.plan_type}
                />
              )}

              {activeTab === 'products' && (
                <ProductsTab
                  analytics={analytics}
                  onNavigateToSettings={() => handleTabChange('settings')}
                />
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

              {activeTab === 'settings' && (
                <BusinessSettingsTab onNavigateToProducts={() => handleTabChange('products')} />
              )}

              {resolvedTab === 'billing-subscription' && (
                <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
                  <SubscriptionManagementPage />
                </Suspense>
              )}
            </div>
          </div>
        </main>
      </div >

      {/* Menu QR Code Modal */}
      {
        showMenuQRModal && user && (
          <QRCodeModal
            type="menu"
            identifier={user.businessId}
            options={{ type: 'business' }}
            onClose={() => setShowMenuQRModal(false)}
          />
        )
      }
      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal || showTrialExpiredModal}
        onClose={() => {
          setShowUpgradeModal(false)
          setShowTrialExpiredModal(false)
        }}
        currentPlan={subscriptionData?.subscription?.plan_type}
        trialExpired={showTrialExpiredModal}
        message={trialExpirationMessage}
      />

      <LogoUploadModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        onLogoUpdate={(data) => {
          // Refresh dashboard data to update logo status/completion
          loadDashboardData()
        }}
      />

    </div >

  )
}

export default Dashboard