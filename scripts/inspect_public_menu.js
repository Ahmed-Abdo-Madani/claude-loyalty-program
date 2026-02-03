import axios from 'axios';

const BUSINESS_ID = 'biz_6e4e14a5dee957b1e6a04936df';
const API_URL = `http://localhost:3001/api/business/public/menu/${BUSINESS_ID}`;

async function inspectMenu() {
    try {
        console.log(`Fetching public menu from: ${API_URL}`);
        const response = await axios.get(API_URL);

        console.log('Business data in response:');
        const business = response.data.data.business;
        console.log(JSON.stringify(business, null, 2));

        if ('menu_phone' in business) {
            console.log(`✅ menu_phone is PRESENT in API response: "${business.menu_phone}"`);
        } else {
            console.log('❌ menu_phone is MISSING from API response');
        }
    } catch (error) {
        console.error('Error fetching menu:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Body:', error.response.data);
        }
    }
}

inspectMenu();
