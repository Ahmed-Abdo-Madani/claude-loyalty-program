import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'
import { getSecureBusinessId } from '../utils/secureAuth'
import EnhancedQRScanner from './EnhancedQRScanner'
import CompactStatsBar from './CompactStatsBar'

function ScannerTab({ analytics: globalAnalytics }) {
  const { t } = useTranslation('dashboard')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanHistory, setScanHistory] = useState([])
  const [scanAnalytics, setScanAnalytics] = useState(null)

  // Load scan history and analytics on component mount
  useEffect(() => {
    loadScanHistory()
    loadScanAnalytics()
  }, [])

  const loadScanHistory = async () => {
    try {
      console.log('🔒 Loading scan history with secure authentication...')
      const response = await secureApi.get(`${endpoints.scanHistory}?limit=10`) // Last 10 scans
      const data = await response.json()
      
      if (data.success) {
        setScanHistory(data.data || [])
        console.log('🔒 Scan history loaded successfully:', data.data?.length || 0)
      }
    } catch (err) {
      console.error('Failed to load scan history:', err)
    }
  }

  const loadScanAnalytics = async () => {
    try {
      console.log('🔒 Loading scan analytics with secure authentication...')
      const response = await secureApi.get(endpoints.scanAnalytics)
      const data = await response.json()
      
      if (data.success) {
        setScanAnalytics(data.data || {})
        console.log('🔒 Scan analytics loaded successfully')
      }
    } catch (err) {
      console.error('Failed to load scan analytics:', err)
    }
  }

  const startCamera = async () => {
    setIsScanning(true)
    setError('')
    setScanResult(null)
  }

  const stopCamera = () => {
    setIsScanning(false)
    setScanResult(null)
  }

  // Handle successful QR scan
  const handleScanSuccess = async (customerToken, offerHash, fullQRData) => {
    console.log('🎉 QR Scan successful:', { customerToken, offerHash, fullQRData })

    try {
      setLoading(true)

      // Close scanner and show processing
      setIsScanning(false)

      // Process the scan using existing logic
      await processScan(customerToken, offerHash)

    } catch (error) {
      console.error('❌ Scan processing failed:', error)
      setError('Processing failed: ' + error.message)
      setLoading(false)
    }
  }

  // Handle scan errors
  const handleScanError = (error) => {
    console.error('❌ QR Scan failed:', error)
    setError(error.message)
  }

  const simulateScan = async () => {
    try {
      setLoading(true)
      setError('')

      console.log('🎯 Starting demo scan simulation...')

      // Get secure business ID instead of localStorage
      const businessId = getSecureBusinessId()
      if (!businessId) {
        throw new Error('No business ID found. Please log in again.')
      }

      const demoCustomerId = 'demo-customer-123'
      const timestamp = Date.now()
      const tokenData = `${demoCustomerId}:${businessId}:${timestamp}`

      // Create a fresh customer token (same format as walletPassGenerator)
      const demoCustomerToken = btoa(tokenData).substring(0, 24)

      // For demo, we'll use the test endpoint instead of trying to match offer hashes
      // This will create a proper test scenario with the user's actual offers
      console.log('🧪 Using test endpoint for demo scan...')

      // Call the test endpoint instead of direct scanning
      const response = await secureApi.post(endpoints.testDualQRFlow)
      const testResponse = await response.json()

      if (testResponse.success) {
        console.log('✅ Test flow completed:', testResponse.data)

        // Extract the test tokens from response
        const { testStep2_CustomerToken, testStep3_OfferHash } = testResponse.data

        // Now process the scan with these test tokens
        await processScan(testStep2_CustomerToken, testStep3_OfferHash)
        return
      } else {
        throw new Error('Test endpoint failed: ' + testResponse.message)
      }
    } catch (err) {
      console.error('Demo scan failed:', err)
      setError('Demo scan failed: ' + err.message)
      setLoading(false)
    }
  }

  const processScan = async (customerToken, offerHash) => {
    try {
      setLoading(true)
      setError('')

      console.log('🔍 Processing scan:', { customerToken, offerHash })

      // First verify the scan
      const verifyResponse = await secureApi.get(`${endpoints.scanVerify}/${customerToken}/${offerHash}`)
      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        throw new Error(verifyData.message)
      }

      const { data } = verifyData

      // Comment 1 & 2: Auto-award without showing verification step
      // If customer can be scanned, proceed with progress update immediately
      if (data.canScan) {
        const scanResponse = await secureApi.post(`${endpoints.scanProgress}/${customerToken}/${offerHash}`)
        const scanData = await scanResponse.json()

        if (scanData.success) {
          // Check if reward was earned - auto-confirm prize immediately
          if (scanData.data.rewardEarned) {
            // Auto-confirm prize (no modal, no user interaction)
            try {
              // Comment 1: Extract and validate customer/offer IDs
              const customerId = scanData.data.customer?.id
              const offerId = scanData.data.offer?.id

              if (!customerId || !offerId) {
                throw new Error('Missing customer or offer ID for prize confirmation')
              }

              const confirmResponse = await secureApi.post(
                `${endpoints.scanConfirmPrize}/${customerId}/${offerId}`,
                { notes: '' }
              )

              // Comment 3: Validate response status before parsing JSON
              if (!confirmResponse.ok) {
                throw new Error(`Prize confirmation failed: ${confirmResponse.status}`)
              }

              const confirmData = await confirmResponse.json()

              if (confirmData.success) {
                // Comment 2: Normalize progress data to snake_case for UI consistency
                const normalizedProgress = {
                  current_stamps: confirmData.progress?.currentStamps ?? confirmData.progress?.current_stamps ?? 0,
                  max_stamps: confirmData.progress?.maxStamps ?? confirmData.progress?.max_stamps ?? 0,
                  is_completed: confirmData.progress?.isCompleted ?? confirmData.progress?.is_completed ?? false,
                  rewards_claimed: confirmData.progress?.rewardsClaimed ?? confirmData.progress?.rewards_claimed ?? 0
                }

                // Show success with fresh data from confirmation
                setScanResult({
                  type: 'success',
                  rewardEarned: true,
                  prizeFulfilled: true,
                  tier: confirmData.tier,
                  tierUpgrade: confirmData.tierUpgrade,
                  totalCompletions: confirmData.totalCompletions,
                  progress: normalizedProgress, // Normalized fresh data with reset stamps
                  customerId: customerId,
                  offerId: offerId,
                  offer: scanData.data.offer,
                  message: scanData.message
                })
              } else {
                // Prize confirmation failed, but still show result
                setScanResult({
                  type: 'success',
                  rewardEarned: true,
                  prizeFulfilled: false,
                  progress: scanData.data.progress,
                  customerId: customerId,
                  offerId: offerId,
                  offer: scanData.data.offer,
                  confirmError: confirmData.error || 'Prize confirmation failed',
                  message: scanData.message
                })
              }
            } catch (confirmError) {
              // Handle auto-confirm errors without blocking flow
              console.error('Auto-confirm error:', confirmError)
              setScanResult({
                type: 'success',
                rewardEarned: true,
                prizeFulfilled: false,
                progress: scanData.data.progress,
                customerId: scanData.data.customer?.id,
                offerId: scanData.data.offer?.id,
                offer: scanData.data.offer,
                confirmError: 'Prize confirmation failed - wallet update may be delayed',
                message: scanData.message
              })
            }
          } else {
            // Regular stamp added (no reward earned)
            setScanResult({
              type: 'success',
              ...scanData.data,
              message: scanData.message
            })
          }

          // Reload data
          await loadScanHistory()
          await loadScanAnalytics()
        } else {
          throw new Error(scanData.message)
        }
      } else {
        // Show completed state when customer already finished program
        setScanResult({
          type: 'completed',
          ...data,
          message: 'Customer has already completed this loyalty program!'
        })
      }

    } catch (err) {
      setError(err.message || 'Failed to process scan')
      setScanResult(null)
    } finally {
      setLoading(false)
    }
  }


  const clearResults = () => {
    setScanResult(null)
    setError('')
  }

  // Comment 5: Manual prize confirmation for already-completed progress
  const handleManualConfirm = async () => {
    if (!scanResult?.customer?.id || !scanResult?.offer?.id) {
      setError('Missing customer or offer information')
      return
    }

    // Check if progress is completed
    if (!scanResult?.progress?.is_completed && !scanResult?.progress?.isCompleted) {
      setError('Progress not completed')
      return
    }

    try {
      setLoading(true)
      setError('')

      const customerId = scanResult.customer.id
      const offerId = scanResult.offer.id

      const confirmResponse = await secureApi.post(
        `${endpoints.scanConfirmPrize}/${customerId}/${offerId}`,
        { notes: 'Manual confirmation from completed state' }
      )

      if (!confirmResponse.ok) {
        throw new Error(`Prize confirmation failed: ${confirmResponse.status}`)
      }

      const confirmData = await confirmResponse.json()

      if (confirmData.success) {
        // Normalize progress data to snake_case for UI consistency
        const normalizedProgress = {
          current_stamps: confirmData.progress?.currentStamps ?? confirmData.progress?.current_stamps ?? 0,
          max_stamps: confirmData.progress?.maxStamps ?? confirmData.progress?.max_stamps ?? 0,
          is_completed: confirmData.progress?.isCompleted ?? confirmData.progress?.is_completed ?? false,
          rewards_claimed: confirmData.progress?.rewardsClaimed ?? confirmData.progress?.rewards_claimed ?? 0
        }

        // Update to success state with confirmation data
        setScanResult({
          type: 'success',
          rewardEarned: true,
          prizeFulfilled: true,
          tier: confirmData.tier,
          tierUpgrade: confirmData.tierUpgrade,
          totalCompletions: confirmData.totalCompletions,
          progress: normalizedProgress,
          customerId: customerId,
          offerId: offerId,
          offer: scanResult.offer,
          customer: scanResult.customer,
          message: 'Prize confirmed and new cycle started!'
        })

        // Reload data
        await loadScanHistory()
        await loadScanAnalytics()
      } else {
        throw new Error(confirmData.error || 'Prize confirmation failed')
      }
    } catch (err) {
      setError(err.message || 'Failed to confirm prize')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="compact-spacing">
      {/* Enhanced QR Scanner Overlay */}
      <EnhancedQRScanner
        isActive={isScanning}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onClose={stopCamera}
      />

      {/* Compact Stats Bar - Global analytics from Dashboard */}
      {globalAnalytics && <CompactStatsBar analytics={globalAnalytics} />}

      {/* Header Section - Mobile-first */}
      <div className="compact-header">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('scanner.qrScanner')}</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">{t('scanner.scanToAddStamps')}</p>
      </div>

      <div className="compact-spacing">

        {/* Scanning Interface */}
        <div className="compact-card mobile-compact">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white compact-header flex items-center">
            <span className="mr-2">🔍</span>
            {t('scanner.qrCodeScanner')}
          </h3>

          {!isScanning ? (
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 hover:border-primary/30 hover:shadow-md transition-all">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('scanner.readyToScan')}</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">{t('scanner.positionQrCode')}</p>

                <div className="flex justify-center">
                  <button
                    onClick={startCamera}
                    className="bg-primary hover:bg-primary/90 active:scale-95 text-white px-6 sm:px-8 py-3 rounded-xl text-base font-medium transition-all duration-200 flex items-center justify-center space-x-3 shadow-sm min-h-[44px] w-full sm:w-auto touch-target hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span>{t('scanner.startCameraScanner')}</span>
                  </button>
                </div>

              </div>
            </div>
          ) : null}

        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center mr-3">
                <span className="text-red-600 dark:text-red-400">⚠️</span>
              </div>
              <span className="text-red-800 dark:text-red-300 flex-1">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-3 p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Scan Results */}
        {scanResult && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-2">📊</span>
              Scan Results
            </h3>

            {scanResult.type === 'success' && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/30 rounded-xl p-6 border-l-4 border-green-500">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1">{t('scanner.stampAwarded')}</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">{scanResult.offer?.title}</p>
                </div>

                {/* Transaction Summary */}
                <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-4 mb-4">
                  {(() => {
                    // Comment 4: Defensive progress calculation with field name support
                    const current = scanResult.progress?.current_stamps ?? scanResult.progress?.currentStamps ?? 0
                    const max = scanResult.progress?.max_stamps ?? scanResult.progress?.maxStamps ?? 0
                    const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0

                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">{t('scanner.newProgress')}</span>
                          <span className="text-3xl font-bold text-green-900 dark:text-green-100">
                            {current}/{max}
                          </span>
                        </div>
                        <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-green-600 dark:bg-green-400 h-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Reward Earned Banner */}
                {scanResult.rewardEarned && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-4 mb-4 shadow-xl">
                    <div className="flex items-center justify-center">
                      <span className="text-3xl mr-3">🎉</span>
                      <div className="text-center">
                        <div className="font-bold text-xl">{t('scanner.rewardCompleted')}</div>
                        <div className="text-yellow-100 text-sm">{t('scanner.customerEarnedReward')}</div>
                      </div>
                      <span className="text-3xl ml-3">🎉</span>
                    </div>
                  </div>
                )}

                {/* Display tier information if prize was fulfilled */}
                {scanResult.prizeFulfilled && scanResult.tier && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {scanResult.tier.currentTier && (
                        <>
                          {scanResult.tier.currentTier.icon} {scanResult.tier.currentTier.name}
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {scanResult.totalCompletions} {scanResult.totalCompletions === 1 ? t('scanner.reward') : t('scanner.rewards')} {t('scanner.earned')}!
                    </p>
                  </div>
                )}

                {/* New cycle indicator with fresh progress data */}
                {scanResult.prizeFulfilled && (
                  <div className="mb-4 text-gray-600 dark:text-gray-400">
                    🔄 {t('scanner.newCycleStarted')}: {scanResult.progress?.currentStamps || 0} {t('common.of')} {scanResult.progress?.maxStamps || 5} {t('scanner.stamps')}
                  </div>
                )}

                {/* Show confirmation error if auto-confirm failed */}
                {scanResult.confirmError && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ {t('scanner.walletUpdateDelayed')}
                    </p>
                  </div>
                )}

                {/* Tier upgrade celebration */}
                {scanResult.tier && scanResult.tierUpgrade && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-200 mb-1">
                      🎉 {t('scanner.tierUpgrade')}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {t('scanner.customerReachedTier')} {scanResult.tier.currentTier.name}!
                    </p>
                  </div>
                )}

                {/* Milestone celebration */}
                {scanResult.totalCompletions && [5, 10, 25, 50, 100].includes(scanResult.totalCompletions) && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                      🎊 {t('scanner.milestone')} {scanResult.totalCompletions} {t('scanner.rewardsEarned')}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => startCamera()}
                    className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                  >
                    {t('scanner.scanNextCustomer')}
                  </button>
                  <button
                    onClick={clearResults}
                    className="px-4 py-3 bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 text-green-700 dark:text-green-300 rounded-xl font-medium transition-all"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            )}

            {scanResult.type === 'completed' && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/30 rounded-xl p-6 border-l-4 border-yellow-500">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-3xl">🏆</span>
                  </div>
                  <h4 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-1">{t('scanner.alreadyCompleted')}</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('scanner.rewardEarned')}</p>
                </div>

                <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-4 mb-4">
                  <div className="text-center text-yellow-800 dark:text-yellow-200 font-medium">
                    {t('scanner.customerCompletedProgram')}
                  </div>
                </div>

                {/* Comment 5: Manual confirmation option for pending prizes */}
                {(scanResult.progress?.is_completed || scanResult.progress?.isCompleted) && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3 text-center">
                      💡 {t('scanner.fulfillPrizeQuestion')}
                    </p>
                    <button
                      onClick={handleManualConfirm}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-[0.98] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                    >
                      {loading ? t('scanner.confirming') : t('scanner.confirmPrizeReset')}
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => startCamera()}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 active:scale-[0.98] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                  >
                    {t('scanner.scanNextCustomer')}
                  </button>
                  <button
                    onClick={clearResults}
                    className="px-4 py-3 bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 text-yellow-700 dark:text-yellow-300 rounded-xl font-medium transition-all"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scanner Analytics - Compact Horizontal Layout */}
        {scanAnalytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500">
              <div className="w-8 h-8 bg-blue-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-base">📅</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100 truncate">{scanAnalytics.scansToday || 0}</div>
                <div className="text-xs text-blue-700 dark:text-blue-300 truncate">{t('scanner.scansToday')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500">
              <div className="w-8 h-8 bg-green-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-base">🎁</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100 truncate">{scanAnalytics.rewardsEarned || 0}</div>
                <div className="text-xs text-green-700 dark:text-green-300 truncate">{t('scanner.rewardsEarned')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border-l-4 border-indigo-500">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-base">👥</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-indigo-900 dark:text-indigo-100 truncate">{scanAnalytics.uniqueCustomers || 0}</div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 truncate">{t('scanner.uniqueCustomers')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500">
              <div className="w-8 h-8 bg-purple-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-base">📊</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-100 truncate">{scanAnalytics.totalScans || 0}</div>
                <div className="text-xs text-purple-700 dark:text-purple-300 truncate">{t('scanner.totalScans')}</div>
              </div>
            </div>
          </div>
        )}


        {/* Recent Scan History - Mobile cards, desktop table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">📋</span>
            {t('scanner.recentScanHistory')}
          </h3>

          {scanHistory.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-xl sm:text-2xl">📊</span>
              </div>
              <h4 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">{t('scanner.noScansYet')}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('scanner.startScanningToSeeHistory')}</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="block md:hidden space-y-3">
                {scanHistory.map((scan) => (
                  <div key={scan.public_id || scan.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{scan.offerTitle}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{scan.offerType}</div>
                      </div>
                      {scan.rewardEarned && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <span className="mr-1">🎉</span>
                          {t('scanner.earned')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">{scan.progressBefore}</span>
                        <svg className="w-4 h-4 text-primary rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="font-medium text-primary">{scan.progressAfter}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(scan.scannedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('scanner.time')}</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('scanner.offer')}</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('scanner.progress')}</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('scanner.reward')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.map((scan, index) => (
                      <tr key={scan.public_id || scan.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${index === scanHistory.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="py-4 px-2">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">
                            {formatDate(scan.scannedAt)}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{scan.offerTitle}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{scan.offerType}</div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{scan.progressBefore}</span>
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className="text-sm font-medium text-primary">{scan.progressAfter}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          {scan.rewardEarned ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              <span className="mr-1">🎉</span>
                              {t('scanner.earned')}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScannerTab