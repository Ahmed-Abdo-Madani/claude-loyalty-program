import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../config/api'

const MessageComposer = ({ isOpen, onClose, onSuccess, businesses, selectedBusinessId }) => {
    const { t } = useTranslation('admin')
    const [formData, setFormData] = useState({
        business_id: selectedBusinessId || '',
        subject: '',
        message_body: '',
        message_type: 'inquiry',
        template_id: ''
    })
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingTemplates, setLoadingTemplates] = useState(false)
    const [errors, setErrors] = useState({})

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                business_id: selectedBusinessId || '',
                subject: '',
                message_body: '',
                message_type: 'inquiry',
                template_id: ''
            })
            setErrors({})
            fetchTemplates()
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

    const fetchTemplates = async () => {
        try {
            setLoadingTemplates(true)
            const response = await fetch(endpoints.adminMessagesTemplates, {
                headers: getAuthHeaders()
            })
            if (response.ok) {
                const data = await response.json()
                setTemplates(data.data.templates || [])
            }
        } catch (error) {
            console.error('Error fetching templates:', error)
        } finally {
            setLoadingTemplates(false)
        }
    }

    const handleTemplateChange = (e) => {
        const templateId = e.target.value
        if (!templateId) {
            setFormData(prev => ({ ...prev, template_id: '' }))
            return
        }

        const template = templates.find(t => t.id === templateId)
        if (template) {
            setFormData(prev => ({
                ...prev,
                template_id: templateId,
                subject: template.subject_template || prev.subject,
                message_body: template.body_template || prev.message_body
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}
        if (!formData.business_id) newErrors.business_id = t('messaging.businessRequired')
        if (!formData.subject.trim()) newErrors.subject = t('messaging.subjectRequired')
        if (!formData.message_body.trim()) newErrors.message_body = t('messaging.messageRequired')

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
                onClose()
            } else {
                const errorData = await response.json()
                setErrors({ submit: errorData.message || t('messaging.sendFailed') })
            }
        } catch (error) {
            console.error('Error sending message:', error)
            setErrors({ submit: t('messaging.sendFailed') })
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">{t('messaging.compose')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="text-2xl">&times;</span>
                    </button>
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
                            {t('messaging.selectBusiness')}
                        </label>
                        <select
                            value={formData.business_id}
                            onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                            disabled={!!selectedBusinessId}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                        >
                            <option value="">{t('messaging.selectBusinessPlaceholder')}</option>
                            {businesses.map(business => (
                                <option key={business.public_id || business.id} value={business.public_id || business.id}>
                                    {business.business_name}
                                </option>
                            ))}
                        </select>
                        {errors.business_id && <p className="text-red-500 text-xs mt-1">{errors.business_id}</p>}
                    </div>

                    {/* Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('messaging.messageType')}
                        </label>
                        <select
                            value={formData.message_type}
                            onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="inquiry">{t('messaging.inquiry')}</option>
                            <option value="response">{t('messaging.response')}</option>
                            <option value="notification">{t('messaging.notification')}</option>
                        </select>
                    </div>

                    {/* Template Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('messaging.selectTemplate')}
                        </label>
                        <select
                            value={formData.template_id}
                            onChange={handleTemplateChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">{t('messaging.selectTemplatePlaceholder')}</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('messaging.subject')}
                        </label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder={t('messaging.subjectPlaceholder')}
                            maxLength={200}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                    </div>

                    {/* Message Body */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('messaging.messageBody')}
                        </label>
                        <textarea
                            value={formData.message_body}
                            onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                            placeholder={t('messaging.messageBodyPlaceholder')}
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
                    <div className="flex justify-end pt-4 border-t border-gray-200 gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            {t('messaging.close')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                        >
                            {loading && <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>}
                            {loading ? t('messaging.sending') : t('messaging.send')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default MessageComposer
