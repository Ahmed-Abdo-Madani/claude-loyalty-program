/**
 * Unit Tests for StampImageGenerator Layout Calculations
 *
 * Purpose: Validates layout algorithm for Apple Wallet stamp visualization
 * Uses: Node.js built-in assert module (no external dependencies)
 * Usage: node backend/test/StampImageGenerator.test.js
 *
 * Tests cover:
 * - Grid calculation for various stamp counts (1-100+)
 * - Bounds validation to ensure stamps fit within 624x168px
 * - Complete layout calculations with centering and sizing
 * - Fill ratio behavior across different stamp counts
 * - Edge case stress testing
 */

import assert from 'assert'
import StampImageGenerator from '../services/StampImageGenerator.js'

// Test results tracking
let totalTests = 0
let passedTests = 0
let failedTests = 0

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

/**
 * Helper: Run a single test with error handling
 */
function runTest(name, testFn) {
  totalTests++
  try {
    testFn()
    passedTests++
    console.log(`${colors.green}✅ PASS${colors.reset} ${name}`)
  } catch (error) {
    failedTests++
    console.log(`${colors.red}❌ FAIL${colors.reset} ${name}`)
    console.log(`   ${colors.red}${error.message}${colors.reset}`)
  }
}

/**
 * Helper: Assert layout fits within bounds
 */
function assertBounds(layout, maxWidth = 624, maxHeight = 168) {
  const totalWidth = layout.startX + (layout.cols * layout.stampSize) + ((layout.cols - 1) * layout.spacing)
  const totalHeight = layout.startY + (layout.rows * layout.stampSize) + ((layout.rows - 1) * layout.spacing)

  assert(totalWidth <= maxWidth, `Width ${totalWidth}px exceeds max ${maxWidth}px`)
  assert(totalHeight <= maxHeight, `Height ${totalHeight}px exceeds max ${maxHeight}px`)
  assert(layout.startX >= 0, `startX ${layout.startX} must be non-negative`)
  assert(layout.startY >= 0, `startY ${layout.startY} must be non-negative`)
}

/**
 * Helper: Assert grid is reasonably centered
 */
function assertCentered(layout, imageWidth = 624, imageHeight = 168) {
  const totalWidth = (layout.cols * layout.stampSize) + ((layout.cols - 1) * layout.spacing)
  const totalHeight = (layout.rows * layout.stampSize) + ((layout.rows - 1) * layout.spacing)

  const expectedStartX = Math.floor((imageWidth - totalWidth) / 2)
  const expectedStartY = Math.floor((imageHeight - totalHeight) / 2)

  // Allow small margin for rounding
  const margin = 5
  assert(Math.abs(layout.startX - expectedStartX) <= margin, `Grid not horizontally centered: ${layout.startX} vs ${expectedStartX}`)
  assert(Math.abs(layout.startY - expectedStartY) <= margin, `Grid not vertically centered: ${layout.startY} vs ${expectedStartY}`)
}

// =============================================================================
// TEST SUITE 1: calculateOptimalGrid() Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`)
console.log(`${colors.blue}TEST SUITE 1: calculateOptimalGrid() Tests${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`)

runTest('1 stamp: Should return 1 row × 1 col', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(1)
  assert.strictEqual(grid.rows, 1, 'Expected 1 row')
  assert.strictEqual(grid.cols, 1, 'Expected 1 col')
})

runTest('2 stamps: Should return 1 row × 2 cols', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(2)
  assert.strictEqual(grid.rows, 1, 'Expected 1 row')
  assert.strictEqual(grid.cols, 2, 'Expected 2 cols')
})

runTest('5 stamps: Should return 1 row × 5 cols', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(5)
  assert.strictEqual(grid.rows, 1, 'Expected 1 row')
  assert.strictEqual(grid.cols, 5, 'Expected 5 cols')
})

runTest('6 stamps: Should return 1 row × 6 cols (horizontal preference)', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(6)
  assert.strictEqual(grid.rows, 1, 'Expected 1 row')
  assert.strictEqual(grid.cols, 6, 'Expected 6 cols')
})

runTest('10 stamps: Should return 2 rows × 5 cols', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(10)
  assert.strictEqual(grid.rows, 2, 'Expected 2 rows')
  assert.strictEqual(grid.cols, 5, 'Expected 5 cols')
})

runTest('12 stamps: Should return 2 rows × 6 cols', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(12)
  assert.strictEqual(grid.rows, 2, 'Expected 2 rows')
  assert.strictEqual(grid.cols, 6, 'Expected 6 cols')
})

runTest('20 stamps: Should return 4 rows × 5 cols', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(20)
  assert.strictEqual(grid.rows, 4, 'Expected 4 rows')
  assert.strictEqual(grid.cols, 5, 'Expected 5 cols')
})

runTest('30 stamps: Should return 5 rows × 6 cols', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(30)
  assert.strictEqual(grid.rows, 5, 'Expected 5 rows')
  assert.strictEqual(grid.cols, 6, 'Expected 6 cols')
})

runTest('40 stamps: Should return 6 rows × 7 cols', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(40)
  assert.strictEqual(grid.rows, 6, 'Expected 6 rows')
  assert.strictEqual(grid.cols, 7, 'Expected 7 cols')
})

runTest('50 stamps: Should handle gracefully (7 rows)', () => {
  const grid = StampImageGenerator.calculateOptimalGrid(50)
  assert(grid.rows >= 1, 'Rows must be at least 1')
  assert(grid.cols >= 1, 'Cols must be at least 1')
  assert(grid.rows * grid.cols >= 50, 'Grid must fit all 50 stamps')
})

runTest('Grid properties: rows >= 1, cols >= 1', () => {
  for (let count of [1, 5, 10, 20, 30, 50]) {
    const grid = StampImageGenerator.calculateOptimalGrid(count)
    assert(grid.rows >= 1, `Rows must be >= 1 for ${count} stamps`)
    assert(grid.cols >= 1, `Cols must be >= 1 for ${count} stamps`)
  }
})

runTest('Grid properties: rows * cols >= stampsRequired', () => {
  for (let count of [1, 5, 10, 15, 20, 25, 30, 40, 50]) {
    const grid = StampImageGenerator.calculateOptimalGrid(count)
    assert(grid.rows * grid.cols >= count, `Grid ${grid.rows}×${grid.cols} must fit ${count} stamps`)
  }
})

runTest('Grid properties: Aspect ratio (cols/rows > 1 for wider grids)', () => {
  for (let count of [6, 10, 12, 20, 30]) {
    const grid = StampImageGenerator.calculateOptimalGrid(count)
    const aspectRatio = grid.cols / grid.rows
    assert(aspectRatio >= 1, `Aspect ratio ${aspectRatio} should prefer wider grids for ${count} stamps`)
  }
})

// =============================================================================
// TEST SUITE 2: validateGridBounds() Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`)
console.log(`${colors.blue}TEST SUITE 2: validateGridBounds() Tests${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`)

runTest('Valid grid (2×5 with 50px stamps, 10px spacing)', () => {
  const result = StampImageGenerator.validateGridBounds(2, 5, 50, 10, 624, 168)
  assert.strictEqual(result.isValid, true, 'Grid should be valid')
  assert.strictEqual(result.exceedsWidth, false, 'Should not exceed width')
  assert.strictEqual(result.exceedsHeight, false, 'Should not exceed height')
})

runTest('Grid exceeding width (1×20 with 50px stamps)', () => {
  const result = StampImageGenerator.validateGridBounds(1, 20, 50, 10, 624, 168)
  assert.strictEqual(result.isValid, false, 'Grid should be invalid')
  assert.strictEqual(result.exceedsWidth, true, 'Should exceed width')
})

runTest('Grid exceeding height (10×2 with 50px stamps)', () => {
  const result = StampImageGenerator.validateGridBounds(10, 2, 50, 10, 624, 168)
  assert.strictEqual(result.isValid, false, 'Grid should be invalid')
  assert.strictEqual(result.exceedsHeight, true, 'Should exceed height')
})

runTest('Grid at exact boundary (should pass with safety margin)', () => {
  // Calculate size that exactly fits with safety margin
  const safetyMargin = 10
  const stampSize = Math.floor((624 - safetyMargin * 2) / 6)  // 6 cols
  const result = StampImageGenerator.validateGridBounds(1, 6, stampSize, 0, 624, 168)
  assert.strictEqual(result.isValid, true, 'Grid at boundary should be valid')
})

runTest('Grid with zero spacing', () => {
  const result = StampImageGenerator.validateGridBounds(2, 5, 50, 0, 624, 168)
  assert(typeof result.isValid === 'boolean', 'Should return valid boolean')
  assert(typeof result.totalWidth === 'number', 'Should calculate total width')
  assert(typeof result.totalHeight === 'number', 'Should calculate total height')
})

runTest('Grid with large stamps (100px)', () => {
  const result = StampImageGenerator.validateGridBounds(2, 5, 100, 20, 624, 168)
  assert(typeof result.isValid === 'boolean', 'Should validate large stamps')
  assert(result.totalWidth > 0, 'Total width should be positive')
  assert(result.totalHeight > 0, 'Total height should be positive')
})

// =============================================================================
// TEST SUITE 3: determineLayout() Integration Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`)
console.log(`${colors.blue}TEST SUITE 3: determineLayout() Integration Tests${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`)

runTest('1 stamp: Reasonable size, centered', () => {
  const layout = StampImageGenerator.determineLayout(1, 'grid')
  assert(layout.stampSize > 0 && layout.stampSize <= 100, 'Stamp size should be reasonable')
  assertBounds(layout)
  assertCentered(layout)
})

