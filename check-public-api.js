import http from 'http';

const identifier = 'biz_6e4e14a5dee957b1e6a04936df';
const url = `http://localhost:3001/api/business/public/menu/${identifier}?type=business`;

console.log(`Fetching ${url}...`);

http.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.success) {
                const business = json.data?.menu?.business || json.data?.business;

                console.log('✅ API Response Status: Success');
                if (business) {
                    console.log('Keys in business object:', Object.keys(business).filter(k => k.includes('url')));
                    console.log('Social URLs values:', {
                        facebook: business.facebook_url,
                        instagram: business.instagram_url,
                        twitter: business.twitter_url,
                        snapchat: business.snapchat_url
                    });
                } else {
                    console.log('❌ Could not find business object in response data.');
                }
            } else {
                console.log('❌ API Returned Failed:', json);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw data:', data.substring(0, 200));
        }
    });

}).on('error', (err) => {
    console.error('Error fetching menu:', err.message);
});
