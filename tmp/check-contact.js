const fetch = require('node-fetch'); // Or just use native fetch if Node >= 18

async function testContact() {
    try {
        const response = await fetch('http://localhost:3001/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                company: 'Test Co',
                subject: 'support',
                message: 'This is a test message.'
            })
        });
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Body:', text);
    } catch (err) {
        console.error('Error:', err);
    }
}

testContact();
