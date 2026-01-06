import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@heroicons/react/24/outline'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function PricingPage() {
  const { t } = useTranslation('landing')

  const plans = [
    {
      key: 'free',
      popular: false,
      features: [
        '1_loyalty_offer',
        '100_customers',
        '20_pos_operations',
        '1_location'
      ]
    },
    {
      key: 'loyalty',
      popular: false,
      features: [
        'unlimited_loyalty_offers',
        'unlimited_customers',
        'no_pos_operations',
        'unlimited_locations',
        'basic_analytics'
      ]
    },
    {
      key: 'pos',
      popular: true,
      features: [
        'unlimited_loyalty_offers',
        'unlimited_customers',
        'unlimited_pos_operations',
        'unlimited_locations',
        'full_analytics'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 rtl:font-cairo">
      <SEO titleKey="pages.pricing.title" descriptionKey="pages.pricing.description" />

      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[100px] animate-pulse delay-1000" />
      </div>

      <Header />

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="text-center px-4 sm:px-6 lg:px-8 mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 rtl:leading-[1.5]">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </section>

        {/* Pricing Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                  ${plan.popular
                    ? 'bg-white dark:bg-gray-800 border-2 border-primary shadow-lg z-10'
                    : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold shadow-md whitespace-nowrap">
                      {t('pricing.mostPopular')}
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t(`pricing.${plan.key}.name`)}</h3>
                  <div className="flex justify-center items-baseline mb-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{t(`pricing.${plan.key}.price`)}</span>
                    {plan.key !== 'free' && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1">{t(`pricing.${plan.key}.period`)}</span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{t(`pricing.${plan.key}.description`)}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-600 dark:text-gray-300">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 rtl:mr-0 rtl:ml-3 flex-shrink-0" />
                      <span>{t(`pricing.features.${feature}`)}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/business/register"
                  className={`w-full block text-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${plan.popular
                      ? 'bg-primary hover:bg-blue-700 text-white shadow-lg hover:shadow-primary/30'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    }`}
                >
                  {t('pricing.startFreeTrial')}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white rtl:leading-[1.5]">
              {t('pricing.faq.title')}
            </h2>
            <div className="space-y-8">
              {['changePlans', 'freeTrial', 'payment'].map((faqKey, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-8 last:pb-0">
                  <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                    {t(`pricing.faq.${faqKey}.question`)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t(`pricing.faq.${faqKey}.answer`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default PricingPage