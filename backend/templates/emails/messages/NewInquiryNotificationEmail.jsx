import React from 'react';
import { Section, Text, Button, Row, Column, Link } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const NewInquiryNotificationEmail = ({
    businessName,
    businessEmail,
    subject,
    messageBody,
    conversationUrl,
    language = 'en', // Admins usually prefer English dashboard, but supports 'ar'
    translations = {}
}) => {
    // Admin interface is typically English, but we support localization
    // Fallback to English if translation missing
    const t = translations.email?.messages?.newInquiry || {};
    const textDirection = language === 'ar' ? 'rtl' : 'ltr';

    return (
        <EmailLayout language={language}>
            <EmailHeader businessName="Madn Admin" language={language} />

            <Section style={{ padding: '20px 0', direction: textDirection }}>
                <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {t.greeting}
                </Text>
                <Text style={{ fontSize: '16px', lineHeight: '1.5' }}>
                    {t.intro?.replace('{{businessName}}', businessName)}
                </Text>

                <Section style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    margin: '20px 0'
                }}>
                    <Text style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0 0 15px',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid #f3f4f6',
                        paddingBottom: '10px'
                    }}>
                        {t.businessDetails}
                    </Text>

                    <Row style={{ marginBottom: '10px' }}>
                        <Column style={{ width: '100px', fontWeight: 'bold', color: '#4b5563' }}>Name:</Column>
                        <Column>{businessName}</Column>
                    </Row>
                    <Row style={{ marginBottom: '10px' }}>
                        <Column style={{ width: '100px', fontWeight: 'bold', color: '#4b5563' }}>{t.businessEmail || 'Email'}:</Column>
                        <Column><Link href={`mailto:${businessEmail}`}>{businessEmail}</Link></Column>
                    </Row>
                    <Row>
                        <Column style={{ width: '100px', fontWeight: 'bold', color: '#4b5563' }}>{t.inquirySubject || 'Subject'}:</Column>
                        <Column>{subject}</Column>
                    </Row>
                </Section>

                <Section style={{ margin: '20px 0' }}>
                    <Text style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0 0 10px',
                        textTransform: 'uppercase'
                    }}>
                        {t.messagePreview}
                    </Text>
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '15px',
                        borderRadius: '4px',
                        borderLeft: '4px solid #3b82f6'
                    }}>
                        <Text style={{
                            fontSize: '16px',
                            lineHeight: '1.6',
                            color: '#374151',
                            margin: 0,
                            whiteSpace: 'pre-wrap'
                        }}>
                            {messageBody}
                        </Text>
                    </div>
                </Section>

                <Section align="center" style={{ marginTop: '30px' }}>
                    <Button
                        href={conversationUrl}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            padding: '12px 24px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}
                    >
                        {t.replyToBusiness}
                    </Button>
                </Section>
            </Section>

            <EmailFooter companyName="Madn Admin System" language={language} />
        </EmailLayout>
    );
};

export default NewInquiryNotificationEmail;
