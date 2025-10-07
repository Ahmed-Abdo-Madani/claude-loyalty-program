import http from 'http';
import { URL } from 'url';

const config = {
  baseURL: process.env.API_URL || 'http://localhost:3001',
  testDuration: 60000, // 1 minute
  requestInterval: 100, // ms between requests
};

const memorySnapshots = [];
let requestCount = 0;

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function takeMemorySnapshot() {
  const usage = process.memoryUsage();
  const snapshot = {
    timestamp: Date.now(),
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    requestCount,
  };
  memorySnapshots.push(snapshot);
  return snapshot;
}

function makeRequest(path) {
  return new Promise((resolve) => {
    const url = new URL(path, config.baseURL);

    const req = http.request(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        requestCount++;
        resolve({ statusCode: res.statusCode });
      });
    });

    req.on('error', () => {
      requestCount++;
      resolve({ error: true });
    });

    req.setTimeout(5000);
    req.end();
  });
}

async function runMemoryLeakTest() {
  console.log('🔬 Memory Leak Detection Test');
  console.log('='.repeat(50));
  console.log(`Test Duration: ${config.testDuration / 1000}s`);
  console.log(`Request Interval: ${config.requestInterval}ms`);
  console.log('');

  const startTime = Date.now();
  const endpoints = ['/health', '/api/business/stats', '/api/customers'];

  // Take initial snapshot
  const initial = takeMemorySnapshot();
  console.log(`Initial Memory: ${formatBytes(initial.heapUsed)}`);

  // Run continuous requests
  const interval = setInterval(async () => {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    await makeRequest(endpoint);

    if (requestCount % 50 === 0) {
      const snapshot = takeMemorySnapshot();
      console.log(`[${requestCount} requests] Heap: ${formatBytes(snapshot.heapUsed)}, RSS: ${formatBytes(snapshot.rss)}`);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }, config.requestInterval);

  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, config.testDuration));
  clearInterval(interval);

  // Take final snapshot
  const final = takeMemorySnapshot();

  console.log('\n📊 Memory Analysis:');
  console.log('='.repeat(50));
  console.log(`Total Requests: ${requestCount}`);
  console.log(`\nInitial State:`);
  console.log(`   - Heap Used: ${formatBytes(initial.heapUsed)}`);
  console.log(`   - RSS: ${formatBytes(initial.rss)}`);
  console.log(`\nFinal State:`);
  console.log(`   - Heap Used: ${formatBytes(final.heapUsed)}`);
  console.log(`   - RSS: ${formatBytes(final.rss)}`);

  const heapGrowth = final.heapUsed - initial.heapUsed;
  const rssGrowth = final.rss - initial.rss;
  const heapGrowthPercent = (heapGrowth / initial.heapUsed * 100).toFixed(2);

  console.log(`\nMemory Growth:`);
  console.log(`   - Heap: ${formatBytes(heapGrowth)} (${heapGrowthPercent}%)`);
  console.log(`   - RSS: ${formatBytes(rssGrowth)}`);
  console.log(`   - Per Request: ${formatBytes(heapGrowth / requestCount)}`);

  // Analyze trend
  const midpoint = memorySnapshots[Math.floor(memorySnapshots.length / 2)];
  const midGrowth = midpoint.heapUsed - initial.heapUsed;
  const finalGrowthFromMid = final.heapUsed - midpoint.heapUsed;

  console.log(`\nGrowth Pattern:`);
  console.log(`   - First Half Growth: ${formatBytes(midGrowth)}`);
  console.log(`   - Second Half Growth: ${formatBytes(finalGrowthFromMid)}`);

  // Detect leak
  const leakThreshold = 1.5; // Growth ratio threshold
  if (finalGrowthFromMid > midGrowth * leakThreshold) {
    console.log('\n⚠️  WARNING: Potential memory leak detected!');
    console.log('   Memory growth is accelerating over time.');
  } else if (heapGrowth > 50 * 1024 * 1024) { // 50MB
    console.log('\n⚠️  WARNING: High memory growth detected!');
  } else {
    console.log('\n✅ PASSED: Memory usage appears stable');
  }

  // Export snapshots for analysis
  console.log(`\n📁 Memory snapshots saved to memory-snapshots.json`);
  await import('fs').then(fs => {
    fs.writeFileSync(
      'memory-snapshots.json',
      JSON.stringify(memorySnapshots, null, 2)
    );
  });
}

// Run test
runMemoryLeakTest().catch(console.error);
