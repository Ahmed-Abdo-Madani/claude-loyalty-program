import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

function BusinessRegistrationPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('customer')
  const isRTL = i18n.language === 'ar'
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      const districtName = i18n.language === 'ar' ? district.name_ar : district.name_en
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
      const cityName = i18n.language === 'ar' ? location.name_ar : location.name_en
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
      const districtName = i18n.language === 'ar' ? location.name_ar : location.name_en
      
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
      const regionName = i18n.language === 'ar' ? location.name_ar : location.name_en
      
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
        [i18n.language === 'ar' ? 'business_name_ar' : 'business_name']: value
      }))
    } else if (fieldName === 'owner_name') {
      setFormData(prev => ({
        ...prev,
        [i18n.language === 'ar' ? 'owner_name_ar' : 'owner_name']: value
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
          setError(t('registration.validation.businessNameRequired'))
          return false
        }
        // Auto-populate the missing language field if only one is filled
        if (formData.business_name.trim() && !formData.business_name_ar.trim()) {
          setFormData(prev => ({ ...prev, business_name_ar: formData.business_name }))
        } else if (formData.business_name_ar.trim() && !formData.business_name.trim()) {
          setFormData(prev => ({ ...prev, business_name: formData.business_name_ar }))
        }
        if (!formData.business_type) {
          setError(t('registration.validation.businessTypeRequired'))
          return false
        }
        if (!formData.license_number.trim()) {
          setError(t('registration.validation.crNumberRequired'))
          return false
        }
        if (!validateCRNumber(formData.license_number)) {
          setError(t('registration.validation.invalidCrFormat'))
          return false
        }
        return true

      case 2:
        console.log('🔍 Step 2 validation debug:')
        console.log('- formData.location:', formData.location)
        console.log('- formData.region:', formData.region)
        console.log('- formData.city:', formData.city)
        
        if (!formData.location) {
          setError(i18n.language === 'ar' ? 'يرجى اختيار الموقع (المنطقة أو المدينة أو الحي)' : 'Please select a location (region, city, or district)')
          return false
        }
        if (!formData.address.trim()) {
          setError(t('registration.validation.addressRequired'))
          return false
        }
        if (!formData.phone.trim()) {
          setError(t('registration.validation.phoneRequired'))
          return false
        }
        if (!validateSaudiPhone(formData.phone)) {
          setError(t('registration.validation.invalidPhoneFormat'))
          return false
        }
        if (!formData.email.trim()) {
          setError(t('registration.validation.emailRequired'))
          return false
        }
        if (!validateEmail(formData.email)) {
          setError(t('registration.validation.invalidEmailFormat'))
          return false
        }
        return true

      case 3:
        // Check owner name in either language (accept any one)
        const hasOwnerName = formData.owner_name.trim() || formData.owner_name_ar.trim()
        if (!hasOwnerName) {
          setError(t('registration.validation.ownerNameRequired'))
          return false
        }
        // Auto-populate the missing language field if only one is filled
        if (formData.owner_name.trim() && !formData.owner_name_ar.trim()) {
          setFormData(prev => ({ ...prev, owner_name_ar: formData.owner_name }))
        } else if (formData.owner_name_ar.trim() && !formData.owner_name.trim()) {
          setFormData(prev => ({ ...prev, owner_name: formData.owner_name_ar }))
        }
        if (!formData.owner_id.trim()) {
          setError(t('registration.validation.ownerIdRequired'))
          return false
        }
        if (!formData.owner_phone.trim()) {
          setError(t('registration.validation.ownerPhoneRequired'))
          return false
        }
        if (!validateSaudiPhone(formData.owner_phone)) {
          setError(t('registration.validation.invalidPhoneFormat'))
          return false
        }
        if (!formData.owner_email.trim()) {
          setError(t('registration.validation.ownerEmailRequired'))
          return false
        }
        if (!validateEmail(formData.owner_email)) {
          setError(t('registration.validation.invalidEmailFormat'))
          return false
        }
        return true

      case 4:
        if (!formData.password.trim()) {
          setError(t('registration.validation.passwordRequired'))
          return false
        }
        if (formData.password.length < 6) {
          setError(t('registration.validation.passwordMinLength'))
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          setError(t('registration.validation.passwordsNotMatch'))
          return false
        }
        if (!formData.termsAccepted) {
          setError(t('registration.validation.termsRequired'))
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
    return i18n.language === 'ar' ? formData.business_name_ar : formData.business_name
  }

  // Helper to get current owner name based on selected language
  const getCurrentOwnerName = () => {
    return i18n.language === 'ar' ? formData.owner_name_ar : formData.owner_name
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t('registration.businessInfo.businessInformation')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.businessInfo.businessName')} *
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={getCurrentBusinessName()}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t('registration.businessInfo.businessNamePlaceholder')}
                  dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.businessInfo.businessType')} *
                </label>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  required
                >
                  <option value="">{t('registration.businessInfo.businessTypePlaceholder')}</option>
                  {businessCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {i18n.language === 'ar' ? category.name : category.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.businessInfo.crNumber')} *
                </label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t('registration.businessInfo.crNumberPlaceholder')}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('registration.businessInfo.crNumberHelp')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.businessInfo.businessDescription')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t('registration.businessInfo.businessDescriptionPlaceholder')}
                  dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t('registration.locationContact.locationContact')}
            </h3>

            {/* Saudi Location Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {i18n.language === 'ar' ? 'الموقع (المنطقة، المدينة، أو الحي)' : 'Location (Region, City, or District)'} *
              </label>
              <LocationAutocomplete
                value={formData.location}
                onChange={handleLocationSelect}
                language={i18n.language}
                placeholder={i18n.language === 'ar' ? 'ابحث عن المنطقة أو المدينة أو الحي...' : 'Search for region, city, or district...'}
                placeholderEn="Search for region, city, or district..."
                className="w-full"
                required
              />
              {formData.location && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>{i18n.language === 'ar' ? 'الموقع المحدد:' : 'Selected Location:'}</strong>
                    <div className="mt-1">
                      {formData.region && (
                        <span className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs mr-2 mb-1">
                          {i18n.language === 'ar' ? 'منطقة:' : 'Region:'} {formData.region}
                        </span>
                      )}
                      {formData.city && (
                        <span className="inline-block bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-md text-xs mr-2 mb-1">
                          {i18n.language === 'ar' ? 'مدينة:' : 'City:'} {formData.city}
                        </span>
                      )}
                      {formData.district && (
                        <span className="inline-block bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-md text-xs mr-2 mb-1">
                          {i18n.language === 'ar' ? 'حي:' : 'District:'} {formData.district}
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
                  {t('registration.locationContact.district')}
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
                    dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <option value="">{t('registration.locationContact.districtPlaceholder')}</option>
                    {districtOptions.map((district, index) => (
                      <option 
                        key={district.district_id || district.id || index} 
                        value={i18n.language === 'ar' ? district.name_ar : district.name_en}
                      >
                        {i18n.language === 'ar' ? district.name_ar : district.name_en}
                      </option>
                    ))}
                  </select>
                )}
                {loadingDistricts && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('registration.locationContact.loadingDistricts')}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('registration.locationContact.businessAddress')} *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                placeholder={t('registration.locationContact.addressPlaceholder')}
                dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {i18n.language === 'ar' ? 'أدخل اسم الشارع فقط (تم اختيار الموقع أعلاه)' : 'Enter the street name only (location is selected above)'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.locationContact.businessPhone')} *
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">✓ {t('registration.validation.arabicNumbersSupported')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.locationContact.businessEmail')} *
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
              {t('registration.ownerInfo.ownerInformation')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.ownerInfo.ownerFullName')} *
                </label>
                <input
                  type="text"
                  name="owner_name"
                  value={getCurrentOwnerName()}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t('registration.ownerInfo.ownerNamePlaceholder')}
                  dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.ownerInfo.nationalId')} *
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
                    {t('registration.ownerInfo.ownerPhone')} *
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">✓ {t('registration.validation.arabicNumbersSupported')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('registration.ownerInfo.ownerEmail')} *
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
              {t('registration.accountSetup.accountSetup')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.accountSetup.password')} *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t('registration.accountSetup.passwordPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('registration.accountSetup.confirmPassword')} *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  placeholder={t('registration.accountSetup.confirmPasswordPlaceholder')}
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
                    {t('registration.accountSetup.agreeToTerms')}{' '}
                    <Link to="/terms" className="text-primary hover:text-blue-500">
                      {t('registration.accountSetup.termsAndConditions')}
                    </Link>{' '}
                    {t('registration.accountSetup.and')}{' '}
                    <Link to="/privacy" className="text-primary hover:text-blue-500">
                      {t('registration.accountSetup.privacyPolicy')}
                    </Link>
                    {' '}*
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                {t('registration.accountSetup.whatHappensNext')}
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>✅ {t('registration.accountSetup.reviewApplication')}</li>
                <li>✅ {t('registration.accountSetup.verifyDocuments')}</li>
                <li>✅ {t('registration.accountSetup.approvalNotification')}</li>
                <li>✅ {t('registration.accountSetup.accessDashboard')}</li>
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
            <nav className="flex gap-8">
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('registration.header.businessRegistration')}</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            {t('registration.header.joinThousands')}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

        {/* Language Selection - Only show in Step 1 */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('registration.language.selectLanguage')}</h3>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => i18n.changeLanguage('ar')}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                  i18n.language === 'ar'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('registration.language.arabic')}
              </button>
              <button
                type="button"
                onClick={() => i18n.changeLanguage('en')}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('registration.language.english')}
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('registration.steps.step')} {currentStep} {t('registration.steps.of')} 4</span>
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
              { step: 1, label: t('registration.steps.businessInfo') },
              { step: 2, label: t('registration.steps.location') },
              { step: 3, label: t('registration.steps.ownerInfo') },
              { step: 4, label: t('registration.steps.account') }
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
                {i18n.language === 'ar' ? '←' : '←'} {t('registration.navigation.previous')}
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 bg-primary text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                >
                  {t('registration.navigation.next')} {i18n.language === 'ar' ? '←' : '→'}
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
                      {t('registration.navigation.submitting')}
                    </div>
                  ) : (
                    t('registration.navigation.submitApplication')
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Back to Sign In */}
        <div className="text-center mt-6">
          <span className="text-gray-600 dark:text-gray-400">{t('registration.footer.alreadyHaveAccount')} </span>
          <Link to="/auth?mode=signin" className="font-medium text-primary hover:text-blue-500">
            {t('registration.footer.signInLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BusinessRegistrationPage

