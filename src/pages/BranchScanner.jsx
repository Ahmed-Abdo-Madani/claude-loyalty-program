import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getManagerAuthData, managerLogout, isManagerAuthenticated } from '../utils/secureAuth'
import EnhancedQRScanner from '../components/EnhancedQRScanner'
import { endpoints } from '../config/api'

export default function BranchScanner() {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [todayStats, setTodayStats] = useState({ scansToday: 0, rewardsEarned: 0 })
  const [branchInfo, setBranchInfo] = useState(null)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [prizeNotes, setPrizeNotes] = useState('')

  useEffect(() => {
    // Check authentication
    if (!isManagerAuthenticated()) {
      navigate('/branch-manager-login')
      return
    }

    // Load branch info
    const authData = getManagerAuthData()
    setBranchInfo(authData)

    // Load today's stats
    loadTodayStats()
  }, [navigate])

  const loadTodayStats = async () => {
    try {
      const authData = getManagerAuthData()
      const response = await fetch(endpoints.branchManagerStats, {
        headers: {
          'x-branch-id': authData.branchId,
          'x-manager-token': authData.managerToken
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTodayStats({
          scansToday: data.scansToday || 0,
          rewardsEarned: data.rewardsEarned || 0
        })
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleStartScanner = () => {
    setIsScanning(true)
    setScanResult(null)
    setError('')
  }

  const handleScanSuccess = async (customerToken, offerHash) => {
    setIsScanning(false)
    setLoading(true)
    setError('')

    try {
      const authData = getManagerAuthData()
      const response = await fetch(`${endpoints.branchManagerScan}/${customerToken}/${offerHash}`, {
        method: 'POST',
        headers: {
          'x-branch-id': authData.branchId,
          'x-manager-token': authData.managerToken,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setScanResult({
          rewardEarned: data.rewardEarned,
          progress: data.progress,
          customerId: data.customerId,   // Added from API response
          offerId: data.offerId           // Added from API response
        })
        
        // Reload stats
        loadTodayStats()
      } else {
        setError(data.error || 'Scan failed')
      }
    } catch (err) {
      setError('Failed to process scan')
    } finally {
      setLoading(false)
    }
  }

  const handleScanError = (err) => {
    setIsScanning(false)
    setError(err?.message ?? String(err))
  }

  const handleGivePrize = () => {
    setShowPrizeModal(true)
  }

  const handleConfirmPrize = async () => {
    setLoading(true)

    try {
      const authData = getManagerAuthData()
      const { customerId, offerId } = scanResult
      
      const response = await fetch(`${endpoints.branchManagerConfirmPrize}/${customerId}/${offerId}`, {
        method: 'POST',
        headers: {
          'x-branch-id': authData.branchId,
          'x-manager-token': authData.managerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: prizeNotes })
      })

      const data = await response.json()

      if (data.success) {
        setShowPrizeModal(false)
        setScanResult({ ...scanResult, prizeFulfilled: true })
        setPrizeNotes('')
      } else {
        setError(data.error || 'Prize confirmation failed')
      }
    } catch (err) {
      setError('Failed to confirm prize')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    managerLogout()
    navigate('/branch-manager-login')
  }

  const handleScanNext = () => {
    setScanResult(null)
    setError('')
    handleStartScanner()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      {!isScanning && !scanResult && (
        <div className="bg-white dark:bg-gray-800 shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {branchInfo?.branchName || 'Branch Manager'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scans today: {todayStats.scansToday}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-500/50"
            aria-label="Logout from branch manager portal"
          >
            Logout
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {!isScanning && !scanResult && !loading && (
          /* Start Scanner Button */
          <button
            onClick={handleStartScanner}
            className="w-full max-w-md mx-auto h-48 lg:h-56 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 px-6 py-6 focus:outline-none focus:ring-4 focus:ring-blue-500"
            aria-label="Start QR code scanner"
          >
            <svg className="w-16 h-16 lg:w-20 lg:h-20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="text-xl lg:text-2xl font-bold">Start Scanner</span>
            <span className="text-xl lg:text-2xl font-bold mt-1">ابدأ المسح</span>
          </button>
        )}

        {isScanning && (
          /* QR Scanner */
          <div className="w-full h-full fixed inset-0 lg:relative lg:max-w-2xl lg:mx-auto">
            <EnhancedQRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              isActive={isScanning}
              onClose={() => setIsScanning(false)}
            />
          </div>
        )}

        {loading && (
          /* Loading State */
          <div className="fixed inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center z-40">
            <div className="text-center">
              <div className="animate-spin w-20 h-20 lg:w-16 lg:h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg lg:text-base text-gray-600 dark:text-gray-400">Processing...</p>
            </div>
          </div>
        )}

        {error && !isScanning && !scanResult && (
          /* Error Modal Overlay */
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setError('')}
          >
            <div 
              className="max-w-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 lg:p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-20 h-20 lg:w-16 lg:h-16 text-red-600 dark:text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error</h3>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={handleScanNext}
                className="w-full lg:w-auto px-6 py-4 lg:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500"
                aria-label="Scan next customer"
              >
                Scan Next
              </button>
            </div>
          </div>
        )}

        {scanResult && !loading && (
          /* Scan Result Modal with Backdrop */
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 lg:relative lg:bg-transparent lg:z-auto lg:p-0">
            <div 
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 lg:p-8 text-center max-h-[90vh] overflow-y-auto"
              style={{ 
                paddingTop: 'max(2.5rem, env(safe-area-inset-top))', 
                paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' 
              }}
            >
            {scanResult.rewardEarned && !scanResult.prizeFulfilled ? (
              /* Reward Earned State */
              <>
                <div className="text-8xl lg:text-6xl mb-8 lg:mb-4">🏆</div>
                <h2 className="text-3xl lg:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                  🎉 REWARD EARNED!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 lg:mb-6">
                  Customer completed {scanResult.progress.maxStamps} stamps!
                </p>
                
                <button
                  onClick={handleGivePrize}
                  className="w-full py-5 lg:py-4 bg-green-600 hover:bg-green-700 text-white text-xl lg:text-lg font-semibold rounded-lg mb-3 transition-colors focus:outline-none focus:ring-4 focus:ring-green-500"
                  aria-label="Give prize to customer"
                >
                  Give Prize - اعط الجائزة
                </button>
                
                <button
                  onClick={handleScanNext}
                  className="w-full py-5 lg:py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-gray-500"
                  aria-label="Skip and scan next customer"
                >
                  Skip
                </button>
              </>
            ) : scanResult.prizeFulfilled ? (
              /* Prize Confirmed State */
              <>
                <div className="text-8xl lg:text-6xl mb-8 lg:mb-4">✅</div>
                <h2 className="text-3xl lg:text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  Prize Confirmed!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 lg:mb-6">
                  Pass will expire in 30 days
                </p>
                
                <button
                  onClick={handleScanNext}
                  className="w-full py-5 lg:py-3 bg-blue-600 hover:bg-blue-700 text-white text-xl lg:text-lg rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500"
                  aria-label="Scan next customer after prize confirmation"
                >
                  Scan Next Customer
                </button>
              </>
            ) : (
              /* Stamp Added State */
              <>
                <div className="text-8xl lg:text-6xl mb-8 lg:mb-4">✅</div>
                <h2 className="text-3xl lg:text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  Stamp Added!
                </h2>
                
                <div className="my-6">
                  <p className="text-4xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {scanResult.progress.currentStamps} of {scanResult.progress.maxStamps}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 lg:h-4">
                    <div
                      className="bg-blue-600 h-6 lg:h-4 rounded-full transition-all duration-500"
                      style={{ width: `${(scanResult.progress.currentStamps / scanResult.progress.maxStamps) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <button
                  onClick={handleScanNext}
                  className="w-full py-5 lg:py-3 bg-blue-600 hover:bg-blue-700 text-white text-xl lg:text-lg rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500"
                  aria-label="Scan next customer after stamp added"
                >
                  Scan Next Customer
                </button>
              </>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Prize Confirmation Modal */}
      {showPrizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full lg:max-w-md p-8 lg:p-6 max-h-[90vh] overflow-y-auto"
            style={{ 
              paddingTop: 'max(2rem, env(safe-area-inset-top))', 
              paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' 
            }}
          >
            <h3 className="text-2xl lg:text-xl font-bold text-gray-900 dark:text-white mb-4">
              Confirm Prize Given
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={prizeNotes}
                onChange={(e) => setPrizeNotes(e.target.value)}
                placeholder="e.g., Given free coffee, redeemed gift card..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows="4"
              />
            </div>

            <div className="flex space-x-4 lg:space-x-3">
              <button
                onClick={() => setShowPrizeModal(false)}
                disabled={loading}
                className="flex-1 py-4 lg:py-3 text-lg lg:text-base bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-gray-500"
                aria-label="Cancel prize confirmation"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrize}
                disabled={loading}
                className="flex-1 py-4 lg:py-3 text-lg lg:text-base bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-green-500"
                aria-label="Confirm prize was given"
              >
                {loading ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
