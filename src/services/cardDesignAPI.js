/**
 * Card Design API Client
 * Handles all API calls for offer card design functionality
 * Phase 2 - Frontend Components
 */

import { secureApi, apiBaseUrl } from '../config/api'
import { getSecureAuthHeaders } from '../utils/secureAuth'

const CARD_DESIGN_BASE = `${apiBaseUrl}/api/card-design`

export const cardDesignAPI = {
  /**
   * Get card design for an offer (or default design if none exists)
   * @param {string} offerId - Secure offer ID (off_*)
   * @returns {Promise<{success: boolean, data: object, isDefault: boolean}>}
   */
  async getDesign(offerId) {
    try {
      console.log('🎨 Fetching card design for offer:', offerId)
      const response = await secureApi.get(`${CARD_DESIGN_BASE}/offer/${offerId}`)
      const data = await response.json()

      console.log('🎨 Card design loaded:', {
        offerId,
        hasDesign: !data.isDefault,
        colors: data.data?.background_color
      })

      return data
    } catch (error) {
      console.error('❌ Error fetching card design:', error)
      throw error
    }
  },

  /**
   * Create or update card design for an offer
   * @param {string} offerId - Secure offer ID
   * @param {object} designData - Design configuration
   * @returns {Promise<{success: boolean, data: object, validation: object}>}
   */
  async saveDesign(offerId, designData) {
    try {
      console.log('💾 Saving card design:', { offerId, designData })
      const response = await secureApi.post(`${CARD_DESIGN_BASE}/offer/${offerId}`, designData)
      const data = await response.json()

      if (data.success) {
        console.log('✅ Card design saved successfully')
      }

      return data
    } catch (error) {
      console.error('❌ Error saving card design:', error)
      throw error
    }
  },

  /**
   * Update specific fields of a card design
   * @param {string} offerId - Secure offer ID
   * @param {object} updates - Partial design updates
   * @returns {Promise<{success: boolean, data: object}>}
   */
  async updateDesign(offerId, updates) {
    try {
      console.log('📝 Updating card design fields:', { offerId, updates })
      const response = await secureApi.patch(`${CARD_DESIGN_BASE}/offer/${offerId}`, updates)
      const data = await response.json()

      return data
    } catch (error) {
      console.error('❌ Error updating card design:', error)
      throw error
    }
  },

  /**
   * Delete card design (reset to default)
   * @param {string} offerId - Secure offer ID
   * @returns {Promise<{success: boolean}>}
   */
  async deleteDesign(offerId) {
    try {
      console.log('🗑️ Deleting card design:', offerId)
      const response = await secureApi.delete(`${CARD_DESIGN_BASE}/offer/${offerId}`)
      const data = await response.json()

      if (data.success) {
        console.log('✅ Card design deleted (reset to default)')
      }

      return data
    } catch (error) {
      console.error('❌ Error deleting card design:', error)
      throw error
    }
  },

  /**
   * Upload logo image and get processed versions
   * @param {File} file - Logo image file
   * @returns {Promise<{success: boolean, data: {original, google, apple, suggestedColor}}>}
   */
  async uploadLogo(file) {
    try {
      console.log('📤 Uploading logo:', file.name)

      const formData = new FormData()
      formData.append('logo', file)

      // Get secure authentication headers
      const authHeaders = getSecureAuthHeaders()

      // Remove Content-Type to let browser set it with boundary for multipart
      const { 'Content-Type': _, ...headersWithoutContentType } = authHeaders

      const response = await fetch(`${CARD_DESIGN_BASE}/upload/logo`, {
        method: 'POST',
        headers: headersWithoutContentType,
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Logo uploaded and processed:', data.data)
      } else {
        throw new Error(data.error || 'Upload failed')
      }

      return data
    } catch (error) {
      console.error('❌ Error uploading logo:', error)
      throw error
    }
  },

  /**
   * Upload hero/banner image
   * @param {File} file - Hero image file
   * @returns {Promise<{success: boolean, data: {url, dimensions}}>}
   */
  async uploadHeroImage(file) {
    try {
      console.log('📤 Uploading hero image:', file.name)

      const formData = new FormData()
      formData.append('hero', file)

      // Get secure authentication headers
      const authHeaders = getSecureAuthHeaders()

      // Remove Content-Type to let browser set it with boundary for multipart
      const { 'Content-Type': _, ...headersWithoutContentType } = authHeaders

      const response = await fetch(`${CARD_DESIGN_BASE}/upload/hero`, {
        method: 'POST',
        headers: headersWithoutContentType,
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Hero image uploaded:', data.data)
      } else {
        throw new Error(data.error || 'Upload failed')
      }

      return data
    } catch (error) {
      console.error('❌ Error uploading hero image:', error)
      throw error
    }
  },

  /**
   * Validate color contrast
   * @param {string} bgColor - Background color (hex)
   * @param {string} fgColor - Foreground/text color (hex)
   * @returns {Promise<{success: boolean, data: {isValid, ratio, level, meetsAA, meetsAAA}}>}
   */
  async validateContrast(bgColor, fgColor) {
    try {
      const response = await secureApi.post(`${CARD_DESIGN_BASE}/validate/contrast`, {
        backgroundColor: bgColor,
        foregroundColor: fgColor
      })
      const data = await response.json()

      return data
    } catch (error) {
      console.error('❌ Error validating contrast:', error)
      throw error
    }
  },

  /**
   * Validate entire design
   * @param {string} offerId - Secure offer ID
   * @returns {Promise<{success: boolean, data: {isValid, hasWarnings, hasErrors, errors, warnings}}>}
   */
  async validateDesign(offerId) {
    try {
      console.log('🔍 Validating card design:', offerId)
      const response = await secureApi.get(`${CARD_DESIGN_BASE}/offer/${offerId}/validate`)
      const data = await response.json()

      if (data.data) {
        console.log('🔍 Validation results:', {
          isValid: data.data.isValid,
          errors: data.data.errors?.length || 0,
          warnings: data.data.warnings?.length || 0
        })
      }

      return data
    } catch (error) {
      console.error('❌ Error validating design:', error)
      throw error
    }
  },

  /**
   * Get all available templates
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async getTemplates() {
    try {
      console.log('📋 Fetching card design templates')
      const response = await secureApi.get(`${CARD_DESIGN_BASE}/templates`)
      const data = await response.json()

      if (data.success) {
        console.log(`✅ Loaded ${data.data?.length || 0} templates`)
      }

      return data
    } catch (error) {
      console.error('❌ Error fetching templates:', error)
      throw error
    }
  },

  /**
   * Apply a template to an offer's design
   * @param {string} offerId - Secure offer ID
   * @param {string} templateId - Template ID to apply
   * @returns {Promise<{success: boolean, data: object}>}
   */
  async applyTemplate(offerId, templateId) {
    try {
      console.log('🎨 Applying template:', { offerId, templateId })
      const response = await secureApi.post(`${CARD_DESIGN_BASE}/apply-template/${offerId}`, {
        templateId
      })
      const data = await response.json()

      if (data.success) {
        console.log('✅ Template applied successfully')
      }

      return data
    } catch (error) {
      console.error('❌ Error applying template:', error)
      throw error
    }
  },

  /**
   * Get design statistics for current business
   * @returns {Promise<{success: boolean, data: object}>}
   */
  async getBusinessStats() {
    try {
      const response = await secureApi.get(`${CARD_DESIGN_BASE}/business/stats`)
      const data = await response.json()

      return data
    } catch (error) {
      console.error('❌ Error fetching business stats:', error)
      throw error
    }
  },

  /**
   * Extract dominant color from an image
   * @param {File} file - Image file
   * @returns {Promise<{success: boolean, data: {color: string}}>}
   */
  async extractColor(file) {
    try {
      console.log('🎨 Extracting dominant color from image:', file.name)

      const formData = new FormData()
      formData.append('image', file)

      const token = localStorage.getItem('businessToken')
      const response = await fetch(`${CARD_DESIGN_BASE}/extract-color`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Extracted color:', data.data.color)
      }

      return data
    } catch (error) {
      console.error('❌ Error extracting color:', error)
      throw error
    }
  }
}

export default cardDesignAPI
