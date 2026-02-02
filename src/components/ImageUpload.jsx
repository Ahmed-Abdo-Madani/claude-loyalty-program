import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudArrowUpIcon, LinkIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import imageCompression from 'browser-image-compression'

function ImageUpload({
    imageUrl,
    onUpload,
    onRemove,
    onUrlChange,
    uploading = false,
    maxSizeMB = 10,
    acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    mode = 'upload', // 'upload' | 'url'
    onModeChange,
    enableCompression = true,
    maxWidthOrHeight = 1920,
    compressionQuality = 0.8
}) {
    const { t } = useTranslation('dashboard')
    const [dragActive, setDragActive] = useState(false)
    const [error, setError] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [preview, setPreview] = useState(null)
    const [urlInput, setUrlInput] = useState('')
    const fileInputRef = useRef(null)

    // Initialize URL input from props
    useEffect(() => {
        if (mode === 'url' && imageUrl) {
            setUrlInput(imageUrl)
        }
    }, [mode, imageUrl])

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
        if (!acceptedTypes.includes(file.type)) {
            setError(t('imageUpload.invalidType'))
            return
        }

        // Validate file size (check original size first)
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(t('imageUpload.fileTooLarge'))
            return
        }

        setError(null)
        setUploadProgress(0)

        // Create local preview
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(file)

        // Compression logic
        if (enableCompression) {
            try {
                // setUploadProgress(10) // Initial progress for compression start
                const options = {
                    maxSizeMB: maxSizeMB * 0.8, // Target 80% of max size
                    maxWidthOrHeight: maxWidthOrHeight,
                    useWebWorker: true,
                    initialQuality: compressionQuality,
                    onProgress: (progress) => {
                        // Map compression progress to 0-50%
                        setUploadProgress(Math.round(progress * 0.5))
                    }
                }

                // console.log(`Original size: ${file.size / 1024 / 1024} MB`)
                const compressedFile = await imageCompression(file, options)
                // console.log(`Compressed size: ${compressedFile.size / 1024 / 1024} MB`)

                file = compressedFile
            } catch (compressionError) {
                console.warn('Compression failed, using original:', compressionError)
                // Continue with original file if compression fails
            }
        }

        try {
            if (onUpload) {
                await onUpload(file, (progress) => {
                    // Map upload progress to 50-100% (if compressed) or 0-100% (if not)
                    // But typically axios onUploadProgress returns 0-100.
                    // If we compressed, we are at 50%. So we want 50 + p * 0.5
                    if (enableCompression) {
                        setUploadProgress(50 + Math.round(progress * 0.5))
                    } else {
                        setUploadProgress(progress)
                    }
                })
            }
        } catch (err) {
            setError(err.message || t('imageUpload.uploadFailed'))
            setPreview(null)
        }
    }

    const handleUrlInputChange = (e) => {
        const url = e.target.value
        setUrlInput(url)
        setError(null)

        if (url && isValidUrl(url)) {
            if (onUrlChange) onUrlChange(url)
        } else if (url && !isValidUrl(url)) {
            // Optional: instant validation feedback
        }
    }

    const isValidUrl = (string) => {
        try {
            new URL(string)
            return true
        } catch (_) {
            return false
        }
    }

    const handleModeSwitch = (newMode) => {
        if (onModeChange) {
            onModeChange(newMode)
        }
        setError(null)
    }

    const renderUploadMode = () => (
        <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${dragActive
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {uploading ? (
                <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t('imageUpload.uploading')}</p>
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
                <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <CloudArrowUpIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('imageUpload.dragDrop')}{' '}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-primary hover:text-primary-700 font-semibold focus:outline-none"
                            >
                                {t('imageUpload.browseFiles')}
                            </button>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('imageUpload.fileTypes')}
                        </p>
                    </div>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes.join(',')}
                onChange={handleFileInput}
                className="hidden"
            />
        </div>
    )

    const renderUrlMode = () => (
        <div className="space-y-3">
            <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <LinkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                    type="url"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white sm:text-sm py-2.5"
                    placeholder={t('imageUpload.urlPlaceholder')}
                    value={urlInput}
                    onChange={handleUrlInputChange}
                />
            </div>
            {urlInput && !isValidUrl(urlInput) && (
                <p className="text-sm text-red-600 dark:text-red-400">{t('imageUpload.urlInvalid')}</p>
            )}
        </div>
    )

    const renderPreview = () => {
        const displayUrl = preview || imageUrl || (mode === 'url' && isValidUrl(urlInput) ? urlInput : null)

        if (!displayUrl) return null

        return (
            <div className="mt-4 relative rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
                <div className="aspect-w-16 aspect-h-9 w-full overflow-hidden rounded-md bg-white dark:bg-gray-900">
                    <img
                        src={displayUrl}
                        alt="Preview"
                        className="h-48 w-full object-contain"
                        onError={(e) => {
                            e.target.onerror = null
                            e.target.src = '' // Fallback or clear
                        }}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setPreview(null)
                        setUrlInput('')
                        if (onRemove) onRemove()
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 focus:outline-none shadow-sm"
                    title={t('imageUpload.remove')}
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('imageUpload.title')}
                </label>

                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => handleModeSwitch('upload')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'upload'
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <CloudArrowUpIcon className="w-3.5 h-3.5 mr-1.5" />
                        {t('imageUpload.uploadMode')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeSwitch('url')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'url'
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                        {t('imageUpload.urlMode')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Only show upload/input area if we are in edit mode or no image yet. 
          Actually, we usually want to show the preview AND the input to replace it? 
          For upload mode: if dragActive or !imageUrl? 
          Let's stick to showing the input area always, but maybe smaller if there is a preview?
          Existing LogoUpload replaces the content. 
          Here we want to be able to replace. 
      */}

            {/* Input Area (Upload or URL) */}
            <div className="mt-2">
                {mode === 'upload'
                    ? (!imageUrl && !preview && !uploading ? renderUploadMode() : null)
                    : renderUrlMode()
                }
            </div>

            {/* Preview Section - Shows existing image or new preview */}
            {renderPreview()}
        </div>
    )
}

export default ImageUpload
