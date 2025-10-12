/**
 * HeroImageUploader Component
 * Upload banner/hero images for wallet cards
 * Phase 3 - Design Features & Templates
 */

import { useState, useRef } from 'react'
import { validateHeroImage } from '../../utils/designValidation'

function HeroImageUploader({ heroImageUrl, onUpload, onRemove, uploading = false }) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
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
    <div className="space-y-4">
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
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Hero Image Preview
              </h4>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              >
                Remove
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

            {/* Dimension Info */}
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</span>
                <div className="flex-1 text-xs text-blue-700 dark:text-blue-400">
                  <p className="font-semibold mb-1">Wallet Display</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Displayed across top of both Google & Apple Wallet cards</li>
                    <li>Optimal size: 1032x336px (3.07:1 aspect ratio)</li>
                    <li>Automatically resized and optimized</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Upload Different Image */}
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={uploading}
              className="mt-3 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              {uploading ? 'Uploading...' : 'Upload Different Image'}
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            {uploading ? (
              <div className="space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uploading and processing...
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Upload Hero Image
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Add a banner image to display across the top of your card
                </p>
                <button
                  type="button"
                  onClick={handleButtonClick}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  PNG or JPG, max 10MB • Recommended: 1032x336px
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <span className="text-red-600 dark:text-red-400 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Upload Error
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!hasImage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">💡</span>
            <div className="flex-1 text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-semibold">Hero Image Tips</p>
              <ul className="list-disc list-inside space-y-1 opacity-90">
                <li>Use landscape orientation (wide, not tall)</li>
                <li>Keep important content centered (avoid edges)</li>
                <li>Use high contrast for text readability</li>
                <li>Preview on both platforms before finalizing</li>
                <li>Optional: Leave blank for simpler card design</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HeroImageUploader
