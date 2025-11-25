import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { secureApi, endpoints } from '../config/api'
import { setSubscriptionData } from '../utils/secureAuth'
import SEO from '../components/SEO'

export default function PaymentCallbackPage() {
  const { t, i18n } = useTranslation('subscription')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // State management
  const [verifying, setVerifying] = useState(true)
  const [paymentResult, setPaymentResult] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const [pollAttempts, setPollAttempts] = useState(0)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  
  // Refs for timer cleanup and polling
  const pollTimeoutRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const pollAttemptsRef = useRef(0)

  // Extract Moyasar redirect parameters
  const moyasarPaymentId = searchParams.get('id')
  const status = searchParams.get('status')
  const message = searchParams.get('message')
  const isReactivation = searchParams.get('reactivation') === 'true'
  const isPaymentMethodUpdate = searchParams.get('update_payment') === 'true'
  const planType = searchParams.get('plan')
  const locationCount = parseInt(searchParams.get('locations')) || 1

  // Track the last processed payment ID to prevent duplicate API calls
  // This prevents issues from React StrictMode double-mounting in development
  // and potential duplicate calls from navigation/refresh, while still allowing
  // verification when the payment ID legitimately changes on a still-mounted component
  const lastPaymentIdRef = useRef(null)

  // NOTE: React.StrictMode (enabled in src/main.jsx) intentionally double-invokes
  // effects in development to help detect side effects. The lastPaymentIdRef prevents
  // duplicate API calls while still allowing StrictMode to do its job.
  useEffect(() => {
    // Log URL parameters for debugging
    console.log('Callback URL params:', Object.fromEntries(searchParams))
    console.log('Is reactivation flow:', isReactivation)
    console.log('Last processed payment ID:', lastPaymentIdRef.current)
    console.log('Current payment ID:', moyasarPaymentId)
    
    // Prevent duplicate API calls for the same payment ID (React StrictMode, navigation, or refresh)
    // Allow verification if payment ID changes (legitimate new payment on same component instance)
    if (lastPaymentIdRef.current === moyasarPaymentId && moyasarPaymentId !== null) {
      console.log('Skipping duplicate verifyPayment call for same payment ID')
      return
    }
    
    if (!moyasarPaymentId) {
      // Check if payment was declined without redirect
      if (status === 'failed') {
        setPaymentResult({
          success: false,
          error: t('paymentCallback.paymentDeclinedMessage')
        })
      } else {
        setPaymentResult({
          success: false,
          error: t('paymentCallback.paymentNotCompletedMessage')
        })
      }
      setVerifying(false)
      return
    }

    // Mark this payment ID as processed before invoking to prevent race conditions
    lastPaymentIdRef.current = moyasarPaymentId
    verifyPayment()
  }, [moyasarPaymentId])

  // Verify payment with backend
  const verifyPayment = async () => {
    try {
      setVerifying(true)

      // Use different endpoint based on flow type
      let endpoint, requestBody
      if (isPaymentMethodUpdate) {
        endpoint = endpoints.subscriptionPaymentMethod
        requestBody = { moyasarPaymentId }
      } else if (isReactivation) {
        endpoint = endpoints.subscriptionReactivate
        requestBody = { moyasarPaymentId, planType, locationCount }
      } else {
        endpoint = endpoints.subscriptionPaymentCallback
        requestBody = { moyasarPaymentId, status, message }
      }

      const response = isPaymentMethodUpdate 
        ? await secureApi.put(endpoint, requestBody)
        : await secureApi.post(endpoint, requestBody)

      if (!response.ok) {
        const errorData = await response.json()
        
        // Comment 3: Handle 404/500 from reactivation endpoint specifically
        if (isReactivation && (response.status === 404 || response.status === 500)) {
          setPaymentResult({
            success: false,
            error: t('reactivation.failed')
          })
          setVerifying(false)
          return
        }
        
        // Extract verification details and issues for error state
        const verificationDetails = errorData.verificationDetails
        const issues = errorData.issues || []
        
        // Check error type using errorCode from backend (4xx errors only)
        if (response.status >= 400 && response.status < 500) {
          const errorCode = errorData.errorCode
          let errorMessage = errorData.message || 'Payment verification failed'
          
          // Map backend error codes to localized messages
          // Branch on isPaymentMethodUpdate for payment-method-specific errors
          if (isPaymentMethodUpdate) {
            // Payment method update specific errors
            if (errorCode === 'PAYMENT_ID_REQUIRED') {
              errorMessage = t('paymentCallback.paymentMethodUpdateFailed')
            } else if (errorCode === 'VERIFICATION_FAILED') {
              errorMessage = t('paymentCallback.cardVerificationFailed')
            } else if (errorCode === 'PAYMENT_NOT_FOUND') {
              errorMessage = t('paymentCallback.paymentMethodUpdateFailed')
            } else if (errorCode === 'MOYASAR_PAYMENT_NOT_FOUND') {
              errorMessage = t('paymentCallback.cardVerificationNotFound')
            } else if (errorCode === 'TOKEN_EXTRACTION_FAILED') {
              errorMessage = t('paymentCallback.cardTokenFailed')
            } else if (errorCode === 'NO_SUBSCRIPTION_FOUND') {
              errorMessage = t('paymentCallback.noSubscriptionForUpdate')
            } else {
              // Generic payment method update error
              errorMessage = errorData.message || t('paymentCallback.paymentMethodUpdateFailed')
            }
          } else {
            // Subscription activation/reactivation errors
            if (errorCode === 'PAYMENT_ID_REQUIRED') {
              errorMessage = t('paymentCallback.paymentNotCompleted')
            } else if (errorCode === 'STATUS_MISMATCH') {
              errorMessage = t('paymentCallback.statusMismatch')
            } else if (errorCode === 'VERIFICATION_FAILED') {
              errorMessage = t('paymentCallback.paymentDeclinedMessage')
            } else if (errorCode === 'PAYMENT_NOT_FOUND') {
              errorMessage = t('paymentCallback.paymentNotCompleted')
            } else if (errorCode === 'AMOUNT_MISMATCH') {
              errorMessage = t('paymentCallback.amountMismatch')
              // Add specific amount details if available
              if (verificationDetails?.expectedAmount && verificationDetails?.actualAmount) {
                errorMessage += ` (${t('paymentCallback.expectedAmount')}: ${verificationDetails.expectedAmount} SAR, ${t('paymentCallback.actualAmount')}: ${verificationDetails.actualAmount} SAR)`
              }
            } else if (errorCode === 'CURRENCY_MISMATCH') {
              errorMessage = t('paymentCallback.currencyMismatch')
            } else if (errorCode === 'SESSION_LINKING_FAILED') {
              // FIXED: Use errorData.transactionId and moyasarPaymentId from query string
              errorMessage = t('paymentCallback.sessionLinkingFailed', { 
                transactionId: errorData.transactionId || moyasarPaymentId 
              })
            } else if (errorCode === 'MOYASAR_PAYMENT_NOT_FOUND') {
              errorMessage = t('paymentCallback.moyasarPaymentNotFound')
            }
          }
          
          // Create error with verification details attached
          const error = new Error(errorMessage)
          error.verificationDetails = verificationDetails
          error.issues = issues
          error.errorCode = errorCode
          throw error
        }
        
        // Fallback to message if errorCode is missing or unrecognized
        const error = new Error(errorData.message || 'Payment verification failed')
        error.verificationDetails = verificationDetails
        error.issues = issues
        throw error
      }

      const data = await response.json()

      if (data.success) {
        // Payment successful
        if (isPaymentMethodUpdate) {
          // Payment method update success
          setPaymentResult({
            success: true,
            isPaymentMethodUpdate: true,
            paymentMethod: data.data,
            message: data.message
          })
        } else {
          // Subscription activation/reactivation success
          setPaymentResult({
            success: true,
            isReactivation,
            subscription: data.subscription,
            planName: data.subscription?.plan_type,
            amount: data.subscription?.amount,
            nextBillingDate: data.subscription?.next_billing_date
          })

          // Update localStorage with new subscription data (Comment 1: use helper)
          if (data.subscription) {
            const normalizedSubscription = {
              current_plan: data.subscription.plan_type,
              subscription_status: data.subscription.status,
              trial_info: null,
              limits: data.limits || {},
              usage: data.usage || {},
              retry_count: data.subscription.retry_count || 0,
              grace_period_end: data.subscription.grace_period_end || null,
              next_retry_date: data.subscription.next_retry_date || null
            }
            setSubscriptionData(normalizedSubscription)
          }
        }

        // Comment 1: Update business status using helper after payment
        if (isReactivation) {
          const { updateStatusAfterPayment } = await import('../utils/secureAuth')
          updateStatusAfterPayment({
            businessStatus: 'active',
            subscriptionStatus: 'active',
            subscriptionData: data.subscription
          })
        }

        // Start countdown for auto-redirect
        startCountdown()
      } else {
        // Payment failed
        setPaymentResult({
          success: false,
          error: data.error || message || 'Payment could not be processed'
        })
      }

      setVerifying(false)
    } catch (err) {
      console.error('Payment verification failed:', err)
      
      // If status is initiated or pending, poll backend using ref to avoid stale closure
      if ((status === 'initiated' || !status) && pollAttemptsRef.current < 10) {
        pollAttemptsRef.current += 1
        setPollAttempts(pollAttemptsRef.current) // Update state for display
        pollTimeoutRef.current = setTimeout(verifyPayment, 2000) // Poll every 2 seconds
        return
      }

      // Timeout after 10 attempts
      if (pollAttemptsRef.current >= 10) {
        setPaymentResult({
          success: false,
          error: t('paymentCallback.verificationTimeoutMessage')
        })
      } else {
        setPaymentResult({
          success: false,
          error: err.message || 'Failed to verify payment. Please contact support.',
          verificationDetails: err.verificationDetails,
          issues: err.issues,
          errorCode: err.errorCode
        })
      }
      setVerifying(false)
    }
  }

  // Start countdown timer for auto-redirect
  const startCountdown = () => {
      countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          // Different redirect targets based on flow type
          if (isPaymentMethodUpdate) {
            navigate('/dashboard/subscription')
          } else {
            navigate('/dashboard?tab=billing-subscription')
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  // Handle retry payment
  const handleRetry = () => {
    const planDetails = {
      planType: paymentResult?.subscription?.plan_type || 'professional',
      locationCount: 1
    }
    navigate('/subscription/checkout?retry=true', { state: planDetails })
  }
  
  // Copy error details to clipboard
  const copyErrorDetails = () => {
    const errorDetails = {
      transactionId: moyasarPaymentId,
      status,
      message,
      error: paymentResult?.error,
      timestamp: new Date().toISOString()
    }
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
    alert(t('paymentCallback.errorDetailsCopied'))
  }

  // Handle continue to dashboard
  const handleContinue = () => {
    if (isPaymentMethodUpdate) {
      navigate('/dashboard/subscription')
    } else {
      navigate('/dashboard?tab=billing-subscription')
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir={i18n.dir()}>
        <SEO titleKey="paymentCallback.verifying" noindex={true} />
        
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('paymentCallback.verifying')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {pollAttempts > 0 && `Attempt ${pollAttempts}/10`}
          </p>
        </div>
      </div>
    )
  }

  if (paymentResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12" dir={i18n.dir()}>
        <SEO titleKey="paymentCallback.success" noindex={true} />
        
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            {/* Success Icon */}
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
              {paymentResult.isPaymentMethodUpdate 
                ? t('paymentCallback.paymentMethodUpdated') 
                : (paymentResult.isReactivation ? t('reactivation.success') : t('paymentCallback.success'))}
            </h1>
            
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              {paymentResult.isPaymentMethodUpdate 
                ? t('paymentCallback.paymentMethodUpdatedMessage') 
                : (paymentResult.isReactivation ? t('reactivation.redirecting') : t('paymentCallback.successMessage'))}
            </p>

            {/* Subscription Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-3">
              {paymentResult.isPaymentMethodUpdate ? (
                // Payment method update details
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('paymentCallback.cardBrand')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">
                      {paymentResult.paymentMethod?.brand || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('paymentCallback.lastFourDigits')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      •••• {paymentResult.paymentMethod?.last4 || '****'}
                    </span>
                  </div>
                  
                  {moyasarPaymentId && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {t('paymentCallback.transactionId')}
                      </span>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {moyasarPaymentId.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                </>
              ) : (
                // Subscription activation details
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('checkout.planLabel')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">
                      {t(`plans.${paymentResult.planName}.name`)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('checkout.amountLabel')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {paymentResult.amount} SAR
                    </span>
                  </div>
                  
                  {paymentResult.nextBillingDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Next Billing Date
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {new Date(paymentResult.nextBillingDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                  )}
                  
                  {moyasarPaymentId && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {t('paymentCallback.transactionId')}
                      </span>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {moyasarPaymentId.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Auto-redirect countdown */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('paymentCallback.autoRedirect', { seconds: countdown })}
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleContinue}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold"
            >
              {t('paymentCallback.continueButton')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Payment Failed
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12" dir={i18n.dir()}>
      <SEO titleKey="paymentCallback.failure" noindex={true} />
      
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Error Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
            {t('paymentCallback.failure')}
          </h1>
          
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            {t('paymentCallback.failureMessage')}
          </p>

          {/* Error Details */}
          {paymentResult?.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-900 dark:text-red-100">
                {paymentResult.error}
              </p>
              
              {/* Verification Issues List */}
              {paymentResult.issues && paymentResult.issues.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                  <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-2">
                    {t('paymentCallback.verificationIssues')}:
                  </p>
                  <ul className="text-xs text-red-800 dark:text-red-200 list-disc list-inside space-y-1">
                    {paymentResult.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Suggest wait and retry for transient issues */}
              {(status === 'initiated' || status === 'pending') && (
                <p className="mt-3 text-xs text-red-800 dark:text-red-200">
                  {t('paymentCallback.waitAndRetry')}
                </p>
              )}
            </div>
          )}

          {moyasarPaymentId && (
            <div className="text-center mb-6">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t('paymentCallback.transactionId')}: {moyasarPaymentId.substring(0, 20)}...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-semibold"
            >
              {t('paymentCallback.retryButton')}
            </button>
            
            <button
              onClick={handleContinue}
              className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
            >
              {t('paymentCallback.continueButton')}
            </button>
          </div>

          {/* Support Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('checkout.supportText')}
            </p>
          </div>
          
          {/* View Technical Details Button (Development Only) */}
          {process.env.NODE_ENV === 'development' && paymentResult?.verificationDetails && (
            <div className="mt-6">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                {showTechnicalDetails ? t('paymentCallback.hideTechnicalDetails') : t('paymentCallback.viewTechnicalDetails')}
                <svg 
                  className={`w-4 h-4 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showTechnicalDetails && (
                <div className="mt-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {t('paymentCallback.verificationIssues')}
                  </h4>
                  
                  {/* Verification Details */}
                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>{t('paymentCallback.statusMismatch')}:</span>
                      <span>{paymentResult.verificationDetails.statusMatch ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('paymentCallback.amountMismatch')}:</span>
                      <span>{paymentResult.verificationDetails.amountMatch ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('paymentCallback.currencyMismatch')}:</span>
                      <span>{paymentResult.verificationDetails.currencyMatch ? '✅' : '❌'}</span>
                    </div>
                    
                    {/* Amount Details */}
                    {!paymentResult.verificationDetails.amountMatch && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="font-semibold mb-1">Amount Details:</p>
                        <p>{t('paymentCallback.expectedAmount')}: {paymentResult.verificationDetails.expectedAmount} SAR</p>
                        <p>{t('paymentCallback.actualAmount')}: {paymentResult.verificationDetails.actualAmount} SAR</p>
                        <p>Difference: {paymentResult.verificationDetails.amountDifference?.toFixed(2)} SAR</p>
                      </div>
                    )}
                    
                    {/* Raw Verification Data */}
                    <details className="mt-3">
                      <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                        Raw Verification Data
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                        {JSON.stringify(paymentResult.verificationDetails, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Debug Panel for Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Debug Information
              </h3>
              <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                <p><strong>Payment ID:</strong> {moyasarPaymentId || 'N/A'}</p>
                <p><strong>Status:</strong> {status || 'N/A'}</p>
                <p><strong>Message:</strong> {message || 'N/A'}</p>
                <p><strong>Poll Attempts:</strong> {pollAttempts}/10</p>
                <p><strong>Error Code:</strong> {paymentResult?.errorCode || 'N/A'}</p>
              </div>
              <button
                onClick={copyErrorDetails}
                className="mt-3 w-full py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
              >
                {t('paymentCallback.copyErrorDetails')}
              </button>
              <a
                href="https://docs.moyasar.com/guides/card-payments/test-cards/"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-center text-xs text-yellow-700 dark:text-yellow-300 hover:underline"
              >
                View Moyasar Test Cards
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
