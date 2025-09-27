import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import QRCodeGenerator from '../utils/qrCodeGenerator'
import WalletCardPreview from '../components/WalletCardPreview'
import WalletPassGenerator from '../utils/walletPassGenerator'
import ApiService from '../utils/api'

function CustomerSignup() {
  const { offerId } = useParams()
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    whatsapp: '',
    birthday: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [qrSource, setQrSource] = useState(null)
  const [customerData, setCustomerData] = useState(null)
  const [walletAdded, setWalletAdded] = useState(false)
  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (offerId) {
      loadOffer()
    }

    // Extract QR code parameters
    const source = searchParams.get('source')
    const branch = searchParams.get('branch')
    const ref = searchParams.get('ref')

    setQrSource({
      source: source || 'direct',
      branch: branch || null,
      ref: ref || null,
      timestamp: new Date().toISOString()
    })

    // Track QR code scan event
    if (offerId) {
      QRCodeGenerator.trackQREvent(offerId, 'scanned', {
        source,
        branch,
        ref,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    }
  }, [offerId, searchParams])

  const loadOffer = async () => {
    try {
      console.log('🔄 Loading offer with ID:', offerId)
      setLoading(true)
      setError('')
      const response = await ApiService.getPublicOffer(offerId)
      console.log('✅ API Response:', response)
      setOffer(response.data)
      console.log('✅ Offer loaded successfully:', response.data)
    } catch (err) {
      console.error('❌ Error loading offer:', err)
      console.error('❌ Error details:', err.response?.data || err.message)
      setError(err.message || 'Failed to load offer details')
      console.error('Error loading offer:', err)
      // Use fallback data
      setOffer({
        id: offerId,
        title: "Special Loyalty Offer",
        description: "Join our loyalty program and start earning rewards!",
        businessName: "Local Business",
        branchName: "Main Branch",
        stampsRequired: 10,
        type: "stamps",
        status: "active"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Generate customer data
    const newCustomerData = {
      customerId: `CUST-${Date.now()}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      whatsapp: formData.whatsapp,
      birthday: formData.birthday,
      joinedDate: new Date().toISOString(),
      source: qrSource?.source,
      branch: qrSource?.branch
    }

    setCustomerData(newCustomerData)

    // Track conversion event
    if (offerId) {
      QRCodeGenerator.trackQREvent(offerId, 'converted', {
        customerData: {
          customerId: newCustomerData.customerId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          hasWhatsapp: !!formData.whatsapp,
          hasBirthday: !!formData.birthday
        },
        source: qrSource?.source,
        branch: qrSource?.branch,
        ref: qrSource?.ref
      })
    }

    console.log('Customer signup:', newCustomerData)
    console.log('QR Source:', qrSource)

    setIsSubmitted(true)
  }

  const handleWalletAdded = (walletType, passData) => {
    console.log(`Added to ${walletType} wallet:`, passData)
    setWalletAdded(true)

    // Track wallet addition event
    if (offerId && customerData) {
      QRCodeGenerator.trackQREvent(offerId, 'wallet_added', {
        walletType,
        customerId: customerData.customerId,
        source: qrSource?.source
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offer details...</p>
        </div>
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Offer Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (isSubmitted && customerData && offer) {
    const progressData = {
      stampsEarned: 0, // New customer starts with 0 stamps
      totalStamps: offer.stampsRequired
    }

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
            <h2 className="text-lg text-primary mb-2">
              🎉 You've joined {offer.businessName} Loyalty! 🎉
            </h2>
            <p className="text-gray-600">
              Your loyalty card is ready. Add it to your mobile wallet for easy access!
            </p>
          </div>

          {/* Wallet Card Preview and Add Buttons */}
          <div className="mb-8">
            <WalletCardPreview
              customerData={customerData}
              offerData={{
                offerId: offerId,
                businessId: offer.businessId || offer.Business?.id,    
                businessName: offer.businessName,
                title: offer.title,
                description: offer.description,
                rewardDescription: offer.title.includes('FREE') ? 'Free Pizza' : 'Reward',
                stampsRequired: offer.stampsRequired,
                branchName: offer.branchName,
                locations: [
                  { lat: 40.7128, lng: -74.0060 } // NYC coordinates for demo
                ]
              }}
              progressData={progressData}
              onAddToWallet={handleWalletAdded}
            />
          </div>

          {/* Success Actions */}
          <div className="space-y-4">
            {walletAdded && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-green-600 font-medium">🎉 Added to Wallet!</div>
                <div className="text-sm text-green-600 mt-1">
                  Your loyalty card is now in your mobile wallet and ready to use.
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">🚀 What's Next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Visit {offer.businessName} and show your loyalty card</li>
                <li>• Earn stamps with every qualifying purchase</li>
                <li>• Get your reward after {offer.stampsRequired} stamps</li>
                <li>• Receive notifications about special offers</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="bg-accent text-white py-3 rounded-lg font-medium text-sm">
                📍 Get Directions
              </button>
              <button className="bg-primary text-white py-3 rounded-lg font-medium text-sm">
                📞 Call Restaurant
              </button>
            </div>

            {/* Customer Info Summary */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="font-medium text-gray-700 mb-2">Account Details:</div>
              <div className="space-y-1 text-gray-600">
                <div>Customer ID: {customerData.customerId}</div>
                <div>Name: {customerData.firstName} {customerData.lastName}</div>
                <div>Joined: {new Date(customerData.joinedDate).toLocaleDateString()}</div>
                {qrSource && qrSource.source !== 'direct' && (
                  <div>Source: {qrSource.source}</div>
                )}
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center pt-4">
              <p className="text-gray-600 text-sm mb-4">
                Ready to start earning rewards?
              </p>
              <button className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-4 rounded-lg font-semibold text-lg">
                🍕 Visit {offer.businessName} Now!
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Offer Selected</h1>
          <p className="text-gray-600">Please select a valid offer to continue.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-6 text-center">
          <h1 className="text-xl font-bold">{offer.businessName}</h1>
          <p className="text-blue-100">{offer.branchName}</p>
        </div>

        {/* Offer Display */}
        <div className="p-6 bg-gradient-to-r from-accent to-orange-500 text-white text-center">
          <div className="text-lg font-bold mb-2">🎉 SPECIAL OFFER! 🎉</div>
          <div className="text-xl font-bold mb-4">{offer.title}</div>

          <div className="flex justify-center space-x-1 mb-2">
            {Array.from({ length: offer.stampsRequired }, (_, i) => (
              <span key={i} className="text-lg">⭐</span>
            ))}
          </div>
          <div className="text-sm opacity-90">Collect {offer.stampsRequired} stamps</div>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700">Join our loyalty program and start earning rewards!</p>
            {qrSource && qrSource.source !== 'direct' && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                📱 Scanned from: {qrSource.source.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter your last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number (optional)
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birthday (optional)
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="consent"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                required
              />
              <label htmlFor="consent" className="ml-2 text-sm text-gray-600">
                I agree to receive promotional messages
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors"
            >
              📱 JOIN & ADD TO WALLET
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 space-y-1">
            <p>🔒 Your info is secure</p>
            <p>✨ Instant wallet card</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerSignup