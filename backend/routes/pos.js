import express from 'express'
import { Op } from 'sequelize'
import { requireBusinessAuth, checkSubscriptionLimit } from '../middleware/hybridBusinessAuth.js'
import { requireBranchManagerAuth } from '../middleware/branchManagerAuth.js'
import Product from '../models/Product.js'
import ProductCategory from '../models/ProductCategory.js'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Receipt from '../models/Receipt.js'
import Business from '../models/Business.js'
import Branch from '../models/Branch.js'
import Customer from '../models/Customer.js'
import SecureIDGenerator from '../utils/secureIdGenerator.js'
import * as taxCalculator from '../utils/taxCalculator.js'
import logger from '../config/logger.js'
import sequelize from '../config/database.js'
import ReceiptService from '../services/ReceiptService.js'
import CustomerService from '../services/CustomerService.js'
import CustomerProgress from '../models/CustomerProgress.js'
import Offer from '../models/Offer.js'
import POSAnalyticsController from '../controllers/posAnalyticsController.js'

const router = express.Router()

// ============================================
// VALIDATION HELPERS
// ============================================

function validateProductData(data) {
  const errors = []
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Product name is required')
  }
  
  if (data.price === undefined || data.price === null) {
    errors.push('Product price is required')
  } else if (data.price <= 0) {
    errors.push('Product price must be greater than 0')
  }
  
  if (data.tax_rate !== undefined && (data.tax_rate < 0 || data.tax_rate > 100)) {
    errors.push('Tax rate must be between 0 and 100')
  }
  
  return { valid: errors.length === 0, errors }
}

function validateSaleData(data) {
  const errors = []
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Sale must contain at least one item')
  }
  
  if (!data.paymentMethod) {
    errors.push('Payment method is required')
  } else if (!['cash', 'card', 'gift_offer', 'mixed'].includes(data.paymentMethod)) {
    errors.push('Invalid payment method')
  }
  
  if (data.paymentMethod === 'mixed' && !data.paymentDetails) {
    errors.push('Payment details required for mixed payments')
  }
  
  if (data.discountAmount && data.discountAmount < 0) {
    errors.push('Discount amount cannot be negative')
  }
  
  return { valid: errors.length === 0, errors }
}

function validateCategoryData(data) {
  const errors = []
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Category name is required')
  }
  
  if (data.display_order !== undefined && (!Number.isInteger(data.display_order) || data.display_order < 0)) {
    errors.push('Display order must be a non-negative integer')
  }
  
  return { valid: errors.length === 0, errors }
}

// ============================================
// SECTION 1: Product Categories (Business Dashboard Access)
// ============================================

/**
 * GET /api/pos/categories
 * Get all categories for authenticated business
 */
router.get('/categories', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    
    const categories = await ProductCategory.findAll({
      where: { business_id: businessId },
      order: [['display_order', 'ASC'], ['name', 'ASC']],
      attributes: ['public_id', 'name', 'name_ar', 'description', 'display_order', 'status', 'product_count', 'created_at', 'updated_at']
    })
    
    res.json({
      success: true,
      categories
    })
    
  } catch (error) {
    logger.error('Failed to fetch categories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      code: 'FETCH_CATEGORIES_ERROR'
    })
  }
})

/**
 * POST /api/pos/categories
 * Create new category
 */
router.post('/categories', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    const { name, name_ar, description, display_order } = req.body
    
    // Validate input
    const validation = validateCategoryData(req.body)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR'
      })
    }
    
    // Create category
    const category = await ProductCategory.create({
      business_id: businessId,
      name: name.trim(),
      name_ar: name_ar?.trim(),
      description: description?.trim(),
      display_order: display_order || 0
    })
    
    logger.info(`Category created: ${category.public_id} for business ${businessId}`)
    
    res.status(201).json({
      success: true,
      category
    })
    
  } catch (error) {
    logger.error('Failed to create category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      code: 'CREATE_CATEGORY_ERROR'
    })
  }
})

/**
 * PUT /api/pos/categories/:categoryId
 * Update category
 */
router.put('/categories/:categoryId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    const { categoryId } = req.params
    const { name, name_ar, description, display_order, status } = req.body
    
    // Find category and verify ownership
    const category = await ProductCategory.findOne({
      where: {
        public_id: categoryId,
        business_id: businessId
      }
    })
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      })
    }
    
    // Update fields
    if (name) category.name = name.trim()
    if (name_ar !== undefined) category.name_ar = name_ar?.trim()
    if (description !== undefined) category.description = description?.trim()
    if (display_order !== undefined) category.display_order = display_order
    if (status && ['active', 'inactive'].includes(status)) category.status = status
    
    await category.save()
    
    logger.info(`Category updated: ${categoryId}`)
    
    res.json({
      success: true,
      category
    })
    
  } catch (error) {
    logger.error('Failed to update category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
      code: 'UPDATE_CATEGORY_ERROR'
    })
  }
})

/**
 * DELETE /api/pos/categories/:categoryId
 * Delete category
 */
