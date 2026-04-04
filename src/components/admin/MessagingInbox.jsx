import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { endpoints } from '../../config/api'
import { adminApi } from '../../utils/adminAuth'

import MessageComposer from './MessageComposer'

const MessagingInbox = () => {
    const { t, i18n } = useTranslation('admin')
    const [businesses, setBusinesses] = useState([])
    const [loading, setLoading] = useState(true)
    const [errors, setErrors] = useState({})
    
    // New state
    const [activeTab, setActiveTab] = useState('compose')
    const [sentEmails, setSentEmails] = useState([])
    const [loadingSent, setLoadingSent] = useState(false)

    useEffect(() => {
        fetchBusinesses()
        fetchSentEmails()
    }, [])

    const fetchBusinesses = async () => {
        try {
            const response = await adminApi.get(`${endpoints.baseURL}/api/admin/businesses?limit=100`)
            if (response.ok) {
                const data = await response.json()
                setBusinesses(data.data.businesses || [])
            }
        } catch (error) {
            console.error('Error fetching businesses:', error)
        }
    }

    const fetchSentEmails = async () => {
        try {
            setLoadingSent(true)
            const response = await adminApi.get(endpoints.adminMessagesResendLogs)
            if (response.ok) {
                const data = await response.json()
                setSentEmails(data.data.emails || [])
            } else {
                setErrors({ ...errors, sent: 'Failed to fetch sent emails' })
            }
        } catch (error) {
            console.error('Error fetching sent emails:', error)
            setErrors({ ...errors, sent: 'Error fetching sent emails' })
        } finally {
            setLoadingSent(false)
        }
    }

    const handleMessageSuccess = () => {
        fetchSentEmails()
        setActiveTab('sent')
    }

    const getRecipient = (to) => {
        if (!to) return 'Unknown recipient'
        if (Array.isArray(to)) return to.length > 0 ? to[0] : 'Unknown recipient'
        return String(to)
    }

    const formatDate = (dateString, lang) => {
        if (!dateString) return 'Unknown time'
        const d = new Date(dateString)
        if (isNaN(d.getTime())) return 'Invalid time'
        try {
            return formatDistanceToNow(d, { addSuffix: true, locale: lang === 'ar' ? arSA : undefined })
        } catch {
            return 'Unknown time'
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-200px)] flex flex-col">
            {/* Header Tabs */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    📨 {t('messaging.adminMessaging', 'Admin Messaging')}
                </h2>
                <div className="flex bg-white border border-gray-300 rounded-md overflow-hidden">
                    <button 
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'compose' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('compose')}
                    >
                        {t('messaging.compose', 'Compose')}
                    </button>
                    <button 
                        className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${activeTab === 'sent' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('sent')}
                    >
                        {t('messaging.sent', `Sent (${sentEmails.length})`)}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1 bg-white">
                {activeTab === 'compose' && (
                    <div className="flex justify-center">
                        <MessageComposer 
                            isOpen={true} 
                            onClose={null} 
                            onSuccess={handleMessageSuccess} 
                            businesses={businesses} 
                            selectedBusinessId="" 
                        />
                    </div>
                )}

                {activeTab === 'sent' && (
                    <div className="max-w-4xl mx-auto">
                        {loadingSent ? (
                            <div className="p-8 text-center text-gray-500">{t('messaging.loadingSent', 'Loading sent emails...')}</div>
                        ) : sentEmails.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">{t('messaging.noSent', 'No sent emails found.')}</div>
                        ) : (
                            <div className="border border-gray-200 rounded-md overflow-hidden">
                                <ul className="divide-y divide-gray-200 text-sm">
                                    {sentEmails.map(email => (
                                        <li key={email.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50">
                                            <div className="flex items-center gap-3 w-full sm:w-1/3 mb-2 sm:mb-0 truncate pr-4">
                                                <span className="text-xl">📧</span>
                                                <span className="font-medium text-gray-900 truncate" title={getRecipient(email.to)}>{getRecipient(email.to)}</span>
                                            </div>
                                            <div className="w-full sm:w-1/3 mb-2 sm:mb-0 truncate pr-4 text-gray-600">
                                                {email.subject || 'No Subject'}
                                            </div>
                                            <div className="w-full sm:w-1/4 flex justify-between items-center whitespace-nowrap">
                                                <span className="inline-flex py-1 px-2 rounded-full text-xs bg-green-100 text-green-800 border border-green-200 capitalize">
                                                    {email.last_event || email.status || 'sent'}
                                                </span>
                                                <span className="text-gray-400 capitalize whitespace-nowrap ml-4">
                                                    {formatDate(email.created_at, i18n.language)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MessagingInbox
