import { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { BarcodeDetector } from 'barcode-detector'
import CryptoJS from 'crypto-js'
import ApiService from '../utils/api.js'

function EnhancedQRScanner({ onScanSuccess, onScanError, onClose = () => {}, isActive }) {
  const videoRef = useRef(null)
  const barcodeDetectorRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isRunningRef = useRef(false) // Track if scanner is actively running
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

  // Helper to get detection source for cross-browser compatibility
  const getDetectionSource = useCallback(async (videoElement) => {
    // Try direct video element first (works in Chrome/Edge native)
    if ('BarcodeDetector' in window) {
      return videoElement
    }
    
    // For polyfill browsers (Safari, Firefox), use ImageBitmap or canvas
    try {
      // Try ImageBitmap first (better performance)
      if ('createImageBitmap' in window) {
        return await createImageBitmap(videoElement)
      }
    } catch (error) {
      console.log('ImageBitmap not available, falling back to canvas:', error)
    }
    
    // Fallback to canvas for maximum compatibility
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    return canvas
  }, [])

  // Barcode detection handler
  const handleBarcodeDetection = useCallback(async (barcode) => {
    const now = Date.now()

    // Prevent duplicate scans (debounce for 2 seconds)
    if (now - lastScanTime < 2000 && detectedQR === barcode.rawValue) {
      return
    }

    console.log('🔍 Barcode detected:', { format: barcode.format, data: barcode.rawValue })

    // 🆕 SANITIZE INPUT: Remove whitespace and invisible characters
    const cleanedData = barcode.rawValue.trim()
    console.log('🧹 Sanitized barcode data:', {
      originalLength: barcode.rawValue.length,
      cleanedLength: cleanedData.length,
      first20: cleanedData.substring(0, 20),
      last20: cleanedData.substring(cleanedData.length - 20),
      hasWhitespace: barcode.rawValue !== cleanedData
    })

    setDetectedQR(cleanedData)
    setLastScanTime(now)
    setScanStatus('detected')

    // Provide immediate feedback
    playBeep()
    vibrate()

    try {
      setScanStatus('processing')

      let customerToken = null
      let offerHash = null

      // 🆕 COMPREHENSIVE DEBUG: Show what we're processing
      console.log('🔎 Processing barcode:', {
        originalLength: barcode.rawValue.length,
        cleanedLength: cleanedData.length,
        preview: `${cleanedData.substring(0, 20)}...${cleanedData.substring(cleanedData.length - 20)}`,
        hasColon: cleanedData.includes(':'),
        startsWithHttp: cleanedData.startsWith('http'),
        startsWithBrace: cleanedData.startsWith('{')
      })

      // Handle different QR code formats (REORDERED for better matching)
      if (cleanedData.startsWith('http')) {
        // Format 1: URL format - https://domain.com/scan/{customerToken}/{offerHash}
        console.log('🔗 Testing URL format...')
        const url = new URL(cleanedData)
        const pathParts = url.pathname.split('/')

        if (pathParts.length >= 4 && pathParts[1] === 'scan') {
          customerToken = pathParts[2]
          offerHash = pathParts[3]
          console.log('✅ URL format matched:', { customerToken: customerToken.substring(0, 20) + '...', offerHash })
        } else {
          throw new Error('Invalid URL QR format. Expected /scan/{token}/{hash}')
        }

      } else if (cleanedData.startsWith('{')) {
        // Format 2: Wallet JSON format - {"customerId":"cust_abc123","offerId":"off_xyz456","timestamp":"..."}
        console.log('📱 Testing Wallet JSON format...')
        const walletData = JSON.parse(cleanedData)

        if (walletData.customerId && walletData.offerId) {
          // Use customer ID directly (should be in cust_* format)
          const actualCustomerId = walletData.customerId

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

          console.log('✅ Wallet JSON format matched:', {
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

      } else if (/^(?!.*:)[A-Za-z0-9+/=]{80,150}$/.test(cleanedData)) {
        // 🆕 FORMAT 3 (MOVED UP): Legacy Apple Wallet format (token-only, no offer hash)
        // Example: Y3VzdF8xOWEwNjc1YjlmMThkMzE1ODJjOmJpel84OTI3YjVjZDQxN2ZkNDc3YTkyNzE4MTJkNDoxNzYxMDQ0OTcxMDg4 (101 chars)
        // CRITICAL: Test this BEFORE enhanced format to avoid false negatives
        console.log('🍎 Testing Legacy Apple Wallet format (token-only)...')
        console.log('🔍 Legacy format check:', {
          length: cleanedData.length,
          hasColon: cleanedData.includes(':'),
          preview: cleanedData.substring(0, 30) + '...'
        })
        
        // Use full base64 token, no offer hash available
        customerToken = cleanedData
        offerHash = null
        
        console.log('✅ Legacy QR format matched:', {
          customerToken: customerToken.substring(0, 20) + '...',
          offerHash: 'auto-detect',
          fullLength: cleanedData.length,
          note: 'Will auto-select offer on backend'
        })

      } else if (/^[A-Za-z0-9+/=]+:[a-f0-9]{8}$/.test(cleanedData)) {
        // Format 4: Enhanced Apple Wallet format - "base64EncodedToken:offerHash"
        // Example: Y3VzdF8xOWEwNjc1YjlmMThkMzE1ODJjOmJpel84OTI3YjVjZDQxN2ZkNDc3YTkyNzE4MTJkNDoxNzYxMDQ0OTcxMDg4:d1399b5d
        console.log('🍎 Testing Enhanced Apple Wallet format...')

        const [encodedToken, providedOfferHash] = cleanedData.split(':')

        // The encodedToken is already in the format we need (customerToken)
        // Backend will decode it using CustomerService.decodeCustomerToken()
        customerToken = encodedToken
        offerHash = providedOfferHash

        console.log('✅ Enhanced QR format matched:', {
          customerToken: customerToken.substring(0, 20) + '...',
          offerHash: offerHash,
          fullLength: cleanedData.length
        })

      } else if (/^\d+$/.test(cleanedData)) {
        // Format 5: Apple Wallet simple customer ID format - "4"
        console.log('🍎 Testing Apple Wallet customer ID format...')
        customerToken = cleanedData
        // Note: Apple Wallet QRs don't contain offer info, may need to prompt user
        console.warn('⚠️ Apple Wallet QR detected - offer ID unknown, may need user selection')

      } else {
        // 🆕 COMPREHENSIVE ERROR: Show all format tests that failed
        const debugInfo = {
          cleanedLength: cleanedData.length,
          hasColon: cleanedData.includes(':'),
          startsWithHttp: cleanedData.startsWith('http'),
          startsWithBrace: cleanedData.startsWith('{'),
          isDigitsOnly: /^\d+$/.test(cleanedData),
          matchesLegacyPattern: /^(?!.*:)[A-Za-z0-9+/=]{80,150}$/.test(cleanedData),
          matchesEnhancedPattern: /^[A-Za-z0-9+/=]+:[a-f0-9]{8}$/.test(cleanedData),
          preview: cleanedData.substring(0, 50)
        }
        console.error('❌ No format matched. Tested formats:', debugInfo)
        throw new Error(`Unsupported QR format. Tested: URL (no http), JSON (no {), Legacy (length=${cleanedData.length}, hasColon=${cleanedData.includes(':')}), Enhanced (no colon pattern), SimpleID (not digits). Preview: ${cleanedData.substring(0, 50)}...`)
      }

      if (customerToken) {
        console.log('✅ Valid barcode format detected:', { 
          customerToken, 
          offerHash: offerHash || 'auto-detect', 
          format: barcode.format 
        })

        setScanStatus('success')
        playSuccessSound()

        // Call success handler with format parameter
        if (onScanSuccess) {
          await onScanSuccess(customerToken, offerHash, barcode.rawValue, barcode.format)
        }
      } else {
        throw new Error('Could not extract customer information from QR code.')
      }

    } catch (error) {
      console.error('❌ QR processing failed:', error)
      setScanStatus('error')
      setErrorMessage(error.message)

      if (onScanError) {
        onScanError(error.message)
      }
    }
  }, [detectedQR, lastScanTime, onScanSuccess, onScanError, playBeep, vibrate, playSuccessSound])

  // Initialize Barcode Scanner
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

        // Check BarcodeDetector support
        const hasNativeSupport = 'BarcodeDetector' in window
        console.log('📊 BarcodeDetector support:', hasNativeSupport ? 'Native' : 'Polyfill')

        // Create BarcodeDetector instance (supports both QR and PDF417)
        barcodeDetectorRef.current = new BarcodeDetector({ 
          formats: ['qr_code', 'pdf417'] 
        })
        console.log('✅ BarcodeDetector initialized with formats: qr_code, pdf417')

        // Setup camera stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        })
        
        videoRef.current.srcObject = stream
        
        // Wait for video to be ready before starting detection
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
            resolve()
          }
        })

        // Check for flashlight support (defensive - don't break init if unavailable)
        try {
          const videoTrack = stream.getVideoTracks()[0]
          if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
            const capabilities = videoTrack.getCapabilities()
            setHasFlashlight(capabilities.torch === true)
          } else {
            setHasFlashlight(false)
          }
        } catch (error) {
          console.log('Flashlight capability check not supported:', error)
          setHasFlashlight(false)
        }

        setScanStatus('ready')
        isRunningRef.current = true

        // Start detection loop
        const detectBarcodes = async () => {
          if (!isRunningRef.current || !videoRef.current || !barcodeDetectorRef.current) return

          try {
            // Check if video is ready
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              // Get cross-browser compatible detection source
              const detectionSource = await getDetectionSource(videoRef.current)
              const barcodes = await barcodeDetectorRef.current.detect(detectionSource)
              
              // Filter for QR and PDF417 formats only
              const validBarcodes = barcodes.filter(b => 
                b.format === 'qr_code' || b.format === 'pdf417'
              )

              if (validBarcodes.length > 0) {
                // Process first valid barcode
                await handleBarcodeDetection(validBarcodes[0])
              }
            }
          } catch (error) {
            console.error('Detection error:', error)
          }

          // Schedule next frame (limit to ~2 scans per second)
          if (isRunningRef.current) {
            setTimeout(() => {
              animationFrameRef.current = requestAnimationFrame(detectBarcodes)
            }, 500)
          }
        }

        // Start detection loop
        detectBarcodes()

        console.log('📸 Barcode Scanner initialized and started')

      } catch (error) {
        console.error('❌ Scanner initialization failed:', error)
        
        // Only set state if still mounted/active
        if (isRunningRef.current) {
          setScanStatus('error')
          setErrorMessage(error.message)
        }

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

        if (isRunningRef.current) {
          setErrorMessage(errorMsg)
        }

        if (onScanError) {
          onScanError(errorMsg)
        }
      }
    }

    initScanner()

    // Cleanup function
    return () => {
      // Stop the detection loop
      isRunningRef.current = false
      
      // Cancel pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      // Stop video tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
        videoRef.current.srcObject = null
      }

      // Clear detector reference
      if (barcodeDetectorRef.current) {
        barcodeDetectorRef.current = null
      }
    }
  }, [isActive, handleBarcodeDetection, getDetectionSource, onScanError])

  // Flashlight toggle
  const toggleFlashlight = useCallback(async () => {
    if (hasFlashlight && videoRef.current && videoRef.current.srcObject) {
      try {
        const videoTrack = videoRef.current.srcObject.getVideoTracks()[0]
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashlightOn }]
        })
        setFlashlightOn(!flashlightOn)
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
      {/* Header - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex bg-black text-white p-4 justify-between items-center">
        <h2 className="text-lg font-semibold">QR Scanner</h2>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 text-xl font-bold w-12 h-12 focus:outline-none focus:ring-4 focus:ring-white/50"
          aria-label="Close scanner"
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
          autoPlay
        />

        {/* Floating Close Button - Mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 left-4 z-30 w-14 h-14 bg-black/60 backdrop-blur-sm border-2 border-white/30 rounded-full flex items-center justify-center text-white text-2xl hover:bg-black/80 active:scale-95 shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-white/50"
          aria-label="Close scanner"
          title="Close"
        >
          ←
        </button>

        {/* Targeting Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative w-56 h-56 lg:w-64 lg:h-64 border-[6px] lg:border-4 rounded-lg transition-colors duration-300 ${
              scanStatus === 'detected' || scanStatus === 'success'
                ? 'border-green-400 shadow-lg shadow-green-400/50'
                : scanStatus === 'error'
                ? 'border-red-400'
                : 'border-white shadow-2xl shadow-white/30'
            }`}
            style={{
              background: 'transparent',
              boxShadow: scanStatus === 'detected' ? '0 0 0 9999px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            {/* Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-12 h-12 lg:w-8 lg:h-8 border-t-4 border-l-4 border-white"></div>
            <div className="absolute -top-1 -right-1 w-12 h-12 lg:w-8 lg:h-8 border-t-4 border-r-4 border-white"></div>
            <div className="absolute -bottom-1 -left-1 w-12 h-12 lg:w-8 lg:h-8 border-b-4 border-l-4 border-white"></div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 lg:w-8 lg:h-8 border-b-4 border-r-4 border-white"></div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2" aria-live="polite" aria-atomic="true">
          <div 
            className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-white font-medium text-sm lg:text-base ${
              scanStatus === 'ready' || scanStatus === 'scanning' ? 'bg-blue-600' :
              scanStatus === 'detected' ? 'bg-yellow-600' :
              scanStatus === 'processing' ? 'bg-purple-600' :
              scanStatus === 'success' ? 'bg-green-600' :
              scanStatus === 'error' ? 'bg-red-600' :
              'bg-gray-600'
            }`}
            role="status"
          >
            {scanStatus === 'initializing' && '📷 Starting...'}
            {scanStatus === 'ready' && '🔍 Point camera'}
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
              <div className="flex items-center gap-">
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
      <div className="bg-black text-white p-2 lg:p-3 space-y-3">
        {/* Error Message */}
        {scanStatus === 'error' && errorMessage && (
          <div className="bg-red-600 text-white p-4 lg:p-3 rounded-lg mb-3 text-base lg:text-sm">
            <div className="flex items-start gap-">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="font-semibold">Scanning Error</div>
                <div className="text-sm">{errorMessage}</div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Flashlight Button - Only shown when available */}
        {hasFlashlight && (
          <button
            onClick={toggleFlashlight}
            className={`absolute top-20 right-4 w-14 h-14 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold transition-all shadow-lg z-20 text-2xl lg:text-xl focus:outline-none focus:ring-4 focus:ring-white/50 ${
              flashlightOn 
                ? 'bg-yellow-500 text-white shadow-yellow-500/50' 
                : 'bg-gray-700 text-white'
            }`}
            aria-label="Toggle flashlight"
            title="Flash"
          >
            <span className="text-xl">💡</span>
          </button>
        )}

        {/* Instructions - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block text-center text-gray-300 text-sm">
          📱 Hold steady • 🎯 Center QR code • 📏 Keep 6-12 inches away
        </div>
      </div>
    </div>
  )
}

EnhancedQRScanner.propTypes = {
  onScanSuccess: PropTypes.func.isRequired, // (customerToken, offerHash, rawData, format) - format is 'qr_code' or 'pdf_417'
  onScanError: PropTypes.func, // Expects a string message
  onClose: PropTypes.func,
  isActive: PropTypes.bool.isRequired
}

export default EnhancedQRScanner
