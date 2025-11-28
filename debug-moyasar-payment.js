import MoyasarService from './backend/services/MoyasarService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

// If backend/.env doesn't exist or doesn't have the key, try root .env
if (!process.env.MOYASAR_SECRET_KEY) {
    dotenv.config();
}

const moyasarPaymentId = '0fb028dd-d69e-46c7-98ed-34af0e03671c';

async function debugPayment() {
    try {
        console.log('Fetching payment:', moyasarPaymentId);
        // We use fetchPaymentFromMoyasar directly to see the raw response
        const payment = await MoyasarService.fetchPaymentFromMoyasar(moyasarPaymentId);
        console.log('Payment fetched successfully');
        console.log('Status:', payment.status);
        console.log('Source:', JSON.stringify(payment.source, null, 2));
        
        if (payment.source && payment.source.token) {
            console.log('Token found:', payment.source.token);
        } else {
            console.log('Token NOT found in source');
        }
    } catch (error) {
        console.error('Error fetching payment:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

debugPayment();
