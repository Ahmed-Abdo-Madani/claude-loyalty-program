import React from 'react';
import { Html, Head, Body, Container, Preview } from '@react-email/components';

export const EmailLayout = ({
    language = 'ar',
    preview,
    children,
    fontFamily
}) => {
    const isRtl = language === 'ar';
    const dir = isRtl ? 'rtl' : 'ltr';
    const defaultFontFamily = isRtl ? 'Tahoma, Arial, sans-serif' : 'Arial, sans-serif';
    const finalFontFamily = fontFamily || defaultFontFamily;

    return (
        <Html lang={language} dir={dir}>
            <Head />
            {preview && <Preview>{preview}</Preview>}
            <Body style={mainStyle}>
                <Container style={{ ...containerStyle, fontFamily: finalFontFamily }}>
                    {children}
                </Container>
            </Body>
        </Html>
    );
};

const mainStyle = {
    backgroundColor: '#f6f9fc',
    padding: '10px 0',
};

const containerStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #f0f0f0',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
};

export default EmailLayout;
