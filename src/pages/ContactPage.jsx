import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function ContactPage() {
  const { t } = useTranslation('landing')
  
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
          <h1 className="text-5xl font-bold mb-6">{t('contact.title')}</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('contact.form.title')}</h2>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('contact.form.firstName')}
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('contact.form.lastName')}
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.company')}
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.subject')}
                  </label>
                  <select
                    id="subject"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">{t('contact.form.selectTopic')}</option>
                    <option value="sales">{t('contact.form.salesInquiry')}</option>
                    <option value="support">{t('contact.form.technicalSupport')}</option>
                    <option value="billing">{t('contact.form.billingQuestion')}</option>
                    <option value="partnership">{t('contact.form.partnership')}</option>
                    <option value="other">{t('contact.form.other')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t('contact.form.messagePlaceholder')}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {t('contact.form.sendMessage')}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">{t('contact.otherWays.title')}</h2>

              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">📧</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.emailSupport.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      {t('contact.emailSupport.description')}
                    </p>
                    <a href="mailto:support@madna.com" className="text-primary hover:underline">
                      support@madna.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">💼</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.salesTeam.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      {t('contact.salesTeam.description')}
                    </p>
                    <a href="mailto:sales@madna.com" className="text-primary hover:underline">
                      sales@madna.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">📞</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.phoneSupport.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      {t('contact.phoneSupport.description')}
                    </p>
                    <a href="tel:+1-555-123-4567" className="text-primary hover:underline">
                      +1 (555) 123-4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">💬</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.liveChat.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      {t('contact.liveChat.description')}
                    </p>
                    <button className="text-primary hover:underline">
                      {t('contact.liveChat.action')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Office Information */}
              <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('contact.office.title')}</h3>
                <div className="text-gray-600 dark:text-gray-300">
                  <p>{t('contact.office.name')}</p>
                  <p>{t('contact.office.address1')}</p>
                  <p>{t('contact.office.address2')}</p>
                  <p>{t('contact.office.country')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default ContactPage
