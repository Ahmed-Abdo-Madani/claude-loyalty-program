import express from 'express'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import BusinessService from '../services/BusinessService.js'
import OfferService from '../services/OfferService.js'
import CustomerService from '../services/CustomerService.js'
import { Business, Offer, CustomerProgress, Branch, OfferCardDesign } from '../models/index.js'
import appleWalletController from '../controllers/appleWalletController.js'
import googleWalletController from '../controllers/realGoogleWalletController.js'
import { upload, handleUploadError } from '../middleware/logoUpload.js'

const router = express.Router()

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
          attributes: ['business_name', 'business_name_ar', 'phone', 'city', 'logo_filename', 'logo_url']
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
      businessPhone: offer.business?.phone,
      businessCity: offer.business?.city,
      // Business logo information for customer-facing display
      businessLogo: offer.business?.logo_url ? {
        url: `/api/business/public/logo/${offer.business_id}/${offer.business.logo_filename}`,
        filename: offer.business.logo_filename
      } : null,
      // Card design logo (fallback option)
      cardDesignLogo: offer.cardDesign?.logo_url ? {
        url: `/api/card-design/logo/${offer.cardDesign.logo_url}`,
        filename: offer.cardDesign.logo_url
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

// Customer signup endpoint - creates customer and customer_progress in database
router.post('/customers/signup', async (req, res) => {
  try {
    const { customerData, offerId } = req.body

    // Validate required fields
    if (!customerData?.customerId || !offerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID and offer ID are required'
      })
    }

    // Validate customer ID format
    if (!customerData.customerId.startsWith('cust_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format. Must start with cust_'
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
        message: 'Phone number is required'
      })
    }

    // Validate phone format (must contain 7-15 digits)
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must contain 7-15 digits'
      })
    }

    // Validate gender if provided
    if (customerData.gender && !['male', 'female'].includes(customerData.gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender value. Must be male or female'
      })
    }

    // Get offer to find business ID
    const offer = await Offer.findOne({
      where: { public_id: offerId }
    })

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
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
        lastName: customerData.lastName || 'Customer',
        phone: customerData.phone || customerData.whatsapp || null,
        email: customerData.email || null,
        date_of_birth: customerData.birthday || null,
        gender: customerData.gender || 'male',
        source: customerData.source || 'in_store',
        branch: customerData.branch || null
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
      message: 'Customer registered successfully'
    })

  } catch (error) {
    console.error('❌ Customer signup failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to register customer',
      error: error.message
    })
  }
})

// ===============================
// AUTHENTICATION MIDDLEWARE
// ===============================

// Middleware to verify business session - SECURE VERSION
const requireBusinessAuth = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token']
    const businessId = req.headers['x-business-id'] // Now expects secure ID (biz_*)

    if (!sessionToken || !businessId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    // Find business by secure public_id instead of integer id
    const business = await Business.findByPk(businessId) // businessId is now secure string

    if (!business || business.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid business or account not active'
      })
    }

    req.business = business
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    })
  }
}

// ===============================
// BUSINESS-SPECIFIC DATA ROUTES (AUTHENTICATED)
// ===============================

// Get business-specific offers - SECURE VERSION
router.get('/my/offers', requireBusinessAuth, async (req, res) => {
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
      message: 'Failed to get offers'
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
      message: 'Failed to fetch branches',
      error: error.message
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
router.post('/my/offers', requireBusinessAuth, async (req, res) => {
  try {
    // Process date fields - convert empty strings to null
    const processedBody = {
      ...req.body,
      start_date: req.body.start_date && req.body.start_date.trim() !== '' ? req.body.start_date : null,
      end_date: req.body.end_date && req.body.end_date.trim() !== '' ? req.body.end_date : null
    }
    
    const newOfferData = {
      ...processedBody,
      business_id: req.business.public_id, // Use secure public_id
      status: req.body.status || 'paused'
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

// Create business branch - SECURE VERSION
router.post('/my/branches', requireBusinessAuth, async (req, res) => {
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
      status: branchData.status || 'inactive'
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
        message: 'Email and password are required'
      })
    }

    // Find business by email using secure schema
    const business = await Business.findOne({ where: { email } })
    if (!business) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Check if business is approved/active
    if (business.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: business.status === 'pending'
          ? 'Your business registration is pending approval'
          : 'Your business account is suspended'
      })
    }

    // Check password using bcrypt
    const isPasswordValid = bcrypt.compareSync(password, business.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Generate simple session token (in production, use JWT)
    const sessionToken = Date.now().toString() + Math.random().toString(36)

    // Update last activity
    await business.update({ last_activity_at: new Date() })

    // Return business info (excluding password_hash) with SECURE public_id
    const businessObj = business.toJSON()
    const { password_hash: _, ...businessData } = businessObj

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        business: businessData,
        session_token: sessionToken,
        business_id: business.public_id // Return secure ID for frontend use
      }
    })

  } catch (error) {
    console.error('Business login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed'
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
        message: `Missing required fields: ${missingFields.join(', ')}`
      })
    }

    // Check for duplicate email using PostgreSQL
    const existingBusiness = await Business.findOne({ where: { email: businessData.email } })
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: 'Business with this email already exists'
      })
    }

    // Hash the password for secure storage
    const tempPassword = businessData.password || 'TempPass123!'
    const hashedPassword = bcrypt.hashSync(tempPassword, 10)

    // Create business using PostgreSQL with location data
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
      status: 'inactive', // Will be activated when business is approved
      country: 'Saudi Arabia'
    })

    // Update business total_branches count
    await newBusiness.update({ total_branches: 1 })

    // Remove password_hash from response for security
    const businessObj = newBusiness.toJSON()
    const { password_hash: _, ...businessResponse } = businessObj

    res.status(201).json({
      success: true,
      data: businessResponse,
      message: 'Business registration submitted successfully. Your application is under review.'
    })

  } catch (error) {
    console.error('Business registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to register business'
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

    // Find the offer by reverse-engineering the hash
    const businessOffers = await OfferService.findByBusinessId(businessId)
    let targetOffer = null

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

export default router