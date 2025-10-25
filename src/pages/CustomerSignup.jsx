import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { apiBaseUrl } from '../config/api'
import { validateSecureOfferId } from '../utils/secureAuth'
import QRCodeGenerator from '../utils/qrCodeGenerator'
import WalletCardPreview from '../components/WalletCardPreview'
import WalletPassGenerator from '../utils/walletPassGenerator'
import CountryCodeSelector from '../components/CountryCodeSelector'
import GenderSelector from '../components/GenderSelector'

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
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'أدخل اسمك الكامل',
    phoneNumber: 'رقم الهاتف (مطلوب)',
    phonePlaceholder: '50 123 4567',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    countryCode: 'رمز الدولة',
    joinAddToWallet: 'تسجيل',
    byJoining: 'بالانضمام، فإنك توافق على تلقي الرسائل والعروض الترويجية',
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
    loadingOffer: 'جاري تحميل تفاصيل العرض...',
    
    // Wallet Integration
    addedSuccessfully: 'تمت الإضافة بنجاح!',
    addingToWallet: 'جاري الإضافة إلى المحفظة...',
    addToAppleWallet: 'أضف إلى Apple Wallet',
    addToGoogleWallet: 'أضف إلى Google Wallet',
    walletError: 'فشلت إضافة البطاقة. يرجى المحاولة مرة أخرى.',
    tryAgain: 'حاول مرة أخرى'
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
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    phoneNumber: 'Phone Number (Required)',
    phonePlaceholder: '50 123 4567',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    countryCode: 'Country Code',
    joinAddToWallet: 'Register',
    byJoining: 'By joining, you agree to receive promotional messages and offers',
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
    loadingOffer: 'Loading offer details...',
    
    // Wallet Integration
    addedSuccessfully: 'Added Successfully!',
    addingToWallet: 'Adding to Wallet...',
    addToAppleWallet: 'Add to Apple Wallet',
    addToGoogleWallet: 'Add to Google Wallet',
    walletError: 'Failed to add card. Please try again.',
    tryAgain: 'Try Again'
  }
}

function CustomerSignup() {
  const { offerId } = useParams()
  const [searchParams] = useSearchParams()
  const [selectedLanguage, setSelectedLanguage] = useState('ar') // Arabic as primary
  const [formData, setFormData] = useState({
    fullName: '',
    countryCode: '+966',
    phone: '',
    gender: 'male'
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [qrSource, setQrSource] = useState(null)
  const [customerData, setCustomerData] = useState(null)
  const [walletAdded, setWalletAdded] = useState(false)
  const [offer, setOffer] = useState(null)
  const [cardDesign, setCardDesign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deviceCapabilities, setDeviceCapabilities] = useState(null)
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false)
  const [walletError, setWalletError] = useState(null)

  // Get current language content
  const t = content[selectedLanguage]
  const isRTL = selectedLanguage === 'ar'

  // Helper function to get colors from card design or use defaults
  const getColors = () => {
    if (cardDesign) {
      return {
        background: cardDesign.background_color || '#3B82F6',
        foreground: cardDesign.foreground_color || '#FFFFFF',
        label: cardDesign.label_color || '#E0F2FE'
      }
    }
    return {
      background: '#3B82F6',
      foreground: '#FFFFFF',
      label: '#E0F2FE'
    }
  }

  // Helper function to replace placeholders in text
  const formatText = (text, replacements = {}) => {
    let formatted = text
    Object.keys(replacements).forEach(key => {
      formatted = formatted.replace(`{${key}}`, replacements[key])
    })
    return formatted
  }

  // Helper function to render stamp icon (emoji or icon ID)
  const renderStampIcon = (stampIcon) => {
    if (!stampIcon) return '⭐'
    
    // Check if it's an emoji (1-4 chars, no hyphen)
    const isEmoji = stampIcon.length <= 4 && !stampIcon.includes('-')
    
    if (isEmoji) {
      return stampIcon
    }
    
    // It's an icon ID, render as image
    return (
      <img
        src={`${apiBaseUrl}/api/stamp-icons/${stampIcon}/preview`}
        alt="stamp icon"
        className="inline-block w-12 h-12 object-contain"
        onError={(e) => {
          // Fallback to star emoji if image fails to load
          e.target.style.display = 'none'
          e.target.insertAdjacentHTML('afterend', '⭐')
        }}
      />
    )
  }

  // Helper function to get logo URL with fallback logic
  const getLogoUrl = () => {
    // Priority 1: Business profile logo
    if (offer?.businessLogo?.url) {
      console.log('🖼️ Using business profile logo')
      return apiBaseUrl + offer.businessLogo.url
    }
    
    // Priority 2: Card design logo (from offer response)
    if (offer?.cardDesignLogo?.url) {
      console.log('🖼️ Using card design logo from offer')
      return apiBaseUrl + offer.cardDesignLogo.url
    }
    
    // Priority 3: Card design logo (from separate fetch)
    if (cardDesign?.logo_url) {
      console.log('🖼️ Using card design logo from design fetch')
      return apiBaseUrl + '/api/card-design/logo/' + cardDesign.logo_url
    }
    
    // No logo available
    console.log('⚠️ No logo available')
    return null
  }

  useEffect(() => {
    if (offerId) {
      loadOffer()
    }

    // Get device capabilities
    const capabilities = WalletPassGenerator.getDeviceCapabilities()
    setDeviceCapabilities(capabilities)

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

      // Fetch card design for dynamic colors
      try {
        const designResponse = await fetch(`${apiBaseUrl}/api/card-design/public/${offerId}`)
        if (designResponse.ok) {
          const designData = await designResponse.json()
          console.log('✅ Card design loaded:', designData.data)
          setCardDesign(designData.data)
        } else {
          console.log('ℹ️ No card design found, using defaults')
          setCardDesign(null)
        }
      } catch (designErr) {
        console.log('ℹ️ Card design fetch failed, using defaults:', designErr)
        setCardDesign(null)
      }
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

  // Helper function to convert Arabic numerals to English numerals
  const convertArabicToEnglishNumbers = (str) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    
    let result = str
    for (let i = 0; i < arabicNumbers.length; i++) {
      result = result.replace(new RegExp(arabicNumbers[i], 'g'), englishNumbers[i])
    }
    return result
  }

  // Helper function to normalize phone number
  const normalizePhoneNumber = (phone) => {
    // Convert Arabic numerals to English
    let normalized = convertArabicToEnglishNumbers(phone)
    
    // Remove all non-digit characters
    normalized = normalized.replace(/\D/g, '')
    
    // If it's a 10-digit number starting with 0, remove the leading 0
    if (normalized.length === 10 && normalized.startsWith('0')) {
      normalized = normalized.substring(1)
    }
    
    return normalized
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate phone number
      if (!formData.phone || formData.phone.trim() === '') {
        throw new Error('Please enter a valid phone number')
      }

      // Normalize phone number (convert Arabic numerals, remove leading 0 if 10 digits)
      const normalizedPhone = normalizePhoneNumber(formData.phone)

      // Basic phone validation (7-15 digits)
      if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
        throw new Error('Please enter a valid phone number (7-15 digits)')
      }

      // Split full name into first and last name
      const fullNameTrimmed = formData.fullName.trim()
      if (!fullNameTrimmed || fullNameTrimmed.length < 2) {
        throw new Error('Please enter your full name (at least 2 characters)')
      }

      const nameParts = fullNameTrimmed.split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || ''

      // Generate customer data with secure ID format (cust_* + 20 hex chars)
      const generateSecureCustomerId = () => {
        const timestamp = Date.now().toString(16) // 12 chars
        const random = Math.random().toString(16).substring(2, 10) // 8 chars
        return `cust_${timestamp}${random}`.substring(0, 25) // cust_ + 20 chars
      }

      const newCustomerData = {
        customerId: generateSecureCustomerId(),
        firstName: firstName,
        lastName: lastName,
        phone: formData.countryCode + normalizedPhone,
        gender: formData.gender,
        joinedDate: new Date().toISOString(),
        source: qrSource?.source,
        branch: qrSource?.branch
      }

      console.log('📝 Submitting customer signup:', newCustomerData)

      // ✨ Call backend API to create customer in database
      const response = await fetch(`${apiBaseUrl}/api/business/customers/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerData: newCustomerData,
          offerId: offerId
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Signup failed')
      }

      console.log('✅ Customer signup successful:', data)

      // Now customer exists in database!
      setCustomerData(newCustomerData)
      setIsSubmitted(true)

      // Track conversion event
      if (offerId) {
        QRCodeGenerator.trackQREvent(offerId, 'converted', {
          customerData: {
            customerId: newCustomerData.customerId,
            firstName: firstName,
            lastName: lastName,
            hasPhone: !!formData.phone,
            gender: formData.gender
          },
          source: qrSource?.source,
          branch: qrSource?.branch,
          ref: qrSource?.ref
        })
      }

    } catch (error) {
      console.error('❌ Customer signup failed:', error)
      setError(error.message || 'Failed to complete signup. Please try again.')
    } finally {
      setLoading(false)
    }
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

  const handleAddToAppleWallet = async () => {
    setIsGeneratingWallet(true)
    setWalletError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/wallet/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerData,
          offerData: {
            ...offer,
            offerId
          },
          progressData: {
            stampsEarned: 0,
            totalStamps: offer.stamps_required || offer.stampsRequired
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate Apple Wallet pass')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${offer.businessName}-loyalty.pkpass`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      handleWalletAdded('apple', { downloaded: true })
    } catch (err) {
      console.error('Apple Wallet generation error:', err)
      setWalletError(t.walletError)
    } finally {
      setIsGeneratingWallet(false)
    }
  }

  const handleAddToGoogleWallet = async () => {
    setIsGeneratingWallet(true)
    setWalletError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/wallet/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerData,
          offerData: {
            ...offer,
            offerId
          },
          progressData: {
            stampsEarned: 0,
            totalStamps: offer.stamps_required || offer.stampsRequired
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate Google Wallet pass')
      }

      const data = await response.json()
      
      if (data.saveUrl) {
        window.location.href = data.saveUrl
        handleWalletAdded('google', { success: true })
      } else {
        throw new Error('No save URL returned')
      }
    } catch (err) {
      console.error('Google Wallet generation error:', err)
      setWalletError(t.walletError)
    } finally {
      setIsGeneratingWallet(false)
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
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center py-20 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto w-full">
          
          {/* Business Logo with Brand Color Halo */}
          {getLogoUrl() && (
            <div className="mb-8 flex justify-center">
              <div 
                className="relative p-6 rounded-full"
                style={{ 
                  backgroundColor: getColors().label || `${getColors().background}20`
                }}
              >
                <img
                  src={getLogoUrl()}
                  alt={`${offer.businessName} Logo`}
                  className="w-32 h-32 object-contain drop-shadow-lg"
                />
              </div>
            </div>
          )}

          {/* Business Name (Bilingual, Brand Colors) */}
          <div className="text-center mb-12">
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: getColors().background }}
            >
              {offer.businessName}
            </h1>
            {offer.businessNameEn && offer.businessNameEn !== offer.businessName && (
              <p 
                className="text-sm font-medium uppercase tracking-wider"
                style={{ color: getColors().label || getColors().background }}
              >
                {offer.businessNameEn}
              </p>
            )}
          </div>

          {/* Add to Wallet Button(s) with Brand Colors */}
          <div className="space-y-4">
            {/* Apple Wallet Button */}
            {(deviceCapabilities?.supportsAppleWallet || !deviceCapabilities) && (
              <div className="w-full max-w-sm mx-auto">
                <button
                  onClick={handleAddToAppleWallet}
                  disabled={isGeneratingWallet}
                  className="w-full py-4 px-6 rounded-full font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] hover:brightness-90"
                  style={{ 
                    backgroundColor: getColors().background,
                    color: getColors().foreground
                  }}
                >
                  {isGeneratingWallet ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{t.addingToWallet}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🍎</span>
                      <span>{t.addToAppleWallet}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Google Wallet Button */}
            {(deviceCapabilities?.supportsGoogleWallet || !deviceCapabilities) && (
              <div className="w-full max-w-sm mx-auto">
                <button
                  onClick={handleAddToGoogleWallet}
                  disabled={isGeneratingWallet}
                  className="w-full py-4 px-6 rounded-full font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] hover:brightness-90"
                  style={{ 
                    backgroundColor: getColors().background,
                    color: getColors().foreground
                  }}
                >
                  {isGeneratingWallet ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{t.addingToWallet}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">📱</span>
                      <span>{t.addToGoogleWallet}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {walletError && (
            <div className="mt-6 max-w-sm mx-auto">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="text-red-600 dark:text-red-400 text-sm">{walletError}</p>
                    <button
                      onClick={() => setWalletError(null)}
                      className="mt-2 text-sm font-medium underline hover:no-underline"
                      style={{ color: getColors().background }}
                    >
                      {t.tryAgain}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Indicator */}
          {walletAdded && (
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <span style={{ color: getColors().background }}>✓</span>
                <span style={{ color: getColors().background }}>{t.addedSuccessfully}</span>
              </div>
            </div>
          )}

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

        {/* Header */}
        <div 
          className="text-white p-6"
          style={{ backgroundColor: getColors().background, color: getColors().foreground }}
        >
          {/* Business Info with Logo */}
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {getLogoUrl() && (
              <img
                src={getLogoUrl()}
                alt={`${offer.businessName} Logo`}
                className="w-16 h-16 object-contain rounded-lg border-2 border-white/20 bg-white/10 shadow-lg flex-shrink-0"
              />
            )}
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h1 className="text-xl font-bold">{offer.businessName}</h1>
              <p className="opacity-90">{offer.branchName}</p>
            </div>
          </div>
        </div>

        {/* Offer Display */}
        <div 
          className="p-6 text-white text-center"
          style={{ backgroundColor: getColors().background, filter: 'brightness(0.9)' }}
        >
          <div className="text-xl font-bold mb-4">{offer.title}</div>

          <div className={`flex flex-wrap justify-center items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''} max-w-[80%] mx-auto mb-4`}>
            {Array.from({ length: offer.stamps_required || offer.stampsRequired }, (_, i) => (
              <span key={i} className="text-5xl" role="img" aria-label="stamp">
                {renderStampIcon(cardDesign?.stamp_icon || '⭐')}
              </span>
            ))}
          </div>
          <div className="text-sm opacity-90">
            {formatText(t.collectStamps, { count: offer.stamps_required || offer.stampsRequired })}
          </div>
        </div>

        {/* Language Selection Tabs */}
        <div className="bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex justify-center">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {/* Always show Arabic first, then English - regardless of current language */}
              <button
                onClick={() => setSelectedLanguage('ar')}
                style={{ 
                  backgroundColor: selectedLanguage === 'ar' ? getColors().background : undefined,
                  color: selectedLanguage === 'ar' ? getColors().foreground : undefined
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedLanguage === 'ar'
                    ? 'shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => setSelectedLanguage('en')}
                style={{ 
                  backgroundColor: selectedLanguage === 'en' ? getColors().background : undefined,
                  color: selectedLanguage === 'en' ? getColors().foreground : undefined
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedLanguage === 'en'
                    ? 'shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700 dark:text-gray-300">{t.joinProgram}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.fullName} {t.required}
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={t.fullNamePlaceholder}
                dir={isRTL ? 'rtl' : 'ltr'}
                minLength={2}
                maxLength={100}
              />
            </div>

            {/* Phone Number Field with Country Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.phoneNumber} {t.required}
              </label>
              <div className="flex gap-2" dir="ltr">
                <CountryCodeSelector
                  value={formData.countryCode}
                  onChange={(code) => setFormData({ ...formData, countryCode: code })}
                  language={selectedLanguage}
                  className="w-auto"
                />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder={t.phonePlaceholder}
                  pattern="[0-9]{7,15}"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Gender Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.gender} {t.required}
              </label>
              <GenderSelector
                value={formData.gender}
                onChange={(gender) => setFormData({ ...formData, gender })}
                language={selectedLanguage}
                required={true}
                primaryColor={getColors().background}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: loading ? undefined : getColors().background }}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/25 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'text-white transform hover:scale-[1.02] hover:brightness-90'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {selectedLanguage === 'ar' ? 'جاري التسجيل...' : 'Signing up...'}
                </span>
              ) : (
                `📱 ${t.joinAddToWallet}`
              )}
            </button>

            {/* Disclaimer text below button */}
            <div className="text-center mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.byJoining}
              </p>
            </div>
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