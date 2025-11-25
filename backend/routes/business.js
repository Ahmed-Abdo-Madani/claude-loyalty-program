import express from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import logger from '../config/logger.js'
import sequelize from '../config/database.js'
import BusinessService from '../services/BusinessService.js'
import OfferService from '../services/OfferService.js'
import CustomerService from '../services/CustomerService.js'
import SubscriptionService from '../services/SubscriptionService.js'
import MoyasarService from '../services/MoyasarService.js'
import InvoiceService from '../services/InvoiceService.js'
import { Business, Offer, CustomerProgress, Branch, OfferCardDesign, Customer, BusinessSession, Payment, Subscription, Invoice } from '../models/index.js'
import { Op } from 'sequelize'
import { requireBusinessAuth, checkTrialExpiration, checkSubscriptionLimit } from '../middleware/hybridBusinessAuth.js'
import appleWalletController from '../controllers/appleWalletController.js'
import googleWalletController from '../controllers/realGoogleWalletController.js'
import { upload, handleUploadError } from '../middleware/logoUpload.js'
import { getLocalizedMessage } from '../middleware/languageMiddleware.js'

const router = express.Router()

// Validation helper for loyalty_tiers
function validateLoyaltyTiers(tierConfig) {
  if (!tierConfig) return null // null/undefined is valid (tiers disabled)
  
  // Handle both formats: { enabled: true, tiers: [...] } or just [...]
  let tiersArray
  let enabled = true
  
  if (typeof tierConfig === 'object' && !Array.isArray(tierConfig)) {
    // Frontend sends { enabled: true, tiers: [...] }
    enabled = tierConfig.enabled !== false
    tiersArray = tierConfig.tiers || []
    
    if (!enabled) {
      logger.debug('Tier system disabled, skipping validation')
      return tierConfig // Return as-is if disabled
    }
  } else if (Array.isArray(tierConfig)) {
    // Direct array format (backward compatibility)
    tiersArray = tierConfig
  } else {
    throw new Error('loyalty_tiers must be an array or object with tiers property')
  }
  
  if (!Array.isArray(tiersArray)) {
    throw new Error('loyalty_tiers.tiers must be an array')
  }
  
  if (tiersArray.length < 2 || tiersArray.length > 5) {
    throw new Error('loyalty_tiers must have between 2 and 5 tiers')
  }
  
  logger.debug(`Validating ${tiersArray.length} tiers:`, tiersArray.map(t => ({ name: t.name, minRewards: t.minRewards, maxRewards: t.maxRewards })))
  
  for (let i = 0; i < tiersArray.length; i++) {
    const tier = tiersArray[i]
    const tierLabel = `Tier ${i + 1} (${tier.name || 'unnamed'})`
    
    // Required fields
    if (!tier.name || typeof tier.name !== 'string' || tier.name.trim() === '') {
      throw new Error(`${tierLabel}: name is required and must be a non-empty string`)
    }
    
    // Optional nameAr validation (Arabic name)
    if (tier.nameAr !== undefined && typeof tier.nameAr !== 'string') {
      throw new Error(`${tierLabel}: nameAr must be a string`)
    }
    
    // Validate minRewards (required)
    // First tier can start at 0 (for "New Member" tier) or 1
    const minAllowedValue = (i === 0) ? 0 : 1
    if (tier.minRewards === undefined || typeof tier.minRewards !== 'number' || tier.minRewards < minAllowedValue) {
      if (i === 0) {
        throw new Error(`${tierLabel}: minRewards is required and must be 0 or 1 for first tier. Got: ${tier.minRewards}`)
      } else {
        throw new Error(`${tierLabel}: minRewards is required and must be a positive number (>= 1). Got: ${tier.minRewards}`)
      }
    }
    
    // Validate maxRewards (required, can be null for unlimited)
    if (tier.maxRewards !== null && tier.maxRewards !== undefined) {
      if (typeof tier.maxRewards !== 'number') {
        throw new Error(`${tierLabel}: maxRewards must be a number or null (unlimited). Got: ${typeof tier.maxRewards}`)
      }
      if (tier.maxRewards < tier.minRewards) {
        throw new Error(`${tierLabel}: maxRewards (${tier.maxRewards}) must be >= minRewards (${tier.minRewards})`)
      }
    }
    
    // Only the last tier can have maxRewards = null (unlimited)
    if (tier.maxRewards === null && i !== tiersArray.length - 1) {
      throw new Error(`${tierLabel}: Only the last tier can have maxRewards = null (unlimited). Non-last tiers must have a specific maxRewards value.`)
    }
    
    if (!tier.color || typeof tier.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(tier.color)) {
      throw new Error(`${tierLabel}: color is required and must be a valid hex color (e.g., #FFD700). Got: ${tier.color}`)
    }
    
    if (!tier.icon || typeof tier.icon !== 'string' || tier.icon.trim() === '') {
      throw new Error(`${tierLabel}: icon is required and must be a non-empty string (emoji)`)
    }
    
    // Optional reward boost must be between 0 and 1
    if (tier.rewardBoost !== undefined) {
      if (typeof tier.rewardBoost !== 'number' || tier.rewardBoost < 0 || tier.rewardBoost > 1) {
        throw new Error(`${tierLabel}: rewardBoost must be a number between 0 and 1. Got: ${tier.rewardBoost}`)
      }
    }
    
    // Optional iconUrl validation
    if (tier.iconUrl !== undefined && typeof tier.iconUrl !== 'string') {
      throw new Error(`${tierLabel}: iconUrl must be a string (URL)`)
    }
    
    // Ensure tiers are in ascending order
    if (i > 0) {
      const prevTier = tiersArray[i - 1]
      
      if (tier.minRewards <= prevTier.minRewards) {
        throw new Error(`${tierLabel}: minRewards (${tier.minRewards}) must be greater than previous tier's minRewards (${prevTier.minRewards})`)
      }
      
      // Check for gaps (optional - could allow gaps if business wants)
      if (prevTier.maxRewards !== null && tier.minRewards !== prevTier.maxRewards + 1) {
        logger.warn(`${tierLabel}: Gap detected between tier ranges. Previous tier maxRewards: ${prevTier.maxRewards}, current minRewards: ${tier.minRewards}`)
      }
    }
  }
  
  // First tier must start at 0 or 1
  // 0 = explicit "New Member" tier, 1 = synthetic New Member tier generated by backend
  if (tiersArray[0].minRewards !== 0 && tiersArray[0].minRewards !== 1) {
    throw new Error(`First tier must have minRewards = 0 (explicit New Member tier) or 1 (backend generates New Member tier). Got: ${tiersArray[0].minRewards}`)
  }
  
  // Last tier MUST have maxRewards = null (unlimited) - ENFORCE, not warn
  const lastTier = tiersArray[tiersArray.length - 1]
  if (lastTier.maxRewards !== null) {
    throw new Error(`Last tier "${lastTier.name}" must have maxRewards = null (unlimited). Leave the max empty for unlimited rewards. Got: ${lastTier.maxRewards}`)
  }
  
  logger.debug('✅ Tier validation passed')
  
  return tierConfig // Return validated config (preserves { enabled, tiers } structure)
}

// In-memory storage for demo purposes (replace with database in production)
let offers = [
  {
    id: 1,
    title: "🥙 اشترِ 8 شاورما واحصل على 1 مجاناً - Buy 8 Shawarma, Get 1 FREE",
    description: "اجمع 8 أختام واحصل على شاورما مجانية! Collect 8 stamps for a free shawarma!",
    branch: "فرع الرياض الرئيسي - Riyadh Main Branch",
    type: "stamps",
    stampsRequired: 8,
    status: "active",
    customers: 156,
    redeemed: 34,
    createdAt: "أسبوعين - 2 weeks ago",
    startDate: "2024-01-01",
    endDate: null,
    isTimeLimited: false
  },
  {
    id: 2,
    title: "☕ قهوة مجانية بعد 5 زيارات - Free Arabic Coffee After 5 Visits",
    description: "زُرنا 5 مرات واحصل على قهوة عربية أصيلة مجاناً! Visit 5 times for free premium Arabic coffee!",
    branch: "جميع الفروع - All Branches",
    type: "stamps",
    stampsRequired: 5,
    status: "active",
    customers: 289,
    redeemed: 67,
    createdAt: "شهر واحد - 1 month ago",
    startDate: "2024-01-01",
    endDate: null,
    isTimeLimited: false
  },
  {
    id: 3,
    title: "🍰 عرض رمضان: كنافة مجانية - Ramadan Special: Free Kunafa",
    description: "خلال شهر رمضان، اشترِ 6 حلويات واحصل على كنافة مجانية! During Ramadan, buy 6 desserts, get free kunafa!",
    branch: "فرع جدة - Jeddah Branch",
    type: "stamps",
    stampsRequired: 6,
    status: "active",
    customers: 203,
    redeemed: 45,
    createdAt: "3 أسابيع - 3 weeks ago",
    startDate: "2024-03-01",
    endDate: "2024-04-30",
    isTimeLimited: true
  },
  {
    id: 4,
    title: "🥤 عصير طازج مجاني - Free Fresh Juice",
    description: "اشترِ 7 عصائر طازجة واحصل على الثامن مجاناً! Buy 7 fresh juices, get the 8th free!",
    branch: "فرع الدمام - Dammam Branch",
    type: "stamps",
    stampsRequired: 7,
    status: "active",
    customers: 134,
    redeemed: 28,
    createdAt: "أسبوع واحد - 1 week ago",
    startDate: "2024-01-15",
    endDate: null,
    isTimeLimited: false
  },
  {
    id: 5,
    title: "💇‍♂️ حلاقة مجانية للرجال - Free Men's Haircut",
    description: "بعد 10 حلاقات، احصل على الحادية عشر مجاناً مع خدمة VIP! After 10 haircuts, get the 11th free with VIP service!",
    branch: "فرع المدينة المنورة - Madinah Branch",
    type: "stamps",
    stampsRequired: 10,
    status: "active",
    customers: 67,
    redeemed: 12,
    createdAt: "شهرين - 2 months ago",
    startDate: "2024-01-01",
    endDate: null,
    isTimeLimited: false
  },
  {
    id: 6,
    title: "🛍️ خصم 50% على العطور - 50% Off Premium Perfumes",
    description: "اشترِ 5 منتجات واحصل على خصم 50% على أي عطر فاخر! Buy 5 products, get 50% off any premium perfume!",
    branch: "فرع مكة المكرمة - Makkah Branch",
    type: "stamps",
    stampsRequired: 5,
    status: "active",
    customers: 98,
    redeemed: 19,
    createdAt: "10 أيام - 10 days ago",
    startDate: "2024-02-01",
    endDate: "2024-12-31",
    isTimeLimited: true
  }
]

// Legacy hardcoded branches removed - all branch operations now use PostgreSQL database

// Sample customers data for Saudi Arabia
let customers = [
  {
    id: 1,
    name: "أحمد محمد العتيبي - Ahmed Mohammed Al-Otaibi",
    phone: "+966 50 123 4567",
    email: "ahmed.alotaibi@gmail.com",
    city: "الرياض - Riyadh",
    joinDate: "2024-01-15",
    totalVisits: 23,
    totalSpent: 1450.75,
    favoriteOffer: "🥙 اشترِ 8 شاورما واحصل على 1 مجاناً",
    stampsCollected: 6,
    rewardsRedeemed: 3,
    status: "active",
    preferredLanguage: "ar"
  },
  {
    id: 2,
    name: "فاطمة سالم الغامدي - Fatima Salem Al-Ghamdi",
    phone: "+966 55 987 6543",
    email: "fatima.ghamdi@outlook.sa",
    city: "جدة - Jeddah",
    joinDate: "2024-02-03",
    totalVisits: 18,
    totalSpent: 890.50,
    favoriteOffer: "☕ قهوة مجانية بعد 5 زيارات",
    stampsCollected: 4,
    rewardsRedeemed: 2,
    status: "active",
    preferredLanguage: "ar"
  },
  {
    id: 3,
    name: "عبدالله خالد الحربي - Abdullah Khalid Al-Harbi",
    phone: "+966 56 456 7890",
    email: "abdullah.harbi@yahoo.com",
    city: "مكة المكرمة - Makkah",
    joinDate: "2024-01-28",
    totalVisits: 31,
    totalSpent: 2150.25,
    favoriteOffer: "🛍️ خصم 50% على العطور",
    stampsCollected: 8,
    rewardsRedeemed: 5,
    status: "vip",
    preferredLanguage: "ar"
  },
  {
    id: 4,
    name: "نورا عبدالرحمن القحطاني - Nora Abdulrahman Al-Qahtani",
    phone: "+966 53 234 5678",
    email: "nora.qahtani@gmail.com",
    city: "الدمام - Dammam",
    joinDate: "2024-02-10",
    totalVisits: 12,
    totalSpent: 670.00,
    favoriteOffer: "🥤 عصير طازج مجاني",
    stampsCollected: 3,
    rewardsRedeemed: 1,
    status: "active",
    preferredLanguage: "en"
  },
  {
    id: 5,
    name: "محمد علي الأنصاري - Mohammed Ali Al-Ansari",
    phone: "+966 54 345 6789",
    email: "mohammed.ansari@hotmail.com",
    city: "المدينة المنورة - Madinah",
    joinDate: "2024-01-20",
    totalVisits: 25,
    totalSpent: 1200.75,
    favoriteOffer: "💇‍♂️ حلاقة مجانية للرجال",
    stampsCollected: 9,
    rewardsRedeemed: 4,
    status: "active",
    preferredLanguage: "ar"
  },
  {
    id: 6,
    name: "سارة إبراهيم الدوسري - Sarah Ibrahim Al-Dosari",
    phone: "+966 58 567 8901",
    email: "sarah.dosari@gmail.com",
    city: "الخبر - Khobar",
    joinDate: "2024-02-05",
    totalVisits: 15,
    totalSpent: 780.50,
    favoriteOffer: "🍰 عرض رمضان: كنافة مجانية",
    stampsCollected: 5,
    rewardsRedeemed: 2,
    status: "active",
    preferredLanguage: "ar"
  }
]

// Business categories popular in Saudi Arabia
let businessCategories = [
  {
    id: 1,
    name: "مطاعم وكافيهات - Restaurants & Cafes",
    nameEn: "Restaurants & Cafes",
    description: "مطاعم الوجبات السريعة والكافيهات والمقاهي الشعبية",
    descriptionEn: "Fast food restaurants, cafes and traditional coffee shops",
    examples: ["شاورما", "برغر", "قهوة عربية", "عصائر طبيعية"]
  },
  {
    id: 2,
    name: "صالونات وحلاقة - Salons & Barbershops",
    nameEn: "Salons & Barbershops",
    description: "صالونات نسائية وحلاقة رجالية ومراكز التجميل",
    descriptionEn: "Women's salons, men's barbershops and beauty centers",
    examples: ["حلاقة رجالية", "تصفيف شعر", "عناية بشرة", "مانيكير"]
  },
  {
    id: 3,
    name: "عطور ومستحضرات - Perfumes & Cosmetics",
    nameEn: "Perfumes & Cosmetics",
    description: "محلات العطور والبخور ومستحضرات التجميل",
    descriptionEn: "Perfume shops, incense stores and cosmetic retailers",
    examples: ["عطور فرنسية", "بخور", "عود", "مستحضرات تجميل"]
  },
  {
    id: 4,
    name: "ملابس وأزياء - Fashion & Clothing",
    nameEn: "Fashion & Clothing",
    description: "محلات الملابس والأزياء والاكسسوارات",
    descriptionEn: "Clothing stores, fashion boutiques and accessories",
    examples: ["عبايات", "ثياب رجالية", "أحذية", "حقائب"]
  },
  {
    id: 5,
    name: "صحة ولياقة - Health & Fitness",
    nameEn: "Health & Fitness",
    description: "صالات رياضية ومراكز صحية وعيادات",
    descriptionEn: "Gyms, health centers and medical clinics",
    examples: ["نادي رياضي", "يوغا", "تدليك", "عيادة أسنان"]
  }
]

let nextOfferId = Math.max(...offers.map(o => o.id)) + 1
// Branch IDs now auto-generated by PostgreSQL sequences
let nextCustomerId = Math.max(...customers.map(c => c.id)) + 1

// ===============================
// OFFERS ROUTES
// ===============================

// Get all offers
router.get('/offers', (req, res) => {
  try {
    res.json({
      success: true,
      data: offers
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message
    })
  }
})

// Get single offer
router.get('/offers/:id', (req, res) => {
  try {
    const offer = offers.find(o => o.id === parseInt(req.params.id))
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      })
    }
    res.json({
      success: true,
      data: offer
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offer',
      error: error.message
    })
  }
})

// Create new offer
router.post('/offers', (req, res) => {
  try {
    const newOffer = {
      ...req.body,
      id: nextOfferId++,
      customers: 0,
      redeemed: 0,
      createdAt: 'just now',
      status: 'paused'
    }
    offers.unshift(newOffer)
    res.status(201).json({
      success: true,
      data: newOffer,
      message: 'Offer created successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error: error.message
    })
  }
})

// Update offer
router.put('/offers/:id', (req, res) => {
  try {
    const offerIndex = offers.findIndex(o => o.id === parseInt(req.params.id))
    if (offerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      })
    }

    offers[offerIndex] = {
      ...offers[offerIndex],
      ...req.body
    }

    res.json({
      success: true,
      data: offers[offerIndex],
      message: 'Offer updated successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message
    })
  }
})

// Delete offer
router.delete('/offers/:id', (req, res) => {
  try {
    const offerIndex = offers.findIndex(o => o.id === parseInt(req.params.id))
    if (offerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      })
    }

    offers.splice(offerIndex, 1)
    res.json({
      success: true,
      message: 'Offer deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete offer',
      error: error.message
    })
  }
})

// Toggle offer status
router.patch('/offers/:id/status', (req, res) => {
  try {
    const offer = offers.find(o => o.id === parseInt(req.params.id))
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      })
    }

    offer.status = offer.status === 'active' ? 'paused' : 'active'

    res.json({
      success: true,
      data: offer,
      message: `Offer ${offer.status === 'active' ? 'activated' : 'paused'} successfully`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update offer status',
      error: error.message
    })
  }
})

// ===============================
// BRANCHES ROUTES
// ===============================

// LEGACY BRANCH ROUTES REMOVED - Use authenticated /my/branches routes instead

// LEGACY BRANCH UPDATE REMOVED - Use authenticated /my/branches/:id routes instead

// LEGACY BRANCH DELETE REMOVED - Use authenticated /my/branches/:id routes instead

// Toggle branch status
router.patch('/branches/:id/status', (req, res) => {
  try {
    const branch = branches.find(b => b.id === parseInt(req.params.id))
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      })
    }

    branch.status = branch.status === 'active' ? 'inactive' : 'active'

    res.json({
      success: true,
      data: branch,
      message: `Branch ${branch.status === 'active' ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update branch status',
      error: error.message
    })
  }
})

// ===============================
// DASHBOARD ANALYTICS ROUTES
// ===============================

// Get dashboard analytics/stats
router.get('/analytics/dashboard', async (req, res) => {
  try {
    // Get real data from database using services
    const offers = await OfferService.getAllOffers()
    const businesses = await BusinessService.getAllBusinesses()

    // Calculate real stats from database data
    const totalOffers = offers.length
    const activeOffers = offers.filter(o => o.status === 'active').length
    const totalBranches = businesses.reduce((sum, b) => sum + (b.total_branches || 0), 0)
    const activeBranches = totalBranches // For now, assume all branches are active

    // Calculate customer stats from actual customer data
    const totalCustomers = businesses.reduce((sum, b) => sum + (b.total_customers || 0), 0)
    const totalRevenueThisMonth = 0 // TODO: Implement revenue tracking
    const totalCustomerSpending = 0 // TODO: Implement spending tracking

    // Calculate cards issued (sum of customers from active offers)
    const cardsIssued = offers.reduce((sum, offer) => sum + (offer.customers || 0), 0)

    // Calculate rewards redeemed from offers data
    const rewardsRedeemed = offers.reduce((sum, offer) => sum + (offer.redeemed || 0), 0)

    // Calculate growth percentage based on customer activity
    const vipCustomers = 0 // TODO: Implement VIP customer tracking
    const growthPercentage = totalCustomers > 0 ? Math.round((vipCustomers / totalCustomers) * 100) : 0

    // Saudi Arabia specific metrics
    const averageSpendingPerCustomer = totalCustomers > 0 ? Math.round(totalCustomerSpending / totalCustomers) : 0
    const arabicPreferredCustomers = 0 // TODO: Implement language preference tracking
    const englishPreferredCustomers = 0 // TODO: Implement language preference tracking

    const analytics = {
      totalCustomers,
      cardsIssued,
      rewardsRedeemed,
      growthPercentage: `+${growthPercentage}%`,
      totalOffers,
      activeOffers,
      totalBranches,
      activeBranches,
      totalRevenueThisMonth,
      totalCustomerSpending,
      averageSpendingPerCustomer,
      vipCustomers,
      arabicPreferredCustomers,
      englishPreferredCustomers,
      // Regional distribution (based on businesses for now)
      regionStats: {
        riyadh: businesses.filter(b => b.city && (b.city.includes('الرياض') || b.city.includes('Riyadh'))).length,
        jeddah: businesses.filter(b => b.city && (b.city.includes('جدة') || b.city.includes('Jeddah'))).length,
        dammam: businesses.filter(b => b.city && (b.city.includes('الدمام') || b.city.includes('Dammam'))).length,
        makkah: businesses.filter(b => b.city && (b.city.includes('مكة') || b.city.includes('Makkah'))).length,
        madinah: businesses.filter(b => b.city && (b.city.includes('المدينة') || b.city.includes('Madinah'))).length,
        khobar: businesses.filter(b => b.city && (b.city.includes('الخبر') || b.city.includes('Khobar'))).length
      }
    }

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error.message
    })
  }
})

// Get recent activity feed
router.get('/analytics/activity', (req, res) => {
  try {
    // Generate dynamic activity based on real data
    const activities = []
    const now = new Date()

    // Add recent offer activities
    offers.slice(0, 3).forEach((offer, index) => {
      const hoursAgo = (index + 1) * 2
      const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      if (offer.redeemed > 0) {
        activities.push({
          id: `offer-${offer.id}-${index}`,
          message: `Customer redeemed "${offer.title.replace(/🍕|☕|🎂|🏃/g, '').trim()}" at ${offer.branch}`,
          timestamp: timeAgo.toISOString(),
          timeAgo: `${hoursAgo} hours ago`,
          type: 'redemption'
        })
      }
    })

    // Add branch activities
    branches.filter(b => b.customers > 0).slice(0, 2).forEach((branch, index) => {
      const hoursAgo = (index + 3) * 2
      const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      activities.push({
        id: `branch-${branch.id}-${index}`,
        message: `New customer joined loyalty program at ${branch.name}`,
        timestamp: timeAgo.toISOString(),
        timeAgo: `${hoursAgo} hours ago`,
        type: 'signup'
      })
    })

    // Sort by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json({
      success: true,
      data: activities.slice(0, 5) // Return last 5 activities
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      error: error.message
    })
  }
})

// ===============================
// PUBLIC CUSTOMER ROUTES
// ===============================

// Public endpoint to serve business logos for customer-facing pages
router.get('/public/logo/:businessId/:filename', async (req, res) => {
  try {
    const { businessId, filename } = req.params

    // Find business by secure public_id and verify they own this logo file
    const business = await Business.findByPk(businessId, {
      attributes: ['logo_filename', 'logo_url']
    })

    if (!business || business.logo_filename !== filename) {
      return res.status(404).json({
        success: false,
        message: 'Logo not found'
      })
    }

    const filePath = path.join('./uploads/logos', filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Logo file not found'
      })
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase()
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }

    const mimeType = mimeTypes[ext] || 'application/octet-stream'
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*') // Allow cross-origin access for customer pages

    // Send file
    res.sendFile(path.resolve(filePath))

  } catch (error) {
    console.error('❌ Public logo serve error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to serve logo',
      error: error.message
    })
  }
})

// Get offer details for customer signup (public endpoint) - SECURE VERSION
/**
 * API Contract: Asset URL Semantics
 * 
 * Logo URL Response Format:
 * - businessLogo.url: RELATIVE path (e.g., /api/business/public/logo/{businessId}/{filename})
 *   → Frontend must prepend apiBaseUrl
 * 
 * - cardDesignLogo.url: ABSOLUTE URL (e.g., https://api.madna.me/designs/logos/{filename})
 *   → Returned directly from ImageProcessingService.processLogoComplete()
 *   → Frontend should NOT prepend apiBaseUrl (already includes base domain)
 * 
 * Frontend Implementation:
 * - Check if URL starts with http:// or https://
 * - If absolute: use as-is
 * - If relative: prepend apiBaseUrl
 * 
 * See: src/pages/CustomerSignup.jsx → getLogoUrl() for reference implementation
 */
router.get('/public/offer/:id', async (req, res) => {
  try {
    const offerId = req.params.id // Now expects secure offer ID (off_*)

    // Find offer by secure public_id with business relationship including logo info
    // ALSO include OfferCardDesign to get card design logo
    const offer = await Offer.findByPk(offerId, {
      include: [
        {
          model: Business,
          as: 'business',
          attributes: ['business_name', 'business_name_ar', 'phone', 'city', 'district', 'region', 'address', 'location_hierarchy', 'logo_filename', 'logo_url']
        },
        {
          model: OfferCardDesign,
          as: 'cardDesign',
          attributes: ['logo_url', 'background_color', 'foreground_color', 'label_color', 'stamp_icon']
        }
      ]
    })

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      })
    }

    // Check if offer is active
    if (offer.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Offer is not currently available'
      })
    }

    // Format offer for customer display
    const customerOfferData = {
      id: offer.public_id, // Return secure ID
      title: offer.title,
      description: offer.description,
      businessName: offer.business?.business_name || "Business",
      businessNameAr: offer.business?.business_name_ar,
      branchName: offer.branch,
      stampsRequired: offer.stamps_required,
      type: offer.type,
      status: offer.status,
      // PHASE 10: Include business contact and location data for Apple Wallet back fields
      businessPhone: offer.business?.phone,
      phone: offer.business?.phone, // Alias for backward compatibility
      businessCity: offer.business?.city,
      businessDistrict: offer.business?.district,
      businessRegion: offer.business?.region,
      businessAddress: offer.business?.address,
      address: offer.business?.address, // Alias for backward compatibility
      location_hierarchy: offer.business?.location_hierarchy,
      // Business logo information for customer-facing display
      businessLogo: offer.business?.logo_url ? {
        url: `/api/business/public/logo/${offer.business_id}/${offer.business.logo_filename}`,
        filename: offer.business.logo_filename
      } : null,
      // Card design logo (fallback option)
      // Note: logo_url from OfferCardDesign is already an absolute URL from ImageProcessingService
      cardDesignLogo: offer.cardDesign?.logo_url ? {
        url: offer.cardDesign.logo_url,  // Already absolute URL, no prefix needed
        filename: offer.cardDesign.logo_url.split('/').pop()  // Extract filename for reference
      } : null
    }

    res.json({
      success: true,
      data: customerOfferData
    })
  } catch (error) {
    console.error('Get public offer error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offer details',
      error: error.message
    })
  }
})

// ===============================
// CUSTOMERS ROUTES
// ===============================

// Get all customers
router.get('/customers', (req, res) => {
  try {
    res.json({
      success: true,
      data: customers
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    })
  }
})

// Get single customer
router.get('/customers/:id', (req, res) => {
  try {
    const customer = customers.find(c => c.id === parseInt(req.params.id))
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }
    res.json({
      success: true,
      data: customer
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message
    })
  }
})

// Create new customer (customer signup)
router.post('/customers', (req, res) => {
  try {
    const newCustomer = {
      ...req.body,
      id: nextCustomerId++,
      joinDate: new Date().toISOString().split('T')[0],
      totalVisits: 0,
      totalSpent: 0,
      stampsCollected: 0,
      rewardsRedeemed: 0,
      status: 'active',
      preferredLanguage: req.body.preferredLanguage || 'ar'
    }
    customers.push(newCustomer)
    res.status(201).json({
      success: true,
      data: newCustomer,
      message: 'Customer registered successfully - تم تسجيل العميل بنجاح'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to register customer',
      error: error.message
    })
  }
})

// ===============================
// CUSTOMER SIGNUP ENDPOINT (PUBLIC)
// ===============================
// This endpoint is INTENTIONALLY PUBLIC to allow customers to sign up for loyalty programs
// via QR codes without requiring business authentication.
// 
// Security considerations:
// - Business ID is derived from the offer (validated to exist)
// - Subscription limit checking prevents quota exhaustion
// - Rate limiting should be implemented at infrastructure level (nginx, cloudflare, etc.)
// - Consider adding CAPTCHA for production to prevent automated abuse
// 
// Access control flow:
// 1. Offer existence validated (prevents invalid business IDs)
// 2. checkSubscriptionLimit derives business_id from offer and checks customer quota
// 3. CustomerService handles duplicate detection and data validation
// 
// TODO: Add rate limiting (e.g., max 10 signups per IP per minute)
// TODO: Consider CAPTCHA integration for production deployment
router.post('/customers/signup', checkSubscriptionLimit('customers'), async (req, res) => {
  try {
    const { customerData, offerId } = req.body

    // Validate required fields
    if (!customerData?.customerId || !offerId) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.customerIdOfferIdRequired', req.locale)
      })
    }

    // Validate customer ID format
    if (!customerData.customerId.startsWith('cust_')) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidCustomerIdFormat', req.locale)
      })
    }

    console.log('📝 Customer signup request:', {
      customerId: customerData.customerId,
      offerId: offerId,
      name: `${customerData.firstName} ${customerData.lastName}`,
      gender: customerData.gender || 'male',
      phone: customerData.phone || customerData.whatsapp || 'none'
    })

    // Validate phone number (required field)
    const phone = customerData.phone || customerData.whatsapp
    if (!phone || phone.trim() === '') {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.phoneRequired', req.locale)
      })
    }

    // Validate phone format (must contain 7-15 digits)
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidPhoneFormat', req.locale)
      })
    }

    // Validate gender if provided
    if (customerData.gender && !['male', 'female'].includes(customerData.gender)) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidGender', req.locale)
      })
    }

    // Get offer to find business ID
    const offer = await Offer.findOne({
      where: { public_id: offerId }
    })

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: getLocalizedMessage('notFound.offer', req.locale)
      })
    }

    console.log('✅ Found offer:', {
      offerId: offer.public_id,
      businessId: offer.business_id,
      title: offer.title
    })

    // Create customer + customer_progress using CustomerService
    const progress = await CustomerService.createCustomerProgress(
      customerData.customerId,
      offerId,
      offer.business_id,
      {
        firstName: customerData.firstName || 'Guest',
        lastName: customerData.lastName || '',
        phone: customerData.phone || customerData.whatsapp || null,
        email: customerData.email || null,
        date_of_birth: customerData.birthday || null,
        gender: customerData.gender || 'male',
        source: customerData.source || 'in_store',
        branch: customerData.branch || null,
        preferred_language: customerData.preferred_language || req.locale || 'en'  // 🌐 Save customer's language preference
      }
    )

    console.log('✅ Customer signup completed:', {
      customerId: customerData.customerId,
      progressId: progress.id,
      stampsEarned: progress.current_stamps || 0
    })

    res.json({
      success: true,
      data: {
        customerId: customerData.customerId,
        progress: {
          id: progress.id,
          stampsEarned: progress.current_stamps || 0,
          stampsRequired: progress.max_stamps || offer.stamps_required,
          status: progress.is_completed ? 'completed' : 'active'
        }
      },
      message: getLocalizedMessage('customer.registrationSuccess', req.locale)
    })

  } catch (error) {
    console.error('❌ Customer signup failed:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.customerRegistrationFailed', req.locale),
      error: error.message
    })
  }
})

// ===============================
// AUTHENTICATION MIDDLEWARE
// ===============================
// Note: checkTrialExpiration and checkSubscriptionLimit are imported from hybridBusinessAuth.js
// They are centralized there to avoid duplication

// Legacy local requireBusinessAuth kept for routes that haven't migrated to hybridBusinessAuth import
const requireBusinessAuthLocal = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token']
    const businessId = req.headers['x-business-id'] // Now expects secure ID (biz_*)

    if (!sessionToken || !businessId) {
      return res.status(401).json({
        success: false,
        message: getLocalizedMessage('auth.authRequired', req.locale || 'ar')
      })
    }

    // Find business by secure public_id instead of integer id
    const business = await Business.findByPk(businessId) // businessId is now secure string

    if (!business || business.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: getLocalizedMessage('auth.invalidBusinessOrNotActive', req.locale || 'ar')
      })
    }

    req.business = business
    req.businessId = business.public_id
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('auth.authFailed', req.locale || 'ar')
    })
  }
}

// ===============================
// BUSINESS-SPECIFIC DATA ROUTES (AUTHENTICATED)
// ===============================

// Get business-specific offers - SECURE VERSION
router.get('/my/offers', requireBusinessAuthLocal, async (req, res) => {
  try {
    // Get offers associated with this business using secure public_id
    const businessOffers = await Offer.findAll({
      where: { business_id: req.business.public_id },
      order: [['created_at', 'DESC']]
    })

    res.json({
      success: true,
      data: businessOffers
    })
  } catch (error) {
    console.error('Get business offers error:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.failedToGetOffers', req.locale)
    })
  }
})

// Get business-specific branches - SECURE VERSION
router.get('/my/branches', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id // Use secure public_id

    // Query branches using secure business_id reference
    const branches = await Branch.findAll({
      where: { business_id: businessId },
      order: [['created_at', 'DESC']]
    })

    res.json({
      success: true,
      data: branches,
      total: branches.length
    })
  } catch (error) {
    console.error('Get my branches error:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.failedToGetBranches', req.locale),
      error: error.message
    })
  }
})

// Get current business status - SECURE VERSION (Comment 3)
router.get('/my/status', requireBusinessAuth, async (req, res) => {
  try {
    const business = req.business

    res.json({
      success: true,
      data: {
        status: business.status,
        subscription_status: business.subscription_status,
        suspension_reason: business.suspension_reason,
        suspension_date: business.suspension_date,
        current_plan: business.current_plan
      }
    })
  } catch (error) {
    console.error('Get business status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get business status'
    })
  }
})

// Get business-specific analytics
router.get('/my/analytics', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id  // Use secure ID directly

    // Get business offers from database
    const businessOffers = await OfferService.findByBusinessId(businessId)

    // Get analytics from CustomerService
    const scanAnalytics = await CustomerService.getScanAnalytics(businessId)

    const analytics = {
      totalCustomers: scanAnalytics.totalCustomers,
      cardsIssued: businessOffers.reduce((sum, offer) => sum + (offer.customers || 0), 0),
      rewardsRedeemed: scanAnalytics.totalRedemptions,
      growthPercentage: scanAnalytics.totalCustomers > 0 ? `+${Math.round(scanAnalytics.averageProgress)}%` : '+0%',
      totalOffers: businessOffers.length,
      totalBranches: 1, // TODO: Implement branches when Branch model is created
      monthlyRevenue: businessOffers.reduce((sum, offer) => sum + (offer.base_reward_value || 0), 0) // Placeholder calculation
    }

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Get business analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    })
  }
})

// Get business-specific recent activity
router.get('/my/activity', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id  // Use secure ID directly

    // Get business offers from database
    const businessOffers = await OfferService.findByBusinessId(businessId)

    // Get scan history for activity
    const scanHistory = await CustomerService.getScanHistory(businessId, 10)

    const activity = []
    const now = new Date()

    // Generate activity from scan history
    scanHistory.forEach((progress, index) => {
      const hoursAgo = (index + 1) * 2
      const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      if (progress.is_completed && progress.rewards_claimed > 0) {
        activity.push({
          id: `reward-${progress.id}-${index}`,
          message: `Customer redeemed reward for "${progress.offer?.title || 'loyalty program'}"`,
          timestamp: progress.last_scan_date || timeAgo.toISOString(),
          timeAgo: `${hoursAgo} hours ago`,
          type: 'redemption'
        })
      } else if (progress.current_stamps > 0) {
        activity.push({
          id: `scan-${progress.id}-${index}`,
          message: `Customer earned stamp - ${progress.current_stamps}/${progress.max_stamps} stamps collected`,
          timestamp: progress.last_scan_date || timeAgo.toISOString(),
          timeAgo: `${hoursAgo} hours ago`,
          type: 'scan'
        })
      }
    })

    // If no activity, show welcome message
    if (activity.length === 0) {
      activity.push({
        id: 1,
        message: `Welcome to the Loyalty Platform! Your business "${req.business.business_name}" has been approved.`,
        timeAgo: 'Just now',
        type: 'info'
      })
    }

    // Sort by timestamp (newest first)
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json({
      success: true,
      data: activity.slice(0, 5) // Return last 5 activities
    })
  } catch (error) {
    console.error('Get business activity error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get activity'
    })
  }
})

// ===============================
// AUTHENTICATED CRUD OPERATIONS
// ===============================

// Create business offer - SECURE VERSION
router.post('/my/offers', requireBusinessAuth, checkTrialExpiration, checkSubscriptionLimit('offers'), async (req, res) => {
  try {
    // Validate loyalty_tiers if provided
    if (req.body.loyalty_tiers !== undefined && req.body.loyalty_tiers !== null) {
      try {
        validateLoyaltyTiers(req.body.loyalty_tiers)
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid loyalty_tiers configuration',
          error: validationError.message
        })
      }
    }
    
    // Validate barcode_preference if provided
    if (req.body.barcode_preference !== undefined && req.body.barcode_preference !== null) {
      const validBarcodeTypes = ['QR_CODE', 'PDF417']
      if (!validBarcodeTypes.includes(req.body.barcode_preference)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid barcode_preference value',
          error: `barcode_preference must be one of: ${validBarcodeTypes.join(', ')}`
        })
      }
    }
    
    // Process date fields - convert empty strings to null
    const processedBody = {
      ...req.body,
      start_date: req.body.start_date && req.body.start_date.trim() !== '' ? req.body.start_date : null,
      end_date: req.body.end_date && req.body.end_date.trim() !== '' ? req.body.end_date : null
    }
    
    const newOfferData = {
      ...processedBody,
      business_id: req.business.public_id, // Use secure public_id
      status: req.body.status || 'active'
    }

    const newOffer = await Offer.create(newOfferData)

    res.status(201).json({
      success: true,
      data: newOffer,
      message: 'Offer created successfully'
    })
  } catch (error) {
    console.error('❌ Create offer error:', error)
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    })
    res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error: error.message
    })
  }
})

// Update business offer - SECURE VERSION
router.put('/my/offers/:id', requireBusinessAuth, async (req, res) => {
  try {
    const offerId = req.params.id // Now expects secure offer ID (off_*)
    const businessId = req.business.public_id // Use secure business ID

    const offer = await Offer.findOne({
      where: { 
        public_id: offerId, // Use secure public_id for lookup
        business_id: businessId // Secure business reference
      }
    })

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or not owned by your business'
      })
    }

    // Validate loyalty_tiers if provided
    if (req.body.loyalty_tiers !== undefined && req.body.loyalty_tiers !== null) {
      try {
        validateLoyaltyTiers(req.body.loyalty_tiers)
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid loyalty_tiers configuration',
          error: validationError.message
        })
      }
    }

    // Validate barcode_preference if provided
    if (req.body.barcode_preference !== undefined && req.body.barcode_preference !== null) {
      const validBarcodeTypes = ['QR_CODE', 'PDF417']
      if (!validBarcodeTypes.includes(req.body.barcode_preference)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid barcode_preference value',
          error: `barcode_preference must be one of: ${validBarcodeTypes.join(', ')}`
        })
      }
    }

    // Process date fields - convert empty strings to null
    const processedBody = {
      ...req.body,
      start_date: req.body.start_date && req.body.start_date.trim() !== '' ? req.body.start_date : null,
      end_date: req.body.end_date && req.body.end_date.trim() !== '' ? req.body.end_date : null
    }

    await offer.update(processedBody)

    res.json({
      success: true,
      data: offer,
      message: 'Offer updated successfully'
    })
  } catch (error) {
    console.error('Update offer error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message
    })
  }
})

// Delete business offer - SECURE VERSION
router.delete('/my/offers/:id', requireBusinessAuth, async (req, res) => {
  try {
    const offerId = req.params.id // Now expects secure offer ID (off_*)
    const businessId = req.business.public_id // Use secure business ID

    const offer = await Offer.findOne({
      where: { 
        public_id: offerId, // Use secure public_id for lookup
        business_id: businessId // Secure business reference
      }
    })

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or not owned by your business'
      })
    }

    await offer.destroy()

    res.json({
      success: true,
      message: 'Offer deleted successfully'
    })
  } catch (error) {
    console.error('Delete offer error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete offer',
      error: error.message
    })
  }
})

// Toggle business offer status - SECURE VERSION
router.patch('/my/offers/:id/status', requireBusinessAuth, async (req, res) => {
  try {
    const offerId = req.params.id // Now expects secure offer ID (off_*)
    const businessId = req.business.public_id // Use secure business ID

    const offer = await Offer.findOne({
      where: { 
        public_id: offerId, // Use secure public_id for lookup
        business_id: businessId // Secure business reference
      }
    })

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or not owned by your business'
      })
    }

    const newStatus = offer.status === 'active' ? 'paused' : 'active'
    await offer.update({ status: newStatus })

    res.json({
      success: true,
      data: offer,
      message: `Offer ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
    })
  } catch (error) {
    console.error('Toggle offer status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update offer status',
      error: error.message
    })
  }
})

// Get offer analytics - SECURE VERSION
router.get('/my/offers/:offerId/analytics', requireBusinessAuth, async (req, res) => {
  try {
    const offerId = req.params.offerId
    const businessId = req.business.public_id
    const period = req.query.period || '30d'
    
    // Validate period
    const validPeriods = ['7d', '30d', '90d', 'all']
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidPeriod', req.locale)
      })
    }
    
    // Verify offer ownership
    const offer = await Offer.findOne({
      where: { 
        public_id: offerId,
        business_id: businessId
      }
    })
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: getLocalizedMessage('notFound.offer', req.locale)
      })
    }
    
    // Calculate date range
    let startDate = null
    const now = new Date()
    if (period === '7d') {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
    } else if (period === '30d') {
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000)
    } else if (period === '90d') {
      startDate = new Date(now - 90 * 24 * 60 * 60 * 1000)
    }
    
    // Build where clause
    const whereClause = { offer_id: offerId }
    if (startDate) {
      const { Op } = await import('sequelize')
      whereClause.created_at = { [Op.gte]: startDate }
    }
    
    // Get customer progress data
    const progressRecords = await CustomerProgress.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'name', 'email']
        }
      ]
    })
    
    // Calculate overview metrics
    const totalSignups = progressRecords.length
    const activeCustomers = progressRecords.filter(p => p.status === 'active').length
    const completedRewards = progressRecords.reduce((sum, p) => sum + (p.total_completions || 0), 0)
    const totalStamps = progressRecords.reduce((sum, p) => sum + (p.current_stamps || 0), 0)
    const avgStampsPerCustomer = totalSignups > 0 ? totalStamps / totalSignups : 0
    
    // Mock scan data (TODO: implement actual scan tracking)
    const totalScans = Math.round(totalSignups * 1.5) // Estimate
    const conversionRate = totalScans > 0 ? (totalSignups / totalScans * 100).toFixed(1) : 0
    const redemptionRate = totalSignups > 0 ? (completedRewards / totalSignups * 100).toFixed(1) : 0
    const engagementRate = totalSignups > 0 ? (activeCustomers / totalSignups * 100).toFixed(1) : 0
    const churnRate = (100 - engagementRate).toFixed(1)
    
    // Top customers by stamps
    const topCustomers = progressRecords
      .sort((a, b) => (b.current_stamps || 0) - (a.current_stamps || 0))
      .slice(0, 10)
      .map(p => ({
        name: p.customer?.name || 'Unknown',
        stamps: p.current_stamps || 0
      }))
    
    // Recent signups
    const recentSignups = progressRecords
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(p => ({
        name: p.customer?.name || 'Unknown',
        date: p.created_at
      }))
    
    // Close to reward
    const stampsRequired = offer.stamps_required || 10
    const closeToReward = progressRecords
      .filter(p => {
        const remaining = stampsRequired - (p.current_stamps || 0)
        return remaining > 0 && remaining <= 2
      })
      .slice(0, 10)
      .map(p => ({
        name: p.customer?.name || 'Unknown',
        remaining: stampsRequired - (p.current_stamps || 0)
      }))
    
    // Mock trends data (TODO: implement time-series aggregation)
    const trends = {
      signups: [],
      scans: []
    }
    
    // Mock source data
    const sources = {
      checkout: Math.round(totalScans * 0.4),
      table: Math.round(totalScans * 0.3),
      window: Math.round(totalScans * 0.2),
      social: Math.round(totalScans * 0.08),
      other: Math.round(totalScans * 0.02)
    }
    
    const analytics = {
      overview: {
        totalScans,
        totalSignups,
        conversionRate: parseFloat(conversionRate),
        activeCustomers,
        completedRewards,
        redemptionRate: parseFloat(redemptionRate)
      },
      trends,
      customers: {
        topCustomers,
        recentSignups,
        closeToReward
      },
      sources,
      performance: {
        engagementRate: parseFloat(engagementRate),
        churnRate: parseFloat(churnRate),
        avgStampsPerCustomer: parseFloat(avgStampsPerCustomer.toFixed(1)),
        avgVisitsPerCustomer: parseFloat((avgStampsPerCustomer * 1.2).toFixed(1)),
        avgDaysToComplete: 14 // Mock value
      }
    }
    
    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('❌ Get offer analytics error:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.failedToGetAnalytics', req.locale),
      error: error.message
    })
  }
})

// Create business branch - SECURE VERSION
router.post('/my/branches', requireBusinessAuth, checkTrialExpiration, checkSubscriptionLimit('locations'), async (req, res) => {
  try {
    // Handle street_name alias (frontend may send 'street_name' instead of 'address')
    const branchData = { ...req.body }
    if (branchData.street_name) {
      branchData.address = branchData.street_name
      delete branchData.street_name
    }

    // Process location_data if provided
    if (branchData.location_data) {
      // Extract location metadata from location_data object
      branchData.location_id = branchData.location_data.id || null
      branchData.location_type = branchData.location_data.type || null
      branchData.location_hierarchy = branchData.location_data.hierarchy || null
    }

    const newBranchData = {
      ...branchData,
      business_id: req.business.public_id, // Use secure public_id
      status: branchData.status || 'active'
    }

    // Validate that location data is provided
    if (!newBranchData.region && !newBranchData.city) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required. Please provide region and city information.'
      })
    }

    const newBranch = await Branch.create(newBranchData)

    res.status(201).json({
      success: true,
      data: newBranch,
      message: 'Branch created successfully'
    })
  } catch (error) {
    console.error('Create branch error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create branch',
      error: error.message
    })
  }
})

// Update business branch - SECURE VERSION
router.put('/my/branches/:id', requireBusinessAuth, async (req, res) => {
  try {
    const branchId = req.params.id // Now expects secure branch ID (branch_*)
    const businessId = req.business.public_id // Use secure business ID

    const branch = await Branch.findOne({
      where: {
        public_id: branchId, // Use secure public_id for lookup
        business_id: businessId // Secure business reference
      }
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or not owned by your business'
      })
    }

    // Handle street_name alias (frontend may send 'street_name' instead of 'address')
    const updateData = { ...req.body }
    if (updateData.street_name) {
      updateData.address = updateData.street_name
      delete updateData.street_name
    }

    // Process location_data if provided
    if (updateData.location_data) {
      // Extract location metadata from location_data object
      updateData.location_id = updateData.location_data.id || null
      updateData.location_type = updateData.location_data.type || null
      updateData.location_hierarchy = updateData.location_data.hierarchy || null
    }

    await branch.update(updateData)

    res.json({
      success: true,
      data: branch,
      message: 'Branch updated successfully'
    })
  } catch (error) {
    console.error('Update branch error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update branch',
      error: error.message
    })
  }
})

// Delete business branch
router.delete('/my/branches/:id', requireBusinessAuth, async (req, res) => {
  try {
    const branchId = req.params.id  // Use secure branch ID directly (branch_*)
    const businessId = req.business.public_id  // Use secure ID directly

    const branch = await Branch.findOne({
      where: { public_id: branchId, business_id: businessId }  // Use secure IDs
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or not owned by your business'
      })
    }

    // Safety checks
    if (branch.isMain) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the main branch'
      })
    }

    // Only prevent deletion if this is the last active branch
    if (branch.status === 'active') {
      const activeBranchCount = await Branch.count({
        where: { business_id: businessId, status: 'active' }
      })
      if (activeBranchCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active branch'
        })
      }
    }

    // Check if there are any offers tied to this branch
    const branchSpecificOffers = await Offer.findAll({
      where: {
        business_id: businessId,
        branch: branch.name
      }
    })

    // Delete associated offers if any (branch-specific offers only)
    const deletedOfferCount = branchSpecificOffers.length
    if (deletedOfferCount > 0) {
      // Note: In a real implementation, you might want to reassign offers to another branch
      // or set them to "All Branches" rather than deleting them
      await Offer.destroy({
        where: {
          business_id: businessId,
          branch: branch.name
        }
      })
    }

    await branch.destroy()

    res.json({
      success: true,
      message: `Branch deleted successfully${deletedOfferCount > 0 ? ` and ${deletedOfferCount} associated offer(s) removed` : ''}`,
      deletedOffers: deletedOfferCount
    })
  } catch (error) {
    console.error('Delete branch error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
      error: error.message
    })
  }
})

// Toggle business branch status
router.patch('/my/branches/:id/status', requireBusinessAuth, async (req, res) => {
  try {
    const branchId = req.params.id  // Use secure branch ID directly (branch_*)
    const businessId = req.business.public_id  // Use secure ID directly

    const branch = await Branch.findOne({
      where: { public_id: branchId, business_id: businessId }  // Use secure IDs
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or not owned by your business'
      })
    }

    const newStatus = branch.status === 'active' ? 'inactive' : 'active'
    await branch.update({ status: newStatus })

    res.json({
      success: true,
      data: branch,
      message: `Branch ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    console.error('Toggle branch status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update branch status',
      error: error.message
    })
  }
})

// Update branch manager PIN - SECURE VERSION
router.put('/my/branches/:id/manager-pin', requireBusinessAuth, async (req, res) => {
  try {
    const branchId = req.params.id
    const businessId = req.business.public_id
    const { manager_pin } = req.body

    // Validate PIN format (4-6 digits)
    if (!manager_pin || !/^\d{4,6}$/.test(manager_pin)) {
      return res.status(400).json({
        success: false,
        message: 'Manager PIN must be 4-6 digits'
      })
    }

    // Find branch and verify ownership
    const branch = await Branch.findOne({
      where: { public_id: branchId, business_id: businessId }
    })

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or not owned by your business'
      })
    }

    // Hash PIN with bcryptjs (same as business password)
    const hashedPIN = await bcrypt.hash(manager_pin, 10)

    // Update branch with hashed PIN and enable manager login
    await branch.update({
      manager_pin: hashedPIN,
      manager_pin_enabled: true
    })

    logger.info('Branch manager PIN updated', {
      branchId: branch.public_id,
      branchName: branch.name,
      businessId
    })

    res.json({
      success: true,
      message: 'Manager PIN updated successfully',
      data: {
        public_id: branch.public_id,
        name: branch.name,
        manager_pin_enabled: true
      }
    })
  } catch (error) {
    logger.error('Update manager PIN error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update manager PIN',
      error: error.message
    })
  }
})

// Get branch analytics - SECURE VERSION
router.get('/my/branches/:branchId/analytics', requireBusinessAuth, async (req, res) => {
  try {
    const branchId = req.params.branchId
    const businessId = req.business.public_id
    const period = req.query.period || '30d'
    
    // Validate period
    const validPeriods = ['7d', '30d', '90d', 'all']
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidPeriod', req.locale)
      })
    }
    
    // Verify branch ownership
    const branch = await Branch.findOne({
      where: { 
        public_id: branchId,
        business_id: businessId
      }
    })
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: getLocalizedMessage('notFound.branch', req.locale)
      })
    }
    
    // Calculate date range
    let startDate = null
    const now = new Date()
    if (period === '7d') {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
    } else if (period === '30d') {
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000)
    } else if (period === '90d') {
      startDate = new Date(now - 90 * 24 * 60 * 60 * 1000)
    }
    
    // Get offers at this branch (match by branch name, not branchId)
    // Include both branch-specific offers and all-branch offers
    const { Op } = await import('sequelize')
    const branchOffers = await Offer.findAll({
      where: {
        business_id: businessId,
        branch: {
          [Op.or]: [
            branch.name,
            'All Branches',
            'جميع الفروع - All Branches'
          ]
        }
      }
    })
    
    const activeOffers = branchOffers.filter(o => o.status === 'active')
    const offerIds = branchOffers.map(o => o.public_id)
    
    // Early return if no offers found for this branch
    if (offerIds.length === 0) {
      return res.json({
        success: true,
        data: {
          overview: {
            totalCustomers: 0,
            activeCustomers: 0,
            totalOffers: 0,
            activeOffers: 0,
            totalScans: 0,
            monthlyRevenue: 0
          },
          trends: {
            signups: [],
            scans: [],
            revenue: []
          },
          customers: {
            topCustomers: [],
            recentSignups: []
          },
          performance: {
            retentionRate: 0,
            offerPerformance: [],
            manager: {
              totalScans: 0,
              recentActivity: []
            }
          }
        }
      })
    }
    
    // Build where clause for customer progress
    const whereClause = { offer_id: { [Op.in]: offerIds } }
    if (startDate) {
      whereClause.created_at = { [Op.gte]: startDate }
    }
    
    // Get customer progress data for all offers at this branch
    const progressRecords = await CustomerProgress.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'name', 'email']
        }
      ]
    })
    
    // Calculate overview metrics
    const totalCustomers = new Set(progressRecords.map(p => p.customer_id)).size
    const activeCustomers = progressRecords.filter(p => p.status === 'active').length
    const totalScans = Math.round(progressRecords.length * 1.5) // Estimate
    const monthlyRevenue = branchOffers.reduce((sum, o) => sum + (o.base_reward_value || 0), 0) * 10 // Mock
    
    // Top customers by visits
    const customerVisits = {}
    progressRecords.forEach(p => {
      const custId = p.customer_id
      customerVisits[custId] = (customerVisits[custId] || 0) + (p.current_stamps || 0)
    })
    
    const topCustomers = Object.entries(customerVisits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([custId, visits]) => {
        const record = progressRecords.find(p => p.customer_id === custId)
        return {
          name: record?.customer?.name || 'Unknown',
          visits
        }
      })
    
    // Recent signups
    const recentSignups = progressRecords
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(p => ({
        name: p.customer?.name || 'Unknown',
        date: p.created_at
      }))
    
    // Retention rate calculation
    const returningCustomers = progressRecords.filter(p => (p.current_stamps || 0) > 1).length
    const retentionRate = totalCustomers > 0 ? ((returningCustomers / totalCustomers) * 100).toFixed(1) : 0
    
    // Offer performance
    const offerPerformance = branchOffers.map(offer => {
      const offerProgress = progressRecords.filter(p => p.offer_id === offer.public_id)
      const signups = offerProgress.length
      const active = offerProgress.filter(p => p.status === 'active').length
      const completed = offerProgress.filter(p => (p.total_completions || 0) > 0).length
      const completionRate = signups > 0 ? ((completed / signups) * 100).toFixed(1) : 0
      
      return {
        name: offer.title,
        signups,
        activeCustomers: active,
        completionRate: parseFloat(completionRate)
      }
    })
    
    // Mock trends data
    const trends = {
      signups: [],
      scans: [],
      revenue: []
    }
    
    // Mock manager activity
    const manager = {
      totalScans: Math.round(totalScans * 0.7), // Mock: 70% by manager
      recentActivity: []
    }
    
    const analytics = {
      overview: {
        totalCustomers,
        activeCustomers,
        totalOffers: branchOffers.length,
        activeOffers: activeOffers.length,
        totalScans,
        monthlyRevenue
      },
      trends,
      customers: {
        topCustomers,
        recentSignups,
        retentionRate: parseFloat(retentionRate)
      },
      offers: offerPerformance,
      manager
    }
    
    // Add POS analytics if requested
    if (req.query.includePOS === 'true') {
      try {
        const Sale = (await import('../models/Sale.js')).default
        const SaleItem = (await import('../models/SaleItem.js')).default
        const Product = (await import('../models/Product.js')).default
        
        // Build POS where clause
        const posWhereClause = { 
          branch_id: branchId,
          business_id: businessId,
          status: 'completed'
        }
        if (startDate) {
          posWhereClause.sale_date = { [Op.gte]: startDate }
        }
        
        // Get sales data
        const sales = await Sale.findAll({
          where: posWhereClause,
          include: [
            {
              model: SaleItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['public_id', 'name', 'name_ar', 'price']
                }
              ]
            }
          ]
        })
        
        // Calculate POS metrics
        const totalSales = sales.length
        const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0)
        const avgTransaction = totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : 0
        
        // Payment methods breakdown
        const paymentMethods = {
          cash: 0,
          card: 0,
          gift_offer: 0,
          mixed: 0
        }
        sales.forEach(sale => {
          const method = sale.payment_method || 'cash'
          if (paymentMethods.hasOwnProperty(method)) {
            paymentMethods[method] += parseFloat(sale.total_amount || 0)
          }
        })
        
        // Top products
        const productStats = {}
        sales.forEach(sale => {
          sale.items?.forEach(item => {
            const productId = item.product_id
            const productName = item.product?.name || 'Unknown'
            const productNameAr = item.product?.name_ar
            
            if (!productStats[productId]) {
              productStats[productId] = {
                name: productName,
                name_ar: productNameAr,
                quantity: 0,
                revenue: 0
              }
            }
            productStats[productId].quantity += item.quantity || 0
            productStats[productId].revenue += parseFloat(item.total || 0)
          })
        })
        
        const topProducts = Object.values(productStats)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(p => ({
            name: p.name,
            name_ar: p.name_ar,
            quantity: p.quantity,
            revenue: parseFloat(p.revenue).toFixed(2)
          }))
        
        analytics.pos = {
          totalSales,
          totalRevenue: parseFloat(totalRevenue).toFixed(2),
          avgTransaction: parseFloat(avgTransaction),
          paymentMethods: {
            cash: parseFloat(paymentMethods.cash).toFixed(2),
            card: parseFloat(paymentMethods.card).toFixed(2),
            gift_offer: parseFloat(paymentMethods.gift_offer).toFixed(2),
            mixed: parseFloat(paymentMethods.mixed).toFixed(2)
          },
          topProducts
        }
      } catch (posError) {
        console.error('❌ POS analytics error:', posError)
        // Continue without POS data on error
        analytics.pos = {
          totalSales: 0,
          totalRevenue: 0,
          avgTransaction: 0,
          paymentMethods: { cash: 0, card: 0, gift_offer: 0, mixed: 0 },
          topProducts: []
        }
      }
    }
    
    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('❌ Get branch analytics error:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.failedToGetAnalytics', req.locale),
      error: error.message
    })
  }
})

// ===============================
// BUSINESS AUTHENTICATION ROUTES
// ===============================

// Business login endpoint - SECURE VERSION
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.emailPasswordRequired', req.locale)
      })
    }

    // Find business by email using secure schema
    const business = await Business.findOne({ where: { email } })
    if (!business) {
      return res.status(401).json({
        success: false,
        message: getLocalizedMessage('auth.invalidCredentials', req.locale)
      })
    }

    // Check if business is approved/active (allow suspended to login for reactivation flow)
    if (business.status === 'pending') {
      return res.status(401).json({
        success: false,
        message: getLocalizedMessage('auth.accountPendingApproval', req.locale)
      })
    }

    // Check password using bcrypt
    const isPasswordValid = bcrypt.compareSync(password, business.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: getLocalizedMessage('auth.invalidCredentials', req.locale)
      })
    }

    // Generate simple session token (in production, use JWT)
    const sessionToken = Date.now().toString() + Math.random().toString(36)

    // Persist session to database for validation
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30-day session

    await BusinessSession.create({
      business_id: business.public_id,
      session_token: sessionToken,
      expires_at: expiresAt,
      is_active: true,
      last_used_at: new Date()
    })

    // Update last activity
    await business.update({ last_activity_at: new Date() })

    // Fetch subscription status
    let subscriptionData = null
    try {
      const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(business.public_id)
      
      // Calculate trial days remaining
      let trialDaysRemaining = null
      if (business.trial_ends_at) {
        const now = new Date()
        const trialEnd = new Date(business.trial_ends_at)
        trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
      }
      
      // Comment 1 & 4: Include complete subscription metadata with retry/grace fields
      subscriptionData = {
        current_plan: subscriptionStatus.current_plan,
        subscription_status: subscriptionStatus.subscription_status,
        trial_ends_at: business.trial_ends_at,
        trial_days_remaining: trialDaysRemaining,
        limits: subscriptionStatus.limits,
        usage: subscriptionStatus.usage,
        features: subscriptionStatus.features,
        retry_count: subscriptionStatus.retry_count,
        grace_period_end: subscriptionStatus.grace_period_end,
        next_retry_date: subscriptionStatus.next_retry_date
      }
      
      logger.debug('Subscription data included in login', {
        business_id: business.public_id,
        plan: subscriptionStatus.current_plan
      })
    } catch (subscriptionError) {
      logger.error('Failed to fetch subscription status', {
        business_id: business.public_id,
        error: subscriptionError.message
      })
      // Continue with login even if subscription fetch fails
    }

    // Return business info (excluding password_hash) with SECURE public_id
    const businessObj = business.toJSON()
    const { password_hash: _, ...businessData } = businessObj

    res.json({
      success: true,
      message: getLocalizedMessage('auth.loginSuccess', req.locale),
      data: {
        business: {
          ...businessData,
          // Include both language variants for business name
          business_name: businessData.business_name,
          business_name_ar: businessData.business_name_ar,
          owner_name: businessData.owner_name,
          owner_name_ar: businessData.owner_name_ar
        },
        session_token: sessionToken,
        business_id: business.public_id, // Return secure ID for frontend use
        subscription: subscriptionData,
        // Include status fields for suspended account detection
        status: business.status,
        subscription_status: business.subscription_status,
        suspension_reason: business.suspension_reason,
        suspension_date: business.suspension_date
      }
    })

  } catch (error) {
    console.error('Business login error:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.loginFailed', req.locale)
    })
  }
})

// ===============================
// BUSINESS REGISTRATION ROUTES
// ===============================

// Business registration endpoint
router.post('/register', async (req, res) => {
  try {
    const businessData = req.body

    // Validate required fields - Updated for new location system
    const requiredFields = ['business_name', 'email', 'phone', 'owner_name', 'business_type']
    const missingFields = requiredFields.filter(field => !businessData[field])

    // Check if location is provided (either old format or new location_data)
    const hasLocation = businessData.region || 
                       businessData.city || 
                       (businessData.location_data && businessData.location_data.type)

    if (!hasLocation) {
      missingFields.push('location')
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.missingRequiredFields', req.locale, { fields: missingFields.join(', ') })
      })
    }

    // Check for duplicate email using PostgreSQL
    const existingBusiness = await Business.findOne({ where: { email: businessData.email } })
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.emailAlreadyExists', req.locale)
      })
    }

    // Hash the password for secure storage
    const tempPassword = businessData.password || 'TempPass123!'
    const hashedPassword = bcrypt.hashSync(tempPassword, 10)

    // Create business using PostgreSQL with location data
    // Note: subscription_status, trial_ends_at, and current_plan are set by SubscriptionService.initializeTrialPeriod
    const newBusiness = await Business.create({
      ...businessData,
      // Handle location metadata if provided
      location_id: businessData.location_data?.id || null,
      location_type: businessData.location_data?.type || null,
      location_hierarchy: businessData.location_data?.hierarchy || null,
      status: 'pending', // New registrations start as pending
      password_hash: hashedPassword  // Use hashed password
    })

    // Automatically create the main branch for the new business
    const mainBranch = await Branch.create({
      business_id: newBusiness.public_id,  // Use the secure business ID
      name: `${businessData.business_name} - Main Branch`,
      address: businessData.address,
      city: businessData.city,
      phone: businessData.phone,
      manager_name: businessData.owner_name,
      status: 'active', // Main branch is active by default for immediate use
      country: 'Saudi Arabia'
    })

    // Update business total_branches count
    await newBusiness.update({ total_branches: 1 })

    // Initialize trial period and create Subscription record
    // This sets subscription_status, trial_ends_at, and current_plan on the Business record
    try {
      await SubscriptionService.initializeTrialPeriod(newBusiness.public_id, 7)
      
      // Reload business to get updated subscription fields
      await newBusiness.reload()
      
      logger.info('Trial period activated', {
        business_id: newBusiness.public_id,
        trial_ends_at: newBusiness.trial_ends_at,
        subscription_status: newBusiness.subscription_status,
        current_plan: newBusiness.current_plan
      })
    } catch (subscriptionError) {
      logger.error('Failed to initialize trial period', {
        business_id: newBusiness.public_id,
        error: subscriptionError.message
      })
      // Don't fail registration if subscription initialization fails
    }

    // Remove password_hash from response for security
    const businessObj = newBusiness.toJSON()
    const { password_hash: _, ...businessResponse } = businessObj

    res.status(201).json({
      success: true,
      data: businessResponse,
      message: getLocalizedMessage('auth.registrationSuccess', req.locale)
    })

  } catch (error) {
    console.error('Business registration error:', error)
    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.registrationFailed', req.locale)
    })
  }
})

// ===============================
// BUSINESS LOGO UPLOAD ROUTES
// ===============================

// Upload business logo
router.post('/my/logo', requireBusinessAuth, upload.single('logo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file provided'
      })
    }

    const business = req.business
    const file = req.file

    // Delete old logo file if it exists
    if (business.logo_filename && business.logo_url) {
      const oldFilePath = path.join('./uploads/logos', business.logo_filename)
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath)
          console.log(`🗑️ Deleted old logo file: ${business.logo_filename}`)
        } catch (deleteError) {
          console.warn(`⚠️ Failed to delete old logo file: ${deleteError.message}`)
        }
      }
    }

    // Generate accessible URL path
    const logoUrl = `/api/business/my/logo/${file.filename}`

    // Update business with logo information
    await business.update({
      logo_filename: file.filename,
      logo_url: logoUrl,
      logo_uploaded_at: new Date(),
      logo_file_size: file.size
    })

    console.log(`✅ Logo uploaded for business ${business.public_id}: ${file.filename}`)

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo_url: logoUrl,
        logo_filename: file.filename,
        logo_file_size: file.size,
        logo_uploaded_at: business.logo_uploaded_at
      }
    })

  } catch (error) {
    console.error('❌ Logo upload error:', error)

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup uploaded file: ${cleanupError.message}`)
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: error.message
    })
  }
})

// Get business logo (serve logo file)
router.get('/my/logo/:filename', requireBusinessAuth, (req, res) => {
  try {
    const filename = req.params.filename
    const business = req.business

    // Security check: verify this business owns this logo file
    if (business.logo_filename !== filename) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this logo file'
      })
    }

    const filePath = path.join('./uploads/logos', filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Logo file not found'
      })
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase()
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }

    const mimeType = mimeTypes[ext] || 'application/octet-stream'
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year

    // Send file
    res.sendFile(path.resolve(filePath))

  } catch (error) {
    console.error('❌ Logo serve error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to serve logo',
      error: error.message
    })
  }
})

// Delete business logo
router.delete('/my/logo', requireBusinessAuth, async (req, res) => {
  try {
    const business = req.business

    if (!business.logo_filename) {
      return res.status(404).json({
        success: false,
        message: 'No logo found to delete'
      })
    }

    // Delete file from filesystem
    const filePath = path.join('./uploads/logos', business.logo_filename)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`🗑️ Deleted logo file: ${business.logo_filename}`)
      } catch (deleteError) {
        console.warn(`⚠️ Failed to delete logo file: ${deleteError.message}`)
      }
    }

    // Clear logo information from database
    await business.update({
      logo_filename: null,
      logo_url: null,
      logo_uploaded_at: null,
      logo_file_size: null
    })

    res.json({
      success: true,
      message: 'Logo deleted successfully'
    })

  } catch (error) {
    console.error('❌ Logo delete error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete logo',
      error: error.message
    })
  }
})

// Get business logo info (without serving the file)
router.get('/my/logo-info', requireBusinessAuth, (req, res) => {
  try {
    const business = req.business

    if (!business.logo_filename) {
      return res.json({
        success: true,
        data: {
          has_logo: false,
          logo_url: null,
          logo_filename: null,
          logo_file_size: null,
          logo_uploaded_at: null
        }
      })
    }

    res.json({
      success: true,
      data: {
        has_logo: true,
        logo_url: business.logo_url,
        logo_filename: business.logo_filename,
        logo_file_size: business.logo_file_size,
        logo_uploaded_at: business.logo_uploaded_at
      }
    })

  } catch (error) {
    console.error('❌ Logo info error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get logo info',
      error: error.message
    })
  }
})

// ===============================
// BUSINESS CATEGORIES ROUTES
// ===============================

// Get all business categories - PostgreSQL implementation
router.get('/categories', async (req, res) => {
  try {
    // Static categories for Saudi businesses - can be moved to database later
    const categories = [
      {
        id: 1,
        name: "مطاعم وكافيهات - Restaurants & Cafes",
        nameEn: "Restaurants & Cafes",
        description: "مطاعم الوجبات السريعة والكافيهات والمقاهي الشعبية",
        descriptionEn: "Fast food restaurants, cafes and traditional coffee shops",
        examples: ["شاورما", "برغر", "قهوة عربية", "عصائر طبيعية"]
      },
      {
        id: 2,
        name: "صالونات وحلاقة - Salons & Barbershops",
        nameEn: "Salons & Barbershops",
        description: "صالونات نسائية وحلاقة رجالية ومراكز التجميل",
        descriptionEn: "Women's salons, men's barbershops and beauty centers",
        examples: ["حلاقة رجالية", "تصفيف شعر", "عناية بشرة", "مانيكير"]
      },
      {
        id: 3,
        name: "عطور ومستحضرات - Perfumes & Cosmetics",
        nameEn: "Perfumes & Cosmetics",
        description: "محلات العطور والبخور ومستحضرات التجميل",
        descriptionEn: "Perfume shops, incense stores and cosmetic retailers",
        examples: ["عطور فرنسية", "بخور", "عود", "مستحضرات تجميل"]
      },
      {
        id: 4,
        name: "ملابس وأزياء - Fashion & Clothing",
        nameEn: "Fashion & Clothing",
        description: "محلات الملابس والأزياء والاكسسوارات",
        descriptionEn: "Clothing stores, fashion boutiques and accessories",
        examples: ["عبايات", "ثياب رجالية", "أحذية", "حقائب"]
      },
      {
        id: 5,
        name: "صحة ولياقة - Health & Fitness",
        nameEn: "Health & Fitness",
        description: "صالات رياضية ومراكز صحية وعيادات",
        descriptionEn: "Gyms, health centers and medical clinics",
        examples: ["نادي رياضي", "يوغا", "تدليك", "عيادة أسنان"]
      }
    ]

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business categories',
      error: error.message
    })
  }
})

// ===============================
// PROGRESS SCANNING ROUTES
// ===============================

// Scan customer progress QR code to update loyalty progress
// 🆕 ENHANCED QR CODE SCANNING - Phase 1 Implementation
// Supports BOTH formats for backward compatibility:
//   1. NEW FORMAT: POST /scan/progress/:qrCode (where qrCode = "customerToken:offerHash")
//   2. OLD FORMAT: POST /scan/progress/:customerToken/:offerHash
router.post('/scan/progress/:customerToken/:offerHash?', requireBusinessAuth, async (req, res) => {
  try {
    let customerToken, offerHash
    const businessId = req.business.public_id  // Use secure ID directly

    // 🆕 DETECT QR CODE FORMAT
    const firstParam = req.params.customerToken
    const secondParam = req.params.offerHash

    // Check if this is the new enhanced format (customerToken:offerHash in first param)
    if (!secondParam && firstParam.includes(':')) {
      // NEW FORMAT: Single parameter with embedded colon
      console.log('🔍 Detected ENHANCED QR code format (customerToken:offerHash)')
      const parts = firstParam.split(':')
      customerToken = parts[0]
      offerHash = parts[1]
    } else if (secondParam) {
      // OLD FORMAT: Two separate parameters
      console.log('🔍 Detected LEGACY QR code format (separate params)')
      customerToken = firstParam
      offerHash = secondParam
    } else if (!secondParam && !firstParam.includes(':')) {
      // LEGACY TOKEN-ONLY FORMAT: Base64 token without offer hash
      console.log('🔍 Detected LEGACY token-only QR format (pre-enhanced passes)')
      customerToken = firstParam
      offerHash = null
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format. Expected either "customerToken:offerHash" or separate parameters'
      })
    }

    console.log('🔍 Progress scan attempt:', { customerToken: customerToken.substring(0, 20) + '...', offerHash, businessId })

    // Decode and validate customer token
    const tokenData = CustomerService.decodeCustomerToken(customerToken)
    if (!tokenData.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired customer token',
        error: tokenData.error
      })
    }

    // Verify token belongs to this business
    if (tokenData.businessId !== businessId) {
      return res.status(403).json({
        success: false,
        message: 'Token not valid for this business'
      })
    }

    let { customerId } = tokenData

    // ✅ VALIDATE AND NORMALIZE CUSTOMER ID
    // If old numeric format, generate new cust_* ID
    if (!customerId || !customerId.startsWith('cust_')) {
      console.log(`⚠️ Legacy customer ID detected: ${customerId}. Will generate new cust_* ID during customer creation.`)
      // Don't generate here - let findOrCreateCustomer handle it
      // This preserves the original ID in the token for logging purposes
    }

    // Find the offer by reverse-engineering the hash (or auto-detect for legacy QRs)
    const businessOffers = await OfferService.findByBusinessId(businessId)
    let targetOffer = null

    if (offerHash === null) {
      // Legacy token-only format: Auto-detect offer
      console.log('🔍 Legacy QR detected - attempting auto-offer selection')
      const activeOffers = businessOffers.filter(offer => offer.status === 'active')
      
      if (activeOffers.length === 1) {
        targetOffer = activeOffers[0]
        console.log(`✅ Auto-selected single active offer for legacy QR: ${targetOffer.public_id}`)
      } else if (activeOffers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Legacy QR code detected. No active offers found. Please regenerate pass or contact support.'
        })
      } else {
        return res.status(400).json({
          success: false,
          message: 'Legacy QR code detected. Multiple active offers found. Please regenerate pass to specify which offer to use.'
        })
      }
    } else {
      // Normal hash-based lookup
      for (const offer of businessOffers) {
        if (CustomerService.verifyOfferHash(offer.public_id, businessId, offerHash)) {
          targetOffer = offer
          break
        }
      }

      if (!targetOffer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found or hash invalid'
        })
      }
    }

    console.log('✅ Scanner: Valid scan detected', { 
      customerId, 
      offerId: targetOffer.public_id, 
      offerTitle: targetOffer.title 
    })

    // Get or create customer progress
    let progress = await CustomerService.findCustomerProgress(customerId, targetOffer.public_id)
    if (!progress) {
      progress = await CustomerService.createCustomerProgress(customerId, targetOffer.public_id, businessId)
      
      // For new customers, also create Google Wallet object if it doesn't exist
      try {
        const googleWalletController = (await import('../controllers/realGoogleWalletController.js')).default
        const objectId = `${googleWalletController.issuerId}.${customerId}_${targetOffer.public_id}`.replace(/[^a-zA-Z0-9._\-]/g, '_')
        
        const authClient = await googleWalletController.auth.getClient()
        const accessToken = await authClient.getAccessToken()
        
        // Check if Google Wallet object exists
        const checkResponse = await fetch(`${googleWalletController.baseUrl}/loyaltyObject/${objectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!checkResponse.ok && checkResponse.status === 404) {
          console.log('🔧 Creating Google Wallet object for new customer...')
          
          const customerData = {
            customerId: customerId,
            firstName: 'Customer',
            lastName: 'User'
          }
          
          const offerData = {
            offerId: targetOffer.public_id,
            businessName: req.business.business_name,
            title: targetOffer.title,
            description: targetOffer.description,
            stamps_required: targetOffer.stamps_required
          }
          
          const progressData = {
            current_stamps: progress.current_stamps,
            max_stamps: progress.max_stamps,
            is_completed: progress.is_completed
          }
          
          // Create loyalty class and object
          await googleWalletController.createOrUpdateLoyaltyClass(authClient, offerData)
          const loyaltyObject = await googleWalletController.createLoyaltyObject(authClient, customerData, offerData, progressData)
          
          console.log('✅ Google Wallet object created for new customer:', loyaltyObject.id)
        }
      } catch (walletCreationError) {
        console.warn('⚠️ Failed to create wallet object for new customer (continuing with scan):', walletCreationError.message)
      }
    }

    // Check if already completed
    if (progress.is_completed && progress.current_stamps >= progress.max_stamps) {
      return res.json({
        success: true,
        message: 'Customer has already completed this loyalty program!',
        data: {
          progress,
          rewardAvailable: true,
          alreadyCompleted: true
        }
      })
    }

    // Record progress before update
    const progressBefore = progress.current_stamps

    // Update progress (add one stamp)
    const updatedProgress = await CustomerService.updateCustomerProgress(customerId, targetOffer.public_id, 1)

    // Record scan transaction
    const scanTransaction = await CustomerService.recordScanTransaction(
      customerId,
      targetOffer.public_id,
      businessId,
      {
        businessEmail: req.business.email,
        progressBefore,
        progressAfter: updatedProgress.current_stamps,
        customerToken
      }
    )

    // ✨ SMART WALLET UPDATES - Only push to wallets customer actually has
    const walletUpdates = []

    try {
      // Import WalletPassService dynamically
      const WalletPassService = (await import('../services/WalletPassService.js')).default

      // Get customer's active wallet passes for this offer
      const activeWallets = await WalletPassService.getCustomerWallets(customerId, targetOffer.public_id)

      if (activeWallets.length === 0) {
        console.log('📱 No wallet passes found for customer - skipping wallet updates')
      } else {
        console.log(`📱 Found ${activeWallets.length} wallet pass(es) for customer:`, activeWallets.map(w => w.wallet_type).join(', '))

        // Update each wallet type the customer has
        for (const wallet of activeWallets) {
          try {
            if (wallet.wallet_type === 'apple') {
              const appleUpdate = await appleWalletController.pushProgressUpdate(
                customerId,
                targetOffer.public_id,
                updatedProgress
              )
              walletUpdates.push({
                platform: 'Apple Wallet',
                walletPassId: wallet.id,
                ...appleUpdate
              })

              // Update last push timestamp
              await wallet.updateLastPush()
            } else if (wallet.wallet_type === 'google') {
              const googleUpdate = await googleWalletController.pushProgressUpdate(
                customerId,
                targetOffer.public_id,
                updatedProgress
              )
              walletUpdates.push({
                platform: 'Google Wallet',
                walletPassId: wallet.id,
                ...googleUpdate
              })

              // Update last push timestamp
              await wallet.updateLastPush()
            }
          } catch (singleWalletError) {
            console.warn(`⚠️ Failed to update ${wallet.wallet_type} wallet:`, singleWalletError.message)
            walletUpdates.push({
              platform: `${wallet.wallet_type} Wallet`,
              walletPassId: wallet.id,
              success: false,
              error: singleWalletError.message
            })
          }
        }

        // Log wallet updates summary
        const successCount = walletUpdates.filter(u => u.success).length
        console.log(`📱 Wallet updates: ${successCount}/${walletUpdates.length} successful`)
      }
    } catch (walletError) {
      console.warn('⚠️ Wallet updates failed (continuing with scan):', walletError.message)
    }

    // Prepare response
    const responseData = {
      progress: updatedProgress,
      customer: { id: customerId },
      offer: {
        id: targetOffer.public_id,
        title: targetOffer.title,
        business: targetOffer.businessName || req.business.business_name
      },
      scan: {
        id: scanTransaction.id,
        timestamp: scanTransaction.scannedAt
      },
      rewardEarned: updatedProgress.is_completed && !progress.is_completed,
      walletUpdates: walletUpdates.map(u => ({
        platform: u.platform,
        success: u.success,
        updated: u.updated
      }))
    }

    // Success message in Arabic and English
    let message = `Progress updated! ${updatedProgress.current_stamps}/${updatedProgress.max_stamps} stamps collected.`
    if (updatedProgress.is_completed) {
      message = `🎉 Congratulations! Reward earned! تهانينا! تم كسب المكافأة!`
    }

    res.json({
      success: true,
      message,
      data: responseData
    })

  } catch (error) {
    console.error('❌ Progress scan failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process scan',
      error: error.message
    })
  }
})

// Confirm prize and reset customer progress (business-authenticated)
router.post('/scan/confirm-prize/:customerId/:offerId', requireBusinessAuth, async (req, res) => {
  try {
    const { customerId, offerId } = req.params
    const { notes } = req.body

    // Find customer progress
    const progress = await CustomerProgress.findOne({
      where: {
        customer_id: customerId,
        offer_id: offerId
      }
    })

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Customer progress not found'
      })
    }

    if (!progress.is_completed) {
      return res.status(400).json({
        success: false,
        error: 'Progress not completed'
      })
    }

    // Verify business ownership of the offer
    const offer = await Offer.findOne({
      where: {
        public_id: offerId
      }
    })

    if (!offer || offer.business_id !== req.business.public_id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to confirm prize for this offer'
      })
    }

    // Calculate tier BEFORE claimReward to detect upgrades
    const tierBeforeClaim = await CustomerService.calculateCustomerTier(customerId, offerId)
    const tierNameBefore = tierBeforeClaim?.currentTier?.name || null

    // Call claimReward() to auto-reset stamps - use req.business.public_id
    await progress.claimReward(req.business.public_id, notes)

    // CRITICAL FIX: Refetch progress from database to get fresh values
    // After claimReward(), the in-memory progress object still has old values
    // Reload the instance to get the updated rewards_claimed, current_stamps, is_completed
    await progress.reload()

    console.log('🔄 Stamps reset to 0, new cycle started')
    console.log('📊 Total completions (fresh):', progress.rewards_claimed)
    console.log('📊 Fresh progress after reset:', {
      rewardsClaimed: progress.rewards_claimed,
      currentStamps: progress.current_stamps,
      isCompleted: progress.is_completed
    })

    // Optional Enhancement: Convert Sequelize instance to plain object before passing to wallet controllers
    // This makes the data flow more explicit and ensures consistent field naming
    const progressData = progress.toJSON()
    console.log('📤 Normalized progress data for wallet updates:', {
      rewardsClaimed: progressData.rewards_claimed,
      currentStamps: progressData.current_stamps,
      isCompleted: progressData.is_completed
    })

    // Calculate customer tier AFTER claimReward (uses fresh rewards_claimed from database)
    const tierData = await CustomerService.calculateCustomerTier(customerId, offerId)
    const tierNameAfter = tierData?.currentTier?.name || null
    
    // Detect tier upgrade by comparing tier names
    const tierUpgrade = tierNameBefore !== null && tierNameAfter !== null && tierNameBefore !== tierNameAfter
    
    if (tierData) {
      console.log('🏆 Customer tier after claim:', tierData)
      if (tierUpgrade) {
        console.log('🎉 Tier upgraded!', { from: tierNameBefore, to: tierNameAfter })
      }
    }

    // Trigger immediate pass updates (Apple and Google Wallet)
    try {
      // Import controllers dynamically to avoid circular dependencies
      const { default: appleWalletController } = await import('../controllers/appleWalletController.js')
      const { default: googleWalletController } = await import('../controllers/realGoogleWalletController.js')

      // Push updates to wallet passes (using plain object for consistency)
      await appleWalletController.pushProgressUpdate(customerId, offerId, progressData)
      await googleWalletController.pushProgressUpdate(customerId, offerId, progressData)

      console.log('✅ Wallet passes updated with reset progress and tier')
    } catch (walletError) {
      console.error('⚠️ Failed to update wallet passes:', walletError)
      // Non-critical error, continue with response
    }

    console.log('Prize confirmed by business', {
      businessId: req.business.public_id,
      customerId,
      offerId,
      notes,
      newCycleStarted: true,
      totalCompletions: progress.rewards_claimed
    })

    res.json({
      success: true,
      progress: {
        currentStamps: progress.current_stamps,
        maxStamps: progress.max_stamps,
        isCompleted: progress.is_completed,
        rewardsClaimed: progress.rewards_claimed,
        rewardFulfilledAt: progress.reward_fulfilled_at,
        stampsEarned: progress.current_stamps,
        stampsRequired: progress.max_stamps,
        status: progress.is_completed ? 'completed' : 'active'
      },
      tier: tierData,
      tierUpgrade: tierUpgrade,
      newCycleStarted: true,
      totalCompletions: progress.rewards_claimed
    })
  } catch (error) {
    console.error('Prize confirmation error:', error)
    res.status(500).json({
      success: false,
      error: 'Prize confirmation failed'
    })
  }
})

// Get customer progress by token (for verification before scanning)
// 🆕 ENHANCED QR CODE SCANNING - Phase 1 Implementation
// Supports BOTH formats for backward compatibility
router.get('/scan/verify/:customerToken/:offerHash?', requireBusinessAuth, async (req, res) => {
  try {
    let customerToken, offerHash
    const businessId = req.business.public_id  // Use secure ID directly

    // 🆕 DETECT QR CODE FORMAT (same logic as scan endpoint)
    const firstParam = req.params.customerToken
    const secondParam = req.params.offerHash

    if (!secondParam && firstParam.includes(':')) {
      // NEW FORMAT: customerToken:offerHash
      const parts = firstParam.split(':')
      customerToken = parts[0]
      offerHash = parts[1]
    } else if (secondParam) {
      // OLD FORMAT: separate parameters
      customerToken = firstParam
      offerHash = secondParam
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format'
      })
    }

    // Decode and validate customer token
    const tokenData = CustomerService.decodeCustomerToken(customerToken)
    if (!tokenData.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired customer token',
        error: tokenData.error
      })
    }

    // Verify token belongs to this business
    if (tokenData.businessId !== businessId) {
      return res.status(403).json({
        success: false,
        message: 'Token not valid for this business'
      })
    }

    const { customerId } = tokenData

    // Find the offer by hash
    const businessOffers = await OfferService.findByBusinessId(businessId)
    let targetOffer = null

    console.log(`🔍 Scanning for offer hash: ${offerHash}`)

    for (const offer of businessOffers) {
      const expectedHash = CustomerService.generateOfferHash(offer.public_id, businessId)
      
      if (CustomerService.verifyOfferHash(offer.public_id, businessId, offerHash)) {
        targetOffer = offer
        console.log(`✅ Found matching offer: ${offer.public_id}`)
        break
      }
    }

    if (!targetOffer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or hash invalid'
      })
    }

    // Get customer progress
    const progress = await CustomerService.findCustomerProgress(customerId, targetOffer.public_id)

    res.json({
      success: true,
      data: {
        customer: { id: customerId },
        offer: {
          id: targetOffer.public_id,
          title: targetOffer.title,
          stampsRequired: targetOffer.stamps_required
        },
        progress: progress ? {
          currentStamps: progress.current_stamps,
          maxStamps: progress.max_stamps,
          isCompleted: progress.is_completed
        } : {
          currentStamps: 0,
          maxStamps: targetOffer.stamps_required,
          isCompleted: false
        },
        canScan: !progress?.is_completed
      }
    })

  } catch (error) {
    console.error('❌ Scan verification failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify scan',
      error: error.message
    })
  }
})

// Get scan history for business
router.get('/scan/history', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id  // Use secure ID directly
    const limit = parseInt(req.query.limit) || 50

    const scanHistory = await CustomerService.getScanHistory(businessId, limit)

    // Enrich scan data with offer titles
    const businessOffers = await OfferService.findByBusinessId(businessId)
    const offersMap = new Map(businessOffers.map(o => [o.id, o]))

    const enrichedHistory = scanHistory.map((scan) => {
      const offer = offersMap.get(scan.offerId || scan.offer_id)
      return {
        ...scan,
        offerTitle: offer?.title || 'Unknown Offer',
        offerType: offer?.type || 'stamps'
      }
    })

    res.json({
      success: true,
      data: enrichedHistory,
      total: scanHistory.length
    })

  } catch (error) {
    console.error('❌ Failed to get scan history:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get scan history',
      error: error.message
    })
  }
})

// Get scan analytics for business
router.get('/scan/analytics', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id  // Use secure ID directly
    const offerId = req.query.offerId ? parseInt(req.query.offerId) : null

    const analytics = await CustomerService.getScanAnalytics(businessId, offerId)

    res.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('❌ Failed to get scan analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get scan analytics',
      error: error.message
    })
  }
})

// ===============================
// DUAL QR FLOW TEST ENDPOINTS
// ===============================

// Test dual QR flow with demo data
router.post('/test/dual-qr-flow', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.business.public_id  // Use secure ID directly

    console.log('🧪 Testing dual QR flow for business:', businessId)

    // Step 1: Find or create test offer
    const businessOffers = await OfferService.findByBusinessId(businessId)
    let testOfferId = businessOffers[0]?.id

    if (!testOfferId) {
      return res.status(400).json({
        success: false,
        message: 'No offers found for this business. Please create an offer first.'
      })
    }

    // Step 2: Create test customer progress
    const testCustomerId = 'demo-customer-123'
    const progress = await CustomerService.createCustomerProgress(testCustomerId, testOfferId, businessId)

    // Step 3: Generate customer progress QR data
    const customerToken = CustomerService.encodeCustomerToken(testCustomerId, businessId)
    const offerHash = CustomerService.generateOfferHash(testOfferId, businessId)

    // Step 4: Simulate wallet pass generation with customer progress QR
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.madna.me'
    const walletPassData = {
      customer: { customerId: testCustomerId },
      offer: { offerId: testOfferId, businessId },
      progress: progress,
      progressQRUrl: `${frontendUrl}/scan/${customerToken}/${offerHash}`
    }

    // Step 5: Return test results
    res.json({
      success: true,
      message: 'Dual QR flow test completed successfully!',
      data: {
        testStep1_CustomerProgress: progress,
        testStep2_CustomerToken: customerToken,
        testStep3_OfferHash: offerHash,
        testStep4_WalletPassData: walletPassData,
        testStep5_ScanURL: `POST /api/business/scan/progress/${customerToken}/${offerHash}`,
        instructions: [
          '1. Customer joins loyalty program via Offer QR Code',
          '2. Customer receives wallet pass with embedded Progress QR Code',
          '3. Business scans Progress QR Code from customer wallet pass',
          '4. System updates progress and pushes updates to wallet',
          '5. Customer sees updated progress in real-time'
        ]
      }
    })

  } catch (error) {
    console.error('❌ Dual QR flow test failed:', error)
    res.status(500).json({
      success: false,
      message: 'Dual QR flow test failed',
      error: error.message
    })
  }
})

// Debug endpoint to check Google Wallet object status
router.get('/debug/wallet-object/:customerId/:offerId', requireBusinessAuth, async (req, res) => {
  try {
    const { customerId, offerId } = req.params
    const businessId = req.business.public_id  // Use secure ID directly

    // Get database progress
    const dbProgress = await CustomerService.findCustomerProgress(customerId, offerId)

    // Try to fetch Google Wallet object
    const googleWalletController = (await import('../controllers/realGoogleWalletController.js')).default
    const objectId = `${googleWalletController.issuerId}.${customerId}_${offerId}`.replace(/[^a-zA-Z0-9._\-]/g, '_')
    
    let walletStatus = null
    try {
      const authClient = await googleWalletController.auth.getClient()
      const accessToken = await authClient.getAccessToken()
      
      const response = await fetch(`${googleWalletController.baseUrl}/loyaltyObject/${objectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const walletObject = await response.json()
        walletStatus = {
          exists: true,
          balance: walletObject.loyaltyPoints?.balance?.string,
          state: walletObject.state,
          textModules: walletObject.textModulesData || []
        }
      } else {
        walletStatus = {
          exists: false,
          error: `${response.status} - ${response.statusText}`,
          objectId: objectId
        }
      }
    } catch (walletError) {
      walletStatus = {
        exists: false,
        error: walletError.message,
        objectId: objectId
      }
    }

    res.json({
      success: true,
      data: {
        objectId: objectId,
        database: dbProgress ? {
          current_stamps: dbProgress.current_stamps,
          max_stamps: dbProgress.max_stamps,
          is_completed: dbProgress.is_completed,
          last_scan_date: dbProgress.last_scan_date
        } : null,
        wallet: walletStatus,
        synced: dbProgress && walletStatus.exists ? 
          walletStatus.balance === `${dbProgress.current_stamps}/${dbProgress.max_stamps}` : 
          false
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Create missing Google Wallet object for existing customer progress
router.post('/debug/create-wallet-object/:customerId/:offerId', requireBusinessAuth, async (req, res) => {
  try {
    const { customerId, offerId } = req.params
    const businessId = req.business.public_id  // Use secure ID directly

    // Get database progress and offer
    const dbProgress = await CustomerService.findCustomerProgress(customerId, offerId)
    const offer = await OfferService.findById(offerId)

    if (!dbProgress) {
      return res.status(404).json({
        success: false,
        message: 'Customer progress not found in database'
      })
    }

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found in database'
      })
    }

    // Create Google Wallet object
    const googleWalletController = (await import('../controllers/realGoogleWalletController.js')).default
    
    const customerData = {
      customerId: customerId,
      firstName: 'Customer',
      lastName: 'User'
    }
    
    const offerData = {
      offerId: offer.id,
      businessName: req.business.business_name,
      title: offer.title,
      description: offer.description,
      stamps_required: offer.stamps_required
    }
    
    const progressData = {
      current_stamps: dbProgress.current_stamps,
      max_stamps: dbProgress.max_stamps,
      is_completed: dbProgress.is_completed
    }

    console.log('🔨 Creating Google Wallet object for existing customer:', {
      customerId,
      offerId: offer.id,
      progress: `${progressData.current_stamps}/${progressData.max_stamps}`
    })

    const authClient = await googleWalletController.auth.getClient()
    
    // Create loyalty class first
    const loyaltyClass = await googleWalletController.createOrUpdateLoyaltyClass(authClient, offerData)
    
    // Create loyalty object
    const loyaltyObject = await googleWalletController.createLoyaltyObject(authClient, customerData, offerData, progressData)

    res.json({
      success: true,
      message: 'Google Wallet object created successfully',
      data: {
        classId: loyaltyClass.id,
        objectId: loyaltyObject.id,
        customerProgress: progressData
      }
    })

  } catch (error) {
    console.error('❌ Failed to create wallet object:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create wallet object',
      error: error.message
    })
  }
})

// ===============================
// SUBSCRIPTION CHECKOUT ROUTES
// ===============================

/**
 * POST /api/business/subscription/checkout
 * Initiate subscription payment checkout session
 */
router.post('/subscription/checkout', requireBusinessAuth, async (req, res) => {
  try {
    const { planType, locationCount = 1 } = req.body
    const businessId = req.businessId

    logger.info('Subscription checkout initiated', { businessId, planType, locationCount })

    // Validate plan type
    const validPlans = ['free', 'professional', 'enterprise']
    if (!planType || !validPlans.includes(planType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidPlanType', req.locale)
      })
    }

    // Validate Moyasar configuration (comprehensive check)
    if (!process.env.MOYASAR_PUBLISHABLE_KEY || !process.env.MOYASAR_SECRET_KEY) {
      logger.error('Moyasar configuration incomplete', {
        hasPublishableKey: !!process.env.MOYASAR_PUBLISHABLE_KEY,
        hasSecretKey: !!process.env.MOYASAR_SECRET_KEY
      })
      return res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.paymentConfigError', req.locale)
      })
    }

    // Validate publishable key format using MoyasarService helper
    const publishableKey = process.env.MOYASAR_PUBLISHABLE_KEY
    const { valid, environment } = MoyasarService.validatePublishableKey(publishableKey)
    
    if (!valid) {
      logger.error('Invalid publishable key format', {
        keyPrefix: publishableKey.substring(0, 15) + '...'
      })
      return res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.invalidPublishableKeyFormat', req.locale)
      })
    }

    // Warn if using test key in production
    if (process.env.NODE_ENV === 'production' && environment === 'test') {
      logger.warn('Using test payment key in production environment', {
        businessId,
        keyPrefix: publishableKey.substring(0, 15) + '...',
        environment
      })
    }

    // Calculate plan price
    const amount = SubscriptionService.calculatePlanPrice(planType, locationCount)
    
    // Validate calculated amount
    if (amount < 1 || amount > 100000) {
      logger.error('Invalid subscription amount', { planType, locationCount, amount })
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('server.invalidSubscriptionAmount', req.locale)
      })
    }

    // Generate checkout session ID
    const sessionId = crypto.randomUUID()

    // Construct and validate callback URL
    const callbackUrl = process.env.MOYASAR_CALLBACK_URL || 
                       `${process.env.FRONTEND_URL}/subscription/payment-callback`
    
    if (!callbackUrl.startsWith('http')) {
      logger.error('Invalid callback URL', { callbackUrl })
      return res.status(500).json({
        success: false,
        message: 'Payment callback URL not configured'
      })
    }
    
    logger.debug('Checkout callback URL', { callbackUrl })

    // Create pending Payment record
    const payment = await Payment.create({
      business_id: businessId,
      amount,
      currency: 'SAR',
      status: 'pending',
      payment_method: 'card',
      metadata: {
        gateway: 'moyasar',
        plan_type: planType,
        location_count: locationCount,
        session_id: sessionId,
        callback_url: callbackUrl
      }
    })

    // Fetch business name for payment description
    const business = await Business.findOne({
      where: { public_id: businessId },
      attributes: ['business_name']
    })

    logger.info('Checkout session created', {
      businessId,
      planType,
      amount,
      paymentId: payment.public_id,
      sessionId
    })

    // Prepare response data
    const responseData = {
      success: true,
      amount,
      currency: 'SAR',
      description: `Subscription to ${planType} Plan`,
      publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY,
      callbackUrl,
      sessionId,
      businessId,
      paymentId: payment.public_id,
      businessName: business?.business_name || 'Business'
    }
    
    // Log response (mask sensitive data)
    logger.debug('Checkout session response', {
      ...responseData,
      publishableKey: responseData.publishableKey.substring(0, 15) + '...', // Mask key in logs
      keyFormat: 'valid'
    })

    // Return checkout session data
    res.json(responseData)

  } catch (error) {
    logger.error('Failed to initialize checkout', {
      businessId: req.businessId,
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.checkoutFailed', req.locale),
      error: error.message
    })
  }
})

