import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../config/api'

// Saudi business categories from our DataStore
const businessCategories = [
  { id: 1, name: "مطاعم وكافيهات - Restaurants & Cafes", nameEn: "Restaurants & Cafes" },
  { id: 2, name: "صالونات وحلاقة - Salons & Barbershops", nameEn: "Salons & Barbershops" },
  { id: 3, name: "عطور ومستحضرات - Perfumes & Cosmetics", nameEn: "Perfumes & Cosmetics" },
  { id: 4, name: "ملابس وأزياء - Fashion & Clothing", nameEn: "Fashion & Clothing" },
  { id: 5, name: "صحة ولياقة - Health & Fitness", nameEn: "Health & Fitness" }
]

// Saudi regions and cities
const saudiRegions = {
  'Central Region': {
    nameAr: 'المنطقة الوسطى',
    cities: ['الرياض - Riyadh', 'الخرج - Al-Kharj', 'الدرعية - Diriyah', 'المجمعة - Al-Majma\'ah']
  },
  'Western Region': {
    nameAr: 'المنطقة الغربية',
    cities: ['جدة - Jeddah', 'مكة المكرمة - Makkah', 'المدينة المنورة - Madinah', 'الطائف - Taif', 'ينبع - Yanbu']
  },
  'Eastern Region': {
    nameAr: 'المنطقة الشرقية',
    cities: ['الدمام - Dammam', 'الخبر - Khobar', 'الأحساء - Al-Ahsa', 'الجبيل - Jubail', 'القطيف - Qatif']
  }
}

function BusinessRegistrationPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    // Step 1: Business Information
    business_name: '',
    business_name_ar: '',
    business_type: '',
    license_number: '',
    description: '',

    // Step 2: Location & Contact
    region: '',
    city: '',
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

  // Validation functions
  const validateCRNumber = (crNumber) => {
    const crPattern = /^\d{10}$/
    return crPattern.test(crNumber)
  }

  const validateSaudiPhone = (phone) => {
    const phonePattern = /^\+966\d{9}$/
    return phonePattern.test(phone)
  }

  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailPattern.test(email)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('') // Clear error when user types
  }

  const validateStep = (step) => {
    setError('')

    switch (step) {
      case 1:
        if (!formData.business_name.trim()) {
          setError('Business name is required - اسم الأعمال مطلوب')
          return false
        }
        if (!formData.business_type) {
          setError('Business type is required - نوع الأعمال مطلوب')
          return false
        }
        if (!formData.license_number.trim()) {
          setError('Commercial Registration number is required - رقم السجل التجاري مطلوب')
          return false
        }
        if (!validateCRNumber(formData.license_number)) {
          setError('Invalid CR format. Use 10 digits: XXXXXXXXXX - تنسيق السجل التجاري غير صحيح')
          return false
        }
        return true

      case 2:
        if (!formData.region) {
          setError('Region is required - المنطقة مطلوبة')
          return false
        }
        if (!formData.city) {
          setError('City is required - المدينة مطلوبة')
          return false
        }
        if (!formData.address.trim()) {
          setError('Business address is required - عنوان الأعمال مطلوب')
          return false
        }
        if (!formData.phone.trim()) {
          setError('Phone number is required - رقم الهاتف مطلوب')
          return false
        }
        if (!validateSaudiPhone(formData.phone)) {
          setError('Invalid phone format. Use: +966XXXXXXXXX - تنسيق الهاتف غير صحيح')
          return false
        }
        if (!formData.email.trim()) {
          setError('Email is required - البريد الإلكتروني مطلوب')
          return false
        }
        if (!validateEmail(formData.email)) {
          setError('Invalid email format - تنسيق البريد الإلكتروني غير صحيح')
          return false
        }
        return true

      case 3:
        if (!formData.owner_name.trim()) {
          setError('Owner name is required - اسم المالك مطلوب')
          return false
        }
        if (!formData.owner_id.trim()) {
          setError('Owner ID is required - هوية المالك مطلوبة')
          return false
        }
        if (!formData.owner_phone.trim()) {
          setError('Owner phone is required - هاتف المالك مطلوب')
          return false
        }
        if (!validateSaudiPhone(formData.owner_phone)) {
          setError('Invalid phone format. Use: +966XXXXXXXXX - تنسيق الهاتف غير صحيح')
          return false
        }
        if (!formData.owner_email.trim()) {
          setError('Owner email is required - بريد المالك الإلكتروني مطلوب')
          return false
        }
        if (!validateEmail(formData.owner_email)) {
          setError('Invalid email format - تنسيق البريد الإلكتروني غير صحيح')
          return false
        }
        return true

      case 4:
        if (!formData.password.trim()) {
          setError('Password is required - كلمة المرور مطلوبة')
          return false
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters - كلمة المرور يجب أن تكون 6 أحرف على الأقل')
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match - كلمات المرور غير متطابقة')
          return false
        }
        if (!formData.termsAccepted) {
          setError('You must accept the terms and conditions - يجب قبول الشروط والأحكام')
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
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        owner_name: formData.owner_name,
        owner_name_ar: formData.owner_name_ar,
        owner_id: formData.owner_id,
        owner_phone: formData.owner_phone,
        owner_email: formData.owner_email,
        password: formData.password
      }

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

  const availableCities = formData.region ? saudiRegions[formData.region]?.cities || [] : []

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Business Information - معلومات الأعمال
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name (English) - اسم الأعمال (إنجليزي) *
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Al-Amal Restaurant"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name (Arabic) - اسم الأعمال (عربي)
                </label>
                <input
                  type="text"
                  name="business_name_ar"
                  value={formData.business_name_ar}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="مطعم الأمل"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Type - نوع الأعمال *
              </label>
              <select
                name="business_type"
                value={formData.business_type}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Select business type - اختر نوع الأعمال</option>
                {businessCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commercial Registration Number - رقم السجل التجاري *
              </label>
              <input
                type="text"
                name="license_number"
                value={formData.license_number}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="1234567890"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter 10 digits only - أدخل 10 أرقام فقط
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Description - وصف الأعمال
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe your business services - صف خدمات أعمالك"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Location & Contact - الموقع والتواصل
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saudi Region - المنطقة السعودية *
                </label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Select region - اختر المنطقة</option>
                  {Object.entries(saudiRegions).map(([key, region]) => (
                    <option key={key} value={key}>
                      {region.nameAr} - {key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City - المدينة *
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                  disabled={!formData.region}
                >
                  <option value="">Select city - اختر المدينة</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address - عنوان الأعمال *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Street, District - الشارع، الحي"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Phone - هاتف الأعمال *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="+966551234567"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email - بريد الأعمال الإلكتروني *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Owner Information - معلومات المالك
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Full Name (English) - اسم المالك الكامل (إنجليزي) *
                </label>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ahmed Mohammed Al-Ahmed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Full Name (Arabic) - اسم المالك الكامل (عربي)
                </label>
                <input
                  type="text"
                  name="owner_name_ar"
                  value={formData.owner_name_ar}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="أحمد محمد الأحمد"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National ID / Iqama Number - رقم الهوية الوطنية / الإقامة *
              </label>
              <input
                type="text"
                name="owner_id"
                value={formData.owner_id}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="1234567890"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Phone - هاتف المالك *
                </label>
                <input
                  type="tel"
                  name="owner_phone"
                  value={formData.owner_phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="+966501234567"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Email - بريد المالك الإلكتروني *
                </label>
                <input
                  type="email"
                  name="owner_email"
                  value={formData.owner_email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="owner@business.sa"
                  required
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Account Setup - إعداد الحساب
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password - كلمة المرور *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Minimum 6 characters - 6 أحرف على الأقل"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password - تأكيد كلمة المرور *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Re-enter password - أعد إدخال كلمة المرور"
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  required
                />
                <div className="ml-3">
                  <label className="text-sm text-gray-700">
                    I agree to the{' '}
                    <Link to="/terms" className="text-purple-600 hover:text-purple-500">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-purple-600 hover:text-purple-500">
                      Privacy Policy
                    </Link>
                    {' '} - أوافق على الشروط والأحكام وسياسة الخصوصية *
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">
                What happens next? - ماذا يحدث بعد ذلك؟
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✅ Your application will be reviewed by our team - سيتم مراجعة طلبك من قبل فريقنا</li>
                <li>✅ We'll verify your business documents - سنتحقق من وثائق أعمالك</li>
                <li>✅ You'll receive approval notification via email - ستتلقى إشعار الموافقة عبر البريد الإلكتروني</li>
                <li>✅ Once approved, you can access your dashboard - بمجرد الموافقة، يمكنك الوصول إلى لوحة التحكم</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-purple-600">
            🏢 Loyalty Platform
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Business Registration - تسجيل الأعمال
          </h1>
          <p className="mt-2 text-gray-600">
            Join our loyalty program platform - انضم إلى منصة برنامج الولاء
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of 4</span>
            <span className="text-sm font-medium text-gray-600">{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Business Info</span>
            <span>Location</span>
            <span>Owner Info</span>
            <span>Account</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <span className="text-red-400 mr-2">⚠️</span>
                <p className="text-red-800">{error}</p>
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
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous - السابق
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Next - التالي →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting... - جاري التقديم
                    </div>
                  ) : (
                    'Submit Application - تقديم الطلب'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Back to Sign In */}
        <div className="text-center mt-6">
          <span className="text-gray-600">Already have an account? - لديك حساب؟ </span>
          <Link to="/auth?mode=signin" className="font-medium text-purple-600 hover:text-purple-500">
            Sign in - تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BusinessRegistrationPage