router.delete('/categories/:categoryId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    const { categoryId } = req.params
    
    // Find category and verify ownership
    const category = await ProductCategory.findOne({
      where: {
        public_id: categoryId,
        business_id: businessId
      }
    })
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      })
    }
    
    // Check if category has products
    if (category.product_count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with products. Remove or reassign products first.',
        code: 'CATEGORY_HAS_PRODUCTS'
      })
    }
    
    await category.destroy()
    
    logger.info(`Category deleted: ${categoryId}`)
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    })
    
  } catch (error) {
    logger.error('Failed to delete category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
      code: 'DELETE_CATEGORY_ERROR'
    })
  }
})

// ============================================
// SECTION 2: Products (Business Dashboard Access)
// ============================================

/**
 * GET /api/pos/products
 * Get all products for authenticated business
 */
router.get('/products', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    const { branchId, categoryId, status, search } = req.query
    
    // Build where clause
    const where = { business_id: businessId }
    
    if (branchId) where.branch_id = branchId
    if (categoryId) where.category_id = categoryId
    if (status) where.status = status
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { name_ar: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ]
    }
    
    const products = await Product.findAll({
      where,
      include: [
        {
          model: ProductCategory,
          as: 'category',
          attributes: ['public_id', 'name', 'name_ar']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['public_id', 'name'],
          required: false
        }
      ],
      order: [
        [{ model: ProductCategory, as: 'category' }, 'display_order', 'ASC'],
        ['display_order', 'ASC'],
        ['name', 'ASC']
      ]
    })
    
    res.json({
      success: true,
      products
    })
    
  } catch (error) {
    logger.error('Failed to fetch products:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      code: 'FETCH_PRODUCTS_ERROR'
    })
  }
})

/**
 * GET /api/pos/products/:productId
 * Get single product
 */
router.get('/products/:productId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    const { productId } = req.params
    
    const product = await Product.findOne({
      where: {
        public_id: productId,
        business_id: businessId
      },
      include: [
        {
          model: ProductCategory,
          as: 'category',
          attributes: ['public_id', 'name', 'name_ar']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['public_id', 'name'],
          required: false
        }
      ]
    })
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    }
    
    res.json({
      success: true,
      product
    })
    
  } catch (error) {
    logger.error('Failed to fetch product:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      code: 'FETCH_PRODUCT_ERROR'
    })
  }
})

/**
 * POST /api/pos/products
 * Create new product
 */
router.post('/products', requireBusinessAuth, async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const businessId = req.businessId
    const {
      name,
      name_ar,
      description,
      price,
      cost,
      sku,
      category_id,
      branch_id,
      tax_rate,
      tax_included,
      image_url,
      display_order
    } = req.body
    
    // Validate input
    const validation = validateProductData(req.body)
    if (!validation.valid) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR'
      })
    }
    
    // Verify branch belongs to business if branch_id provided
    if (branch_id) {
      const branch = await Branch.findOne({
        where: {
          public_id: branch_id,
          business_id: businessId
        }
      })
      
      if (!branch) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: 'Branch not found or does not belong to this business',
          code: 'INVALID_BRANCH'
        })
      }
    }
    
    // Verify category belongs to business if category_id provided
    if (category_id) {
      const category = await ProductCategory.findOne({
        where: {
          public_id: category_id,
          business_id: businessId
        }
      })
      
      if (!category) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: 'Category not found or does not belong to this business',
          code: 'INVALID_CATEGORY'
        })
      }
    }
    
    // Normalize SKU - treat empty strings as null
    const normalizedSku = sku && sku.trim() !== '' ? sku.trim() : null
    
    // Check SKU uniqueness within business if provided
    if (normalizedSku) {
      const existingProduct = await Product.findOne({
        where: {
          business_id: businessId,
          sku: normalizedSku
        }
      })
      
      if (existingProduct) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: 'SKU already exists for this business',
          code: 'DUPLICATE_SKU'
        })
      }
    }
    
    // Create product
    const product = await Product.create({
      business_id: businessId,
      branch_id: branch_id || null,
      category_id: category_id || null,
      name: name.trim(),
      name_ar: name_ar?.trim(),
      description: description?.trim(),
      sku: normalizedSku,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : null,
      tax_rate: tax_rate !== undefined ? parseFloat(tax_rate) : 15.00,
      tax_included: tax_included || false,
      image_url: image_url?.trim(),
      display_order: display_order || 0
    }, { transaction })
    
    // Increment category product count if category assigned
    if (category_id) {
      const category = await ProductCategory.findOne({
        where: { public_id: category_id }
      })
      await category.incrementProductCount({ transaction })
    }
    
    await transaction.commit()
    
    logger.info(`Product created: ${product.public_id} for business ${businessId}`)
    
    res.status(201).json({
      success: true,
      product
    })
    
  } catch (error) {
    await transaction.rollback()
    logger.error('Failed to create product:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      code: 'CREATE_PRODUCT_ERROR'
    })
  }
})

