
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || 'your_webhook_secret';
const URL = 'http://localhost:3001/api/subscriptions/webhook'; // Ensure port matches your server

const payload = {
    meta: {
        event_name: "subscription_created",
        custom_data: {
            business_id: "biz_4a2be5ee708f7a8affa20db404"
        }
    },
    data: {
        id: "10001",
        type: "subscriptions",
        attributes: {
            store_id: 112233,
            customer_id: 998877,
            order_id: 555444,
            product_name: "Loyalty Pro",
            variant_name: "Monthly",
            variant_id: 1232165, // Match LEMONSQUEEZY_VARIANT_ID_LOYALTY_MONTHLY
            status: "active",
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            ends_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            test_mode: true
        }
    }
};

const payloadString = JSON.stringify(payload);
const hmac = crypto.createHmac('sha256', SECRET);
const digest = hmac.update(payloadString).digest('hex');

console.log(`Sending webhook to ${URL}...`);
console.log(`Signature: ${digest}`);

async function sendWebhook() {
    try {
        const response = await axios.post(URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': digest
            }
        });
        console.log('Response:', response.status, response.data);
    } catch (error) {
        console.error('Error:', error.response?.status, error.response?.data || error.message);
    }
}

sendWebhook();
