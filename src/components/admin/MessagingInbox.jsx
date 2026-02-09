import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { endpoints } from '../../config/api'
import { adminApi } from '../../utils/adminAuth'

import MessageThread from './MessageThread'
import MessageComposer from './MessageComposer'
import MessageTemplateManager from './MessageTemplateManager'

const MessagingInbox = () => {
    const { t, i18n } = useTranslation('admin')
    const [conversations, setConversations] = useState([])
    const [messages, setMessages] = useState([])
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [filter, setFilter] = useState({ search: '', status: 'all', business_id: '' })
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [showTemplateManager, setShowTemplateManager] = useState(false)
    const [adminId, setAdminId] = useState(null)
    const [businesses, setBusinesses] = useState([])
    const [actionLoading, setActionLoading] = useState(false)

    // Polling ref to clear interval on unmount
    const pollInterval = useRef(null)

    useEffect(() => {
        // Get current admin ID from localStorage
        const adminInfoStr = localStorage.getItem('adminInfo')
        if (adminInfoStr) {
            try {
                const admin = JSON.parse(adminInfoStr)
                setAdminId(admin.id)
            } catch (e) {
                console.error('Error parsing admin info', e)
            }
        }

        fetchConversations()
        fetchBusinesses()

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current)
        }
    }, [])

    // Poll for new messages when a conversation is selected
    // Poll for new messages when a conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id)

            if (pollInterval.current) clearInterval(pollInterval.current)
            pollInterval.current = setInterval(() => {
                fetchMessages(selectedConversation.id, true) // silent update
            }, 30000)
        } else {
            if (pollInterval.current) clearInterval(pollInterval.current)
        }
    }, [selectedConversation])

    const fetchConversations = async () => {
        try {
            setLoading(true)
            // Append query params for filtering
            const query = new URLSearchParams()
            if (filter.status !== 'all') query.append('status', filter.status)
            if (filter.search) query.append('search', filter.search)
            if (filter.business_id) query.append('business_id', filter.business_id)

            const response = await adminApi.get(`${endpoints.adminMessagesConversations}?${query.toString()}`)

            if (response.ok) {
                const data = await response.json()
                setConversations(data.data.conversations || [])
            }
        } catch (error) {
            console.error('Error fetching conversations:', error)
        } finally {
            setLoading(false)
        }
    }

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

    const fetchMessages = async (conversationId, silent = false) => {
        try {
            if (!silent) setLoadingMessages(true)
            const response = await adminApi.get(endpoints.adminMessagesConversationDetail(conversationId))

            if (response.ok) {
                const data = await response.json()
                const msgs = data.data.messages || []
                setMessages(msgs)

                // Mark unread messages as read
                if (!silent && msgs.length > 0) {
                    // Find unread messages where sender is not admin (i.e. 'business')
                    // Assuming message structure has 'sender_type' or 'is_admin' or similar. 
                    // Checking MessageThread usage might clarify message structure. 
                    // In MessageThread: `msg.sender_type === 'admin'`
                    const unreadIds = msgs
                        .filter(m => m.sender_type === 'business' && !m.read_at)
                        .map(m => m.id)

                    if (unreadIds.length > 0) {
                        Promise.all(unreadIds.map(id => adminApi.post(endpoints.adminMessagesMarkRead(id))))

                            .then(() => {
                                // Update local read status
                                setConversations(prev => prev.map(c =>
                                    c.id === conversationId ? { ...c, unread_count: 0 } : c
                                ))
                            })
                            .catch(err => console.error('Error marking messages read', err))
                    }
                }

                // Update read status in local conversation list if needed
                if (data.data.conversation) {
                    setConversations(prev => prev.map(c =>
                        c.id === conversationId ? { ...c, unread_count: 0 } : c
                    ))
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            if (!silent) setLoadingMessages(false)
        }
    }

    const handleConversationSelect = (conversation) => {
        setSelectedConversation(conversation)
        // Mark as read locally immediately for better UI
        setConversations(prev => prev.map(c =>
            c.id === conversation.id ? { ...c, unread_count: 0 } : c
        ))
    }

    const handleSendMessageSuccess = () => {
        fetchConversations()
        if (selectedConversation) {
            fetchMessages(selectedConversation.id)
        }
    }

    const handleActions = async (action) => {
        if (!selectedConversation) return

        try {
            setActionLoading(true)
            let status = ''

            switch (action) {
                case 'archive': status = 'archived'; break
                case 'close': status = 'closed'; break
                case 'reopen': status = 'open'; break
                default: return
            }

            const response = await adminApi.post(
                endpoints.adminMessagesConversationStatus(selectedConversation.id),
                { status }
            )

            if (response.ok) {
                // Update local state
                setSelectedConversation(prev => ({ ...prev, status }))
                setConversations(prev => prev.map(c =>
                    c.id === selectedConversation.id ? { ...c, status } : c
                ))

                // If filtering by status, update list
                if (filter.status !== 'all' && filter.status !== status) {
                    setSelectedConversation(null)
                    setConversations(prev => prev.filter(c => c.id !== selectedConversation.id))
                }
            }
        } catch (error) {
            console.error(`Error performing action ${action}:`, error)
        } finally {
            setActionLoading(false)
        }
    }

    const filteredConversations = conversations.filter(c => {
        const busName = c.business_name || c.business?.business_name || ''
        const matchesSearch = busName.toLowerCase().includes((filter.search || '').toLowerCase())
        const matchesStatus = filter.status === 'all' || c.status === filter.status
        const matchesBusiness = !filter.business_id || c.business_id === filter.business_id
        return matchesSearch && matchesStatus && matchesBusiness
    })

    // Determine available actions based on status
    const canArchive = selectedConversation?.status !== 'archived'
    const canClose = selectedConversation?.status === 'open'
    const canReopen = selectedConversation?.status === 'closed' || selectedConversation?.status === 'archived'

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)] overflow-hidden flex flex-col md:flex-row">

            {/* Left Panel - Conversation List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>

                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">{t('messaging.inbox')}</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowTemplateManager(true)}
                                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full"
                                title={t('messaging.templates')}
                            >
                                📝
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedConversation(null)
                                    setIsComposerOpen(true)
                                }}
                                className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-purple-700 transition"
                            >
                                {t('messaging.newMessage')}
                            </button>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="space-y-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('messaging.searchConversations')}
                                value={filter.search}
                                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            <span className="absolute left-2.5 top-2.5 text-gray-400">🔍</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={filter.status}
                                onChange={(e) => {
                                    setFilter({ ...filter, status: e.target.value })
                                    setTimeout(fetchConversations, 0)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                            >
                                <option value="all">{t('messaging.allStatuses')}</option>
                                <option value="open">{t('messaging.open')}</option>
                                <option value="closed">{t('messaging.closed')}</option>
                                <option value="archived">{t('messaging.archived')}</option>
                            </select>

                            <select
                                value={filter.business_id}
                                onChange={(e) => {
                                    setFilter({ ...filter, business_id: e.target.value })
                                    setTimeout(fetchConversations, 0)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                            >
                                <option value="">{t('messaging.allBusinesses') || t('businesses.all') || 'All Businesses'}</option>
                                {businesses.map(b => (
                                    <option key={b.public_id || b.id} value={b.public_id || b.id}>{b.business_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>{t('messaging.noConversations')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredConversations.map(conversation => (
                                <button
                                    key={conversation.id}
                                    onClick={() => handleConversationSelect(conversation)}
                                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-start ${selectedConversation?.id === conversation.id ? 'bg-purple-50 hover:bg-purple-50' : ''
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`text-sm font-semibold truncate ${conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                                                }`}>
                                                {conversation.business_name || conversation.business?.business_name || t('messaging.unknownBusiness')}
                                            </h3>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                {conversation.last_message_at && formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: i18n.language === 'ar' ? arSA : undefined })}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                                            }`}>
                                            {conversation.last_message_body || t('messaging.noMessages')}
                                        </p>
                                    </div>
                                    {conversation.unread_count > 0 && (
                                        <div className="ml-2 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {conversation.unread_count}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Thread */}
            <div className={`w-full md:w-2/3 flex flex-col bg-gray-50 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                {selectedConversation ? (
                    <>
                        {/* Thread Header */}
                        <div className="p-4 bg-white border-b border-gray-200 shadow-sm flex justify-between items-center">
                            <div className="flex items-center">
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="mr-3 md:hidden text-gray-600"
                                >
                                    ←
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedConversation.business_name || selectedConversation.business?.business_name}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                                    ${selectedConversation.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                `}>
                                            {selectedConversation.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {canClose && (
                                    <button
                                        onClick={() => handleActions('close')}
                                        disabled={actionLoading}
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 shadow-sm"
                                        title={t('messaging.close')}
                                    >
                                        🚫
                                    </button>
                                )}
                                {canReopen && (
                                    <button
                                        onClick={() => handleActions('reopen')}
                                        disabled={actionLoading}
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 shadow-sm"
                                        title={t('messaging.reopen')}
                                    >
                                        🔄
                                    </button>
                                )}
                                {canArchive && (
                                    <button
                                        onClick={() => handleActions('archive')}
                                        disabled={actionLoading}
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 shadow-sm"
                                        title={t('messaging.archive')}
                                    >
                                        📦
                                    </button>
                                )}
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <button
                                    onClick={() => setIsComposerOpen(true)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 shadow-sm"
                                >
                                    {t('messaging.response')} ↩️
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        {loadingMessages ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            </div>
                        ) : (
                            <MessageThread
                                messages={messages}
                                currentAdminId={adminId}
                            />
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
                        <div className="text-center">
                            <div className="text-6xl mb-4">💬</div>
                            <p>{t('messaging.selectBusiness')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <MessageComposer
                isOpen={isComposerOpen}
                onClose={() => setIsComposerOpen(false)}
                onSuccess={handleSendMessageSuccess}
                businesses={businesses}
                selectedBusinessId={selectedConversation?.business_id}
            />

            {showTemplateManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col relative">
                        <button
                            onClick={() => setShowTemplateManager(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                        >
                            <span className="text-2xl">&times;</span>
                        </button>
                        <div className="flex-1 overflow-hidden p-1">
                            <MessageTemplateManager />
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default MessagingInbox
