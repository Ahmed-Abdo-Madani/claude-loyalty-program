/**
 * CardDesignEditor Component
 * Main modal component for editing offer card designs
 * Phase 2 - Mobile-First Optimization
 * 
 * Mobile Optimizations:
 * - Collapsible sections with one open at a time on mobile
 * - Floating preview button (FAB) for mobile
 * - MobilePreviewSheet for full-screen preview
 * - Progress indicator (X of Y sections complete)
 * - Reordered sections for better mobile flow
 * - Sticky tabs with completion badges
 * - Larger touch targets throughout
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCardDesign } from '../../contexts/CardDesignContext'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import ColorPicker from './ColorPicker'
import LogoUploader from './LogoUploader'
import HeroImageUploader from './HeroImageUploader'
import StampIconPicker from './StampIconPicker'
import CardPreview from './CardPreview'
import TemplateSelector from './TemplateSelector'
import ValidationPanel from './ValidationPanel'
import CollapsibleSection from './CollapsibleSection'
import MobilePreviewSheet from './MobilePreviewSheet'
import SelectableOptionCard from './SelectableOptionCard'

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

  const { t } = useTranslation('cardDesign')
  const isDesktop = useIsDesktop() // Detect desktop viewport
  const [activeTab, setActiveTab] = useState('design') // 'design', 'preview', 'validation'
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [openSection, setOpenSection] = useState('colors') // Only one section open at a time on mobile

  // Section completion tracking
  const getSectionCompletion = () => {
    const design = currentDesign || {}
    return {
      colors: !!(design.background_color && design.foreground_color),
      logo: !!(design.logo_url || design.logo_google_url || design.logo_apple_url),
      stamps: !!(design.stamp_display_type),
      passType: !!(design.apple_pass_type),
      barcode: !!(design.barcode_preference),
      hero: true // Hero is optional, always counts as "complete"
    }
  }

  const completion = getSectionCompletion()
  const completedCount = Object.values(completion).filter(Boolean).length
  const totalCount = Object.keys(completion).length

  // Toggle section on mobile (only one open at a time)
  const handleToggleSection = (sectionId) => {
    if (isDesktop) {
      // On desktop, allow multiple sections open (do nothing)
      return
    }
    // On mobile, toggle section
    setOpenSection(openSection === sectionId ? null : sectionId)
  }

  // Navigate to section from ValidationPanel "Fix This" buttons
  const handleNavigateToSection = (sectionId) => {
    setActiveTab('design')
    setOpenSection(sectionId)
    // Scroll to section after a brief delay
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionId}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  useEffect(() => {
    if (offer?.public_id) {
      loadDesign(offer.public_id)
    }
  }, [offer?.public_id, loadDesign])

  // Set default apple_pass_type if missing after design loads
  useEffect(() => {
    if (currentDesign && !currentDesign.apple_pass_type) {
      updateDesignField('apple_pass_type', 'storeCard')
    }
  }, [currentDesign?.apple_pass_type, updateDesignField])

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
      const confirmed = window.confirm(t('editor.confirmClose'))
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
            <p className="text-gray-600 dark:text-gray-400">{t('editor.loadingDesign')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 shadow-2xl w-full max-w-full h-full sm:max-w-7xl sm:max-h-[95vh] sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t('editor.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {offer?.title || t('editor.loyaltyCard')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
              <div className="flex items-center gap-2">
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

        {/* Content - Fixed height with independent scrolling panes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6 lg:p-6 flex-1 overflow-hidden">
          {/* Left Panel - Design Controls (Scrollable) */}
          <div className={`overflow-y-auto p-4 sm:p-6 lg:p-0 ${isDesktop ? 'lg:col-span-1' : ''}`}>
            <div className="space-y-3 sm:space-y-4">
              {/* Progress Indicator */}
              {activeTab === 'design' && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t('editor.setupProgress')}
                    </span>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {completedCount} {t('editor.of')} {totalCount} {t('editor.complete')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] relative
                  ${activeTab === 'design'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                {t('editor.tabs.design')}
                {activeTab === 'design' && completedCount < totalCount && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                )}
              </button>
              {/* Mobile: Show Preview Tab (opens bottom sheet) */}
              {!isDesktop && (
                <button
                  onClick={() => setShowMobilePreview(true)}
                  className="flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50"
                >
                  {t('editor.tabs.preview')}
                </button>
              )}
              <button
                onClick={() => setActiveTab('validation')}
                className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] relative
                  ${activeTab === 'validation'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                {t('editor.tabs.check')}
                {validation && !validation.isValid && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>

              {/* Design Tab with Collapsible Sections */}
              {activeTab === 'design' && (
                <div className="space-y-3 sm:space-y-4">
                  {/* Templates Button */}
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 min-h-[52px]"
                  >
                    <span>📋</span>
                    <span>{t('editor.browseTemplates')}</span>
                  </button>

                  {/* 1. Colors Section - Collapsible */}
                  <CollapsibleSection
                    sectionId="colors"
                    title={t('editor.sections.colors')}
                    required={true}
                    completed={completion.colors}
                    isOpen={isDesktop || openSection === 'colors'}
                    onToggle={() => handleToggleSection('colors')}
                  >
                  <div className="space-y-4">
                    <ColorPicker
                      label={t('editor.colors.background')}
                      value={currentDesign?.background_color}
                      onChange={(color) => updateDesignField('background_color', color)}
                      contrastWith={currentDesign?.foreground_color}
                      required
                    />

                    <ColorPicker
                      label={t('editor.colors.text')}
                      value={currentDesign?.foreground_color}
                      onChange={(color) => updateDesignField('foreground_color', color)}
                      contrastWith={currentDesign?.background_color}
                      required
                    />

                    <ColorPicker
                      label={t('editor.colors.label')}
                      value={currentDesign?.label_color}
                      onChange={(color) => updateDesignField('label_color', color)}
                      contrastWith={currentDesign?.background_color}
                      showPresets={false}
                    />
                  </div>
                </CollapsibleSection>

                  {/* 2. Logo Section - Collapsible */}
                  <CollapsibleSection
                    sectionId="logo"
                    title={t('editor.sections.logo')}
                    required={true}
                    completed={completion.logo}
                    isOpen={isDesktop || openSection === 'logo'}
                    onToggle={() => handleToggleSection('logo')}
                  >
                  <LogoUploader
                    logoUrl={currentDesign?.logo_url}
                    googleLogoUrl={currentDesign?.logo_google_url}
                    appleLogoUrl={currentDesign?.logo_apple_url}
                    onUpload={handleLogoUpload}
                    onRemove={handleLogoRemove}
                    onApplySuggestedColor={handleApplySuggestedColor}
                    uploading={uploading}
                  />
                </CollapsibleSection>

                  {/* 3. Stamps Section - Collapsible */}
                  <CollapsibleSection
                    sectionId="stamps"
                    title={t('editor.sections.stamps')}
                    optional={true}
                    completed={completion.stamps}
                    isOpen={isDesktop || openSection === 'stamps'}
                    onToggle={() => handleToggleSection('stamps')}
                  >
                  <div className="space-y-4">
                    {/* Display Type Toggle */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        onClick={() => updateDesignField('stamp_display_type', 'logo')}
                        disabled={uploading || saving}
                        className={`px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg border-2 transition-all text-left min-h-[60px]
                          ${(currentDesign?.stamp_display_type || 'logo') === 'logo'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-900 dark:text-white'
                          }
                          ${(uploading || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-sm sm:text-base">{t('editor.stamps.businessLogo')}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {t('editor.stamps.useLogoAsStamp')}
                        </div>
                      </button>
                      <button
                        onClick={() => updateDesignField('stamp_display_type', 'svg')}
                        disabled={uploading || saving}
                        className={`px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg border-2 transition-all text-left min-h-[60px]
                          ${currentDesign?.stamp_display_type === 'svg'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-900 dark:text-white'
                          }
                          ${(uploading || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-sm sm:text-base">{t('editor.stamps.svgIcon')}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {t('editor.stamps.chooseFromLibrary')}
                        </div>
                      </button>
                    </div>

                    {/* Show icon picker only when SVG mode is selected */}
                    {currentDesign?.stamp_display_type === 'svg' && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <StampIconPicker
                          selectedIconId={currentDesign?.stamp_icon || 'coffee-01'}
                          onChange={(iconId) => updateDesignField('stamp_icon', iconId)}
                          disabled={uploading || saving}
                        />
                      </div>
                    )}

                    {/* Show logo requirement when logo mode is selected */}
                    {(currentDesign?.stamp_display_type || 'logo') === 'logo' && !currentDesign?.logo_url && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                          {t('editor.stamps.logoRequired')}
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                  {/* 4. Apple Wallet Pass Type Section - Collapsible */}
                  <CollapsibleSection
                    sectionId="passType"
                    title={t('editor.sections.passType')}
                    required={true}
                    completed={completion.passType}
                    isOpen={isDesktop || openSection === 'passType'}
                    onToggle={() => handleToggleSection('passType')}
                  >
                    <div className="space-y-3">
                      {/* Help text */}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('editor.passType.helpText')}
                      </p>

                      {/* Pass type options */}
                      <div className="space-y-2">
                        <SelectableOptionCard
                          value="storeCard"
                          name="apple_pass_type"
                          checked={currentDesign?.apple_pass_type === 'storeCard'}
                          onChange={(value) => updateDesignField('apple_pass_type', value)}
                          icon="🎫"
                          title={t('editor.passType.storeCard')}
                          description={t('editor.passType.storeCardDesc')}
                          isDefault={true}
                        />

                        <SelectableOptionCard
                          value="generic"
                          name="apple_pass_type"
                          checked={currentDesign?.apple_pass_type === 'generic'}
                          onChange={(value) => updateDesignField('apple_pass_type', value)}
                          icon="📱"
                          title={t('editor.passType.generic')}
                          description={t('editor.passType.genericDesc')}
                        />
                      </div>
                    </div>
                </CollapsibleSection>

                {/* 5. Barcode Type Section - Collapsible */}
                <CollapsibleSection
                  sectionId="barcode"
                  title={t('editor.sections.barcode')}
                  optional={false}
                  completed={completion.barcode}
                  isOpen={isDesktop || openSection === 'barcode'}
                  onToggle={() => handleToggleSection('barcode')}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('editor.barcode.helpText')}
                    </p>
                    
                    <div className="space-y-3">
                      <SelectableOptionCard
                        value="QR_CODE"
                        name="barcode_preference"
                        checked={currentDesign?.barcode_preference === 'QR_CODE'}
                        onChange={(value) => updateDesignField('barcode_preference', value)}
                        icon="📱"
                        title={t('editor.barcode.qrCode')}
                        description={t('editor.barcode.qrCodeDesc')}
                      />

                      <SelectableOptionCard
                        value="PDF417"
                        name="barcode_preference"
                        checked={currentDesign?.barcode_preference === 'PDF417'}
                        onChange={(value) => updateDesignField('barcode_preference', value)}
                        icon="🏪"
                        title={t('editor.barcode.pdf417')}
                        description={t('editor.barcode.pdf417Desc')}
                        isDefault={true}
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                  {/* 6. Hero Image Section - Collapsible */}
                  <CollapsibleSection
                    sectionId="hero"
                    title={t('editor.sections.hero')}
                    optional={true}
                    completed={completion.hero}
                    isOpen={isDesktop || openSection === 'hero'}
                    onToggle={() => handleToggleSection('hero')}
                  >
                    <HeroImageUploader
                      heroImageUrl={currentDesign?.hero_image_url}
                      onUpload={handleHeroUpload}
                      onRemove={handleHeroRemove}
                      onSkip={() => handleToggleSection(null)}
                      uploading={uploading}
                    />
                  </CollapsibleSection>
                </div>
              )}

              {/* Validation Tab */}
              {activeTab === 'validation' && (
                <ValidationPanel
                  validation={validation}
                  design={currentDesign}
                  onNavigateToSection={handleNavigateToSection}
                />
              )}
            </div>
          </div>

          {/* Right Panel - Preview (Desktop Only) - Sticky within its container */}
          {isDesktop && (
            <div className="lg:col-span-2 overflow-y-auto p-6">
              <div className="sticky top-0">
                <CardPreview design={currentDesign} offerData={offer} isMobile={false} />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            {isDirty && (
              <span className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span>{t('editor.unsavedChanges')}</span>
              </span>
            )}
            {validation && !validation.isValid && (
              <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                ⚠️ {t('editor.validation.fixErrors')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={resetDesign}
              disabled={!isDirty}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px]"
            >
              {t('editor.actions.reset')}
            </button>
            <button
              onClick={handleClose}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm min-h-[44px]"
            >
              {t('editor.actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (validation && !validation.isValid)}
              className="flex-1 sm:flex-initial px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm min-h-[44px]"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('editor.actions.saving')}</span>
                </>
              ) : (
                <>
                  <span>{t('editor.actions.saveDesign')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Preview Sheet */}
      {!isDesktop && showMobilePreview && (
        <MobilePreviewSheet
          isOpen={showMobilePreview}
          onClose={() => setShowMobilePreview(false)}
        >
          <CardPreview design={currentDesign} offerData={offer} isMobile={true} />
        </MobilePreviewSheet>
      )}

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
