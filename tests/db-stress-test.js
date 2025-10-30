import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const { Pool } = pg;

// Database pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'loyalty_platform_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // maximum pool size
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

const metrics = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  totalQueryTime: 0,
  minQueryTime: Infinity,
  maxQueryTime: 0,
  connectionErrors: 0,
  poolExhausted: 0,
};

// Test queries
const testQueries = [
  'SELECT COUNT(*) FROM businesses',
  'SELECT COUNT(*) FROM customers',
  'SELECT * FROM businesses LIMIT 10',
  'SELECT * FROM customers LIMIT 10',
  'SELECT b.*, COUNT(c.id) as customer_count FROM businesses b LEFT JOIN customers c ON b.id = c.business_id GROUP BY b.id LIMIT 5',
];

async function executeQuery(query) {
  const startTime = Date.now();
  let client;

  try {
    client = await pool.connect();
    const result = await client.query(query);
    const queryTime = Date.now() - startTime;

    metrics.totalQueries++;
    metrics.successfulQueries++;
    metrics.totalQueryTime += queryTime;
    metrics.minQueryTime = Math.min(metrics.minQueryTime, queryTime);
    metrics.maxQueryTime = Math.max(metrics.maxQueryTime, queryTime);

    return { success: true, queryTime, rows: result.rows.length };
  } catch (error) {
    const queryTime = Date.now() - startTime;
    metrics.totalQueries++;
    metrics.failedQueries++;
    metrics.totalQueryTime += queryTime;

    if (error.message.includes('connect')) {
      metrics.connectionErrors++;
    }
    if (error.message.includes('pool') || error.message.includes('timeout')) {
      metrics.poolExhausted++;
    }

    return { success: false, queryTime, error: error.message };
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function testConnectionPool() {
  console.log('💾 Database Connection Pool Stress Test');
  console.log('='.repeat(50));
  console.log(`Pool Config: Max=${pool.options.max}, Min=${pool.options.min}`);
  console.log('');

  const startTime = Date.now();
  const testDuration = 30000; // 30 seconds
  const concurrentRequests = 50;

  console.log(`Running ${concurrentRequests} concurrent queries for ${testDuration / 1000}s...`);

  const promises = [];

  while (Date.now() - startTime < testDuration) {
    for (let i = 0; i < concurrentRequests; i++) {
      const query = testQueries[Math.floor(Math.random() * testQueries.length)];
      promises.push(executeQuery(query));
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await Promise.all(promises);

  const duration = (Date.now() - startTime) / 1000;
  const avgQueryTime = metrics.totalQueryTime / metrics.totalQueries;

  console.log('\n📊 Results:');
  console.log('='.repeat(50));
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Total Queries: ${metrics.totalQueries}`);
  console.log(`Successful: ${metrics.successfulQueries} (${(metrics.successfulQueries / metrics.totalQueries * 100).toFixed(2)}%)`);
  console.log(`Failed: ${metrics.failedQueries} (${(metrics.failedQueries / metrics.totalQueries * 100).toFixed(2)}%)`);
  console.log(`\nQuery Performance:`);
  console.log(`   - Average: ${avgQueryTime.toFixed(2)}ms`);
  console.log(`   - Min: ${metrics.minQueryTime}ms`);
  console.log(`   - Max: ${metrics.maxQueryTime}ms`);
  console.log(`   - Throughput: ${(metrics.totalQueries / duration).toFixed(2)} queries/s`);
  console.log(`\nConnection Issues:`);
  console.log(`   - Connection Errors: ${metrics.connectionErrors}`);
  console.log(`   - Pool Exhaustion: ${metrics.poolExhausted}`);

  // Check pool status
  console.log(`\nPool Status:`);
  console.log(`   - Total Connections: ${pool.totalCount}`);
  console.log(`   - Idle Connections: ${pool.idleCount}`);
  console.log(`   - Waiting Requests: ${pool.waitingCount}`);

  await pool.end();

  if (metrics.failedQueries > metrics.totalQueries * 0.05) {
    console.log('\n❌ FAILED: More than 5% queries failed');
    process.exit(1);
  } else if (metrics.poolExhausted > 0) {
    console.log('\n⚠️  WARNING: Pool exhaustion detected');
  } else {
    console.log('\n✅ PASSED: Database pool handling load well');
  }
}

// Test query performance under load
async function testQueryPerformance() {
  console.log('\n\n🔍 Complex Query Performance Test');
  console.log('='.repeat(50));

  const complexQueries = [
    {
      name: 'Customer aggregation',
      query: `
        SELECT
          b.id, b.business_name,
          COUNT(DISTINCT c.id) as total_customers,
          COUNT(DISTINCT cp.id) as total_progress
        FROM businesses b
        LEFT JOIN customers c ON b.id = c.business_id
        LEFT JOIN customer_progress cp ON c.id = cp.customer_id
        GROUP BY b.id, b.business_name
      `
    },
    {
      name: 'Recent customer activity',
      query: `
        SELECT c.*, cp.stamps_earned, cp.tier_name
        FROM customers c
        LEFT JOIN customer_progress cp ON c.id = cp.customer_id
        WHERE c.created_at > NOW() - INTERVAL '30 days'
        ORDER BY c.created_at DESC
        LIMIT 100
      `
    },
  ];

  for (const test of complexQueries) {
    console.log(`\nTesting: ${test.name}`);
    const results = [];

    for (let i = 0; i < 10; i++) {
      const result = await executeQuery(test.query);
      results.push(result.queryTime);
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);

    console.log(`   - Average: ${avg.toFixed(2)}ms`);
    console.log(`   - Min: ${min}ms`);
    console.log(`   - Max: ${max}ms`);

    if (avg > 1000) {
      console.log(`   ⚠️  WARNING: Slow query (avg > 1s)`);
    }
  }

  await pool.end();
}

// Run tests
(async () => {
  try {
    await testConnectionPool();
    // await testQueryPerformance();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
