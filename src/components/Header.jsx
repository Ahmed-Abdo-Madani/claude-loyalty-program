import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import DarkModeToggle from './DarkModeToggle'

function Header() {
  const { t } = useTranslation('landing')

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm dark:shadow-slate-800/50 sticky top-0 z-50 transition-all duration-300">
      <div className="container-max section-padding">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <img src="/assets/images/madna-logo.svg" alt="Madna Logo" className="w-8 h-8" />
            <div className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Madna Platform
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 transition-colors">
              {t('header.features')}
            </a>

            <Link to="/pricing" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 transition-colors">
              {t('header.pricing')}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <DarkModeToggle className="hover:bg-gray-100 dark:hover:bg-slate-800" />
            <LanguageSwitcher variant="button" className="hidden md:block" />
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
            <Link
              to="/demo"
              className="text-sm font-medium text-primary dark:text-blue-400 hover:text-primary-dark transition-colors"
            >
              {t('header.tryDemo')}
            </Link>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
            <Link
              to="/auth?mode=signin"
              className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-blue-400 transition-colors hidden sm:block"
            >
              {t('header.signIn')}
            </Link>
            <Link
              to="/business/register"
              className="btn-primary text-sm py-2 px-4 shadow-lg shadow-primary/20 hover:shadow-primary/40"
            >
              {t('header.registerBusiness')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header