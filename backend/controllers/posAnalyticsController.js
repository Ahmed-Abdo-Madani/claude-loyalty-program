import { Op, fn, col, literal } from 'sequelize'
import sequelize from '../config/database.js'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Product from '../models/Product.js'
import ProductCategory from '../models/ProductCategory.js'
import Branch from '../models/Branch.js'
import Business from '../models/Business.js'
import logger from '../config/logger.js'

/**
 * POS Analytics Controller
 * Provides comprehensive analytics for Point of Sale operations
 * Follows patterns from adminAnalyticsController.js
 */
class POSAnalyticsController {
  /**
   * GET /api/pos/analytics/summary
   * Main analytics dashboard with sales summary
   */
  static async getSalesSummary(req, res) {
    try {
      const businessId = req.businessId
      const { startDate, endDate, branchId } = req.query
      
      // Validate and parse dates
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
          code: 'INVALID_DATE_RANGE'
        })
      }
      
      const { parsedStartDate, parsedEndDate } = dateValidation
      
      // Build where clause
      const where = {
        business_id: businessId,
        sale_date: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        },
        status: 'completed'
      }
      
      if (branchId) {
        where.branch_id = branchId
      }
      
      // Get total sales count and revenue
      const totalSales = await Sale.count({ where })
      const totalRevenue = await Sale.sum('total_amount', { where }) || 0
      const totalTax = await Sale.sum('tax_amount', { where }) || 0
      const avgTransaction = totalSales > 0 ? totalRevenue / totalSales : 0
      
      // Sales by payment method
      const paymentBreakdown = await Sale.findAll({
        where,
        attributes: [
          'payment_method',
          [fn('COUNT', col('public_id')), 'count'],
          [fn('SUM', col('total_amount')), 'total'],
          [fn('AVG', col('total_amount')), 'avgValue']
        ],
        group: ['payment_method']
      })
      
      const formattedPaymentBreakdown = paymentBreakdown.map(payment => ({
        paymentMethod: payment.payment_method,
        count: parseInt(payment.getDataValue('count')),
        total: parseFloat(payment.getDataValue('total')),
        avgValue: parseFloat(payment.getDataValue('avgValue')),
        percentage: totalRevenue > 0 ? ((parseFloat(payment.getDataValue('total')) / totalRevenue) * 100) : 0
      }))
      
      // Sales by branch (if multi-branch)
      let branchBreakdown = []
      if (!branchId) {
        const branchSales = await Sale.findAll({
          where,
          include: [
            {
              model: Branch,
              as: 'branch',
              attributes: ['public_id', 'name', 'name_ar']
            }
          ],
          attributes: [
            'branch_id',
            [fn('COUNT', col('Sale.public_id')), 'count'],
            [fn('SUM', col('total_amount')), 'total']
          ],
          group: ['branch_id', 'branch.public_id', 'branch.name', 'branch.name_ar']
        })
        
        branchBreakdown = branchSales.map(sale => ({
          branchId: sale.branch_id,
          branchName: sale.branch?.name || 'Unknown',
          branchNameAr: sale.branch?.name_ar,
          count: parseInt(sale.getDataValue('count')),
          total: parseFloat(sale.getDataValue('total'))
        }))
      }
      
      // Loyalty redemptions
      const loyaltyStats = await Sale.findAll({
        where: {
          ...where,
          loyalty_redeemed: true
        },
        attributes: [
          [fn('COUNT', col('public_id')), 'count'],
          [fn('SUM', col('loyalty_discount_amount')), 'totalDiscount']
        ]
      })
      
      const loyaltyRedemptions = loyaltyStats.length > 0 ? parseInt(loyaltyStats[0].getDataValue('count')) : 0
      const loyaltyDiscountTotal = loyaltyStats.length > 0 ? parseFloat(loyaltyStats[0].getDataValue('totalDiscount')) || 0 : 0
      
      // Calculate growth (compare to previous period)
      const previousPeriod = getPreviousPeriod(parsedStartDate, parsedEndDate)
      const previousWhere = {
        business_id: businessId,
        sale_date: {
          [Op.between]: [previousPeriod.prevStartDate, previousPeriod.prevEndDate]
        },
        status: 'completed'
      }
      
      if (branchId) {
        previousWhere.branch_id = branchId
      }
      
      const previousSales = await Sale.count({ where: previousWhere })
      const previousRevenue = await Sale.sum('total_amount', { where: previousWhere }) || 0
      
      const salesGrowth = calculateGrowth(totalSales, previousSales)
      const revenueGrowth = calculateGrowth(totalRevenue, previousRevenue)
      
      logger.info('POS analytics summary fetched', {
        businessId,
        branchId,
        totalSales,
        totalRevenue
      })
      
      res.json({
        success: true,
        data: {
          summary: {
            totalSales,
            totalRevenue: parseFloat(totalRevenue),
            totalTax: parseFloat(totalTax),
            avgTransaction: parseFloat(avgTransaction),
            salesGrowth,
            revenueGrowth
          },
          paymentBreakdown: formattedPaymentBreakdown,
          branchBreakdown,
          loyaltyStats: {
            redemptions: loyaltyRedemptions,
            totalDiscount: parseFloat(loyaltyDiscountTotal)
          }
        }
      })
      
    } catch (error) {
      logger.error('Failed to fetch POS analytics summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics summary',
        code: 'FETCH_ANALYTICS_ERROR'
      })
    }
  }
  
  /**
   * GET /api/pos/analytics/top-products
   * Best selling products by quantity or revenue
   */
  static async getTopProducts(req, res) {
    try {
      const businessId = req.businessId
      const { startDate, endDate, branchId, limit = '10', sortBy = 'revenue' } = req.query
      
      // Validate dates
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
          code: 'INVALID_DATE_RANGE'
        })
      }
      
      const { parsedStartDate, parsedEndDate } = dateValidation
      
      // Build where clause for sales
      const saleWhere = {
        business_id: businessId,
        sale_date: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        },
        status: 'completed'
      }
      
      if (branchId) {
        saleWhere.branch_id = branchId
      }
      
      // Get top products
      const topProducts = await SaleItem.findAll({
        attributes: [
          'product_id',
          [fn('SUM', col('quantity')), 'totalQuantity'],
          [fn('SUM', col('total')), 'totalRevenue'],
          [fn('COUNT', col('SaleItem.id')), 'salesCount']
        ],
        include: [
          {
            model: Sale,
            as: 'sale',
            where: saleWhere,
            attributes: []
          },
          {
            model: Product,
            as: 'product',
            attributes: ['public_id', 'name', 'name_ar', 'price', 'category_id']
          }
        ],
        group: ['product_id', 'product.public_id', 'product.name', 'product.name_ar', 'product.price', 'product.category_id'],
        order: [[fn('SUM', sortBy === 'quantity' ? col('quantity') : col('total')), 'DESC']],
        limit: parseInt(limit),
        subQuery: false
      })
      
      const formattedProducts = topProducts.map(item => ({
        productId: item.product_id,
        productName: item.product?.name || 'Unknown',
        productNameAr: item.product?.name_ar,
        price: item.product?.price || 0,
        totalQuantity: parseInt(item.getDataValue('totalQuantity')),
        totalRevenue: parseFloat(item.getDataValue('totalRevenue')),
        salesCount: parseInt(item.getDataValue('salesCount'))
      }))
      
      logger.info('Top products fetched', {
        businessId,
        count: formattedProducts.length
      })
      
      res.json({
        success: true,
        data: {
          topProducts: formattedProducts
        }
      })
      
    } catch (error) {
      logger.error('Failed to fetch top products:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top products',
        code: 'FETCH_TOP_PRODUCTS_ERROR'
      })
    }
  }
  
  /**
   * GET /api/pos/analytics/sales-trends
   * Time-series sales data with configurable granularity
   */
  static async getSalesTrends(req, res) {
    try {
      const businessId = req.businessId
      const { startDate, endDate, branchId, granularity = 'daily' } = req.query
      
      // Validate dates
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
          code: 'INVALID_DATE_RANGE'
        })
      }
      
      const { parsedStartDate, parsedEndDate } = dateValidation
      
      // Validate granularity
      const validGranularities = ['daily', 'weekly', 'monthly']
      if (!validGranularities.includes(granularity)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid granularity. Must be daily, weekly, or monthly',
          code: 'INVALID_GRANULARITY'
        })
      }
      
      // Map granularity to PostgreSQL date_trunc format
      const truncFormat = {
        daily: 'day',
        weekly: 'week',
        monthly: 'month'
      }[granularity]
      
      // Build where conditions
      let branchCondition = ''
      const replacements = {
        businessId,
        startDate: parsedStartDate,
        endDate: parsedEndDate
      }
      
      if (branchId) {
        branchCondition = 'AND branch_id = :branchId'
        replacements.branchId = branchId
      }
      
      // Raw SQL query for time-series data
      const query = `
        SELECT 
          DATE_TRUNC('${truncFormat}', sale_date) as period,
          COUNT(*) as sales_count,
          SUM(total_amount) as total_revenue,
          SUM(tax_amount) as total_tax,
          AVG(total_amount) as avg_transaction_value
        FROM sales
        WHERE business_id = :businessId
          AND sale_date BETWEEN :startDate AND :endDate
          AND status = 'completed'
          ${branchCondition}
        GROUP BY period
        ORDER BY period
      `
      
      const trends = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      })
      
      const formattedTrends = trends.map(trend => ({
        period: trend.period,
        salesCount: parseInt(trend.sales_count),
        totalRevenue: parseFloat(trend.total_revenue),
        totalTax: parseFloat(trend.total_tax),
        avgTransactionValue: parseFloat(trend.avg_transaction_value)
      }))
      
      logger.info('Sales trends fetched', {
        businessId,
        granularity,
        dataPoints: formattedTrends.length
      })
      
      res.json({
        success: true,
        data: {
          trends: formattedTrends,
          granularity
        }
      })
      
    } catch (error) {
      logger.error('Failed to fetch sales trends:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sales trends',
        code: 'FETCH_TRENDS_ERROR'
      })
    }
  }
  
  /**
   * GET /api/pos/analytics/payment-breakdown
   * Detailed payment method analysis with trends
   */
  static async getPaymentBreakdown(req, res) {
    try {
      const businessId = req.businessId
      const { startDate, endDate, branchId } = req.query
      
      // Validate dates
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
          code: 'INVALID_DATE_RANGE'
        })
      }
      
      const { parsedStartDate, parsedEndDate } = dateValidation
      
      // Build where clause
      const where = {
        business_id: businessId,
        sale_date: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        },
        status: 'completed'
      }
      
      if (branchId) {
        where.branch_id = branchId
      }
      
      // Get payment breakdown
      const paymentData = await Sale.findAll({
        where,
        attributes: [
          'payment_method',
          [fn('COUNT', col('public_id')), 'count'],
          [fn('SUM', col('total_amount')), 'total'],
          [fn('AVG', col('total_amount')), 'avgValue']
        ],
        group: ['payment_method']
      })
      
      const totalRevenue = await Sale.sum('total_amount', { where }) || 0
      
      // Calculate previous period for trend
      const previousPeriod = getPreviousPeriod(parsedStartDate, parsedEndDate)
      const previousWhere = {
        business_id: businessId,
        sale_date: {
          [Op.between]: [previousPeriod.prevStartDate, previousPeriod.prevEndDate]
        },
        status: 'completed'
      }
      
      if (branchId) {
        previousWhere.branch_id = branchId
      }
      
      const previousPaymentData = await Sale.findAll({
        where: previousWhere,
        attributes: [
          'payment_method',
          [fn('SUM', col('total_amount')), 'total']
        ],
        group: ['payment_method']
      })
      
      // Create previous period lookup
      const previousLookup = {}
      previousPaymentData.forEach(payment => {
        previousLookup[payment.payment_method] = parseFloat(payment.getDataValue('total'))
      })
      
      // Format breakdown with trends
      const breakdown = paymentData.map(payment => {
        const currentTotal = parseFloat(payment.getDataValue('total'))
        const previousTotal = previousLookup[payment.payment_method] || 0
        
        return {
          paymentMethod: payment.payment_method,
          count: parseInt(payment.getDataValue('count')),
          total: currentTotal,
          avgValue: parseFloat(payment.getDataValue('avgValue')),
          percentage: totalRevenue > 0 ? ((currentTotal / totalRevenue) * 100) : 0,
          trend: calculateGrowth(currentTotal, previousTotal)
        }
      })
      
      logger.info('Payment breakdown fetched', {
        businessId,
        methods: breakdown.length
      })
      
      res.json({
        success: true,
        data: {
          breakdown
        }
      })
      
    } catch (error) {
      logger.error('Failed to fetch payment breakdown:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment breakdown',
        code: 'FETCH_PAYMENT_BREAKDOWN_ERROR'
      })
    }
  }
  
  /**
   * GET /api/pos/analytics/category-performance
   * Sales by product category
   */
  static async getCategoryPerformance(req, res) {
    try {
      const businessId = req.businessId
      const { startDate, endDate, branchId } = req.query
      
      // Validate dates
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
          code: 'INVALID_DATE_RANGE'
        })
      }
      
      const { parsedStartDate, parsedEndDate } = dateValidation
      
      // Build where clause for sales
      const saleWhere = {
        business_id: businessId,
        sale_date: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        },
        status: 'completed'
      }
      
      if (branchId) {
        saleWhere.branch_id = branchId
      }
      
      // Get category performance
      const categoryData = await SaleItem.findAll({
        attributes: [
          [fn('SUM', col('quantity')), 'totalQuantity'],
          [fn('SUM', col('total')), 'totalRevenue']
        ],
        include: [
          {
            model: Sale,
            as: 'sale',
            where: saleWhere,
            attributes: []
          },
          {
            model: Product,
            as: 'product',
            attributes: [],
            include: [
              {
                model: ProductCategory,
                as: 'category',
                attributes: ['public_id', 'name', 'name_ar']
              }
            ]
          }
        ],
        group: ['product.category.public_id', 'product.category.name', 'product.category.name_ar'],
        order: [[fn('SUM', col('total')), 'DESC']],
        subQuery: false
      })
      
      const totalRevenue = categoryData.reduce((sum, cat) => sum + parseFloat(cat.getDataValue('totalRevenue')), 0)
      
      const categories = categoryData.map(cat => ({
        categoryId: cat.product?.category?.public_id || null,
        categoryName: cat.product?.category?.name || 'Uncategorized',
        categoryNameAr: cat.product?.category?.name_ar,
        totalQuantity: parseInt(cat.getDataValue('totalQuantity')),
        totalRevenue: parseFloat(cat.getDataValue('totalRevenue')),
        percentage: totalRevenue > 0 ? ((parseFloat(cat.getDataValue('totalRevenue')) / totalRevenue) * 100) : 0
      }))
      
      logger.info('Category performance fetched', {
        businessId,
        categories: categories.length
      })
      
      res.json({
        success: true,
        data: {
          categories
        }
      })
      
    } catch (error) {
      logger.error('Failed to fetch category performance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category performance',
        code: 'FETCH_CATEGORY_PERFORMANCE_ERROR'
      })
    }
  }
  
  /**
   * GET /api/pos/analytics/hourly-distribution
   * Sales by hour of day for staffing optimization
   */
  static async getHourlyDistribution(req, res) {
    try {
      const businessId = req.businessId
      const { startDate, endDate, branchId } = req.query
      
      // Validate dates
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
          code: 'INVALID_DATE_RANGE'
        })
      }
      
      const { parsedStartDate, parsedEndDate } = dateValidation
      
      // Build where conditions
      let branchCondition = ''
      const replacements = {
        businessId,
        startDate: parsedStartDate,
        endDate: parsedEndDate
      }
      
      if (branchId) {
        branchCondition = 'AND branch_id = :branchId'
        replacements.branchId = branchId
      }
      
      // Raw SQL query for hourly distribution
      const query = `
        SELECT 
          EXTRACT(HOUR FROM sale_date) as hour,
          COUNT(*) as sales_count,
          SUM(total_amount) as total_revenue
        FROM sales
        WHERE business_id = :businessId
          AND sale_date BETWEEN :startDate AND :endDate
          AND status = 'completed'
          ${branchCondition}
        GROUP BY hour
        ORDER BY hour
      `
      
      const hourlyData = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      })
      
      const hourlyDistribution = hourlyData.map(data => ({
        hour: parseInt(data.hour),
        salesCount: parseInt(data.sales_count),
        totalRevenue: parseFloat(data.total_revenue)
      }))
      
      logger.info('Hourly distribution fetched', {
        businessId,
        hours: hourlyDistribution.length
      })
      
      res.json({
        success: true,
        data: {
          hourlyDistribution
        }
      })
      
    } catch (error) {
      logger.error('Failed to fetch hourly distribution:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hourly distribution',
        code: 'FETCH_HOURLY_DISTRIBUTION_ERROR'
      })
    }
  }
  
  /**
   * GET /api/pos/analytics/export
   * Export analytics to CSV or JSON
   */
  static async exportAnalytics(req, res) {
    try {
      const businessId = req.businessId
      const { startDate, endDate, branchId, format = 'csv' } = req.query
      
      // Validate dates
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
          code: 'INVALID_DATE_RANGE'
        })
      }
      
      const { parsedStartDate, parsedEndDate } = dateValidation
      
      // Build where clause
      const where = {
        business_id: businessId,
        sale_date: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        },
        status: 'completed'
      }
      
      if (branchId) {
        where.branch_id = branchId
      }
      
      // Fetch comprehensive data
      const sales = await Sale.findAll({
        where,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['name']
          }
        ],
        attributes: ['sale_date', 'sale_number', 'total_amount', 'tax_amount', 'payment_method'],
        order: [['sale_date', 'DESC']]
      })
      
      // Format data
      const exportData = sales.map(sale => ({
        date: sale.sale_date.toISOString().split('T')[0],
        saleNumber: sale.sale_number,
        branch: sale.branch?.name || 'N/A',
        totalAmount: parseFloat(sale.total_amount),
        taxAmount: parseFloat(sale.tax_amount),
        paymentMethod: sale.payment_method
      }))
      
      if (format === 'csv') {
        // Convert to CSV
        const headers = ['Date', 'Sale Number', 'Branch', 'Total Amount', 'Tax Amount', 'Payment Method']
        const csvRows = [headers.join(',')]
        
        exportData.forEach(row => {
          csvRows.push([
            row.date,
            row.saleNumber,
            row.branch,
            row.totalAmount,
            row.taxAmount,
            row.paymentMethod
          ].join(','))
        })
        
        const csv = csvRows.join('\n')
        const filename = `pos-analytics-${parsedStartDate.toISOString().split('T')[0]}-to-${parsedEndDate.toISOString().split('T')[0]}.csv`
        
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.send(csv)
        
        logger.info('Analytics exported as CSV', {
          businessId,
          rows: exportData.length
        })
      } else {
        // Return JSON
        res.json({
          success: true,
          data: {
            exportData,
            count: exportData.length
          }
        })
        
        logger.info('Analytics exported as JSON', {
          businessId,
          rows: exportData.length
        })
      }
      
    } catch (error) {
      logger.error('Failed to export analytics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics',
        code: 'EXPORT_ANALYTICS_ERROR'
      })
    }
  }
}

