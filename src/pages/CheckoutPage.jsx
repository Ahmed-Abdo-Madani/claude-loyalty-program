
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { secureApi, endpoints } from '../config/api'
import { getAuthData } from '../utils/secureAuth'
import SEO from '../components/SEO'

export default function CheckoutPage() {
  const { t, i18n } = useTranslation('subscription')
  const navigate = useNavigate()
  const location = useLocation()

  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [checkoutUrl, setCheckoutUrl] = useState(null)
  const [processing, setProcessing] = useState(false)

  // Get plan details from navigation state or query params
  const searchParams = new URLSearchParams(location.search)
  const planFromQuery = searchParams.get('plan')
  const locationsFromQuery = parseInt(searchParams.get('locations')) || 1

  const planDetails = location.state || {}
  const planType = planFromQuery || planDetails.planType || 'loyalty'
  const locationCount = locationsFromQuery || planDetails.locationCount || 1

  // Plan prices (SAR)
  const prices = {
    loyalty: 60,
    pos: 210,
    free: 0
  }
  const unitPrice = prices[planType] || 0
  const totalPrice = unitPrice * locationCount

  // Check authentication on mount
  useEffect(() => {
    const authData = getAuthData()
    if (!authData.isAuthenticated) {
      navigate('/auth?mode=signin')
      return
    }
    fetchCheckoutUrl()
  }, [])

  const fetchCheckoutUrl = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await secureApi.post(endpoints.subscriptionCheckout, {
        planType: planType,
        locationCount: locationCount
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to initialize checkout')
      }

      const data = await response.json()
      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl)
      } else {
        throw new Error('Invalid checkout configuration')
      }

    } catch (err) {
      console.error('Checkout initialization failed:', err)
      setError(err.message || 'Failed to load checkout information')
    } finally {
      setLoading(false)
    }
  }

  const handleProceed = () => {
    if (checkoutUrl) {
      setProcessing(true)
      window.location.href = checkoutUrl
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('checkout.loading') || 'Loading checkout...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12" dir={i18n.dir()}>
      <SEO titleKey="checkout.title" noindex={true} />

      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              {t('checkout.title') || 'Secure Checkout'}
            </h1>
            <p className="text-blue-100">
              {t('checkout.subtitle') || 'Complete your subscription securely'}
            </p>
          </div>

          <div className="p-8">
            {/* Order Summary */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('checkout.orderSummary') || 'Order Summary'}
              </h2>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{t('checkout.planLabel') || 'Plan'}</span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">{planType}</span>
                </div>
                {locationCount > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('checkout.locations') || 'Locations'}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{locationCount}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white">{t('checkout.total') || 'Total'}</span>
                    <span className="text-lg font-bold text-primary dark:text-white">
                      {totalPrice} <span className="text-xs font-normal">SAR</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
                <button onClick={fetchCheckoutUrl} className="block mt-2 font-semibold underline">Retry</button>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleProceed}
                disabled={!checkoutUrl || processing}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <span>{t('checkout.proceedButton') || 'Proceed to Payment →'}</span>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                {t('checkout.secureNote') || 'Payments are processed securely by Lemon Squeezy. We do not store your card details.'}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-4">
            <span className="text-xs text-gray-400 opacity-60">🔒 256-bit SSL Secure</span>
            <span className="text-xs text-gray-400 opacity-60">🛡️ PCI Compliant</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium">
            ← {t('checkout.backButton') || 'Go Back'}
          </button>
        </div>
      </div>
    </div>
  )
}
