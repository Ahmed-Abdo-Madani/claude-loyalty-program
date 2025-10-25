import React from 'react';
import PropTypes from 'prop-types';

// Common countries with their calling codes, flags, and names
const COUNTRIES = [
  { code: '+966', country: 'Saudi Arabia', countryAr: 'المملكة العربية السعودية', flag: '🇸🇦', iso: 'SA' },
  { code: '+971', country: 'United Arab Emirates', countryAr: 'الإمارات العربية المتحدة', flag: '🇦🇪', iso: 'AE' },
  { code: '+965', country: 'Kuwait', countryAr: 'الكويت', flag: '🇰🇼', iso: 'KW' },
  { code: '+974', country: 'Qatar', countryAr: 'قطر', flag: '🇶🇦', iso: 'QA' },
  { code: '+973', country: 'Bahrain', countryAr: 'البحرين', flag: '🇧🇭', iso: 'BH' },
  { code: '+968', country: 'Oman', countryAr: 'عمان', flag: '🇴🇲', iso: 'OM' },
  { code: '+20', country: 'Egypt', countryAr: 'مصر', flag: '🇪🇬', iso: 'EG' },
  { code: '+962', country: 'Jordan', countryAr: 'الأردن', flag: '🇯🇴', iso: 'JO' },
  { code: '+961', country: 'Lebanon', countryAr: 'لبنان', flag: '🇱🇧', iso: 'LB' },
  { code: '+1', country: 'United States', countryAr: 'الولايات المتحدة', flag: '🇺🇸', iso: 'US' },
  { code: '+44', country: 'United Kingdom', countryAr: 'المملكة المتحدة', flag: '🇬🇧', iso: 'GB' },
  { code: '+91', country: 'India', countryAr: 'الهند', flag: '🇮🇳', iso: 'IN' },
  { code: '+92', country: 'Pakistan', countryAr: 'باكستان', flag: '🇵🇰', iso: 'PK' },
  { code: '+880', country: 'Bangladesh', countryAr: 'بنغلاديش', flag: '🇧🇩', iso: 'BD' },
  { code: '+63', country: 'Philippines', countryAr: 'الفلبين', flag: '🇵🇭', iso: 'PH' },
];

const CountryCodeSelector = ({ value, onChange, className = '', disabled = false, language = 'en' }) => {
  const isRTL = language === 'ar';

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        py-3 px-3 
        border border-gray-300 dark:border-gray-600 
        rounded-lg 
        bg-white dark:bg-gray-800 
        text-gray-900 dark:text-white
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        transition-colors
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isRTL ? 'text-right' : 'text-left'}
        ${className}
      `}
      aria-label={language === 'ar' ? 'رمز الدولة' : 'Country Code'}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {COUNTRIES.map((country) => (
        <option key={country.iso} value={country.code}>
          {country.flag} {country.code}
        </option>
      ))}
    </select>
  );
};

CountryCodeSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  language: PropTypes.string,
};

export default CountryCodeSelector;
