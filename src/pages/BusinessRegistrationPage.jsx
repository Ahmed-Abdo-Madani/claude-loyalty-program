import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../config/api'
import DarkModeToggle from '../components/DarkModeToggle'
import LocationAutocomplete from '../components/LocationAutocomplete'

// District cache for performance optimization
const districtCache = new Map()

// Saudi business categories from our DataStore
const businessCategories = [
  { id: 1, name: "مطاعم وكافيهات - Restaurants & Cafes", nameEn: "Restaurants & Cafes" },
  { id: 2, name: "صالونات وحلاقة - Salons & Barbershops", nameEn: "Salons & Barbershops" },
  { id: 3, name: "عطور ومستحضرات - Perfumes & Cosmetics", nameEn: "Perfumes & Cosmetics" },
  { id: 4, name: "ملابس وأزياء - Fashion & Clothing", nameEn: "Fashion & Clothing" },
  { id: 5, name: "صحة ولياقة - Health & Fitness", nameEn: "Health & Fitness" }
]

// Language content objects
const content = {
  ar: {
    // Header & Navigation
    businessRegistration: 'تسجيل الأعمال',
    joinThousands: 'انضم إلى آلاف الشركات التي تبني ولاء العملاء مع منصة مدنا',
    home: 'الرئيسية',
    features: 'الميزات',
    signIn: 'تسجيل الدخول',

    // Language Selection
    selectLanguage: 'اختر اللغة',
    arabic: 'العربية',
    english: 'English',

    // Steps
    step: 'الخطوة',
    of: 'من',
    businessInfo: 'معلومات الأعمال',
    location: 'الموقع',
    ownerInfo: 'معلومات المالك',
    account: 'الحساب',

    // Step 1: Business Information
    businessInformation: 'معلومات الأعمال',
    businessName: 'اسم الأعمال',
    businessNamePlaceholder: 'مطعم الأمل',
    businessType: 'نوع الأعمال',
    businessTypePlaceholder: 'اختر نوع الأعمال',
    crNumber: 'رقم السجل التجاري',
    crNumberPlaceholder: '1234567890',
    crNumberHelp: 'أدخل 10 أرقام فقط',
    businessDescription: 'وصف الأعمال',
    businessDescriptionPlaceholder: 'صف خدمات أعمالك',
    businessDetails: 'تفاصيل الأعمال',

    // Step 2: Location & Contact
    locationContact: 'الموقع والتواصل',
    saudiRegion: 'المنطقة السعودية',
    regionPlaceholder: 'اختر المنطقة',
    city: 'المدينة',
    cityPlaceholder: 'اختر المدينة',
    district: 'الحي',
    districtPlaceholder: 'اختر الحي (اختياري)',
    selectDistrict: 'اختر الحي',
    loadingDistricts: 'جاري تحميل الأحياء...',
    noDistricts: 'لا توجد أحياء متاحة',
    businessAddress: 'اسم الشارع',
    addressPlaceholder: 'اسم الشارع',
    businessPhone: 'هاتف الأعمال',
    businessEmail: 'بريد الأعمال الإلكتروني',

    // Step 3: Owner Information
    ownerInformation: 'معلومات المالك',
    ownerFullName: 'اسم المالك الكامل',
    ownerNamePlaceholder: 'أحمد محمد الأحمد',
    personalDetails: 'التفاصيل الشخصية',
    nationalId: 'رقم الهوية الوطنية / الإقامة',
    ownerPhone: 'هاتف المالك',
    ownerEmail: 'بريد المالك الإلكتروني',

    // Step 4: Account Setup
    accountSetup: 'إعداد الحساب',
    password: 'كلمة المرور',
    passwordPlaceholder: '6 أحرف على الأقل',
    confirmPassword: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور',
    agreeToTerms: 'أوافق على',
    termsAndConditions: 'الشروط والأحكام',
    and: 'و',
    privacyPolicy: 'سياسة الخصوصية',
    whatHappensNext: 'ماذا يحدث بعد ذلك؟',
    reviewApplication: 'سيتم مراجعة طلبك من قبل فريقنا',
    verifyDocuments: 'سنتحقق من وثائق أعمالك',
    approvalNotification: 'ستتلقى إشعار الموافقة عبر البريد الإلكتروني',
    accessDashboard: 'بمجرد الموافقة، يمكنك الوصول إلى لوحة التحكم',

    // Navigation
    previous: 'السابق',
    next: 'التالي',
    submitting: 'جاري التقديم',
    submitApplication: 'تقديم الطلب',

    // Footer
    alreadyHaveAccount: 'لديك حساب؟',
    signInLink: 'تسجيل الدخول',

    // Validation
    required: 'مطلوب',
    businessNameRequired: 'اسم الأعمال مطلوب',
    businessTypeRequired: 'نوع الأعمال مطلوب',
    crNumberRequired: 'رقم السجل التجاري مطلوب',
    invalidCrFormat: 'تنسيق السجل التجاري غير صحيح. استخدم 10 أرقام',
    regionRequired: 'المنطقة مطلوبة',
    cityRequired: 'المدينة مطلوبة',
    addressRequired: 'اسم الشارع مطلوب',
    phoneRequired: 'رقم الهاتف مطلوب',
    invalidPhoneFormat: 'تنسيق الهاتف غير صحيح. استخدم: +966XXXXXXXXX',
    emailRequired: 'البريد الإلكتروني مطلوب',
    invalidEmailFormat: 'تنسيق البريد الإلكتروني غير صحيح',
    ownerNameRequired: 'اسم المالك مطلوب',
    ownerIdRequired: 'هوية المالك مطلوبة',
    ownerPhoneRequired: 'هاتف المالك مطلوب',
    ownerEmailRequired: 'بريد المالك الإلكتروني مطلوب',
    passwordRequired: 'كلمة المرور مطلوبة',
    passwordMinLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    passwordsNotMatch: 'كلمات المرور غير متطابقة',
    termsRequired: 'يجب قبول الشروط والأحكام',
    arabicNumbersSupported: 'يمكنك استخدام الأرقام العربية'
  },
  en: {
    // Header & Navigation
    businessRegistration: 'Business Registration',
    joinThousands: 'Join thousands of businesses building customer loyalty with Madna Platform',
    home: 'Home',
    features: 'Features',
    signIn: 'Sign In',

    // Language Selection
    selectLanguage: 'Select Language',
    arabic: 'العربية',
    english: 'English',

    // Steps
    step: 'Step',
    of: 'of',
    businessInfo: 'Business Info',
    location: 'Location',
    ownerInfo: 'Owner Info',
    account: 'Account',

    // Step 1: Business Information
    businessInformation: 'Business Information',
    businessName: 'Business Name',
    businessNamePlaceholder: 'Al-Amal Restaurant',
    businessType: 'Business Type',
    businessTypePlaceholder: 'Select business type',
    crNumber: 'Commercial Registration Number',
    crNumberPlaceholder: '1234567890',
    crNumberHelp: 'Enter 10 digits only',
    businessDescription: 'Business Description',
    businessDescriptionPlaceholder: 'Describe your business services',
    businessDetails: 'Business Details',

    // Step 2: Location & Contact
    locationContact: 'Location & Contact',
    saudiRegion: 'Saudi Region',
    regionPlaceholder: 'Select region',
    city: 'City',
    cityPlaceholder: 'Select city',
    district: 'District',
    districtPlaceholder: 'Select district (optional)',
    selectDistrict: 'Select district',
    loadingDistricts: 'Loading districts...',
    noDistricts: 'No districts available',
    businessAddress: 'Street Name',
    addressPlaceholder: 'Street Name',
    businessPhone: 'Business Phone',
    businessEmail: 'Business Email',

    // Step 3: Owner Information
    ownerInformation: 'Owner Information',
    ownerFullName: 'Owner Full Name',
    ownerNamePlaceholder: 'Ahmed Mohammed Al-Ahmed',
    personalDetails: 'Personal Details',
    nationalId: 'National ID / Iqama Number',
    ownerPhone: 'Owner Phone',
    ownerEmail: 'Owner Email',

    // Step 4: Account Setup
    accountSetup: 'Account Setup',
    password: 'Password',
    passwordPlaceholder: 'Minimum 6 characters',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter password',
    agreeToTerms: 'I agree to the',
    termsAndConditions: 'Terms and Conditions',
    and: 'and',
    privacyPolicy: 'Privacy Policy',
    whatHappensNext: 'What happens next?',
    reviewApplication: 'Your application will be reviewed by our team',
    verifyDocuments: "We'll verify your business documents",
    approvalNotification: "You'll receive approval notification via email",
    accessDashboard: 'Once approved, you can access your dashboard',

    // Navigation
    previous: 'Previous',
    next: 'Next',
    submitting: 'Submitting...',
    submitApplication: 'Submit Application',

    // Footer
    alreadyHaveAccount: 'Already have an account?',
    signInLink: 'Sign in',

    // Validation
    required: 'Required',
    businessNameRequired: 'Business name is required',
    businessTypeRequired: 'Business type is required',
    crNumberRequired: 'Commercial Registration number is required',
    invalidCrFormat: 'Invalid CR format. Use 10 digits: XXXXXXXXXX',
    regionRequired: 'Region is required',
    cityRequired: 'City is required',
    addressRequired: 'Street name is required',
    phoneRequired: 'Phone number is required',
    invalidPhoneFormat: 'Invalid phone format. Use: +966XXXXXXXXX',
    emailRequired: 'Email is required',
    invalidEmailFormat: 'Invalid email format',
    ownerNameRequired: 'Owner name is required',
    ownerIdRequired: 'Owner ID is required',
    ownerPhoneRequired: 'Owner phone is required',
    ownerEmailRequired: 'Owner email is required',
    passwordRequired: 'Password is required',
    passwordMinLength: 'Password must be at least 6 characters',
    passwordsNotMatch: 'Passwords do not match',
    termsRequired: 'You must accept the terms and conditions',
    arabicNumbersSupported: 'Arabic numerals are supported'
  }
}

function BusinessRegistrationPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('ar') // 'ar' or 'en'

  // District management state
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [districtOptions, setDistrictOptions] = useState([])
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false)

  const [formData, setFormData] = useState({
    // Step 1: Business Information
    business_name: '',
    business_name_ar: '',
    business_type: '',
    license_number: '',
    description: '',

    // Step 2: Location & Contact
    location: null, // Will store selected location object from autocomplete
    region: '',     // Legacy - will be populated from location
    city: '',       // Legacy - will be populated from location  
    district: '',   // New field from location data
    address: '',
    phone: '',
    email: '',

    // Step 3: Owner Information
    owner_name: '',
    owner_name_ar: '',
    owner_id: '',
    owner_phone: '',
    owner_email: '',

    // Step 4: Account Setup
    password: '',
    confirmPassword: '',
    termsAccepted: false
  })

  // Get current language content
  const t = content[selectedLanguage]

  // Convert Arabic numerals to English numerals
  const convertArabicToEnglishNumbers = (str) => {
    if (!str) return str
    const arabicNumerals = '٠١٢٣٤٥٦٧٨٩'
    const englishNumerals = '0123456789'
    return str.split('').map(char => {
      const index = arabicNumerals.indexOf(char)
      return index !== -1 ? englishNumerals[index] : char
    }).join('')
  }

  // Extract region from location hierarchy
  const extractRegionFromHierarchy = (hierarchy) => {
    if (!hierarchy) return ''
    // "العليا، منطقة الرياض" → "منطقة الرياض"
    const parts = hierarchy.split('، ')
    return parts[parts.length - 1] // Last part is the region
  }

  // Load districts for a city with caching and smart defaults
  const loadDistrictsForCity = async (cityId, cityName) => {
    if (!cityId) return

    try {
      setLoadingDistricts(true)
      
      // Check cache first
      if (districtCache.has(cityId)) {
        const cachedDistricts = districtCache.get(cityId)
        handleDistrictsLoaded(cachedDistricts, cityName)
        return
      }

      // Fetch from API
      const response = await fetch(`${endpoints.locationBase}/cities/${cityId}/districts`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      const districts = result.success ? result.data : []
      
      // Cache the results
      districtCache.set(cityId, districts)
      
      handleDistrictsLoaded(districts, cityName)
      
    } catch (error) {
      console.error('Failed to load districts:', error)
      // Fallback: use city name as district
      setFormData(prev => ({ ...prev, district: cityName }))
      setShowDistrictDropdown(false)
    } finally {
      setLoadingDistricts(false)
    }
  }

  // Handle districts loaded with smart default behavior
  const handleDistrictsLoaded = (districts, cityName) => {
    if (districts.length === 0) {
      // No districts available - use city name as district
      setFormData(prev => ({ ...prev, district: cityName }))
      setShowDistrictDropdown(false)
      console.log('📍 No districts found, using city name as district')
    } else if (districts.length === 1) {
      // Auto-select single district
      const district = districts[0]
      const districtName = selectedLanguage === 'ar' ? district.name_ar : district.name_en
      setFormData(prev => ({ ...prev, district: districtName }))
      setShowDistrictDropdown(false) // Hide dropdown since auto-selected
      console.log('📍 Single district auto-selected:', districtName)
    } else {
      // Multiple districts - show dropdown for selection
      setDistrictOptions(districts)
      setShowDistrictDropdown(true)
      setFormData(prev => ({ ...prev, district: '' })) // Reset district for user selection
      console.log('📍 Multiple districts loaded, showing dropdown')
    }
  }

  // Handle location selection from autocomplete
  const handleLocationSelect = (location) => {
    console.log('🏙️ Location selected:', location)
    
    if (!location) return

    // Extract region from hierarchy (auto-populate hidden field)
    const region = extractRegionFromHierarchy(location.hierarchy)
    
    // Reset district state
    setShowDistrictDropdown(false)
    setDistrictOptions([])
    setLoadingDistricts(false)
    
    if (location.type === 'city') {
      // City selected - auto-populate region and load districts
      const cityName = selectedLanguage === 'ar' ? location.name_ar : location.name_en
      const cityId = location.city_id || location.id
      
      console.log('🔧 Extracted location data:', { region, city: cityName, cityId })
      
      setFormData(prev => ({
        ...prev,
        location: location,
        region: region, // Auto-populated from hierarchy
        city: cityName,
        district: '', // Will be set by loadDistrictsForCity
        location_data: {
          id: cityId,
          type: 'city',
          name_ar: location.name_ar,
          name_en: location.name_en,
          hierarchy: location.hierarchy
        }
      }))
      
      // Load districts immediately
      loadDistrictsForCity(cityId, cityName)
      
    } else if (location.type === 'district') {
      // District selected directly - extract city and region info
      const districtName = selectedLanguage === 'ar' ? location.name_ar : location.name_en
      
      // Try to extract city from hierarchy
      let cityName = ''
      if (location.hierarchy) {
        const parts = location.hierarchy.split('، ')
        if (parts.length >= 2) {
          cityName = parts[parts.length - 2] // Second to last part is city
        }
      }
      
      console.log('🔧 Extracted location data:', { region, city: cityName, district: districtName })
      
      setFormData(prev => ({
        ...prev,
        location: location,
        region: region,
        city: cityName,
        district: districtName,
        location_data: {
          id: location.district_id || location.id,
          type: 'district',
          name_ar: location.name_ar,
          name_en: location.name_en,
          hierarchy: location.hierarchy
        }
      }))
      
    } else if (location.type === 'region') {
      // Region selected - just set region, clear city and district
      const regionName = selectedLanguage === 'ar' ? location.name_ar : location.name_en
      
      console.log('🔧 Extracted location data:', { region: regionName })
      
      setFormData(prev => ({
        ...prev,
        location: location,
        region: regionName,
        city: '',
        district: '',
        location_data: {
          id: location.region_id || location.id,
          type: 'region',
          name_ar: location.name_ar,
          name_en: location.name_en,
          hierarchy: location.hierarchy
        }
      }))
    }
  }

  // Handle district selection from dropdown
  const handleDistrictSelect = (e) => {
    const districtName = e.target.value
    setFormData(prev => ({
      ...prev,
      district: districtName
    }))
  }

  // Helper function to handle form input based on language
  const handleLanguageSpecificInput = (fieldName, value) => {
    if (fieldName === 'business_name') {
      setFormData(prev => ({
        ...prev,
        [selectedLanguage === 'ar' ? 'business_name_ar' : 'business_name']: value
      }))
    } else if (fieldName === 'owner_name') {
      setFormData(prev => ({
        ...prev,
        [selectedLanguage === 'ar' ? 'owner_name_ar' : 'owner_name']: value
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: value
      }))
    }
  }

  // Validation functions
  const validateCRNumber = (crNumber) => {
    const crPattern = /^\d{10}$/
    return crPattern.test(crNumber)
  }

  const validateSaudiPhone = (phone) => {
    // Convert Arabic numerals before validation
    const convertedPhone = convertArabicToEnglishNumbers(phone)
    const phonePattern = /^\+966\d{9}$/
    return phonePattern.test(convertedPhone)
  }

  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailPattern.test(email)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (name === 'business_name' || name === 'owner_name') {
      handleLanguageSpecificInput(name, value)
    } else if (name === 'phone' || name === 'owner_phone') {
      // Convert Arabic numerals to English in real-time for phone fields
      const convertedValue = convertArabicToEnglishNumbers(value)
      setFormData(prev => ({ ...prev, [name]: convertedValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    setError('') // Clear error when user types
  }

  const validateStep = (step) => {
    setError('')

    switch (step) {
      case 1:
        // Check business name in either language (accept any one)
        const hasBusinessName = formData.business_name.trim() || formData.business_name_ar.trim()
        if (!hasBusinessName) {
          setError(t.businessNameRequired)
          return false
        }
        // Auto-populate the missing language field if only one is filled
        if (formData.business_name.trim() && !formData.business_name_ar.trim()) {
          setFormData(prev => ({ ...prev, business_name_ar: formData.business_name }))
        } else if (formData.business_name_ar.trim() && !formData.business_name.trim()) {
          setFormData(prev => ({ ...prev, business_name: formData.business_name_ar }))
        }
        if (!formData.business_type) {
          setError(t.businessTypeRequired)
          return false
        }
        if (!formData.license_number.trim()) {
          setError(t.crNumberRequired)
          return false
        }
        if (!validateCRNumber(formData.license_number)) {
          setError(t.invalidCrFormat)
          return false
        }
        return true

      case 2:
        console.log('🔍 Step 2 validation debug:')
        console.log('- formData.location:', formData.location)
        console.log('- formData.region:', formData.region)
        console.log('- formData.city:', formData.city)
        
        if (!formData.location) {
          setError(selectedLanguage === 'ar' ? 'يرجى اختيار الموقع (المنطقة أو المدينة أو الحي)' : 'Please select a location (region, city, or district)')
          return false
        }
        if (!formData.address.trim()) {
          setError(t.addressRequired)
          return false
        }
        if (!formData.phone.trim()) {
          setError(t.phoneRequired)
          return false
        }
        if (!validateSaudiPhone(formData.phone)) {
          setError(t.invalidPhoneFormat)
          return false
        }
        if (!formData.email.trim()) {
          setError(t.emailRequired)
          return false
        }
        if (!validateEmail(formData.email)) {
          setError(t.invalidEmailFormat)
          return false
        }
        return true

      case 3:
        // Check owner name in either language (accept any one)
        const hasOwnerName = formData.owner_name.trim() || formData.owner_name_ar.trim()
        if (!hasOwnerName) {
          setError(t.ownerNameRequired)
          return false
        }
        // Auto-populate the missing language field if only one is filled
        if (formData.owner_name.trim() && !formData.owner_name_ar.trim()) {
          setFormData(prev => ({ ...prev, owner_name_ar: formData.owner_name }))
        } else if (formData.owner_name_ar.trim() && !formData.owner_name.trim()) {
          setFormData(prev => ({ ...prev, owner_name: formData.owner_name_ar }))
        }
        if (!formData.owner_id.trim()) {
          setError(t.ownerIdRequired)
          return false
        }
        if (!formData.owner_phone.trim()) {
          setError(t.ownerPhoneRequired)
          return false
        }
        if (!validateSaudiPhone(formData.owner_phone)) {
          setError(t.invalidPhoneFormat)
          return false
        }
        if (!formData.owner_email.trim()) {
          setError(t.ownerEmailRequired)
          return false
        }
        if (!validateEmail(formData.owner_email)) {
          setError(t.invalidEmailFormat)
          return false
        }
        return true

      case 4:
        if (!formData.password.trim()) {
          setError(t.passwordRequired)
          return false
        }
        if (formData.password.length < 6) {
          setError(t.passwordMinLength)
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          setError(t.passwordsNotMatch)
          return false
        }
        if (!formData.termsAccepted) {
          setError(t.termsRequired)
          return false
        }
        return true

      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateStep(4)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      // Prepare business data for API
      const businessData = {
        business_name: formData.business_name,
        business_name_ar: formData.business_name_ar,
        business_type: businessCategories.find(cat => cat.id === parseInt(formData.business_type))?.nameEn || '',
        license_number: formData.license_number,
        description: formData.description,
        region: formData.region,
        city: formData.city,
        district: formData.district,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        owner_name: formData.owner_name,
        owner_name_ar: formData.owner_name_ar,
        owner_id: formData.owner_id,
        owner_phone: formData.owner_phone,
        owner_email: formData.owner_email,
        password: formData.password,
        
        // Include location metadata
        location_data: formData.location ? {
          id: formData.location.city_id || formData.location.region_id || formData.location.district_id || formData.location.id,
          type: formData.location.type,
          name_ar: formData.location.name_ar,
          name_en: formData.location.name_en,
          hierarchy: formData.location.hierarchy
        } : null
      }

      // Debug logging
      console.log('🔍 Form submission debug:')
      console.log('- formData.location:', formData.location)
      console.log('- formData.region:', formData.region)
      console.log('- formData.city:', formData.city)
      console.log('- businessData:', businessData)

      // Call the unified DataStore API
      const response = await fetch(endpoints.businessRegister, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(businessData)
      })

      if (response.ok) {
        // Success - redirect to confirmation page
        navigate('/registration-success')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Registration failed - فشل التسجيل')
      }

    } catch (error) {
      console.error('Registration error:', error)
      setError('Network error. Please try again - خطأ في الشبكة. حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  // Helper to get current business name based on selected language
  const getCurrentBusinessName = () => {
    return selectedLanguage === 'ar' ? formData.business_name_ar : formData.business_name
  }

  // Helper to get current owner name based on selected language
  const getCurrentOwnerName = () => {
    return selectedLanguage === 'ar' ? formData.owner_name_ar : formData.owner_name
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t.businessInformation}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.businessName} *
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={getCurrentBusinessName()}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t.businessNamePlaceholder}
                  dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.businessType} *
                </label>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  required
                >
                  <option value="">{t.businessTypePlaceholder}</option>
                  {businessCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {selectedLanguage === 'ar' ? category.name : category.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.crNumber} *
                </label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t.crNumberPlaceholder}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t.crNumberHelp}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.businessDescription}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t.businessDescriptionPlaceholder}
                  dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t.locationContact}
            </h3>

            {/* Saudi Location Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {selectedLanguage === 'ar' ? 'الموقع (المنطقة، المدينة، أو الحي)' : 'Location (Region, City, or District)'} *
              </label>
              <LocationAutocomplete
                value={formData.location}
                onChange={handleLocationSelect}
                language={selectedLanguage}
                placeholder={selectedLanguage === 'ar' ? 'ابحث عن المنطقة أو المدينة أو الحي...' : 'Search for region, city, or district...'}
                placeholderEn="Search for region, city, or district..."
                className="w-full"
                required
              />
              {formData.location && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>{selectedLanguage === 'ar' ? 'الموقع المحدد:' : 'Selected Location:'}</strong>
                    <div className="mt-1">
                      {formData.region && (
                        <span className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs mr-2 mb-1">
                          {selectedLanguage === 'ar' ? 'منطقة:' : 'Region:'} {formData.region}
                        </span>
                      )}
                      {formData.city && (
                        <span className="inline-block bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-md text-xs mr-2 mb-1">
                          {selectedLanguage === 'ar' ? 'مدينة:' : 'City:'} {formData.city}
                        </span>
                      )}
                      {formData.district && (
                        <span className="inline-block bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-md text-xs mr-2 mb-1">
                          {selectedLanguage === 'ar' ? 'حي:' : 'District:'} {formData.district}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* District Dropdown - shown when city is selected and multiple districts are available */}
            {showDistrictDropdown && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.district}
                </label>
                {loadingDistricts ? (
                  // Skeleton loader
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                  </div>
                ) : (
                  <select
                    value={formData.district}
                    onChange={handleDistrictSelect}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <option value="">{t.districtPlaceholder}</option>
                    {districtOptions.map((district, index) => (
                      <option 
                        key={district.district_id || district.id || index} 
                        value={selectedLanguage === 'ar' ? district.name_ar : district.name_en}
                      >
                        {selectedLanguage === 'ar' ? district.name_ar : district.name_en}
                      </option>
                    ))}
                  </select>
                )}
                {loadingDistricts && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t.loadingDistricts}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.businessAddress} *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                placeholder={t.addressPlaceholder}
                dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedLanguage === 'ar' ? 'أدخل اسم الشارع فقط (تم اختيار الموقع أعلاه)' : 'Enter the street name only (location is selected above)'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.businessPhone} *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder="+966551234567"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">✓ {t.arabicNumbersSupported}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.businessEmail} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder="info@business.sa"
                  required
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t.ownerInformation}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.ownerFullName} *
                </label>
                <input
                  type="text"
                  name="owner_name"
                  value={getCurrentOwnerName()}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t.ownerNamePlaceholder}
                  dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.nationalId} *
                </label>
                <input
                  type="text"
                  name="owner_id"
                  value={formData.owner_id}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder="1234567890"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.ownerPhone} *
                  </label>
                  <input
                    type="tel"
                    name="owner_phone"
                    value={formData.owner_phone}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                    placeholder="+966501234567"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">✓ {t.arabicNumbersSupported}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.ownerEmail} *
                  </label>
                  <input
                    type="email"
                    name="owner_email"
                    value={formData.owner_email}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                    placeholder="owner@business.sa"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t.accountSetup}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.password} *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t.passwordPlaceholder}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.confirmPassword} *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t.confirmPasswordPlaceholder}
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded"
                  required
                />
                <div className="ml-3">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    {t.agreeToTerms}{' '}
                    <Link to="/terms" className="text-primary hover:text-blue-500">
                      {t.termsAndConditions}
                    </Link>{' '}
                    {t.and}{' '}
                    <Link to="/privacy" className="text-primary hover:text-blue-500">
                      {t.privacyPolicy}
                    </Link>
                    {' '}*
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                {t.whatHappensNext}
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>✅ {t.reviewApplication}</li>
                <li>✅ {t.verifyDocuments}</li>
                <li>✅ {t.approvalNotification}</li>
                <li>✅ {t.accessDashboard}</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <DarkModeToggle />

      {/* Header with Gradient */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="flex items-center">
              <img
                src="/assets/images/madna-logo.svg"
                alt="Madna Logo"
                className="w-8 h-8 mr-3"
              />
              <span className="text-2xl font-bold text-primary">Madna</span>
            </Link>
            <nav className="flex space-x-8">
              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-primary">Home</Link>
              <Link to="/features" className="text-gray-600 dark:text-gray-300 hover:text-primary">Features</Link>
              <Link to="/auth?mode=signin" className="text-gray-600 dark:text-gray-300 hover:text-primary">Sign In</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t.businessRegistration}</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            {t.joinThousands}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

        {/* Language Selection - Only show in Step 1 */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.selectLanguage}</h3>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setSelectedLanguage('ar')}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                  selectedLanguage === 'ar'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {content.ar.arabic}
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage('en')}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                  selectedLanguage === 'en'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {content.en.english}
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t.step} {currentStep} {t.of} 4</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {[
              { step: 1, label: t.businessInfo },
              { step: 2, label: t.location },
              { step: 3, label: t.ownerInfo },
              { step: 4, label: t.account }
            ].map((item) => (
              <div key={item.step} className={`text-center ${
                currentStep >= item.step ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
              }`}>
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                  currentStep >= item.step
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                  {currentStep > item.step ? '✓' : item.step}
                </div>
                <div className="text-xs font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <span className="text-red-400 mr-2">⚠️</span>
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {selectedLanguage === 'ar' ? '←' : '←'} {t.previous}
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 bg-primary text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                >
                  {t.next} {selectedLanguage === 'ar' ? '←' : '→'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.submitting}
                    </div>
                  ) : (
                    t.submitApplication
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Back to Sign In */}
        <div className="text-center mt-6">
          <span className="text-gray-600 dark:text-gray-400">{t.alreadyHaveAccount} </span>
          <Link to="/auth?mode=signin" className="font-medium text-primary hover:text-blue-500">
            {t.signInLink}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BusinessRegistrationPage