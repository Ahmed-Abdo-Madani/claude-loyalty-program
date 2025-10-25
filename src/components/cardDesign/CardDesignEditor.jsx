/**
 * CardDesignEditor Component
 * Main modal component for editing offer card designs
 * Phase 2 - Frontend Components
 */

import { useState, useEffect } from 'react'
import { useCardDesign } from '../../contexts/CardDesignContext'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import ColorPicker from './ColorPicker'
import LogoUploader from './LogoUploader'
import HeroImageUploader from './HeroImageUploader'
import StampIconPicker from './StampIconPicker'
import CardPreview from './CardPreview'
import TemplateSelector from './TemplateSelector'
import ValidationPanel from './ValidationPanel'

function CardDesignEditor({ offer, onClose, onSave }) {
  const {
    currentDesign,
    loading,
    saving,
    error,
    validation,
    loadDesign,
    updateDesignField,
    updateDesignFields,
    saveDesign,
    resetDesign,
    hasUnsavedChanges,
    uploadLogo,
    uploadHeroImage,
    clearError,
    isDirty
  } = useCardDesign()

  const isDesktop = useIsDesktop() // Detect desktop viewport
  const [activeTab, setActiveTab] = useState('design') // 'design', 'preview', 'validation'
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (offer?.public_id) {
      loadDesign(offer.public_id)
    }
  }, [offer?.public_id, loadDesign])

  const handleSave = async () => {
    try {
      const savedDesign = await saveDesign()
      onSave?.(savedDesign)
    } catch (err) {
      // Error is handled by context
      console.error('Save failed:', err)
    }
  }

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirmed) return
    }
    onClose()
  }

  const handleLogoUpload = async (file) => {
    try {
      setUploading(true)
      const result = await uploadLogo(file)
      // uploadLogo already updates the design with logo URLs
      // The suggestedColor is stored in the result
      return result
    } catch (err) {
      console.error('Logo upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleApplySuggestedColor = (color) => {
    updateDesignField('background_color', color)
  }

  const handleLogoRemove = () => {
    updateDesignFields({
      logo_url: null,
      logo_google_url: null,
      logo_apple_url: null
    })
  }

  const handleHeroUpload = async (file) => {
    try {
      setUploading(true)
      await uploadHeroImage(file)
    } catch (err) {
      console.error('Hero image upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleHeroRemove = () => {
    updateDesignField('hero_image_url', null)
  }

  if (loading && !currentDesign) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading design...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              🎨 Design Card
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {offer?.title || 'Loyalty Card'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-red-600 dark:text-red-400">⚠️</span>
                <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {/* Left Panel - Design Controls */}
          <div className={`space-y-6 ${isDesktop ? 'lg:col-span-1' : ''}`}>
            {/* Tabs */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === 'design'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                Design
              </button>
              {/* Mobile: Show Preview Tab */}
              {!isDesktop && (
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${activeTab === 'preview'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                    }`}
                >
                  Preview
                </button>
              )}
              <button
                onClick={() => setActiveTab('validation')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === 'validation'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                Validation
              </button>
            </div>

            {/* Design Tab */}
            {activeTab === 'design' && (
              <div className="space-y-6">
                {/* Templates Button */}
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>📋</span>
                  <span>Browse Templates</span>
                </button>

                {/* Colors Section */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                    Colors
                  </h3>

                  <ColorPicker
                    label="Background Color"
                    value={currentDesign?.background_color}
                    onChange={(color) => updateDesignField('background_color', color)}
                    contrastWith={currentDesign?.foreground_color}
                    required
                  />

                  <ColorPicker
                    label="Text Color"
                    value={currentDesign?.foreground_color}
                    onChange={(color) => updateDesignField('foreground_color', color)}
                    contrastWith={currentDesign?.background_color}
                    required
                  />

                  <ColorPicker
                    label="Label Color"
                    value={currentDesign?.label_color}
                    onChange={(color) => updateDesignField('label_color', color)}
                    contrastWith={currentDesign?.background_color}
                    showPresets={false}
                  />
                </div>

                {/* Logo Section */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
                    Logo
                  </h3>
                  <LogoUploader
                    logoUrl={currentDesign?.logo_url}
                    googleLogoUrl={currentDesign?.logo_google_url}
                    appleLogoUrl={currentDesign?.logo_apple_url}
                    onUpload={handleLogoUpload}
                    onRemove={handleLogoRemove}
                    onApplySuggestedColor={handleApplySuggestedColor}
                    uploading={uploading}
                  />
                </div>

                {/* Hero Image Section - NEW */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
                    Hero Image <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                  </h3>
                  <HeroImageUploader
                    heroImageUrl={currentDesign?.hero_image_url}
                    onUpload={handleHeroUpload}
                    onRemove={handleHeroRemove}
                    uploading={uploading}
                  />
                </div>

                {/* Stamp Display Configuration Section */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
                    Stamp Display (Apple Wallet)
                  </h3>

                  {/* Display Type Toggle */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => updateDesignField('stamp_display_type', 'logo')}
                      disabled={uploading || saving}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-left
                        ${(currentDesign?.stamp_display_type || 'logo') === 'logo'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-900 dark:text-white'
                        }
                        ${(uploading || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium">Business Logo</div>
                      <div className="text-xs opacity-75 mt-1">
                        Use uploaded logo as stamp
                      </div>
                    </button>
                    <button
                      onClick={() => updateDesignField('stamp_display_type', 'svg')}
                      disabled={uploading || saving}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-left
                        ${currentDesign?.stamp_display_type === 'svg'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-900 dark:text-white'
                        }
                        ${(uploading || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium">SVG Icon</div>
                      <div className="text-xs opacity-75 mt-1">
                        Choose from icon library
                      </div>
                    </button>
                  </div>

                  {/* Show icon picker only when SVG mode is selected */}
                  {currentDesign?.stamp_display_type === 'svg' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <StampIconPicker
                        selectedIconId={currentDesign?.stamp_icon || 'coffee-01'}
                        onChange={(iconId) => updateDesignField('stamp_icon', iconId)}
                        disabled={uploading || saving}
                      />
                    </div>
                  )}

                  {/* Show logo requirement when logo mode is selected */}
                  {(currentDesign?.stamp_display_type || 'logo') === 'logo' && !currentDesign?.logo_url && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Logo stamp display requires a logo to be uploaded above
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress Style Section */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
                    Progress Display
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'bar', label: 'Progress Bar', icon: '━' },
                      { value: 'grid', label: 'Stamp Grid', icon: '⊞' }
                    ].map((style) => (
                      <button
                        key={style.value}
                        onClick={() => updateDesignField('progress_display_style', style.value)}
                        className={`w-full px-4 py-3 rounded-lg text-left transition-all duration-200 flex items-center space-x-3
                          ${currentDesign?.progress_display_style === style.value
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                          }`}
                      >
                        <span className="text-xl">{style.icon}</span>
                        <span className="font-medium">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Tab */}
            {activeTab === 'validation' && (
              <ValidationPanel validation={validation} design={currentDesign} />
            )}

            {/* Mobile Preview Tab */}
            {!isDesktop && activeTab === 'preview' && (
              <CardPreview design={currentDesign} offerData={offer} isMobile={true} />
            )}
          </div>

          {/* Right Panel - Preview (Desktop Only) */}
          {isDesktop && (
            <div className="lg:col-span-2">
              <div className="sticky top-0">
                <CardPreview design={currentDesign} offerData={offer} isMobile={false} />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center space-x-3">
            {isDirty && (
              <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span>Unsaved changes</span>
              </span>
            )}
            {validation && !validation.isValid && (
              <span className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Fix errors before saving
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={resetDesign}
              disabled={!isDirty}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (validation && !validation.isValid)}
              className="px-8 py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save Design</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <TemplateSelector
              onApply={() => setShowTemplateSelector(false)}
              onClose={() => setShowTemplateSelector(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CardDesignEditor
