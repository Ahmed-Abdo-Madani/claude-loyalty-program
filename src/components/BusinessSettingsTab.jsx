import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getSecureAuthHeaders } from '../utils/secureAuth'
import {
    Square2StackIcon,
    ListBulletIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
    ShoppingBagIcon
} from '@heroicons/react/24/outline'
import { FaFacebookF, FaInstagram, FaXTwitter, FaSnapchat } from 'react-icons/fa6'
import { endpoints, secureApi } from '../config/api'

function BusinessSettingsTab({ onNavigateToProducts }) {
    const { t } = useTranslation(['dashboard', 'common', 'menu'])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [business, setBusiness] = useState(null)
    const [displayMode, setDisplayMode] = useState('grid')
    const [notification, setNotification] = useState(null)
    const [pdfUploading, setPdfUploading] = useState(false)
    const [pdfUrl, setPdfUrl] = useState(null)
    const [menuPhone, setMenuPhone] = useState('')
    const [socialMedia, setSocialMedia] = useState({
        facebook: '',
        instagram: '',
        twitter: '',
        snapchat: ''
    })



    useEffect(() => {
        fetchBusinessData()
    }, [])

    const fetchBusinessData = async () => {
        try {
            setLoading(true)
            const response = await secureApi.get(endpoints.businessProfile)
            const result = await response.json()
            if (result.success) {
                setBusiness(result.data)
                setDisplayMode(result.data.menu_display_mode || 'grid')
                setPdfUrl(result.data.menu_pdf_url || null)
                // Initialize menu phone with fallback to main phone if not set yet
                setMenuPhone(result.data.menu_phone !== null && result.data.menu_phone !== undefined ? result.data.menu_phone : result.data.phone || '')
                setSocialMedia({
                    facebook: result.data.facebook_url || '',
                    instagram: result.data.instagram_url || '',
                    twitter: result.data.twitter_url || '',
                    snapchat: result.data.snapchat_url || ''
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
            showNotification('error', t('settings.errorLoading') || 'Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const handlePdfUpload = async (file) => {
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showNotification('error', t('settings.pdfUpload.tooLarge') || 'File size too large. Maximum is 10MB.')
            return
        }

        try {
            setPdfUploading(true)
            const formData = new FormData()
            formData.append('menu', file)

            const headers = getSecureAuthHeaders()
            // Remove Content-Type to let browser set it with boundary for FormData
            delete headers['Content-Type']

            if (!headers['x-session-token'] || !headers['x-business-id']) {
                throw new Error(t('errors.authRequired') || 'Authentication required')
            }

            const response = await fetch(endpoints.businessMenuPdfUpload, {
                method: 'POST',
                headers,
                body: formData
            })

            const result = await response.json()

            if (result.success) {
                setPdfUrl(result.data.menu_pdf_url)
                setBusiness(prev => ({
                    ...prev,
                    menu_pdf_filename: result.data.menu_pdf_filename,
                    menu_pdf_uploaded_at: result.data.menu_pdf_uploaded_at,
                    menu_pdf_url: result.data.menu_pdf_url
                }))
                showNotification('success', t('settings.pdfUpload.success') || 'PDF menu uploaded successfully!')
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.error('Error uploading PDF:', error)
            showNotification('error', error.message || t('settings.pdfUpload.error') || 'Failed to upload PDF')
        } finally {
            setPdfUploading(false)
        }
    }

    const handlePdfDelete = async () => {
        if (!confirm(t('settings.pdfUpload.confirmDelete') || 'Are you sure you want to delete this PDF menu?')) return

        try {
            const response = await secureApi.delete(endpoints.businessMenuPdfDelete)
            const result = await response.json()

            if (result.success) {
                setPdfUrl(null)
                setBusiness(prev => ({
                    ...prev,
                    menu_pdf_filename: null,
                    menu_pdf_uploaded_at: null,
                    menu_pdf_url: null
                }))
                showNotification('success', t('settings.pdfUpload.deleteSuccess') || 'PDF menu deleted successfully')
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.error('Error deleting PDF:', error)
            showNotification('error', error.message || t('settings.pdfUpload.deleteError') || 'Failed to delete PDF')
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const response = await secureApi.put(endpoints.businessUpdateProfile, {
                menu_display_mode: displayMode,
                menu_phone: menuPhone,
                facebook_url: socialMedia.facebook,
                instagram_url: socialMedia.instagram,
                twitter_url: socialMedia.twitter,
                snapchat_url: socialMedia.snapchat
            })
            const result = await response.json()
            if (result.success) {
                setBusiness(prev => ({
                    ...prev,
                    menu_display_mode: displayMode,
                    menu_phone: menuPhone,
                    facebook_url: socialMedia.facebook,
                    instagram_url: socialMedia.instagram,
                    twitter_url: socialMedia.twitter,
                    snapchat_url: socialMedia.snapchat
                }))
                showNotification('success', t('settings.updateSuccess') || 'Settings updated successfully!')
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            showNotification('error', t('settings.updateError') || 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const showNotification = (type, message) => {
        setNotification({ type, message })
        setTimeout(() => setNotification(null), 3000)
    }

    const modes = [
        {
            id: 'grid',
            title: t('viewMode.grid', { ns: 'menu' }),
            description: t('settings.menuDisplay.gridDesc') || 'Modern grid layout with product images',
            icon: Square2StackIcon
        },
        {
            id: 'list',
            title: t('viewMode.list', { ns: 'menu' }),
            description: t('settings.menuDisplay.listDesc') || 'Elegant typography-focused vertical list',
            icon: ListBulletIcon
        },
        {
            id: 'pdf',
            title: t('viewMode.pdf', { ns: 'menu' }),
            description: t('settings.menuDisplay.pdfDesc') || 'Classic professional PDF menu document',
            icon: DocumentTextIcon
        }
    ]

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <ArrowPathIcon className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">{t('loading') || 'Loading settings...'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Settings Header */}
            <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span
                        className="hover:text-primary cursor-pointer transition-colors"
                        onClick={() => onNavigateToProducts && onNavigateToProducts()}
                    >
                        {t('products.title') || 'Products'}
                    </span>
                    <ChevronRightIcon className="w-3 h-3" />
                    <span className="font-medium text-gray-900 dark:text-white">
                        {t('settings.menuDisplay.title')}
                    </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {t('settings.menuDisplay.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.menuDisplay.description')}
                </p>
            </div>

            {/* Mode Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {modes.map((mode) => {
                    const Icon = mode.icon
                    const isActive = displayMode === mode.id

                    return (
                        <button
                            key={mode.id}
                            onClick={() => setDisplayMode(mode.id)}
                            className={`relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all duration-300 ${isActive
                                ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                                : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600'
                                }`}
                        >
                            <div className={`p-3 rounded-xl mb-4 ${isActive ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                <Icon className="w-6 h-6" />
                            </div>

                            <h3 className={`font-bold mb-1 ${isActive ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                                {mode.title}
                            </h3>

                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {mode.description}
                            </p>

                            {isActive && (
                                <div className="absolute top-4 right-4 text-primary">
                                    <CheckCircleIcon className="w-6 h-6 fill-primary text-white" />
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* PDF Upload Section - Only visible in PDF mode */}
            {displayMode === 'pdf' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-primary" />
                                {t('settings.pdfUpload.title') || 'PDF Menu Upload'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('settings.pdfUpload.description') || 'Upload your professional menu as a PDF document (max 10MB)'}
                            </p>
                        </div>
                    </div>

                    {!pdfUrl ? (
                        <div className="mt-2">
                            <label className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${pdfUploading ? 'border-primary bg-primary/5 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {pdfUploading ? (
                                        <>
                                            <ArrowPathIcon className="w-10 h-10 text-primary animate-spin mb-3" />
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 font-semibold">{t('settings.uploading') || 'Uploading PDF...'}</p>
                                        </>
                                    ) : (
                                        <>
                                            <DocumentTextIcon className="w-10 h-10 text-gray-400 mb-3" />
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="font-semibold">{t('settings.clickToUpload') || 'Click to upload'}</span> {t('settings.dragAndDrop') || 'or drag and drop'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">PDF (MAX. 10MB)</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="application/pdf"
                                    disabled={pdfUploading}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handlePdfUpload(e.target.files[0])
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center">
                                    <span className="font-bold text-xs">PDF</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                                        {business?.menu_pdf_filename || 'Menu.pdf'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('settings.uploadedOn') || 'Uploaded on'} {new Date(business?.menu_pdf_uploaded_at || Date.now()).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-500 hover:text-primary hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                    title={t('view') || 'View'}
                                >
                                    <Square2StackIcon className="w-5 h-5" />
                                </a>
                                <button
                                    onClick={handlePdfDelete}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                    title={t('delete') || 'Delete'}
                                >
                                    <ExclamationCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Business Contact Section - Phone Number */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">📞</span>
                        {t('settings.contact.title') || 'Contact Information'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.contact.description') || 'Set your business phone number to allow customers to call you directly from the menu.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('settings.contact.phone') || 'Business Phone Number'}
                        </label>
                        <div className="relative" dir="ltr">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '1rem' }}>
                                <span className="text-gray-400 font-bold">📱</span>
                            </div>
                            <input
                                type="tel"
                                value={menuPhone}
                                onChange={(e) => setMenuPhone(e.target.value)}
                                placeholder="+966 50 123 4567"
                                style={{ paddingLeft: '2.5rem' }}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Social Media Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">🔗</span>
                        {t('settings.socialMedia.title')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.socialMedia.description')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Facebook */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('settings.socialMedia.facebook')}
                        </label>
                        <div className="relative" dir="ltr">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '1rem' }}>
                                <FaFacebookF className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="url"
                                value={socialMedia.facebook}
                                onChange={(e) => setSocialMedia(prev => ({ ...prev, facebook: e.target.value }))}
                                placeholder={t('settings.socialMedia.placeholder.facebook')}
                                style={{ paddingLeft: '2.5rem' }}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                            />
                        </div>
                    </div>

                    {/* Instagram */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('settings.socialMedia.instagram')}
                        </label>
                        <div className="relative" dir="ltr">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '1rem' }}>
                                <FaInstagram className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="url"
                                value={socialMedia.instagram}
                                onChange={(e) => setSocialMedia(prev => ({ ...prev, instagram: e.target.value }))}
                                placeholder={t('settings.socialMedia.placeholder.instagram')}
                                style={{ paddingLeft: '2.5rem' }}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                            />
                        </div>
                    </div>

                    {/* Twitter/X */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('settings.socialMedia.twitter')}
                        </label>
                        <div className="relative" dir="ltr">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '1rem' }}>
                                <FaXTwitter className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="url"
                                value={socialMedia.twitter}
                                onChange={(e) => setSocialMedia(prev => ({ ...prev, twitter: e.target.value }))}
                                placeholder={t('settings.socialMedia.placeholder.twitter')}
                                style={{ paddingLeft: '2.5rem' }}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                            />
                        </div>
                    </div>

                    {/* Snapchat */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('settings.socialMedia.snapchat')}
                        </label>
                        <div className="relative" dir="ltr">
                            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '1rem' }}>
                                <FaSnapchat className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="url"
                                value={socialMedia.snapchat}
                                onChange={(e) => setSocialMedia(prev => ({ ...prev, snapchat: e.target.value }))}
                                placeholder={t('settings.socialMedia.placeholder.snapchat')}
                                style={{ paddingLeft: '2.5rem' }}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                            />
                        </div>
                    </div>
                </div>
                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                    {t('settings.socialMedia.optional')}
                </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <div className="flex-1">
                    {notification && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium animate-in fade-in zoom-in duration-300 ${notification.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                            {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationCircleIcon className="w-5 h-5" />}
                            {notification.message}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || (displayMode === business?.menu_display_mode &&
                        menuPhone === (business?.menu_phone !== null && business?.menu_phone !== undefined ? business.menu_phone : business?.phone || '') &&
                        socialMedia.facebook === (business?.facebook_url || '') &&
                        socialMedia.instagram === (business?.instagram_url || '') &&
                        socialMedia.twitter === (business?.twitter_url || '') &&
                        socialMedia.snapchat === (business?.snapchat_url || '')
                    )}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${saving || (displayMode === business?.menu_display_mode &&
                        menuPhone === (business?.menu_phone !== null && business?.menu_phone !== undefined ? business.menu_phone : business?.phone || '') &&
                        socialMedia.facebook === (business?.facebook_url || '') &&
                        socialMedia.instagram === (business?.instagram_url || '') &&
                        socialMedia.twitter === (business?.twitter_url || '') &&
                        socialMedia.snapchat === (business?.snapchat_url || '')
                    )
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20 transform hover:scale-[1.02]'
                        }`}
                >
                    {saving && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
                    {saving ? t('settings.saving') || 'Saving...' : t('settings.saveSettings') || 'Save Changes'}
                </button>
            </div>

            {/* Back to Products Link */}
            <div className="flex justify-center pt-4">
                <button
                    onClick={() => onNavigateToProducts && onNavigateToProducts()}
                    className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-medium"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    {t('products.manageProducts') || 'Manage your products and categories'}
                </button>
            </div>
        </div>
    )
}

export default BusinessSettingsTab
