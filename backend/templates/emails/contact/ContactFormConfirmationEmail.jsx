import React from 'react';
import { Section, Text } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const ContactFormConfirmationEmail = ({
    firstName,
    subject,
    submissionData = {},
    language = 'en',
    translations = {}
}) => {
    const isRtl = language === 'ar';
    const textAlign = isRtl ? 'right' : 'left';
    const emailT = translations.email || {};
    const t = emailT.contact || {};
    const labels = t.labels || {};

    // Helper to sanitize and format values
    const formatValue = (val) => {
        if (typeof val !== 'string') return String(val || '');
        return val.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                {i < val.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    return (
        <EmailLayout language={language}>
            <EmailHeader businessName="Madna Loyalty" language={language} />

            <Section style={{ padding: '20px 0', textAlign }}>
                <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px' }}>
                    {t.greeting ? t.greeting.replace('{{firstName}}', firstName) : `Hi ${firstName},`}
                </Text>
                <Text style={{ margin: '0 0 10px' }}>
                    {t.thankYou}
                </Text>
                <Text style={{ margin: '0 0 10px' }}>
                    {t.receivedMessage}
                </Text>
                <Text style={{ color: '#666', margin: '0 0 20px' }}>
                    {t.responseTime}
                </Text>
            </Section>

            <Section style={{
                backgroundColor: '#f9fafb',
                padding: '20px',
                borderRadius: '5px',
                marginTop: '10px',
                textAlign
            }}>
                <Text style={{ margin: '0 0 15px', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    {t.summary}:
                </Text>

                <table border="0" cellPadding="0" cellSpacing="0" width="100%" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                        {Object.entries(submissionData).map(([key, value]) => (
                            <tr key={key}>
                                <td style={{
                                    padding: '8px 0',
                                    verticalAlign: 'top',
                                    width: '30%',
                                    fontWeight: 'bold',
                                    color: '#666',
                                    fontSize: '14px',
                                    textAlign: isRtl ? 'right' : 'left'
                                }}>
                                    {labels[key] || key}:
                                </td>
                                <td style={{
                                    padding: '8px 10px',
                                    verticalAlign: 'top',
                                    color: '#333',
                                    fontSize: '14px',
                                    textAlign: isRtl ? 'right' : 'left'
                                }}>
                                    {formatValue(value)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            <EmailFooter companyName="Madna Loyalty" language={language} />
        </EmailLayout>
    );
};

export default ContactFormConfirmationEmail;
