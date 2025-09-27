#!/usr/bin/env node

import SecureIDGenerator from '../utils/secureIdGenerator.js'

/**
 * Test script for Secure ID Generator
 * Run: node backend/test/test-secure-ids.js
 */

console.log('🔒 Testing Secure ID Generator...\n')

// Test 1: Individual ID Generation
console.log('1️⃣  Testing Individual ID Generation:')
const businessId = SecureIDGenerator.generateBusinessID()
const offerId = SecureIDGenerator.generateOfferID()
const customerId = SecureIDGenerator.generateCustomerID()
const branchId = SecureIDGenerator.generateBranchID()

console.log(`   Business ID: ${businessId}`)
console.log(`   Offer ID:    ${offerId}`)
console.log(`   Customer ID: ${customerId}`)
console.log(`   Branch ID:   ${branchId}`)

// Test 2: ID Validation
console.log('\n2️⃣  Testing ID Validation:')
console.log(`   Business ID valid: ${SecureIDGenerator.validateSecureID(businessId, 'business')}`)
console.log(`   Offer ID valid:    ${SecureIDGenerator.validateSecureID(offerId, 'offer')}`)
console.log(`   Customer ID valid: ${SecureIDGenerator.validateSecureID(customerId, 'customer')}`)
console.log(`   Branch ID valid:   ${SecureIDGenerator.validateSecureID(branchId, 'branch')}`)

// Test 3: Invalid ID detection
console.log('\n3️⃣  Testing Invalid ID Detection:')
const invalidIds = ['123', 'biz_short', 'off_123456789012345678901234567890', 'invalid_format']
invalidIds.forEach(id => {
  console.log(`   "${id}" valid: ${SecureIDGenerator.validateSecureID(id, 'business')}`)
})

// Test 4: Type extraction
console.log('\n4️⃣  Testing Type Extraction:')
console.log(`   ${businessId} → ${SecureIDGenerator.getIDType(businessId)}`)
console.log(`   ${offerId} → ${SecureIDGenerator.getIDType(offerId)}`)
console.log(`   ${customerId} → ${SecureIDGenerator.getIDType(customerId)}`)
console.log(`   ${branchId} → ${SecureIDGenerator.getIDType(branchId)}`)

// Test 5: Uniqueness test (batch generation)
console.log('\n5️⃣  Testing Uniqueness (Batch Generation):')
const batchSize = 100
const businessBatch = SecureIDGenerator.generateBatch('business', batchSize)
const offerBatch = SecureIDGenerator.generateBatch('offer', batchSize)

console.log(`   Generated ${batchSize} business IDs:`)
console.log(`   - All unique: ${new Set(businessBatch).size === batchSize}`)
console.log(`   - All valid format: ${businessBatch.every(id => SecureIDGenerator.validateSecureID(id, 'business'))}`)
console.log(`   - Sample: ${businessBatch.slice(0, 3).join(', ')}...`)

console.log(`\n   Generated ${batchSize} offer IDs:`)
console.log(`   - All unique: ${new Set(offerBatch).size === batchSize}`)
console.log(`   - All valid format: ${offerBatch.every(id => SecureIDGenerator.validateSecureID(id, 'offer'))}`)
console.log(`   - Sample: ${offerBatch.slice(0, 3).join(', ')}...`)

// Test 6: Performance test
console.log('\n6️⃣  Testing Performance:')
const perfStart = Date.now()
const perfCount = 1000
for (let i = 0; i < perfCount; i++) {
  SecureIDGenerator.generateBusinessID()
  SecureIDGenerator.generateOfferID()
  SecureIDGenerator.generateCustomerID()
}
const perfEnd = Date.now()
console.log(`   Generated ${perfCount * 3} IDs in ${perfEnd - perfStart}ms`)
console.log(`   Average: ${((perfEnd - perfStart) / (perfCount * 3)).toFixed(2)}ms per ID`)

// Test 7: Collision resistance (statistical analysis)
console.log('\n7️⃣  Testing Collision Resistance:')
const collisionTestSize = 10000
const collisionTestIds = new Set()
for (let i = 0; i < collisionTestSize; i++) {
  collisionTestIds.add(SecureIDGenerator.generateBusinessID())
}

console.log(`   Generated ${collisionTestSize} business IDs`)
console.log(`   Unique IDs: ${collisionTestIds.size}`)
console.log(`   Collision rate: ${((collisionTestSize - collisionTestIds.size) / collisionTestSize * 100).toFixed(4)}%`)

console.log('\n✅ Secure ID Generator tests completed!')
console.log('\n🔐 Security Analysis:')
console.log(`   - Character space: 16^26 = ${(16**26).toExponential(2)} possible business/offer IDs`)
console.log(`   - Character space: 16^20 = ${(16**20).toExponential(2)} possible customer/branch IDs`)
console.log(`   - Enumeration attack difficulty: Computationally infeasible`)
console.log(`   - Format validation: Strict pattern matching prevents invalid IDs`)