import { useState, useEffect, useRef } from 'react'

function CameraDiagnostic() {
  const [cameraStatus, setCameraStatus] = useState('checking')
  const [permissions, setPermissions] = useState(null)
  const [cameras, setCameras] = useState([])
  const [errorDetails, setErrorDetails] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    checkCameraSupport()
  }, [])

  const checkCameraSupport = async () => {
    try {
      setCameraStatus('checking')
      setErrorDetails('')

      // Check basic support
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API not supported')
      }

      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported')
      }

      // Check permissions
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' })
        setPermissions(permissionStatus.state)
        console.log('Camera permission status:', permissionStatus.state)
      } catch (e) {
        console.log('Permissions API not available')
        setPermissions('unknown')
      }

      // Enumerate devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setCameras(videoDevices)
        console.log('Available cameras:', videoDevices.length)
      } catch (e) {
        console.error('Failed to enumerate devices:', e)
        setCameras([])
      }

      setCameraStatus('supported')

    } catch (error) {
      console.error('Camera support check failed:', error)
      setCameraStatus('unsupported')
      setErrorDetails(error.message)
    }
  }

  const testCamera = async () => {
    try {
      setCameraStatus('requesting')
      setErrorDetails('')

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment' // Try back camera first
        }
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraStatus('active')
      
      // Update permission status
      setPermissions('granted')

    } catch (error) {
      console.error('Camera test failed:', error)
      setCameraStatus('failed')
      
      let errorMsg = error.message
      if (error.name === 'NotAllowedError') {
        errorMsg = 'Camera access denied. Please allow camera permissions.'
        setPermissions('denied')
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.'
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Camera is already in use by another application.'
      }
      
      setErrorDetails(errorMsg)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraStatus('supported')
  }

  const getStatusColor = () => {
    switch (cameraStatus) {
      case 'supported': return 'text-green-600'
      case 'active': return 'text-blue-600'
      case 'unsupported': return 'text-red-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (cameraStatus) {
      case 'checking': return '🔍'
      case 'supported': return '✅'
      case 'requesting': return '⏳'
      case 'active': return '📹'
      case 'failed': return '❌'
      case 'unsupported': return '🚫'
      default: return '❓'
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-medium mb-4">📷 Camera Diagnostic</h3>
      
      {/* Status Display */}
      <div className="mb-6">
        <div className={`text-lg font-medium ${getStatusColor()}`}>
          {getStatusIcon()} Status: {cameraStatus.charAt(0).toUpperCase() + cameraStatus.slice(1)}
        </div>
        
        {errorDetails && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 text-sm">{errorDetails}</div>
          </div>
        )}
      </div>

      {/* Camera Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm font-medium text-gray-600">Permission Status</div>
          <div className={`text-lg ${permissions === 'granted' ? 'text-green-600' : permissions === 'denied' ? 'text-red-600' : 'text-gray-600'}`}>
            {permissions || 'Unknown'}
          </div>
        </div>
        
        <div>
          <div className="text-sm font-medium text-gray-600">Available Cameras</div>
          <div className="text-lg text-gray-800">
            {cameras.length} device(s)
          </div>
        </div>
      </div>

      {/* Camera List */}
      {cameras.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">Camera Devices:</h4>
          <div className="space-y-1">
            {cameras.map((camera, index) => (
              <div key={camera.deviceId} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {index + 1}. {camera.label || `Camera ${index + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Preview */}
      {cameraStatus === 'active' && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">Camera Preview:</h4>
          <video
            ref={videoRef}
            className="w-full max-w-sm border rounded-lg"
            autoPlay
            playsInline
            muted
          />
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={checkCameraSupport}
          disabled={cameraStatus === 'checking'}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          🔄 Recheck Support
        </button>
        
        {cameraStatus === 'supported' && (
          <button
            onClick={testCamera}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📹 Test Camera
          </button>
        )}
        
        {cameraStatus === 'active' && (
          <button
            onClick={stopCamera}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            ⏹️ Stop Camera
          </button>
        )}
      </div>

      {/* Browser Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium mb-2">Browser Information:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>User Agent:</strong> {navigator.userAgent.substring(0, 80)}...</div>
          <div><strong>HTTPS:</strong> {location.protocol === 'https:' ? '✅ Yes' : '❌ No (Required for camera)'}</div>
          <div><strong>MediaDevices API:</strong> {navigator.mediaDevices ? '✅ Supported' : '❌ Not supported'}</div>
          <div><strong>getUserMedia:</strong> {navigator.mediaDevices?.getUserMedia ? '✅ Supported' : '❌ Not supported'}</div>
        </div>
      </div>
    </div>
  )
}

export default CameraDiagnostic