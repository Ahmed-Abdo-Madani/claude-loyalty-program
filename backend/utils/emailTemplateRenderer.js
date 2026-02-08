import { render } from '@react-email/render';
import { messages, getLocalizedMessage } from '../middleware/languageMiddleware.js';
import logger from '../config/logger.js';
import React from 'react';

// Import templates
// Note: Requires a loader (like tsx) to handle JSX imports in Node environment
import ReceiptEmail from '../templates/emails/receipts/ReceiptEmail.jsx';
import PaymentFailureEmail from '../templates/emails/notifications/PaymentFailureEmail.jsx';
import WelcomeEmail from '../templates/emails/notifications/WelcomeEmail.jsx';
import LoyaltyMilestoneEmail from '../templates/emails/notifications/LoyaltyMilestoneEmail.jsx';
import ContactFormNotificationEmail from '../templates/emails/contact/ContactFormNotificationEmail.jsx';
import ContactFormConfirmationEmail from '../templates/emails/contact/ContactFormConfirmationEmail.jsx';

import NewMessageNotificationEmail from '../templates/emails/messages/NewMessageNotificationEmail.jsx';
import NewInquiryNotificationEmail from '../templates/emails/messages/NewInquiryNotificationEmail.jsx';

const templates = {
    'receipts/ReceiptEmail': ReceiptEmail,
    'notifications/PaymentFailureEmail': PaymentFailureEmail,
    'notifications/WelcomeEmail': WelcomeEmail,
    'notifications/LoyaltyMilestoneEmail': LoyaltyMilestoneEmail,
    'contact/ContactFormNotificationEmail': ContactFormNotificationEmail,
    'contact/ContactFormConfirmationEmail': ContactFormConfirmationEmail,
    'messages/NewMessageNotificationEmail': NewMessageNotificationEmail,
    'messages/NewInquiryNotificationEmail': NewInquiryNotificationEmail,
};

export const renderTemplate = async (templateName, props = {}, language = 'ar') => {
    try {
        const Component = templates[templateName];

        if (!Component) {
            throw new Error(`Template not found: ${templateName}`);
        }

        // Get translations for the language
        // We pass the full message object so components can access nested keys (e.g. email.receipt.title)
        const translations = messages[language] || messages['ar'];

        // Render to HTML
        const html = await render(
            React.createElement(Component, {
                ...props,
                language,
                translations
            })
        );

        return html;
    } catch (error) {
        logger.error(`Error rendering email template ${templateName}:`, error);
        // Fallback: Return simple text if rendering fails
        return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Error loading email template</h2>
        <p>We encountered an error generating this email.</p>
        <p>Original subject: ${props.subject || 'Notification'}</p>
      </div>
    `;
    }
};

export const getTranslations = (language, keys = []) => {
    // Helper to get specific translations if needed, 
    // but we mostly pass the full object in renderTemplate
    const lang = (language === 'ar' || language === 'en') ? language : 'ar';
    return messages[lang];
};

export const renderReceiptTemplate = async (receiptData, language) => {
    return renderTemplate('receipts/ReceiptEmail', { receipt: receiptData }, language);
};

export const renderNotificationTemplate = async (type, data, language) => {
    const typeMap = {
        'payment-failure': 'notifications/PaymentFailureEmail',
        'welcome': 'notifications/WelcomeEmail',
        'loyalty-milestone': 'notifications/LoyaltyMilestoneEmail',
        'new-message': 'messages/NewMessageNotificationEmail',
        'new-inquiry': 'messages/NewInquiryNotificationEmail'
    };

    const templateName = typeMap[type];
    if (!templateName) {
        throw new Error(`Unknown notification type: ${type}`);
    }

    return renderTemplate(templateName, data, language);
};

export const renderMessageNotificationTemplate = async (type, data, language) => {
    const typeMap = {
        'new-message': 'messages/NewMessageNotificationEmail',
        'new-inquiry': 'messages/NewInquiryNotificationEmail'
    };

    const templateName = typeMap[type];
    if (!templateName) {
        throw new Error(`Unknown message notification type: ${type}`);
    }

    return renderTemplate(templateName, data, language);
};

export default {
    renderTemplate,
    getTranslations,
    renderReceiptTemplate,
    renderNotificationTemplate,
    renderMessageNotificationTemplate
};
