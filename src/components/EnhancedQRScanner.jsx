import { useState, useEffect, useRef, useCallback } from 'react'
import QrScanner from 'qr-scanner'
import CryptoJS from 'crypto-js'
import ApiService from '../utils/api.js'

function EnhancedQRScanner({ onScanSuccess, onScanError, onClose, isActive }) {
  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  const [scanStatus, setScanStatus] = useState('initializing') // initializing, ready, scanning, detected, processing, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [hasFlashlight, setHasFlashlight] = useState(false)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [detectedQR, setDetectedQR] = useState('')
  const [lastScanTime, setLastScanTime] = useState(0)

  // Audio feedback
  const playBeep = useCallback(() => {
    try {
      // Create beep sound for QR detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 800Hz beep
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.2) // 200ms beep
    } catch (error) {
      console.log('Audio not available:', error)
    }
  }, [])

  // Vibration feedback (mobile)
  const vibrate = useCallback(() => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(200) // 200ms vibration
      }
    } catch (error) {
      console.log('Vibration not available:', error)
    }
  }, [])

  // Success feedback
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Pleasant success chime (C major chord)
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime) // C5
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Audio not available:', error)
    }
  }, [])

  // QR Code detection handler
  const handleQRDetection = useCallback(async (result) => {
    const now = Date.now()

    // Prevent duplicate scans (debounce for 2 seconds)
    if (now - lastScanTime < 2000 && detectedQR === result.data) {
      return
    }

    console.log('🔍 QR Code detected:', result.data)

    setDetectedQR(result.data)
    setLastScanTime(now)
    setScanStatus('detected')

    // Provide immediate feedback
    playBeep()
    vibrate()

    try {
      setScanStatus('processing')

      let customerToken = null
      let offerHash = null

      // Handle different QR code formats
      if (result.data.startsWith('http')) {
        // Format 1: URL format - https://domain.com/scan/{customerToken}/{offerHash}
        console.log('🔗 Processing URL QR format')
        const url = new URL(result.data)
        const pathParts = url.pathname.split('/')

        if (pathParts.length >= 4 && pathParts[1] === 'scan') {
          customerToken = pathParts[2]
          offerHash = pathParts[3]
        } else {
          throw new Error('Invalid URL QR format. Expected /scan/{token}/{hash}')
        }

      } else if (result.data.startsWith('{')) {
        // Format 2: Wallet JSON format - {"customerId":"CUST-123","offerId":"offer-456","timestamp":"..."}
        console.log('📱 Processing Wallet JSON format')
        const walletData = JSON.parse(result.data)

        if (walletData.customerId && walletData.offerId) {
          // Extract actual customer ID from wallet format
          const actualCustomerId = walletData.customerId.replace('CUST-', '')

          // Use business ID from QR code if available, otherwise fall back to secure auth
          const businessId = walletData.businessId || localStorage.getItem('businessId') || '1'

          // Validate that the current business can process this QR
          ApiService.validateBusinessAccess(walletData.businessId)

          // Create base64 encoded token in expected format: customerId:businessId:timestamp
          const tokenData = `${actualCustomerId}:${businessId}:${Date.now()}`
          customerToken = btoa(tokenData) // Don't truncate - match backend expectations

          // Use the secure offer ID directly (no extraction needed)
          const secureOfferId = walletData.offerId

          // Generate offer hash using MD5 to match backend CustomerService
          // Backend expects: offerId:businessId:loyalty-platform (using secure IDs)
          const hashData = `${secureOfferId}:${businessId}:loyalty-platform`
          offerHash = CryptoJS.MD5(hashData).toString().substring(0, 8) // Match backend 8-char limit

          console.log('🔄 Converted wallet data:', {
            originalCustomerId: walletData.customerId,
            extractedCustomerId: actualCustomerId,
            businessId,
            tokenData: `${actualCustomerId}:${businessId}:${Date.now()}`,
            encodedToken: customerToken.substring(0, 20) + '...',
            secureOfferId: secureOfferId,
            hashInput: hashData,
            generatedOfferHash: offerHash
          })
        } else {
          throw new Error('Invalid Wallet QR format. Missing customerId or offerId.')
        }

      } else if (/^\d+$/.test(result.data)) {
        // Format 3: Apple Wallet simple customer ID format - "4"
        console.log('🍎 Processing Apple Wallet customer ID format')
        customerToken = result.data
        // Note: Apple Wallet QRs don't contain offer info, may need to prompt user
        console.warn('⚠️ Apple Wallet QR detected - offer ID unknown, may need user selection')

      } else {
        throw new Error(`Unsupported QR format: ${result.data.substring(0, 50)}...`)
      }

      if (customerToken) {
        console.log('✅ Valid QR format detected:', { customerToken, offerHash, format: result.data.startsWith('http') ? 'URL' : result.data.startsWith('{') ? 'Google Wallet' : 'Apple Wallet' })

        setScanStatus('success')
        playSuccessSound()

        // Call success handler
        if (onScanSuccess) {
          await onScanSuccess(customerToken, offerHash, result.data)
        }
      } else {
        throw new Error('Could not extract customer information from QR code.')
      }

    } catch (error) {
      console.error('❌ QR processing failed:', error)
      setScanStatus('error')
      setErrorMessage(error.message)

      if (onScanError) {
        onScanError(error)
      }
    }
  }, [detectedQR, lastScanTime, onScanSuccess, onScanError, playBeep, vibrate, playSuccessSound])

  // Initialize QR Scanner
  useEffect(() => {
    if (!isActive || !videoRef.current) return

    const initScanner = async () => {
      try {
        setScanStatus('initializing')
        setErrorMessage('')

        // Check camera permissions and HTTPS requirement
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported in this browser')
        }

        // Check if running on HTTPS (required for camera access)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          throw new Error('Camera access requires HTTPS. Please use HTTPS or localhost.')
        }

        console.log('🔒 Camera access check:', {
          protocol: location.protocol,
          hostname: location.hostname,
          mediaDevices: !!navigator.mediaDevices,
          getUserMedia: !!navigator.mediaDevices?.getUserMedia
        })

        // Create QR Scanner instance with fallback options
        try {
          qrScannerRef.current = new QrScanner(
            videoRef.current,
            handleQRDetection,
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
              preferredCamera: 'environment', // Use back camera on mobile
              maxScansPerSecond: 2, // Limit scan frequency
              returnDetailedScanResult: true,
            }
          )
        } catch (constructorError) {
          console.warn('⚠️ QrScanner constructor failed, trying with basic options:', constructorError)
          // Fallback with minimal options
          qrScannerRef.current = new QrScanner(
            videoRef.current,
            handleQRDetection,
            {
              returnDetailedScanResult: true,
            }
          )
        }

        // Check for flashlight support
        const hasFlash = await QrScanner.hasCamera()
        setHasFlashlight(hasFlash)

        // Start scanning
        await qrScannerRef.current.start()
        setScanStatus('ready')

        console.log('📸 QR Scanner initialized and started')

      } catch (error) {
        console.error('❌ Scanner initialization failed:', error)
        setScanStatus('error')

        let errorMsg = 'Failed to start camera: ' + error.message

        if (error.name === 'NotAllowedError') {
          errorMsg = 'Camera access denied. Please allow camera permissions and refresh the page.'
        } else if (error.name === 'NotFoundError') {
          errorMsg = 'No camera found on this device. Please check camera connection.'
        } else if (error.name === 'NotReadableError') {
          errorMsg = 'Camera is already in use by another application. Please close other apps using the camera.'
        } else if (error.name === 'OverconstrainedError') {
          errorMsg = 'Camera constraints not supported. Trying with different settings...'
        } else if (error.name === 'SecurityError') {
          errorMsg = 'Camera access blocked by browser security. Please enable camera permissions.'
        }

        setErrorMessage(errorMsg)

        if (onScanError) {
          onScanError(new Error(errorMsg))
        }
      }
    }

    initScanner()

    // Cleanup function
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
        qrScannerRef.current = null
      }
    }
  }, [isActive, handleQRDetection, onScanError])

  // Flashlight toggle
  const toggleFlashlight = useCallback(async () => {
    if (qrScannerRef.current && hasFlashlight) {
      try {
        if (flashlightOn) {
          await qrScannerRef.current.turnFlashlightOff()
          setFlashlightOn(false)
        } else {
          await qrScannerRef.current.turnFlashlightOn()
          setFlashlightOn(true)
        }
      } catch (error) {
        console.error('Flashlight toggle failed:', error)
      }
    }
  }, [flashlightOn, hasFlashlight])

  // Reset scanner state
  const resetScanner = useCallback(() => {
    setScanStatus('ready')
    setErrorMessage('')
    setDetectedQR('')
    setLastScanTime(0)
  }, [])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">QR Scanner</h2>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 text-xl font-bold"
        >
          ✕
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Targeting Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative w-64 h-64 border-4 rounded-lg transition-colors duration-300 ${
              scanStatus === 'detected' || scanStatus === 'success'
                ? 'border-green-400 shadow-lg shadow-green-400/50'
                : scanStatus === 'error'
                ? 'border-red-400'
                : 'border-white'
            }`}
            style={{
              background: 'transparent',
              boxShadow: scanStatus === 'detected' ? '0 0 0 9999px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            {/* Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white"></div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className={`px-4 py-2 rounded-full text-white font-medium ${
            scanStatus === 'ready' || scanStatus === 'scanning' ? 'bg-blue-600' :
            scanStatus === 'detected' ? 'bg-yellow-600' :
            scanStatus === 'processing' ? 'bg-purple-600' :
            scanStatus === 'success' ? 'bg-green-600' :
            scanStatus === 'error' ? 'bg-red-600' :
            'bg-gray-600'
          }`}>
            {scanStatus === 'initializing' && '📷 Starting camera...'}
            {scanStatus === 'ready' && '🔍 Point at QR code'}
            {scanStatus === 'scanning' && '👀 Scanning...'}
            {scanStatus === 'detected' && '✅ QR Code detected!'}
            {scanStatus === 'processing' && '⚡ Processing...'}
            {scanStatus === 'success' && '🎉 Success!'}
            {scanStatus === 'error' && '❌ Error occurred'}
          </div>
        </div>

        {/* Progress Indicator */}
        {scanStatus === 'processing' && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2">
            <div className="bg-purple-600 text-white px-6 py-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Processing scan...</span>
              </div>
            </div>
          </div>
        )}

        {/* Success Checkmark */}
        {scanStatus === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-green-600 text-white rounded-full p-8 animate-pulse">
              <div className="text-6xl">✓</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black text-white p-4 space-y-4">
        {/* Error Message */}
        {scanStatus === 'error' && errorMessage && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
            <div className="flex items-start space-x-2">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="font-semibold">Scanning Error</div>
                <div className="text-sm">{errorMessage}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {hasFlashlight && (
            <button
              onClick={toggleFlashlight}
              className={`px-4 py-2 rounded-lg font-medium ${
                flashlightOn ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'
              }`}
            >
              {flashlightOn ? '🔦 Light ON' : '🔦 Light OFF'}
            </button>
          )}

          {scanStatus === 'error' && (
            <button
              onClick={resetScanner}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              🔄 Try Again
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-gray-300 text-sm">
          <div>📱 Hold your device steady</div>
          <div>🎯 Center the QR code in the square</div>
          <div>📏 Keep 6-12 inches away from the code</div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedQRScanner