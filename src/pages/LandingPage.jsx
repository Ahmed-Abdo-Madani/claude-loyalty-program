import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'
import {
  MegaphoneIcon,
  ChartBarIcon,
  CloudIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  QrCodeIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

function LandingPage() {
  const { t } = useTranslation('landing')

  const features = [
    {
      icon: <MegaphoneIcon className="w-6 h-6" />,
      titleKey: 'features.automatedEngagement.title',
      descKey: 'features.automatedEngagement.description',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    },
    {
      icon: <CloudIcon className="w-6 h-6" />,
      titleKey: 'features.cloudPos.title',
      descKey: 'features.cloudPos.description',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      titleKey: 'features.analytics.title',
      descKey: 'features.analytics.description',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    },
    {
      icon: <QrCodeIcon className="w-6 h-6" />,
      titleKey: 'features.smartQr.title',
      descKey: 'features.smartQr.description',
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    },
    {
      icon: <GlobeAltIcon className="w-6 h-6" />,
      titleKey: 'features.globalReach.title',
      descKey: 'features.globalReach.description',
      color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      titleKey: 'features.security.title',
      descKey: 'features.security.description',
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 font-sans">
      <SEO titleKey="pages.home.title" descriptionKey="pages.home.description" />

      <Header />

      <main>
        {/* Hero Section with Gradient Mesh */}
        <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 transition-colors duration-300"></div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>

          <div className="container-max section-padding relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="lg:w-1/2 text-center lg:text-left lg:rtl:text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6 border border-blue-100 dark:border-blue-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  {t('hero.newBadge')}
                </div>
                <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-[1.1] rtl:leading-[1.5] tracking-tight font-sans rtl:font-cairo">
                  {t('hero.headline')}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 block mt-2">
                    {t('hero.highlight')}
                  </span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans rtl:font-cairo">
                  {t('hero.description')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link
                    to="/business/register"
                    className="btn-primary text-lg px-8 py-4 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {t('hero.getStarted')}
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/auth?mode=signin"
                    className="px-8 py-4 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 font-semibold text-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    {t('hero.signIn')}
                  </Link>
                  <Link
                    to="/demo"
                    className="px-8 py-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-semibold text-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                    {t('header.tryDemo')}
                  </Link>
                </div>

                <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span>{t('hero.benefit1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span>{t('hero.benefit2')}</span>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2 relative">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 aspect-[4/3] group">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    {/* Abstract Dashboard Representation */}
                    <div className="w-3/4 h-3/4 bg-white dark:bg-slate-700 rounded-xl shadow-inner p-6 relative overflow-hidden">
                      <div className="flex gap-4 mb-6">
                        <div className="w-1/3 h-24 bg-blue-50 dark:bg-slate-600 rounded-lg animate-pulse"></div>
                        <div className="w-1/3 h-24 bg-purple-50 dark:bg-slate-600 rounded-lg animate-pulse delay-100"></div>
                        <div className="w-1/3 h-24 bg-green-50 dark:bg-slate-600 rounded-lg animate-pulse delay-200"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-100 dark:bg-slate-600 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-100 dark:bg-slate-600 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-100 dark:bg-slate-600 rounded w-full"></div>
                        <div className="h-32 bg-gray-50 dark:bg-slate-600 rounded-lg mt-4 border-2 border-dashed border-gray-200 dark:border-slate-500 flex items-center justify-center text-gray-400 text-sm">
                          {t('hero.dashboardPreview')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating Elements */}
                <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 animate-bounce-slow hidden lg:block">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                      <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Growth</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">+127%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-white dark:bg-slate-900 relative">
          <div className="container-max section-padding">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                {t('features.sectionTitle')}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                {t('features.sectionSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-8 rounded-3xl bg-gray-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t(feature.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust / Security Section */}
        <section className="py-24 bg-gray-50 dark:bg-slate-800/50 transition-colors duration-300">
          <div className="container-max section-padding">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 order-2 lg:order-1">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <ShieldCheckIcon className="w-10 h-10 text-blue-500 mb-4" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('trust.security.title')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('trust.security.desc')}</p>
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mt-8">
                    <CloudIcon className="w-10 h-10 text-purple-500 mb-4" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('trust.reliability.title')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('trust.reliability.desc')}</p>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  {t('trust.title')}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                  {t('trust.description')}
                </p>
                <ul className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 flex-shrink-0">
                        <CheckCircleIcon className="w-4 h-4" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{t(`trust.point${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary dark:bg-blue-900">
            <div className="absolute inset-0 bg-[url('/assets/patterns/grid.svg')] opacity-10"></div>
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
          </div>

          <div className="container-max section-padding relative z-10 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              {t('cta.title')}
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              {t('cta.subtitle')}
            </p>
            <Link
              to="/business/register"
              className="inline-flex items-center gap-2 bg-white text-primary font-bold text-lg px-10 py-4 rounded-xl hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              {t('cta.button')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage