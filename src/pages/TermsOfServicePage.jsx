import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function TermsOfServicePage() {
  const { t } = useTranslation('landing')
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <SEO titleKey="pages.terms.title" descriptionKey="pages.terms.description" />
      
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">{t('terms.title')}</h1>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            {t('terms.lastUpdated')}
          </div>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section1.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section1.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section2.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section2.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section3.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section3.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section4.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section4.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section5.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section5.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section6.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section6.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section7.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section7.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section8.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section8.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section9.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section9.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section10.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section10.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section11.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section11.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section12.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section12.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section13.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section13.content')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{t('terms.section14.title')}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('terms.section14.content')}
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default TermsOfServicePage
