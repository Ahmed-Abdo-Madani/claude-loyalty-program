import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getManagerAuthData, managerLogout, isManagerAuthenticated } from '../utils/secureAuth'
import EnhancedQRScanner from '../components/EnhancedQRScanner'
import { endpoints } from '../config/api'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function BranchScanner() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [todayStats, setTodayStats] = useState({ scansToday: 0, rewardsEarned: 0 })
  const [branchInfo, setBranchInfo] = useState(null)

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
        // Check if reward was earned - auto-confirm prize immediately
        if (data.rewardEarned) {
          // Auto-confirm prize (no modal, no user interaction)
          try {
            const confirmResponse = await fetch(
              `${endpoints.branchManagerConfirmPrize}/${data.customerId}/${data.offerId}`,
              {
                method: 'POST',
                headers: {
                  'x-branch-id': authData.branchId,
                  'x-manager-token': authData.managerToken,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notes: '' })
              }
            )

            // Check response status before parsing JSON
            if (!confirmResponse.ok) {
              throw new Error(`Prize confirmation failed: ${confirmResponse.status}`)
            }

            const confirmData = await confirmResponse.json()

            if (confirmData.success) {
              // Show success with fresh data from confirmation
              setScanResult({
                rewardEarned: true,
                prizeFulfilled: true,
                tier: confirmData.tier,
                tierUpgrade: confirmData.tierUpgrade,
                totalCompletions: confirmData.totalCompletions,
                progress: confirmData.progress, // Fresh data with reset stamps
                customerId: data.customerId,
                offerId: data.offerId
              })
            } else {
              // Prize confirmation failed, but still show result
              setScanResult({
                rewardEarned: true,
                prizeFulfilled: false,
                progress: data.progress,
                customerId: data.customerId,
                offerId: data.offerId,
                confirmError: confirmData.error || 'Prize confirmation failed'
              })
            }
          } catch (confirmError) {
            // Handle auto-confirm errors without blocking flow
            console.error('Auto-confirm error:', confirmError)
            setScanResult({
              rewardEarned: true,
              prizeFulfilled: false,
              progress: data.progress,
              customerId: data.customerId,
              offerId: data.offerId,
              confirmError: 'Prize confirmation failed - wallet update may be delayed'
            })
          }
        } else {
          // Regular stamp added (no reward earned)
          setScanResult({
            rewardEarned: false,
            progress: data.progress,
            customerId: data.customerId,
            offerId: data.offerId
          })
        }
        
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
              {branchInfo?.branchName || t('branchScanner.branchManager')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('branchScanner.scansToday', { count: todayStats.scansToday })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="button" showLabels={false} className="" />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-500/50"
              aria-label="Logout from branch manager portal"
            >
              {t('branchScanner.logout')}
            </button>
          </div>
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
            <span className="text-xl lg:text-2xl font-bold">{t('branchScanner.startScanner')}</span>
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
              <p className="text-lg lg:text-base text-gray-600 dark:text-gray-400">{t('branchScanner.processing')}</p>
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
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">{t('branchScanner.error')}</h3>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={handleScanNext}
                className="w-full lg:w-auto px-6 py-4 lg:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500"
                aria-label="Scan next customer"
              >
                {t('branchScanner.scanNext')}
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
            {scanResult.rewardEarned && scanResult.prizeFulfilled ? (
              /* Prize Auto-Confirmed State */
              <>
                <div className="text-8xl lg:text-6xl mb-8 lg:mb-4">✅</div>
                <h2 className="text-3xl lg:text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {t('branchScanner.prizeConfirmed')}
                </h2>
                
                {/* Display tier information if available */}
                {scanResult.tier && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                    <p className="text-xl lg:text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {scanResult.tier.currentTier && (
                        <>
                          {scanResult.tier.currentTier.icon} {scanResult.tier.currentTier.name}
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('branchScanner.rewardsEarned', { count: scanResult.totalCompletions })}
                    </p>
                  </div>
                )}
                
                {/* New cycle indicator with fresh progress data */}
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('branchScanner.newCycleStarted', { 
                    current: scanResult.progress?.currentStamps || 0, 
                    max: scanResult.progress?.maxStamps || 5 
                  })}
                </p>
                
                {/* Show confirmation error if auto-confirm failed */}
                {scanResult.confirmError && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ {t('branchScanner.prizeConfirmedButDelayed')}
                    </p>
                  </div>
                )}
                
                {/* Tier upgrade celebration */}
                {scanResult.tier && scanResult.tierUpgrade && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-200 mb-1">
                      🎉 {t('branchScanner.tierUpgrade')}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {t('branchScanner.customerReachedTier', { tierName: scanResult.tier.currentTier.name })}
                    </p>
                  </div>
                )}
                
                {/* Milestone celebration */}
                {scanResult.totalCompletions && [5, 10, 25, 50, 100].includes(scanResult.totalCompletions) && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                      {t('branchScanner.milestone', { count: scanResult.totalCompletions })}
                    </p>
                  </div>
                )}
                
                <button
                  onClick={handleScanNext}
                  className="w-full py-5 lg:py-3 bg-blue-600 hover:bg-blue-700 text-white text-xl lg:text-lg rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500"
                  aria-label="Scan next customer after prize confirmation"
                >
                  {t('branchScanner.scanNextCustomer')}
                </button>
              </>
            ) : (
              /* Stamp Added State */
              <>
                <div className="text-8xl lg:text-6xl mb-8 lg:mb-4">✅</div>
                <h2 className="text-3xl lg:text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {t('branchScanner.stampAdded')}
                </h2>
                
                <div className="my-6">
                  <p className="text-4xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('branchScanner.progress', { current: scanResult.progress.currentStamps, max: scanResult.progress.maxStamps })}
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
                  {t('branchScanner.scanNextCustomer')}
                </button>
              </>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
