# Testing & Analysis Tools

This directory contains test scripts, analysis tools, test HTML files, and test output data for the loyalty platform.

## 📁 Directory Contents

### Test Scripts
- **Performance & Load Testing**
  - `stress-test.js` - System stress testing under high load
  - `rate-limit-test.js` - API rate limiting validation
  - `performance-test.js` - Performance benchmarking and profiling
  - `memory-leak-test.js` - Memory leak detection and monitoring
  - `db-stress-test.js` - Database stress testing

### Analysis Tools
- **Impact Analysis**
  - `analyze-ux-impact.js` - UX impact analysis for code changes
  - `analyze-ux-impact-standalone.js` - Standalone UX impact analyzer
  - `analyze-production-impact.js` - Production impact assessment
  - `analyze-bundle.js` - Bundle size analysis and optimization

### Test HTML Files
- **QR Code Testing**
  - `test-qr-scanning.html` - QR code scanning functionality test
  - `test-qr-business4.html` - Business QR code integration test
  - `test-final-qr.html` - Final QR code implementation test
  
- **API Testing**
  - `test-offer-api.html` - Offer API endpoint testing

### Test Output Data
- `memory-snapshots.json` - Memory profiling snapshots
- `location-service-ux-impact.json` - Location service UX impact results
- `location-service-production-impact.json` - Location service production impact results

## 🚀 Running Tests

### Performance Tests

**Stress Test**
```bash
node tests/stress-test.js
```
Tests system behavior under high concurrent load. Simulates multiple users accessing the platform simultaneously.

**Rate Limit Test**
```bash
node tests/rate-limit-test.js
```
Validates API rate limiting configuration and ensures proper throttling of excessive requests.

**Performance Test**
```bash
node tests/performance-test.js
```
Benchmarks key operations and identifies performance bottlenecks. Generates performance metrics.

**Memory Leak Test**
```bash
node tests/memory-leak-test.js
```
Monitors memory usage over time to detect potential memory leaks. Generates memory snapshots.

**Database Stress Test**
```bash
node tests/db-stress-test.js
```
Tests database performance under load. Validates connection pooling and query optimization.

### Analysis Tools

**UX Impact Analysis**
```bash
node tests/analyze-ux-impact.js
```
Analyzes user experience impact of code changes. Measures load time, bundle size, and rendering performance.

**Production Impact Analysis**
```bash
node tests/analyze-production-impact.js
```
Assesses production deployment impact. Evaluates resource usage, response times, and system stability.

**Bundle Analysis**
```bash
node tests/analyze-bundle.js
```
Analyzes JavaScript bundle size and composition. Identifies optimization opportunities.

### HTML Test Files

Open the HTML test files in a browser to test specific features:

**QR Code Testing**
```bash
# Open in browser
start tests/test-qr-scanning.html
```

**API Testing**
```bash
# Open in browser
start tests/test-offer-api.html
```

## 📊 Test Output

Test results are stored as JSON files in this directory:

- **memory-snapshots.json** - Contains memory usage data over time
- **location-service-ux-impact.json** - UX metrics for location service
- **location-service-production-impact.json** - Production metrics for location service

These files are generated automatically when running tests and are excluded from version control via `.gitignore`.

## 🧪 Test Coverage Areas

### Backend Testing
- API endpoint performance
- Database query optimization
- Rate limiting and throttling
- Memory management
- Concurrent request handling

### Frontend Testing
- QR code scanning functionality
- API integration
- Bundle size optimization
- Load time metrics
- User interaction flows

### Integration Testing
- Apple Wallet integration
- Google Wallet integration
- Branch manager workflows
- Customer progress tracking
- Wallet pass generation

## 📝 Adding New Tests

When adding new test files:

1. **Test Scripts** - Use descriptive names: `feature-test.js`
2. **HTML Tests** - Prefix with `test-`: `test-feature-name.html`
3. **Output Data** - Use `.json` extension for test results
4. **Documentation** - Update this README with test description

### Test Script Template

```javascript
// tests/my-feature-test.js
import { performance } from 'perf_hooks'

async function runTest() {
  console.log('🧪 Starting my-feature test...')
  
  const start = performance.now()
  
  try {
    // Your test logic here
    
    const duration = performance.now() - start
    console.log(`✅ Test completed in ${duration.toFixed(2)}ms`)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

runTest()
```

### HTML Test Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>Feature Test</title>
</head>
<body>
  <h1>Feature Test Page</h1>
  <div id="test-area"></div>
  
  <script>
    // Your test logic here
  </script>
</body>
</html>
```

## 🔍 Troubleshooting Tests

### Common Issues

**Test Fails to Connect to API**
- Ensure backend server is running on correct port
- Check environment variables are set correctly
- Verify network connectivity

**Memory Leak Test Shows False Positives**
- Run test multiple times to confirm
- Check for known V8 garbage collection patterns
- Review recent code changes for unclosed connections

**Bundle Analysis Missing Dependencies**
- Run `npm install` to ensure all dependencies are present
- Check that webpack is configured correctly
- Verify build output exists

### Getting Help

If tests fail unexpectedly:
1. Check test output logs for error messages
2. Review recent code changes that might affect the test
3. Consult [DEBUGGING-PLAN.md](../docs/guides/DEBUGGING-PLAN.md)
4. Check GitHub issues for known test failures

## 🎯 Best Practices

### Before Running Tests
- Ensure backend server is stopped (for server tests)
- Clear test database or use test environment
- Check that test data is properly seeded

### After Running Tests
- Review test output for warnings
- Archive important test results
- Update test scripts if behavior changes
- Document any new issues discovered

### Continuous Testing
- Run performance tests before major releases
- Monitor memory usage in production
- Track bundle size changes over time
- Validate rate limiting periodically

---

**Last Updated:** January 2025  
**Maintained By:** Development Team
