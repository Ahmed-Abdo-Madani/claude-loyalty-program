import { Customer, CustomerSegment, CustomerProgress, NotificationLog } from '../models/index.js'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import logger from '../config/logger.js'

class CustomerSegmentationService {
  /**
   * Create a new customer segment
   */
  static async createSegment(businessId, segmentData, userId = null) {
    try {
      logger.info(`Creating new segment: ${segmentData.name}`, { businessId })

      const segment = await CustomerSegment.create({
        business_id: businessId,
        created_by: userId,
        ...segmentData
      })

      // Calculate initial customer count
      await this.calculateSegmentSize(segment.segment_id)

      logger.info(`Segment created: ${segment.name} (${segment.segment_id})`)
      return segment

    } catch (error) {
      logger.error('Failed to create segment', { error: error.message })
      throw error
    }
  }

  /**
   * Get customers in a specific segment
   */
  static async getCustomersInSegment(segmentId, options = {}) {
    try {
      const segment = await CustomerSegment.findOne({
        where: { segment_id: segmentId }
      })

      if (!segment) {
        throw new Error(`Segment ${segmentId} not found`)
      }

      const customers = await this.evaluateSegmentCriteria(segment, options)

      return {
        segment,
        customers,
        total_count: customers.length,
        segment_id: segmentId
      }

    } catch (error) {
      logger.error('Failed to get customers in segment', { segmentId, error: error.message })
      throw error
    }
  }

  /**
   * Calculate and update segment size
   */
  static async calculateSegmentSize(segmentId) {
    try {
      const segment = await CustomerSegment.findOne({
        where: { segment_id: segmentId }
      })

      if (!segment) {
        throw new Error(`Segment ${segmentId} not found`)
      }

      segment.calculation_status = 'calculating'
      await segment.save()

      const customers = await this.evaluateSegmentCriteria(segment)

      // Update segment with new count
      segment.customer_count = customers.length
      segment.calculation_status = 'completed'
      segment.last_calculated_at = new Date()
      await segment.save()

      logger.info(`Segment ${segmentId} size updated: ${customers.length} customers`)

      return {
        segment_id: segmentId,
        customer_count: customers.length,
        calculated_at: new Date()
      }

    } catch (error) {
      logger.error('Failed to calculate segment size', { segmentId, error: error.message })

      // Mark segment calculation as failed
      try {
        const segment = await CustomerSegment.findOne({
          where: { segment_id: segmentId }
        })
        if (segment) {
          segment.calculation_status = 'error'
          await segment.save()
        }
      } catch (updateError) {
        logger.error('Failed to update segment status', updateError)
      }

      throw error
    }
  }

  /**
   * Evaluate segment criteria and return matching customers
   */
  static async evaluateSegmentCriteria(segment, options = {}) {
    try {
      let whereClause = { business_id: segment.business_id }

      // Apply basic demographic filters
      if (segment.age_range) {
        const today = new Date()
        const maxBirthDate = new Date(today.getFullYear() - segment.age_range.min, today.getMonth(), today.getDate())
        const minBirthDate = new Date(today.getFullYear() - segment.age_range.max, today.getMonth(), today.getDate())

        whereClause.date_of_birth = {
          [Op.between]: [minBirthDate, maxBirthDate]
        }
      }

      if (segment.gender && segment.gender !== 'any') {
        whereClause.gender = segment.gender
      }

      // Apply lifecycle and status filters
      if (segment.lifecycle_stages && segment.lifecycle_stages.length > 0) {
        whereClause.lifecycle_stage = { [Op.in]: segment.lifecycle_stages }
      }

      if (segment.customer_status && segment.customer_status.length > 0) {
        whereClause.status = { [Op.in]: segment.customer_status }
      }

      // Apply activity-based filters
      if (segment.last_activity_days !== null) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - segment.last_activity_days)
        whereClause.last_activity_date = { [Op.gte]: cutoffDate }
      }

      // Apply visit frequency filter
      if (segment.visit_frequency) {
        if (segment.visit_frequency.min_visits) {
          whereClause.total_visits = { [Op.gte]: segment.visit_frequency.min_visits }
        }
      }

