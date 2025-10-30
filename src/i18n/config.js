import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonAr from '../locales/ar/common.json';
import commonEn from '../locales/en/common.json';
import authAr from '../locales/ar/auth.json';
import authEn from '../locales/en/auth.json';
import dashboardAr from '../locales/ar/dashboard.json';
import dashboardEn from '../locales/en/dashboard.json';
import adminAr from '../locales/ar/admin.json';
import adminEn from '../locales/en/admin.json';

// Configure i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    // Resources with all translation files organized by language and namespace
    resources: {
      ar: {
        common: commonAr,
        auth: authAr,
        dashboard: dashboardAr,
        admin: adminAr,
      },
      en: {
        common: commonEn,
        auth: authEn,
        dashboard: dashboardEn,
        admin: adminEn,
      },
    },

    // Default language (Arabic)
    fallbackLng: 'ar',
    
    // Default namespace
    defaultNS: 'common',
    
    // Namespaces to load by default
    ns: ['common', 'auth', 'dashboard', 'admin'],

    // Language detection options
    detection: {
      // Order of language detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Keys to look for in localStorage
      lookupLocalStorage: 'i18nextLng',
      
      // Cache user language selection
      caches: ['localStorage'],
      
      // Exclude certain paths from detection
      excludeCacheFor: ['cimode'],
    },

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React-specific options
    react: {
      useSuspense: false, // Disable suspense for better error handling
    },

    // Debug mode (disable in production)
    debug: import.meta.env.MODE === 'development',
  });

// Function to set HTML dir attribute based on language
i18n.on('languageChanged', (lng) => {
  const direction = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', lng);
});

// Set initial direction
const currentLang = i18n.language || 'ar';
const direction = currentLang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.setAttribute('dir', direction);
document.documentElement.setAttribute('lang', currentLang);

export default i18n;