/**
 * PUT /api/pos/products/:productId
 * Update product
 */
router.put('/products/:productId', requireBusinessAuth, async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const businessId = req.businessId
    const { productId } = req.params
    const {
      name,
      name_ar,
      description,
      price,
      cost,
      sku,
      category_id,
      branch_id,
      tax_rate,
      tax_included,
      status,
      image_url,
      display_order
    } = req.body
    
    // Find product and verify ownership
    const product = await Product.findOne({
      where: {
        public_id: productId,
        business_id: businessId
      }
    })
    
    if (!product) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    }
    
    const oldCategoryId = product.category_id
    
    // Verify branch if provided
    if (branch_id !== undefined && branch_id !== null) {
      const branch = await Branch.findOne({
        where: {
          public_id: branch_id,
          business_id: businessId
        }
      })
      
      if (!branch) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: 'Branch not found or does not belong to this business',
          code: 'INVALID_BRANCH'
        })
      }
    }
    
    // Verify category if provided
    if (category_id !== undefined && category_id !== null) {
      const category = await ProductCategory.findOne({
        where: {
          public_id: category_id,
          business_id: businessId
        }
      })
      
      if (!category) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: 'Category not found or does not belong to this business',
          code: 'INVALID_CATEGORY'
        })
      }
    }
    
    // Normalize SKU - treat empty strings as null
    const normalizedSku = sku !== undefined 
      ? (sku && sku.trim() !== '' ? sku.trim() : null)
      : undefined
    
    // Check SKU uniqueness if changing SKU
    if (normalizedSku !== undefined && normalizedSku !== product.sku) {
      if (normalizedSku !== null) {
        const existingProduct = await Product.findOne({
          where: {
            business_id: businessId,
            sku: normalizedSku,
            public_id: { [Op.ne]: productId }
          }
        })
        
        if (existingProduct) {
          await transaction.rollback()
          return res.status(400).json({
            success: false,
            error: 'SKU already exists for this business',
            code: 'DUPLICATE_SKU'
          })
        }
      }
    }
    
    // Update fields
    if (name) product.name = name.trim()
    if (name_ar !== undefined) product.name_ar = name_ar?.trim()
    if (description !== undefined) product.description = description?.trim()
    if (price !== undefined) product.price = parseFloat(price)
    if (cost !== undefined) product.cost = cost ? parseFloat(cost) : null
    if (normalizedSku !== undefined) product.sku = normalizedSku
    if (category_id !== undefined) product.category_id = category_id
    if (branch_id !== undefined) product.branch_id = branch_id
    if (tax_rate !== undefined) product.tax_rate = parseFloat(tax_rate)
    if (tax_included !== undefined) product.tax_included = tax_included
    if (status && ['active', 'inactive', 'out_of_stock'].includes(status)) product.status = status
    if (image_url !== undefined) product.image_url = image_url?.trim()
    if (display_order !== undefined) product.display_order = display_order
    
    await product.save({ transaction })
    
    // Update category product counts if category changed
    if (category_id !== undefined && category_id !== oldCategoryId) {
      // Decrement old category
      if (oldCategoryId) {
        const oldCategory = await ProductCategory.findOne({
          where: { public_id: oldCategoryId }
        })
        if (oldCategory) {
          await oldCategory.decrementProductCount({ transaction })
        }
      }
      
      // Increment new category
      if (category_id) {
        const newCategory = await ProductCategory.findOne({
          where: { public_id: category_id }
        })
        if (newCategory) {
          await newCategory.incrementProductCount({ transaction })
        }
      }
    }
    
    await transaction.commit()
    
    logger.info(`Product updated: ${productId}`)
    
    res.json({
      success: true,
      product
    })
    
  } catch (error) {
    await transaction.rollback()
    logger.error('Failed to update product:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      code: 'UPDATE_PRODUCT_ERROR'
    })
  }
})

/**
 * DELETE /api/pos/products/:productId
 * Delete product (soft delete by setting status to inactive)
 */
router.delete('/products/:productId', requireBusinessAuth, async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const businessId = req.businessId
    const { productId } = req.params
    
    // Find product and verify ownership
    const product = await Product.findOne({
      where: {
        public_id: productId,
        business_id: businessId
      }
    })
    
    if (!product) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    }
    
    // Check if product has sale history
    const saleItemCount = await SaleItem.count({
      where: { product_id: productId }
    })
    
    if (saleItemCount > 0) {
      // Soft delete - set status to inactive instead of hard delete
      product.status = 'inactive'
      await product.save({ transaction })
      
      await transaction.commit()
      
      logger.info(`Product soft deleted (set to inactive): ${productId}`)
      
      return res.json({
        success: true,
        message: 'Product set to inactive (has sale history)',
        soft_delete: true
      })
    }
    
    // Hard delete if no sale history
    const categoryId = product.category_id
    
    await product.destroy({ transaction })
    
    // Decrement category product count
    if (categoryId) {
      const category = await ProductCategory.findOne({
        where: { public_id: categoryId }
      })
      if (category) {
        await category.decrementProductCount({ transaction })
      }
    }
    
    await transaction.commit()
    
    logger.info(`Product deleted: ${productId}`)
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    })
    
  } catch (error) {
    await transaction.rollback()
    logger.error('Failed to delete product:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      code: 'DELETE_PRODUCT_ERROR'
    })
  }
})