      // Apply spending range filter
      if (segment.spending_range) {
        const spendingFilter = {}
        if (segment.spending_range.min_amount) {
          spendingFilter[Op.gte] = segment.spending_range.min_amount
        }
        if (segment.spending_range.max_amount) {
          spendingFilter[Op.lte] = segment.spending_range.max_amount
        }
        if (Object.keys(spendingFilter).length > 0) {
          whereClause.total_lifetime_value = spendingFilter
        }
      }

      // Apply signup date range
      if (segment.signup_date_range) {
        whereClause.created_at = {
          [Op.between]: [
            new Date(segment.signup_date_range.start_date),
            new Date(segment.signup_date_range.end_date)
          ]
        }
      }

      // Apply birthday month filter
      if (segment.birthday_month) {
        whereClause[Op.and] = [
          ...(whereClause[Op.and] || []),
          {
            [Op.where]: sequelize.fn('MONTH', sequelize.col('date_of_birth')),
            [Op.eq]: segment.birthday_month
          }
        ]
      }

      // Exclude unsubscribed customers if specified
      if (segment.exclude_unsubscribed) {
        whereClause['preferences.email_notifications'] = true
      }

      // Exclude inactive customers if specified
      if (segment.exclude_inactive) {
        whereClause.status = { [Op.ne]: 'inactive' }
      }

      // Get customers matching the criteria
      let customers = await Customer.findAll({
        where: whereClause,
        limit: options.limit || 1000, // Prevent memory issues with large segments
        offset: options.offset || 0,
        order: options.order || [['last_activity_date', 'DESC']]
      })

      // Apply engagement score filter (post-query since it's computed)
      if (segment.engagement_score_range) {
        customers = customers.filter(customer => {
          const score = customer.getEngagementScore()
          return score >= segment.engagement_score_range.min_score &&
                 score <= segment.engagement_score_range.max_score
        })
      }

      // Apply custom criteria from segment.criteria field
      if (segment.criteria && Object.keys(segment.criteria).length > 0) {
        customers = await this.applyCustomCriteria(customers, segment.criteria)
      }

