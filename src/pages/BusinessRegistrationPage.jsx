import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../config/api'
import DarkModeToggle from '../components/DarkModeToggle'
import SEO from '../components/SEO'
import { setAuthData } from '../utils/secureAuth'

// Saudi business categories
const businessCategories = [
  { id: 1, name: "مطاعم وكافيهات - Restaurants & Cafes", nameEn: "Restaurants & Cafes" },
  { id: 2, name: "صالونات وحلاقة - Salons & Barbershops", nameEn: "Salons & Barbershops" },
  { id: 3, name: "عطور ومستحضرات - Perfumes & Cosmetics", nameEn: "Perfumes & Cosmetics" },
  { id: 4, name: "ملابس وأزياء - Fashion & Clothing", nameEn: "Fashion & Clothing" },
  { id: 5, name: "صحة ولياقة - Health & Fitness", nameEn: "Health & Fitness" }
]

function BusinessRegistrationPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['customer', 'common'])
  const isRTL = i18n.language === 'ar'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    owner_name: '',
    business_type: '',
    license_number: '',
    description: '',
    city: '',
    region: '',
    address: '',
    location_data: null,
    termsAccepted: false
  })

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('')
  }


  const validateForm = () => {
    if (!formData.business_name || !formData.email || !formData.password) {
      setError(t('registration.validation.required'));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('registration.validation.passwordsNotMatch'));
      return false;
    }
    if (!formData.termsAccepted) {
      setError(t('registration.validation.termsRequired'));
      return false;
    }
    return true;
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      const payload = {
        ...formData,
        business_type: businessCategories.find(cat => cat.id === parseInt(formData.business_type))?.nameEn || formData.business_type
      }

      const response = await fetch(endpoints.businessRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        // Registration response now includes session data - no need for extra login call
        setAuthData({
          sessionToken: data.data.session_token,
          businessId: data.data.business_id,
          businessName: data.data.business.business_name,
          userEmail: data.data.business.email,
          businessStatus: data.data.status,
          subscriptionStatus: data.data.subscription_status
        })
        navigate('/dashboard')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <SEO titleKey="pages.auth.signup.title" descriptionKey="pages.auth.signup.description" />
      <DarkModeToggle />

      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center text-2xl font-bold text-primary">
            <img src="/assets/images/madna-logo.svg" alt="Madna" className="w-8 h-8 mr-2" />
            <span>Madna</span>
          </Link>
          <div className="flex gap-4">
            <button onClick={() => i18n.changeLanguage(isRTL ? 'en' : 'ar')} className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {isRTL ? 'English' : 'العربية'}
            </button>
            <Link to="/auth?mode=signin" className="text-sm font-medium text-primary">{t('registration.header.signIn')}</Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('registration.header.businessRegistration')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('registration.header.joinThousands')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Essentials Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('registration.businessInfo.businessName')} *</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t('registration.businessInfo.businessNamePlaceholder')}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('registration.locationContact.businessEmail')} *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="name@business.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('registration.accountSetup.password')} *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('registration.accountSetup.confirmPassword')} *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Business Details Section - Integrated */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('registration.businessInfo.businessDetails')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('registration.businessInfo.businessType')}
                  </label>
                  <select
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('registration.businessInfo.phone')}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="05xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('registration.ownerInfo.ownerFullName')}
                  </label>
                  <input
                    type="text"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t('registration.ownerInfo.ownerNamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('registration.businessInfo.crNumber')}
                  </label>
                  <input
                    type="text"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="1010xxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('registration.businessInfo.businessDescription')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t('registration.businessInfo.businessDescriptionPlaceholder')}
                />
              </div>
            </div>

            {/* Terms and Submit */}
            <div className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-primary rounded border-gray-300"
                  required
                />
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  {t('registration.accountSetup.agreeToTerms')} {' '}
                  <Link to="/terms" className="text-primary hover:underline">{t('registration.accountSetup.termsAndConditions')}</Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70"
              >
                {loading ? t('registration.navigation.submitting') : t('registration.navigation.submitApplication')}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center mt-8 text-gray-500 dark:text-gray-400">
          {t('registration.footer.alreadyHaveAccount')} <Link to="/auth?mode=signin" className="text-primary font-bold hover:underline">{t('registration.footer.signInLink')}</Link>
        </p>
      </main>
    </div>
  )
}

export default BusinessRegistrationPage;
