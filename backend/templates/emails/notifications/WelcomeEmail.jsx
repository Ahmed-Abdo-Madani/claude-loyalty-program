import React from 'react';
import { Section, Text, Button, Row, Column } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const WelcomeEmail = ({
    businessName,
    firstName,
    language = 'ar',
    translations = {}
}) => {
    const t = translations.email?.welcome || {};

    return (
        <EmailLayout language={language}>
            <EmailHeader businessName={businessName} language={language} />

            <Section style={{ padding: '20px 0' }}>
                <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {t.greeting?.replace('{{firstName}}', firstName)}
                </Text>
                <Text style={{ fontSize: '16px', lineHeight: '1.5' }}>
                    {t.intro}
                </Text>
            </Section>

            <Section style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '8px' }}>
                <Text style={{ fontWeight: 'bold', fontSize: '16px', margin: '0 0 15px' }}>{t.howItWorks}</Text>
                <Row style={{ marginBottom: '10px' }}>
                    <Column style={{ width: '30px' }}><Text style={{ fontSize: '20px', margin: 0 }}>🛍️</Text></Column>
                    <Column><Text style={{ margin: 0 }}>{t.earnStamps}</Text></Column>
                </Row>
                <Row>
                    <Column style={{ width: '30px' }}><Text style={{ fontSize: '20px', margin: 0 }}>🎁</Text></Column>
                    <Column><Text style={{ margin: 0 }}>{t.unlockRewards}</Text></Column>
                </Row>
            </Section>

            <Section align="center" style={{ marginTop: '30px' }}>
                <Button
                    href="#"
                    style={{ backgroundColor: '#000', color: '#fff', padding: '12px 24px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
                >
                    {t.getStarted}
                </Button>
            </Section>

            <EmailFooter companyName={businessName} language={language} />
        </EmailLayout>
    );
};

export default WelcomeEmail;