/**
 * POST /api/business/subscription/payment-callback
 * Verify payment and activate subscription after Moyasar redirect
 * FLOW: Fetch Moyasar payment → Extract session ID → Link payment record → Verify
 */
router.post('/subscription/payment-callback', requireBusinessAuth, async (req, res) => {
  const startTime = Date.now()
  
  try {
    const { moyasarPaymentId, status, message } = req.body
    const businessId = req.businessId

    logger.info('Payment callback received', { 
      businessId, 
      moyasarPaymentId, 
      status,
      message,
      requestBody: req.body
    })
    
    logger.debug('Callback headers', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      businessId: req.headers['x-business-id']
    })

    // Validate payment ID
    if (!moyasarPaymentId) {
      logger.warn('Payment ID missing in callback', {
        businessId,
        status,
        message,
        possibleCause: 'Payment may not have been initiated or redirect failed'
      })
      
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.paymentIdRequired', req.locale),
        errorCode: 'PAYMENT_ID_REQUIRED',
        details: 'The payment may not have been completed. Please try again.',
        status,
        message
      })
    }

    // IDEMPOTENCY CHECK: Prevent duplicate processing of the same payment
    // Check if this payment has already been processed successfully
    logger.debug('Checking for existing payment to ensure idempotency', { moyasarPaymentId, businessId })
    const existingPayment = await Payment.findOne({
      where: {
        moyasar_payment_id: moyasarPaymentId,
        business_id: businessId
      }
    })

    if (existingPayment && existingPayment.status === 'paid') {
      // Payment already processed - check if subscription is also upgraded
      const business = await Business.findOne({
        where: { public_id: businessId },
        attributes: ['public_id', 'current_plan']
      })

      const targetPlan = existingPayment.metadata?.plan_type || 'professional'
      const currentPlan = business?.current_plan

      logger.info('Payment callback idempotency check', {
        moyasarPaymentId,
        businessId,
        paymentStatus: existingPayment.status,
        currentPlan,
        targetPlan,
        isAlreadyUpgraded: currentPlan === targetPlan
      })

      if (currentPlan === targetPlan) {
        // Both payment processed AND subscription upgraded - return success immediately
        logger.info('Payment callback idempotent - already fully processed', {
          moyasarPaymentId,
          businessId,
          plan: currentPlan
        })

        // Get current subscription status to return consistent response
        const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(businessId)

        return res.json({
          success: true,
          message: getLocalizedMessage('payment.subscriptionActivated', req.locale),
          subscription: {
            plan_type: currentPlan,
            amount: existingPayment.amount,
            status: 'active',
            next_billing_date: subscriptionStatus.next_billing_date
          },
          limits: subscriptionStatus.limits,
          usage: subscriptionStatus.usage,
          idempotent: true // Flag for monitoring purposes
        })
      } else {
        // Payment processed but subscription upgrade incomplete - continue with normal flow
        logger.warn('Payment marked as paid but subscription not upgraded - continuing with upgrade', {
          moyasarPaymentId,
          businessId,
          currentPlan,
          targetPlan
        })
      }
    }

    // Step 1: Fetch payment details from Moyasar to get metadata with session ID
    logger.debug('Fetching payment from Moyasar to extract session ID', { moyasarPaymentId })
    let moyasarPayment
    try {
      moyasarPayment = await MoyasarService.fetchPaymentFromMoyasar(moyasarPaymentId)
    } catch (error) {
      if (error.message === 'MOYASAR_PAYMENT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          errorCode: 'MOYASAR_PAYMENT_NOT_FOUND',
          message: getLocalizedMessage('payment.moyasarPaymentNotFound', req.locale)
        })
      }
      throw error // Re-throw other errors to be caught by outer try-catch
    }

    // Step 2: Extract session ID from Moyasar payment metadata
    // FIXED: Check session_id first (matches checkout metadata key), then sessionId as fallback
    const sessionId = moyasarPayment.metadata?.session_id || moyasarPayment.metadata?.sessionId
    logger.debug('Extracted session ID from Moyasar metadata', { 
      moyasarPaymentId, 
      sessionId,
      hasMetadata: !!moyasarPayment.metadata,
      usedKey: moyasarPayment.metadata?.session_id ? 'session_id' : 'sessionId'
    })

    if (!sessionId) {
      logger.error('Session ID missing from Moyasar payment metadata', {
        moyasarPaymentId,
        metadata: moyasarPayment.metadata
      })
      return res.status(400).json({
        success: false,
        errorCode: 'SESSION_ID_MISSING',
        message: getLocalizedMessage('payment.sessionIdMissing', req.locale)
      })
    }

    // Step 3: Look up Payment record by session ID in metadata
    // FIXED: Use Sequelize JSON path condition for reliable JSONB querying
    logger.debug('Looking up payment record by session ID', { sessionId })
    const { Sequelize } = await import('sequelize')
    const payment = await Payment.findOne({
      where: {
        business_id: businessId,
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.json('metadata.session_id'),
            sessionId
          )
        ]
      }
    })

    if (!payment) {
      logger.error('Payment record not found for session ID', {
        businessId,
        sessionId,
        moyasarPaymentId
      })
      return res.status(404).json({
        success: false,
        errorCode: 'SESSION_LINKING_FAILED',
        message: getLocalizedMessage('payment.paymentRecordNotFoundBySession', req.locale),
        transactionId: moyasarPaymentId
      })
    }

    // Step 4: Update Payment record with Moyasar payment ID
    logger.info('Linking payment record with Moyasar payment ID', {
      paymentId: payment.public_id,
      moyasarPaymentId,
      previousMoyasarId: payment.moyasar_payment_id
    })
    
    await payment.update({
      moyasar_payment_id: moyasarPaymentId
    })

    logger.info('Payment record successfully linked', {
      paymentId: payment.public_id,
      moyasarPaymentId
    })

    // Step 5: Now verify payment with Moyasar and update our records
    const verificationResult = await MoyasarService.verifyPayment(moyasarPaymentId)

    if (!verificationResult.verified) {
      // Log each verification issue separately
      verificationResult.issues.forEach(issue => {
        logger.warn('Verification issue', { businessId, moyasarPaymentId, issue })
      })

      // Determine specific error code
      let errorCode = 'VERIFICATION_FAILED'
      if (!verificationResult.payment) {
        errorCode = 'PAYMENT_NOT_FOUND'
      } else if (verificationResult.issues.some(i => i.includes('status'))) {
        errorCode = 'STATUS_MISMATCH'
      } else if (verificationResult.issues.some(i => i.includes('amount'))) {
        errorCode = 'AMOUNT_MISMATCH'
      } else if (verificationResult.issues.some(i => i.includes('currency'))) {
        errorCode = 'CURRENCY_MISMATCH'
      }

      // Detailed logging with verification details
      logger.warn('Payment verification failed with details', {
        businessId,
        moyasarPaymentId,
        errorCode,
        issues: verificationResult.issues,
        verificationDetails: verificationResult.verificationDetails,
        statusMatch: verificationResult.verificationDetails?.statusMatch,
        amountMatch: verificationResult.verificationDetails?.amountMatch,
        currencyMatch: verificationResult.verificationDetails?.currencyMatch
      })
      
      // Special handling: Check if Moyasar says paid but verification failed
      if (verificationResult.moyasarPayment?.status === 'paid' && !verificationResult.verified) {
        logger.error('CRITICAL WARNING: Moyasar confirmed payment as PAID but verification failed', {
          businessId,
          moyasarPaymentId,
          errorCode,
          issues: verificationResult.issues,
          verificationDetails: verificationResult.verificationDetails,
          action: 'REQUIRES_MANUAL_REVIEW',
          recommendation: 'Check for data mismatches (amount rounding, currency) - payment may be legitimate'
        })
      }

      // Mark payment as failed if it exists
      if (verificationResult.payment) {
        await verificationResult.payment.markAsFailed(
          message || verificationResult.issues.join(', ')
        )
      }
      
      // Build specific error message based on errorCode
      let specificMessage = getLocalizedMessage('payment.verificationFailed', req.locale)
      if (errorCode === 'STATUS_MISMATCH' && verificationResult.verificationDetails) {
        specificMessage = getLocalizedMessage('payment.statusMismatch', req.locale, {
          status: verificationResult.verificationDetails.actualStatus
        })
      } else if (errorCode === 'AMOUNT_MISMATCH' && verificationResult.verificationDetails) {
        specificMessage = getLocalizedMessage('payment.amountMismatch', req.locale, {
          expected: verificationResult.verificationDetails.expectedAmount,
          actual: verificationResult.verificationDetails.actualAmount
        })
      } else if (errorCode === 'PAYMENT_NOT_FOUND') {
        specificMessage = getLocalizedMessage('payment.paymentNotFound', req.locale)
      }

      // Prepare response with verification details (include full details in dev mode)
      const errorResponse = {
        success: false,
        message: specificMessage,
        errorCode,
        issues: verificationResult.issues,
        error: message || 'Payment verification failed'
      }
      
      // Include verification details in development mode for debugging
      if (process.env.NODE_ENV === 'development') {
        errorResponse.verificationDetails = verificationResult.verificationDetails
        errorResponse.fullVerificationResult = {
          verified: verificationResult.verified,
          issues: verificationResult.issues,
          moyasarStatus: verificationResult.moyasarPayment?.status,
          paymentFound: !!verificationResult.payment
        }
      } else if (verificationResult.verificationDetails) {
        // In production, include only safe verification details
        errorResponse.verificationDetails = {
          statusMatch: verificationResult.verificationDetails.statusMatch,
          amountMatch: verificationResult.verificationDetails.amountMatch,
          currencyMatch: verificationResult.verificationDetails.currencyMatch
        }
      }

      return res.status(400).json(errorResponse)
    }

    // Payment object already exists from Step 3 lookup
    // moyasarPayment already declared with 'let' on line 3788 - just reassign
    moyasarPayment = verificationResult.moyasarPayment

    // Log payment metadata for debugging
    logger.debug('Payment metadata', {
      businessId,
      paymentId: payment.public_id,
      metadata: payment.metadata
    })

    // Extract plan details from payment metadata
    const planType = payment.metadata?.plan_type
    const locationCount = payment.metadata?.location_count || 1

    if (!planType) {
      logger.error('Payment metadata missing plan type', {
        businessId,
        paymentId: payment.public_id,
        fullPayment: {
          id: payment.public_id,
          status: payment.status,
          amount: payment.amount,
          metadata: payment.metadata
        }
      })
      return res.status(500).json({
        success: false,
        message: getLocalizedMessage('server.paymentDataIncomplete', req.locale)
      })
    }

    // Use database transaction for atomic operations
    const transaction = await sequelize.transaction()

    try {
      // Update Payment record to 'paid' status with transaction
      await payment.update({
        status: 'paid',
        payment_date: new Date(),
        metadata: {
          ...payment.metadata,
          moyasar_payment_id: moyasarPaymentId,
          gateway: 'moyasar',
          paid_at: new Date().toISOString(),
          moyasar_response: moyasarPayment
        }
      }, { transaction })

      logger.info('Payment record updated to paid', {
        businessId,
        paymentId: payment.public_id,
        moyasarPaymentId
      })

      // Upgrade subscription with transaction for atomic operations
      const upgradeResult = await SubscriptionService.upgradeSubscription(
        businessId,
        planType,
        locationCount,
        transaction
      )

      // Store payment token for recurring billing (if provided)
      if (moyasarPayment.source?.token) {
        const subscription = await Subscription.findOne({
          where: { business_id: businessId },
          transaction
        })

        if (subscription) {
          await subscription.update({
            moyasar_token: moyasarPayment.source.token,
            payment_method_last4: moyasarPayment.source.last4,
            payment_method_brand: moyasarPayment.source.company,
            billing_cycle_start: new Date(),
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            last_payment_date: new Date()
          }, { transaction })

          logger.info('Payment token stored for recurring billing', {
            businessId,
            subscriptionId: subscription.public_id,
            last4: moyasarPayment.source.last4
          })
        }
      }

      // Create invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`
      // FIXED: Parse payment.amount as float to ensure numeric operations
      const paymentAmount = parseFloat(payment.amount)
      const taxAmount = paymentAmount * 0.15 // 15% VAT
      const totalAmount = paymentAmount + taxAmount

      const invoice = await Invoice.create({
        invoice_number: invoiceNumber,
        business_id: businessId,
        payment_id: payment.public_id,
        subscription_id: upgradeResult.subscription?.public_id,
        amount: paymentAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: 'SAR',
        issued_date: new Date(),
        due_date: new Date(),
        paid_date: new Date(),
        status: 'paid',
        invoice_data: {
          plan_type: planType,
          location_count: locationCount,
          payment_method: 'card',
          moyasar_payment_id: moyasarPaymentId
        }
      }, { transaction })

      logger.info('Invoice created', {
        businessId,
        invoiceNumber,
        amount: totalAmount
      })

      // Commit transaction
      await transaction.commit()

      // Fetch updated subscription status
      const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(businessId)

      const processingTimeMs = Date.now() - startTime
      
      logger.info('Payment callback completed successfully', {
        businessId,
        moyasarPaymentId,
        planType,
        amount: payment.amount,
        processingTimeMs
      })

      res.json({
        success: true,
        message: getLocalizedMessage('payment.subscriptionActivated', req.locale),
        subscription: {
          plan_type: planType,
          amount: payment.amount,
          status: 'active',
          next_billing_date: subscriptionStatus.next_billing_date
        },
        limits: subscriptionStatus.limits,
        usage: subscriptionStatus.usage
      })

    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback()
      
      logger.error('Transaction rolled back', {
        businessId,
        moyasarPaymentId,
        error: error.message,
        stack: error.stack
      })
      
      throw error
    }

  } catch (error) {
    logger.error('Payment callback processing failed', {
      businessId: req.businessId,
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.paymentProcessingFailed', req.locale),
      error: error.message
    })
  }
})

