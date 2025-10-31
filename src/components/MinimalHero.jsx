import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import InteractiveLogo from './InteractiveLogo'

function MinimalHero() {
  const { t } = useTranslation('landing')

  return (
    <section className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        {/* Main Content */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Interactive Madna Logo */}
          <div className="w-64 max-w-[70vw] md:w-80 md:max-w-[60vw] lg:w-96 lg:max-w-[50vw] h-auto mx-auto mb-8 px-4">
            <InteractiveLogo className="transition-transform duration-700 ease-out hover:scale-105" />
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-500 dark:text-white mb-12 font-medium">
            {t('hero.tagline')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Get Started Button - Preserves existing functionality */}
            <Link
              to="/business/register"
              className="bg-primary hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[140px]"
            >
              {t('hero.getStarted')}
            </Link>

            {/* Sign In Button - Preserves existing functionality */}
            <Link
              to="/auth?mode=signin"
              className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[140px]"
            >
              {t('hero.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MinimalHero