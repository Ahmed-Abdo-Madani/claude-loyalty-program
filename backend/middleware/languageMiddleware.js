import logger from '../config/logger.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load message dictionaries from JSON files at startup
const messages = {
  ar: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/ar/messages.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/en/messages.json'), 'utf8'))
}

/**
 * Language detection middleware
 * Extracts language from Accept-Language header or query parameter
 * Attaches validated language to req.locale
 */
export const extractLanguage = (req, res, next) => {
  try {
    let language = 'ar' // Default to Arabic

    // 1. Check Accept-Language header (first preference)
    const acceptLanguage = req.headers['accept-language']
    if (acceptLanguage) {
      // Parse the Accept-Language header (e.g., "ar,en;q=0.9" -> "ar")
      const primaryLanguage = acceptLanguage.split(',')[0].split('-')[0].toLowerCase()
      if (primaryLanguage === 'ar' || primaryLanguage === 'en') {
        language = primaryLanguage
      }
    }

    // 2. Fallback to query parameter if header not set
    if (!acceptLanguage && req.query.lang) {
      const queryLang = req.query.lang.toLowerCase()
      if (queryLang === 'ar' || queryLang === 'en') {
        language = queryLang
      }
    }

    // 3. Attach validated language to request
    req.locale = language

    // 4. Log language detection for debugging
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Language detected: ${language}`, {
        acceptLanguage,
        queryLang: req.query.lang,
        path: req.path
      })
    }

    next()
  } catch (error) {
    logger.error('Error in language middleware:', error)
    req.locale = 'ar' // Fallback to Arabic on error
    next()
  }
}

/**
 * Get localized message by key and locale
 * Supports interpolation for dynamic values
 * 
 * @param {string} key - Message key in format 'category.messageKey'
 * @param {string} locale - Language code ('ar' or 'en')
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} Localized message
 */
export const getLocalizedMessage = (key, locale = 'ar', params = {}) => {
  try {
    // Validate locale
    const validLocale = (locale === 'ar' || locale === 'en') ? locale : 'ar'

    // Split key into category and message key
    const [category, messageKey] = key.split('.')
    
    // Get message from dictionary
    let message = messages[validLocale]?.[category]?.[messageKey]
    
    // Fallback to English if not found in requested locale
    if (!message) {
      message = messages.en?.[category]?.[messageKey]
    }
    
    // Fallback to key itself if not found at all
    if (!message) {
      logger.warn(`Message key not found: ${key}`)
      return key
    }

    // Replace interpolation placeholders with actual values
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach(param => {
        const placeholder = new RegExp(`{{${param}}}`, 'g')
        message = message.replace(placeholder, params[param])
      })
    }

    return message
  } catch (error) {
    logger.error(`Error getting localized message for key ${key}:`, error)
    return key // Return key as fallback
  }
}

// Export message dictionary for direct access if needed
export { messages }
