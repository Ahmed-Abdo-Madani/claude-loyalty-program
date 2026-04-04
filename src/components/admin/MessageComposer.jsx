import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../config/api'

const MessageComposer = ({ isOpen, onClose, onSuccess, businesses, selectedBusinessId }) => {
    const { t } = useTranslation('admin')
    const [formData, setFormData] = useState({
        business_id: selectedBusinessId || '',
        from_email: 'noreply@madna.me',
        subject: '',
        message_body: ''
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (isOpen) {
            setFormData({
                business_id: selectedBusinessId || '',
                from_email: 'noreply@madna.me',
                subject: '',
                message_body: ''
            })
            setErrors({})
        }
    }, [isOpen, selectedBusinessId])

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminAccessToken')
        const sessionToken = localStorage.getItem('adminSessionToken')
        return {
            'Authorization': `Bearer ${token}`,
            'X-Session-Token': sessionToken,
            'Content-Type': 'application/json'
        }
    }

    const validateForm = () => {
        const newErrors = {}
        if (!formData.business_id) newErrors.business_id = t('messaging.businessRequired', 'Business is required')
        if (!formData.subject.trim()) newErrors.subject = t('messaging.subjectRequired', 'Subject is required')
        if (!formData.message_body.trim()) newErrors.message_body = t('messaging.messageRequired', 'Message is required')

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) return

        try {
            setLoading(true)
            const response = await fetch(endpoints.adminMessagesSend, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                onSuccess()
                if(onClose) onClose()
            } else {
                const errorData = await response.json()
                setErrors({ submit: errorData.message || t('messaging.sendFailed', 'Failed to send message') })
            }
        } catch (error) {
            console.error('Error sending message:', error)
            setErrors({ submit: t('messaging.sendFailed', 'Failed to send message') })
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="bg-white rounded-lg w-full max-w-2xl border border-gray-200">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t('messaging.compose', 'Compose Message')}</h2>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="text-2xl">&times;</span>
                    </button>
                )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {errors.submit}
                    </div>
                )}

                {/* Business Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('messaging.selectBusiness', 'To')}
                    </label>
                    <select
                        value={formData.business_id}
                        onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                        disabled={!!selectedBusinessId}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    >
                        <option value="">{t('messaging.selectBusinessPlaceholder', 'Select Business')}</option>
                        {businesses.map(business => (
                            <option key={business.public_id || business.id} value={business.public_id || business.id}>
                                {business.business_name}
                            </option>
                        ))}
                    </select>
                    {errors.business_id && <p className="text-red-500 text-xs mt-1">{errors.business_id}</p>}
                </div>

                {/* Sender */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        From
                    </label>
                    <select
                        value={formData.from_email}
                        onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="noreply@madna.me">No-Reply (noreply@madna.me)</option>
                        <option value="support@updates.madna.me">Support (support@updates.madna.me)</option>
                    </select>
                </div>

                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('messaging.subject', 'Subject')}
                    </label>
                    <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder={t('messaging.subjectPlaceholder', 'Subject')}
                        maxLength={200}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                </div>

                {/* Message Body */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('messaging.messageBody', 'Message')}
                    </label>
                    <textarea
                        value={formData.message_body}
                        onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                        placeholder={t('messaging.messageBodyPlaceholder', 'Message')}
                        rows={6}
                        maxLength={2000}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex justify-between mt-1">
                        {errors.message_body && <p className="text-red-500 text-xs">{errors.message_body}</p>}
                        <span className="text-xs text-gray-400 ml-auto">
                            {formData.message_body.length}/2000
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4 gap-3">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            {t('messaging.close', 'Close')}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                    >
                        {loading && <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>}
                        {loading ? t('messaging.sending', 'Sending...') : t('messaging.send', 'Send')}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default MessageComposer
