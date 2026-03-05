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
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  HeartIcon,
  BuildingStorefrontIcon,
  ArchiveBoxIcon,
  UsersIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

function LandingPage() {
  const { t } = useTranslation('landing')

  const features = [
    {
      icon: <HeartIcon className="w-6 h-6" />,
      titleKey: 'features.loyaltyProgram.title',
      descKey: 'features.loyaltyProgram.description',
      color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
    },
    {
      icon: <CloudIcon className="w-6 h-6" />,
      titleKey: 'features.cloudPos.title',
      descKey: 'features.cloudPos.description',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      icon: <UsersIcon className="w-6 h-6" />,
      titleKey: 'features.customersManagement.title',
      descKey: 'features.customersManagement.description',
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    {
      icon: <MegaphoneIcon className="w-6 h-6" />,
      titleKey: 'features.promotionCampaigns.title',
      descKey: 'features.promotionCampaigns.description',
      color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    {
      icon: <ArrowPathIcon className="w-6 h-6" />,
      titleKey: 'features.autoReengagement.title',
      descKey: 'features.autoReengagement.description',
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    {
      icon: <DevicePhoneMobileIcon className="w-6 h-6" />,
      titleKey: 'features.liveMenu.title',
      descKey: 'features.liveMenu.description',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    },
    {
      icon: <BuildingStorefrontIcon className="w-6 h-6" />,
      titleKey: 'features.multiBranch.title',
      descKey: 'features.multiBranch.description',
      color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
    },
    {
      icon: <ArchiveBoxIcon className="w-6 h-6" />,
      titleKey: 'features.centralizedProducts.title',
      descKey: 'features.centralizedProducts.description',
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
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
        <section className="relative pt-10 pb-20 sm:pt-16 sm:pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 transition-colors duration-300"></div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>

          <div className="container-max section-padding relative z-10">
            <div className="flex flex-col-reverse lg:flex-row items-center gap-4 sm:gap-8 lg:gap-20">
              <div className="lg:w-1/2 text-center lg:text-left lg:rtl:text-right">

                <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-[#1a202c] dark:text-white mb-6 leading-tight lg:leading-[1.1] rtl:leading-[1.5] tracking-tight font-sans rtl:font-cairo max-w-xl mx-auto lg:mx-0">
                  {t('hero.headline')}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 block mt-2">
                    {t('hero.highlight')}
                  </span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-gray-300 font-medium mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-sans rtl:font-cairo">
                  {t('hero.description')}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:flex lg:flex-row justify-center lg:justify-start">
                  <Link
                    to="/business/register"
                    className="col-span-2 lg:col-span-1 btn-primary text-base lg:text-lg px-6 lg:px-8 py-3 lg:py-4 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 text-center"
                  >
                    {t('hero.getStarted')}
                    <ArrowRightIcon className="w-5 h-5 flex-shrink-0" />
                  </Link>
                  <Link
                    to="/auth?mode=signin"
                    className="col-span-1 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl px-2 sm:px-4 py-3 lg:py-4 font-semibold text-sm sm:text-base lg:text-lg transition-all duration-300 hover:-translate-y-1 text-center flex items-center justify-center"
                  >
                    {t('hero.signIn')}
                  </Link>
                  <Link
                    to="/branch-manager-login"
                    className="col-span-1 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl px-2 sm:px-4 py-3 lg:py-4 font-semibold text-sm sm:text-base lg:text-lg transition-all duration-300 hover:-translate-y-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center"
                  >
                    <QrCodeIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>{t('hero.staffLogin')}</span>
                  </Link>
                  <Link
                    to="/demo"
                    className="col-span-2 lg:col-span-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl px-6 lg:px-8 py-3 lg:py-4 font-semibold text-base lg:text-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 text-center"
                  >
                    {t('header.tryDemo')}
                  </Link>
                </div>

                <div className="mt-8 lg:mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4 lg:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <span>{t('hero.benefit1')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <span>{t('hero.benefit2')}</span>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2 relative flex justify-center items-center -mt-8 sm:-mt-4 lg:mt-0">
                <div className="relative w-[85vw] max-w-[450px] sm:w-[70vw] lg:max-w-none lg:w-[130%] lg:-translate-x-12 lg:-translate-y-16 xl:w-[140%] xl:-translate-x-24 xl:-translate-y-24 z-10 group">
                  {/* Ambient glowing blob behind the image - made much larger and brighter */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-tr from-purple-500/40 via-fuchsia-500/40 to-blue-500/40 dark:from-purple-500/50 dark:via-fuchsia-500/50 dark:to-blue-500/50 blur-[80px] rounded-full mix-blend-screen dark:mix-blend-lighten opacity-60 group-hover:opacity-100 transition-opacity duration-1000"></div>

                  {/* The SVG Image - Removed aspect ratio clipping, added smooth hover-float */}
                  <div className="relative w-full h-auto transform transition-transform duration-[2000ms] ease-out hover:-translate-y-4">
                    <img src="/assets/images/landing/hero/hero-image-light.svg" alt={t('hero.dashboardPreview')} className="w-full h-auto object-contain filter drop-shadow-2xl dark:hidden pointer-events-none" />
                    <img src="/assets/images/landing/hero/hero-image-dark.svg" alt={t('hero.dashboardPreview')} className="w-full h-auto object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hidden dark:block pointer-events-none" />
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