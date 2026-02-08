import React, { useEffect, useState } from 'react'
import { Transition } from '@headlessui/react'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function MessagingToast({ message, isVisible, onClose }) {
    const { t } = useTranslation('dashboard')
    const navigate = useNavigate()

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose()
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [isVisible, onClose])

    const handleView = () => {
        navigate('/dashboard?tab=messages')
        onClose()
    }

    return (
        <div
            aria-live="assertive"
            className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50 mt-16"
        >
            <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                <Transition
                    show={isVisible}
                    as={React.Fragment}
                    enter="transform ease-out duration-300 transition"
                    enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
                    enterTo="translate-y-0 opacity-100 sm:translate-x-0"
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
                        <div className="p-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary" aria-hidden="true" />
                                </div>
                                <div className="ml-3 w-0 flex-1 pt-0.5">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {t('messaging.newMessage')}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {message}
                                    </p>
                                    <div className="mt-3 flex space-x-7">
                                        <button
                                            type="button"
                                            onClick={handleView}
                                            className="bg-white dark:bg-gray-800 rounded-md text-sm font-medium text-primary hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                        >
                                            {t('messaging.view')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="bg-white dark:bg-gray-800 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                        >
                                            {t('manageAndNotify.close', 'Dismiss')}
                                        </button>
                                    </div>
                                </div>
                                <div className="ml-4 flex-shrink-0 flex">
                                    <button
                                        className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </div>
    )
}
