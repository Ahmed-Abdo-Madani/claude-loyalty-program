import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { apiBaseUrl } from '../config/api'
import { validateSecureOfferId } from '../utils/secureAuth'
import QRCodeGenerator from '../utils/qrCodeGenerator'
import WalletCardPreview from '../components/WalletCardPreview'
import WalletPassGenerator from '../utils/walletPassGenerator'

// Language content objects
const content = {
  ar: {
    // Header & Business Info
    businessName: 'اسم الأعمال',
    branchName: 'اسم الفرع',
    specialOffer: 'عرض خاص!',
    joinProgram: 'انضم إلى برنامج الولاء واحصل على المكافآت!',
    collectStamps: 'اجمع {count} طوابع',
    scannedFrom: 'تم المسح من: {source}',

    // Language Selection
    selectLanguage: 'اختر اللغة',
    arabic: 'العربية',
    english: 'English',

    // Form Fields
    firstName: 'الاسم الأول',
    firstNamePlaceholder: 'أدخل اسمك الأول',
    lastName: 'الاسم الأخير',
    lastNamePlaceholder: 'أدخل اسمك الأخير',
    phoneNumber: 'رقم الهاتف',
    phonePlaceholder: '+966 50 123 4567',
    birthday: 'تاريخ الميلاد',
    agreeToReceive: 'أوافق على تلقي الرسائل الترويجية',
    joinAddToWallet: 'انضم وأضف إلى المحفظة',
    required: '*',

    // Security & Features
    secureInfo: 'معلوماتك آمنة',
    instantWallet: 'بطاقة محفظة فورية',

    // Success Page
    welcome: 'مرحباً!',
    joinedLoyalty: 'لقد انضممت إلى برنامج ولاء {businessName}! 🎉',
    cardReady: 'بطاقة الولاء جاهزة. أضفها إلى محفظة الجوال للوصول السريع!',
    addedToWallet: 'تمت الإضافة إلى المحفظة!',
    walletReady: 'بطاقة الولاء الآن في محفظة الجوال وجاهزة للاستخدام.',
    whatsNext: 'ما التالي؟',
    visitBusiness: 'زر {businessName} وأظهر بطاقة الولاء',
    earnStamps: 'احصل على طوابع مع كل عملية شراء مؤهلة',
    getReward: 'احصل على مكافأتك بعد {count} طوابع',
    receiveNotifications: 'تلقَّ إشعارات حول العروض الخاصة',
    getDirections: 'احصل على الاتجاهات',
    callRestaurant: 'اتصل بالمطعم',
    accountDetails: 'تفاصيل الحساب:',
    customerId: 'رقم العميل:',
    name: 'الاسم:',
    joined: 'تاريخ الانضمام:',
    source: 'المصدر:',
    readyToEarn: 'مستعد لكسب المكافآت؟',
    visitNow: 'زر {businessName} الآن!',

    // Error States
    offerNotFound: 'العرض غير موجود',
    goBack: 'ارجع',
    noOfferSelected: 'لم يتم اختيار عرض',
    selectValidOffer: 'يرجى اختيار عرض صالح للمتابعة.',
    loadingOffer: 'جاري تحميل تفاصيل العرض...'
  },
  en: {
    // Header & Business Info
    businessName: 'Business Name',
    branchName: 'Branch Name',
    specialOffer: 'SPECIAL OFFER!',
    joinProgram: 'Join our loyalty program and start earning rewards!',
    collectStamps: 'Collect {count} stamps',
    scannedFrom: 'Scanned from: {source}',

    // Language Selection
    selectLanguage: 'Select Language',
    arabic: 'العربية',
    english: 'English',

    // Form Fields
    firstName: 'First Name',
    firstNamePlaceholder: 'Enter your first name',
    lastName: 'Last Name',
    lastNamePlaceholder: 'Enter your last name',
    phoneNumber: 'Phone Number',
    phonePlaceholder: '+966 50 123 4567',
    birthday: 'Birthday',
    agreeToReceive: 'I agree to receive promotional messages',
    joinAddToWallet: 'JOIN & ADD TO WALLET',
    required: '*',

    // Security & Features
    secureInfo: 'Your info is secure',
    instantWallet: 'Instant wallet card',

    // Success Page
    welcome: 'Welcome!',
    joinedLoyalty: "You've joined {businessName} Loyalty! 🎉",
    cardReady: 'Your loyalty card is ready. Add it to your mobile wallet for easy access!',
    addedToWallet: 'Added to Wallet!',
    walletReady: 'Your loyalty card is now in your mobile wallet and ready to use.',
    whatsNext: "What's Next?",
    visitBusiness: 'Visit {businessName} and show your loyalty card',
    earnStamps: 'Earn stamps with every qualifying purchase',
    getReward: 'Get your reward after {count} stamps',
    receiveNotifications: 'Receive notifications about special offers',
    getDirections: 'Get Directions',
    callRestaurant: 'Call Restaurant',
    accountDetails: 'Account Details:',
    customerId: 'Customer ID:',
    name: 'Name:',
    joined: 'Joined:',
    source: 'Source:',
    readyToEarn: 'Ready to start earning rewards?',
    visitNow: 'Visit {businessName} Now!',

    // Error States
    offerNotFound: 'Offer Not Found',
    goBack: 'Go Back',
    noOfferSelected: 'No Offer Selected',
    selectValidOffer: 'Please select a valid offer to continue.',
    loadingOffer: 'Loading offer details...'
  }
}

