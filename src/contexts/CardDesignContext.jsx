/**
 * Card Design Context
 * Global state management for card design editor
 * Phase 2 - Frontend Components
 */

import { createContext, useContext, useState, useCallback } from 'react'
import cardDesignAPI from '../services/cardDesignAPI'
import { validateCardDesign } from '../utils/designValidation'

const CardDesignContext = createContext(null)

export function CardDesignProvider({ children }) {
  // Current design state
  const [currentDesign, setCurrentDesign] = useState(null)
  const [originalDesign, setOriginalDesign] = useState(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Validation state
  const [validation, setValidation] = useState({
    isValid: true,
    hasWarnings: false,
    hasErrors: false,
    errors: [],
    warnings: []
  })

  // Templates state
  const [templates, setTemplates] = useState([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // Offer context
  const [currentOfferId, setCurrentOfferId] = useState(null)
  const [isDefaultDesign, setIsDefaultDesign] = useState(false)

  /**
   * Load design for an offer
   */
  const loadDesign = useCallback(async (offerId) => {
    try {
      setLoading(true)
      setError(null)
      setCurrentOfferId(offerId)

      const response = await cardDesignAPI.getDesign(offerId)

      if (response.success) {
        // Normalize barcode_preference to default to QR_CODE if not set
        const normalizedDesign = {
          ...response.data,
          barcode_preference: response.data.barcode_preference || 'QR_CODE'
        }
        setCurrentDesign(normalizedDesign)
        setOriginalDesign(normalizedDesign) // Keep original for dirty checking
        setIsDefaultDesign(response.isDefault || false)

        // Run client-side validation
        const validationResult = validateCardDesign(normalizedDesign)
        setValidation(validationResult)

        return normalizedDesign
      } else {
        throw new Error(response.message || 'Failed to load design')
      }
    } catch (err) {
      console.error('Error loading design:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update design field
   */
  const updateDesignField = useCallback((field, value) => {
    setCurrentDesign(prev => {
      const updated = { ...prev, [field]: value }

      // Re-validate after update
      const validationResult = validateCardDesign(updated)
      setValidation(validationResult)

      return updated
    })
  }, [])

  /**
   * Update multiple fields at once
   */
  const updateDesignFields = useCallback((updates) => {
    setCurrentDesign(prev => {
      const updated = { ...prev, ...updates }

      // Re-validate after update
      const validationResult = validateCardDesign(updated)
      setValidation(validationResult)

      return updated
    })
  }, [])

  /**
   * Save current design to backend
   */
  const saveDesign = useCallback(async () => {
    if (!currentOfferId) {
      throw new Error('No offer selected')
    }

    try {
      setSaving(true)
      setError(null)

      const response = await cardDesignAPI.saveDesign(currentOfferId, currentDesign)

      if (response.success) {
        // Normalize barcode_preference to default to QR_CODE if not set
        const normalizedDesign = {
          ...response.data,
          barcode_preference: response.data.barcode_preference || 'QR_CODE'
        }
        setCurrentDesign(normalizedDesign)
        setOriginalDesign(normalizedDesign) // Update original after save
        setIsDefaultDesign(false)

        // Update validation from server response (use normalized design)
        if (response.validation) {
          setValidation(response.validation)
        } else {
          // Re-validate with normalized design
          const validationResult = validateCardDesign(normalizedDesign)
          setValidation(validationResult)
        }

        return normalizedDesign
      } else {
        throw new Error(response.message || 'Failed to save design')
      }
    } catch (err) {
      console.error('Error saving design:', err)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [currentOfferId, currentDesign])

  /**
   * Reset design to original (discard changes)
   */
  const resetDesign = useCallback(() => {
    setCurrentDesign(originalDesign)
    const validationResult = validateCardDesign(originalDesign)
    setValidation(validationResult)
  }, [originalDesign])

  /**
   * Check if design has unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    if (!currentDesign || !originalDesign) return false
    return JSON.stringify(currentDesign) !== JSON.stringify(originalDesign)
  }, [currentDesign, originalDesign])

  /**
   * Apply a template
   */
  const applyTemplate = useCallback(async (templateId) => {
    if (!currentOfferId) {
      throw new Error('No offer selected')
    }

    try {
      setLoading(true)
      setError(null)

      const response = await cardDesignAPI.applyTemplate(currentOfferId, templateId)

      if (response.success) {
        // Normalize barcode_preference to default to QR_CODE if not set
        const normalizedDesign = {
          ...response.data,
          barcode_preference: response.data.barcode_preference || 'QR_CODE'
        }
        setCurrentDesign(normalizedDesign)
        // Don't update originalDesign yet - let user save first

        const validationResult = validateCardDesign(normalizedDesign)
        setValidation(validationResult)

        return normalizedDesign
      } else {
        throw new Error(response.message || 'Failed to apply template')
      }
    } catch (err) {
      console.error('Error applying template:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [currentOfferId])

  /**
   * Load available templates
   */
  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return templates

    try {
      const response = await cardDesignAPI.getTemplates()

      if (response.success) {
        setTemplates(response.data)
        setTemplatesLoaded(true)
        return response.data
      } else {
        throw new Error(response.message || 'Failed to load templates')
      }
    } catch (err) {
      console.error('Error loading templates:', err)
      setError(err.message)
      throw err
    }
  }, [templates, templatesLoaded])

  /**
   * Upload logo and update design
   */
  const uploadLogo = useCallback(async (file) => {
    try {
      setLoading(true)
      setError(null)

      const response = await cardDesignAPI.uploadLogo(file)

      if (response.success) {
        // Update design with all logo URLs
        const updates = {
          logo_url: response.data.original.url,
          logo_google_url: response.data.google.url,
          logo_apple_url: response.data.apple.url
        }

        // Optionally update background color with suggested color
        if (response.data.suggestedColor) {
          updates.suggestedColor = response.data.suggestedColor
        }

        updateDesignFields(updates)

        return response.data
      } else {
        throw new Error(response.message || 'Failed to upload logo')
      }
    } catch (err) {
      console.error('Error uploading logo:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [updateDesignFields])

  /**
   * Upload hero image and update design
   */
  const uploadHeroImage = useCallback(async (file) => {
    try {
      setLoading(true)
      setError(null)

      const response = await cardDesignAPI.uploadHeroImage(file)

      if (response.success) {
        updateDesignField('hero_image_url', response.data.url)
        return response.data
      } else {
        throw new Error(response.message || 'Failed to upload hero image')
      }
    } catch (err) {
      console.error('Error uploading hero image:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [updateDesignField])

  /**
   * Validate design with backend
   */
  const validateDesignOnServer = useCallback(async () => {
    if (!currentOfferId) {
      throw new Error('No offer selected')
    }

    try {
      const response = await cardDesignAPI.validateDesign(currentOfferId)

      if (response.success) {
        setValidation(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Validation failed')
      }
    } catch (err) {
      console.error('Error validating design:', err)
      throw err
    }
  }, [currentOfferId])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = {
    // State
    currentDesign,
    originalDesign,
    loading,
    saving,
    error,
    validation,
    templates,
    currentOfferId,
    isDefaultDesign,

    // Actions
    loadDesign,
    updateDesignField,
    updateDesignFields,
    saveDesign,
    resetDesign,
    hasUnsavedChanges,
    applyTemplate,
    loadTemplates,
    uploadLogo,
    uploadHeroImage,
    validateDesignOnServer,
    clearError,

    // Helpers
    isDirty: hasUnsavedChanges()
  }

  return (
    <CardDesignContext.Provider value={value}>
      {children}
    </CardDesignContext.Provider>
  )
}

export function useCardDesign() {
  const context = useContext(CardDesignContext)
  if (!context) {
    throw new Error('useCardDesign must be used within CardDesignProvider')
  }
  return context
}

export default CardDesignContext
