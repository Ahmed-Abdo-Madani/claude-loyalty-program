import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { endpoints, secureApi } from '../../config/api'
import MessageThread from '../admin/MessageThread' // Reuse admin component
import MessageComposer from './MessageComposer'
import { useMessaging } from '../../contexts/MessagingContext'
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    PencilSquareIcon,
    ArrowLeftIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

const MessagingInbox = () => {
    const { t, i18n } = useTranslation('dashboard')
    const { refreshUnreadCount } = useMessaging()
    const [conversations, setConversations] = useState([])
    const [messages, setMessages] = useState([])
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [filter, setFilter] = useState({ search: '', status: 'all' })
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [businessId, setBusinessId] = useState(null)

    // Polling ref
    const pollInterval = useRef(null)

    useEffect(() => {
        // Get current business ID
        const authData = localStorage.getItem('authData')
        if (authData) {
            try {
                const parsed = JSON.parse(authData)
                setBusinessId(parsed.businessId)
            } catch (e) {
                console.error('Error parsing auth data', e)
            }
        }

        fetchConversations()

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current)
        }
    }, [])

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
            const query = new URLSearchParams()
            if (filter.status !== 'all') query.append('status', filter.status)
            if (filter.search) query.append('search', filter.search)

            const response = await secureApi.get(`${endpoints.businessMessagesConversations}?${query.toString()}`)
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

    const fetchMessages = async (conversationId, silent = false) => {
        try {
            if (!silent) setLoadingMessages(true)
            const response = await secureApi.get(endpoints.businessMessagesConversationDetail(conversationId))
            if (response.ok) {
                const data = await response.json()
                const msgs = data.data.messages || []
                setMessages(msgs)

                // Mark unread messages as read
                if (!silent && msgs.length > 0) {
                    // Find unread messages from admin
                    const unreadIds = msgs
                        .filter(m => m.sender_type === 'admin' && !m.read_at)
                        .map(m => m.id)

                    if (unreadIds.length > 0) {
                        Promise.all(unreadIds.map(id => secureApi.post(endpoints.businessMessagesMarkRead(id))))
                            .then(() => {
                                // Update local read status
                                setConversations(prev => prev.map(c =>
                                    c.id === conversationId ? { ...c, unread_count: 0 } : c
                                ))
                                // Refresh global unread count
                                refreshUnreadCount()
                            })
                            .catch(err => console.error('Error marking messages read', err))
                    }
                }

                // Also update conversation in list if we have fresh data
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
        // Optimistically mark as read in UI
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

    const filteredConversations = conversations.filter(c => {
        // Search matches subject or last message
        const searchLower = filter.search.toLowerCase()
        const matchesSearch =
            (c.subject || '').toLowerCase().includes(searchLower) ||
            (c.last_message_body || '').toLowerCase().includes(searchLower)

        const matchesStatus = filter.status === 'all' || c.status === filter.status
        return matchesSearch && matchesStatus
    })

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 h-[calc(100vh-140px)] overflow-hidden flex flex-col md:flex-row transition-colors duration-300">

            {/* Left Panel - Conversation List */}
            <div className={`w-full md:w-1/3 border-r border-gray-100 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
                            {t('messaging.inbox')}
                        </h2>
                        <button
                            onClick={() => {
                                setSelectedConversation(null)
                                setIsComposerOpen(true)
                            }}
                            className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition-colors shadow-md shadow-primary/20"
                            title={t('messaging.compose')}
                        >
                            <PencilSquareIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search & Filter */}
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('messaging.searchConversations')}
                                value={filter.search}
                                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-gray-900 dark:text-white"
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                        </div>
                        <div className="relative">
                            <select
                                value={filter.status}
                                onChange={(e) => {
                                    setFilter({ ...filter, status: e.target.value })
                                    // Trigger fetch on next tick to allow state update
                                    setTimeout(fetchConversations, 0)
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none text-gray-900 dark:text-white"
                            >
                                <option value="all">{t('messaging.allStatuses')}</option>
                                <option value="open">{t('messaging.open')}</option>
                                <option value="closed">{t('messaging.closed')}</option>
                                <option value="archived">{t('messaging.archived')}</option>
                            </select>
                            <FunnelIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-500">{t('loading')}</p>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <p>{t('messaging.noConversations')}</p>
                            <button
                                onClick={() => setIsComposerOpen(true)}
                                className="mt-4 text-primary text-sm font-medium hover:underline"
                            >
                                {t('messaging.compose')}
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredConversations.map(conversation => (
                                <button
                                    key={conversation.id}
                                    onClick={() => handleConversationSelect(conversation)}
                                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-start ${selectedConversation?.id === conversation.id
                                        ? 'bg-primary/5 border-l-4 border-primary'
                                        : 'border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`text-sm font-semibold truncate ${conversation.unread_count > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                                }`}>
                                                {conversation.subject || t('messaging.support')}
                                            </h3>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                {conversation.last_message_at && formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: i18n.language === 'ar' ? arSA : undefined })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize border ${conversation.status === 'open'
                                                ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                                }`}>
                                                {t(`messaging.${conversation.status}`)}
                                            </span>
                                            {conversation.type && (
                                                <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 capitalize">
                                                    {t(`messaging.${conversation.type}`)}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                            {conversation.last_message_body || t('messaging.noMessages')}
                                        </p>
                                    </div>
                                    {conversation.unread_count > 0 && (
                                        <div className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
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
            <div className={`w-full md:w-2/3 flex flex-col bg-gray-50 dark:bg-gray-900/50 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                {selectedConversation ? (
                    <>
                        {/* Thread Header */}
                        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                        {selectedConversation.subject || t('messaging.support')}
                                    </h2>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>#{String(selectedConversation.id).substring(0, 8)}</span>
                                        <span>•</span>
                                        <span className={`capitalize ${selectedConversation.status === 'open' ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                            {t(`messaging.${selectedConversation.status}`)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Business can only reply, actions like close/archive are filtered out */}
                            <button
                                onClick={() => setIsComposerOpen(true)}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-colors"
                            >
                                <PencilSquareIcon className="w-4 h-4" />
                                {t('messaging.compose')}
                            </button>
                        </div>

                        {/* Messages */}
                        {loadingMessages ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-hidden relative">
                                <MessageThread
                                    messages={messages}
                                    currentAdminId={null} // We are business, so we pass null or check logic
                                // NOTE: MessageThread checks sender_type === 'admin'.
                                // For business dashboard:
                                // - "Me" (Business) -> Right side (Purple) -> logic in MessageThread might need tweak if it assumes 'admin' is "Me"
                                // Let's check MessageThread logic again.
                                // MessageThread: `const isAdmin = message.sender_type === 'admin'`
                                // It styles `isAdmin` as Right side / Purple.
                                // BUT: In Business Dashboard, "Me" is the Business.
                                // So we want 'business' to be Right side.
                                // We can reuse MessageThread if we control what it thinks is "Admin" (or "Me")
                                // OR better: Create a wrapper or prop.
                                // MessageThread takes `currentAdminId` but actually uses `sender_type === 'admin'` hardcoded for styling.
                                // 
                                // WORKAROUND: We will clone MessageThread logic here or wrap it.
                                // Since I cannot easily modify MessageThread to be generic without verifying impacts on Admin dashboard,
                                // I'll create a local customized version OR better, just implement the loop here.
                                // It's simple enough.
                                />
                                {/* REPLACEMENT FOR MessageThread to handle Business Perspective */}
                                <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                                    {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2 opacity-20" />
                                            <p>{t('messaging.noMessages')}</p>
                                        </div>
                                    ) : (
                                        messages.map((message, index) => {
                                            const isMe = message.sender_type === 'business'
                                            // Layout: Me -> Right, Them -> Left

                                            return (
                                                <div
                                                    key={message.id || index}
                                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                                >
                                                    <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                                                        {!isMe && (
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500">
                                                                <span className="text-xs font-bold">A</span>
                                                            </div>
                                                        )}

                                                        <div
                                                            className={`px-4 py-3 rounded-2xl shadow-sm ${isMe
                                                                ? 'bg-primary text-white rounded-br-none'
                                                                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
                                                                }`}
                                                        >
                                                            {message.subject && index === 0 && (
                                                                <p className={`font-bold text-sm mb-1 pb-1 border-b ${isMe ? 'border-white/20' : 'border-gray-100 dark:border-gray-700'}`}>
                                                                    {message.subject}
                                                                </p>
                                                            )}

                                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                                {message.body}
                                                            </div>

                                                            <div className={`text-[10px] mt-1 flex items-center gap-1 opacity-70 ${isMe ? 'justify-end text-blue-100' : 'justify-start text-gray-400'}`}>
                                                                <span>
                                                                    {formatDistanceToNow(new Date(message.created_at), {
                                                                        addSuffix: true,
                                                                        locale: i18n.language === 'ar' ? arSA : undefined
                                                                    })}
                                                                </span>
                                                                {isMe && (
                                                                    <span>
                                                                        {message.read_at ? '✓✓' : '✓'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Reply Input Area */}
                        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setIsComposerOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                                <span>{t('messaging.compose')}...</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {t('messaging.selectConversation')}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-xs text-center mb-6">
                            Select a conversation from the list to view messages or start a new inquiry.
                        </p>
                        <button
                            onClick={() => setIsComposerOpen(true)}
                            className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                        >
                            {t('messaging.compose')}
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <MessageComposer
                isOpen={isComposerOpen}
                onClose={() => setIsComposerOpen(false)}
                onSuccess={handleSendMessageSuccess}
            />
        </div>
    )
}

export default MessagingInbox
