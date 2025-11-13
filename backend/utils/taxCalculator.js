/**
 * Tax Calculator Utility for Saudi Arabia (15% VAT)
 * 
 * This module provides utility functions for calculating taxes according to
 * Saudi Arabia's Value Added Tax (VAT) regulations.
 * 
 * Key Information:
 * - Saudi Arabia VAT Rate: 15% (effective July 1, 2020)
 * - Previous rate: 5% (Jan 2018 - June 2020)
 * - Tax applies to most goods and services
 * 
 * Usage:
 * import { calculateTaxAmount, calculatePriceWithTax } from './taxCalculator.js'
 * 
 * const taxAmount = calculateTaxAmount(100) // Returns 15.00
 * const totalPrice = calculatePriceWithTax(100) // Returns 115.00
 */

// Constants
export const SAUDI_TAX_RATE = 15.00 // Percentage
export const SAUDI_TAX_MULTIPLIER = 0.15 // Decimal for calculations

/**
 * Calculate tax amount from base price
 * 
 * @param {number} amount - Base price (before tax)
 * @param {number} taxRate - Tax rate percentage (default: 15%)
 * @returns {number} Tax amount rounded to 2 decimal places
 * @throws {Error} If amount is negative or taxRate is invalid
 * 
 * @example
 * calculateTaxAmount(100) // Returns 15.00
 * calculateTaxAmount(100, 5) // Returns 5.00 (using 5% tax rate)
 */
export function calculateTaxAmount(amount, taxRate = SAUDI_TAX_RATE) {
  // Validation
  if (amount < 0) {
    throw new Error('Amount must be greater than or equal to 0')
  }
  
  if (taxRate < 0 || taxRate > 100) {
    throw new Error('Tax rate must be between 0 and 100')
  }
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Amount must be a valid number')
  }
  
  if (typeof taxRate !== 'number' || isNaN(taxRate)) {
    throw new Error('Tax rate must be a valid number')
  }
  
  // Calculate tax: amount × (taxRate / 100)
  const taxAmount = amount * (taxRate / 100)
  
  // Round to 2 decimal places
  return Math.round(taxAmount * 100) / 100
}

/**
 * Calculate final price including tax
 * 
 * @param {number} basePrice - Price before tax
 * @param {number} taxRate - Tax rate percentage (default: 15%)
 * @returns {number} Total price with tax, rounded to 2 decimal places
 * 
 * @example
 * calculatePriceWithTax(100) // Returns 115.00
 * calculatePriceWithTax(50, 5) // Returns 52.50
 */
export function calculatePriceWithTax(basePrice, taxRate = SAUDI_TAX_RATE) {
  const taxAmount = calculateTaxAmount(basePrice, taxRate)
  const total = basePrice + taxAmount
  
  // Round to 2 decimal places
  return Math.round(total * 100) / 100
}

/**
 * Extract base price from tax-inclusive price
 * 
 * Used when you have a final price (including tax) and need to determine
 * the base price before tax was added.
 * 
 * Formula: basePrice = priceWithTax / (1 + taxRate / 100)
 * 
 * @param {number} priceWithTax - Final price including tax
 * @param {number} taxRate - Tax rate percentage (default: 15%)
 * @returns {number} Base price without tax, rounded to 2 decimal places
 * 
 * @example
 * calculatePriceWithoutTax(115) // Returns 100.00
 * calculatePriceWithoutTax(52.50, 5) // Returns 50.00
 */
export function calculatePriceWithoutTax(priceWithTax, taxRate = SAUDI_TAX_RATE) {
  // Validation
  if (priceWithTax < 0) {
    throw new Error('Price must be greater than or equal to 0')
  }
  
  if (taxRate < 0 || taxRate > 100) {
    throw new Error('Tax rate must be between 0 and 100')
  }
  
  if (typeof priceWithTax !== 'number' || isNaN(priceWithTax)) {
    throw new Error('Price must be a valid number')
  }
  
  // Calculate base price: priceWithTax / (1 + taxRate / 100)
  const basePrice = priceWithTax / (1 + taxRate / 100)
  
  // Round to 2 decimal places
  return Math.round(basePrice * 100) / 100
}

