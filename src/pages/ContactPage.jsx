import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EnvelopeIcon, PhoneIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function ContactPage() {
  const { t, i18n } = useTranslation('landing')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setStatus({ type: 'success', message: t('contact.form.success') || 'Message sent successfully!' })
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          company: '',
          subject: '',
          message: ''
        })
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setStatus({ type: 'error', message: t('contact.form.error') || 'Failed to send message. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 rtl:font-cairo">
      <SEO titleKey="pages.contact.title" descriptionKey="pages.contact.description" />

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
            {t('contact.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </section>

        {/* Contact Form & Info */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('contact.form.title')}</h2>

              {status.message && (
                <div className={`mb-6 p-4 rounded-lg ${status.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {status.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('contact.form.firstName')}
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('contact.form.lastName')}
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all"
                      required
                      disabled={isSubmitting}
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
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.company')}
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contact.form.subject')}
                  </label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all"
                    required
                    disabled={isSubmitting}
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
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all"
                    placeholder={t('contact.form.messagePlaceholder')}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : t('contact.form.sendMessage')}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white rtl:leading-[1.5]">{t('contact.otherWays.title')}</h2>

                <div className="space-y-8">
                  <div className="flex items-start group">
                    <div className="bg-primary/10 p-3 rounded-lg mr-4 rtl:mr-0 rtl:ml-4 group-hover:bg-primary/20 transition-colors">
                      <EnvelopeIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.emailSupport.title')}</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">
                        {t('contact.emailSupport.description')}
                      </p>
                      <a href="mailto:support@madna.com" className="text-primary hover:underline font-medium">
                        support@madna.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start group">
                    <div className="bg-primary/10 p-3 rounded-lg mr-4 rtl:mr-0 rtl:ml-4 group-hover:bg-primary/20 transition-colors">
                      <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.salesTeam.title')}</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">
                        {t('contact.salesTeam.description')}
                      </p>
                      <a href="mailto:sales@madna.com" className="text-primary hover:underline font-medium">
                        sales@madna.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start group">
                    <div className="bg-primary/10 p-3 rounded-lg mr-4 rtl:mr-0 rtl:ml-4 group-hover:bg-primary/20 transition-colors">
                      <PhoneIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.phoneSupport.title')}</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">
                        {t('contact.phoneSupport.description')}
                      </p>
                      <a href="tel:+966545983410" className="text-primary hover:underline font-medium" dir="ltr">
                        (+966545983410)
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start group">
                    <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg mr-4 rtl:mr-0 rtl:ml-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/40 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-600 dark:text-green-400 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('contact.liveChat.title')}</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">
                        {t('contact.liveChat.description')}
                      </p>
                      <a
                        href="https://wa.me/966545983410"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline font-medium"
                      >
                        {t('contact.liveChat.action')}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Office Information */}
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <BuildingOfficeIcon className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-gray-500" />
                  {t('contact.office.title')}
                </h3>
                <div className="text-gray-600 dark:text-gray-300 space-y-1">
                  <p className="font-medium text-gray-900 dark:text-white">{t('contact.office.name')}</p>
                  <p>{t('contact.office.address1')}</p>
                  <p>{t('contact.office.address2')}</p>
                  <p>{t('contact.office.country')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default ContactPage
