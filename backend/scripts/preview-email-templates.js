import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TemplateRenderer from '../utils/emailTemplateRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '../previews');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generatePreviews() {
    console.log('Generating email previews...');

    // 1. Receipt - English & Arabic
    const sampleReceipt = {
        sale: { sale_number: '12345', sale_date: new Date().toISOString(), payment_method: 'cash', payment_details: { received: 100, change: 10.5 } },
        business: { business_name: 'Coffee Shop', business_name_ar: 'مقهى', address: '123 Main St', city: 'Riyadh', phone: '0500000000', logo_url: 'https://placehold.co/100x100' },
        branch: { name: 'Downtown Branch' },
        items: [
            { name: 'Latte', quantity: 2, unit_price: 15.00, total: 30.00 },
            { name: 'Cheesecake', quantity: 1, unit_price: 25.00, total: 25.00 }
        ],
        totals: { subtotal: 55.00, tax_amount: 8.25, total: 63.25, discount_amount: 0 },
        footer: { terms: 'No refunds after 2 hours' },
        loyalty: { qr_code_data_url: 'https://placehold.co/150x150' }
    };

    const receiptEn = await TemplateRenderer.renderReceiptTemplate(sampleReceipt, 'en');
    fs.writeFileSync(path.join(outputDir, 'receipt-en.html'), receiptEn);
    console.log('Generated receipt-en.html');

    const receiptAr = await TemplateRenderer.renderReceiptTemplate(sampleReceipt, 'ar');
    fs.writeFileSync(path.join(outputDir, 'receipt-ar.html'), receiptAr);
    console.log('Generated receipt-ar.html');

    // 2. Welcome - English
    const welcomeData = { firstName: 'Ahmed' };
    const welcomeEn = await TemplateRenderer.renderNotificationTemplate('welcome', welcomeData, 'en');
    fs.writeFileSync(path.join(outputDir, 'welcome-en.html'), welcomeEn);
    console.log('Generated welcome-en.html');

    // 3. Payment Failure
    const failureData = {
        businessName: 'My Business',
        amount: '199',
        planType: 'Pro',
        retryCount: 1,
        nextRetryDate: '2025-02-10'
    };
    const failureEn = await TemplateRenderer.renderNotificationTemplate('payment-failure', failureData, 'en');
    fs.writeFileSync(path.join(outputDir, 'payment-failure-en.html'), failureEn);
    console.log('Generated payment-failure-en.html');

    const failureAr = await TemplateRenderer.renderNotificationTemplate('payment-failure', failureData, 'ar');
    fs.writeFileSync(path.join(outputDir, 'payment-failure-ar.html'), failureAr);
    console.log('Generated payment-failure-ar.html');

    // 4. Contact Form Notification
    const contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Tech Corp',
        subject: 'Inquiry about Enterprise Plan',
        message: 'Hello, I would like to know more about the enterprise features.\nSpecifically API access.',
        timestamp: new Date().toISOString()
    };
    const contactAdmin = await TemplateRenderer.renderTemplate('contact/ContactFormNotificationEmail', contactData, 'en');
    fs.writeFileSync(path.join(outputDir, 'contact-admin.html'), contactAdmin);

    const contactCustomerEn = await TemplateRenderer.renderTemplate('contact/ContactFormConfirmationEmail',
        { firstName: 'John', subject: contactData.subject, submissionData: { Name: 'John Doe', Message: 'Hello...' } }, 'en');
    fs.writeFileSync(path.join(outputDir, 'contact-customer-en.html'), contactCustomerEn);

    const contactCustomerAr = await TemplateRenderer.renderTemplate('contact/ContactFormConfirmationEmail',
        { firstName: 'أحمد', subject: 'استفسار عن الخطة', submissionData: { Name: 'أحمد علي', Message: 'مرحباً، أود معرفة المزيد...' } }, 'ar');
    fs.writeFileSync(path.join(outputDir, 'contact-customer-ar.html'), contactCustomerAr);
    console.log('Generated contact emails');

    console.log(`\nAll previews saved to ${outputDir}`);
}

generatePreviews().catch(console.error);