      return customers

    } catch (error) {
      logger.error('Failed to evaluate segment criteria', { error: error.message })
      throw error
    }
  }

  /**
   * Apply custom criteria to customer list
   */
  static async applyCustomCriteria(customers, criteria) {
    try {
      let filteredCustomers = customers

      // Apply total stamps filter
      if (criteria.total_stamps_min) {
        filteredCustomers = filteredCustomers.filter(c => c.total_stamps_earned >= criteria.total_stamps_min)
      }

      if (criteria.total_stamps_max) {
        filteredCustomers = filteredCustomers.filter(c => c.total_stamps_earned <= criteria.total_stamps_max)
      }

      // Apply rewards claimed filter
      if (criteria.rewards_claimed_min) {
        filteredCustomers = filteredCustomers.filter(c => c.total_rewards_claimed >= criteria.rewards_claimed_min)
      }

      // Apply churn risk filter
      if (criteria.churn_risk) {
        filteredCustomers = filteredCustomers.filter(c => {
          const risk = c.getChurnRisk()
          return criteria.churn_risk.includes(risk)
        })
      }

      // Apply communication preference filters
      if (criteria.communication_preferences) {
        filteredCustomers = filteredCustomers.filter(c => {
          const prefs = c.preferences || {}
          return criteria.communication_preferences.every(pref => {
            switch (pref) {
              case 'email': return prefs.email_notifications
              case 'sms': return prefs.sms_notifications
              case 'push': return prefs.push_notifications
              default: return true
            }
          })
        })
      }

      return filteredCustomers

    } catch (error) {
      logger.error('Failed to apply custom criteria', { error: error.message })
      return customers // Return original list on error
    }
  }

  /**
   * Get predefined segments for high-value customers
   */
  static async getHighValueCustomers(businessId, options = {}) {
    try {
      const criteria = {
        business_id: businessId,
        total_lifetime_value: { [Op.gte]: options.minValue || 500 },
        total_visits: { [Op.gte]: options.minVisits || 10 },
        status: { [Op.in]: ['active', 'vip'] }
      }

      const customers = await Customer.findAll({
        where: criteria,
        order: [['total_lifetime_value', 'DESC']],
        limit: options.limit || 100
      })

      return {
        segment_name: 'High Value Customers',
        customers,
        total_count: customers.length,
        criteria
      }

    } catch (error) {
      logger.error('Failed to get high value customers', { error: error.message })
      throw error
    }
  }

  /**
   * Get customers at risk of churning
   */
  static async getChurningCustomers(businessId, options = {}) {
    try {
      const daysThreshold = options.inactiveDays || 30
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold)

      const criteria = {
        business_id: businessId,
        last_activity_date: { [Op.lt]: cutoffDate },
        total_visits: { [Op.gte]: options.minPreviousVisits || 3 },
        status: { [Op.in]: ['active', 'inactive'] }
      }

      const customers = await Customer.findAll({
        where: criteria,
        order: [['last_activity_date', 'ASC']],
        limit: options.limit || 100
      })

      // Filter by churn risk score
      const churningCustomers = customers.filter(customer => {
        const risk = customer.getChurnRisk()
        return ['high', 'critical'].includes(risk)
      })

      return {
        segment_name: 'At Risk Customers',
        customers: churningCustomers,
        total_count: churningCustomers.length,
        criteria
      }

    } catch (error) {
      logger.error('Failed to get churning customers', { error: error.message })
      throw error
    }
  }

  /**
   * Get customers with birthdays in specified range
   */
  static async getBirthdayCustomers(businessId, dateRange = null) {
    try {
      const today = new Date()
      const startDate = dateRange?.start || today
      const endDate = dateRange?.end || new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)) // Next 7 days

      // Get month and day ranges
      const startMonth = startDate.getMonth() + 1
      const startDay = startDate.getDate()
      const endMonth = endDate.getMonth() + 1
      const endDay = endDate.getDate()

      let customers
      if (startMonth === endMonth) {
        // Same month
        customers = await Customer.findAll({
          where: {
            business_id: businessId,
            date_of_birth: {
              [Op.ne]: null
            },
            [Op.and]: [
              sequelize.where(sequelize.fn('MONTH', sequelize.col('date_of_birth')), startMonth),
              sequelize.where(sequelize.fn('DAY', sequelize.col('date_of_birth')), {
                [Op.between]: [startDay, endDay]
              })
            ]
          }
        })
      } else {
        // Cross month boundary
        customers = await Customer.findAll({
          where: {
            business_id: businessId,
            date_of_birth: {
              [Op.ne]: null
            },
            [Op.or]: [
              {
                [Op.and]: [
                  sequelize.where(sequelize.fn('MONTH', sequelize.col('date_of_birth')), startMonth),
                  sequelize.where(sequelize.fn('DAY', sequelize.col('date_of_birth')), {
                    [Op.gte]: startDay
                  })
                ]
              },
              {
                [Op.and]: [
                  sequelize.where(sequelize.fn('MONTH', sequelize.col('date_of_birth')), endMonth),
                  sequelize.where(sequelize.fn('DAY', sequelize.col('date_of_birth')), {
                    [Op.lte]: endDay
                  })
                ]
              }
            ]
          }
        })
      }

      // Filter customers who have birthday preferences enabled
      const birthdayCustomers = customers.filter(customer =>
        customer.preferences?.birthday_offers !== false
      )

      return {
        segment_name: 'Birthday Customers',
        customers: birthdayCustomers,
        total_count: birthdayCustomers.length,
        date_range: { start: startDate, end: endDate }
      }

    } catch (error) {
      logger.error('Failed to get birthday customers', { error: error.message })
      throw error
    }
  }

  /**
   * Update segment criteria and recalculate
   */
  static async updateSegmentCriteria(segmentId, newCriteria, userId = null) {
    try {
      const segment = await CustomerSegment.findOne({
        where: { segment_id: segmentId }
      })

      if (!segment) {
        throw new Error(`Segment ${segmentId} not found`)
      }

      // Update criteria
      Object.assign(segment, newCriteria)
      segment.updated_at = new Date()
      if (userId) segment.updated_by = userId

      await segment.save()

      // Recalculate segment size if auto_update is enabled
      if (segment.auto_update) {
        await this.calculateSegmentSize(segmentId)
      }

      logger.info(`Segment ${segmentId} criteria updated`)
      return segment

    } catch (error) {
      logger.error('Failed to update segment criteria', { segmentId, error: error.message })
      throw error
    }
  }

  /**
   * Get segment analytics and performance
   */
  static async getSegmentAnalytics(segmentId, dateRange = null) {
    try {
      const segment = await CustomerSegment.findOne({
        where: { segment_id: segmentId }
      })

      if (!segment) {
        throw new Error(`Segment ${segmentId} not found`)
      }

      // Get customers in segment
      const { customers } = await this.getCustomersInSegment(segmentId)

      // Calculate engagement metrics
      const engagementScores = customers.map(c => c.getEngagementScore())
      const avgEngagement = engagementScores.length > 0
        ? engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length
        : 0

      // Calculate lifecycle distribution
      const lifecycleDistribution = customers.reduce((acc, customer) => {
        const stage = customer.lifecycle_stage || 'unknown'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {})

      // Calculate value metrics
      const totalValue = customers.reduce((sum, c) => sum + parseFloat(c.total_lifetime_value || 0), 0)
      const avgValue = customers.length > 0 ? totalValue / customers.length : 0

      // Get notification performance for this segment
      const whereClause = {
        customer_id: { [Op.in]: customers.map(c => c.customer_id) }
      }

      if (dateRange) {
        whereClause.created_at = {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }

      const notificationStats = await NotificationLog.getDeliveryStats(null, segment.business_id, dateRange)

      return {
        segment,
        customer_count: customers.length,
        engagement_metrics: {
          avg_engagement_score: Math.round(avgEngagement),
          high_engagement_count: engagementScores.filter(s => s >= 80).length,
          medium_engagement_count: engagementScores.filter(s => s >= 50 && s < 80).length,
          low_engagement_count: engagementScores.filter(s => s < 50).length
        },
        value_metrics: {
          total_lifetime_value: totalValue,
          avg_lifetime_value: avgValue,
          high_value_count: customers.filter(c => parseFloat(c.total_lifetime_value || 0) >= 500).length
        },
        lifecycle_distribution: lifecycleDistribution,
        notification_performance: notificationStats,
        last_calculated: segment.last_calculated_at
      }

    } catch (error) {
      logger.error('Failed to get segment analytics', { segmentId, error: error.message })
      throw error
    }
  }

  /**
   * Refresh all segments for a business
   */
  static async refreshBusinessSegments(businessId) {
    try {
      logger.info(`Refreshing all segments for business: ${businessId}`)

      const segments = await CustomerSegment.findAll({
        where: {
          business_id: businessId,
          auto_update: true,
          is_active: true
        }
      })

      const results = []
      for (const segment of segments) {
        try {
          const result = await this.calculateSegmentSize(segment.segment_id)
          results.push({ ...result, success: true })
        } catch (error) {
          results.push({
            segment_id: segment.segment_id,
            success: false,
            error: error.message
          })
        }
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      logger.info(`Segment refresh completed: ${successful} successful, ${failed} failed`)

      return {
        business_id: businessId,
        total_segments: segments.length,
        successful,
        failed,
        results
      }

    } catch (error) {
      logger.error('Failed to refresh business segments', { businessId, error: error.message })
      throw error
    }
  }

  /**
   * Create predefined segments for a new business
   */
  static async createPredefinedSegments(businessId, userId = null) {
    try {
      logger.info(`Creating predefined segments for business: ${businessId}`)

      const segments = await CustomerSegment.createPredefinedSegments(businessId)

      // Calculate initial sizes for all segments
      for (const segment of segments) {
        await this.calculateSegmentSize(segment.segment_id)
      }

      logger.info(`Created ${segments.length} predefined segments for business ${businessId}`)
      return segments

    } catch (error) {
      logger.error('Failed to create predefined segments', { businessId, error: error.message })
      throw error
    }
  }
}

export default CustomerSegmentationService