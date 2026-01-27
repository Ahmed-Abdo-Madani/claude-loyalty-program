/**
 * Formats an amount as currency with English (Latin) numerals.
 * @param {number|string} amount - The amount to format.
 * @param {string} language - The current language ('ar' or 'en').
 * @param {string} currencyCode - The currency code (default: 'SAR').
 * @returns {string} Formatted currency string.
 */
export const formatCurrency = (amount, language = 'en', currencyCode = 'SAR') => {
    const num = parseFloat(amount);
    if (isNaN(num)) return language === 'ar' ? `0.00 ريال` : `0.00 SAR`;

    // Always use en-US to ensure English (Latin) numerals
    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);

    if (language === 'ar') {
        return `${formattedNumber} ريال`;
    }

    return `${formattedNumber} ${currencyCode}`;
};

/**
 * Formats a number with English (Latin) numerals.
 * @param {number|string} number - The number to format.
 * @param {string} language - The current language (not used for numerals since we want English).
 * @returns {string} Formatted number string.
 */
export const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number || 0);
};
