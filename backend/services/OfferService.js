import { Offer, Business, CustomerProgress } from '../models/index.js'

class OfferService {
  // Offer CRUD operations
  static async findById(id) {
    return await Offer.findByPk(id, {
      include: ['business']
    })
  }

  static async findByBusinessId(businessId) {
    return await Offer.findAll({
      where: { business_id: businessId },
      include: ['business'],
      order: [['created_at', 'DESC']]
    })
  }

  static async getAllOffers() {
    return await Offer.findAll({
      include: ['business'],
      order: [['created_at', 'DESC']]
    })
  }

  static async createOffer(offerData) {
    // Verify business exists
    const business = await Business.findByPk(offerData.business_id)
    if (!business) {
      throw new Error(`Business with ID ${offerData.business_id} not found`)
    }

    // Business verification check - Relaxed for development
    const isProduction = process.env.NODE_ENV === 'production'
    const isProfileComplete = business.is_verified && business.profile_completion >= 100

    if (isProduction && !isProfileComplete) {
      const error = new Error('Business must be verified and profile 100% complete to create offers')
      error.status = 403
      error.code = 'VERIFICATION_REQUIRED'
      throw error
    }

    // Ensure reward_description is present (mandatory in DB)
    if (!offerData.reward_description) {
      offerData.reward_description = offerData.description || offerData.title || 'Special Reward'
    }

    // Sanitize date fields - convert empty strings or invalid values to null
    const sanitizedOfferData = {
      ...offerData,
      start_date: offerData.start_date && typeof offerData.start_date === 'string' && offerData.start_date.trim() !== '' ? offerData.start_date : null,
      end_date: offerData.end_date && typeof offerData.end_date === 'string' && offerData.end_date.trim() !== '' ? offerData.end_date : null
    }

    // Check offer plan limits
    const limits = business.getPlanLimits()
    const currentOfferCount = await Offer.count({ where: { business_id: offerData.business_id } })

    if (currentOfferCount >= limits.offers && limits.offers !== Infinity) {
      const error = new Error('Offer limit reached for your current plan')
      error.status = 403
      error.code = 'PLAN_LIMIT_REACHED'
      error.limitType = 'offers'
      error.limits = {
        current: currentOfferCount,
        max: limits.offers,
        plan: business.current_plan,
        suggestedPlan: business.current_plan === 'free' ? 'professional' : 'enterprise'
      }
      throw error
    }

    const offer = await Offer.create(sanitizedOfferData)

    // Update business offer counts
    await business.increment(['total_offers', 'active_offers'])

    return offer
  }

  static async updateOffer(id, updateData) {
    const offer = await Offer.findByPk(id)
    if (!offer) {
      throw new Error(`Offer with ID ${id} not found`)
    }
    return await offer.update(updateData)
  }

  static async deleteOffer(id) {
    const offer = await Offer.findByPk(id, {
      include: ['business']
    })

    if (!offer) {
      throw new Error(`Offer with ID ${id} not found`)
    }

    // Update business offer counts
    if (offer.business) {
      await offer.business.decrement('total_offers')
      if (offer.status === 'active') {
        await offer.business.decrement('active_offers')
      }
    }

    return await offer.destroy()
  }

  static async toggleOfferStatus(id) {
    const offer = await Offer.findByPk(id, {
      include: ['business']
    })

    if (!offer) {
      throw new Error(`Offer with ID ${id} not found`)
    }

    const newStatus = offer.status === 'active' ? 'paused' : 'active'

    // Business verification check when activating (publishing) an offer
    if (newStatus === 'active' && offer.business) {
      if (!offer.business.is_verified || offer.business.profile_completion < 100) {
        const error = new Error('Business must be verified and profile 100% complete to activate offers')
        error.status = 403
        error.code = 'VERIFICATION_REQUIRED'
        throw error
      }
    }

    await offer.update({ status: newStatus })

    // Update business active offer count
    if (offer.business) {
      if (newStatus === 'active') {
        await offer.business.increment('active_offers')
      } else {
        await offer.business.decrement('active_offers')
      }
    }

    return offer
  }

  // Offer analytics and statistics
  static async getOfferAnalytics(id) {
    const offer = await Offer.findByPk(id)
    if (!offer) {
      throw new Error(`Offer with ID ${id} not found`)
    }

    return {
      id: offer.id,
      title: offer.title,
      status: offer.status,
      customers: offer.customers,
      redeemed: offer.redeemed,
      conversion_rate: offer.conversion_rate,
      stamps_required: offer.stamps_required,
      total_scans: offer.total_scans,
      created_at: offer.created_at
    }
  }

  static async incrementOfferCustomers(id, incrementBy = 1) {
    const offer = await Offer.findByPk(id)
    if (!offer) {
      throw new Error(`Offer with ID ${id} not found`)
    }
    return await offer.increment('customers', { by: incrementBy })
  }

  static async incrementOfferRedemptions(id, incrementBy = 1) {
    const offer = await Offer.findByPk(id)
    if (!offer) {
      throw new Error(`Offer with ID ${id} not found`)
    }
    return await offer.increment('redeemed', { by: incrementBy })
  }

  static async updateOfferConversionRate(id) {
    const offer = await Offer.findByPk(id)
    if (!offer) {
      throw new Error(`Offer with ID ${id} not found`)
    }
    return await offer.calculateConversionRate()
  }

  // Search and filtering
  static async searchOffers(filters = {}) {
    const whereClause = {}
    const includeClause = ['business']

    if (filters.business_id) {
      whereClause.business_id = filters.business_id
    }

    if (filters.status) {
      whereClause.status = filters.status
    }

    if (filters.type) {
      whereClause.type = filters.type
    }

    if (filters.branch && filters.branch !== 'All Branches') {
      whereClause.branch = filters.branch
    }

    return await Offer.findAll({
      where: whereClause,
      include: includeClause,
      order: [['created_at', 'DESC']]
    })
  }

  // Offer validation
  static validateOfferData(offerData) {
    const errors = []

    if (!offerData.title || offerData.title.trim().length === 0) {
      errors.push('Title is required')
    }

    if (!offerData.business_id) {
      errors.push('Business ID is required')
    }

    if (offerData.stamps_required && (offerData.stamps_required < 1 || offerData.stamps_required > 100)) {
      errors.push('Stamps required must be between 1 and 100')
    }

    if (offerData.is_time_limited) {
      // Check for null or empty after sanitization
      if (!offerData.start_date || !offerData.end_date) {
        errors.push('Start and end dates are required for time-limited offers')
      } else if (new Date(offerData.end_date) <= new Date(offerData.start_date)) {
        errors.push('End date must be after start date')
      }
    }

    return errors
  }
}

export default OfferService