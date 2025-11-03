import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiBaseUrl, endpoints } from '../config/api'
import { validateSecureOfferId } from '../utils/secureAuth'
import QRCodeGenerator from '../utils/qrCodeGenerator'
import WalletCardPreview from '../components/WalletCardPreview'
import WalletPassGenerator from '../utils/walletPassGenerator'
import CountryCodeSelector from '../components/CountryCodeSelector'
import GenderSelector from '../components/GenderSelector'
import SEO from '../components/SEO'

function CustomerSignup() {
  const { offerId } = useParams()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation('customer')
  const isRTL = i18n.language === 'ar'
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

  // Helper function to get colors from card design or use defaults
  const getColors = () => {
    if (cardDesign) {
      return {
        primary: cardDesign.background_color || '#3B82F6', // Main brand color (caramel)
        secondary: cardDesign.foreground_color || '#FFFFFF', // Text on brand color (white)
        accent: cardDesign.label_color || '#E0F2FE', // Accent/label color
        // Derived colors for proper contrast
        formBg: cardDesign.foreground_color || '#FFFFFF', // Form uses light background
        labelText: cardDesign.background_color || '#3B82F6', // Labels use brand color
        bodyText: '#374151', // Dark gray for body text on light background
        inputBg: '#FFFFFF', // White input backgrounds
        inputBorder: '#D1D5DB' // Light gray borders
      }
    }
    return {
      primary: '#3B82F6',
      secondary: '#FFFFFF',
      accent: '#E0F2FE',
      formBg: '#FFFFFF',
      labelText: '#3B82F6',
      bodyText: '#374151',
      inputBg: '#FFFFFF',
      inputBorder: '#D1D5DB'
    }
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

  /**
   * Get logo URL with 3-tier fallback logic and absolute/relative URL handling
   * 
   * Fallback Priority:
   * 1. Business profile logo (businessLogo.url) - RELATIVE path
   * 2. Card design logo from offer (cardDesignLogo.url) - ABSOLUTE URL
   * 3. Card design logo from separate fetch (cardDesign.logo_url) - ABSOLUTE URL
   * 
   * URL Handling:
   * - Absolute URLs (http://, https://): Returned as-is
   * - Relative URLs (/api/...): Prepended with apiBaseUrl
   * 
   * This handles the mixed URL contract from the backend:
   * - Business logos are relative proxy paths
   * - Card design logos are absolute URLs from ImageProcessingService
   */
  const getLogoUrl = () => {
    let url = null
    
    // Priority 1: Business profile logo
    if (offer?.businessLogo?.url) {
      console.log('🖼️ Using business profile logo')
      url = offer.businessLogo.url
    }
    // Priority 2: Card design logo (from offer response)
    else if (offer?.cardDesignLogo?.url) {
      console.log('🖼️ Using card design logo from offer')
      url = offer.cardDesignLogo.url
    }
    // Priority 3: Card design logo (from separate fetch)
    else if (cardDesign?.logo_url) {
      console.log('🖼️ Using card design logo from design fetch')
      url = cardDesign.logo_url
    }
    
    // No logo available
    if (!url) {
      console.log('⚠️ No logo available')
      return null
    }
    
    // If URL is absolute (starts with http:// or https://), return as-is
    // Otherwise, prepend apiBaseUrl for relative URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    return apiBaseUrl + url
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
    const { name, value } = e.target
    
    // Apply Arabic-to-English conversion for phone field in real-time
    if (name === 'phone') {
      const convertedValue = convertArabicToEnglishNumbers(value)
      setFormData({
        ...formData,
        [name]: convertedValue
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
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
      const response = await fetch(endpoints.appleWallet, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerData,
          offerData: {
            ...offer,
            offerId,
            stamps_required: offer.stamps_required || offer.stampsRequired
          },
          progressData: {
            stampsEarned: 0,
            totalStamps: offer.stamps_required || offer.stampsRequired,
            current_stamps: 0,
            max_stamps: offer.stamps_required || offer.stampsRequired
          }
        })
      })

      if (!response.ok) {
        // Try to parse error response
        const contentType = response.headers.get('Content-Type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.message || errorData.error || 'Failed to generate Apple Wallet pass')
        }
        throw new Error('Failed to generate Apple Wallet pass')
      }

      // Verify Content-Type before treating as .pkpass
      const contentType = response.headers.get('Content-Type')
      if (contentType !== 'application/vnd.apple.pkpass') {
        console.error('Invalid Content-Type:', contentType, 'Status:', response.status)
        // Try to parse as JSON error
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Invalid response type from server')
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
      setWalletError(err.message || t.walletError)
    } finally {
      setIsGeneratingWallet(false)
    }
  }

  const handleAddToGoogleWallet = async () => {
    setIsGeneratingWallet(true)
    setWalletError(null)

    try {
      const response = await fetch(endpoints.googleWallet, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerData,
          offerData: {
            ...offer,
            offerId,
            stamps_required: offer.stamps_required || offer.stampsRequired
          },
          progressData: {
            stampsEarned: 0,
            totalStamps: offer.stamps_required || offer.stampsRequired,
            current_stamps: 0,
            max_stamps: offer.stamps_required || offer.stampsRequired
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
      setWalletError(t('signup.wallet.walletError'))
    } finally {
      setIsGeneratingWallet(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('signup.errors.loadingOffer')}</p>
        </div>
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('signup.errors.offerNotFound')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg"
          >
            {t('signup.errors.goBack')}
          </button>
        </div>
      </div>
    )
  }

  if (isSubmitted && customerData && offer) {
    return (
      <div 
        className="min-h-screen dark:bg-gray-900 flex flex-col items-center justify-center py-20 px-4" 
        style={{ backgroundColor: getColors().primary }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="max-w-md mx-auto w-full">
          
          {/* Business Logo with Brand Color Halo */}
          {getLogoUrl() && (
            <div className="mb-8 flex justify-center">
              <img
                src={getLogoUrl()}
                alt={`${offer.businessName} Logo`}
                className="w-32 h-32 object-contain drop-shadow-lg"
              />
            </div>
          )}

          {/* Business Name (Bilingual, Brand Colors) */}
          <div className="text-center mb-12">
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: getColors().secondary }}
            >
              {offer.businessName}
            </h1>
            {offer.businessNameEn && offer.businessNameEn !== offer.businessName && (
              <p 
                className="text-sm font-medium uppercase tracking-wider"
                style={{ color: getColors().secondary, opacity: 0.7 }}
              >
                {offer.businessNameEn}
              </p>
            )}
          </div>

          {/* Add to Wallet Button(s) with Official Platform Designs */}
          <div className="space-y-4 px-4">
            {/* Apple Wallet Button */}
            {(deviceCapabilities?.supportsAppleWallet || !deviceCapabilities) && (
              <div className="w-full max-w-[240px] mx-auto">
                <button
                  onClick={handleAddToAppleWallet}
                  disabled={isGeneratingWallet}
                  className="relative w-full block transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  aria-label={t('signup.wallet.addToAppleWallet')}
                  aria-busy={isGeneratingWallet}
                >
                  <img
                    src={`/assets/wallet-buttons/add-to-apple-wallet-${i18n.language}.svg`}
                    alt={t('signup.wallet.addToAppleWallet')}
                    className="w-full h-auto"
                    draggable="false"
                  />
                  {isGeneratingWallet && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Google Wallet Button */}
            {(deviceCapabilities?.supportsGoogleWallet || !deviceCapabilities) && (
              <div className="w-full max-w-[260px] mx-auto">
                <button
                  onClick={handleAddToGoogleWallet}
                  disabled={isGeneratingWallet}
                  className="relative w-full block transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  aria-label={t('signup.wallet.addToGoogleWallet')}
                  aria-busy={isGeneratingWallet}
                >
                  <img
                    src={`/assets/wallet-buttons/add-to-google-wallet-${i18n.language}.svg`}
                    alt={t('signup.wallet.addToGoogleWallet')}
                    className="w-full h-auto"
                    draggable="false"
                  />
                  {isGeneratingWallet && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded-lg">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
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
                      style={{ color: getColors().primary }}
                    >
                      {t('signup.wallet.tryAgain')}
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
                <span style={{ color: getColors().primary }}>✓</span>
                <span style={{ color: getColors().primary }}>{t('signup.wallet.addedSuccessfully')}</span>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('signup.errors.noOfferSelected')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('signup.errors.selectValidOffer')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <SEO 
        title={offer?.title ? `${offer.title} - ${t('seo:pages.customerSignup.title')}` : undefined}
        titleKey={!offer?.title ? 'pages.customerSignup.title' : undefined}
        descriptionKey="pages.customerSignup.description"
      />
      
      <div 
        className="max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{ backgroundColor: getColors().formBg }}
      >

        {/* Header */}
        <div 
          className="text-white p-6"
          style={{ backgroundColor: getColors().primary, color: getColors().secondary }}
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
          className="p-4 sm:p-6 text-white text-center"
          style={{ backgroundColor: getColors().primary, filter: 'brightness(0.9)' }}
        >
          <div className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">{offer.title}</div>

          <div className={`flex flex-wrap justify-center items-center gap-2 sm:gap-3 ${isRTL ? 'flex-row-reverse' : ''} max-w-full sm:max-w-[80%] mx-auto mb-3 sm:mb-4`}>
            {Array.from({ length: offer.stamps_required || offer.stampsRequired }, (_, i) => (
              <span key={i} className="text-3xl sm:text-4xl md:text-5xl" role="img" aria-label="stamp">
                {renderStampIcon(cardDesign?.stamp_icon || '⭐')}
              </span>
            ))}
          </div>
          <div className="text-xs sm:text-sm opacity-90">
            {t('signup.header.collectStamps', { count: offer.stamps_required || offer.stampsRequired })}
          </div>
        </div>

        {/* Language Selection Tabs */}
        <div 
          className="px-6 pt-4"
          style={{ backgroundColor: getColors().formBg }}
        >
          <div className="flex justify-center">
            <div 
              className="flex rounded-lg p-1"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              {/* Always show Arabic first, then English - regardless of current language */}
              <button
                onClick={() => i18n.changeLanguage('ar')}
                style={{ 
                  backgroundColor: i18n.language === 'ar' ? getColors().primary : undefined,
                  color: i18n.language === 'ar' ? getColors().secondary : getColors().bodyText
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  i18n.language === 'ar'
                    ? 'shadow-sm'
                    : 'hover:opacity-80'
                }`}
              >
                {t('signup.language.arabic')}
              </button>
              <button
                onClick={() => i18n.changeLanguage('en')}
                style={{ 
                  backgroundColor: i18n.language === 'en' ? getColors().primary : undefined,
                  color: i18n.language === 'en' ? getColors().secondary : getColors().bodyText
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  i18n.language === 'en'
                    ? 'shadow-sm'
                    : 'hover:opacity-80'
                }`}
              >
                {t('signup.language.english')}
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p 
              className="font-medium"
              style={{ color: getColors().labelText }}
            >
              {t('signup.header.joinProgram')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: getColors().labelText }}
              >
                {t('signup.form.fullName')} <span style={{ color: getColors().labelText }}>{t('signup.form.required')}</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                style={{ 
                  backgroundColor: getColors().inputBg,
                  borderColor: getColors().inputBorder,
                  color: getColors().bodyText,
                  '--tw-ring-color': getColors().primary
                }}
                placeholder={t('signup.form.fullNamePlaceholder')}
                dir={isRTL ? 'rtl' : 'ltr'}
                minLength={2}
                maxLength={100}
              />
            </div>

            {/* Phone Number Field with Country Code */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: getColors().labelText }}
              >
                {t('signup.form.phoneNumber')} <span style={{ color: getColors().labelText }}>{t('signup.form.required')}</span>
              </label>
              <div className="flex gap-2" dir="ltr">
                <div className="w-[120px] flex-shrink-0">
                  <CountryCodeSelector
                    value={formData.countryCode}
                    onChange={(code) => setFormData({ ...formData, countryCode: code })}
                    language={i18n.language}
                    className=""
                    primaryColor={getColors().primary}
                    backgroundColor={getColors().inputBg}
                    textColor={getColors().bodyText}
                    borderColor={getColors().inputBorder}
                  />
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="flex-1 min-w-0 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{ 
                    backgroundColor: getColors().inputBg,
                    borderColor: getColors().inputBorder,
                    color: getColors().bodyText,
                    '--tw-ring-color': getColors().primary
                  }}
                  placeholder={t('signup.form.phonePlaceholder')}
                  pattern="[0-9]{7,15}"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Gender Selector */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: getColors().labelText }}
              >
                {t('signup.form.gender')} <span style={{ color: getColors().labelText }}>{t('signup.form.required')}</span>
              </label>
              <GenderSelector
                value={formData.gender}
                onChange={(gender) => setFormData({ ...formData, gender })}
                language={i18n.language}
                required={true}
                primaryColor={getColors().primary}
                backgroundColor="#F3F4F6"
                textColor={getColors().bodyText}
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
              style={{ 
                backgroundColor: loading ? '#9CA3AF' : getColors().primary,
                color: getColors().secondary
              }}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/25 ${
                loading
                  ? 'cursor-not-allowed'
                  : 'transform hover:scale-[1.02] hover:brightness-90'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('signup.form.signingUp')}
                </span>
              ) : (
                `📱 ${t('signup.form.joinAddToWallet')}`
              )}
            </button>

            {/* Disclaimer text below button */}
            <div className="text-center mt-3">
              <p 
                className="text-xs"
                style={{ color: getColors().bodyText, opacity: 0.7 }}
              >
                {t('signup.form.byJoining')}
              </p>
            </div>
          </form>

          <div className="mt-6 text-center text-sm space-y-1">
            <p style={{ color: getColors().bodyText, opacity: 0.7 }}>🔒 {t('signup.security.secureInfo')}</p>
            <p style={{ color: getColors().bodyText, opacity: 0.7 }}>✨ {t('signup.security.instantWallet')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerSignup