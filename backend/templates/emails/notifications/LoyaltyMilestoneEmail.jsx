import React from 'react';
import { Section, Text, Button, Img } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const LoyaltyMilestoneEmail = ({
    businessName,
    firstName,
    stampsEarned,
    tierName,
    rewardName,
    language = 'ar',
    translations = {}
}) => {
    const t = translations.email?.loyaltyMilestone || {};

    return (
        <EmailLayout language={language}>
            <EmailHeader businessName={businessName} language={language} />

            <Section align="center" style={{ padding: '30px 0' }}>
                <Text style={{ fontSize: '48px', margin: '0' }}>🎉</Text>
                <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                    {t.congrats?.replace('{{firstName}}', firstName)}
                </Text>
            </Section>

            <Section style={{ padding: '0 20px' }}>
                {stampsEarned && (
                    <Text style={{ fontSize: '18px', textAlign: 'center' }}>
                        {t.achievement?.replace('{{stampsEarned}}', stampsEarned)}
                    </Text>
                )}

                {tierName && (
                    <Text style={{ fontSize: '18px', textAlign: 'center', color: '#4f46e5', fontWeight: 'bold' }}>
                        {t.tierReached?.replace('{{tierName}}', tierName)}
                    </Text>
                )}

                {rewardName && (
                    <Section style={{ backgroundColor: '#fff8e1', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'center' }}>
                        <Text style={{ fontWeight: 'bold', color: '#b45309', margin: 0 }}>
                            {t.rewardUnlocked?.replace('{{rewardName}}', rewardName)}
                        </Text>
                    </Section>
                )}
            </Section>

            <Section align="center" style={{ marginTop: '30px' }}>
                <Text style={{ color: '#666' }}>{t.keepGoing}</Text>
            </Section>

            <EmailFooter companyName={businessName} language={language} />
        </EmailLayout>
    );
};

export default LoyaltyMilestoneEmail;
