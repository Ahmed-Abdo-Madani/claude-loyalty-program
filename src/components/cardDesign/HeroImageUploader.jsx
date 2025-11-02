/**
 * HeroImageUploader Component
 * Upload banner/hero images for wallet cards
 * Phase 2 - Mobile-First Optimization
 * 
 * Mobile Optimizations:
 * - "Optional" badge at top
 * - Reduced padding (p-4 on mobile)
 * - Collapsible dimension info
 * - Prominent "Skip for Now" button
 * - Simplified info boxes
 * - Larger touch targets
 */

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { validateHeroImage } from '../../utils/designValidation'

function HeroImageUploader({ heroImageUrl, onUpload, onRemove, onSkip, uploading = false }) {
  const { t } = useTranslation('common')
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    setError(null)

    // Validate file
    const validation = validateHeroImage(file)

    if (!validation.isValid) {
      setError(validation.errors.join('. '))
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)

    // Upload file
    try {
      await onUpload(file)
      setPreview(null) // Clear preview after successful upload
    } catch (err) {
      setError(err.message || 'Upload failed')
      setPreview(null)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onRemove?.()
  }

  const hasImage = heroImageUrl || preview

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Optional Badge */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
          Optional
        </span>
        {!hasImage && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[36px]"
          >
            Skip for Now →
          </button>
        )}
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all duration-200
          ${dragActive
            ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600'
          }
          ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleChange}
          className="hidden"
        />

        {hasImage ? (
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Hero Image Preview
              </h4>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors min-h-[36px]"
              >
                {t('upload.remove')}
              </button>
            </div>

            {/* Preview Image - Banner Aspect Ratio */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={preview || heroImageUrl}
                alt="Hero preview"
                className="w-full h-auto object-cover"
                style={{ aspectRatio: '1032 / 336' }}
              />
            </div>

            {/* Collapsible Technical Details */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left min-h-[36px]"
              >
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Technical Details
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  {showTechnicalDetails ? '▼' : '▶'}
                </span>
              </button>
              
              {showTechnicalDetails && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">ℹ️</span>
                    <div className="flex-1 text-xs text-blue-700 dark:text-blue-400">
                      <p className="font-semibold mb-1.5">Wallet Display</p>
                      <ul className="list-disc list-inside space-y-1 opacity-90">
                        <li>Displayed across top of wallet cards</li>
                        <li>Optimal size: 1032x336px (3.07:1 ratio)</li>
                        <li>Automatically resized & optimized</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Different Image */}
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={uploading}
              className="mt-3 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium min-h-[44px]"
            >
              {uploading ? t('upload.uploading') : t('upload.uploadDifferentImage')}
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-8 text-center">
            {uploading ? (
              <div className="space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('upload.uploadingProcessing')}
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('upload.uploadHeroImage')}
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Add a banner image to display at the top of your card
                </p>
                <button
                  type="button"
                  onClick={handleButtonClick}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                >
                  {t('upload.chooseFile')}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  PNG or JPG, max 10MB
                </p>
                
                {/* Skip Button - Mobile Prominent */}
                {onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="mt-4 w-full sm:w-auto px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                  >
                    {t('upload.skipHeroImage')}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Upload Error
              </p>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Info Box - Mobile Friendly */}
      {!hasImage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5 text-lg sm:text-base flex-shrink-0">💡</span>
            <div className="flex-1 text-xs sm:text-sm text-blue-700 dark:text-blue-400 space-y-1 sm:space-y-1.5">
              <p className="font-semibold">Quick Tips</p>
              <ul className="space-y-1 opacity-90">
                <li>• Use landscape images</li>
                <li>• Keep important content centered</li>
                <li className="hidden sm:list-item">• Preview on both platforms before finalizing</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HeroImageUploader
