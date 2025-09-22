import { useState, useEffect } from 'react'
import WalletPassGenerator from '../utils/walletPassGenerator'

function WalletCardPreview({ customerData, offerData, progressData, onAddToWallet }) {
  const [walletPreview, setWalletPreview] = useState(null)
  const [deviceCapabilities, setDeviceCapabilities] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [walletError, setWalletError] = useState(null)

  useEffect(() => {
    // Generate wallet preview
    const preview = WalletPassGenerator.generateWalletPreview(
      customerData,
      offerData,
      progressData
    )
    setWalletPreview(preview)

    // Check device capabilities
    const capabilities = WalletPassGenerator.getDeviceCapabilities()
    setDeviceCapabilities(capabilities)
  }, [customerData, offerData, progressData])

  const handleAddToAppleWallet = async () => {
    setIsGenerating(true)
    try {
      // Call backend API to generate real .pkpass file
      const response = await fetch('http://localhost:3011/api/wallet/apple/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerData, offerData, progressData })
      })

      if (response.ok) {
        // Get the .pkpass file as blob
        const blob = await response.blob()

        // Create download link for .pkpass file
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${offerData.businessName.replace(/[^a-zA-Z0-9]/g, '')}-loyalty-card.pkpass`

        // Trigger download - this will open Apple Wallet on iOS devices
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        // Track successful addition
        if (onAddToWallet) {
          onAddToWallet('apple', { downloaded: true })
        }

        console.log('✅ Apple Wallet pass downloaded successfully')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate pass')
      }

    } catch (error) {
      console.error('Apple Wallet generation failed:', error)
      alert('Failed to generate Apple Wallet pass. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddToGoogleWallet = async () => {
    setIsGenerating(true)
    setWalletError(null)

    try {
      console.log('🚀 Starting Google Wallet pass generation...')

      // Call backend API to generate Google Wallet link
      const response = await fetch('http://localhost:3011/api/wallet/google/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerData, offerData, progressData })
      })

      const data = await response.json()

      if (data.success && data.saveUrl) {
        console.log('✅ Google Wallet pass generated successfully!')

        // Track addition before redirect
        if (onAddToWallet) {
          onAddToWallet('google', {
            success: true,
            classId: data.classId,
            objectId: data.objectId,
            redirected: true
          })
        }

        // Small delay to show success state
        setTimeout(() => {
          console.log('🔄 Redirecting to Google Wallet...')
          window.location.href = data.saveUrl
        }, 500)

      } else {
        throw new Error(data.message || 'Failed to generate Google Wallet link')
      }

    } catch (error) {
      console.error('❌ Google Wallet generation failed:', error)

      let errorMessage = 'Unable to create Google Wallet pass. '

      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage += 'Please check your internet connection and try again.'
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.'
      } else {
        errorMessage += `Error: ${error.message}`
      }

      setWalletError({
        type: 'google',
        message: errorMessage,
        canRetry: true
      })

      // Track failed attempt
      if (onAddToWallet) {
        onAddToWallet('google', {
          success: false,
          error: error.message
        })
      }

    } finally {
      setIsGenerating(false)
    }
  }

  if (!walletPreview) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Generating wallet card...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Card Preview */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl p-6 shadow-lg max-w-sm mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold">{walletPreview.businessName}</h3>
            <p className="text-blue-100 text-sm">{walletPreview.offerTitle}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{walletPreview.progress.current}</div>
            <div className="text-xs text-blue-100">of {walletPreview.progress.required}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{walletPreview.progress.percentage}%</span>
          </div>
          <div className="w-full bg-blue-400 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${walletPreview.progress.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stamps Visual */}
        <div className="mb-4">
          <div className="flex justify-center space-x-1 mb-2">
            {walletPreview.stamps.slice(0, 10).map((stamp, index) => (
              <span
                key={index}
                className={`text-lg ${stamp.earned ? 'opacity-100' : 'opacity-30'}`}
                title={`Stamp ${stamp.position}: ${stamp.status}`}
              >
                {stamp.icon}
              </span>
            ))}
          </div>
          {walletPreview.stamps.length > 10 && (
            <div className="text-center text-xs text-blue-100">
              +{walletPreview.stamps.length - 10} more stamps
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          {walletPreview.status === 'reward_ready' ? (
            <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
              🎉 Reward Ready!
            </div>
          ) : (
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm">
              {walletPreview.progress.remaining} more stamps to earn reward
            </div>
          )}
        </div>

        {/* Card Details */}
        <div className="mt-4 pt-4 border-t border-blue-400 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-blue-100">Customer:</span>
            <span>{walletPreview.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Location:</span>
            <span>{walletPreview.branchName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-100">Member Since:</span>
            <span>{walletPreview.memberSince}</span>
          </div>
        </div>

        {/* Barcode/QR for POS */}
        <div className="mt-4 pt-4 border-t border-blue-400 text-center">
          <div className="bg-white text-gray-900 p-2 rounded text-xs font-mono">
            ID: {walletPreview.customerId}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {walletError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3 flex-1">
              <h5 className="text-sm font-medium text-red-800">
                {walletError.type === 'google' ? 'Google Wallet Error' : 'Apple Wallet Error'}
              </h5>
              <p className="mt-1 text-sm text-red-700">{walletError.message}</p>
              {walletError.canRetry && (
                <button
                  onClick={() => setWalletError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add to Wallet Buttons */}
      <div className="space-y-3">
        <h4 className="text-center font-medium text-gray-700">Add to Your Mobile Wallet</h4>

        {deviceCapabilities?.supportsAppleWallet && (
          <button
            onClick={handleAddToAppleWallet}
            disabled={isGenerating}
            className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <span>🍎</span>
                <span>Add to Apple Wallet</span>
              </>
            )}
          </button>
        )}

        {deviceCapabilities?.supportsGoogleWallet && (
          <button
            onClick={handleAddToGoogleWallet}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <span>📱</span>
                <span>Add to Google Wallet</span>
              </>
            )}
          </button>
        )}

        {!deviceCapabilities?.supportsAppleWallet && !deviceCapabilities?.supportsGoogleWallet && (
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600 text-sm">
              📱 Mobile wallet integration works best on mobile devices.
              <br />
              Try scanning the QR code with your phone!
            </p>
          </div>
        )}
      </div>

      {/* Device Info (for debugging) */}
      {process.env.NODE_ENV === 'development' && deviceCapabilities && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <div><strong>Platform:</strong> {deviceCapabilities.platform}</div>
          <div><strong>Apple Wallet:</strong> {deviceCapabilities.supportsAppleWallet ? '✅' : '❌'}</div>
          <div><strong>Google Wallet:</strong> {deviceCapabilities.supportsGoogleWallet ? '✅' : '❌'}</div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">📱 How to Use Your Loyalty Card</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Show this card at checkout to earn stamps</li>
          <li>• Card updates automatically when you earn rewards</li>
          <li>• Get notifications when rewards are ready</li>
          <li>• Works offline - no internet required at checkout</li>
        </ul>
      </div>
    </div>
  )
}

export default WalletCardPreview