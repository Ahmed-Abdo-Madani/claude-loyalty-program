
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import PricingCard from '../components/PricingCard';
import CompetitorComparison from '../components/CompetitorComparison';
import ROICalculator from '../components/ROICalculator';

const PricingPage = () => {
  const { t } = useTranslation('landing');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [activeTab, setActiveTab] = useState('loyalty');

  const loyaltyKeys = ['loyalty_starter', 'loyalty_growth', 'loyalty_professional'];
  const posKeys = ['pos_business', 'pos_enterprise', 'pos_premium'];

  const getPlanData = (key) => {
    const rawPriceString = t(`pricing.plans.${key}.price`); // e.g., "59 SAR"
    const basePrice = parseInt(rawPriceString.replace(/[^0-9]/g, '') || '0', 10);

    // "Save 2 months" logic: Annual = Monthly * 10
    const priceValue = billingInterval === 'annual' ? basePrice * 10 : basePrice;
    const formattedPrice = `${priceValue.toLocaleString()} SAR`;

    return {
      key,
      name: t(`pricing.plans.${key}.name`),
      description: t(`pricing.plans.${key}.description`),
      price: formattedPrice,
      badge: t(`pricing.plans.${key}.badge`, { defaultValue: '' }),
      features: t(`pricing.plans.${key}.features`, { returnObjects: true }) || []
    };
  };

  const activeKeys = activeTab === 'loyalty' ? loyaltyKeys : posKeys;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 rtl:font-cairo selection:bg-primary selection:text-white">
      <SEO titleKey="pages.pricing.title" descriptionKey="pages.pricing.description" />

      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px] animate-pulse delay-1000" />
      </div>

      <Header />

      <main className="relative z-10 pt-32 pb-20 space-y-24">

        {/* Hero Section */}
        <section className="text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            {t('pricing.hero.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            {t('pricing.hero.subtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
            <span className={`text-sm font-medium ${billingInterval === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {t('pricing.hero.monthly')}
            </span>
            <button
              onClick={() => setBillingInterval(prev => prev === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span
                className={`${billingInterval === 'annual' ? 'translate-x-7 rtl:-translate-x-7' : 'translate-x-1 rtl:-translate-x-1'
                  } inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform`}
              />
            </button>
            <span className={`text-sm font-medium ${billingInterval === 'annual' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {t('pricing.hero.annual')}
            </span>
            {billingInterval === 'annual' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {t('pricing.hero.save')}
              </span>
            )}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl inline-flex shadow-inner">
              <button
                onClick={() => setActiveTab('loyalty')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'loyalty'
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                {t('pricing.tabs.loyalty')}
              </button>
              <button
                onClick={() => setActiveTab('pos')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'pos'
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                {t('pricing.tabs.pos')}
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeKeys.map((key) => {
              const plan = getPlanData(key);
              // Highlight if badge exists (Most Popular / Best Value)
              const isPopular = !!plan.badge;

              return (
                <PricingCard
                  key={key}
                  plan={plan}
                  billingInterval={billingInterval}
                  isPopular={isPopular}
                  onSelectPlan={() => {
                    // Logic to handle plan selection, ensuring we pass the correct plan info
                    // Currently just links to register, but could pass state
                    window.location.href = '/business/register';
                  }}
                />
              );
            })}
          </div>

          <div className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>{t('trust.description')}</p>
          </div>
        </section>

        {/* Competitor Comparison */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CompetitorComparison />
        </section>

        {/* ROI Calculator */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ROICalculator />
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              {t('pricing.faq.title')}
            </h2>
            <div className="space-y-8">
              {t('pricing.faq.items', { returnObjects: true }).map((item, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-6 last:pb-0">
                  <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                    {item.question}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;