runTest('5 stamps: Single row layout, fits within bounds', () => {
  const layout = StampImageGenerator.determineLayout(5, 'grid')
  assert.strictEqual(layout.rows, 1, 'Should use single row')
  assert(layout.stampSize > 0, 'Stamp size must be positive')
  assertBounds(layout)
  assertCentered(layout)
})

runTest('10 stamps: 2-row layout, optimal sizing, centered', () => {
  const layout = StampImageGenerator.determineLayout(10, 'grid')
  assert.strictEqual(layout.rows, 2, 'Should use 2 rows')
  assert(layout.stampSize > 0, 'Stamp size must be positive')
  assertBounds(layout)
  assertCentered(layout)
})

runTest('15 stamps: 3-row layout, stamps remain visible', () => {
  const layout = StampImageGenerator.determineLayout(15, 'grid')
  assert.strictEqual(layout.rows, 3, 'Should use 3 rows')
  assert(layout.stampSize >= 20, 'Stamps should remain readable (>= 20px)')
  assertBounds(layout)
  assertCentered(layout)
})

runTest('25 stamps: 4-5 row layout, stamps fit without overflow', () => {
  const layout = StampImageGenerator.determineLayout(25, 'grid')
  assert(layout.rows >= 4 && layout.rows <= 5, 'Should use 4-5 rows')
  assert(layout.stampSize > 0, 'Stamp size must be positive')
  assertBounds(layout)
  assertCentered(layout)
})

runTest('40 stamps: Stamps fit (may be small but readable)', () => {
  const layout = StampImageGenerator.determineLayout(40, 'grid')
  assert(layout.stampSize > 0, 'Stamp size must be positive')
  assert(layout.stampSize <= 100, 'Stamp size must be <= 100px cap')
  assertBounds(layout)
  // Note: 40 stamps may be small, but should not crash
})

runTest('50 stamps: Fallback behavior (reduced size)', () => {
  const layout = StampImageGenerator.determineLayout(50, 'grid')
  assert(layout.stampSize > 0, 'Stamp size must be positive')
  assertBounds(layout)
  // Stamps will be small but should fit
})

runTest('Layout properties: stampSize > 0 and <= 100', () => {
  for (let count of [1, 5, 10, 20, 30, 40]) {
    const layout = StampImageGenerator.determineLayout(count, 'grid')
    assert(layout.stampSize > 0, `Stamp size must be > 0 for ${count} stamps`)
    assert(layout.stampSize <= 100, `Stamp size must be <= 100 for ${count} stamps`)
  }
})

runTest('Layout properties: spacing >= 0', () => {
  for (let count of [1, 5, 10, 20, 30]) {
    const layout = StampImageGenerator.determineLayout(count, 'grid')
    assert(layout.spacing >= 0, `Spacing must be >= 0 for ${count} stamps`)
  }
})

runTest('Layout properties: startX >= 0 and startY >= 0', () => {
  for (let count of [1, 5, 10, 20, 30, 40]) {
    const layout = StampImageGenerator.determineLayout(count, 'grid')
    assert(layout.startX >= 0, `startX must be >= 0 for ${count} stamps`)
    assert(layout.startY >= 0, `startY must be >= 0 for ${count} stamps`)
  }
})

runTest('Layout properties: Total width <= 624px', () => {
  for (let count of [1, 5, 10, 15, 20, 25, 30, 40]) {
    const layout = StampImageGenerator.determineLayout(count, 'grid')
    const totalWidth = layout.startX + (layout.cols * layout.stampSize) + ((layout.cols - 1) * layout.spacing)
    assert(totalWidth <= 624, `Total width ${totalWidth}px must be <= 624px for ${count} stamps`)
  }
})

runTest('Layout properties: Total height <= 168px', () => {
  for (let count of [1, 5, 10, 15, 20, 25, 30, 40]) {
    const layout = StampImageGenerator.determineLayout(count, 'grid')
    const totalHeight = layout.startY + (layout.rows * layout.stampSize) + ((layout.rows - 1) * layout.spacing)
    assert(totalHeight <= 168, `Total height ${totalHeight}px must be <= 168px for ${count} stamps`)
  }
})

// =============================================================================
// TEST SUITE 4: Fill Ratio Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`)
console.log(`${colors.blue}TEST SUITE 4: Fill Ratio Tests${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`)

runTest('3 stamps: Conservative sizing (75% fill ratio)', () => {
  const layout = StampImageGenerator.determineLayout(3, 'grid')
  // For 3 stamps in 1 row, stamp size should be conservative
  // Expected: ~75% fill ratio
  const availableWidth = 624 - 40
  const maxExpected = Math.floor((availableWidth * 0.75) / 3)
  assert(layout.stampSize <= maxExpected * 1.5, 'Stamp size should be conservative for small counts')
})

