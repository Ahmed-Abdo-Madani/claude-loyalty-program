import fs from 'fs';
import path from 'path';

function getFileSize(filepath) {
  const stats = fs.statSync(filepath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  console.log('📦 Frontend Bundle Analysis');
  console.log('='.repeat(60));

  const distDir = './dist';
  const assetsDir = path.join(distDir, 'assets');

  if (!fs.existsSync(distDir)) {
    console.log('❌ No dist directory found. Run "npm run build" first.');
    return;
  }

  const files = fs.readdirSync(assetsDir);
  let totalSize = 0;
  const bundles = [];

  files.forEach(file => {
    const filepath = path.join(assetsDir, file);
    const size = getFileSize(filepath);
    totalSize += size;

    bundles.push({
      name: file,
      size: size,
      type: file.endsWith('.css') ? 'CSS' : 'JS',
    });
  });

  bundles.sort((a, b) => b.size - a.size);

  console.log('\n📊 Bundle Breakdown:\n');
  console.log('Type'.padEnd(6) + 'Size'.padEnd(12) + 'File');
  console.log('-'.repeat(60));

  bundles.forEach(bundle => {
    console.log(
      bundle.type.padEnd(6) +
      formatBytes(bundle.size).padEnd(12) +
      bundle.name
    );
  });

  console.log('-'.repeat(60));
  console.log('TOTAL'.padEnd(6) + formatBytes(totalSize).padEnd(12));

  console.log('\n🔍 Analysis:\n');

  const jsSize = bundles.filter(b => b.type === 'JS').reduce((acc, b) => acc + b.size, 0);
  const cssSize = bundles.filter(b => b.type === 'CSS').reduce((acc, b) => acc + b.size, 0);
  const largestBundle = bundles[0];

  console.log(`Total JavaScript: ${formatBytes(jsSize)}`);
  console.log(`Total CSS: ${formatBytes(cssSize)}`);
  console.log(`Largest Bundle: ${largestBundle.name} (${formatBytes(largestBundle.size)})`);

  console.log('\n⚡ Performance Recommendations:\n');

  if (totalSize > 500 * 1024) {
    console.log('⚠️  Total bundle size > 500KB - Consider code splitting');
  } else if (totalSize > 300 * 1024) {
    console.log('⚠️  Total bundle size > 300KB - Monitoring recommended');
  } else {
    console.log('✅ Bundle size is acceptable (< 300KB)');
  }

  if (largestBundle.size > 200 * 1024) {
    console.log('⚠️  Largest bundle > 200KB - Consider lazy loading');
  }

  const vendorBundle = bundles.find(b => b.name.includes('vendor'));
  if (vendorBundle && vendorBundle.size > 150 * 1024) {
    console.log('⚠️  Vendor bundle > 150KB - Review dependencies');
  }

  // Check for code splitting
  const jsFiles = bundles.filter(b => b.type === 'JS').length;
  if (jsFiles === 1) {
    console.log('⚠️  Single JS bundle detected - No code splitting');
  } else {
    console.log(`✅ Code splitting: ${jsFiles} JS chunks`);
  }

  console.log('\n📱 Load Time Estimates (3G network ~750 KB/s):');
  const loadTime3G = (totalSize / (750 * 1024)) * 1000;
  console.log(`   3G: ~${loadTime3G.toFixed(0)}ms`);

  const loadTime4G = (totalSize / (3000 * 1024)) * 1000;
  console.log(`   4G: ~${loadTime4G.toFixed(0)}ms`);

  if (loadTime3G > 3000) {
    console.log('\n❌ WARNING: Load time on 3G > 3s - Optimization needed!');
  } else {
    console.log('\n✅ Load time acceptable on slower networks');
  }
}

analyzeBundle();