/**
 * PATCH /api/pos/products/:productId/status
 * Toggle product status
 */
router.patch('/products/:productId/status', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    const { productId } = req.params
    const { status } = req.body
    
    if (!status || !['active', 'inactive', 'out_of_stock'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status required (active, inactive, out_of_stock)',
        code: 'INVALID_STATUS'
      })
    }
    
    // Find product and verify ownership
    const product = await Product.findOne({
      where: {
        public_id: productId,
        business_id: businessId
      }
    })
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    }
    
    product.status = status
    await product.save()
    
    logger.info(`Product status updated: ${productId} to ${status}`)
    
    res.json({
      success: true,
      product
    })
    
  } catch (error) {
    logger.error('Failed to update product status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update product status',
      code: 'UPDATE_STATUS_ERROR'
    })
  }
})

// ============================================
// SECTION 2B: Products & Categories (Branch Manager POS Access)
// ============================================

/**
 * GET /api/pos/manager/products
 * Get products available for branch manager's POS
 * Returns branch-specific + all-branches products
 */
router.get('/manager/products', requireBranchManagerAuth, async (req, res) => {
  try {
    const { branchId, branch } = req
    const businessId = branch.business_id
    const { status } = req.query
    
    // Build where clause
    const whereClause = {
      business_id: businessId,
      [Op.or]: [
        { branch_id: branchId },     // Branch-specific products
        { branch_id: null }          // All-branches products
      ]
    }
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }
    
    const products = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: ProductCategory,
          as: 'category',
          attributes: ['public_id', 'name', 'name_ar']
        }
      ],
      order: [['name', 'ASC']],
      attributes: [
  'public_id', 
  'sku', 
  'name', 
  'name_ar', 
  'description',
  'price', 
  'cost', 
  'tax_rate', 
  'tax_included',
  'category_id',
  'image_url', 
  'status', 
  'branch_id',
  'created_at',
  'updated_at'
      ]
    })
    
    logger.info(`Manager retrieved ${products.length} products for branch ${branchId}`)
    
    res.json({
      success: true,
      products,
      count: products.length
    })
    
  } catch (error) {
    logger.error('Failed to fetch products for manager:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      code: 'FETCH_PRODUCTS_ERROR'
    })
  }
})

/**
 * GET /api/pos/manager/categories
 * Get all product categories for branch manager's business
 */
router.get('/manager/categories', requireBranchManagerAuth, async (req, res) => {
  try {
    const { branch } = req
    const businessId = branch.business_id
    
    const categories = await ProductCategory.findAll({
      where: { business_id: businessId },
      order: [['display_order', 'ASC'], ['name', 'ASC']],
      attributes: [
        'public_id', 
        'name', 
        'name_ar', 
        'description', 
        'display_order', 
        'status', 
        'product_count'
      ]
    })
    
    logger.info(`Manager retrieved ${categories.length} categories for business ${businessId}`)
    
    res.json({
      success: true,
      categories,
      count: categories.length
    })
    
  } catch (error) {
    logger.error('Failed to fetch categories for manager:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      code: 'FETCH_CATEGORIES_ERROR'
    })
  }
})

// ============================================
// SECTION 2.5: Loyalty Integration (Branch Manager Access)
// ============================================

/**
 * POST /api/pos/loyalty/validate
 * Validate customer loyalty and calculate available rewards
 */
