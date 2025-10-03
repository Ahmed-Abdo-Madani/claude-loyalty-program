import { useState } from 'react'
import { getSecureBusinessId } from '../utils/secureAuth'

function QRTestGenerator() {
  const [generatedQR, setGeneratedQR] = useState('')

  const generateTestQR = () => {
    // Generate test tokens matching the format expected by the scanner
    const businessId = getSecureBusinessId() || localStorage.getItem('businessId') || '4'
    const demoCustomerId = 'demo-customer-123'
    const timestamp = Date.now()
    const tokenData = `${demoCustomerId}:${businessId}:${timestamp}`

    // Create customer token (same format as walletPassGenerator)
    const customerToken = btoa(tokenData).substring(0, 24)

    // Create offer hash (simple hash for demo)
    const offerHash = 'demo1234'

    // Create the QR URL that the scanner expects
    const qrUrl = `http://192.168.8.114:3000/scan/${customerToken}/${offerHash}`

    setGeneratedQR(qrUrl)

    console.log('🎯 Generated test QR:', {
      customerToken,
      offerHash,
      qrUrl,
      businessId
    })
  }

  const generateQRCodeDataURL = (text) => {
    // Simple QR code generation using Google Charts API
    const size = '200x200'
    const encodedText = encodeURIComponent(text)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodedText}`
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-medium mb-4">🧪 QR Code Test Generator</h3>
      <p className="text-gray-600 mb-4">Generate test QR codes to test the scanner functionality</p>

      <div className="space-y-4">
        <button
          onClick={generateTestQR}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
        >
          🎯 Generate Test QR Code
        </button>

        {generatedQR && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Generated QR Code:</h4>
              <div className="text-center">
                <img
                  src={generateQRCodeDataURL(generatedQR)}
                  alt="Test QR Code"
                  className="mx-auto border rounded"
                />
              </div>
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">QR Content:</div>
                <div className="text-xs bg-white p-2 rounded border font-mono break-all">
                  {generatedQR}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📱 How to Test:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. <strong>Print this QR code</strong> or display it on another device</li>
                <li>2. Click <strong>"Start QR Scanner"</strong> above</li>
                <li>3. <strong>Point your camera</strong> at this QR code</li>
                <li>4. <strong>Listen for beep</strong> when QR is detected</li>
                <li>5. <strong>Watch automatic processing</strong> of the loyalty scan</li>
              </ol>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">💡 Testing Tips:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• <strong>Steady hands:</strong> Keep camera stable for best detection</li>
                <li>• <strong>Good lighting:</strong> Ensure QR code is well-lit</li>
                <li>• <strong>Distance:</strong> Keep 6-12 inches away from the code</li>
                <li>• <strong>Clean screen:</strong> Make sure camera lens is clean</li>
                <li>• <strong>Browser permissions:</strong> Allow camera access when prompted</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QRTestGenerator