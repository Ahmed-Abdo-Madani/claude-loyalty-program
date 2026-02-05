import React from 'react';
import { Section, Text, Heading, Row, Column } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';

export const ReceiptEmail = ({
    receipt,
    language = 'ar',
    translations = {}
}) => {
    const t = translations.email?.receipt || {};
    const isRtl = language === 'ar';

    // Format helpers
    const formatCurrency = (amount) => {
        return `${parseFloat(amount).toFixed(2)} SAR`;
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const businessName = isRtl
        ? (receipt.business.business_name_ar || receipt.business.business_name)
        : receipt.business.business_name;

    return (
        <EmailLayout language={language}>
            <EmailHeader
                logoUrl={receipt.business.logo_url}
                businessName={businessName}
                language={language}
                subtitle={`${receipt.business.address || ''}, ${receipt.business.city || ''}`}
            />

            <Section style={{ padding: '20px 0' }}>
                <Row>
                    <Column>
                        <Text style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{t.receiptNumber} {receipt.sale.sale_number}</Text>
                        <Text style={{ margin: '0 0 5px' }}>{t.date}: {formatDate(receipt.sale.sale_date)}</Text>
                        <Text style={{ margin: '0' }}>{t.branch}: {receipt.branch.name}</Text>
                    </Column>
                </Row>
            </Section>

            <Section style={{ borderTop: '1px solid #eee', borderBottom: '1px solid #eee', margin: '20px 0' }}>
                <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                            <th align={isRtl ? 'right' : 'left'} style={{ padding: '10px 0', color: '#555' }}>{t.item}</th>
                            <th align="center" style={{ padding: '10px 0', color: '#555' }}>{t.qty}</th>
                            <th align={isRtl ? 'left' : 'right'} style={{ padding: '10px 0', color: '#555' }}>{t.price}</th>
                            <th align={isRtl ? 'left' : 'right'} style={{ padding: '10px 0', color: '#555' }}>{t.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(receipt.items || []).map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                <td align={isRtl ? 'right' : 'left'} style={{ padding: '10px 0' }}>{item.name || item.product_name}</td>
                                <td align="center" style={{ padding: '10px 0' }}>{item.quantity}</td>
                                <td align={isRtl ? 'left' : 'right'} style={{ padding: '10px 0' }}>{formatCurrency(item.unit_price)}</td>
                                <td align={isRtl ? 'left' : 'right'} style={{ padding: '10px 0', fontWeight: 'bold' }}>{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            <Section style={{ paddingRight: isRtl ? '0' : '20px', paddingLeft: isRtl ? '20px' : '0' }}>
                <Row>
                    <Column style={{ width: '50%' }} />
                    <Column style={{ width: '50%' }}>
                        <Row style={{ marginBottom: '5px' }}>
                            <Column align={isRtl ? 'right' : 'left'}><Text style={{ margin: 0, color: '#666' }}>{t.subtotal}</Text></Column>
                            <Column align={isRtl ? 'left' : 'right'}><Text style={{ margin: 0 }}>{formatCurrency(receipt.totals.subtotal)}</Text></Column>
                        </Row>
                        <Row style={{ marginBottom: '5px' }}>
                            <Column align={isRtl ? 'right' : 'left'}><Text style={{ margin: 0, color: '#666' }}>{t.tax}</Text></Column>
                            <Column align={isRtl ? 'left' : 'right'}><Text style={{ margin: 0 }}>{formatCurrency(receipt.totals.tax_amount)}</Text></Column>
                        </Row>
                        {receipt.totals.discount_amount > 0 && (
                            <Row style={{ marginBottom: '5px' }}>
                                <Column align={isRtl ? 'right' : 'left'}><Text style={{ margin: 0, color: '#10b981' }}>{t.discount}</Text></Column>
                                <Column align={isRtl ? 'left' : 'right'}><Text style={{ margin: 0, color: '#10b981' }}>-{formatCurrency(receipt.totals.discount_amount)}</Text></Column>
                            </Row>
                        )}
                        <Row style={{ marginTop: '10px', borderTop: '2px solid #333', paddingTop: '10px' }}>
                            <Column align={isRtl ? 'right' : 'left'}><Text style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{t.total}</Text></Column>
                            <Column align={isRtl ? 'left' : 'right'}><Text style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(receipt.totals.total)}</Text></Column>
                        </Row>
                    </Column>
                </Row>
            </Section>

            <Section style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
                <Text style={{ margin: '0 0 5px' }}><strong>{t.paymentMethod}:</strong> {receipt.sale.payment_method?.toUpperCase()}</Text>
                {receipt.sale.payment_method === 'cash' && receipt.sale.payment_details && (
                    <>
                        <Text style={{ margin: '0 0 5px' }}><strong>{t.cashReceived}:</strong> {formatCurrency(receipt.sale.payment_details.received || 0)}</Text>
                        <Text style={{ margin: '0' }}><strong>{t.change}:</strong> {formatCurrency(receipt.sale.payment_details.change || 0)}</Text>
                    </>
                )}
            </Section>

            {receipt.loyalty && receipt.loyalty.qr_code_data_url && (
                <Section align="center" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '15px' }}>{t.joinLoyalty}</Text>
                    <img
                        src={receipt.loyalty.qr_code_data_url}
                        alt="Loyalty QR"
                        style={{ width: '150px', height: '150px', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' }}
                    />
                </Section>
            )}

            <Section align="center" style={{ marginTop: '30px', color: '#666', fontSize: '14px' }}>
                <Text style={{ marginBottom: '5px' }}>{t.thankYou}</Text>
                <Text style={{ margin: 0, fontSize: '12px' }}>{receipt.footer.terms || ''}</Text>
            </Section>

            <EmailFooter
                companyName={businessName}
                language={language}
            />
        </EmailLayout>
    );
};

export default ReceiptEmail;
