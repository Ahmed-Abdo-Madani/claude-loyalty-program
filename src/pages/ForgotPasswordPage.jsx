import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../config/api'
import InteractiveLogo from '../components/InteractiveLogo'
import SEO from '../components/SEO'

function ForgotPasswordPage() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch(endpoints.businessForgotPassword, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            })

            const data = await response.json()

            if (response.ok) {
                setSubmitted(true)
            } else {
                setError(data.message || t('resetPassword.failed'))
            }
        } catch (err) {
            console.error('Forgot password error:', err)
            setError(t('resetPassword.failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <SEO
                titleKey="pages.auth.signin.title"
                descriptionKey="pages.auth.signin.description"
            />

            <div className="min-h-screen flex flex-col items-center justify-center px-4">
                {/* Logo Section */}
                <div className="text-center max-w-md mx-auto mb-8">
                    <Link to="/" className="inline-block">
                        <div className="w-48 h-auto mx-auto mb-6">
                            <InteractiveLogo className="transition-transform duration-700 ease-out hover:scale-105" />
                        </div>
                    </Link>

                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('resetPassword.title')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('resetPassword.subtitle')}
                    </p>
                </div>

                {/* Form Section */}
                <div className="w-full max-w-md mx-auto">
                    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 border border-gray-200 dark:border-gray-700">

                        {error && (
                            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="text-sm text-red-800 dark:text-red-400">{error}</div>
                            </div>
                        )}

                        {!submitted ? (
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('resetPassword.email')}
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            setError('')
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                                        placeholder={t('resetPassword.emailPlaceholder')}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('resetPassword.sending')}
                                        </div>
                                    ) : (
                                        t('resetPassword.sendResetLink')
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                                <svg className="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <h3 className="text-lg font-medium text-green-800 dark:text-green-400 mb-2">
                                    {t('resetPassword.success')}
                                </h3>
                            </div>
                        )}

                        <div className="mt-8 text-center text-sm">
                            <Link to="/auth?mode=signin" className="font-medium text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                                {t('resetPassword.backToLogin')}
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPasswordPage
