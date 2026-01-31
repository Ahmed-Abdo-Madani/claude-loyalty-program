import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckBadgeIcon, CalendarIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import SEO from '../components/SEO'

export default function CheckoutSuccessPage() {
    const { t, i18n } = useTranslation('subscription')
    const navigate = useNavigate()
    const location = useLocation()

    // Get success data from navigation state
    const paymentResult = location.state?.paymentResult || {}
    const { planName, amount, nextBillingDate, subscription } = paymentResult

    // Fallback data if page is accessed directly without state (though shouldn't happen in flow)
    const displayPlanName = planName || subscription?.plan_type || 'loyalty_starter'
    const displayAmount = amount || subscription?.amount || 0

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8" dir={i18n.dir()}>
            <SEO titleKey="checkout.successTitle" noindex={true} />

            <div className="max-w-xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-green-100 dark:border-green-900/30">
                    {/* Header */}
                    <div className="bg-green-600 px-6 py-12 text-center text-white relative">
                        <div className="absolute inset-0 opacity-10 bg-[url('/patterns/grid.svg')]"></div>
                        <div className="relative z-10">
                            <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                <CheckBadgeIcon className="w-12 h-12 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold mb-2">
                                {t('paymentCallback.success') || 'Subscription Activated!'}
                            </h1>
                            <p className="text-green-100">
                                {t('paymentCallback.successMessage') || 'Thank you for choosing Madna.'}
                            </p>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="space-y-6">
                            {/* Plan Details Card */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
                                    {t('checkout.orderSummary') || 'Order Summary'}
                                </h2>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <CreditCardIcon className="w-5 h-5 text-primary" />
                                            </div>
                                            <span className="text-gray-600 dark:text-gray-400">{t('checkout.planLabel') || 'Plan'}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white capitalize">
                                            {t(`plans.${displayPlanName}.name`)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/10 rounded-lg">
                                                <span className="text-green-600 font-bold leading-none text-xl">$</span>
                                            </div>
                                            <span className="text-gray-600 dark:text-gray-400">{t('checkout.total') || 'Total Paid'}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white text-lg">
                                            {displayAmount.toLocaleString()} <span className="text-sm font-normal text-gray-500">SAR</span>
                                        </span>
                                    </div>

                                    {nextBillingDate && (
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <span className="text-gray-600 dark:text-gray-400">{t('management.nextBillingDate') || 'Next Billing'}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatDate(nextBillingDate)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Next Steps */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                                    {t('reactivation.redirecting') || 'What\'s next?'}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-8 px-4">
                                    {t('checkout.successSupportNote') || 'You can now access all your premium features from the dashboard. An invoice has been sent to your registered email.'}
                                </p>

                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-0.5"
                                    >
                                        {t('paymentCallback.continueButton') || 'Go to Dashboard'}
                                    </button>
                                    <button
                                        onClick={() => navigate('/contact')}
                                        className="w-full py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                                    >
                                        {t('checkout.supportText') || 'Need help? Contact support'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/30 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-4 grayscale opacity-50">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest tracking-widest ">Madna Platform</span>
                        <span className="text-[10px] text-gray-400">•</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verified Payment</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
