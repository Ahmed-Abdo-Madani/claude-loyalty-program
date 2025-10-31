import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function HelpCenterPage() {
  const { t } = useTranslation('landing')
  
  const categories = [
    {
      key: 'gettingStarted',
      icon: '🚀'
    },
    {
      key: 'customerManagement',
      icon: '👥'
    },
    {
      key: 'mobileWallet',
      icon: '📱'
    },
    {
      key: 'analytics',
      icon: '📊'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <DarkModeToggle />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="flex items-center">
              <img src="/assets/images/madna-logo.svg" alt="Madna Logo" className="w-8 h-8 mr-3" />
              <span className="text-2xl font-bold text-primary">{t('header.logoText')}</span>
            </Link>
            <nav className="flex gap-8">
              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.home')}</Link>
              <Link to="/features" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.features')}</Link>
              <Link to="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary">{t('header.pricing')}</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">{t('help.title')}</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            {t('help.subtitle')}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder={t('help.searchPlaceholder')}
                className="w-full px-6 py-4 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">{t('help.browseByCategory')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {categories.map((category, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-6">
                  <span className="text-3xl mr-4">{category.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t(`help.${category.key}.title`)}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">{t('help.faq.title')}</h2>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('help.stillNeedHelp.title')}</h2>
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            {t('help.stillNeedHelp.subtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['emailSupport', 'liveChat', 'documentation'].map((contactKey) => (
              <div key={contactKey} className="text-center">
                <div className="text-4xl mb-4">
                  {contactKey === 'emailSupport' && '📧'}
                  {contactKey === 'liveChat' && '💬'}
                  {contactKey === 'documentation' && '📚'}
                </div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{t(`help.${contactKey}.title`)}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{t(`help.${contactKey}.description`)}</p>
                {contactKey === 'emailSupport' && (
                  <Link
                    to="/contact"
                    className="text-primary hover:underline"
                  >
                    {t(`help.${contactKey}.action`)}
                  </Link>
                )}
                {contactKey === 'liveChat' && (
                  <button className="text-primary hover:underline">
                    {t(`help.${contactKey}.action`)}
                  </button>
                )}
                {contactKey === 'documentation' && (
                  <Link
                    to="/api-docs"
                    className="text-primary hover:underline"
                  >
                    {t(`help.${contactKey}.action`)}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default HelpCenterPage
