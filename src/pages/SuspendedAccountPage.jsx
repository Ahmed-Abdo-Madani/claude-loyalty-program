import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAuthData, isAuthenticated, logout } from '@/utils/secureAuth'
import { secureApi, endpoints } from '@/config/api'
import SEO from '@/components/SEO'

function SuspendedAccountPage() {
  const { t, i18n } = useTranslation('subscription')
  const navigate = useNavigate()
  const [suspensionData, setSuspensionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSuspensionDetails()
  }, [])

  const loadSuspensionDetails = async () => {
    try {
      // Check authentication
      if (!isAuthenticated()) {
        navigate('/auth')
        return
      }

      const authData = getAuthData()
      
      // Comment 3: Fetch real-time business status from backend
      try {
        const response = await secureApi.get(endpoints.myAnalytics)
        
        if (response.ok) {
          const data = await response.json()
          
          // Get business from authData for status check
          const businessResponse = await secureApi.get(`${endpoints.baseURL}/api/business/my/status`)
          let serverStatus = authData.businessStatus
          let serverSuspensionReason = authData.suspensionReason
          let serverSuspensionDate = authData.suspensionDate
          let serverSubscriptionStatus = authData.subscriptionStatus
          
          if (businessResponse.ok) {
            const businessData = await businessResponse.json()
            if (businessData.success) {
              serverStatus = businessData.data.status
              serverSuspensionReason = businessData.data.suspension_reason
              serverSuspensionDate = businessData.data.suspension_date
              serverSubscriptionStatus = businessData.data.subscription_status
              
              // Comment 3: Update localStorage with fresh server data
              localStorage.setItem('businessStatus', serverStatus || 'active')
              localStorage.setItem('subscriptionStatus', serverSubscriptionStatus || 'trial')
              if (serverSuspensionReason) {
                localStorage.setItem('suspensionReason', serverSuspensionReason)
              }
              if (serverSuspensionDate) {
                localStorage.setItem('suspensionDate', serverSuspensionDate)
              }
            }
          }
          
          // Comment 3: If not suspended per server, redirect to dashboard
          if (serverStatus !== 'suspended') {
            setError(t('suspended.alreadyActive'))
            setTimeout(() => {
              navigate('/dashboard')
            }, 2000)
            return
          }
          
          // Use server data if available, fall back to localStorage
          setSuspensionData({
            reason: serverSuspensionReason || authData.suspensionReason || t('suspended.reason'),
            date: serverSuspensionDate ? new Date(serverSuspensionDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US') : '',
            subscription_status: serverSubscriptionStatus || authData.subscriptionStatus,
            business_name: authData.businessName
          })
        } else {
          // Backend fetch failed - use localStorage fallback
          throw new Error('Backend fetch failed')
        }
      } catch (backendError) {
        console.warn('Backend fetch failed, using localStorage:', backendError)
        
        // Fallback to localStorage data
        if (authData.businessStatus !== 'suspended') {
          setError(t('suspended.alreadyActive'))
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
          return
        }
        
        setSuspensionData({
          reason: authData.suspensionReason || t('suspended.reason'),
          date: authData.suspensionDate ? new Date(authData.suspensionDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US') : '',
          subscription_status: authData.subscriptionStatus,
          business_name: authData.businessName
        })
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading suspension details:', err)
      setError(t('suspended.error'))
      setLoading(false)
    }
  }

  const handleUpdatePayment = () => {
    // Navigate to checkout page with reactivation flag
    const authData = getAuthData()
    navigate(`/subscription/checkout?reactivation=true&plan=basic`)
  }

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('suspended.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            {t('suspended.error')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {t('suspended.logout')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title={`${t('suspended.title')} - Madna Loyalty`}
        description={t('suspended.subtitle')}
        noindex={true}
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8" dir={i18n.dir()}>
        <div className="max-w-2xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
              {t('suspended.title')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('suspended.subtitle')}
            </p>
          </div>

          {/* Suspension Details Card */}
          {suspensionData && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('suspended.reason')}
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('suspended.reason')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {suspensionData.reason}
                  </span>
                </div>
                
                {suspensionData.date && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('suspended.date')}:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {suspensionData.date}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('suspended.retryHistory', { count: 3 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Update Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('suspended.updatePaymentCTA')}
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('suspended.howToReactivate')}
            </p>
            
            <button
              onClick={handleUpdatePayment}
              className="w-full sm:max-w-md mx-auto block px-6 py-4 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              {t('suspended.updatePaymentCTA')}
            </button>
          </div>

          {/* Alternative Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('suspended.contactSupport')}
            </h3>
            
            <div className="space-y-3">
              <a
                href="mailto:support@madna.me"
                className="block text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors"
              >
                📧 support@madna.me
              </a>
              
              <button
                onClick={() => navigate('/dashboard?tab=payment-history')}
                className="block text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors"
              >
                📊 {t('suspended.viewPaymentHistory')}
              </button>
              
              <button
                onClick={handleLogout}
                className="block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                🚪 {t('suspended.logout')}
              </button>
            </div>
          </div>

          {/* Information Box (Collapsible) */}
          <details className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">
              {t('suspended.whySuspended')}
            </summary>
            
            <div className="mt-4 space-y-4 text-gray-600 dark:text-gray-400">
              <p>{t('suspended.faqContent', { count: 3, days: 9 })}</p>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('suspended.howToReactivate')}
                </h4>
                <p className="whitespace-pre-line">{t('suspended.reactivateSteps')}</p>
              </div>
            </div>
          </details>
        </div>
      </div>
    </>
  )
}

export default SuspendedAccountPage
