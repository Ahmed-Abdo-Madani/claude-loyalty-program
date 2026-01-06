import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const DemoRestrictedModal = ({ isOpen, onClose, featureName }) => {
    const { t } = useTranslation('dashboard')

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 transform animate-scale-up border border-gray-100 dark:border-gray-700">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl text-primary">🔒</span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {t('demo.restrictedTitle', 'Register to Unlock')}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                    {featureName ? (
                        t('demo.restrictedFeatureMessage', 'The "{{feature}}" feature is disabled in demo mode. Create a free account to start managing your business.', { feature: featureName })
                    ) : (
                        t('demo.restrictedDefaultMessage', 'This feature is disabled in demo mode. Create a free account to unlock full access.')
                    )}
                </p>

                <div className="flex flex-col gap-3">
                    <Link
                        to="/business/register"
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 transform hover:-translate-y-0.5"
                    >
                        {t('demo.startTrial', 'Start 14-Day Free Trial')}
                    </Link>
                    <button
                        onClick={onClose}
                        className="w-full text-gray-500 dark:text-gray-400 font-medium py-3 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        {t('common.cancel', 'Continue Exploring')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DemoRestrictedModal
