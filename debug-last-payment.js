
import sequelize from './backend/config/database.js';
import { Payment } from './backend/models/index.js';

async function debugLastPayment() {
  try {
    const lastPayment = await Payment.findOne({
      order: [['created_at', 'DESC']],
      limit: 1
    });

    if (!lastPayment) {
      console.log('No payments found.');
      return;
    }

    console.log('Last Payment ID:', lastPayment.public_id);
    console.log('Moyasar ID:', lastPayment.moyasar_payment_id);
    console.log('Status:', lastPayment.status);
    
    if (lastPayment.metadata && lastPayment.metadata.moyasar_response) {
      const response = lastPayment.metadata.moyasar_response;
      console.log('Moyasar Response Source:', JSON.stringify(response.source, null, 2));
      
      if (response.source && response.source.token) {
        console.log('✅ Token found:', response.source.token);
      } else {
        console.log('❌ No token found in source.');
      }
    } else {
      console.log('No moyasar_response in metadata.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

debugLastPayment();
