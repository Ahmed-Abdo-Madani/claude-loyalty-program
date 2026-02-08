import React, { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'

const MessageThread = ({ messages, currentAdminId }) => {
    const { t, i18n } = useTranslation('admin')
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    if (!messages || messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <p>{t('messaging.noMessages')}</p>
            </div>
        )
    }

    const formatTime = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), {
                addSuffix: true,
                locale: i18n.language === 'ar' ? arSA : undefined
            })
        } catch (e) {
            return dateString
        }
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => {
                const isAdmin = message.sender_type === 'admin'
                // If sender_id matches currentAdminId, it's "You", otherwise if type is admin it's another admin
                // But for simplicity, we'll treat all 'admin' type as user's side (purple)
                // and 'business' type as other side (gray)

                return (
                    <div
                        key={message.id || index}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                        <div className="flex items-end gap-2 max-w-[80%]">
                            {!isAdmin && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-gray-600">
                                        {message.sender_name?.[0]?.toUpperCase() || 'B'}
                                    </span>
                                </div>
                            )}

                            <div
                                className={`px-4 py-3 rounded-2xl shadow-sm ${isAdmin
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-gray-800 dark:text-gray-100 rounded-br-none'
                                        : 'bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-bl-none'
                                    }`}
                            >
                                {/* Subject if present and not a reply in a long thread? 
                    For now, show subject if it exists and it's the first message or explicitly set 
                */}
                                {message.subject && (
                                    <p className="font-bold text-sm mb-1 pb-1 border-b border-black/5 dark:border-white/10">
                                        {message.subject}
                                    </p>
                                )}

                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {message.body}
                                </div>

                                <div className={`text-[10px] mt-1 flex items-center gap-1 opacity-70 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <span>{formatTime(message.created_at)}</span>
                                    {isAdmin && message.read_at && (
                                        <span title={t('messaging.readReceipt', { time: formatTime(message.read_at) })}>
                                            ✓✓
                                        </span>
                                    )}
                                    {isAdmin && !message.read_at && (
                                        <span title={t('messaging.unread')}>✓</span>
                                    )}
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-purple-700">
                                        {t('messaging.you')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className={`text-xs text-gray-400 mt-1 mx-12`}>
                            {isAdmin ? t('messaging.admin') : message.sender_name || t('messaging.business')}
                        </div>
                    </div>
                )
            })}
            <div ref={messagesEndRef} />
        </div>
    )
}

export default MessageThread