router.post('/loyalty/validate', requireBranchManagerAuth, async (req, res) => {
  try {
    const { branchId, branch } = req
    const businessId = branch.business_id
    let { customerToken, offerHash } = req.body
    
    // Validate required fields (offerHash may be null for legacy QRs)
    if (!customerToken) {
      return res.status(400).json({
        success: false,
        error: 'Customer token is required'
      })
    }
    
    logger.debug('POS loyalty validation attempt:', { branchId, businessId })
    
    // 1. Decode customer token
    const tokenData = CustomerService.decodeCustomerToken(customerToken)
    if (!tokenData || !tokenData.isValid) {
      logger.warn('Invalid customer token in POS loyalty validation')
      return res.status(401).json({
        success: false,
        error: 'Invalid customer token'
      })
    }
    
    const { customerId, businessId: tokenBusinessId } = tokenData
    
    // 2. Validate business matches
    if (tokenBusinessId !== businessId) {
      logger.warn('Business mismatch in POS loyalty validation:', {
        tokenBusinessId,
        branchBusinessId: businessId
      })
      return res.status(403).json({
        success: false,
        error: 'This loyalty card is for a different business'
      })
    }
    
    // 3. Find offer by hash (or auto-detect for legacy QRs)
    let offer
    if (offerHash === null || offerHash === undefined) {
      // Legacy token-only format: Auto-detect offer
      logger.info('POS loyalty validation - Legacy QR detected, auto-selecting offer')
      offer = await CustomerService.findOfferForBusiness(businessId)
      if (!offer) {
        logger.warn('Cannot auto-select offer for legacy QR in POS')
        return res.status(400).json({
          success: false,
          error: 'This pass needs to be regenerated. Please contact support or regenerate your loyalty pass.'
        })
      }
      logger.info(`Auto-selected offer for legacy QR in POS: ${offer.public_id}`)
    } else {
      offer = await CustomerService.findOfferByHash(offerHash, businessId)
      if (!offer) {
        logger.warn('Offer not found by hash in POS loyalty validation:', { offerHash })
        return res.status(404).json({
          success: false,
          error: 'Offer not found'
        })
      }
    }
    
    // 4. Find or create customer progress
    let progress = await CustomerService.findCustomerProgress(customerId, offer.public_id)
    if (!progress) {
      progress = await CustomerService.createCustomerProgress(customerId, offer.public_id, businessId)
    }
    
    // 5. Calculate customer tier
    const tierData = await CustomerService.calculateCustomerTier(customerId, offer.public_id)
    
    // 6. Get customer details
    const customer = await Customer.findOne({
      where: { customer_id: customerId, business_id: businessId }
    })
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      })
    }
    
    // 7. Check if reward can be redeemed
    const canRedeemReward = progress.is_completed === true
    
    logger.debug('POS loyalty validation successful:', {
      customerId,
      offerId: offer.public_id,
      currentStamps: progress.current_stamps,
      isCompleted: progress.is_completed,
      canRedeem: canRedeemReward
    })
    
    // 8. Return validation response
    res.json({
      success: true,
      customer: {
        customer_id: customer.customer_id,
        name: customer.name,
        phone: customer.phone
      },
      offer: {
        public_id: offer.public_id,
        title: offer.title,
        stamps_required: offer.stamps_required
      },
      progress: {
        current_stamps: progress.current_stamps,
        max_stamps: progress.max_stamps,
        is_completed: progress.is_completed,
        rewards_claimed: progress.rewards_claimed
      },
      tier: tierData,
      canRedeemReward,
      rewardValue: offer.reward_value || 0
    })
    
  } catch (error) {
    logger.error('POS loyalty validation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to validate customer loyalty'
    })
  }
})

// ============================================
// SECTION 3: Sales (Branch Manager Access)
// ============================================

/**
 * POST /api/pos/sales
 * Create new sale (checkout)
 * Enforces POS operations limit from subscription plan
 */