/**
 * Calculate complete sale totals from array of items
 * 
 * This function is useful for calculating totals for a complete sale/invoice
 * with multiple line items.
 * 
 * @param {Array<Object>} items - Array of items with { quantity, unitPrice, taxRate }
 * @param {number} discountAmount - Total discount to apply (default: 0)
 * @returns {Object} Sale totals: { subtotal, taxAmount, discountAmount, total }
 * 
 * @example
 * const items = [
 *   { quantity: 2, unitPrice: 50, taxRate: 15 },
 *   { quantity: 1, unitPrice: 100, taxRate: 15 }
 * ]
 * calculateSaleTotals(items, 10)
 * // Returns: { subtotal: 200, taxAmount: 30, discountAmount: 10, total: 220 }
 */
export function calculateSaleTotals(items, discountAmount = 0) {
  // Validation
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array')
  }
  
  if (discountAmount < 0) {
    throw new Error('Discount amount must be greater than or equal to 0')
  }
  
  if (typeof discountAmount !== 'number' || isNaN(discountAmount)) {
    throw new Error('Discount amount must be a valid number')
  }
  
  let subtotal = 0
  let taxAmount = 0
  
  // Calculate subtotal and tax for each item
  items.forEach((item, index) => {
    // Validate item structure
    if (!item.quantity || !item.unitPrice) {
      throw new Error(`Item at index ${index} must have quantity and unitPrice`)
    }
    
    if (item.quantity < 0 || item.unitPrice < 0) {
      throw new Error(`Item at index ${index} has negative quantity or price`)
    }
    
    const itemTaxRate = item.taxRate !== undefined ? item.taxRate : SAUDI_TAX_RATE
    
    // Calculate item subtotal
    const itemSubtotal = item.quantity * item.unitPrice
    subtotal += itemSubtotal
    
    // Calculate item tax
    const itemTax = calculateTaxAmount(itemSubtotal, itemTaxRate)
    taxAmount += itemTax
  })
  
  // Round subtotal and taxAmount to 2 decimal places
  subtotal = Math.round(subtotal * 100) / 100
  taxAmount = Math.round(taxAmount * 100) / 100
  
  // Calculate final total: subtotal + tax - discount
  const total = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100
  
  return {
    subtotal,
    taxAmount,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total
  }
}

/**
 * Format amount as Saudi Riyal currency
 * 
 * @param {number} amount - Amount to format
 * @param {string} locale - Locale for formatting ('ar-SA' or 'en-US')
 * @returns {string} Formatted currency string
 * 
 * @example
 * formatSaudiCurrency(123.45) // Returns "123.45 SAR" (en-US locale)
 * formatSaudiCurrency(123.45, 'ar-SA') // Returns "١٢٣٫٤٥ ر.س" (Arabic locale)
 */
export function formatSaudiCurrency(amount, locale = 'en-US') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Amount must be a valid number')
  }
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    
    return formatter.format(amount)
  } catch (error) {
    // Fallback if Intl is not available or locale is invalid
    return `${amount.toFixed(2)} SAR`
  }
}

/**
 * Validate tax rate is within acceptable range
 * 
 * @param {number} taxRate - Tax rate to validate (percentage)
 * @returns {boolean} True if valid, false otherwise
 * 
 * @example
 * validateTaxRate(15) // Returns true
 * validateTaxRate(150) // Returns false
 */
export function validateTaxRate(taxRate) {
  if (typeof taxRate !== 'number' || isNaN(taxRate)) {
    return false
  }
  
  return taxRate >= 0 && taxRate <= 100
}

// Default export with all functions
export default {
  SAUDI_TAX_RATE,
  SAUDI_TAX_MULTIPLIER,
  calculateTaxAmount,
  calculatePriceWithTax,
  calculatePriceWithoutTax,
  calculateSaleTotals,
  formatSaudiCurrency,
  validateTaxRate
}
