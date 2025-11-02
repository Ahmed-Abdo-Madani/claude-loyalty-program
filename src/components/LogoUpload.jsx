import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

function LogoUpload({ onLogoUpdate }) {
  const { t } = useTranslation('dashboard')
  const [logoInfo, setLogoInfo] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // Load existing logo info on component mount
  useEffect(() => {
    loadLogoInfo()
  }, [])

  const loadLogoInfo = async () => {
    try {
      const sessionToken = localStorage.getItem('businessSessionToken')
      const businessId = localStorage.getItem('businessId')

      if (!sessionToken || !businessId) {
        return
      }

      const response = await fetch('/api/business/my/logo-info', {
        headers: {
          'x-session-token': sessionToken,
          'x-business-id': businessId
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data.has_logo) {
          setLogoInfo(result.data)
        }
      }
    } catch (error) {
      console.warn('Failed to load logo info:', error)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
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

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError(t('logoUpload.invalidFileType'))
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('logoUpload.fileTooLarge'))
      return
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const sessionToken = localStorage.getItem('businessSessionToken')
      const businessId = localStorage.getItem('businessId')

      if (!sessionToken || !businessId) {
        throw new Error(t('logoUpload.authRequired'))
      }

      const formData = new FormData()
      formData.append('logo', file)

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(progress)
        }
      })

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
        })

        xhr.open('POST', '/api/business/my/logo')
        xhr.setRequestHeader('x-session-token', sessionToken)
        xhr.setRequestHeader('x-business-id', businessId)
        xhr.send(formData)
      })

      const result = await uploadPromise

      if (result.success) {
        setLogoInfo({
          has_logo: true,
          logo_url: result.data.logo_url,
          logo_filename: result.data.logo_filename,
          logo_file_size: result.data.logo_file_size,
          logo_uploaded_at: result.data.logo_uploaded_at
        })

        // Notify parent component
        if (onLogoUpdate) {
          onLogoUpdate(result.data)
        }

        setUploadProgress(100)
        setTimeout(() => {
          setUploadProgress(0)
        }, 1000)
      } else {
        throw new Error(result.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Logo upload error:', error)
      setError(error.message || t('logoUpload.uploadFailed'))
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!logoInfo || !window.confirm(t('logoUpload.confirmDelete'))) {
      return
    }

    try {
      const sessionToken = localStorage.getItem('businessSessionToken')
      const businessId = localStorage.getItem('businessId')

      if (!sessionToken || !businessId) {
        throw new Error(t('logoUpload.authRequired'))
      }

      const response = await fetch('/api/business/my/logo', {
        method: 'DELETE',
        headers: {
          'x-session-token': sessionToken,
          'x-business-id': businessId
        }
      })

      const result = await response.json()

      if (result.success) {
        setLogoInfo(null)
        // Notify parent component
        if (onLogoUpdate) {
          onLogoUpdate(null)
        }
      } else {
        throw new Error(result.message || 'Failed to delete logo')
      }
    } catch (error) {
      console.error('Logo delete error:', error)
      setError(error.message || t('logoUpload.deleteFailed'))
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('logoUpload.title')}
        </h3>
        {logoInfo && (
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors duration-200"
            title={t('logoUpload.delete')}
          >
            {t('logoUpload.delete')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {logoInfo ? (
        <div className="space-y-4">
          {/* Current Logo Display */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex-shrink-0">
              <img
                src={`/api/business${logoInfo.logo_url}`}
                alt="Business Logo"
                className="w-16 h-16 object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-white"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {logoInfo.logo_filename}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(logoInfo.logo_file_size)} • Uploaded {new Date(logoInfo.logo_uploaded_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {t('logoUpload.active')}
              </span>
            </div>
          </div>

          {/* Replace Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full px-4 py-2 bg-primary hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
          >
            {isUploading ? t('logoUpload.uploading') : t('logoUpload.replaceLogo')}
          </button>
        </div>
      ) : (
        <div>
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
              dragActive
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('logoUpload.uploadingLogo')}</p>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('logoUpload.dropHere')}{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:text-blue-700 font-semibold"
                    >
                      {t('logoUpload.browseFiles')}
                    </button>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('logoUpload.fileTypes')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}

export default LogoUpload