// ===============================
// SUBSCRIPTION MANAGEMENT ROUTES
// ===============================

/**
 * GET /api/business/subscription/details
 * Fetch comprehensive subscription details including payment method info
 */
router.get('/subscription/details', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId

    logger.debug('Fetching subscription details', { businessId })

    // Get subscription status with limits and usage
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(businessId)

    // Fetch active Subscription record with payment method info
    const subscription = await Subscription.findOne({
      where: { business_id: businessId },
      order: [['created_at', 'DESC']]
    })

    // Fetch last 3 payments
    const recentPayments = await Payment.findAll({
      where: { business_id: businessId },
      order: [['payment_date', 'DESC']],
      limit: 3,
      attributes: ['payment_date', 'amount', 'currency', 'status', 'payment_method']
    })

    // Format response
    const response = {
      subscription: {
        plan_type: subscriptionStatus.current_plan,
        status: subscriptionStatus.subscription_status,
        amount: subscription?.amount || 0,
        currency: subscription?.currency || 'SAR',
        billing_cycle_start: subscription?.billing_cycle_start || null,
        next_billing_date: subscriptionStatus.next_billing_date,
        payment_method: {
          has_token: !!subscription?.moyasar_token,
          last4: subscription?.payment_method_last4 || null,
          brand: subscription?.payment_method_brand || null
        }
      },
      limits: subscriptionStatus.limits,
      usage: subscriptionStatus.usage,
      trial_info: subscriptionStatus.trial_info || null,
      recent_payments: recentPayments.map(p => ({
        date: p.payment_date,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        payment_method: p.payment_method
      }))
    }

    logger.info('Subscription details fetched', { businessId })

    res.json({
      success: true,
      data: response,
      message: getLocalizedMessage('subscription.detailsFetched', req.locale)
    })

  } catch (error) {
    logger.error('Failed to fetch subscription details', {
      businessId: req.businessId,
      error: error.message
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.subscriptionUpdateFailed', req.locale),
      error: error.message
    })
  }
})

/**
 * POST /api/business/subscription/reactivate
 * Reactivate suspended account after successful payment
 * FLOW: Verify payment → Create payment record → Reset subscription → Reactivate business → Generate invoice
 */
router.post('/subscription/reactivate', requireBusinessAuth, async (req, res) => {
  const transaction = await sequelize.transaction()
  
  try {
    const { moyasarPaymentId, planType, locationCount } = req.body
    const businessId = req.businessId
    const business = req.business

    logger.info('Reactivation initiated', {
      businessId,
      moyasarPaymentId,
      currentStatus: business.status,
      suspensionReason: business.suspension_reason
    })

    // Step 1: Validate Business Status
    if (business.status !== 'suspended') {
      logger.warn('Reactivation attempted on non-suspended account', {
        businessId,
        currentStatus: business.status
      })
      
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('reactivation.notSuspended', req.locale),
        code: 'NOT_SUSPENDED',
        current_status: business.status
      })
    }

    // Validate payment ID
    if (!moyasarPaymentId) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.paymentIdRequired', req.locale),
        code: 'PAYMENT_ID_REQUIRED'
      })
    }

    // Step 2: Verify Payment with Moyasar
    logger.info('Verifying payment with Moyasar', { moyasarPaymentId })
    
    let moyasarPayment
    try {
      moyasarPayment = await MoyasarService.fetchPaymentFromMoyasar(moyasarPaymentId)
    } catch (error) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('reactivation.paymentVerificationFailed', req.locale),
        code: 'PAYMENT_NOT_FOUND',
        error: error.message
      })
    }

    const verificationResult = await MoyasarService.verifyPayment(moyasarPaymentId)
    
    if (!verificationResult.verified) {
      logger.error('Payment verification failed for reactivation', {
        businessId,
        moyasarPaymentId,
        issues: verificationResult.issues
      })
      
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('reactivation.paymentVerificationFailed', req.locale),
        code: 'VERIFICATION_FAILED',
        issues: verificationResult.issues
      })
    }

    // Extract payment details
    const paymentAmount = moyasarPayment.amount / 100 // Convert from halalas
    const paymentCurrency = moyasarPayment.currency
    const paymentSource = moyasarPayment.source

    logger.info('Payment verified successfully', {
      moyasarPaymentId,
      amount: paymentAmount,
      currency: paymentCurrency
    })

    // Step 3: Fetch or Create Subscription
    let subscription = await Subscription.findOne({
      where: { business_id: businessId },
      transaction
    })

    if (!subscription) {
      // Create new subscription if none exists
      subscription = await Subscription.create({
        business_id: businessId,
        plan_type: planType || 'basic',
        status: 'active',
        amount: paymentAmount,
        currency: paymentCurrency,
        billing_cycle: 'monthly',
        billing_cycle_start: new Date(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
      }, { transaction })
    }

    // Step 4: Create Payment Record
    logger.info('Creating payment record', { businessId, amount: paymentAmount })
    
    const payment = await Payment.create({
      business_id: businessId,
      subscription_id: subscription.id,
      moyasar_payment_id: moyasarPaymentId,
      amount: paymentAmount,
      currency: paymentCurrency,
      status: 'paid',
      payment_date: new Date(),
      payment_method: 'card',
      metadata: {
        reactivation: true,
        previous_suspension_reason: business.suspension_reason,
        card_brand: paymentSource?.company,
        last4: paymentSource?.number
      }
    }, { transaction })

    await payment.markAsPaid()

    logger.info('Payment record created', {
      paymentId: payment.public_id,
      moyasarPaymentId
    })

    // Step 5: Reset Subscription Status (within transaction)
    await subscription.update({
      status: 'active',
      retry_count: 0,
      grace_period_end: null,
      billing_cycle_start: new Date(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      moyasar_token: paymentSource?.token || subscription.moyasar_token,
      payment_method_last4: paymentSource?.number || subscription.payment_method_last4,
      payment_method_brand: paymentSource?.company || subscription.payment_method_brand
    }, { transaction })

    // If plan upgrade requested, process it
    if (planType && planType !== subscription.plan_type) {
      logger.info('Processing plan upgrade during reactivation', {
        businessId,
        fromPlan: subscription.plan_type,
        toPlan: planType
      })
      
      await subscription.update({
        plan_type: planType
      }, { transaction })
    }

    logger.info('Subscription reactivated', {
      businessId,
      planType: subscription.plan_type,
      nextBillingDate: subscription.next_billing_date
    })

    // Step 6: Reactivate Business Account
    await business.update({
      status: 'active',
      subscription_status: 'active',
      suspension_reason: null,
      suspension_date: null,
      last_activity_at: new Date()
    }, { transaction })

    logger.info('Business account reactivated', {
      businessId,
      previousStatus: 'suspended'
    })

    // Step 7: Generate Invoice
    const { Counter } = await import('../models/index.js')
    
    const year = new Date().getFullYear()
    const invoiceNumber = await Counter.getNextValue('invoice', year, { transaction })
    
    const invoice = await Invoice.create({
      business_id: businessId,
      subscription_id: subscription.id,
      payment_id: payment.id,
      invoice_number: `INV-${year}-${String(invoiceNumber).padStart(6, '0')}`,
      amount: paymentAmount,
      tax_amount: paymentAmount * 0.15, // 15% VAT
      total_amount: paymentAmount * 1.15,
      currency: paymentCurrency,
      status: 'paid',
      issued_date: new Date(),
      paid_date: new Date(),
      metadata: {
        reactivation: true,
        plan_type: subscription.plan_type
      }
    }, { transaction })

    logger.info('Invoice generated', {
      invoiceId: invoice.public_id,
      invoiceNumber: invoice.invoice_number
    })

    // Step 8: Commit Transaction
    await transaction.commit()

    // Step 9: Send Notification (non-blocking)
    try {
      const NotificationService = (await import('../services/NotificationService.js')).default
      const notificationService = new NotificationService()
      
      await notificationService.sendReactivationSuccessNotification(businessId, {
        plan_type: subscription.plan_type,
        amount: paymentAmount,
        currency: paymentCurrency,
        next_billing_date: subscription.next_billing_date
      })
    } catch (notificationError) {
      logger.error('Failed to send reactivation notification', {
        businessId,
        error: notificationError.message
      })
      // Don't fail the request
    }

    // Step 10: Fetch Updated Subscription Status
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(businessId)

    logger.info('Reactivation completed successfully', {
      businessId,
      planType: subscription.plan_type,
      nextBillingDate: subscription.next_billing_date
    })

    res.json({
      success: true,
      message: getLocalizedMessage('reactivation.success', req.locale),
      subscription: {
        plan_type: subscription.plan_type,
        status: subscription.status,
        next_billing_date: subscription.next_billing_date
      },
      limits: subscriptionStatus.limits,
      usage: subscriptionStatus.usage,
      payment: {
        amount: paymentAmount,
        currency: paymentCurrency,
        payment_date: payment.payment_date,
        invoice_number: invoice.invoice_number
      }
    })

  } catch (error) {
    await transaction.rollback()
    
    logger.error('Reactivation failed', {
      businessId: req.businessId,
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.reactivationFailed', req.locale),
      error: error.message
    })
  }
})

