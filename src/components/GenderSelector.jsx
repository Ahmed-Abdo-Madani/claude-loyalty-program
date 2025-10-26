import React from 'react';
import PropTypes from 'prop-types';

const GENDER_OPTIONS = [
  { value: 'male', labelEn: 'Male', labelAr: 'ذكر', emoji: '🙋‍♂️' },
  { value: 'female', labelEn: 'Female', labelAr: 'أنثى', emoji: '🙋‍♀️' },
];

const GenderSelector = ({ 
  value, 
  onChange, 
  language = 'en', 
  required = false, 
  className = '',
  primaryColor = '#3B82F6',
  backgroundColor = '#F3F4F6',
  textColor = '#374151'
}) => {
  const isRTL = language === 'ar';
  const options = isRTL ? [...GENDER_OPTIONS].reverse() : GENDER_OPTIONS;

  return (
    <div className={`flex gap-3 w-full ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            flex-1 
            rounded-lg 
            py-3 px-4 
            font-medium 
            text-center 
            transition-all 
            duration-200
            focus:outline-none 
            focus:ring-2 
            focus:ring-offset-2
            ${
              value === option.value
                ? 'text-white shadow-sm'
                : 'hover:scale-[1.02] hover:shadow'
            }
          `}
          style={
            value === option.value
              ? { backgroundColor: primaryColor, focusRingColor: primaryColor }
              : { backgroundColor: backgroundColor, color: textColor }
          }
          aria-pressed={value === option.value}
          aria-label={`${language === 'ar' ? option.labelAr : option.labelEn}`}
          role="radio"
          aria-checked={value === option.value}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <span className="text-xl" role="img" aria-label={option.value}>
              {option.emoji}
            </span>
            <span>{language === 'ar' ? option.labelAr : option.labelEn}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

GenderSelector.propTypes = {
  value: PropTypes.oneOf(['male', 'female']).isRequired,
  onChange: PropTypes.func.isRequired,
  language: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  primaryColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  textColor: PropTypes.string,
};

export default GenderSelector;
