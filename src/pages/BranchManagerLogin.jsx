import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { managerLogin } from '../utils/secureAuth'
import SEO from '../components/SEO'

export default function BranchManagerLogin() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [branchId, setBranchId] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [showPin, setShowPin] = useState(false)

  // Auto-fill branch ID from URL parameter and advance to PIN input
  useEffect(() => {
    const branchParam = searchParams.get('branch')
    if (branchParam && branchParam.startsWith('branch_')) {
      console.log('🔗 Auto-filling branch ID from URL:', branchParam)
      setBranchId(branchParam)
      setShowPinInput(true)
    }
  }, [searchParams])

  const handleBranchIdSubmit = (e) => {
    e.preventDefault()
    
    if (!branchId.trim()) {
      setError(t('branchManagerAuth.errors.branchIdRequired'))
      return
    }

    if (!branchId.startsWith('branch_')) {
      setError(t('branchManagerAuth.errors.invalidBranchIdFormat'))
      return
    }

    setError('')
    setShowPinInput(true)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!pin.trim()) {
      setError(t('branchManagerAuth.errors.pinRequired'))
      return
    }

    if (pin.length < 4 || pin.length > 6) {
      setError(t('branchManagerAuth.errors.pinLength'))
      return
    }

    if (!/^\d+$/.test(pin)) {
      setError(t('branchManagerAuth.errors.pinNumericOnly'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await managerLogin(branchId, pin)
      
      if (result.success) {
        navigate('/branch-pos')
      } else {
        setError(result.error || t('branchManagerAuth.errors.loginFailed'))
      }
    } catch (err) {
      setError(t('branchManagerAuth.errors.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setShowPinInput(false)
    setPin('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <SEO titleKey="pages.branchManager.title" descriptionKey="pages.branchManager.description" noindex={true} />
      
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <span className="text-6xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('branchManagerAuth.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('branchManagerAuth.subtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center text-red-800 dark:text-red-200">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {!showPinInput ? (
            /* Branch ID Input */
            <form onSubmit={handleBranchIdSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('branchManagerAuth.branchId')}
                </label>
                <input
                  type="text"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  placeholder={t('branchManagerAuth.branchIdPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('branchManagerAuth.branchIdHelp')}
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                {t('branchManagerAuth.next')}
              </button>
            </form>
          ) : (
            /* PIN Input */
            <form onSubmit={handleLogin}>
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('branchManagerAuth.back')}
              </button>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('branchManagerAuth.managerPin')}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={t('branchManagerAuth.pinPlaceholder')}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-2xl tracking-widest text-center"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPin ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('branchManagerAuth.pinHelp')}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {loading ? t('branchManagerAuth.loggingIn') : t('branchManagerAuth.login')}
              </button>
            </form>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('branchManagerAuth.forgotPin')}
          </p>
        </div>
      </div>
    </div>
  )
}