/**
 * PUT /api/business/subscription/upgrade
 * Process subscription upgrade with prorated billing
 */
router.put('/subscription/upgrade', requireBusinessAuth, async (req, res) => {
  try {
    const { newPlanType, locationCount, useStoredPayment } = req.body
    const businessId = req.businessId

    logger.info('Subscription upgrade initiated', {
      businessId,
      newPlanType,
      locationCount,
      useStoredPayment
    })

    // Validate plan type
    const validPlans = ['professional', 'enterprise']
    if (!validPlans.includes(newPlanType)) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidPlanType', req.locale)
      })
    }

    if (!useStoredPayment) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.noPaymentMethod', req.locale),
        redirect: `/subscription/checkout?plan=${newPlanType}&location=${locationCount || 1}`
      })
    }

    // Fetch subscription to get stored token
    const subscription = await Subscription.findOne({
      where: { business_id: businessId }
    })

    if (!subscription || !subscription.moyasar_token) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.noPaymentMethod', req.locale)
      })
    }

    // Get plan definition
    const planDef = SubscriptionService.getPlanDefinition(newPlanType)
    const planAmount = planDef.price * (locationCount || 1)

    // Calculate prorated amount
    const proratedAmount = await subscription.calculateProration(planAmount)

    logger.debug('Prorated amount calculated', {
      businessId,
      planAmount,
      proratedAmount
    })

    // Create Payment record
    const payment = await Payment.create({
      business_id: businessId,
      subscription_id: subscription.public_id,
      amount: proratedAmount,
      currency: 'SAR',
      status: 'pending',
      payment_method: 'card',
      metadata: {
        gateway: 'moyasar',
        plan_type: newPlanType,
        location_count: locationCount || 1,
        is_upgrade: true,
        prorated: true
      }
    })

    logger.debug('Payment record created for upgrade', {
      businessId,
      paymentId: payment.public_id
    })

    // Process payment with stored token
    try {
      const paymentResult = await MoyasarService.createTokenizedPayment({
        businessId,
        subscriptionId: subscription.public_id,
        token: subscription.moyasar_token,
        amount: proratedAmount,
        currency: 'SAR',
        description: `Upgrade to ${newPlanType} plan`,
        callbackUrl: process.env.MOYASAR_CALLBACK_URL
      })

      if (!paymentResult.success) {
        await payment.markAsFailed(paymentResult.error || 'Payment failed')
        
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('payment.tokenizationFailed', req.locale),
          error: paymentResult.error
        })
      }

      // Begin transaction for upgrade
      const transaction = await sequelize.transaction()

      try {
        // Update payment to paid
        await payment.update({
          status: 'paid',
          payment_date: new Date(),
          moyasar_payment_id: paymentResult.moyasarPayment.id
        }, { transaction })

        // Upgrade subscription
        const upgradeResult = await SubscriptionService.upgradeSubscription(
          businessId,
          newPlanType,
          locationCount || 1,
          transaction
        )

        // Create invoice
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`
        const paymentAmount = parseFloat(payment.amount)
        const taxAmount = paymentAmount * 0.15
        const totalAmount = paymentAmount + taxAmount

        await Invoice.create({
          invoice_number: invoiceNumber,
          business_id: businessId,
          payment_id: payment.public_id,
          subscription_id: subscription.public_id,
          amount: paymentAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency: 'SAR',
          issued_date: new Date(),
          due_date: new Date(),
          paid_date: new Date(),
          status: 'paid',
          invoice_data: {
            plan_type: newPlanType,
            location_count: locationCount || 1,
            payment_method: 'card',
            is_upgrade: true
          }
        }, { transaction })

        // Commit transaction
        await transaction.commit()

        logger.info('Subscription upgraded successfully', {
          businessId,
          newPlanType,
          proratedAmount
        })

        // Fetch updated subscription status
        const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(businessId)

        res.json({
          success: true,
          message: getLocalizedMessage('subscription.upgraded', req.locale),
          subscription: subscriptionStatus,
          payment: {
            amount: proratedAmount,
            invoice_number: invoiceNumber
          }
        })

      } catch (error) {
        await transaction.rollback()
        throw error
      }

    } catch (paymentError) {
      logger.error('Upgrade payment failed', {
        businessId,
        error: paymentError.message
      })
      
      await payment.markAsFailed(paymentError.message)
      
      throw paymentError
    }

  } catch (error) {
    logger.error('Subscription upgrade failed', {
      businessId: req.businessId,
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.subscriptionUpdateFailed', req.locale),
      error: error.message
    })
  }
})

/**
 * PUT /api/business/subscription/downgrade
 * Schedule subscription downgrade at end of billing period
 */
router.put('/subscription/downgrade', requireBusinessAuth, async (req, res) => {
  try {
    const { newPlanType } = req.body
    const businessId = req.businessId

    logger.info('Subscription downgrade initiated', {
      businessId,
      newPlanType
    })

    // Validate plan type
    const validPlans = ['free', 'professional']
    if (!validPlans.includes(newPlanType)) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.invalidPlanType', req.locale)
      })
    }

    // Call service to schedule downgrade
    const result = await SubscriptionService.downgradeSubscription(businessId, newPlanType)

    logger.info('Subscription downgrade scheduled', {
      businessId,
      newPlanType,
      effectiveDate: result.effective_date
    })

    res.json({
      success: true,
      message: getLocalizedMessage('subscription.downgraded', req.locale),
      data: {
        effective_date: result.effective_date,
        credit_amount: result.credit || 0,
        message: getLocalizedMessage('subscription.downgradeScheduled', req.locale)
      }
    })

  } catch (error) {
    logger.error('Subscription downgrade failed', {
      businessId: req.businessId,
      error: error.message
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.subscriptionUpdateFailed', req.locale),
      error: error.message
    })
  }
})

/**
 * PUT /api/business/subscription/cancel
 * Cancel subscription immediately or at end of billing period
 */
router.put('/subscription/cancel', requireBusinessAuth, async (req, res) => {
  try {
    const { reason } = req.body
    const businessId = req.businessId

    logger.info('Subscription cancellation initiated', {
      businessId,
      reason: reason || 'not provided'
    })

    // Call service to cancel subscription
    const result = await SubscriptionService.cancelSubscription(businessId, reason)

    logger.info('Subscription cancelled', {
      businessId,
      cancelledAt: result.cancelled_at,
      accessUntil: result.access_until
    })

    res.json({
      success: true,
      message: getLocalizedMessage('subscription.cancelled', req.locale),
      data: {
        cancelled_at: result.cancelled_at,
        access_until: result.access_until,
        message: getLocalizedMessage('subscription.accessRetained', req.locale, { 
          date: new Date(result.access_until).toLocaleDateString() 
        })
      }
    })

  } catch (error) {
    logger.error('Subscription cancellation failed', {
      businessId: req.businessId,
      error: error.message
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.subscriptionUpdateFailed', req.locale),
      error: error.message
    })
  }
})

/**
 * PUT /api/business/subscription/payment-method
 * Update stored payment method token
 */
router.put('/subscription/payment-method', requireBusinessAuth, async (req, res) => {
  try {
    const { moyasarPaymentId } = req.body
    const businessId = req.businessId

    if (!moyasarPaymentId) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('validation.paymentIdRequired', req.locale)
      })
    }

    logger.info('Payment method update initiated', {
      businessId,
      moyasarPaymentId
    })

    // Verify payment with Moyasar
    const verificationResult = await MoyasarService.verifyPayment(moyasarPaymentId)

    if (!verificationResult.verified || !verificationResult.moyasarPayment) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('payment.verificationFailed', req.locale)
      })
    }

    const moyasarPayment = verificationResult.moyasarPayment

    // Extract payment method details
    const token = moyasarPayment.source?.token
    const last4 = moyasarPayment.source?.last4
    const brand = moyasarPayment.source?.company

    if (!token) {
      return res.status(400).json({
        success: false,
        message: getLocalizedMessage('payment.tokenizationFailed', req.locale)
      })
    }

    // Update subscription with new payment method
    const subscription = await Subscription.findOne({
      where: { business_id: businessId }
    })

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    await subscription.update({
      moyasar_token: token,
      payment_method_last4: last4,
      payment_method_brand: brand
    })

    logger.info('Payment method updated', {
      businessId,
      last4,
      brand
    })

    // Never return full token in response
    res.json({
      success: true,
      message: getLocalizedMessage('subscription.paymentMethodUpdated', req.locale),
      data: {
        last4,
        brand,
        has_token: true
      }
    })

  } catch (error) {
    logger.error('Payment method update failed', {
      businessId: req.businessId,
      error: error.message
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('server.subscriptionUpdateFailed', req.locale),
      error: error.message
    })
  }
})

/**
 * GET /api/business/subscription/payment-debug/:moyasarPaymentId
 * Debug endpoint to manually verify payment (development only)
 * READ-ONLY: This endpoint does not mutate payment state or metadata
 */
router.get('/subscription/payment-debug/:moyasarPaymentId', requireBusinessAuth, async (req, res) => {
  // Only available in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint not available in production'
    })
  }

  try {
    const { moyasarPaymentId } = req.params
    const businessId = req.businessId

    logger.debug('Payment debug request (read-only)', { businessId, moyasarPaymentId })

    // Call pure verification helper - no side effects, no mutations
    const verificationResult = await MoyasarService.getVerificationResult(moyasarPaymentId)

    // Return full verification details for debugging
    res.json({
      success: true,
      moyasarPaymentId,
      verificationResult: {
        verified: verificationResult.verified,
        issues: verificationResult.issues,
        verificationDetails: verificationResult.verificationDetails,
        payment: verificationResult.payment ? {
          id: verificationResult.payment.public_id,
          status: verificationResult.payment.status,
          amount: verificationResult.payment.amount,
          currency: verificationResult.payment.currency,
          metadata: verificationResult.payment.metadata
        } : null,
        moyasarPayment: verificationResult.moyasarPayment ? {
          id: verificationResult.moyasarPayment.id,
          status: verificationResult.moyasarPayment.status,
          amount: verificationResult.moyasarPayment.amount,
          currency: verificationResult.moyasarPayment.currency,
          created_at: verificationResult.moyasarPayment.created_at
        } : null
      }
    })

  } catch (error) {
    logger.error('Payment debug request failed', {
      businessId: req.businessId,
      moyasarPaymentId: req.params.moyasarPaymentId,
      error: error.message
    })

    res.status(500).json({
      success: false,
      message: 'Failed to debug payment',
      error: error.message
    })
  }
})

// ============================================
// PAYMENT HISTORY & INVOICE ENDPOINTS
// ============================================

/**
 * GET /api/business/payments - List payments with filters and pagination
 * Returns paginated payment history for authenticated business
 */
router.get('/payments', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId

    // Extract query params with defaults
    const page = parseInt(req.query.page) || 1
    let limit = parseInt(req.query.limit) || 20
    limit = Math.min(limit, 100) // Cap at 100

    const { status, dateFrom, dateTo, minAmount, maxAmount, search, sortBy, sortOrder } = req.query

    logger.debug('Fetching payment history', {
      businessId,
      page,
      limit,
      filters: { status, dateFrom, dateTo, minAmount, maxAmount, search },
      sort: { sortBy, sortOrder }
    })

    // Build where clause
    const whereClause = {
      business_id: businessId
    }

    // Status filter
    if (status) {
      const validStatuses = ['pending', 'paid', 'failed', 'refunded', 'cancelled']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('payment.invalidStatus', req.locale)
        })
      }
      whereClause.status = status
    }

    // Date range filter
    if (dateFrom && dateTo) {
      try {
        const fromDate = new Date(dateFrom)
        const toDate = new Date(dateTo)
        
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: getLocalizedMessage('payment.invalidDateRange', req.locale)
          })
        }

        whereClause.payment_date = {
          [Op.between]: [fromDate, toDate]
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: getLocalizedMessage('payment.invalidDateRange', req.locale)
        })
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      whereClause.amount = {}
      
      if (minAmount) {
        const min = parseFloat(minAmount)
        if (isNaN(min)) {
          return res.status(400).json({
            success: false,
            message: getLocalizedMessage('payment.invalidAmount', req.locale || 'en')
          })
        }
        whereClause.amount[Op.gte] = min
      }

      if (maxAmount) {
        const max = parseFloat(maxAmount)
        if (isNaN(max)) {
          return res.status(400).json({
            success: false,
            message: getLocalizedMessage('payment.invalidAmount', req.locale || 'en')
          })
        }
        whereClause.amount[Op.lte] = max
      }
    }

    // Search filter (invoice number or Moyasar payment ID)
    if (search) {
      whereClause[Op.or] = [
        { moyasar_payment_id: { [Op.iLike]: `%${search}%` } },
        { '$invoice.invoice_number$': { [Op.iLike]: `%${search}%` } }
      ]
    }

    // Build order clause
    const validSortFields = ['payment_date', 'amount', 'created_at']
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'payment_date'
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC'

    // Query payments
    const { count, rows } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['plan_type']
        },
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['invoice_number', 'status']
        }
      ],
      order: [[orderField, orderDirection]],
      limit,
      offset: (page - 1) * limit,
      attributes: [
        'public_id',
        'amount',
        'currency',
        'status',
        'payment_method',
        'payment_date',
        'moyasar_payment_id',
        'created_at'
      ]
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit)

    const pagination = {
      total_items: count,
      total_pages: totalPages,
      current_page: page,
      per_page: limit,
      has_next: page < totalPages,
      has_prev: page > 1
    }

    logger.info('Payment history fetched successfully', {
      businessId,
      count,
      page,
      totalPages
    })

    res.json({
      success: true,
      data: {
        payments: rows,
        pagination
      },
      message: getLocalizedMessage('payment.historyFetched', req.locale)
    })

  } catch (error) {
    logger.error('Failed to fetch payment history', {
      businessId: req.businessId,
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('errors.serverError', req.locale),
      error: error.message
    })
  }
})

/**
 * GET /api/business/invoices/:invoiceId - Download invoice PDF
 * Returns PDF invoice for authenticated business
 */
router.get('/invoices/:invoiceId', requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.businessId
    const { invoiceId } = req.params

    logger.debug('Invoice download request', { businessId, invoiceId })

    // Fetch invoice
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
          attributes: ['public_id']
        }
      ]
    })

    // Check if invoice exists
    if (!invoice) {
      logger.warn('Invoice not found', { businessId, invoiceId })
      return res.status(404).json({
        success: false,
        message: getLocalizedMessage('invoice.notFound', req.locale)
      })
    }

    // Verify ownership
    if (invoice.business_id !== businessId) {
      logger.warn('Invoice access denied - ownership mismatch', {
        businessId,
        invoiceBusinessId: invoice.business_id,
        invoiceId
      })
      return res.status(403).json({
        success: false,
        message: getLocalizedMessage('invoice.accessDenied', req.locale)
      })
    }

    // Generate PDF
    const pdfBuffer = await InvoiceService.generateInvoicePDF(invoice.id)

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    logger.info('Invoice PDF downloaded successfully', {
      businessId,
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      bufferSize: pdfBuffer.length
    })

    // Send PDF buffer
    res.send(pdfBuffer)

  } catch (error) {
    logger.error('Failed to download invoice', {
      businessId: req.businessId,
      invoiceId: req.params.invoiceId,
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: getLocalizedMessage('invoice.downloadFailed', req.locale),
      error: error.message
    })
  }
})

export default router