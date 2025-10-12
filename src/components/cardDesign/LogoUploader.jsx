/**
 * LogoUploader Component
 * Image upload with drag & drop, preview, and platform processing
 * Phase 2 - Frontend Components
 */

import { useState, useRef } from 'react'
import { validateImageFile } from '../../utils/designValidation'

function LogoUploader({
  logoUrl,
  googleLogoUrl,
  appleLogoUrl,
  onUpload,
  onRemove,
  onApplySuggestedColor,
  uploading = false
}) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [suggestedColor, setSuggestedColor] = useState(null)
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
    const validation = validateImageFile(file, {
      maxSizeMB: 5,
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg']
    })

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
      const result = await onUpload(file)
      // Preview is now replaced by actual uploaded image
      setPreview(null)
      // Set suggested color if available
      if (result?.suggestedColor) {
        setSuggestedColor(result.suggestedColor)
      }
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

  const hasLogo = logoUrl || googleLogoUrl || appleLogoUrl

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

        {/* Show preview or upload zone */}
        {preview || hasLogo ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Logo Preview
              </h4>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>

            {/* Preview Image */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
              <img
                src={preview || logoUrl}
                alt="Logo preview"
                className="max-h-48 max-w-full object-contain"
              />
            </div>

            {/* Suggested Color - NEW */}
            {suggestedColor && onApplySuggestedColor && (
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-purple-300 dark:border-purple-600 shadow-sm"
                      style={{ backgroundColor: suggestedColor }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                        Suggested Color
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 font-mono">
                        {suggestedColor}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onApplySuggestedColor(suggestedColor)
                      setSuggestedColor(null) // Clear after applying
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                  💡 Extracted from your logo's dominant color
                </p>
              </div>
            )}

            {/* Platform Versions */}
            {(googleLogoUrl || appleLogoUrl) && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {googleLogoUrl && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Google Wallet
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 flex items-center justify-center h-24">
                      <img
                        src={googleLogoUrl}
                        alt="Google logo"
                        className="max-h-full max-w-full object-contain rounded-full border-2 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center">
                      Circular (660x660px)
                    </p>
                  </div>
                )}

                {appleLogoUrl && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-4 rounded-full bg-black dark:bg-white"></div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Apple Wallet
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 flex items-center justify-center h-24">
                      <img
                        src={appleLogoUrl}
                        alt="Apple logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center">
                      Rectangular (320x100px)
                    </p>
                  </div>
                )}
              </div>
            )}

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
                  Upload Your Logo
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Drag and drop an image, or click to browse
                </p>
                <button
                  type="button"
                  onClick={handleButtonClick}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  PNG or JPG, max 5MB
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
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</span>
          <div className="flex-1 text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <p className="font-semibold">Logo Processing</p>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              <li>Google Wallet: Cropped to circle (660x660px minimum)</li>
              <li>Apple Wallet: Rectangular format (320x100px @ 2x)</li>
              <li>Best results: Use square logos with centered content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogoUploader
