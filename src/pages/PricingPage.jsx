import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function PricingPage() {
  const { t } = useTranslation('landing')
  
  const plans = [
    {
      key: 'starter',
      popular: false
    },
    {
      key: 'professional',
      popular: true
    },
    {
      key: 'enterprise',
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <SEO titleKey="pages.pricing.title" descriptionKey="pages.pricing.description" />
      
      <DarkModeToggle />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="flex items-center">
              <img
                src="/assets/images/madna-logo.svg"
                alt="Madna Logo"
                className="w-8 h-8 mr-3"
              />
              <span className="text-2xl font-bold text-primary">{t('header.logoText')}</span>
            </Link>
            <nav className="flex space-x-8">
              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.home')}</Link>
              <Link to="/features" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.features')}</Link>
              <Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.contact')}</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">{t('pricing.title')}</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div key={index} className={`bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg relative ${plan.popular ? 'border-2 border-primary' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold">{t('pricing.mostPopular')}</span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t(`pricing.${plan.key}.name`)}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-primary">{t(`pricing.${plan.key}.price`)}</span>
                    {plan.key !== 'enterprise' && (
                      <span className="text-gray-600 dark:text-gray-300">{t(`pricing.${plan.key}.period`)}</span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">{t(`pricing.${plan.key}.description`)}</p>
                </div>
                <Link
                  to="/business/register"
                  className={`w-full block text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-primary hover:bg-blue-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  {plan.key === 'enterprise' ? t('pricing.contactSales') : t('pricing.startFreeTrial')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">{t('pricing.faq.title')}</h2>
          <div className="space-y-8">
            {['changePlans', 'freeTrial', 'payment'].map((faqKey, index) => (
              <div key={index}>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{t(`pricing.faq.${faqKey}.question`)}</h3>
                <p className="text-gray-600 dark:text-gray-300">{t(`pricing.faq.${faqKey}.answer`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default PricingPage