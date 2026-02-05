import 'dotenv/config';
import EmailService from './services/EmailService.js';
import logger from './config/logger.js';

async function sendTest() {
    const targetEmail = 'toni91994@gmail.com';
    console.log(`🚀 Sending test Welcome Email to: ${targetEmail}`);

    try {
        const result = await EmailService.sendBusinessNotification(
            targetEmail,
            'Welcome to Madna Platform | مرحباً بك في منصة مدنة',
            '', // message handled by template
            {
                notificationType: 'welcome',
                notificationData: {
                    businessName: 'Madna Loyalty',
                    firstName: 'Toni'
                },
                language: 'ar' // Sending in Arabic as default premium experience
            }
        );

        console.log('✅ Email dispatched successfully!');
        console.log('Message ID:', result.externalId);
        console.log('Provider:', result.provider);
        console.log('\nUsage Stats:', EmailService.getUsageStats());

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        if (error.originalError) {
            console.error('Provider Error:', error.originalError);
        }
        process.exit(1);
    }
}

sendTest();
