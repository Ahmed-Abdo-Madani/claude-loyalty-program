import { useTranslation } from 'react-i18next'

// Import language icons
const arabicIcon = '/assets/lang-icons/Lang-icon-Arabic.svg'
const englishIcon = '/assets/lang-icons/Lang-icon-English.svg'

function LanguageSwitcher({ variant = 'button', className = '', showLabels = true }) {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.language
  
  // Normalize language to base code (e.g., 'en-US' -> 'en')
  const baseLang = (currentLanguage || '').split('-')[0] || 'en'

  const toggleLanguage = () => {
    const newLang = baseLang === 'ar' ? 'en' : 'ar'
    i18n.changeLanguage(newLang)
  }

  // Button variant - Simple toggle button
  if (variant === 'button') {
    return (
      <button
        onClick={toggleLanguage}
        className={`min-h-[44px] min-w-[44px] p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 inline-flex items-center justify-center ${className}`}
        aria-label="Toggle language"
        role="button"
      >
        <div className="w-5 h-5 sm:w-6 sm:h-6 aspect-square grid place-items-center rounded-md">
          <img 
            src={baseLang === 'ar' ? englishIcon : arabicIcon}
            alt="Language"
            className={`block w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain dark:invert ${baseLang === 'ar' ? '' : 'scale-110'}`}
          />
        </div>
      </button>
    )
  }

  // Dropdown variant - Dropdown menu with both options
  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Select language"
          role="menu"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 aspect-square grid place-items-center rounded-md">
            <img 
              src={baseLang === 'ar' ? englishIcon : arabicIcon}
              alt="Language"
              className={`block w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain dark:invert ${baseLang === 'ar' ? '' : 'scale-110'}`}
            />
          </div>
          {showLabels && (
            <>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {baseLang === 'ar' ? 'العربية' : 'English'}
              </span>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      </div>
    )
  }

  // Tabs variant - Side-by-side tabs like in CustomerSignup
  if (variant === 'tabs') {
    return (
      <div className={`flex rounded-lg p-1 bg-gray-100 dark:bg-gray-700 ${className}`}>
        <button
          onClick={() => i18n.changeLanguage('ar')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            baseLang === 'ar'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label="Switch to Arabic"
          aria-pressed={baseLang === 'ar'}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 aspect-square grid place-items-center rounded-md">
            <img src={arabicIcon} className="block w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain dark:invert scale-110" alt="" />
          </div>
          {showLabels ? 'العربية' : 'AR'}
        </button>
        <button
          onClick={() => i18n.changeLanguage('en')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            baseLang === 'en'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label="Switch to English"
          aria-pressed={baseLang === 'en'}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 aspect-square grid place-items-center rounded-md">
            <img src={englishIcon} className="block w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain dark:invert" alt="" />
          </div>
          {showLabels ? 'English' : 'EN'}
        </button>
      </div>
    )
  }

  return null
}

export default LanguageSwitcher
