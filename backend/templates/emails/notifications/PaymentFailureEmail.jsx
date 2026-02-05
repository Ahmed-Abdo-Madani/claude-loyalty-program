import React from 'react';
import { Section, Text, Button } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const PaymentFailureEmail = ({
    businessName,
    amount,
    currency = 'SAR',
    planType,
    retryCount,
    nextRetryDate,
    gracePeriodEnd,
    reactivationUrl,
    language = 'ar',
    translations = {}
}) => {
    const isRtl = language === 'ar';
    const textAlign = isRtl ? 'right' : 'left';
    const emailT = translations.email || {};
    const t = emailT.paymentFailure || {};

    // Helper to replace markers
    const interpolate = (text, params = {}) => {
        if (!text) return '';
        let result = text;
        Object.keys(params).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, params[key]);
        });
        return result;
    };

    // If this is a final notice
    const isFinal = !!gracePeriodEnd;

    return (
        <EmailLayout language={language}>
            <EmailHeader businessName={businessName} language={language} />

            <Section style={{
                backgroundColor: '#fff0f0',
                border: '1px solid #ffdcdc',
                borderRadius: '5px',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'center'
            }}>
                <Text style={{ color: '#d32f2f', fontWeight: 'bold', margin: 0, fontSize: '16px' }}>
                    {isFinal ? t.bannerFinal : t.bannerNormal}
                </Text>
            </Section>

            <Text style={{ fontSize: '16px', lineHeight: '1.5', textAlign }}>
                {interpolate(t.greeting, { businessName })}
            </Text>

            <Text style={{ fontSize: '16px', lineHeight: '1.5', textAlign }}>
                {/* We use dangerouslySetInnerHTML for the main message because it contains <strong> tags in translations */}
                <span dangerouslySetInnerHTML={{ __html: interpolate(t.mainMessage, { amount, currency, planType }) }} />
            </Text>

            <Section style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '5px', margin: '20px 0', textAlign }}>
                {!isFinal ? (
                    <>
                        <Text style={{ margin: '0 0 10px' }}>
                            <strong>{t.attempt}</strong> {retryCount} {t.of}
                        </Text>
                        <Text style={{ margin: '0' }}>
                            <strong>{t.nextRetry}</strong> {nextRetryDate}
                        </Text>
                    </>
                ) : (
                    <Text style={{ margin: '0', color: '#d32f2f' }}>
                        <strong>{t.gracePeriod}</strong> {gracePeriodEnd}
                    </Text>
                )}
            </Section>

            <Text style={{ fontSize: '16px', lineHeight: '1.5', textAlign }}>
                {t.closing}
            </Text>

            <Section align="center" style={{ margin: '30px 0' }}>
                <Button
                    href={reactivationUrl}
                    style={{
                        backgroundColor: '#d32f2f',
                        color: '#fff',
                        padding: '12px 24px',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontWeight: 'bold'
                    }}
                >
                    {t.cta}
                </Button>
            </Section>

            <EmailFooter companyName="Madna Loyalty" language={language} />
        </EmailLayout>
    );
};

export default PaymentFailureEmail;
