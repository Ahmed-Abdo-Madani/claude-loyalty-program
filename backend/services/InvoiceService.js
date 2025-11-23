/**
 * InvoiceService - Invoice PDF Generation and Management
 * 
 * Handles generation of professional invoice PDFs with:
 * - Business branding (logo, details)
 * - Invoice information (number, dates, status)
 * - Line items with VAT breakdown
 * - Payment details and transaction info
 * 
 * Pattern: Static service class following ReceiptService patterns
 */

import PDFDocument from 'pdfkit';
import axios from 'axios';
import { Op } from 'sequelize';
import logger from '../config/logger.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Business from '../models/Business.js';

class InvoiceService {
  /**
   * Generate PDF invoice for a given invoice ID
   * @param {string} invoiceId - Invoice public_id or invoice_number
   * @returns {Promise<Buffer>} PDF buffer
   * @throws {Error} If invoice not found or PDF generation fails
   */
  static async generateInvoicePDF(invoiceId) {
    try {
      logger.debug('Generating invoice PDF', { invoiceId });

      // Fetch invoice content with all associations
      const invoiceData = await this.getInvoiceContent(invoiceId);

      if (!invoiceData) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      // Create PDF document (A4 size, not thermal)
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      // Collect PDF chunks
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        logger.debug('PDF generation completed', { invoiceId });
      });

      // Build PDF content
      await this.buildPDFContent(doc, invoiceData);

      // Finalize PDF
      doc.end();

