import { useState, useEffect, useRef } from 'react'
import ApiService from '../utils/api'
import EnhancedQRScanner from './EnhancedQRScanner'
import QRTestGenerator from './QRTestGenerator'

function ScannerTab() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [manualToken, setManualToken] = useState('')
  const [manualHash, setManualHash] = useState('')
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
      const response = await ApiService.getScanHistory(10) // Last 10 scans
      setScanHistory(response.data || [])
    } catch (err) {
      console.error('Failed to load scan history:', err)
    }
  }

  const loadScanAnalytics = async () => {
    try {
      const response = await ApiService.getScanAnalytics()
      setAnalytics(response.data || {})
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

      // Generate a fresh demo token for the current business
      const businessId = localStorage.getItem('businessId')
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
      const testResponse = await ApiService.testDualQRFlow()

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
      const verifyResponse = await ApiService.verifyScan(customerToken, offerHash)

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message)
      }

      const { data: verifyData } = verifyResponse

      // Show verification results
      setScanResult({
        type: 'verification',
        customer: verifyData.customer,
        offer: verifyData.offer,
        progress: verifyData.progress,
        canScan: verifyData.canScan
      })

      // If customer can be scanned, proceed with progress update
      if (verifyData.canScan) {
        const scanResponse = await ApiService.scanProgress(customerToken, offerHash)

        if (scanResponse.success) {
          setScanResult({
            type: 'success',
            ...scanResponse.data,
            message: scanResponse.message
          })

          // Reload data
          await loadScanHistory()
          await loadScanAnalytics()
        } else {
          throw new Error(scanResponse.message)
        }
      } else {
        setScanResult({
          type: 'completed',
          ...verifyData,
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

  const handleManualScan = async (e) => {
    e.preventDefault()
    if (!manualToken.trim() || !manualHash.trim()) {
      setError('Please enter both customer token and offer hash')
      return
    }

    await processScan(manualToken.trim(), manualHash.trim())
  }

  const clearResults = () => {
    setScanResult(null)
    setError('')
    setManualToken('')
    setManualHash('')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Enhanced QR Scanner Overlay */}
      <EnhancedQRScanner
        isActive={isScanning}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onClose={stopCamera}
      />
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Customer Progress Scanner</h2>
        <p className="text-gray-600">Scan customer wallet pass QR codes to update loyalty progress</p>
      </div>

      {/* Scanning Interface */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium mb-4">🔍 QR Code Scanner</h3>

        {!isScanning ? (
          <div className="text-center space-y-4">
            <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">📱</div>
              <p className="text-gray-600 mb-4">Ready to scan customer QR codes</p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={startCamera}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
                >
                  <span>📹</span>
                  <span>Start QR Scanner</span>
                </button>
                <button
                  onClick={simulateScan}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium flex items-center space-x-2"
                >
                  <span>🎯</span>
                  <span>Demo Scan</span>
                </button>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <div>📸 Camera scanner automatically detects QR codes</div>
                <div>🔊 Audio feedback on successful scans</div>
                <div>📱 Works best with back camera on mobile</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Manual Entry */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium mb-3">Manual Entry (for testing)</h4>
          <form onSubmit={handleManualScan} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Customer Token"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                placeholder="Offer Hash"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? '⏳ Processing...' : '🔍 Process Manual Scan'}
              </button>
              <button
                type="button"
                onClick={clearResults}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                🧹 Clear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResult && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4">📊 Scan Results</h3>

          {scanResult.type === 'verification' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Customer Information Verified</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Customer:</strong> {scanResult.customer?.id}</div>
                <div><strong>Offer:</strong> {scanResult.offer?.title}</div>
                <div><strong>Progress:</strong> {scanResult.progress?.current_stamps}/{scanResult.progress?.max_stamps} stamps</div>
                <div><strong>Status:</strong> {scanResult.canScan ? '✅ Ready to scan' : '❌ Already completed'}</div>
              </div>
            </div>
          )}

          {scanResult.type === 'success' && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3">✅ Progress Updated Successfully!</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Customer:</strong> {scanResult.customer?.id}</div>
                <div><strong>Offer:</strong> {scanResult.offer?.title}</div>
                <div><strong>New Progress:</strong> {scanResult.progress?.current_stamps}/{scanResult.progress?.max_stamps} stamps</div>
                <div><strong>Scan Time:</strong> {formatDate(scanResult.scan?.timestamp)}</div>
                {scanResult.rewardEarned && (
                  <div className="bg-yellow-100 p-3 rounded-lg mt-3">
                    <strong className="text-yellow-800">🎉 REWARD EARNED! Customer completed loyalty program!</strong>
                  </div>
                )}
              </div>
              <div className="mt-3 text-green-800 font-medium">{scanResult.message}</div>
            </div>
          )}

          {scanResult.type === 'completed' && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-3">🏆 Already Completed</h4>
              <div className="text-yellow-800">
                This customer has already completed the loyalty program and earned their reward!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Summary */}
      {analytics && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4">📈 Today's Scanning Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.scansToday || 0}</div>
              <div className="text-sm text-gray-600">Scans Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.rewardsEarned || 0}</div>
              <div className="text-sm text-gray-600">Rewards Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.uniqueCustomers || 0}</div>
              <div className="text-sm text-gray-600">Unique Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{analytics.totalScans || 0}</div>
              <div className="text-sm text-gray-600">Total Scans</div>
            </div>
          </div>
        </div>
      )}

      {/* QR Test Generator */}
      <QRTestGenerator />

      {/* Recent Scan History */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium mb-4">📋 Recent Scan History</h3>

        {scanHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">📊 No scans yet</div>
            <div>Start scanning customer QR codes to see history here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Offer</th>
                  <th className="text-left py-2">Progress</th>
                  <th className="text-left py-2">Reward</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((scan) => (
                  <tr key={scan.id} className="border-b border-gray-100">
                    <td className="py-2">{formatDate(scan.scannedAt)}</td>
                    <td className="py-2">
                      <div className="font-medium">{scan.offerTitle}</div>
                      <div className="text-xs text-gray-500">{scan.offerType}</div>
                    </td>
                    <td className="py-2">
                      <span className="text-blue-600">
                        {scan.progressBefore} → {scan.progressAfter}
                      </span>
                    </td>
                    <td className="py-2">
                      {scan.rewardEarned ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          🎉 Earned
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
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
  )
}

export default ScannerTab