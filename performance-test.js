import http from 'http';

const config = {
  baseURL: 'http://localhost:3001',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 200,
  testDuration: 30000, // 30 seconds
};

const metrics = {
  requests: 0,
  success: 0,
  failed: 0,
  responseTimes: [],
  statusCodes: {},
  errors: {},
};

function makeHealthCheckRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = http.get(`${config.baseURL}/health`, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        metrics.requests++;
        metrics.responseTimes.push(responseTime);
        metrics.statusCodes[res.statusCode] = (metrics.statusCodes[res.statusCode] || 0) + 1;

        if (res.statusCode === 200) {
          metrics.success++;
        } else {
          metrics.failed++;
        }
        resolve({ statusCode: res.statusCode, responseTime });
      });
    });

    req.on('error', (error) => {
      metrics.requests++;
      metrics.failed++;
      const errorType = error.code || 'UNKNOWN';
      metrics.errors[errorType] = (metrics.errors[errorType] || 0) + 1;
      resolve({ error: errorType });
    });

    req.setTimeout(5000);
    req.on('timeout', () => {
      req.destroy();
      metrics.requests++;
      metrics.failed++;
      metrics.errors['TIMEOUT'] = (metrics.errors['TIMEOUT'] || 0) + 1;
      resolve({ error: 'TIMEOUT' });
    });
  });
}

async function runConcurrentRequests() {
  const promises = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    promises.push(
      (async () => {
        while (true) {
          await makeHealthCheckRequest();
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
        }
      })()
    );
  }
  return Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, config.testDuration))
  ]);
}

async function runPerformanceTest() {
  console.log('⚡ Performance & Load Test');
  console.log('='.repeat(50));
  console.log(`Concurrent Users: ${config.concurrentUsers}`);
  console.log(`Test Duration: ${config.testDuration / 1000}s`);
  console.log('Target Endpoint: /health');
  console.log('');
  console.log('Starting test...\n');

  const startTime = Date.now();
  await runConcurrentRequests();
  const duration = (Date.now() - startTime) / 1000;

  // Calculate statistics
  const sorted = metrics.responseTimes.sort((a, b) => a - b);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const throughput = metrics.requests / duration;
  const successRate = (metrics.success / metrics.requests * 100).toFixed(2);

  console.log('📊 Performance Test Results:');
  console.log('='.repeat(50));
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Total Requests: ${metrics.requests}`);
  console.log(`Successful: ${metrics.success} (${successRate}%)`);
  console.log(`Failed: ${metrics.failed}`);
  console.log('');
  console.log(`🚀 Throughput: ${throughput.toFixed(2)} req/s`);
  console.log('');
  console.log('⏱️  Response Times:');
  console.log(`   Average: ${avg.toFixed(2)}ms`);
  console.log(`   Min: ${min}ms`);
  console.log(`   P50 (Median): ${p50}ms`);
  console.log(`   P95: ${p95}ms`);
  console.log(`   P99: ${p99}ms`);
  console.log(`   Max: ${max}ms`);
  console.log('');

  if (Object.keys(metrics.statusCodes).length > 0) {
    console.log('📈 Status Codes:');
    Object.entries(metrics.statusCodes).forEach(([code, count]) => {
      console.log(`   ${code}: ${count} (${(count / metrics.requests * 100).toFixed(2)}%)`);
    });
  }

  if (Object.keys(metrics.errors).length > 0) {
    console.log('\n❌ Errors:');
    Object.entries(metrics.errors).forEach(([error, count]) => {
      console.log(`   ${error}: ${count}`);
    });
  }

  console.log('\n' + '='.repeat(50));

  // Performance evaluation
  if (successRate < 99) {
    console.log(`⚠️  WARNING: Success rate is ${successRate}% (target: >99%)`);
  }
  if (p95 > 100) {
    console.log(`⚠️  WARNING: P95 response time is ${p95}ms (target: <100ms)`);
  }
  if (throughput < 100) {
    console.log(`⚠️  WARNING: Throughput is ${throughput.toFixed(2)} req/s (target: >100 req/s)`);
  }

  if (successRate >= 99 && p95 <= 100 && throughput >= 100) {
    console.log('✅ EXCELLENT: All performance metrics within target');
  } else if (successRate >= 95 && p95 <= 200) {
    console.log('✅ GOOD: Performance is acceptable');
  } else {
    console.log('❌ NEEDS IMPROVEMENT: Performance below expectations');
  }
}

runPerformanceTest().catch(console.error);
