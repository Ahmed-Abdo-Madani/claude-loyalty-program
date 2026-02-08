import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../../config/api'
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

const MessageComposer = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation('dashboard')
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        subject: '',
        body: '',
        type: 'inquiry' // default type
    })
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validation
        if (!formData.subject.trim()) {
            setError(t('messaging.subjectRequired'))
            return
        }
        if (!formData.body.trim()) {
            setError(t('messaging.messageRequired'))
            return
        }

        try {
            setLoading(true)
            const response = await secureApi.post(endpoints.businessMessagesSend, formData)

            if (response.ok) {
                // Reset form
                setFormData({
                    subject: '',
                    body: '',
                    type: 'inquiry'
                })
                onSuccess()
                onClose()
            } else {
                const data = await response.json()
                setError(data.message || t('messaging.sendFailed'))
            }
        } catch (err) {
            console.error('Error sending message:', err)
            setError(t('messaging.sendFailed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {t('messaging.compose')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('messaging.subject')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder={t('messaging.subjectPlaceholder')}
                            maxLength={200}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('messaging.messageType')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['inquiry', 'question', 'feedback'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type })}
                                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${formData.type === type
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {t(`messaging.${type}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Body */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('messaging.messageBody')} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            placeholder={t('messaging.messageBodyPlaceholder')}
                            maxLength={2000}
                            rows={6}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                        />
                        <div className="flex justify-end mt-1">
                            <span className="text-xs text-gray-400">
                                {formData.body.length}/2000
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t('messaging.close')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('messaging.sending')}
                                </>
                            ) : (
                                <>
                                    <PaperAirplaneIcon className="w-4 h-4 -rotate-45 mb-1" />
                                    {t('messaging.send')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default MessageComposer