router.post('/sales', requireBranchManagerAuth, checkSubscriptionLimit('posOperations'), async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const { branchId, branch } = req
    const businessId = branch.business_id
    const {
      items,
      paymentMethod,
      paymentDetails,
      customerId,
      discountAmount,
      notes,
      loyaltyRedemption
    } = req.body
    
    // Validate sale data
    const validation = validateSaleData(req.body)
    if (!validation.valid) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR'
      })
    }
    
    // Initialize loyalty variables
    let loyaltyDiscountAmount = 0
    let loyaltyCustomerId = customerId || null
    let progress = null
    
    // Validate loyalty redemption if provided
    if (loyaltyRedemption) {
      const { customerId: loyaltyCustomerIdParam, offerId, rewardValue } = loyaltyRedemption
      
      if (!loyaltyCustomerIdParam || !offerId) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: 'Loyalty redemption requires customerId and offerId',
          code: 'INVALID_LOYALTY_REDEMPTION'
        })
      }
      
      // Validate customer exists
      const customer = await Customer.findOne({
        where: { customer_id: loyaltyCustomerIdParam, business_id: businessId }
      })
      
      if (!customer) {
        await transaction.rollback()
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        })
      }
      
      // Validate offer exists
      const offer = await Offer.findOne({
        where: { 
          public_id: offerId,
          business_id: businessId
        }
      })
      
      if (!offer) {
        await transaction.rollback()
        return res.status(404).json({
          success: false,
          error: 'Offer not found',
          code: 'OFFER_NOT_FOUND'
        })
      }
      
      // Fetch customer progress
      progress = await CustomerProgress.findOne({
        where: {
          customer_id: loyaltyCustomerIdParam,
          offer_id: offerId
        }
      })
      
      if (!progress || !progress.is_completed) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: 'Customer has not earned a reward yet',
          code: 'REWARD_NOT_AVAILABLE'
        })
      }
      
      // Set loyalty discount
      loyaltyDiscountAmount = parseFloat(rewardValue) || 0
      loyaltyCustomerId = loyaltyCustomerIdParam
      
      logger.info('Processing loyalty redemption:', {
        customerId: loyaltyCustomerId,
        offerId,
        rewardValue: loyaltyDiscountAmount
      })
    }
    
    // Validate all products exist and are available
    const productIds = items.map(item => item.productId)
    const products = await Product.findAll({
      where: {
        public_id: { [Op.in]: productIds },
        business_id: businessId,
        status: 'active',
        [Op.or]: [
          { branch_id: null },
          { branch_id: branchId }
        ]
      }
    })
    
    if (products.length !== productIds.length) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        error: 'One or more products not found or not available',
        code: 'INVALID_PRODUCTS'
      })
    }
    
    // Create product lookup map
    const productMap = {}
    products.forEach(p => {
      productMap[p.public_id] = p
    })
    
    // Enforce branch-specific product availability
    for (const item of items) {
      const product = productMap[item.productId]
      if (!product) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: `Product ${item.productId} not found or not available for this branch`,
          code: 'INVALID_PRODUCTS'
        })
      }
      
      // Product must either be branch-agnostic (branch_id = null) or assigned to this branch
      if (product.branch_id !== null && product.branch_id !== branchId) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          error: `Product ${product.name} is not available for sale at this branch`,
          code: 'INVALID_PRODUCTS'
        })
      }
    }
    
    // Calculate sale totals
    const saleItemsData = items.map(item => {
      const product = productMap[item.productId]
      let unitPrice = parseFloat(product.price)
      const quantity = parseInt(item.quantity)
      const taxRate = parseFloat(product.tax_rate)
      
      // If tax is included in the product price, extract the base price
      if (product.tax_included) {
        unitPrice = taxCalculator.calculatePriceWithoutTax(unitPrice, taxRate)
      }
      
      return {
        productId: item.productId,
        quantity,
        unitPrice,
        taxRate,
        taxIncluded: product.tax_included,
        notes: item.notes
      }
    })
    
    // Calculate totals without discount first to determine max discount
    const totalsRaw = taxCalculator.calculateSaleTotals(
      saleItemsData.map(i => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })),
      0
    )
    
    // Clamp loyalty discount to prevent negative totals
    const maxDiscount = totalsRaw.subtotal + totalsRaw.taxAmount
    loyaltyDiscountAmount = Math.min(loyaltyDiscountAmount, maxDiscount)
    
    // Calculate final totals with clamped discount
    const totals = taxCalculator.calculateSaleTotals(
      saleItemsData.map(i => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })),
      (discountAmount || 0) + loyaltyDiscountAmount
    )
    
    // Create sale
    const sale = await Sale.create({
      business_id: businessId,
      branch_id: branchId,
      customer_id: loyaltyCustomerId,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      loyalty_discount_amount: loyaltyDiscountAmount,
      loyalty_redeemed: loyaltyRedemption ? true : false,
      total_amount: totals.total,
      payment_method: paymentMethod,
      payment_details: paymentDetails || null,
      notes: notes || null,
      sale_date: new Date(),
      created_by_manager: req.managerName || null
    }, { transaction })
    
    // Create sale items
    const saleItems = []
    for (const itemData of saleItemsData) {
      const product = productMap[itemData.productId]
      
      const saleItem = await SaleItem.create({
        sale_id: sale.public_id,
        product_id: product.public_id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: itemData.quantity,
        unit_price: itemData.unitPrice,
        tax_rate: itemData.taxRate,
        tax_amount: taxCalculator.calculateTaxAmount(itemData.unitPrice * itemData.quantity, itemData.taxRate),
        subtotal: itemData.unitPrice * itemData.quantity,
        total: taxCalculator.calculatePriceWithTax(itemData.unitPrice * itemData.quantity, itemData.taxRate),
        notes: itemData.notes || null
      }, { transaction })
      
      saleItems.push(saleItem)
      
      // Update product analytics
      const revenue = parseFloat(saleItem.total)
      await product.incrementSold(itemData.quantity, revenue, { transaction })
    }
    
    // Generate complete receipt content using ReceiptService
    // CRITICAL: Pass transaction to ensure receipt generation can see the uncommitted sale
    const receiptContent = await ReceiptService.generateReceiptContent(sale.public_id, {
      includeLogo: true,
      includeLoyaltyQR: true,
      transaction // Pass transaction for query isolation
    })

    // Create receipt record with enriched content
    const receipt = await Receipt.create({
      sale_id: sale.public_id,
      format: 'digital',
      content_json: receiptContent
    }, { transaction })
    
    // Claim loyalty reward if redemption was processed
    let loyaltyRedemptionResult = null
    if (loyaltyRedemption && progress) {
      try {
        await progress.claimReward(branchId, 'Redeemed via POS')
        await progress.reload({ transaction })
        
        loyaltyRedemptionResult = {
          rewardClaimed: true,
          newProgress: {
            current_stamps: progress.current_stamps,
            rewards_claimed: progress.rewards_claimed
          }
        }
        
        logger.info('Loyalty reward claimed successfully:', {
          customerId: loyaltyRedemption.customerId,
          offerId: loyaltyRedemption.offerId,
          newStamps: progress.current_stamps,
          totalRewards: progress.rewards_claimed
        })
      } catch (claimError) {
        logger.error('Failed to claim loyalty reward:', claimError)
        // Don't rollback the sale, just log the error
        // The sale is already complete, reward can be manually adjusted if needed
      }
    }
    
    await transaction.commit()
    
    logger.info(`Sale created: ${sale.public_id} (${sale.sale_number}) for branch ${branchId}`)
    
    // Fetch complete sale with associations
    const completeSale = await Sale.findOne({
      where: { public_id: sale.public_id },
      include: [
        {
          model: SaleItem,
          as: 'items'
        },
        {
          model: Receipt,
          as: 'receipt'
        },
        {
          model: Customer,
          as: 'customer',
          required: false
        }
      ]
    })
    
    res.status(201).json({
      success: true,
      sale: completeSale,
      receipt: receipt,
      loyaltyRedemption: loyaltyRedemptionResult
    })
    
  } catch (error) {
    await transaction.rollback()
    logger.error('Failed to create sale:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create sale',
      code: 'CREATE_SALE_ERROR',
      details: error.message
    })
  }
})

