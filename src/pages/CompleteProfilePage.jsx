import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'
import DarkModeToggle from '../components/DarkModeToggle'
import SEO from '../components/SEO'

function CompleteProfilePage() {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState({
        business_name: '',
        license_number: '',
        owner_id: '',
        phone: '',
        address: '',
        city: '',
        region: '',
        business_type: '',
        description: ''
    })

    useEffect(() => {
        const fetchBusinessProfile = async () => {
            try {
                const response = await secureApi.get(endpoints.businessProfile)
                const result = await response.json()
                if (result.success) {
                    setFormData({
                        business_name: result.data.business_name || '',
                        license_number: result.data.license_number || '',
                        owner_id: result.data.owner_id || '',
                        phone: result.data.phone || '',
                        address: result.data.address || '',
                        city: result.data.city || '',
                        region: result.data.region || '',
                        business_type: result.data.business_type || '',
                        description: result.data.description || ''
                    })
                }
            } catch (err) {
                setError('Failed to load profile')
            } finally {
                setFetching(false)
            }
        }
        fetchBusinessProfile()
    }, [])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await secureApi.put(endpoints.businessUpdateProfile, formData)
            const result = await response.json()

            if (result.success) {
                setSuccess(true)
                setTimeout(() => navigate('/dashboard'), 2000)
            } else {
                setError(result.message || 'Update failed')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-12">
            <SEO titleKey="pages.auth.completeProfile.title" />
            <DarkModeToggle />

            <main className="max-w-2xl mx-auto px-4 pt-12">
                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {i18n.language === 'ar' ? 'أكمل ملف نشاطك التجاري' : 'Complete Your Business Profile'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {i18n.language === 'ar'
                                ? 'يرجى تقديم المعلومات المتبقية لنتمكن من تفعيل حسابك بالكامل.'
                                : 'Please provide the remaining info to fully activate your account.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 p-4 rounded-lg text-center">
                            {i18n.language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح! جاري العودة...' : 'Profile updated successfully! Redirecting...'}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2">
                                    {i18n.language === 'ar' ? 'المعلومات القانونية' : 'Legal Information'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {i18n.language === 'ar' ? 'رقم السجل التجاري' : 'Commercial Registration (CR) Number'}
                                        </label>
                                        <input
                                            type="text"
                                            name="license_number"
                                            value={formData.license_number}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="10XXXXXXXX"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {i18n.language === 'ar' ? 'الهوية الوطنية للمالك' : 'Owner National ID'}
                                        </label>
                                        <input
                                            type="text"
                                            name="owner_id"
                                            value={formData.owner_id}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="1XXXXXXXXX"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 md:col-span-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2">
                                    {i18n.language === 'ar' ? 'معلومات التواصل والموقع' : 'Contact & Location'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                                        </label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="+966XXXXXXXXX"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {i18n.language === 'ar' ? 'المنطقة' : 'Region'}
                                        </label>
                                        <input
                                            type="text"
                                            name="region"
                                            value={formData.region}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {i18n.language === 'ar' ? 'المدينة' : 'City'}
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {i18n.language === 'ar' ? 'العنوان' : 'Address'}
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-primary text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70"
                            >
                                {loading ? (i18n.language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (i18n.language === 'ar' ? 'حفظ وإكمال' : 'Save & Complete')}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}

export default CompleteProfilePage;
