import { useState, useEffect, useRef } from 'react'
import { endpoints, secureApi } from '../config/api'
import { getSecureBusinessId } from '../utils/secureAuth'
import EnhancedQRScanner from './EnhancedQRScanner'
import CompactStatsBar from './CompactStatsBar'

function ScannerTab({ analytics: globalAnalytics }) {
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
          // Set result directly to success without intermediate verification state
          setScanResult({
            type: 'success',
            ...scanData.data,
            message: scanData.message
          })

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
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">QR Scanner</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Scan customer wallet pass QR codes to update loyalty progress</p>
      </div>

      <div className="compact-spacing">

        {/* Scanning Interface */}
        <div className="compact-card mobile-compact">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white compact-header flex items-center">
            <span className="mr-2">🔍</span>
            QR Code Scanner
          </h3>

          {!isScanning ? (
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 hover:border-primary/30 hover:shadow-md transition-all">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">Ready to Scan</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">Position the customer's QR code in front of your camera</p>

                <div className="flex justify-center">
                  <button
                    onClick={startCamera}
                    className="bg-primary hover:bg-primary/90 active:scale-95 text-white px-6 sm:px-8 py-3 rounded-xl text-base font-medium transition-all duration-200 flex items-center justify-center space-x-3 shadow-sm min-h-[44px] w-full sm:w-auto touch-target hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span>Start Camera Scanner</span>
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
                  <h4 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1">Stamp Awarded!</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">{scanResult.offer?.title}</p>
                </div>

                {/* Transaction Summary */}
                <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">New Progress</span>
                    <span className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {scanResult.progress?.current_stamps}/{scanResult.progress?.max_stamps}
                    </span>
                  </div>
                  <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-green-600 dark:bg-green-400 h-full transition-all duration-500"
                      style={{ width: `${(scanResult.progress?.current_stamps / scanResult.progress?.max_stamps) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Reward Earned Banner */}
                {scanResult.rewardEarned && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-4 mb-4 shadow-xl">
                    <div className="flex items-center justify-center">
                      <span className="text-3xl mr-3">🎉</span>
                      <div className="text-center">
                        <div className="font-bold text-xl">REWARD COMPLETED!</div>
                        <div className="text-yellow-100 text-sm">Customer earned their reward</div>
                      </div>
                      <span className="text-3xl ml-3">🎉</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => startCamera()}
                    className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                  >
                    Scan Next Customer
                  </button>
                  <button
                    onClick={clearResults}
                    className="px-4 py-3 bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 text-green-700 dark:text-green-300 rounded-xl font-medium transition-all"
                  >
                    Close
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
                  <h4 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-1">Already Completed!</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">This reward has been earned</p>
                </div>

                <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-4 mb-4">
                  <div className="text-center text-yellow-800 dark:text-yellow-200 font-medium">
                    Customer has already completed this loyalty program and claimed their reward
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => startCamera()}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 active:scale-[0.98] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                  >
                    Scan Next Customer
                  </button>
                  <button
                    onClick={clearResults}
                    className="px-4 py-3 bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 text-yellow-700 dark:text-yellow-300 rounded-xl font-medium transition-all"
                  >
                    Close
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
                <div className="text-xs text-blue-700 dark:text-blue-300 truncate">Scans Today</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500">
              <div className="w-8 h-8 bg-green-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-base">🎁</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100 truncate">{scanAnalytics.rewardsEarned || 0}</div>
                <div className="text-xs text-green-700 dark:text-green-300 truncate">Rewards Earned</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border-l-4 border-indigo-500">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-base">👥</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-indigo-900 dark:text-indigo-100 truncate">{scanAnalytics.uniqueCustomers || 0}</div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 truncate">Unique Customers</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500">
              <div className="w-8 h-8 bg-purple-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-base">📊</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-100 truncate">{scanAnalytics.totalScans || 0}</div>
                <div className="text-xs text-purple-700 dark:text-purple-300 truncate">Total Scans</div>
              </div>
            </div>
          </div>
        )}


        {/* Recent Scan History - Mobile cards, desktop table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">📋</span>
            Recent Scan History
          </h3>

          {scanHistory.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-xl sm:text-2xl">📊</span>
              </div>
              <h4 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No scans yet</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start scanning customer QR codes to see history here.</p>
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
                          Earned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">{scan.progressBefore}</span>
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Time</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Offer</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Progress</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Reward</th>
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
                              Earned
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