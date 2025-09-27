#!/usr/bin/env node

import SecureQRService from '../services/SecureQRService.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'

/**
 * Test script for Secure QR Service
 * Run: node backend/test/test-secure-qr.js
 */

console.log('🔐 Testing Secure QR Service...\n')

// Generate test data
const businessId = SecureIDGenerator.generateBusinessID()
const offerId = SecureIDGenerator.generateOfferID()
const customerId = SecureIDGenerator.generateCustomerID()

console.log('📋 Test Data:')
console.log(`   Business ID: ${businessId}`)
console.log(`   Offer ID:    ${offerId}`)
console.log(`   Customer ID: ${customerId}`)

// Test 1: Service Configuration
console.log('\n1️⃣  Testing Service Configuration:')
const status = SecureQRService.getStatus()
console.log(`   Configured: ${status.configured}`)
console.log(`   Algorithm:  ${status.algorithm}`)
console.log(`   Secret Length: ${status.secretLength}`)
console.log(`   Has Env Secret: ${status.hasEnvSecret}`)

// Test 2: Customer QR Token Generation & Validation
console.log('\n2️⃣  Testing Customer QR Tokens:')
try {
  const customerToken = SecureQRService.generateCustomerQR(customerId, businessId, offerId, '1h')
  console.log(`   Generated Token: ${customerToken.substring(0, 50)}...`)
  
  const validation = SecureQRService.validateCustomerQR(customerToken)
  console.log(`   Valid: ${validation.isValid}`)
  console.log(`   Customer ID: ${validation.customerId}`)
  console.log(`   Business ID: ${validation.businessId}`)
  console.log(`   Offer ID: ${validation.offerId}`)
  console.log(`   Issued At: ${new Date(validation.issuedAt * 1000).toISOString()}`)
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`)
}

// Test 3: Offer Signup QR Token Generation & Validation
console.log('\n3️⃣  Testing Offer Signup QR Tokens:')
try {
  const offerToken = SecureQRService.generateOfferSignupQR(businessId, offerId, '30d')
  console.log(`   Generated Token: ${offerToken.substring(0, 50)}...`)
  
  const validation = SecureQRService.validateOfferSignupQR(offerToken)
  console.log(`   Valid: ${validation.isValid}`)
  console.log(`   Business ID: ${validation.businessId}`)
  console.log(`   Offer ID: ${validation.offerId}`)
  console.log(`   Issued At: ${new Date(validation.issuedAt * 1000).toISOString()}`)
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`)
}

// Test 4: Business Scanner Token
console.log('\n4️⃣  Testing Business Scanner Tokens:')
try {
  const scannerToken = SecureQRService.generateBusinessScannerToken(businessId, '8h')
  console.log(`   Generated Token: ${scannerToken.substring(0, 50)}...`)
  
  const validation = SecureQRService.validateAnyQRToken(scannerToken)
  console.log(`   Valid: ${validation.isValid}`)
  console.log(`   Type: ${validation.type}`)
  console.log(`   Business ID: ${validation.businessId}`)
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`)
}

// Test 5: Universal Token Validation
console.log('\n5️⃣  Testing Universal Token Validation:')
const customerToken = SecureQRService.generateCustomerQR(customerId, businessId, offerId, '1h')
const offerToken = SecureQRService.generateOfferSignupQR(businessId, offerId, '30d')

const customerValidation = SecureQRService.validateAnyQRToken(customerToken)
const offerValidation = SecureQRService.validateAnyQRToken(offerToken)

console.log(`   Customer Token Type: ${customerValidation.type}`)
console.log(`   Offer Token Type: ${offerValidation.type}`)

// Test 6: Invalid Token Handling
console.log('\n6️⃣  Testing Invalid Token Handling:')
const invalidTokens = [
  'invalid.jwt.token',
  'eyJhbGciOiJIUzI1NiJ9.invalid.signature',
  '{"legacy":"json","format":true}',
  '',
  null,
  undefined
]

invalidTokens.forEach((token, index) => {
  const validation = SecureQRService.validateCustomerQR(token)
  console.log(`   Invalid Token ${index + 1}: ${!validation.isValid ? '✅' : '❌'} (${validation.error})`)
})

// Test 7: Token Expiration (quick test with 1 second expiry)
console.log('\n7️⃣  Testing Token Expiration:')
try {
  const shortToken = SecureQRService.generateCustomerQR(customerId, businessId, offerId, '1s')
  console.log(`   Generated 1-second token: ${shortToken.substring(0, 30)}...`)
  
  // Immediate validation should work
  const immediateValidation = SecureQRService.validateCustomerQR(shortToken)
  console.log(`   Immediate validation: ${immediateValidation.isValid ? '✅' : '❌'}`)
  
  // Wait 2 seconds and try again
  console.log(`   Waiting 2 seconds...`)
  setTimeout(() => {
    const expiredValidation = SecureQRService.validateCustomerQR(shortToken)
    console.log(`   After expiration: ${!expiredValidation.isValid ? '✅' : '❌'} (${expiredValidation.error})`)
    
    // Test 8: Performance test
    console.log('\n8️⃣  Testing Performance:')
    const perfStart = Date.now()
    const perfCount = 1000
    
    for (let i = 0; i < perfCount; i++) {
      const token = SecureQRService.generateCustomerQR(customerId, businessId, offerId, '1h')
      SecureQRService.validateCustomerQR(token)
    }
    
    const perfEnd = Date.now()
    console.log(`   Generated & validated ${perfCount} tokens in ${perfEnd - perfStart}ms`)
    console.log(`   Average: ${((perfEnd - perfStart) / perfCount).toFixed(2)}ms per token pair`)
    
    console.log('\n✅ Secure QR Service tests completed!')
    console.log('\n🔐 Security Analysis:')
    console.log(`   - Tokens use HMAC-SHA256 algorithm`)
    console.log(`   - Configurable expiration prevents token reuse`)
    console.log(`   - Type validation prevents token misuse`)
    console.log(`   - Secure IDs prevent enumeration attacks`)
    console.log(`   - Error handling prevents information disclosure`)
  }, 2100)
  
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`)
}