/**
 * GET /api/pos/sales
 * Get sales for branch
 */
router.get('/sales', requireBranchManagerAuth, async (req, res) => {
  try {
    const { branchId } = req
    const { startDate, endDate, status, paymentMethod, limit, offset } = req.query
    
    // Build where clause
    const where = { branch_id: branchId }
    
    if (status) where.status = status
    if (paymentMethod) where.payment_method = paymentMethod
    
    if (startDate || endDate) {
      where.sale_date = {}
      if (startDate) where.sale_date[Op.gte] = new Date(startDate)
      if (endDate) where.sale_date[Op.lte] = new Date(endDate)
    }
    
    const sales = await Sale.findAll({
      where,
      include: [
        {
          model: SaleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['public_id', 'name', 'name_ar']
            }
          ]
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'first_name', 'last_name', 'whatsapp'],
          required: false
        }
      ],
      order: [['sale_date', 'DESC']],
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    })
    
    res.json({
      success: true,
      sales
    })
    
  } catch (error) {
    logger.error('Failed to fetch sales:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales',
      code: 'FETCH_SALES_ERROR'
    })
  }
})

/**
 * GET /api/pos/sales/:saleId
 * Get single sale details
 */
router.get('/sales/:saleId', requireBranchManagerAuth, async (req, res) => {
  try {
    const { branchId } = req
    const { saleId } = req.params
    
    const sale = await Sale.findOne({
      where: {
        public_id: saleId,
        branch_id: branchId
      },
      include: [
        {
          model: SaleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['public_id', 'name', 'name_ar', 'sku']
            }
          ]
        },
        {
          model: Receipt,
          as: 'receipt'
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'first_name', 'last_name', 'whatsapp', 'email'],
          required: false
        }
      ]
    })
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found',
        code: 'SALE_NOT_FOUND'
      })
    }
    
    res.json({
      success: true,
      sale
    })
    
  } catch (error) {
    logger.error('Failed to fetch sale:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sale',
      code: 'FETCH_SALE_ERROR'
    })
  }
})

/**
 * POST /api/pos/sales/:saleId/refund
 * Refund a sale
 */
router.post('/sales/:saleId/refund', requireBranchManagerAuth, async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const { branchId } = req
    const { saleId } = req.params
    const { reason } = req.body
    
    if (!reason || reason.trim() === '') {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        error: 'Refund reason is required',
        code: 'REASON_REQUIRED'
      })
    }
    
    // Find sale and verify it belongs to branch
    const sale = await Sale.findOne({
      where: {
        public_id: saleId,
        branch_id: branchId
      },
      include: [
        {
          model: SaleItem,
          as: 'items'
        }
      ]
    })
    
    if (!sale) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        error: 'Sale not found',
        code: 'SALE_NOT_FOUND'
      })
    }
    
    // Check if sale can be refunded
    if (!sale.canRefund()) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        error: 'Sale cannot be refunded (already refunded, cancelled, or outside refund window)',
        code: 'CANNOT_REFUND'
      })
    }
    
    // Update sale status
    await sale.markAsRefunded({ transaction })
    
    // Update product analytics (decrement sold counts)
    for (const item of sale.items) {
      const product = await Product.findByPk(item.product_id)
      if (product) {
        product.total_sold = Math.max(0, product.total_sold - item.quantity)
        product.total_revenue = Math.max(0, parseFloat(product.total_revenue) - parseFloat(item.total))
        await product.save({ transaction })
      }
    }
    
    // Add refund note
    sale.notes = (sale.notes || '') + `\n[REFUND] ${new Date().toISOString()}: ${reason}`
    await sale.save({ transaction })
    
    await transaction.commit()
    
    logger.info(`Sale refunded: ${saleId}`)
    
    res.json({
      success: true,
      sale
    })
    
  } catch (error) {
    await transaction.rollback()
    logger.error('Failed to refund sale:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to refund sale',
      code: 'REFUND_SALE_ERROR'
    })
  }
})

