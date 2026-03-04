import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

function Footer() {
  const { t } = useTranslation('landing')

  return (
    <footer className="bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="container-max section-padding py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company info */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <img
                src="/assets/images/madna-logo.svg"
                alt="Madna Logo"
                className="w-8 h-8 mr-3"
              />
              <div className="text-2xl font-bold text-primary dark:text-blue-400">
                {t('footer.companyName')}
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              {t('footer.description')}
            </p>
            {/* Social media icons removed */}
          </div>

          {/* Links columns */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('footer.product')}</h3>
            <ul className="space-y-2 text-gray-500 dark:text-gray-400">
              <li><a href="/#features" className="hover:text-primary dark:hover:text-white transition-colors">{t('footer.features')}</a></li>
              <li><Link to="/pricing" className="hover:text-primary dark:hover:text-white transition-colors">{t('footer.pricing')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('footer.support')}</h3>
            <ul className="space-y-2 text-gray-500 dark:text-gray-400">
              <li><Link to="/contact" className="hover:text-primary dark:hover:text-white transition-colors">{t('footer.contactUs')}</Link></li>
              <li><Link to="/privacy" className="hover:text-primary dark:hover:text-white transition-colors">{t('footer.privacyPolicy')}</Link></li>
              <li><Link to="/terms" className="hover:text-primary dark:hover:text-white transition-colors">{t('footer.termsOfService')}</Link></li>
              <li><Link to="/refund-policy" className="hover:text-primary dark:hover:text-white transition-colors">{t('footer.refundPolicy')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            {t('footer.copyright')}
          </div>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <LanguageSwitcher variant="button" className="text-sm" />
            <Link to="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-white text-sm transition-colors">
              {t('footer.privacyPolicy')}
            </Link>
            <Link to="/terms" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-white text-sm transition-colors">
              {t('footer.termsOfService')}
            </Link>
            <Link to="/refund-policy" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-white text-sm transition-colors">
              {t('footer.refundPolicy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer