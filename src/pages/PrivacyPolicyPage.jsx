import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function PrivacyPolicyPage() {
  const { t } = useTranslation('landing')
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 rtl:font-cairo">
      <SEO titleKey="pages.privacy.title" descriptionKey="pages.privacy.description" />
      
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[100px] animate-pulse delay-1000" />
      </div>

      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-lg p-8 md:p-12 border border-gray-200 dark:border-gray-700">
            <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.title')}</h1>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-8">
              {t('privacy.lastUpdated')}
            </div>

            <div className="prose prose-lg max-w-none dark:prose-invert">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section1.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section1.intro')}
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-600 dark:text-gray-300 rtl:pr-6 rtl:pl-0">
                  <li>{t('privacy.section1.item1')}</li>
                  <li>{t('privacy.section1.item2')}</li>
                  <li>{t('privacy.section1.item3')}</li>
                  <li>{t('privacy.section1.item4')}</li>
                  <li>{t('privacy.section1.item5')}</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section2.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section2.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section3.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section3.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section4.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section4.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section5.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section5.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section6.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section6.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section7.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section7.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section8.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section8.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section9.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section9.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section10.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section10.content')}
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('privacy.section11.title')}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  {t('privacy.section11.content')}
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default PrivacyPolicyPage