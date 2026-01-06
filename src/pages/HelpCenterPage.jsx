import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 rtl:font-cairo">
      <SEO titleKey="pages.help.title" descriptionKey="pages.help.description" />
      
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
            {t('help.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
            {t('help.subtitle')}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl">
                <input
                  type="text"
                  placeholder={t('help.searchPlaceholder')}
                  className="w-full px-6 py-4 pl-12 rtl:pl-6 rtl:pr-12 rounded-xl text-gray-900 dark:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <MagnifyingGlassIcon className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Help Categories */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white rtl:leading-[1.5]">
            {t('help.browseByCategory')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {categories.map((category, index) => (
              <div 
                key={index} 
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group cursor-pointer"
              >
                <div className="flex items-center mb-4">
                  <span className="text-4xl mr-4 rtl:mr-0 rtl:ml-4 group-hover:scale-110 transition-transform duration-300">{category.icon}</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                    {t(`help.${category.key}.title`)}
                  </h3>
                </div>
                {/* Placeholder for description if needed */}
                <p className="text-gray-600 dark:text-gray-300">
                  {t(`help.${category.key}.description`) || "Learn more about " + t(`help.${category.key}.title`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white rtl:leading-[1.5]">
              {t('help.faq.title')}
            </h2>
            {/* Add FAQ content here if available in the original file or JSON */}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default HelpCenterPage
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
