import express from 'express'
import { requireBranchManagerAuth } from '../middleware/branchManagerAuth.js'
import ReceiptService from '../services/ReceiptService.js'
import Receipt from '../models/Receipt.js'
import Sale from '../models/Sale.js'
import logger from '../config/logger.js'

const router = express.Router()

/**
 * GET /api/receipts/:saleId
 * Get receipt by sale ID with optional format
 * Query params: format ('json' | 'pdf' | 'thermal')
 */
router.get('/:saleId', requireBranchManagerAuth, async (req, res) => {
  try {
    const { saleId } = req.params
    const { format = 'json' } = req.query
    const branchId = req.branchId

    // Verify sale belongs to authenticated branch
    const sale = await Sale.findOne({
      where: { public_id: saleId }
    })

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      })
    }

    if (sale.branch_id !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Sale does not belong to your branch'
      })
    }

    // Handle different formats
    if (format === 'pdf') {
      // Generate PDF receipt
      const pdfBuffer = await ReceiptService.generatePDFReceipt(saleId, 'a4')
      
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${sale.sale_number}.pdf"`)
      return res.send(pdfBuffer)
      
    } else if (format === 'thermal') {
      // Generate thermal receipt
      const thermalBuffer = await ReceiptService.generateThermalReceipt(saleId)
      
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${sale.sale_number}.bin"`)
      return res.send(thermalBuffer)
      
    } else {
      // Return JSON receipt content
      const receipt = await Receipt.findOne({
        where: { sale_id: saleId }
      })

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        })
      }

      return res.json({
        success: true,
        receipt: receipt.content_json
      })
    }

  } catch (error) {
    logger.error('Failed to get receipt', { 
      saleId: req.params.saleId, 
      error: error.message 
    })
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt',
      error: error.message
    })
  }
})

/**
 * GET /api/receipts/:saleId/preview
 * Get receipt preview data for frontend
 */
router.get('/:saleId/preview', requireBranchManagerAuth, async (req, res) => {
  try {
    const { saleId } = req.params
    const branchId = req.branchId

    // Verify sale belongs to authenticated branch
    const sale = await Sale.findOne({
      where: { public_id: saleId }
    })

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      })
    }

    if (sale.branch_id !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Sale does not belong to your branch'
      })
    }

    // Get receipt content
    const receiptContent = await ReceiptService.generateReceiptContent(saleId)

    return res.json({
      success: true,
      receipt: receiptContent
    })

  } catch (error) {
    logger.error('Failed to get receipt preview', { 
      saleId: req.params.saleId, 
      error: error.message 
    })
    return res.status(500).json({
      success: false,
      message: 'Failed to generate receipt preview',
      error: error.message
    })
  }
})

/**
 * POST /api/receipts/:saleId/print
 * Mark receipt as printed
 */
router.post('/:saleId/print', requireBranchManagerAuth, async (req, res) => {
  try {
    const { saleId } = req.params
    const { format = 'thermal' } = req.body
    const branchId = req.branchId

    // Verify sale belongs to authenticated branch
    const sale = await Sale.findOne({
      where: { public_id: saleId }
    })

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      })
    }

    if (sale.branch_id !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Sale does not belong to your branch'
      })
    }

    // Find receipt
    const receipt = await Receipt.findOne({
      where: { sale_id: saleId }
    })

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      })
    }

    // Mark as printed
    await ReceiptService.markReceiptAsPrinted(receipt.public_id)

    // Reload receipt to get updated fields
    await receipt.reload()

    logger.info('Receipt marked as printed', { 
      saleId, 
      receiptId: receipt.public_id,
      format 
    })

    return res.json({
      success: true,
      message: 'Receipt marked as printed',
      receipt: {
        public_id: receipt.public_id,
        printed_at: receipt.printed_at,
        print_count: receipt.print_count
      }
    })

  } catch (error) {
    logger.error('Failed to mark receipt as printed', { 
      saleId: req.params.saleId, 
      error: error.message 
    })
    return res.status(500).json({
      success: false,
      message: 'Failed to mark receipt as printed',
      error: error.message
    })
  }
})

/**
 * POST /api/receipts/:saleId/email
 * Email receipt to customer
 */
router.post('/:saleId/email', requireBranchManagerAuth, async (req, res) => {
  try {
    const { saleId } = req.params
    const { email } = req.body
    const branchId = req.branchId

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      })
    }

    // Verify sale belongs to authenticated branch
    const sale = await Sale.findOne({
      where: { public_id: saleId }
    })

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      })
    }

    if (sale.branch_id !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Sale does not belong to your branch'
      })
    }

    // Email receipt
    const emailResult = await ReceiptService.emailReceipt(saleId, email)

    if (emailResult.success) {
      logger.info('Receipt emailed successfully', { saleId, email })
      
      return res.json({
        success: true,
        message: 'Receipt emailed successfully'
      })
    } else {
      throw new Error(emailResult.error || 'Email sending failed')
    }

  } catch (error) {
    logger.error('Failed to email receipt', { 
      saleId: req.params.saleId, 
      error: error.message 
    })
    return res.status(500).json({
      success: false,
      message: 'Failed to email receipt',
      error: error.message
    })
  }
})

/**
 * POST /api/receipts/:saleId/regenerate
 * Regenerate receipt content (if needed)
 */
router.post('/:saleId/regenerate', requireBranchManagerAuth, async (req, res) => {
  try {
    const { saleId } = req.params
    const branchId = req.branchId

    // Verify sale belongs to authenticated branch
    const sale = await Sale.findOne({
      where: { public_id: saleId }
    })

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      })
    }

    if (sale.branch_id !== branchId) {
      return res.status(403).json({
        success: false,
        message: 'Sale does not belong to your branch'
      })
    }

    // Find receipt
    const receipt = await Receipt.findOne({
      where: { sale_id: saleId }
    })

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      })
    }

    // Regenerate content
    const newContent = await ReceiptService.generateReceiptContent(saleId, {
      includeLogo: true,
      includeLoyaltyQR: true
    })

    // Update receipt
    receipt.content_json = newContent
    await receipt.save()

    logger.info('Receipt content regenerated', { saleId, receiptId: receipt.public_id })

    return res.json({
      success: true,
      message: 'Receipt content regenerated',
      receipt: {
        public_id: receipt.public_id,
        content: newContent
      }
    })

  } catch (error) {
    logger.error('Failed to regenerate receipt', { 
      saleId: req.params.saleId, 
      error: error.message 
    })
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate receipt',
      error: error.message
    })
  }
})

export default router
