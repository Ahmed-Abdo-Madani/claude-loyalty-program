import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../../config/api'

const MessageTemplateManager = () => {
    const { t } = useTranslation('admin')
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        category: 'general',
        subject_template: '',
        body_template: ''
    })
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchTemplates()
    }, [])

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const response = await secureApi.get(endpoints.adminMessagesTemplates)
            if (response.ok) {
                const data = await response.json()
                setTemplates(data.data.templates || [])
            }
        } catch (err) {
            console.error('Error fetching templates:', err)
            setError(t('messaging.errorLoadingTemplates'))
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setSelectedTemplate(null)
        setFormData({
            name: '',
            category: 'general',
            subject_template: '',
            body_template: ''
        })
        setShowModal(true)
    }

    const handleEdit = (template) => {
        setSelectedTemplate(template)
        setFormData({
            name: template.name,
            category: template.category,
            subject_template: template.subject_template,
            body_template: template.body_template
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm(t('messaging.confirmDeleteTemplate'))) return

        try {
            const response = await secureApi.delete(`${endpoints.adminMessagesTemplates}/${id}`)
            if (response.ok) {
                setTemplates(templates.filter(t => t.id !== id))
                alert(t('messaging.templateDeleted'))
            } else {
                alert(t('messaging.deleteFailed'))
            }
        } catch (err) {
            console.error('Error deleting template:', err)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            let response
            if (selectedTemplate) {
                response = await secureApi.put(`${endpoints.adminMessagesTemplates}/${selectedTemplate.id}`, formData)
            } else {
                response = await secureApi.post(endpoints.adminMessagesTemplates, formData)
            }

            if (response.ok) {
                await fetchTemplates()
                setShowModal(false)
                alert(t('messaging.templateSaved'))
            } else {
                alert(t('messaging.saveFailed'))
            }
        } catch (err) {
            console.error('Error saving template:', err)
            alert(t('messaging.saveFailed'))
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">{t('messaging.templates')}</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                >
                    {t('messaging.createTemplate')}
                </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-4">📝</div>
                        <p>{t('messaging.noTemplates')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(template => (
                            <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                        {template.category}
                                    </span>
                                </div>
                                <div className="mb-3">
                                    <p className="text-sm font-medium text-gray-700 truncate">{template.subject_template}</p>
                                    <p className="text-sm text-gray-500 line-clamp-2">{template.body_template}</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                        title={t('messaging.editTemplate')}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        title={t('messaging.deleteTemplate')}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold">
                                {selectedTemplate ? t('messaging.editTemplate') : t('messaging.createTemplate')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('messaging.templateName')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder={t('messaging.templateNamePlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('messaging.templateCategory')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('messaging.templateSubject')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.subject_template}
                                    onChange={e => setFormData({ ...formData, subject_template: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('messaging.templateBody')}
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.body_template}
                                    onChange={e => setFormData({ ...formData, body_template: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('messaging.templateVariables')}: {'{{businessName}}'}, {'{{adminName}}'}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    {t('messaging.cancel') || 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                >
                                    {t('messaging.saveTemplate')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MessageTemplateManager
