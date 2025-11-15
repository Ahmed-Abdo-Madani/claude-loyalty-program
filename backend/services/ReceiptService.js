import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Receipt from '../models/Receipt.js'
import Business from '../models/Business.js'
import Branch from '../models/Branch.js'
import Offer from '../models/Offer.js'
import Customer from '../models/Customer.js'
import SecureQRService from './SecureQRService.js'
import NotificationService from './NotificationService.js'
import logger from '../config/logger.js'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { Op } from 'sequelize'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

/**
 * Receipt Generation Service
 * Handles receipt content generation, PDF/thermal printing, and email delivery
 * Follows pattern from WalletPassService.js
 */
class ReceiptService {
  /**
   * Generate complete receipt content with business logo, items, and loyalty QR
   * @param {string} saleId - Sale public_id
   * @param {object} options - Generation options
   * @param {object} options.transaction - Sequelize transaction (required when called within a transaction)
   * @returns {Promise<object>} - Complete receipt content
   */
  static async generateReceiptContent(saleId, options = {}) {
    try {
      logger.debug('Generating receipt content', { saleId })

      // Extract transaction from options
      const { transaction } = options

      // Fetch sale with all associations
      const sale = await Sale.findOne({
        where: { public_id: saleId },
        transaction, // Pass transaction to query
        include: [
          {
            model: SaleItem,
            as: 'items',
            attributes: ['product_name', 'product_sku', 'quantity', 'unit_price', 'tax_rate', 'subtotal', 'tax_amount', 'total']
          },
          {
            model: Business,
            as: 'business',
            attributes: ['public_id', 'business_name', 'business_name_ar', 'logo_url', 'address', 'city', 'district', 'phone']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['public_id', 'name', 'address']
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['customer_id', 'phone']
          },
          {
            model: Receipt,
            as: 'receipt',
            attributes: ['id', 'receipt_number', 'format', 'printed_at', 'emailed_at', 'print_count']
          }
        ]
      })

      if (!sale) {
        throw new Error(`Sale not found: ${saleId}`)
      }

      // Generate loyalty QR code if requested
      let loyaltyData = null
      if (options.includeLoyaltyQR !== false) {
        try {
          loyaltyData = await this.generateLoyaltyQR(sale.business.public_id)
        } catch (error) {
          logger.warn('Failed to generate loyalty QR', { error: error.message })
        }
      }

      // Build receipt content
      const receiptContent = {
        business: {
          name: sale.business.business_name,
          name_ar: sale.business.business_name_ar,
          logo_url: sale.business.logo_url,
          address: sale.business.address,
          city: sale.business.city,
          district: sale.business.district,
          phone: sale.business.phone
        },
        branch: {
          name: sale.branch.name,
          address: sale.branch.address
        },
        sale: {
          sale_number: sale.sale_number,
          sale_date: sale.sale_date,
          payment_method: sale.payment_method,
          payment_details: sale.payment_details || {}
        },
        items: sale.items.map(item => ({
          name: item.product_name,
          name_ar: null, // Can be derived from product if needed
          sku: item.product_sku,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          tax_rate: parseFloat(item.tax_rate),
          subtotal: parseFloat(item.subtotal),
          tax_amount: parseFloat(item.tax_amount),
          total: parseFloat(item.total)
        })),
        totals: {
          subtotal: parseFloat(sale.subtotal),
          tax_amount: parseFloat(sale.tax_amount),
          discount_amount: parseFloat(sale.discount_amount || 0),
          total: parseFloat(sale.total_amount)
        },
        loyalty: loyaltyData,
        footer: {
          thank_you_message: 'Thank you for your business!',
          terms: 'All sales are final. Please keep this receipt for your records.'
        },
        customer: sale.customer ? {
          name: sale.customer.name,
          phone: sale.customer.phone
        } : null
      }

      logger.debug('Receipt content generated successfully', { 
        saleId, 
        itemCount: receiptContent.items.length,
        hasLoyaltyQR: !!loyaltyData
      })

      return receiptContent

    } catch (error) {
      logger.error('Failed to generate receipt content', { 
        saleId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Generate loyalty QR code for customer signup
   * @param {string} businessId - Business public_id
   * @returns {Promise<object|null>} - QR code data or null if no offers
   */
  static async generateLoyaltyQR(businessId) {
    try {
      // Find first active offer for business
      const offer = await Offer.findOne({
        where: {
          business_id: businessId,
          status: 'active'
        },
        order: [['created_at', 'DESC']]
      })

      if (!offer) {
        logger.debug('No active offers found for loyalty QR', { businessId })
        return null
      }

      // Generate JWT token for offer signup
      const qrToken = SecureQRService.generateOfferSignupQR(
        businessId,
        offer.public_id,
        '90d' // Token valid for 90 days
      )

      // Create signup URL
      const signupUrl = `${FRONTEND_URL}/join/${offer.public_id}?token=${qrToken}`

      // Generate QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(signupUrl, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M'
      })

      return {
        qr_code_data_url: qrCodeDataUrl,
        signup_url: signupUrl,
        offer_id: offer.public_id
      }

    } catch (error) {
      logger.error('Failed to generate loyalty QR', { 
        businessId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Generate PDF receipt
   * @param {string} saleId - Sale public_id
   * @param {string} format - PDF format ('a4' | 'thermal')
   * @returns {Promise<Buffer>} - PDF buffer
   */
  static async generatePDFReceipt(saleId, format = 'a4') {
    try {
      logger.debug('Generating PDF receipt', { saleId, format })

      // Get receipt content
      const receipt = await this.generateReceiptContent(saleId)

      // Create PDF document with appropriate page size
      const pageSize = format === 'thermal' 
        ? { width: 226, height: 3000 } // 58mm thermal roll
        : 'A4' // Standard A4

      const doc = new PDFDocument({
        size: pageSize,
        margins: { top: 20, bottom: 20, left: 20, right: 20 }
      })

      // Create buffer to store PDF
      const chunks = []
      doc.on('data', chunk => chunks.push(chunk))
      const pdfPromise = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
      })

      // Build PDF layout
      let yPos = 40

      // Header - Business Logo
      if (receipt.business.logo_url) {
        try {
          const logoBuffer = await this.fetchBusinessLogo(receipt.business.logo_url)
          if (logoBuffer) {
            doc.image(logoBuffer, doc.page.width / 2 - 40, yPos, { width: 80 })
            yPos += 90
          }
        } catch (error) {
          logger.warn('Could not embed logo in PDF', { error: error.message })
        }
      }

      // Business Name
      doc.fontSize(18).font('Helvetica-Bold')
         .text(receipt.business.business_name, 20, yPos, { align: 'center' })
      yPos += 25

      // Business Address
      doc.fontSize(10).font('Helvetica')
         .text(`${receipt.business.address}, ${receipt.business.city}`, 20, yPos, { align: 'center' })
      yPos += 15
      doc.text(receipt.business.phone, 20, yPos, { align: 'center' })
      yPos += 25

      // Separator
      doc.moveTo(20, yPos).lineTo(doc.page.width - 20, yPos).stroke()
      yPos += 15

      // Sale Info
      doc.fontSize(10).font('Helvetica-Bold')
         .text(`Receipt #: ${receipt.sale.sale_number}`, 20, yPos)
      yPos += 15
      doc.font('Helvetica')
         .text(`Date: ${this.formatDate(receipt.sale.sale_date)}`, 20, yPos)
      yPos += 15
      doc.text(`Branch: ${receipt.branch.name}`, 20, yPos)
      yPos += 20

      // Separator
      doc.moveTo(20, yPos).lineTo(doc.page.width - 20, yPos).stroke()
      yPos += 15

      // Items Table Header
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Item', 20, yPos)
      doc.text('Qty', doc.page.width - 180, yPos, { width: 40, align: 'center' })
      doc.text('Price', doc.page.width - 140, yPos, { width: 60, align: 'right' })
      doc.text('Total', doc.page.width - 80, yPos, { width: 60, align: 'right' })
      yPos += 20

      // Items
      doc.font('Helvetica')
      for (const item of receipt.items) {
        doc.text(item.name, 20, yPos, { width: doc.page.width - 220 })
        doc.text(item.quantity.toString(), doc.page.width - 180, yPos, { width: 40, align: 'center' })
        doc.text(this.formatCurrency(item.unit_price), doc.page.width - 140, yPos, { width: 60, align: 'right' })
        doc.text(this.formatCurrency(item.total), doc.page.width - 80, yPos, { width: 60, align: 'right' })
        yPos += 20
      }

      // Separator
      yPos += 5
      doc.moveTo(20, yPos).lineTo(doc.page.width - 20, yPos).stroke()
      yPos += 15

      // Totals
      doc.fontSize(10).font('Helvetica')
      doc.text('Subtotal:', 20, yPos)
      doc.text(this.formatCurrency(receipt.totals.subtotal), doc.page.width - 80, yPos, { width: 60, align: 'right' })
      yPos += 15

      doc.text('Tax (15%):', 20, yPos)
      doc.text(this.formatCurrency(receipt.totals.tax_amount), doc.page.width - 80, yPos, { width: 60, align: 'right' })
      yPos += 15

      if (receipt.totals.discount_amount > 0) {
        doc.text('Discount:', 20, yPos)
        doc.text(`-${this.formatCurrency(receipt.totals.discount_amount)}`, doc.page.width - 80, yPos, { width: 60, align: 'right' })
        yPos += 15
      }

      // Separator
      doc.moveTo(20, yPos).lineTo(doc.page.width - 20, yPos).stroke()
      yPos += 10

      // Grand Total
      doc.fontSize(14).font('Helvetica-Bold')
      doc.text('TOTAL:', 20, yPos)
      doc.text(this.formatCurrency(receipt.totals.total), doc.page.width - 80, yPos, { width: 60, align: 'right' })
      yPos += 25

      // Separator
      doc.fontSize(10).font('Helvetica')
      doc.moveTo(20, yPos).lineTo(doc.page.width - 20, yPos).stroke()
      yPos += 15

      // Payment Info
      doc.text(`Payment Method: ${receipt.sale.payment_method.toUpperCase()}`, 20, yPos)
      yPos += 15

      if (receipt.sale.payment_method === 'cash' && receipt.sale.payment_details) {
        doc.text(`Cash Received: ${this.formatCurrency(receipt.sale.payment_details.received || 0)}`, 20, yPos)
        yPos += 15
        doc.text(`Change: ${this.formatCurrency(receipt.sale.payment_details.change || 0)}`, 20, yPos)
        yPos += 20
      }

      // Loyalty QR Code
      if (receipt.loyalty && receipt.loyalty.qr_code_data_url) {
        yPos += 10
        doc.fontSize(10).font('Helvetica')
           .text('Scan to join our loyalty program', 20, yPos, { align: 'center' })
        yPos += 15

        // Convert data URL to buffer and embed
        try {
          const qrBuffer = Buffer.from(receipt.loyalty.qr_code_data_url.split(',')[1], 'base64')
          doc.image(qrBuffer, doc.page.width / 2 - 60, yPos, { width: 120 })
          yPos += 130
        } catch (error) {
          logger.warn('Could not embed QR code in PDF', { error: error.message })
        }
      }

      // Footer
      yPos += 10
      doc.fontSize(9).font('Helvetica')
         .text(receipt.footer.thank_you_message, 20, yPos, { align: 'center' })
      yPos += 20
      doc.fontSize(8)
         .text(receipt.footer.terms, 20, yPos, { align: 'center', width: doc.page.width - 40 })

      // Finalize PDF
      doc.end()

      const pdfBuffer = await pdfPromise
      logger.info('PDF receipt generated successfully', { saleId, size: pdfBuffer.length })

      return pdfBuffer

    } catch (error) {
      logger.error('Failed to generate PDF receipt', { 
        saleId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Generate thermal receipt (ESC/POS commands)
   * Generates basic ESC/POS command buffer for thermal printers
   * @param {string} saleId - Sale public_id
   * @returns {Promise<Buffer>} - ESC/POS command buffer
   */
  static async generateThermalReceipt(saleId) {
    try {
      logger.info('Generating thermal receipt', { saleId })

      // Get receipt content
      const receipt = await this.generateReceiptContent(saleId)

      // ESC/POS Command constants
      const ESC = '\x1B'
      const GS = '\x1D'
      const LF = '\n'
      
      // Initialize printer
      let commands = ESC + '@' // Initialize
      
      // Center align
      commands += ESC + 'a' + '\x01'
      
      // Business name (double height, bold)
      commands += ESC + '!' + '\x38' // Bold + Double height + Double width
      commands += receipt.business.business_name + LF
      commands += ESC + '!' + '\x00' // Reset
      commands += LF
      
      // Business address
      commands += receipt.business.address + ', ' + receipt.business.city + LF
      commands += receipt.business.phone + LF
      commands += LF
      
      // Separator line
      commands += '----------------------------------------' + LF
      
      // Left align for receipt details
      commands += ESC + 'a' + '\x00'
      commands += LF
      
      // Receipt number and date
      commands += ESC + '!' + '\x08' // Bold
      commands += 'Receipt #: ' + receipt.sale.sale_number + LF
      commands += ESC + '!' + '\x00' // Reset
      commands += 'Date: ' + this.formatDate(receipt.sale.sale_date) + LF
      commands += 'Branch: ' + receipt.branch.name + LF
      commands += LF
      
      // Separator
      commands += '----------------------------------------' + LF
      
      // Items
      for (const item of receipt.items) {
        commands += item.name + LF
        commands += '  ' + item.quantity + ' x ' + item.unit_price.toFixed(2)
        commands += ' = ' + item.total.toFixed(2) + ' SAR' + LF
      }
      
      commands += LF
      commands += '----------------------------------------' + LF
      
      // Totals (right align amounts)
      commands += 'Subtotal:' + ' '.repeat(20) + receipt.totals.subtotal.toFixed(2) + ' SAR' + LF
      commands += 'Tax (15%):' + ' '.repeat(19) + receipt.totals.tax_amount.toFixed(2) + ' SAR' + LF
      
      if (receipt.totals.discount_amount > 0) {
        commands += 'Discount:' + ' '.repeat(20) + '-' + receipt.totals.discount_amount.toFixed(2) + ' SAR' + LF
      }
      
      commands += '----------------------------------------' + LF
      
      // Grand total (bold, double height)
      commands += ESC + '!' + '\x38' // Bold + Double height + Double width
      commands += 'TOTAL: ' + receipt.totals.total.toFixed(2) + ' SAR' + LF
      commands += ESC + '!' + '\x00' // Reset
      commands += LF
      
      // Payment method
      commands += '----------------------------------------' + LF
      commands += 'Payment: ' + receipt.sale.payment_method.toUpperCase() + LF
      
      if (receipt.sale.payment_method === 'cash' && receipt.sale.payment_details) {
        commands += 'Cash Received: ' + (receipt.sale.payment_details.received || 0).toFixed(2) + ' SAR' + LF
        commands += 'Change: ' + (receipt.sale.payment_details.change || 0).toFixed(2) + ' SAR' + LF
      }
      
      commands += LF
      
      // QR Code for loyalty (if available)
      if (receipt.loyalty && receipt.loyalty.signup_url) {
        // Center align for QR
        commands += ESC + 'a' + '\x01'
        commands += LF
        commands += 'Scan to join loyalty program' + LF
        
        // QR Code command (Model 2, Error correction L, size 6)
        // Store QR data
        const qrData = receipt.loyalty.signup_url
        const qrDataLength = qrData.length
        const pL = qrDataLength % 256
        const pH = Math.floor(qrDataLength / 256)
        
        // QR Code: Set model
        commands += GS + '(k' + '\x04\x00' + '1A2\x00'
        // QR Code: Set size
        commands += GS + '(k' + '\x03\x00' + '1C' + '\x06'
        // QR Code: Set error correction
        commands += GS + '(k' + '\x03\x00' + '1E0'
        // QR Code: Store data
        commands += GS + '(k' + String.fromCharCode(pL + 3, pH) + '1P0' + qrData
        // QR Code: Print
        commands += GS + '(k' + '\x03\x00' + '1Q0'
        commands += LF + LF
      }
      
      // Footer
      commands += ESC + 'a' + '\x01' // Center
      commands += 'Thank you for your business!' + LF
      commands += LF + LF
      
      // Cut paper
      commands += GS + 'V' + '\x41' + '\x03' // Partial cut
      
      logger.info('Thermal receipt ESC/POS commands generated', { saleId, size: commands.length })
      return Buffer.from(commands, 'binary')

    } catch (error) {
      logger.error('Failed to generate thermal receipt', { 
        saleId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Email receipt to customer
   * @param {string} saleId - Sale public_id
   * @param {string} recipientEmail - Customer email
   * @param {object} options - Email options
   * @returns {Promise<object>} - Email result
   */
  static async emailReceipt(saleId, recipientEmail, options = {}) {
    try {
      logger.info('Emailing receipt', { saleId, recipientEmail })

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(recipientEmail)) {
        throw new Error('Invalid email format')
      }

      // Generate PDF receipt
      const pdfBuffer = await this.generatePDFReceipt(saleId, 'a4')

      // Get receipt content for email body
      const receipt = await this.generateReceiptContent(saleId)

      // Build HTML email template
      const emailHTML = this.buildReceiptEmailHTML(receipt)

      // Create customer object for NotificationService
      const customer = {
        email: recipientEmail,
        name: receipt.customer?.name || 'Valued Customer'
      }

      // Prepare email message
      const message = {
        subject: `Receipt #${receipt.sale.sale_number} - ${receipt.business.business_name}`,
        html: emailHTML,
        text: `Your receipt #${receipt.sale.sale_number} is attached.`
      }

      // Send email with PDF attachment (instantiate NotificationService)
      const notificationService = new NotificationService()
      const emailResult = await notificationService.sendEmail(customer, message, {
        attachments: [
          {
            filename: `receipt-${receipt.sale.sale_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      })

      if (emailResult.success) {
        // Update receipt record
        const receiptRecord = await Receipt.findOne({
          where: { sale_id: saleId }
        })

        if (receiptRecord) {
          await receiptRecord.markAsEmailed(recipientEmail)
        }

        logger.info('Receipt emailed successfully', { saleId, recipientEmail })
      }

      return emailResult

    } catch (error) {
      logger.error('Failed to email receipt', { 
        saleId, 
        recipientEmail,
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Build HTML email template for receipt
   * @param {object} receipt - Receipt content
   * @returns {string} - HTML string
   */
  static buildReceiptEmailHTML(receipt) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 120px; margin-bottom: 10px; }
          .business-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .business-info { font-size: 14px; color: #666; }
          .receipt-info { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          .items-table td { padding: 10px; border-bottom: 1px solid #eee; }
          .totals { margin: 20px 0; }
          .totals-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          .loyalty-section { text-align: center; margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${receipt.business.logo_url ? `<img src="${receipt.business.logo_url}" alt="Logo" class="logo">` : ''}
            <div class="business-name">${receipt.business.business_name}</div>
            <div class="business-info">
              ${receipt.business.address}, ${receipt.business.city}<br>
              ${receipt.business.phone}
            </div>
          </div>

          <div class="receipt-info">
            <strong>Receipt #:</strong> ${receipt.sale.sale_number}<br>
            <strong>Date:</strong> ${this.formatDate(receipt.sale.sale_date)}<br>
            <strong>Branch:</strong> ${receipt.branch.name}
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">${this.formatCurrency(item.unit_price)}</td>
                  <td style="text-align: right;">${this.formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(receipt.totals.subtotal)}</span>
            </div>
            <div class="totals-row">
              <span>Tax (15%):</span>
              <span>${this.formatCurrency(receipt.totals.tax_amount)}</span>
            </div>
            ${receipt.totals.discount_amount > 0 ? `
              <div class="totals-row" style="color: #10b981;">
                <span>Discount:</span>
                <span>-${this.formatCurrency(receipt.totals.discount_amount)}</span>
              </div>
            ` : ''}
            <div class="totals-row grand-total">
              <span>TOTAL:</span>
              <span>${this.formatCurrency(receipt.totals.total)}</span>
            </div>
          </div>

          <div class="receipt-info">
            <strong>Payment Method:</strong> ${receipt.sale.payment_method.toUpperCase()}
            ${receipt.sale.payment_method === 'cash' && receipt.sale.payment_details ? `
              <br><strong>Cash Received:</strong> ${this.formatCurrency(receipt.sale.payment_details.received || 0)}
              <br><strong>Change:</strong> ${this.formatCurrency(receipt.sale.payment_details.change || 0)}
            ` : ''}
          </div>

          ${receipt.loyalty && receipt.loyalty.qr_code_data_url ? `
            <div class="loyalty-section">
              <h3>Join Our Loyalty Program</h3>
              <p>Scan the QR code to start earning rewards!</p>
              <img src="${receipt.loyalty.qr_code_data_url}" alt="Loyalty QR" style="max-width: 200px;">
            </div>
          ` : ''}

          <div class="footer">
            <p>${receipt.footer.thank_you_message}</p>
            <p style="font-size: 11px; margin-top: 10px;">${receipt.footer.terms}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Get receipt by ID or sale ID
   * @param {string} identifier - Receipt ID or sale ID
   * @returns {Promise<object>} - Receipt with full data
   */
  static async getReceiptByIdOrSaleId(identifier) {
    try {
      const receipt = await Receipt.findOne({
        where: {
          [Op.or]: [
            { public_id: identifier },
            { sale_id: identifier }
          ]
        },
        include: [
          {
            model: Sale,
            as: 'sale',
            include: [
              { model: SaleItem, as: 'items' },
              { model: Business, as: 'business' },
              { model: Branch, as: 'branch' },
              { model: Customer, as: 'customer' }
            ]
          }
        ]
      })

      if (!receipt) {
        throw new Error(`Receipt not found: ${identifier}`)
      }

      return receipt

    } catch (error) {
      logger.error('Failed to get receipt', { identifier, error: error.message })
      throw error
    }
  }

  /**
   * Mark receipt as printed
   * @param {string} receiptNumber - Receipt receipt_number
   * @returns {Promise<object>} - Updated receipt
   */
  static async markReceiptAsPrinted(receiptNumber) {
    try {
      const receipt = await Receipt.findOne({
        where: { receipt_number: receiptNumber }
      })

      if (!receipt) {
        throw new Error(`Receipt not found: ${receiptNumber}`)
      }

      await receipt.markAsPrinted()
      logger.info('Receipt marked as printed', { receiptNumber })

      return receipt

    } catch (error) {
      logger.error('Failed to mark receipt as printed', { 
        receiptNumber, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted amount
   */
  static formatCurrency(amount) {
    return `${parseFloat(amount).toFixed(2)} SAR`
  }

  /**
   * Format date for receipt
   * @param {Date|string} date - Date to format
   * @returns {string} - Formatted date
   */
  static formatDate(date) {
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  /**
   * Fetch business logo for embedding in PDF
   * @param {string} logoUrl - Logo URL
   * @returns {Promise<Buffer|null>} - Logo buffer or null
   */
  static async fetchBusinessLogo(logoUrl) {
    try {
      if (!logoUrl) return null

      const response = await axios.get(logoUrl, {
        responseType: 'arraybuffer',
        timeout: 5000
      })

      return Buffer.from(response.data)

    } catch (error) {
      logger.warn('Failed to fetch business logo', { 
        logoUrl, 
        error: error.message 
      })
      return null
    }
  }
}

export default ReceiptService