      // Return buffer when complete
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          logger.info('Invoice PDF generated successfully', {
            invoiceId,
            invoiceNumber: invoiceData.invoice.invoice_number,
            bufferSize: pdfBuffer.length
          });
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      logger.error('Failed to generate invoice PDF', {
        invoiceId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Fetch and structure invoice data for PDF generation
   * @param {string} invoiceId - Invoice public_id or invoice_number
   * @returns {Promise<Object>} Structured invoice data
   */
  static async getInvoiceContent(invoiceId) {
    try {
      logger.debug('Fetching invoice content', { invoiceId });

      // Query Invoice with all associations
      const invoice = await Invoice.findOne({
        where: {
          [Op.or]: [
            { id: invoiceId },
            { invoice_number: invoiceId }
          ]
        },
        include: [
          {
            model: Business,
            as: 'business',
            attributes: ['public_id', 'business_name', 'business_name_ar', 'phone', 'logo_url', 'status']
          },
          {
            model: Payment,
            as: 'payment',
            attributes: ['public_id', 'moyasar_payment_id', 'payment_method', 'payment_date', 'amount', 'currency', 'status']
          },
          {
            model: Subscription,
            as: 'subscription',
            attributes: ['public_id', 'plan_type', 'billing_cycle_start', 'next_billing_date']
          }
        ]
      });

      if (!invoice) {
        logger.warn('Invoice not found', { invoiceId });
        return null;
      }

      // Extract invoice_data JSON for plan details
      const invoiceDataJSON = invoice.invoice_data || {};
      const planType = invoiceDataJSON.plan_type || invoice.subscription?.plan_type || 'professional';
      const locationCount = invoiceDataJSON.location_count || 1;

      // Calculate line items
      const lineItems = this.calculateLineItems(planType, locationCount, invoice.amount);

      // Calculate totals
      const subtotal = parseFloat(invoice.amount);
      const vatAmount = this.calculateVAT(subtotal);
      const total = subtotal + vatAmount;

      logger.debug('Invoice content fetched', {
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        planType,
        locationCount,
        subtotal,
        vatAmount,
        total
      });

      return {
        business: invoice.business,
        invoice,
        payment: invoice.payment,
        subscription: invoice.subscription,
        line_items: lineItems,
        totals: {
          subtotal,
          vat: vatAmount,
          total
        }
      };

    } catch (error) {
      logger.error('Failed to fetch invoice content', {
        invoiceId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate line items based on subscription plan and location count
   * @param {string} planType - Plan type (free, professional, enterprise)
   * @param {number} locationCount - Number of locations
   * @param {number} totalAmount - Total invoice amount
   * @returns {Array} Line items array
   */
  static calculateLineItems(planType, locationCount, totalAmount) {
    const lineItems = [];

    if (planType === 'enterprise' && locationCount > 3) {
      // Enterprise plan with extra locations
      const basePrice = 570;
      const pricePerLocation = 180;
      const extraLocations = locationCount - 3;
      const extraLocationsCost = extraLocations * pricePerLocation;

      lineItems.push({
        description: 'Enterprise Plan - Monthly Subscription (Base)',
        quantity: 1,
        unitPrice: basePrice,
        taxRate: 15,
        amount: basePrice
      });

      lineItems.push({
        description: `Additional Locations (${extraLocations} locations)`,
        quantity: extraLocations,
        unitPrice: pricePerLocation,
        taxRate: 15,
        amount: extraLocationsCost
      });
    } else {
      // Standard plan (free, professional, or enterprise with ≤3 locations)
      const planNames = {
        free: 'Free Plan',
        professional: 'Professional Plan - Monthly Subscription',
        enterprise: 'Enterprise Plan - Monthly Subscription'
      };

      lineItems.push({
        description: planNames[planType] || 'Subscription',
        quantity: 1,
        unitPrice: parseFloat(totalAmount),
        taxRate: 15,
        amount: parseFloat(totalAmount)
      });
    }

    return lineItems;
  }

  /**
   * Build PDF content with business details, invoice info, and line items
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {Object} invoiceData - Structured invoice data
   */
  static async buildPDFContent(doc, invoiceData) {
    const { business, invoice, payment, line_items, totals } = invoiceData;

    let yPosition = 50;

    // ========================================
    // HEADER: Business Logo and Details
    // ========================================
    try {
      if (business.logo_url) {
        const logoBuffer = await this.fetchBusinessLogo(business.logo_url);
        if (logoBuffer) {
          doc.image(logoBuffer, 50, yPosition, { width: 80, align: 'left' });
        }
      }
    } catch (error) {
      logger.warn('Failed to load business logo for invoice', {
        businessId: business.public_id,
        error: error.message
      });
    }

    // Business name and details (right-aligned)
    doc.fontSize(18).font('Helvetica-Bold').text(business.business_name, 350, yPosition, { align: 'right' });
    yPosition += 25;

    doc.fontSize(10).font('Helvetica').text(business.phone || '', 350, yPosition, { align: 'right' });
    yPosition += 15;

    doc.fontSize(10).text('VAT Registration: [Pending]', 350, yPosition, { align: 'right' });
    yPosition += 40;

    // ========================================
    // INVOICE HEADER
    // ========================================
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 50, yPosition);
    yPosition += 35;

    // Invoice details (left column)
    doc.fontSize(10).font('Helvetica-Bold').text('Invoice Number:', 50, yPosition);
    doc.fontSize(10).font('Helvetica').text(invoice.invoice_number, 160, yPosition);
    yPosition += 18;

    doc.fontSize(10).font('Helvetica-Bold').text('Issue Date:', 50, yPosition);
    doc.fontSize(10).font('Helvetica').text(this.formatInvoiceDate(invoice.issued_date), 160, yPosition);
    yPosition += 18;

    doc.fontSize(10).font('Helvetica-Bold').text('Due Date:', 50, yPosition);
    doc.fontSize(10).font('Helvetica').text(this.formatInvoiceDate(invoice.due_date), 160, yPosition);
    yPosition += 18;

    if (invoice.paid_date) {
      doc.fontSize(10).font('Helvetica-Bold').text('Paid Date:', 50, yPosition);
      doc.fontSize(10).font('Helvetica').text(this.formatInvoiceDate(invoice.paid_date), 160, yPosition);
      yPosition += 18;
    }

    // Status badge
    const statusColors = {
      paid: '#10B981',
      pending: '#F59E0B',
      overdue: '#EF4444'
    };
    const statusColor = statusColors[invoice.status] || '#6B7280';
    doc.fontSize(10).font('Helvetica-Bold').fillColor(statusColor).text(`Status: ${invoice.status.toUpperCase()}`, 50, yPosition);
    doc.fillColor('#000000'); // Reset to black
    yPosition += 35;

    // ========================================
    // BILLING DETAILS
    // ========================================
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, yPosition);
    yPosition += 20;

    doc.fontSize(10).font('Helvetica').text(business.business_name, 50, yPosition);
    yPosition += 15;

    if (invoice.subscription) {
      doc.fontSize(10).text(`Plan: ${invoice.subscription.plan_type}`, 50, yPosition);
      yPosition += 15;

      const billingPeriod = `${this.formatInvoiceDate(invoice.subscription.billing_cycle_start)} - ${this.formatInvoiceDate(invoice.subscription.next_billing_date)}`;
      doc.fontSize(10).text(`Billing Period: ${billingPeriod}`, 50, yPosition);
      yPosition += 30;
    } else {
      yPosition += 30;
    }

    // ========================================
    // LINE ITEMS TABLE
    // ========================================
    const tableTop = yPosition;
    const tableLeft = 50;
    const tableWidth = 495;
    const colWidths = {
      description: 240,
      quantity: 60,
      unitPrice: 95,
      amount: 100
    };

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.rect(tableLeft, tableTop, tableWidth, 25).fillAndStroke('#F3F4F6', '#D1D5DB');
    doc.fillColor('#000000');

    let xPos = tableLeft + 10;
    doc.text('Description', xPos, tableTop + 8, { width: colWidths.description - 10 });
    xPos += colWidths.description;
    doc.text('Qty', xPos, tableTop + 8, { width: colWidths.quantity - 10, align: 'center' });
    xPos += colWidths.quantity;
    doc.text('Unit Price', xPos, tableTop + 8, { width: colWidths.unitPrice - 10, align: 'right' });
    xPos += colWidths.unitPrice;
    doc.text('Amount', xPos, tableTop + 8, { width: colWidths.amount - 10, align: 'right' });

    yPosition = tableTop + 25;

    // Table rows
    doc.fontSize(10).font('Helvetica');
    line_items.forEach((item, index) => {
      const rowHeight = 30;
      const isEven = index % 2 === 0;

      if (isEven) {
        doc.rect(tableLeft, yPosition, tableWidth, rowHeight).fillAndStroke('#FFFFFF', '#E5E7EB');
      } else {
        doc.rect(tableLeft, yPosition, tableWidth, rowHeight).fillAndStroke('#F9FAFB', '#E5E7EB');
      }

      doc.fillColor('#000000');

      xPos = tableLeft + 10;
      doc.text(item.description, xPos, yPosition + 8, { width: colWidths.description - 10 });
      xPos += colWidths.description;
      doc.text(item.quantity.toString(), xPos, yPosition + 8, { width: colWidths.quantity - 10, align: 'center' });
      xPos += colWidths.quantity;
      doc.text(this.formatCurrency(item.unitPrice), xPos, yPosition + 8, { width: colWidths.unitPrice - 10, align: 'right' });
      xPos += colWidths.unitPrice;
      doc.text(this.formatCurrency(item.amount), xPos, yPosition + 8, { width: colWidths.amount - 10, align: 'right' });

      yPosition += rowHeight;
    });

    yPosition += 20;

    // ========================================
    // TOTALS SECTION
    // ========================================
    const totalsLeft = 350;
    const totalsWidth = 195;

    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', totalsLeft, yPosition, { width: 100, align: 'left' });
    doc.text(this.formatCurrency(totals.subtotal), totalsLeft + 100, yPosition, { width: 95, align: 'right' });
    yPosition += 20;

    doc.text('VAT (15%):', totalsLeft, yPosition, { width: 100, align: 'left' });
    doc.text(this.formatCurrency(totals.vat), totalsLeft + 100, yPosition, { width: 95, align: 'right' });
    yPosition += 25;

    // Total (bold, larger)
    doc.fontSize(12).font('Helvetica-Bold');
    doc.rect(totalsLeft, yPosition - 5, totalsWidth, 30).fillAndStroke('#F3F4F6', '#D1D5DB');
    doc.fillColor('#000000');
    doc.text('Total:', totalsLeft + 10, yPosition + 3, { width: 90, align: 'left' });
    doc.text(this.formatCurrency(totals.total), totalsLeft + 100, yPosition + 3, { width: 85, align: 'right' });
    yPosition += 50;

    // ========================================
    // PAYMENT INFORMATION
    // ========================================
    if (payment) {
      doc.fontSize(12).font('Helvetica-Bold').text('Payment Information', 50, yPosition);
      yPosition += 20;

      doc.fontSize(10).font('Helvetica');
      doc.text(`Payment Method: ${this.formatPaymentMethod(payment.payment_method)}`, 50, yPosition);
      yPosition += 15;

      doc.text(`Payment Date: ${this.formatDate(payment.payment_date)}`, 50, yPosition);
      yPosition += 15;

      doc.text(`Transaction ID: ${payment.moyasar_payment_id || 'N/A'}`, 50, yPosition);
      yPosition += 15;

      doc.text(`Status: ${payment.status.toUpperCase()}`, 50, yPosition);
      yPosition += 30;
    }

    // ========================================
    // FOOTER
    // ========================================
    const footerY = 750;
    doc.fontSize(10).font('Helvetica-Bold').text('Thank you for your business!', 50, footerY, { align: 'center', width: 495 });
    doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 20, { align: 'center', width: 495 });
  }

  /**
   * Fetch business logo from URL for embedding in PDF
   * @param {string} logoUrl - Business logo URL
   * @returns {Promise<Buffer|null>} Logo image buffer or null
   */
  static async fetchBusinessLogo(logoUrl) {
    try {
      if (!logoUrl) {
        return null;
      }

      logger.debug('Fetching business logo for invoice', { logoUrl });

      const response = await axios.get(logoUrl, {
        responseType: 'arraybuffer',
        timeout: 5000
      });

      return Buffer.from(response.data);

    } catch (error) {
      logger.warn('Failed to fetch business logo', {
        logoUrl,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency (e.g., "210.00 SAR")
   */
  static formatCurrency(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return '0.00 SAR';
    }
    return `${numAmount.toFixed(2)} SAR`;
  }

  /**
   * Format date for display (e.g., "Jan 15, 2025, 10:30 AM")
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date
   */
  static formatDate(date) {
    if (!date) {
      return 'N/A';
    }

    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      logger.warn('Failed to format date', { date, error: error.message });
      return 'Invalid Date';
    }
  }

  /**
   * Format date for invoice header (e.g., "January 15, 2025")
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date
   */
  static formatInvoiceDate(date) {
    if (!date) {
      return 'N/A';
    }

    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      logger.warn('Failed to format invoice date', { date, error: error.message });
      return 'Invalid Date';
    }
  }

  /**
   * Calculate 15% VAT
   * @param {number} amount - Base amount
   * @returns {number} VAT amount (15%)
   */
  static calculateVAT(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return 0;
    }
    return parseFloat((numAmount * 0.15).toFixed(2));
  }

  /**
   * Format payment method for display
   * @param {string} method - Payment method code
   * @returns {string} Formatted payment method
   */
  static formatPaymentMethod(method) {
    const methods = {
      card: 'Credit Card',
      apple_pay: 'Apple Pay',
      stc_pay: 'STC Pay'
    };
    return methods[method] || method || 'N/A';
  }
}

export default InvoiceService;
