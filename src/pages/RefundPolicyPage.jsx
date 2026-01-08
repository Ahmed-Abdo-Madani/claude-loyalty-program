import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function RefundPolicyPage() {
    const { t } = useTranslation('landing')

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 rtl:font-cairo">
            <SEO titleKey="terms.section6.title" descriptionKey="terms.section6.content" />

            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[100px] animate-pulse delay-1000" />
            </div>

            <Header />

            <main className="relative z-10 pt-32 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-lg p-8 md:p-12 border border-gray-200 dark:border-gray-700">
                        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white rtl:leading-[1.5]">
                            {t('terms.section6.title')}
                        </h1>

                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                            {t('terms.lastUpdated')}
                        </div>

                        <div className="prose prose-lg max-w-none dark:prose-invert">
                            <section className="mb-8">
                                <p className="mb-4 text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                                    {t('terms.section6.content')}
                                </p>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl mt-8 border border-blue-100 dark:border-blue-800">
                                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
                                        {t('contact.title')}
                                    </h3>
                                    <p className="text-blue-700 dark:text-blue-400">
                                        {t('terms.section14.content')}
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default RefundPolicyPage