/**
 * POST /api/pos/sales/:saleId/cancel
 * Cancel a sale
 */
router.post('/sales/:saleId/cancel', requireBranchManagerAuth, async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const { branchId } = req
    const { saleId } = req.params
    const { reason } = req.body
    
    if (!reason || reason.trim() === '') {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required',
        code: 'REASON_REQUIRED'
      })
    }
    
    // Find sale and verify it belongs to branch
    const sale = await Sale.findOne({
      where: {
        public_id: saleId,
        branch_id: branchId,
        status: 'completed'
      },
      include: [
        {
          model: SaleItem,
          as: 'items'
        }
      ]
    })
    
    if (!sale) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        error: 'Sale not found or already cancelled',
        code: 'SALE_NOT_FOUND'
      })
    }
    
    // Update sale status
    await sale.markAsCancelled({ transaction })
    
    // Update product analytics (decrement sold counts)
    for (const item of sale.items) {
      const product = await Product.findByPk(item.product_id)
      if (product) {
        product.total_sold = Math.max(0, product.total_sold - item.quantity)
        product.total_revenue = Math.max(0, parseFloat(product.total_revenue) - parseFloat(item.total))
        await product.save({ transaction })
      }
    }
    
    // Add cancellation note
    sale.notes = (sale.notes || '') + `\n[CANCELLED] ${new Date().toISOString()}: ${reason}`
    await sale.save({ transaction })
    
    await transaction.commit()
    
    logger.info(`Sale cancelled: ${saleId}`)
    
    res.json({
      success: true,
      sale
    })
    
  } catch (error) {
    await transaction.rollback()
    logger.error('Failed to cancel sale:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel sale',
      code: 'CANCEL_SALE_ERROR'
    })
  }
})

// ============================================
// SECTION 4: Receipts (Branch Manager Access)
// ============================================

/**
 * GET /api/pos/receipts/:saleId
 * Get receipt for sale
 */
router.get('/receipts/:saleId', requireBranchManagerAuth, async (req, res) => {
  try {
    const { branchId } = req
    const { saleId } = req.params
    
    // Verify sale belongs to branch
    const sale = await Sale.findOne({
      where: {
        public_id: saleId,
        branch_id: branchId
      }
    })
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found',
        code: 'SALE_NOT_FOUND'
      })
    }
    
    const receipt = await Receipt.findOne({
      where: { sale_id: saleId }
    })
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found',
        code: 'RECEIPT_NOT_FOUND'
      })
    }
    
    res.json({
      success: true,
      receipt
    })
    
  } catch (error) {
    logger.error('Failed to fetch receipt:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt',
      code: 'FETCH_RECEIPT_ERROR'
    })
  }
})

// ============================================
// SECTION 4: Receipts (DEPRECATED - Use /api/receipts endpoints instead)
// Receipts functionality has been moved to backend/routes/receipts.js
// These legacy endpoints redirect to the new routes for backward compatibility
// ============================================

/**
 * POST /api/pos/receipts/:saleId/print (DEPRECATED)
 * @deprecated Use POST /api/receipts/:saleId/print instead
 * Redirects to the new receipts endpoint
 */
router.post('/receipts/:saleId/print', requireBranchManagerAuth, async (req, res) => {
  // Redirect to new endpoint
  res.status(301).json({
    success: false,
    message: 'This endpoint is deprecated. Please use /api/receipts/:saleId/print',
    redirectTo: `/api/receipts/${req.params.saleId}/print`
  })
})

/**
 * POST /api/pos/receipts/:saleId/email (DEPRECATED)
 * @deprecated Use POST /api/receipts/:saleId/email instead
 * Redirects to the new receipts endpoint
 */
router.post('/receipts/:saleId/email', requireBranchManagerAuth, async (req, res) => {
  // Redirect to new endpoint
  res.status(301).json({
    success: false,
    message: 'This endpoint is deprecated. Please use /api/receipts/:saleId/email',
    redirectTo: `/api/receipts/${req.params.saleId}/email`
  })
})

// ============================================
// SECTION 5: Analytics (Business Dashboard Access)
// ============================================

// POS Analytics Endpoints (using dedicated controller)
router.get('/analytics/today', requireBusinessAuth, POSAnalyticsController.getTodaysSummary)
router.get('/analytics/summary', requireBusinessAuth, POSAnalyticsController.getSalesSummary)
router.get('/analytics/top-products', requireBusinessAuth, POSAnalyticsController.getTopProducts)
router.get('/analytics/sales-trends', requireBusinessAuth, POSAnalyticsController.getSalesTrends)
router.get('/analytics/payment-breakdown', requireBusinessAuth, POSAnalyticsController.getPaymentBreakdown)
router.get('/analytics/category-performance', requireBusinessAuth, POSAnalyticsController.getCategoryPerformance)
router.get('/analytics/hourly-distribution', requireBusinessAuth, POSAnalyticsController.getHourlyDistribution)
router.get('/analytics/export', requireBusinessAuth, POSAnalyticsController.exportAnalytics)

export default router
