import React from 'react';
import { Section, Img, Text } from '@react-email/components';

export const EmailHeader = ({
    logoUrl,
    businessName,
    subtitle,
    language = 'ar'
}) => {
    const isRtl = language === 'ar';
    const textAlign = isRtl ? 'right' : 'left';

    return (
        <Section style={{ paddingBottom: '20px', borderBottom: '1px solid #eaeaea', textAlign }}>
            {logoUrl && (
                <Img
                    src={logoUrl}
                    width="50"
                    height="50"
                    alt={businessName}
                    style={{ marginBottom: '10px', display: 'inline-block' }}
                />
            )}
            <Text style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#333' }}>
                {businessName}
            </Text>
            {subtitle && (
                <Text style={{ fontSize: '16px', color: '#666', margin: '5px 0 0' }}>
                    {subtitle}
                </Text>
            )}
        </Section>
    );
};

export default EmailHeader;
