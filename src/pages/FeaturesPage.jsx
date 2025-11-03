import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function FeaturesPage() {
  const { t } = useTranslation('landing')
  
  const features = [
    {
      icon: '🎯',
      key: 'smartTargeting'
    },
    {
      icon: '📱',
      key: 'mobileWallet'
    },
    {
      icon: '📊',
      key: 'analytics'
    },
    {
      icon: '🔄',
      key: 'automated'
    },
    {
      icon: '💳',
      key: 'multipleRewards'
    },
    {
      icon: '🔒',
      key: 'security'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <SEO titleKey="pages.features.title" descriptionKey="pages.features.description" />
      
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
              <Link to="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.pricing')}</Link>
              <Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.contact')}</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">{t('features.title')}</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t(`features.${feature.key}.title`)}</h3>
                <p className="text-gray-600 dark:text-gray-300">{t(`features.${feature.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('features.cta.title')}</h2>
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            {t('features.cta.subtitle')}
          </p>
          <Link
            to="/business/register"
            className="bg-primary hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            {t('features.cta.button')}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default FeaturesPage