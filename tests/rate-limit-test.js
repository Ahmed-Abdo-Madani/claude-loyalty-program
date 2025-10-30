import http from 'http';

const config = {
  baseURL: 'http://localhost:3001',
  // Rate limit is 100 requests per 15 minutes per IP
  requestsToTest: 150,
};

const results = {
  success: 0,
  rateLimited: 0,
  other: 0,
};

async function testRateLimit() {
  console.log('🚦 Rate Limiting Test');
  console.log('='.repeat(50));
  console.log(`Sending ${config.requestsToTest} rapid requests to test rate limiting...`);
  console.log('Server limit: 100 requests per 15 minutes per IP');
  console.log('');

  const promises = [];

  for (let i = 0; i < config.requestsToTest; i++) {
    promises.push(
      new Promise((resolve) => {
        http.get(`${config.baseURL}/api/business/stats`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 401) {
            results.success++;
          } else if (res.statusCode === 429) {
            results.rateLimited++;
          } else {
            results.other++;
          }
          res.resume(); // Drain the response
          resolve(res.statusCode);
        }).on('error', () => {
          results.other++;
          resolve('error');
        });
      })
    );
  }

  const statusCodes = await Promise.all(promises);

  console.log('📊 Results:');
  console.log('='.repeat(50));
  console.log(`Total Requests: ${config.requestsToTest}`);
  console.log(`Allowed Through: ${results.success}`);
  console.log(`Rate Limited (429): ${results.rateLimited}`);
  console.log(`Other Errors: ${results.other}`);
  console.log('');

  // Check when rate limiting kicked in
  const firstRateLimitIndex = statusCodes.findIndex(code => code === 429);
  if (firstRateLimitIndex !== -1) {
    console.log(`✅ Rate limiting activated after ${firstRateLimitIndex + 1} requests`);
    console.log(`   Expected: ~100 requests`);
    console.log(`   Actual: ${firstRateLimitIndex + 1} requests`);

    if (firstRateLimitIndex >= 90 && firstRateLimitIndex <= 110) {
      console.log('   ✅ Rate limit threshold is correct');
    } else {
      console.log('   ⚠️  Rate limit threshold differs from expected');
    }
  } else {
    console.log('❌ WARNING: No rate limiting detected!');
    console.log('   This could be a security issue.');
  }
}

testRateLimit().catch(console.error);