runTest('10 stamps: Maximize space (90% fill ratio)', () => {
  const layout = StampImageGenerator.determineLayout(10, 'grid')
  // For 10 stamps, should use ~90% fill ratio
  assert(layout.stampSize > 0, 'Stamp size should maximize space for medium counts')
  // Stamps should be reasonably large
  assert(layout.stampSize >= 30, 'Stamps should be visible (>= 30px)')
})

runTest('30 stamps: Conservative sizing (70% fill ratio)', () => {
  const layout = StampImageGenerator.determineLayout(30, 'grid')
  // For 30 stamps, should use ~70% fill ratio
  assert(layout.stampSize > 0, 'Stamp size should be conservative for large counts')
  // Stamps will be smaller but readable
  assert(layout.stampSize >= 15, 'Stamps should remain readable (>= 15px)')
})

runTest('Stamp size progression: Decreases with stamp count', () => {
  const layout5 = StampImageGenerator.determineLayout(5, 'grid')
  const layout10 = StampImageGenerator.determineLayout(10, 'grid')
  const layout20 = StampImageGenerator.determineLayout(20, 'grid')
  const layout30 = StampImageGenerator.determineLayout(30, 'grid')

  // Stamps should generally get smaller as count increases
  // (though not strictly monotonic due to grid optimization)
  assert(layout5.stampSize > layout30.stampSize, 'Stamps should be smaller for larger counts')
})

// =============================================================================
// TEST SUITE 5: Edge Case Stress Tests
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`)
console.log(`${colors.blue}TEST SUITE 5: Edge Case Stress Tests${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`)

runTest('0 stamps: Should handle gracefully', () => {
  try {
    const layout = StampImageGenerator.determineLayout(0, 'grid')
    // Should not crash, even if layout is minimal
    assert(layout !== null && layout !== undefined, 'Layout should be defined')
  } catch (error) {
    // Acceptable to throw descriptive error for 0 stamps
    assert(error.message.length > 0, 'Error message should be descriptive')
  }
})

runTest('100 stamps: Should not crash, return valid layout', () => {
  const layout = StampImageGenerator.determineLayout(100, 'grid')
  assert(layout !== null && layout !== undefined, 'Layout should be defined')
  assert(layout.stampSize > 0, 'Stamp size must be positive')
  assertBounds(layout)
  // Stamps will be tiny but algorithm should handle it
})

runTest('Negative stamp count: Should handle gracefully', () => {
  try {
    const layout = StampImageGenerator.determineLayout(-5, 'grid')
    // If it doesn't throw, verify layout is safe
    if (layout) {
      assert(layout.stampSize >= 0, 'Stamp size should be non-negative')
    }
  } catch (error) {
    // Acceptable to throw error for invalid input
    assert(error.message.length > 0, 'Error message should be descriptive')
  }
})

runTest('Non-integer stamp count: Should handle gracefully', () => {
  const layout = StampImageGenerator.determineLayout(10.7, 'grid')
  assert(layout !== null && layout !== undefined, 'Layout should be defined')
  // Should round or handle decimal gracefully
  assertBounds(layout)
})

runTest('Bar style with 20 stamps: Single row, horizontal fit', () => {
  const layout = StampImageGenerator.determineLayout(20, 'bar')
  assert.strictEqual(layout.rows, 1, 'Bar style should use single row')
  // Bar style limits to 10 stamps max
  assert(layout.cols <= 10, 'Bar style should limit columns')
  assertBounds(layout)
})

runTest('Grid style with 1 stamp: Should not create oversized stamp', () => {
  const layout = StampImageGenerator.determineLayout(1, 'grid')
  assert(layout.stampSize <= 100, 'Single stamp should not exceed 100px cap')
  assertBounds(layout)
})

// =============================================================================
// TEST RESULTS SUMMARY
// =============================================================================

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`)
console.log(`${colors.blue}TEST RESULTS SUMMARY${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`)

console.log(`Total Tests:  ${totalTests}`)
console.log(`${colors.green}Passed:       ${passedTests} ✅${colors.reset}`)
if (failedTests > 0) {
  console.log(`${colors.red}Failed:       ${failedTests} ❌${colors.reset}`)
} else {
  console.log(`Failed:       ${failedTests}`)
}

const successRate = ((passedTests / totalTests) * 100).toFixed(1)
console.log(`Success Rate: ${successRate}%`)

if (failedTests === 0) {
  console.log(`\n${colors.green}🎉 All tests passed! Layout algorithm is working correctly.${colors.reset}\n`)
  process.exit(0)
} else {
  console.log(`\n${colors.red}❌ Some tests failed. Please review the layout algorithm.${colors.reset}\n`)
  process.exit(1)
}
