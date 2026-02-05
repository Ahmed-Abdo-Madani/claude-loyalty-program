import React from 'react';
import { Section, Text, Button, Row, Column } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const ContactFormNotificationEmail = ({
    firstName,
    lastName,
    email,
    company,
    subject,
    message,
    timestamp,
    language = 'en', // Admin emails default to English
    translations = {}
}) => {
    const dateObj = timestamp ? new Date(timestamp) : new Date();
    const date = isNaN(dateObj.getTime()) ? new Date().toLocaleString() : dateObj.toLocaleString();

    return (
        <EmailLayout language={language}>
            <EmailHeader businessName="Madna Loyalty" subtitle="Admin Notification" language={language} />

            <Section style={{ padding: '20px 0' }}>
                <Text style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 20px' }}>
                    New Contact Form Submission
                </Text>

                <Section style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                    <Text style={{ fontWeight: 'bold', margin: '0 0 10px', color: '#4f46e5' }}>Subject: {subject}</Text>
                    <Text style={{ margin: '0 0 5px' }}><strong>From:</strong> {firstName} {lastName}</Text>
                    <Text style={{ margin: '0 0 5px' }}><strong>Email:</strong> {email}</Text>
                    {company && <Text style={{ margin: '0 0 5px' }}><strong>Company:</strong> {company}</Text>}
                    <Text style={{ margin: '0 0 5px', color: '#666', fontSize: '12px' }}><strong>Time:</strong> {date}</Text>
                </Section>

                <Text style={{ fontWeight: 'bold', marginBottom: '10px' }}>Message:</Text>
                <Section style={{ borderLeft: '4px solid #e5e7eb', paddingLeft: '15px', marginBottom: '30px' }}>
                    <Text style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{message}</Text>
                </Section>

                <Button
                    href={`mailto:${email}?subject=Re: ${subject}`}
                    style={{ backgroundColor: '#4f46e5', color: '#fff', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none' }}
                >
                    Reply to Customer
                </Button>
            </Section>

            <EmailFooter companyName="Madna Admin System" language={language} />
        </EmailLayout>
    );
};

export default ContactFormNotificationEmail;
