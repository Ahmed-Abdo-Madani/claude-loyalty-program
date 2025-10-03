import { useState, useEffect, useRef } from 'react'
import { endpoints, secureApi } from '../config/api'
import { getSecureBusinessId } from '../utils/secureAuth'
import EnhancedQRScanner from './EnhancedQRScanner'

function ScannerTab() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanHistory, setScanHistory] = useState([])
  const [analytics, setAnalytics] = useState(null)

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
        setAnalytics(data.data || {})
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

      console.log('🔧 Generated demo tokens:', {
        businessId,
        customerId: demoCustomerId,
        token: demoCustomerToken,
        hash: demoOfferHash
      })

      await processScan(demoCustomerToken, demoOfferHash)
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

      // Show verification results
      setScanResult({
        type: 'verification',
        customer: data.customer,
        offer: data.offer,
        progress: data.progress,
        canScan: data.canScan
      })

      // If customer can be scanned, proceed with progress update
      if (data.canScan) {
        const scanResponse = await secureApi.post(`${endpoints.scanProgress}/${customerToken}/${offerHash}`)
        const scanData = await scanResponse.json()

        if (scanData.success) {
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
    <div>
      {/* Enhanced QR Scanner Overlay */}
      <EnhancedQRScanner
        isActive={isScanning}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onClose={stopCamera}
      />

      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QR Scanner</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Scan customer wallet pass QR codes to update loyalty progress</p>
      </div>

      <div className="space-y-8">

        {/* Scanning Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="mr-2">🔍</span>
            QR Code Scanner
          </h3>

          {!isScanning ? (
            <div className="text-center space-y-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-8 border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📱</span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ready to Scan</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Position the customer's QR code in front of your camera</p>

                <div className="flex justify-center">
                  <button
                    onClick={startCamera}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center space-x-3 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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

            {scanResult.type === 'verification' && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Customer Information Verified</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Customer:</span>
                    <div className="text-blue-900 dark:text-blue-100 font-semibold">{scanResult.customer?.id}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Offer:</span>
                    <div className="text-blue-900 dark:text-blue-100 font-semibold">{scanResult.offer?.title}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Progress:</span>
                    <div className="text-blue-900 dark:text-blue-100 font-semibold">{scanResult.progress?.current_stamps}/{scanResult.progress?.max_stamps} stamps</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Status:</span>
                    <div className="text-blue-900 dark:text-blue-100 font-semibold">
                      {scanResult.canScan ? '✅ Ready to scan' : '❌ Already completed'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {scanResult.type === 'success' && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-green-900 dark:text-green-100">Progress Updated Successfully!</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-green-700 dark:text-green-300 font-medium">Customer:</span>
                    <div className="text-green-900 dark:text-green-100 font-semibold">{scanResult.customer?.id}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-green-700 dark:text-green-300 font-medium">Offer:</span>
                    <div className="text-green-900 dark:text-green-100 font-semibold">{scanResult.offer?.title}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-green-700 dark:text-green-300 font-medium">New Progress:</span>
                    <div className="text-green-900 dark:text-green-100 font-semibold">{scanResult.progress?.current_stamps}/{scanResult.progress?.max_stamps} stamps</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <span className="text-green-700 dark:text-green-300 font-medium">Scan Time:</span>
                    <div className="text-green-900 dark:text-green-100 font-semibold">{formatDate(scanResult.scan?.timestamp)}</div>
                  </div>
                </div>
                {scanResult.rewardEarned && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-4 mb-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">🎉</span>
                      <div>
                        <div className="font-bold text-lg">REWARD EARNED!</div>
                        <div className="text-yellow-100">Customer completed loyalty program!</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-green-800 dark:text-green-200 font-medium bg-white/30 dark:bg-gray-800/30 rounded-lg p-3">
                  {scanResult.message}
                </div>
              </div>
            )}

            {scanResult.type === 'completed' && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/30 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <h4 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100">Already Completed</h4>
                </div>
                <div className="text-yellow-800 dark:text-yellow-200 bg-white/30 dark:bg-gray-800/30 rounded-lg p-4">
                  This customer has already completed the loyalty program and earned their reward!
                </div>
              </div>
            )}

            {/* Clear Results Button */}
            <div className="mt-6 text-center">
              <button
                onClick={clearResults}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear Results</span>
              </button>
            </div>
          </div>
        )}

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{analytics.scansToday || 0}</div>
              <div className="text-white/80 text-sm">Scans Today</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎁</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{analytics.rewardsEarned || 0}</div>
              <div className="text-white/80 text-sm">Rewards Earned</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{analytics.uniqueCustomers || 0}</div>
              <div className="text-white/80 text-sm">Unique Customers</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{analytics.totalScans || 0}</div>
              <div className="text-white/80 text-sm">Total Scans</div>
            </div>
          </div>
        )}


        {/* Recent Scan History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="mr-2">📋</span>
            Recent Scan History
          </h3>

          {scanHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No scans yet</h4>
              <p className="text-gray-500 dark:text-gray-400">Start scanning customer QR codes to see history here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
          )}
        </div>
      </div>
    </div>
  )
}

export default ScannerTab