/**
 * SimpleLoyaltyCardDesigner Component
 * Clean 3-step wizard for designing loyalty cards
 * Replaces the complex CardDesignEditor with a streamlined experience
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCardDesign } from '../../contexts/CardDesignContext'
import GoogleWalletPreview from './GoogleWalletPreview'
import AppleWalletPreview from './AppleWalletPreview'

// Industry templates with icons and colors
const TEMPLATES = [
    { id: 'coffee_classic', icon: '☕', name: 'designer.templates.coffee', color: '#5C3A29', textColor: '#FFFFFF' },
    { id: 'restaurant_rewards', icon: '🍽️', name: 'designer.templates.restaurant', color: '#B91C1C', textColor: '#FFFFFF' },
    { id: 'retail_rewards', icon: '🛍️', name: 'designer.templates.retail', color: '#1E40AF', textColor: '#FFFFFF' },
    { id: 'beauty_wellness', icon: '💇', name: 'designer.templates.salon', color: '#BE185D', textColor: '#FFFFFF' },
    { id: 'fitness_gym', icon: '💪', name: 'designer.templates.fitness', color: '#C2410C', textColor: '#FFFFFF' },
    { id: 'food_delivery', icon: '🍕', name: 'designer.templates.food', color: '#A16207', textColor: '#FFFFFF' },
    { id: 'pet_services', icon: '🐾', name: 'designer.templates.pets', color: '#059669', textColor: '#FFFFFF' },
    { id: 'professional_default', icon: '⭐', name: 'designer.templates.other', color: '#1E40AF', textColor: '#FFFFFF' },
]

function SimpleLoyaltyCardDesigner({ offer, onClose, onSave, businessName }) {
    const { t } = useTranslation('cardDesign')
    const {
        currentDesign,
        loading,
        saving,
        loadDesign,
        applyTemplate,
        updateDesignField,
        updateDesignFields,
        uploadLogo,
        saveDesign,
        isDirty
    } = useCardDesign()

    const [step, setStep] = useState(1)
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [previewPlatform, setPreviewPlatform] = useState('apple')
    const [error, setError] = useState(null)

    // Load design on mount
    useEffect(() => {
        if (offer?.public_id) {
            loadDesign(offer.public_id).then(() => {
                // If design already has colors, skip to step 2
                if (currentDesign?.background_color && currentDesign?.logo_url) {
                    setStep(3)
                } else if (currentDesign?.background_color) {
                    setStep(2)
                }
            })
        }
    }, [offer?.public_id])

    // Handle template selection
    const handleSelectTemplate = async (template) => {
        setSelectedTemplate(template)
        setError(null)

        try {
            await applyTemplate(template.id)
            // Auto-advance to step 2 after short delay
            setTimeout(() => setStep(2), 300)
        } catch (err) {
            // If template apply fails, just update colors locally
            updateDesignFields({
                background_color: template.color,
                foreground_color: template.textColor,
                label_color: template.textColor
            })
            setTimeout(() => setStep(2), 300)
        }
    }

    // Handle logo upload
    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError(null)

        try {
            const result = await uploadLogo(file)
            // Auto-apply suggested color if available
            if (result?.suggestedColor) {
                updateDesignField('background_color', result.suggestedColor)
            }
        } catch (err) {
            setError(t('designer.errors.uploadLogo'))
        } finally {
            setUploading(false)
        }
    }

    // Handle color change
    const handleColorChange = (field, value) => {
        updateDesignField(field, value)
    }

    // Handle save
    const handleSave = async () => {
        try {
            setError(null)
            const savedDesign = await saveDesign()
            onSave?.(savedDesign)
        } catch (err) {
            setError(t('designer.errors.saveFailed'))
        }
    }

    // Handle close with confirmation
    const handleClose = () => {
        if (isDirty) {
            const confirmed = window.confirm(t('editor.confirmClose'))
            if (!confirmed) return
        }
        onClose()
    }

    // Navigate between steps
    const goToStep = (newStep) => {
        if (newStep >= 1 && newStep <= 3) {
            setStep(newStep)
        }
    }

    // Loading state
    if (loading && !currentDesign) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">{t('designer.loading')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {t('designer.title')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {offer?.title || t('preview.mockData.loyaltyCard')}
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

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-900/50">
                    {[1, 2, 3].map((s) => (
                        <button
                            key={s}
                            onClick={() => goToStep(s)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${step === s
                                    ? 'bg-primary text-white shadow-md'
                                    : step > s
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {step > s ? '✓' : s}
                            <span className="hidden sm:inline">
                                {s === 1 ? t('designer.steps.style') : s === 2 ? t('designer.steps.brand') : t('designer.steps.preview')}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-3 flex items-center justify-between">
                        <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* Step 1: Choose Style */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('designer.step1.title')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('designer.step1.subtitle')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105
                      ${selectedTemplate?.id === template.id
                                                ? 'border-primary ring-2 ring-primary/20'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                                            }`}
                                        style={{ backgroundColor: template.color + '15' }}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2"
                                            style={{ backgroundColor: template.color }}
                                        >
                                            {template.icon}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                            {t(template.name)}
                                        </span>
                                        {selectedTemplate?.id === template.id && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                                                ✓
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Your Brand */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('designer.step2.title')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('designer.step2.subtitle')}
                                </p>
                            </div>

                            {/* Logo Upload */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('designer.step2.logo')}
                                </label>
                                <div className="flex items-center gap-4">
                                    {/* Logo Preview */}
                                    <div
                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden"
                                        style={{ backgroundColor: currentDesign?.background_color || '#f3f4f6' }}
                                    >
                                        {currentDesign?.logo_url ? (
                                            <img
                                                src={currentDesign.logo_url}
                                                alt="Logo"
                                                className="w-full h-full object-contain p-2"
                                            />
                                        ) : (
                                            <span className="text-3xl">📷</span>
                                        )}
                                    </div>

                                    {/* Upload Button */}
                                    <div className="flex-1">
                                        <label className="relative cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="sr-only"
                                                disabled={uploading}
                                            />
                                            <div className={`px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 
                        hover:border-primary hover:bg-primary/5 transition-all text-center
                        ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {uploading ? (
                                                    <span className="text-sm text-gray-500">{t('designer.step2.uploading')}</span>
                                                ) : (
                                                    <>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            {t('designer.step2.clickToUpload')}
                                                        </span>
                                                        <span className="block text-xs text-gray-400 mt-1">
                                                            {t('designer.step2.uploadHelper')}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Color Pickers */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Background Color */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('designer.step2.background')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={currentDesign?.background_color || '#1E40AF'}
                                            onChange={(e) => handleColorChange('background_color', e.target.value)}
                                            className="w-12 h-12 rounded-lg cursor-pointer border-0"
                                        />
                                        <input
                                            type="text"
                                            value={currentDesign?.background_color || '#1E40AF'}
                                            onChange={(e) => handleColorChange('background_color', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-sm font-mono"
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>

                                {/* Text Color */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('designer.step2.textColor')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={currentDesign?.foreground_color || '#FFFFFF'}
                                            onChange={(e) => handleColorChange('foreground_color', e.target.value)}
                                            className="w-12 h-12 rounded-lg cursor-pointer border-0"
                                        />
                                        <input
                                            type="text"
                                            value={currentDesign?.foreground_color || '#FFFFFF'}
                                            onChange={(e) => handleColorChange('foreground_color', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-sm font-mono"
                                            placeholder="#FFFFFF"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quick Preview */}
                            <div
                                className="p-4 rounded-xl text-center"
                                style={{
                                    backgroundColor: currentDesign?.background_color || '#1E40AF',
                                    color: currentDesign?.foreground_color || '#FFFFFF'
                                }}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    {currentDesign?.logo_url && (
                                        <img src={currentDesign.logo_url} alt="" className="w-10 h-10 object-contain" />
                                    )}
                                    <span className="font-semibold">{t('designer.step2.colorPreview')}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('designer.step3.title')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('designer.step3.subtitle')}
                                </p>
                            </div>

                            {/* Platform Toggle */}
                            <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit mx-auto">
                                <button
                                    onClick={() => setPreviewPlatform('apple')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${previewPlatform === 'apple'
                                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <span></span> {t('designer.step3.apple')}
                                </button>
                                <button
                                    onClick={() => setPreviewPlatform('google')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${previewPlatform === 'google'
                                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <span>G</span> {t('designer.step3.google')}
                                </button>
                            </div>

                            {/* Preview */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 
                rounded-xl p-6 flex items-center justify-center min-h-[350px]">
                                <div className="transform scale-90">
                                    {previewPlatform === 'apple' ? (
                                        <AppleWalletPreview design={currentDesign} offerData={{ ...offer, businessName }} />
                                    ) : (
                                        <GoogleWalletPreview design={currentDesign} offerData={{ ...offer, businessName }} />
                                    )}
                                </div>
                            </div>

                            {/* Live indicator */}
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span>{t('designer.step3.liveUpdates')}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {/* Left: Back button */}
                    <div>
                        {step > 1 && (
                            <button
                                onClick={() => goToStep(step - 1)}
                                className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white 
                  font-medium transition-colors flex items-center gap-2"
                            >
                                {t('designer.actions.back')}
                            </button>
                        )}
                    </div>

                    {/* Right: Next/Save button */}
                    <div className="flex items-center gap-3">
                        {isDirty && (
                            <span className="text-xs text-orange-500 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                {t('designer.actions.unsaved')}
                            </span>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={() => goToStep(step + 1)}
                                disabled={step === 1 && !currentDesign?.background_color}
                                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold 
                  transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
                            >
                                {t('designer.actions.next')}
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 
                  text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg 
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>{t('designer.actions.saving')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{t('designer.actions.save')}</span>
                                        <span>✓</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SimpleLoyaltyCardDesigner
