import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { secureApi, endpoints } from '../config/api'
import { getAuthData } from '../utils/secureAuth'
import SEO from '../components/SEO'

export default function CheckoutPage() {
  const { t, i18n } = useTranslation('subscription')
  const navigate = useNavigate()
  const location = useLocation()
  const moyasarFormRef = useRef(null)

  // State management
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [checkoutSession, setCheckoutSession] = useState(null)
  const [moyasarLoaded, setMoyasarLoaded] = useState(false)
  const [isGatewayLoading, setIsGatewayLoading] = useState(true)
  const initializationInProgressRef = useRef(false)

  // Get plan details from navigation state or query params
  const searchParams = new URLSearchParams(location.search)
  const isReactivation = searchParams.get('reactivation') === 'true'
  const isPaymentMethodUpdate = searchParams.get('update_payment') === 'true'
  const planFromQuery = searchParams.get('plan')
  const locationsFromQuery = parseInt(searchParams.get('locations')) || 1
  
  const planDetails = location.state || {}
  const planType = planFromQuery || planDetails.planType
  const locationCount = locationsFromQuery || planDetails.locationCount || 1
  const currentPlan = planDetails.currentPlan
  
  // Check if this is a retry attempt
  const isRetry = searchParams.get('retry') === 'true'
  const [showRetryBanner, setShowRetryBanner] = useState(isRetry)
  
  // State for test card helper and debug info
  const [copiedCard, setCopiedCard] = useState(null)
  const [debugInfoCopied, setDebugInfoCopied] = useState(false)

  // Check if Moyasar is loaded from static script in index.html with polling strategy
  useEffect(() => {
    let pollAttempts = 0
    const maxPollAttempts = 50 // 10 seconds (50 * 200ms)
    const pollInterval = 200 // ms
    
    const checkMoyasar = () => {
      if (window.Moyasar) {
        console.log('✅ Moyasar loaded from static script')
        setMoyasarLoaded(true)
        setIsGatewayLoading(false)
        return true
      }
      return false
    }
    
    // Check immediately
    if (checkMoyasar()) {
      return
    }
    
    // Poll for Moyasar availability
    const pollTimer = setInterval(() => {
      pollAttempts++
      
      if (checkMoyasar()) {
        clearInterval(pollTimer)
      } else if (pollAttempts >= maxPollAttempts) {
        // Timeout: Moyasar failed to load
        clearInterval(pollTimer)
        console.error('❌ Moyasar not available after 10 seconds. Check index.html script tag.')
        setError(t('checkout.scriptLoadError'))
        setIsGatewayLoading(false)
      }
    }, pollInterval)
    
    // Cleanup on unmount
    return () => {
      clearInterval(pollTimer)
    }
  }, [t])

  // Check authentication and plan details
  useEffect(() => {
    const authData = getAuthData()
    
    if (!authData.isAuthenticated) {
      navigate('/auth?mode=signin')
      return
    }

    if (!planType && !isPaymentMethodUpdate) {
      navigate('/dashboard/subscription')
      return
    }

    // Fetch checkout session (will handle payment method update logic internally)
    fetchCheckoutSession()
  }, [])

  // Fetch checkout session from backend
  const fetchCheckoutSession = async () => {
    try {
      setLoading(true)
      setError(null)

      // For payment method updates, fetch current subscription details first
      let effectivePlanType = planType
      let effectiveLocationCount = locationCount
      
      if (isPaymentMethodUpdate) {
        const subResponse = await secureApi.get(endpoints.subscriptionDetails)
        if (!subResponse.ok) {
          throw new Error('Failed to fetch subscription details')
        }
        const subData = await subResponse.json()
        
        // Validate response shape and subscription existence
        if (!subData.success || !subData.data?.subscription) {
          setError(t('checkout.noActiveSubscription'))
          setLoading(false)
          return
        }
        
        // Extract plan details from correct response shape (data.data.subscription)
        effectivePlanType = subData.data.subscription.plan_type || 'professional'
        effectiveLocationCount = subData.data.subscription.location_count || 1
      }

      const response = await secureApi.post(endpoints.subscriptionCheckout, {
        planType: effectivePlanType,
        locationCount: effectiveLocationCount,
        // For payment method updates, use minimal amount (1 SAR) for card verification
        isPaymentMethodUpdate: isPaymentMethodUpdate
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to initialize checkout')
      }

      const data = await response.json()
      
      setPaymentData({
        amount: data.amount,
        currency: data.currency,
        description: data.description
      })
      
      // Store resolved plan metadata in checkout session for Moyasar initialization
      setCheckoutSession({
        ...data,
        resolvedPlanType: effectivePlanType,
        resolvedLocationCount: effectiveLocationCount
      })
      setLoading(false)
    } catch (err) {
      console.error('Checkout initialization failed:', err)
      setError(err.message || 'Failed to load checkout. Please try again.')
      setLoading(false)
    }
  }

  // Copy card number to clipboard
  const copyCardNumber = (cardNumber) => {
    navigator.clipboard.writeText(cardNumber)
    setCopiedCard(cardNumber)
    setTimeout(() => setCopiedCard(null), 2000)
  }
  
  // Copy debug info to clipboard
  const copyDebugInfo = () => {
    const debugInfo = {
      moyasarLoaded,
      checkoutSessionPresent: !!checkoutSession,
      amount: checkoutSession?.amount,
      amountInHalalas: checkoutSession?.amount ? Math.round(checkoutSession.amount * 100) : null,
      keyPrefix: checkoutSession?.publishableKey?.substring(0, 15),
      keyFormatValid: checkoutSession?.publishableKey ? /^pk_(test|live)_/.test(checkoutSession.publishableKey) : false,
      callbackUrl: checkoutSession?.callbackUrl,
      configurationValid: !!(checkoutSession?.publishableKey && checkoutSession?.callbackUrl),
      timestamp: new Date().toISOString()
    }
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
    setDebugInfoCopied(true)
    setTimeout(() => setDebugInfoCopied(false), 2000)
  }

  // Initialize Moyasar form
  useEffect(() => {
    if (!checkoutSession || !moyasarFormRef.current || !moyasarLoaded) {
      return
    }

    // Check if Moyasar is available
    if (!window.Moyasar) {
      console.error('❌ Moyasar not available during initialization')
      setError(t('checkout.initializationError'))
      return
    }

    // Cleanup function
    let moyasarInstance = null

    // Add small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      try {
        // Show loading spinner while initializing
        setProcessing(true)
        
        // Validate required config values
        if (!checkoutSession.publishableKey) {
          const configError = new Error('Publishable key missing')
          configError.code = 'CONFIG_ERROR'
          throw configError
        }
        if (!checkoutSession.callbackUrl) {
          const configError = new Error('Callback URL missing')
          configError.code = 'CONFIG_ERROR'
          throw configError
        }
        
        // Validate publishable key format (prefix only, matching backend validation)
        // Only checks pk_test_ or pk_live_ prefix to stay consistent with backend
        const keyFormatValid = /^pk_(test|live)_/.test(checkoutSession.publishableKey)
        if (!keyFormatValid) {
          console.error('❌ Invalid publishable key format:', checkoutSession.publishableKey.substring(0, 15) + '...')
          const configError = new Error('Invalid payment gateway configuration. Please contact support.')
          configError.code = 'CONFIG_ERROR'
          throw configError
        }
        
        console.log('✅ Publishable key format valid:', checkoutSession.publishableKey.substring(0, 15) + '...')
        
        // Convert amount to halalas and validate
        const amountInHalalas = Math.round(checkoutSession.amount * 100)
        if (amountInHalalas < 100) {
          const configError = new Error('Amount too small. Minimum is 1 SAR.')
          configError.code = 'CONFIG_ERROR'
          throw configError
        }
        
        // Set flag that initialization is in progress
        initializationInProgressRef.current = true
        
        console.log('💳 Initializing Moyasar form:', {
          amount: checkoutSession.amount,
          amountInHalalas,
          currency: checkoutSession.currency,
          language: i18n.language,
          keyValid: keyFormatValid
        })
        
        // Build callback URL with reactivation or update_payment flags
        let callbackUrl = checkoutSession.callbackUrl
        if (isReactivation) {
          callbackUrl = `${callbackUrl}?reactivation=true&plan=${planType}&locations=${locationCount}`
        } else if (isPaymentMethodUpdate) {
          callbackUrl = `${callbackUrl}?update_payment=true`
        }
        
        // Initialize Moyasar embedded form
        moyasarInstance = window.Moyasar.init({
          element: moyasarFormRef.current,
          language: i18n.language === 'ar' ? 'ar' : 'en',
          amount: amountInHalalas,
          currency: checkoutSession.currency,
          description: isReactivation 
            ? `Account Reactivation - ${checkoutSession.description}`
            : checkoutSession.description,
          publishable_api_key: checkoutSession.publishableKey,
          callback_url: callbackUrl,
          // Only credit card enabled - Apple Pay and STC Pay require merchant account setup
          methods: ['creditcard'],
          // Enable card tokenization for recurring billing
          save_card: true,
          metadata: {
            businessId: checkoutSession.businessId,
            planType: checkoutSession.resolvedPlanType || planType,
            sessionId: checkoutSession.sessionId,
            is_reactivation: isReactivation,
            is_payment_method_update: isPaymentMethodUpdate,
            location_count: checkoutSession.resolvedLocationCount || locationCount
          },
          on_completed: function(payment) {
            console.log('✅ Payment completed:', payment)
            // Moyasar will redirect to callback URL
          },
          on_failure: function(error) {
            console.error('❌ Payment failed:', error)
            
            // Check for configuration errors
            const errorMsg = error.message || ''
            if (errorMsg.toLowerCase().includes('publishable') || 
                errorMsg.toLowerCase().includes('api key')) {
              setError('Payment gateway configuration error. Please verify MOYASAR_PUBLISHABLE_KEY in .env file.')
            } else if (errorMsg.toLowerCase().includes('amount')) {
              setError('Payment amount error. Amount must be at least 1 SAR (100 halalas).')
            } else if (errorMsg.toLowerCase().includes('callback')) {
              setError('Payment callback URL not configured. Please set MOYASAR_CALLBACK_URL in .env file.')
            } else if (errorMsg.toLowerCase().includes('configuration')) {
              setError(t('checkout.configurationError'))
            } else {
              setError(errorMsg || 'Payment failed. Please try again.')
            }
            
            setProcessing(false)
          }
        })

        console.log('✅ Moyasar form initialized successfully')
        initializationInProgressRef.current = false
        setProcessing(false)
      } catch (err) {
        console.error('❌ Failed to initialize Moyasar form:', err)
        initializationInProgressRef.current = false
        
        // Distinguish configuration errors from generic runtime errors
        if (err.code === 'CONFIG_ERROR') {
          setError(t('checkout.configurationError'))
        } else {
          setError(t('checkout.initializationError'))
        }
        
        setProcessing(false)
      }
    }, 100)

    // Set timeout for initialization (5 seconds)
    const timeoutTimer = setTimeout(() => {
      if (initializationInProgressRef.current) {
        console.error('❌ Moyasar initialization timeout')
        setError(t('checkout.initializationError'))
        setProcessing(false)
        initializationInProgressRef.current = false
      }
    }, 5000)

    // Cleanup
    return () => {
      clearTimeout(initTimer)
      clearTimeout(timeoutTimer)
      if (moyasarInstance && typeof moyasarInstance.destroy === 'function') {
        moyasarInstance.destroy()
      }
    }
  }, [checkoutSession, moyasarLoaded, i18n.language, t])

  // Handle back button
  const handleBack = () => {
    navigate('/dashboard/subscription')
  }

  // Handle retry
  const handleRetry = () => {
    setError(null)
    fetchCheckoutSession()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir={i18n.dir()}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('checkout.title')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8" dir={i18n.dir()}>
      <SEO titleKey="checkout.title" noindex={true} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isPaymentMethodUpdate ? t('checkout.updatePaymentMethodTitle') : (isReactivation ? t('checkout.reactivationTitle') : t('checkout.title'))}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isPaymentMethodUpdate ? t('checkout.updatePaymentMethodDescription') : (isReactivation ? t('checkout.reactivationDescription') : t('checkout.subtitle'))}
          </p>
        </div>
        
        {/* Reactivation Notice Banner */}
        {isReactivation && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                  {t('checkout.reactivationNotice')}
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  {t('checkout.reactivationNoticeDescription')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Method Update Notice Banner */}
        {isPaymentMethodUpdate && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  {t('checkout.cardVerificationNotice')}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {t('checkout.cardVerificationDescription')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Retry Banner */}
        {showRetryBanner && (
          <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-orange-600 dark:text-orange-400 text-xl">⚠️</span>
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                {t('checkout.retryBanner')}
              </p>
            </div>
            <button
              onClick={() => setShowRetryBanner(false)}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('checkout.planLabel')}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('checkout.planLabel')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {t(`plans.${planType}.name`)}
                  </p>
                </div>

                {planType === 'enterprise' && locationCount > 1 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('currentPlan.locations')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {locationCount}
                    </p>
                  </div>
                )}

                {paymentData && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('checkout.amountLabel')}
                      </span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {paymentData.amount} {paymentData.currency}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {t('plans.professional.period')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Badges */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400 text-xl">🔒</span>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {t('checkout.securityNote')}
                </p>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {t('checkout.processingNote')}
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {t('checkout.paymentMethodLabel')}
              </h2>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                        {error}
                      </p>
                      <button
                        onClick={handleRetry}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold"
                      >
                        {t('page.retry')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Gateway Loading State */}
              {isGatewayLoading && !error && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('checkout.loadingPaymentForm')}
                  </p>
                </div>
              )}
              
              {/* Moyasar Form Container */}
              <div ref={moyasarFormRef} className="moyasar-form-container">
                {processing && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              
              {/* Fallback UI if Moyasar definitively fails */}
              {!moyasarLoaded && !isGatewayLoading && error && (
                <div className="mt-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-4">
                    {t('checkout.fallbackTitle')}
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                    {t('checkout.fallbackMessage')}
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800 dark:text-yellow-200 mb-6">
                    <li>{t('checkout.fallbackStep1')}</li>
                    <li>{t('checkout.fallbackStep2')}</li>
                    <li>{t('checkout.fallbackStep3')}</li>
                    <li>{t('checkout.fallbackStep4')}</li>
                  </ol>
                  <div className="flex gap-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      {t('checkout.refreshButton')}
                    </button>
                    <a
                      href="mailto:support@madna.me"
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      {t('checkout.contactSupport')}
                    </a>
                  </div>
                </div>
              )}
              
              {/* Debug Info (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                    {t('checkout.debugInfo')}
                  </h4>
                  <div className="space-y-1 text-gray-700 dark:text-gray-300 mb-4">
                    <p><strong>{t('checkout.moyasarStatus')}:</strong> {moyasarLoaded ? '✅ Loaded' : '❌ Not Loaded'}</p>
                    <p><strong>{t('checkout.sessionStatus')}:</strong> {checkoutSession ? '✅ Ready' : '❌ Missing'}</p>
                    {checkoutSession && (
                      <>
                        <p><strong>{t('checkout.amountValidation')}:</strong> {checkoutSession.amount} SAR = {Math.round(checkoutSession.amount * 100)} halalas</p>
                        <p><strong>{t('checkout.keyFormat')}:</strong> {/^pk_(test|live)_/.test(checkoutSession.publishableKey) ? '✅ Valid' : '❌ Invalid'} ({checkoutSession.publishableKey?.substring(0, 15)}...)</p>
                        <p><strong>{t('checkout.paymentMethods')}:</strong> Credit Card</p>
                        <p><strong>{t('checkout.configurationValid')}:</strong> {checkoutSession.publishableKey && checkoutSession.callbackUrl ? '✅ Yes' : '❌ No'}</p>
                      </>
                    )}
                  </div>
                  
                  {/* Common Issues Section */}
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mb-3">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {t('checkout.commonIssues')}
                    </h5>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                      <div>
                        <p className="font-medium">{t('checkout.formNotLoading')}</p>
                        <p className="text-gray-600 dark:text-gray-400 ml-2">→ {t('checkout.formNotLoadingFix')}</p>
                      </div>
                      <div>
                        <p className="font-medium">{t('checkout.invalidKeyError')}</p>
                        <p className="text-gray-600 dark:text-gray-400 ml-2">→ {t('checkout.invalidKeyErrorFix')}</p>
                      </div>
                      <div>
                        <p className="font-medium">{t('checkout.paymentNotRedirecting')}</p>
                        <p className="text-gray-600 dark:text-gray-400 ml-2">→ {t('checkout.paymentNotRedirectingFix')}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Copy Debug Info Button */}
                  <button
                    onClick={copyDebugInfo}
                    className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors font-semibold"
                  >
                    {debugInfoCopied ? t('checkout.debugInfoCopied') : t('checkout.copyDebugInfo')}
                  </button>
                </div>
              )}
            </div>

            {/* Test Card Helper (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    {t('checkout.testCards')}
                  </h3>
                  <span className="px-2 py-1 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-xs font-semibold rounded">
                    {t('checkout.testModeActive')}
                  </span>
                </div>
                
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                  {t('checkout.testCardsDescription')}
                </p>
                
                <div className="space-y-3 mb-4">
                  {[
                    { name: t('checkout.madaSuccess'), number: '4201320111111010', result: t('checkout.paymentSucceeds') },
                    { name: t('checkout.madaFailure'), number: '4201320000013020', result: t('checkout.paymentFails') },
                    { name: t('checkout.visaSuccess'), number: '4111111111111111', result: t('checkout.paymentSucceeds') },
                    { name: t('checkout.visaDeclined'), number: '4000000000000002', result: t('checkout.paymentDeclines') }
                  ].map((card) => (
                    <div key={card.number} className="bg-white dark:bg-gray-800 rounded p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.name}</p>
                        <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{card.number}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {t('checkout.expectedResult')}: {card.result}
                        </p>
                      </div>
                      <button
                        onClick={() => copyCardNumber(card.number)}
                        className="ml-3 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors"
                      >
                        {copiedCard === card.number ? t('checkout.cardNumberCopied') : t('checkout.copyCardNumber')}
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="bg-amber-100 dark:bg-amber-900/30 rounded p-3 mb-3">
                  <p className="text-xs text-amber-900 dark:text-amber-100 mb-2">
                    {t('checkout.testCardInstructions')}
                  </p>
                </div>
                
                <a
                  href="https://docs.moyasar.com/guides/card-payments/test-cards/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                >
                  {t('checkout.viewMoyasarDocs')}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Support Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('checkout.supportText')}
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleBack}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold"
          >
            {t('checkout.backButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
