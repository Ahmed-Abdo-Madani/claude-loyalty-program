import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { endpoints, secureApi } from '../config/api'
import MessagingToast from '../components/business/MessagingToast'

const MessagingContext = createContext()

export const useMessaging = () => {
    const context = useContext(MessagingContext)
    if (!context) {
        throw new Error('useMessaging must be used within a MessagingProvider')
    }
    return context
}

export const MessagingProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0)
    const [toastVisible, setToastVisible] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const pollInterval = useRef(null)
    const previousUnreadCount = useRef(0)
    const isFirstLoad = useRef(true)

    const fetchUnreadCount = async () => {
        try {
            // Fetch open conversations to count unread messages
            const response = await secureApi.get(`${endpoints.businessMessagesConversations}?status=open`)
            if (response.ok) {
                const data = await response.json()
                const conversations = data.data.conversations || []

                // Sum up unread_count from all conversations
                const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)

                // Compare with previous count to trigger notification
                if (!isFirstLoad.current && totalUnread > previousUnreadCount.current) {
                    const newMessages = totalUnread - previousUnreadCount.current
                    setToastMessage(`You have ${newMessages} new message${newMessages > 1 ? 's' : ''} from support.`)
                    setToastVisible(true)
                }

                setUnreadCount(totalUnread)
                previousUnreadCount.current = totalUnread
                isFirstLoad.current = false
            }
        } catch (error) {
            console.error('Error fetching unread messages count:', error)
        }
    }

    // Initial fetch and set up polling
    useEffect(() => {
        fetchUnreadCount()

        // Poll every 60 seconds
        pollInterval.current = setInterval(fetchUnreadCount, 60000)

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current)
        }
    }, [])

    const refreshUnreadCount = () => {
        fetchUnreadCount()
    }

    const markAsRead = async (conversationId) => {
        refreshUnreadCount()
    }

    const closeToast = () => {
        setToastVisible(false)
    }

    return (
        <MessagingContext.Provider value={{ unreadCount, refreshUnreadCount, markAsRead }}>
            {children}
            <MessagingToast
                message={toastMessage}
                isVisible={toastVisible}
                onClose={closeToast}
            />
        </MessagingContext.Provider>
    )
}

export default MessagingContext