function CustomerSignup() {
  const { offerId } = useParams()
  const [searchParams] = useSearchParams()
  const [selectedLanguage, setSelectedLanguage] = useState('ar') // Arabic as primary
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

  // Get current language content
  const t = content[selectedLanguage]
  const isRTL = selectedLanguage === 'ar'

  // Helper function to replace placeholders in text
  const formatText = (text, replacements = {}) => {
    let formatted = text
    Object.keys(replacements).forEach(key => {
      formatted = formatted.replace(`{${key}}`, replacements[key])
    })
    return formatted
  }

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
      console.log('� Loading public offer with secure ID:', offerId)
      
      // Validate offer ID format
      if (!validateSecureOfferId(offerId)) {
        throw new Error('Invalid offer ID format')
      }
      
      setLoading(true)
      setError('')
      
      // Use direct fetch to public endpoint (no authentication needed)
      const response = await fetch(`${apiBaseUrl}/api/business/public/offer/${offerId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load offer')
      }
      
      console.log('✅ Public offer loaded successfully:', data.data)
      setOffer(data.data)
    } catch (err) {
      console.error('❌ Error loading offer:', err)
      setError(err.message || 'Failed to load offer details')
      console.error('Error loading offer:', err)
      
      // Use fallback data for development
      setOffer({
        public_id: offerId,
        title: "Special Loyalty Offer",
        description: "Join our loyalty program and start earning rewards!",
        businessName: "Local Business",
        branchName: "Main Branch",
        stamps_required: 10,
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
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loadingOffer}</p>
        </div>
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.offerNotFound}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg"
          >
            {t.goBack}
          </button>
        </div>
      </div>
    )
  }

  if (isSubmitted && customerData && offer) {
    const progressData = {
      stampsEarned: 0, // New customer starts with 0 stamps
      totalStamps: offer.stamps_required || offer.stampsRequired
    }

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.welcome}</h1>
            <h2 className="text-lg text-primary mb-2">
              🎉 {formatText(t.joinedLoyalty, { businessName: offer.businessName })} 🎉
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t.cardReady}
            </p>
          </div>

          {/* Wallet Card Preview and Add Buttons */}
          <div className="mb-8">
            <WalletCardPreview
              customerData={customerData}
              offerData={{
                offerId: offerId, // This is now the secure offer ID
                businessId: offer.business_id || offer.Business?.public_id || offer.Business?.id,
                businessName: offer.businessName,
                title: offer.title,
                description: offer.description,
                rewardDescription: offer.title.includes('FREE') ? 'Free Pizza' : 'Reward',
                stamps_required: offer.stampsRequired || offer.stamps_required, // Fixed: use snake_case for backend compatibility
                branchName: offer.branchName,
                businessLogo: offer.businessLogo, // Include business logo for wallet passes
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
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <div className="text-green-600 dark:text-green-400 font-medium">🎉 {t.addedToWallet}</div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {t.walletReady}
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">🚀 {t.whatsNext}</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• {formatText(t.visitBusiness, { businessName: offer.businessName })}</li>
                <li>• {t.earnStamps}</li>
                <li>• {formatText(t.getReward, { count: offer.stamps_required || offer.stampsRequired })}</li>
                <li>• {t.receiveNotifications}</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="bg-accent hover:bg-orange-600 text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm">
                📍 {t.getDirections}
              </button>
              <button className="bg-primary hover:bg-blue-700 text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm">
                📞 {t.callRestaurant}
              </button>
            </div>

            {/* Customer Info Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t.accountDetails}</div>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div>{t.customerId} {customerData.customerId}</div>
                <div>{t.name} {customerData.firstName} {customerData.lastName}</div>
                <div>{t.joined} {new Date(customerData.joinedDate).toLocaleDateString(selectedLanguage === 'ar' ? 'ar-SA' : 'en-US')}</div>
                {qrSource && qrSource.source !== 'direct' && (
                  <div>{t.source} {qrSource.source}</div>
                )}
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center pt-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {t.readyToEarn}
              </p>
              <button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg transform hover:scale-[1.02]">
                🍕 {formatText(t.visitNow, { businessName: offer.businessName })}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.noOfferSelected}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.selectValidOffer}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">

        {/* Language Selection Tabs */}
        <div className="bg-white dark:bg-gray-800 px-6 pt-6">
          <div className="flex justify-center mb-4">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {/* Always show Arabic first, then English - regardless of current language */}
              <button
                onClick={() => setSelectedLanguage('ar')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedLanguage === 'ar'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => setSelectedLanguage('en')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedLanguage === 'en'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-6 text-center">
          {/* Business Logo */}
          {offer.businessLogo && (
            <div className="mb-4 flex justify-center">
              <img
                src={offer.businessLogo.url}
                alt={`${offer.businessName} Logo`}
                className="w-16 h-16 object-contain rounded-lg border-2 border-white/20 bg-white/10 shadow-lg"
              />
            </div>
          )}
          <h1 className="text-xl font-bold">{offer.businessName}</h1>
          <p className="text-blue-100">{offer.branchName}</p>
        </div>

        {/* Offer Display */}
        <div className="p-6 bg-gradient-to-r from-accent to-orange-500 text-white text-center">
          <div className="text-lg font-bold mb-2">🎉 {t.specialOffer} 🎉</div>
          <div className="text-xl font-bold mb-4">{offer.title}</div>

          <div className={`flex justify-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} mb-2`}>
            {Array.from({ length: offer.stamps_required || offer.stampsRequired }, (_, i) => (
              <span key={i} className="text-lg">⭐</span>
            ))}
          </div>
          <div className="text-sm opacity-90">
            {formatText(t.collectStamps, { count: offer.stamps_required || offer.stampsRequired })}
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700 dark:text-gray-300">{t.joinProgram}</p>
            {qrSource && qrSource.source !== 'direct' && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full inline-block border border-blue-200 dark:border-blue-800">
                📱 {formatText(t.scannedFrom, { source: qrSource.source.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) })}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.firstName} {t.required}
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={t.firstNamePlaceholder}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.lastName} {t.required}
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={t.lastNamePlaceholder}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.phoneNumber}
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={t.phonePlaceholder}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.birthday}
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              />
            </div>

            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                id="consent"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                required
              />
              <label htmlFor="consent" className={`text-sm text-gray-600 dark:text-gray-400 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                {t.agreeToReceive}
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-blue-700 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-primary/25"
            >
              📱 {t.joinAddToWallet}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>🔒 {t.secureInfo}</p>
            <p>✨ {t.instantWallet}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerSignup