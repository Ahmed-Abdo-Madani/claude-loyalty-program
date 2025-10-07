import http from 'http';
import https from 'https';
import { URL } from 'url';

// Configuration
const config = {
  baseURL: process.env.API_URL || 'http://localhost:3001',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 100,
  requestsPerUser: parseInt(process.env.REQUESTS_PER_USER) || 10,
  rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 5000, // ms
};

// Test endpoints (only public/unauthenticated ones for stress testing)
const endpoints = [
  { method: 'GET', path: '/health', name: 'Health Check' },
  { method: 'GET', path: '/api/wallet/pass/123', name: 'Get Pass' },
  { method: 'POST', path: '/api/business/login', name: 'Login Attempt', body: { business_id: 'test', password: 'test' } },
];

// Metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  statusCodes: {},
  errors: {},
  startTime: null,
  endTime: null,
};

// Make HTTP request
function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, config.baseURL);
    const client = url.protocol === 'https:' ? https : http;

    const startTime = Date.now();
    const postData = endpoint.body ? JSON.stringify(endpoint.body) : null;

    const req = client.request(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData ? Buffer.byteLength(postData) : 0,
      },
    }, (res) => {
      const responseTime = Date.now() - startTime;

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        metrics.totalRequests++;
        metrics.totalResponseTime += responseTime;
        metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
        metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);

        const statusCode = res.statusCode;
        metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

        if (statusCode >= 200 && statusCode < 300) {
          metrics.successfulRequests++;
        } else {
          metrics.failedRequests++;
        }

        resolve({ statusCode, responseTime, endpoint: endpoint.name });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.totalResponseTime += responseTime;

      const errorType = error.code || error.message;
      metrics.errors[errorType] = (metrics.errors[errorType] || 0) + 1;

      resolve({ error: errorType, responseTime, endpoint: endpoint.name });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.errors['TIMEOUT'] = (metrics.errors['TIMEOUT'] || 0) + 1;
      resolve({ error: 'TIMEOUT', responseTime, endpoint: endpoint.name });
    });

    req.setTimeout(30000); // 30 second timeout

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Simulate a single user
async function simulateUser(userId, delay) {
  await new Promise(resolve => setTimeout(resolve, delay));

  const promises = [];
  for (let i = 0; i < config.requestsPerUser; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    promises.push(makeRequest(endpoint));

    // Small delay between requests from same user
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  return Promise.all(promises);
}

// Run stress test
async function runStressTest() {
  console.log('🔥 Starting Stress Test...');
  console.log(`📊 Configuration:`);
  console.log(`   - Base URL: ${config.baseURL}`);
  console.log(`   - Concurrent Users: ${config.concurrentUsers}`);
  console.log(`   - Requests per User: ${config.requestsPerUser}`);
  console.log(`   - Total Requests: ${config.concurrentUsers * config.requestsPerUser}`);
  console.log(`   - Ramp-up Time: ${config.rampUpTime}ms`);
  console.log('');

  metrics.startTime = Date.now();

  const users = [];
  const delayBetweenUsers = config.rampUpTime / config.concurrentUsers;

  for (let i = 0; i < config.concurrentUsers; i++) {
    users.push(simulateUser(i, i * delayBetweenUsers));
  }

  await Promise.all(users);

  metrics.endTime = Date.now();

  // Print results
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const avgResponseTime = metrics.totalResponseTime / metrics.totalRequests;
  const requestsPerSecond = metrics.totalRequests / duration;

  console.log('\n📈 Stress Test Results:');
  console.log('='.repeat(50));
  console.log(`Total Duration: ${duration.toFixed(2)}s`);
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests} (${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)}%)`);
  console.log(`Failed: ${metrics.failedRequests} (${(metrics.failedRequests / metrics.totalRequests * 100).toFixed(2)}%)`);
  console.log(`\nThroughput: ${requestsPerSecond.toFixed(2)} req/s`);
  console.log(`\nResponse Times:`);
  console.log(`   - Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   - Min: ${metrics.minResponseTime}ms`);
  console.log(`   - Max: ${metrics.maxResponseTime}ms`);

  console.log(`\nStatus Codes:`);
  Object.entries(metrics.statusCodes).forEach(([code, count]) => {
    console.log(`   - ${code}: ${count} (${(count / metrics.totalRequests * 100).toFixed(2)}%)`);
  });

  if (Object.keys(metrics.errors).length > 0) {
    console.log(`\nErrors:`);
    Object.entries(metrics.errors).forEach(([error, count]) => {
      console.log(`   - ${error}: ${count}`);
    });
  }

  console.log('\n' + '='.repeat(50));

  // Determine if test passed
  const successRate = metrics.successfulRequests / metrics.totalRequests;
  if (successRate < 0.95) {
    console.log('❌ FAILED: Success rate below 95%');
    process.exit(1);
  } else if (avgResponseTime > 1000) {
    console.log('⚠️  WARNING: Average response time > 1s');
  } else {
    console.log('✅ PASSED: All metrics within acceptable range');
  }
}

// Database stress test
async function testDatabaseConnections() {
  console.log('\n💾 Testing Database Connection Pool...');

  const promises = [];
  const testDuration = 10000; // 10 seconds
  const startTime = Date.now();

  let dbRequests = 0;
  let dbSuccess = 0;
  let dbFailed = 0;

  while (Date.now() - startTime < testDuration) {
    const endpoint = endpoints.find(e => e.path.includes('/api/'));
    if (endpoint) {
      promises.push(
        makeRequest(endpoint).then(result => {
          dbRequests++;
          if (result.statusCode >= 200 && result.statusCode < 300) {
            dbSuccess++;
          } else {
            dbFailed++;
          }
        })
      );
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  await Promise.all(promises);

  console.log(`\nDatabase Pool Test Results:`);
  console.log(`   - Total DB Requests: ${dbRequests}`);
  console.log(`   - Successful: ${dbSuccess}`);
  console.log(`   - Failed: ${dbFailed}`);
  console.log(`   - Success Rate: ${(dbSuccess / dbRequests * 100).toFixed(2)}%`);
}

// Run tests
(async () => {
  try {
    await runStressTest();
    await testDatabaseConnections();
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
})();
