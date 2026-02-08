import React from 'react';
import { Section, Text, Button, Link } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const NewMessageNotificationEmail = ({
    businessName,
    subject,
    messageBody,
    conversationUrl,
    adminName = 'Admin',
    language = 'ar',
    translations = {},
    unsubscribeUrl
}) => {
    const t = translations.email?.messages?.newMessage || {};
    const textDirection = language === 'ar' ? 'rtl' : 'ltr';

    return (
        <EmailLayout language={language}>
            <EmailHeader businessName={businessName} language={language} />

            <Section style={{ padding: '20px 0', direction: textDirection }}>
                <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {t.greeting?.replace('{{recipientName}}', businessName)}
                </Text>
                <Text style={{ fontSize: '16px', lineHeight: '1.5' }}>
                    {t.intro?.replace('{{subject}}', subject)}
                </Text>

                <Section style={{
                    backgroundColor: '#f9fafb',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    margin: '20px 0'
                }}>
                    <Text style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0 0 10px',
                        textTransform: 'uppercase'
                    }}>
                        {t.messagePreview}
                    </Text>
                    <Text style={{
                        fontSize: '16px',
                        lineHeight: '1.6',
                        color: '#374151',
                        margin: 0,
                        whiteSpace: 'pre-wrap'
                    }}>
                        {messageBody && messageBody.length > 200
                            ? `${messageBody.substring(0, 200)}...`
                            : messageBody}
                    </Text>
                </Section>

                <Section align="center" style={{ marginTop: '30px', marginBottom: '30px' }}>
                    <Button
                        href={conversationUrl}
                        style={{
                            backgroundColor: '#000',
                            color: '#fff',
                            padding: '12px 24px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}
                    >
                        {t.viewFullMessage}
                    </Button>
                </Section>

                <Text style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                    {t.replyInDashboard}
                </Text>
            </Section>

            {unsubscribeUrl && (
                <Section style={{
                    marginTop: '20px',
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '20px',
                    textAlign: 'center'
                }}>
                    <Text style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px' }}>
                        {t.unsubscribeNote}
                    </Text>
                    <Link
                        href={unsubscribeUrl}
                        style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'underline' }}
                    >
                        {t.unsubscribeLink}
                    </Link>
                </Section>
            )}

            <EmailFooter companyName={businessName} language={language} />
        </EmailLayout>
    );
};

export default NewMessageNotificationEmail;
