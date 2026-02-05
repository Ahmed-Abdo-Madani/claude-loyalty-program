import React from 'react';
import { Section, Text, Link } from '@react-email/components';

export const EmailFooter = ({
    companyName,
    year,
    contactInfo,
    unsubscribeUrl,
    language = 'ar'
}) => {
    const isRtl = language === 'ar';
    const textAlign = isRtl ? 'right' : 'left';

    return (
        <Section style={{ paddingTop: '20px', borderTop: '1px solid #eaeaea', marginTop: '20px', textAlign }}>
            <Text style={{ fontSize: '12px', color: '#8898aa', margin: '0 0 10px' }}>
                © {year || new Date().getFullYear()} {companyName}. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </Text>
            {contactInfo && (
                <Text style={{ fontSize: '12px', color: '#8898aa', margin: '0 0 10px' }}>
                    {contactInfo}
                </Text>
            )}
            {unsubscribeUrl && (
                <Link href={unsubscribeUrl} style={{ fontSize: '12px', color: '#8898aa', textDecoration: 'underline' }}>
                    {isRtl ? 'إلغاء الاشتراك' : 'Unsubscribe'}
                </Link>
            )}
        </Section>
    );
};

export default EmailFooter;