/**
 * Helper Functions
 */

/**
 * Calculate percentage growth between two values
 */
function calculateGrowth(currentValue, previousValue) {
  if (previousValue === 0) {
    return currentValue > 0 ? '+100%' : '0%'
  }
  
  const growth = ((currentValue - previousValue) / previousValue) * 100
  const sign = growth >= 0 ? '+' : ''
  return `${sign}${growth.toFixed(1)}%`
}

/**
 * Get previous period dates for comparison
 */
function getPreviousPeriod(startDate, endDate) {
  const periodLength = endDate - startDate
  const prevEndDate = new Date(startDate.getTime() - 1)
  const prevStartDate = new Date(prevEndDate.getTime() - periodLength)
  
  return {
    prevStartDate,
    prevEndDate
  }
}

/**
 * Format amount as Saudi Riyal
 */
function formatCurrency(amount) {
  return `${parseFloat(amount).toFixed(2)} SAR`
}

/**
 * Validate date range parameters
 */
function validateDateRange(startDate, endDate) {
  // Default to last 30 days if not provided
  let parsedStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let parsedEndDate = endDate ? new Date(endDate) : new Date()
  
  // Validate dates are valid
  if (isNaN(parsedStartDate.getTime())) {
    return { valid: false, error: 'Invalid start date format' }
  }
  
  if (isNaN(parsedEndDate.getTime())) {
    return { valid: false, error: 'Invalid end date format' }
  }
  
  // Check endDate > startDate
  if (parsedEndDate < parsedStartDate) {
    return { valid: false, error: 'End date must be after start date' }
  }
  
  // Check range is not too large (max 1 year)
  const oneYear = 365 * 24 * 60 * 60 * 1000
  if (parsedEndDate - parsedStartDate > oneYear) {
    return { valid: false, error: 'Date range cannot exceed 1 year' }
  }
  
  return {
    valid: true,
    parsedStartDate,
    parsedEndDate
  }
}

export default POSAnalyticsController
