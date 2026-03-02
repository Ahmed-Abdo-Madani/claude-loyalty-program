import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { publicApi, endpoints } from '../config/api';
import { getAuthData } from '../utils/secureAuth';

const ContactSupportModal = ({ isOpen, onClose, initialSubject = '' }) => {
    const { t } = useTranslation(['subscription']);
    const [isAnimating, setIsAnimating] = useState(false);

    const [subject, setSubject] = useState(initialSubject);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setIsAnimating(true));
            setSubject(initialSubject);
            setMessage('');
            setStatus({ type: '', message: '' });
        } else {
            setIsAnimating(false);
        }
    }, [isOpen, initialSubject]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const authData = getAuthData();
            const userEmail = (authData?.userEmail || '').trim();
            const businessName = (authData?.businessName || '').trim();

            if (!userEmail || !businessName) {
                setStatus({ type: 'error', message: t('subscription:contactSupport.errorMessage', 'Failed to send message. Please try again.') });
                setIsSubmitting(false);
                return;
            }

            let firstName = businessName;
            let lastName = 'Business';

            const nameParts = businessName.split(/\\s+/);
            if (nameParts.length > 1) {
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
            }

            const response = await publicApi.post(endpoints.contactSupport, {
                firstName,
                lastName,
                email: userEmail,
                company: businessName,
                subject,
                message
            });

            const json = await response.json();

            if (json.success) {
                setStatus({ type: 'success', message: t('subscription:contactSupport.successMessage', "We've received your message and will respond within 24 hours.") });
                setSubject('');
                setMessage('');
            } else {
                setStatus({ type: 'error', message: json.message || json.error || t('subscription:contactSupport.errorMessage', 'Failed to send message. Please try again.') });
            }
        } catch (error) {
            console.error('Contact support error:', error);
            setStatus({ type: 'error', message: t('subscription:contactSupport.errorMessage', 'Failed to send message. Please try again.') });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-t-2xl text-center text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                    <h2 className="text-3xl font-bold mb-2">
                        {t('subscription:contactSupport.title', 'Contact Support')}
                    </h2>
                    <p className="text-blue-100 text-lg mx-auto max-w-sm">
                        {t('subscription:contactSupport.subtitle', "Send a message to our team and we'll get back to you shortly")}
                    </p>
                </div>

                <div className="p-8">
                    {status.type === 'success' ? (
                        <div className="text-center py-6">
                            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('subscription:contactSupport.successTitle', 'Message Sent!')}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                                {status.message}
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 px-4 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                {t('subscription:contactSupport.closeButton', 'Close')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status.type === 'error' && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                                    {status.message}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('subscription:contactSupport.subjectLabel', 'Subject')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={t('subscription:contactSupport.subjectPlaceholder', 'Describe your issue or question')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('subscription:contactSupport.messageLabel', 'Message')}
                                </label>
                                <textarea
                                    required
                                    rows={6}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={t('subscription:contactSupport.messagePlaceholder', 'Provide details about your request...')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-colors resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 px-4 mt-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        {t('subscription:contactSupport.sending', 'Sending...')}
                                    </>
                                ) : (
                                    t('subscription:contactSupport.sendButton', 'Send Message')
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactSupportModal;
