import express from 'express'
import dataStore from '../models/DataStore.js'
import appleWalletController from '../controllers/appleWalletController.js'
import googleWalletController from '../controllers/realGoogleWalletController.js'

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

let branches = [
  {
    id: 1,
    name: "فرع الرياض الرئيسي - Riyadh Main Branch",
    address: "شارع الأمير محمد بن عبدالعزيز، العليا - Prince Mohammed bin Abdulaziz St, Al Olaya",
    city: "الرياض - Riyadh",
    state: "المنطقة الوسطى - Central Region",
    zipCode: "11564",
    phone: "+966 11 123-4567",
    email: "riyadh@alamalrestaurant.sa",
    manager: "أحمد السعيد - Ahmed Al-Saeed",
    status: "active",
    isMain: true,
    customers: 1247,
    activeOffers: 5,
    monthlyRevenue: 180000,
    openingHours: {
      saturday: "10:00 AM - 12:00 AM",
      sunday: "10:00 AM - 12:00 AM",
      monday: "10:00 AM - 12:00 AM",
      tuesday: "10:00 AM - 12:00 AM",
      wednesday: "10:00 AM - 12:00 AM",
      thursday: "10:00 AM - 1:00 AM",
      friday: "2:00 PM - 1:00 AM"
    },
    createdAt: "2023-03-01"
  },
  {
    id: 2,
    name: "فرع جدة - Jeddah Branch",
    address: "شارع التحلية، حي التحلية - Tahlia Street, Tahlia District",
    city: "جدة - Jeddah",
    state: "المنطقة الغربية - Western Region",
    zipCode: "21541",
    phone: "+966 12 987-6543",
    email: "jeddah@alamalrestaurant.sa",
    manager: "فاطمة الغامدي - Fatima Al-Ghamdi",
    status: "active",
    isMain: false,
    customers: 892,
    activeOffers: 4,
    monthlyRevenue: 145000,
    openingHours: {
      saturday: "11:00 AM - 12:00 AM",
      sunday: "11:00 AM - 12:00 AM",
      monday: "11:00 AM - 12:00 AM",
      tuesday: "11:00 AM - 12:00 AM",
      wednesday: "11:00 AM - 12:00 AM",
      thursday: "11:00 AM - 1:00 AM",
      friday: "2:00 PM - 1:00 AM"
    },
    createdAt: "2023-05-15"
  },
  {
    id: 3,
    name: "فرع الدمام - Dammam Branch",
    address: "شارع الملك فهد، حي الفيصلية - King Fahd Road, Al Faisaliyah",
    city: "الدمام - Dammam",
    state: "المنطقة الشرقية - Eastern Region",
    zipCode: "32245",
    phone: "+966 13 456-7890",
    email: "dammam@alamalrestaurant.sa",
    manager: "محمد العتيبي - Mohammed Al-Otaibi",
    status: "active",
    isMain: false,
    customers: 567,
    activeOffers: 3,
    monthlyRevenue: 95000,
    openingHours: {
      saturday: "10:00 AM - 11:00 PM",
      sunday: "10:00 AM - 11:00 PM",
      monday: "10:00 AM - 11:00 PM",
      tuesday: "10:00 AM - 11:00 PM",
      wednesday: "10:00 AM - 11:00 PM",
      thursday: "10:00 AM - 12:00 AM",
      friday: "2:00 PM - 12:00 AM"
    },
    createdAt: "2023-07-20"
  },
  {
    id: 4,
    name: "فرع مكة المكرمة - Makkah Branch",
    address: "شارع إبراهيم الخليل، العزيزية - Ibrahim Al-Khalil St, Al Aziziyyah",
    city: "مكة المكرمة - Makkah",
    state: "المنطقة الغربية - Western Region",
    zipCode: "24243",
    phone: "+966 12 234-5678",
    email: "makkah@alamalrestaurant.sa",
    manager: "عبدالله الحربي - Abdullah Al-Harbi",
    status: "active",
    isMain: false,
    customers: 423,
    activeOffers: 2,
    monthlyRevenue: 78000,
    openingHours: {
      saturday: "9:00 AM - 11:00 PM",
      sunday: "9:00 AM - 11:00 PM",
      monday: "9:00 AM - 11:00 PM",
      tuesday: "9:00 AM - 11:00 PM",
      wednesday: "9:00 AM - 11:00 PM",
      thursday: "9:00 AM - 12:00 AM",
      friday: "2:00 PM - 12:00 AM"
    },
    createdAt: "2023-08-10"
  },
  {
    id: 5,
    name: "فرع المدينة المنورة - Madinah Branch",
    address: "شارع قباء، حي قباء - Quba Street, Quba District",
    city: "المدينة المنورة - Madinah",
    state: "المنطقة الغربية - Western Region",
    zipCode: "42311",
    phone: "+966 14 345-6789",
    email: "madinah@alamalrestaurant.sa",
    manager: "خديجة الأنصاري - Khadijah Al-Ansari",
    status: "active",
    isMain: false,
    customers: 312,
    activeOffers: 2,
    monthlyRevenue: 65000,
    openingHours: {
      saturday: "10:00 AM - 10:00 PM",
      sunday: "10:00 AM - 10:00 PM",
      monday: "10:00 AM - 10:00 PM",
      tuesday: "10:00 AM - 10:00 PM",
      wednesday: "10:00 AM - 10:00 PM",
      thursday: "10:00 AM - 11:00 PM",
      friday: "2:00 PM - 11:00 PM"
    },
    createdAt: "2023-09-05"
  },
  {
    id: 6,
    name: "فرع الخبر - Khobar Branch",
    address: "شارع الأمير فيصل بن فهد، الروضة - Prince Faisal bin Fahd St, Al Rawda",
    city: "الخبر - Khobar",
    state: "المنطقة الشرقية - Eastern Region",
    zipCode: "34423",
    phone: "+966 13 567-8901",
    email: "khobar@alamalrestaurant.sa",
    manager: "سارة القحطاني - Sarah Al-Qahtani",
    status: "active",
    isMain: false,
    customers: 234,
    activeOffers: 2,
    monthlyRevenue: 52000,
    openingHours: {
      saturday: "11:00 AM - 11:00 PM",
      sunday: "11:00 AM - 11:00 PM",
      monday: "11:00 AM - 11:00 PM",
      tuesday: "11:00 AM - 11:00 PM",
      wednesday: "11:00 AM - 11:00 PM",
      thursday: "11:00 AM - 12:00 AM",
      friday: "2:00 PM - 12:00 AM"
    },
    createdAt: "2023-10-12"
  }
]

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
let nextBranchId = Math.max(...branches.map(b => b.id)) + 1
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

// Get all branches
router.get('/branches', (req, res) => {
  try {
    res.json({
      success: true,
      data: branches
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    })
  }
})

// Get single branch
router.get('/branches/:id', (req, res) => {
  try {
    const branch = branches.find(b => b.id === parseInt(req.params.id))
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      })
    }
    res.json({
      success: true,
      data: branch
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch',
      error: error.message
    })
  }
})

// Create new branch
router.post('/branches', (req, res) => {
  try {
    const newBranch = {
      ...req.body,
      id: nextBranchId++,
      customers: 0,
      activeOffers: 0,
      monthlyRevenue: 0,
      status: 'inactive',
      createdAt: new Date().toISOString().split('T')[0]
    }
    branches.unshift(newBranch)
    res.status(201).json({
      success: true,
      data: newBranch,
      message: 'Branch created successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create branch',
      error: error.message
    })
  }
})

// Update branch
router.put('/branches/:id', (req, res) => {
  try {
    const branchIndex = branches.findIndex(b => b.id === parseInt(req.params.id))
    if (branchIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      })
    }

    branches[branchIndex] = {
      ...branches[branchIndex],
      ...req.body
    }

    res.json({
      success: true,
      data: branches[branchIndex],
      message: 'Branch updated successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update branch',
      error: error.message
    })
  }
})

// Delete branch
router.delete('/branches/:id', (req, res) => {
  try {
    const branchIndex = branches.findIndex(b => b.id === parseInt(req.params.id))
    if (branchIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      })
    }

    const branch = branches[branchIndex]

    // Safety checks
    if (branch.isMain) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the main branch'
      })
    }

    // Only prevent deletion if this is the last active branch
    if (branch.status === 'active' && branches.filter(b => b.status === 'active').length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last active branch'
      })
    }

    if (branch.activeOffers > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with active offers'
      })
    }

    branches.splice(branchIndex, 1)
    res.json({
      success: true,
      message: 'Branch deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
      error: error.message
    })
  }
})

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
    await dataStore.init()

    // Get real data from unified data store
    const offers = dataStore.getOffers()
    const branches = dataStore.getBranches()
    const customers = dataStore.getCustomers()

    // Calculate real stats from unified data
    const totalOffers = offers.length
    const activeOffers = offers.filter(o => o.status === 'active').length
    const totalBranches = branches.length
    const activeBranches = branches.filter(b => b.status === 'active').length

    // Calculate customer stats from actual customer data
    const totalCustomers = customers.length
    const totalRevenueThisMonth = branches.reduce((sum, branch) => sum + branch.monthlyRevenue, 0)
    const totalCustomerSpending = customers.reduce((sum, customer) => sum + customer.totalSpent, 0)

    // Calculate cards issued (sum of customers from active offers)
    const cardsIssued = offers.reduce((sum, offer) => sum + offer.customers, 0)

    // Calculate rewards redeemed from customer data
    const rewardsRedeemed = customers.reduce((sum, customer) => sum + customer.rewardsRedeemed, 0)

    // Calculate growth percentage based on customer activity
    const vipCustomers = customers.filter(c => c.status === 'vip').length
    const growthPercentage = totalCustomers > 0 ? Math.round((vipCustomers / totalCustomers) * 100) : 0

    // Saudi Arabia specific metrics
    const averageSpendingPerCustomer = totalCustomers > 0 ? Math.round(totalCustomerSpending / totalCustomers) : 0
    const arabicPreferredCustomers = customers.filter(c => c.preferredLanguage === 'ar').length
    const englishPreferredCustomers = customers.filter(c => c.preferredLanguage === 'en').length

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
      // Regional distribution
      regionStats: {
        riyadh: customers.filter(c => c.city.includes('الرياض') || c.city.includes('Riyadh')).length,
        jeddah: customers.filter(c => c.city.includes('جدة') || c.city.includes('Jeddah')).length,
        dammam: customers.filter(c => c.city.includes('الدمام') || c.city.includes('Dammam')).length,
        makkah: customers.filter(c => c.city.includes('مكة') || c.city.includes('Makkah')).length,
        madinah: customers.filter(c => c.city.includes('المدينة') || c.city.includes('Madinah')).length,
        khobar: customers.filter(c => c.city.includes('الخبر') || c.city.includes('Khobar')).length
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

// Get offer details for customer signup (public endpoint)
router.get('/public/offer/:id', (req, res) => {
  try {
    const offer = offers.find(o => o.id === parseInt(req.params.id))
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      })
    }

    // Get business info from branches (use first active branch as default)
    const defaultBranch = branches.find(b => b.isMain) || branches.find(b => b.status === 'active') || branches[0]
    const businessName = defaultBranch?.manager ? defaultBranch.manager.split(' ')[0] + "'s Business" : "Local Business"

    // Format offer for customer display
    const customerOfferData = {
      id: offer.id,
      title: offer.title,
      description: offer.description,
      businessName: businessName,
      branchName: offer.branch,
      stampsRequired: offer.stampsRequired,
      type: offer.type,
      status: offer.status
    }

    res.json({
      success: true,
      data: customerOfferData
    })
  } catch (error) {
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
// AUTHENTICATION MIDDLEWARE
// ===============================

// Middleware to verify business session
const requireBusinessAuth = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token']
    const businessId = req.headers['x-business-id']

    if (!sessionToken || !businessId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    await dataStore.init()
    const business = dataStore.getBusinesses().find(b => b.id === parseInt(businessId))

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

// Get business-specific offers
router.get('/my/offers', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()

    // Get offers associated with this business
    const businessOffers = dataStore.getOffers().filter(offer => offer.businessId === req.business.id)

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

// Get business-specific branches
router.get('/my/branches', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()

    // Get branches associated with this business
    const businessBranches = dataStore.getBranches().filter(branch => branch.businessId === req.business.id)

    res.json({
      success: true,
      data: businessBranches
    })
  } catch (error) {
    console.error('Get business branches error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get branches'
    })
  }
})

// Get business-specific analytics
router.get('/my/analytics', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()

    // Calculate analytics for this specific business
    const businessOffers = dataStore.getOffers().filter(offer => offer.businessId === req.business.id)
    const businessBranches = dataStore.getBranches().filter(branch => branch.businessId === req.business.id)
    const businessCustomers = dataStore.getCustomers().filter(customer => customer.businessId === req.business.id)

    const analytics = {
      totalCustomers: businessCustomers.length,
      cardsIssued: businessOffers.reduce((sum, offer) => sum + (offer.customers || 0), 0),
      rewardsRedeemed: businessOffers.reduce((sum, offer) => sum + (offer.redeemed || 0), 0),
      growthPercentage: businessCustomers.length > 0 ? `+${Math.round((businessCustomers.filter(c => c.status === 'vip').length / businessCustomers.length) * 100)}%` : '+0%',
      totalOffers: businessOffers.length,
      totalBranches: businessBranches.length,
      monthlyRevenue: businessBranches.reduce((sum, branch) => sum + (branch.monthlyRevenue || 0), 0)
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
    await dataStore.init()

    // Generate activity based on business data
    const businessOffers = dataStore.getOffers().filter(offer => offer.businessId === req.business.id)
    const businessBranches = dataStore.getBranches().filter(branch => branch.businessId === req.business.id)
    
    const activity = []
    const now = new Date()

    // Add recent offer activities
    businessOffers.slice(0, 3).forEach((offer, index) => {
      const hoursAgo = (index + 1) * 2
      const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      if (offer.redeemed > 0) {
        activity.push({
          id: `offer-${offer.id}-${index}`,
          message: `Customer redeemed "${offer.title.replace(/🍕|☕|🎂|🏃|🥙|🍰|🥤|💇‍♂️|🛍️/g, '').trim()}" at ${offer.branch}`,
          timestamp: timeAgo.toISOString(),
          timeAgo: `${hoursAgo} hours ago`,
          type: 'redemption'
        })
      }
    })

    // Add recent customer activities
    businessBranches.filter(b => b.customers > 0).slice(0, 2).forEach((branch, index) => {
      const hoursAgo = (index + 3) * 2
      const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      activity.push({
        id: `branch-${branch.id}-${index}`,
        message: `New customer joined loyalty program at ${branch.name}`,
        timestamp: timeAgo.toISOString(),
        timeAgo: `${hoursAgo} hours ago`,
        type: 'signup'
      })
    })

    // Sort by timestamp (newest first)
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // If no activity, show welcome message
    if (activity.length === 0) {
      activity.push({
        id: 1,
        message: `Welcome to the Loyalty Platform! Your business "${req.business.business_name}" has been approved.`,
        timeAgo: 'Just now',
        type: 'info'
      })
    }

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

// Create business offer
router.post('/my/offers', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()
    
    
    const newOffer = {
      ...req.body,
      id: dataStore.getNextOfferId(),
      businessId: req.business.id, // Associate with logged-in business
      customers: 0,
      redeemed: 0,
      createdAt: 'just now',
      status: 'paused'
    }
    
    // Add to DataStore
    dataStore.data.offers.unshift(newOffer)
    await dataStore.save()
    
    
    res.status(201).json({
      success: true,
      data: newOffer,
      message: 'Offer created successfully'
    })
  } catch (error) {
    console.error('Create offer error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error: error.message
    })
  }
})

// Update business offer
router.put('/my/offers/:id', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()
    
    const offerIndex = dataStore.data.offers.findIndex(o => 
      o.id === parseInt(req.params.id) && o.businessId === req.business.id
    )
    
    if (offerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or not owned by your business'
      })
    }

    dataStore.data.offers[offerIndex] = {
      ...dataStore.data.offers[offerIndex],
      ...req.body
    }
    
    await dataStore.save()

    res.json({
      success: true,
      data: dataStore.data.offers[offerIndex],
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

// Delete business offer
router.delete('/my/offers/:id', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()
    
    const offerIndex = dataStore.data.offers.findIndex(o => 
      o.id === parseInt(req.params.id) && o.businessId === req.business.id
    )
    
    if (offerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or not owned by your business'
      })
    }

    dataStore.data.offers.splice(offerIndex, 1)
    await dataStore.save()
    
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

// Toggle business offer status
router.patch('/my/offers/:id/status', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()
    
    const offer = dataStore.data.offers.find(o => 
      o.id === parseInt(req.params.id) && o.businessId === req.business.id
    )
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or not owned by your business'
      })
    }

    offer.status = offer.status === 'active' ? 'paused' : 'active'
    await dataStore.save()

    res.json({
      success: true,
      data: offer,
      message: `Offer ${offer.status === 'active' ? 'activated' : 'paused'} successfully`
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

// Create business branch
router.post('/my/branches', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()
    

    
    const newBranch = {
      ...req.body,
      id: dataStore.getNextBranchId(),
      businessId: req.business.id, // Associate with logged-in business
      customers: 0,
      activeOffers: 0,
      monthlyRevenue: 0,
      status: 'inactive',
      createdAt: new Date().toISOString().split('T')[0]
    }
    
    // Add to DataStore
    dataStore.data.branches.unshift(newBranch)
    await dataStore.save()
    
    
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

// Update business branch
router.put('/my/branches/:id', requireBusinessAuth, async (req, res) => {
  try {
    await dataStore.init()
    
    const branchIndex = dataStore.data.branches.findIndex(b => 
      b.id === parseInt(req.params.id) && b.businessId === req.business.id
    )
    
    if (branchIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or not owned by your business'
      })
    }

    dataStore.data.branches[branchIndex] = {
      ...dataStore.data.branches[branchIndex],
      ...req.body
    }
    
    await dataStore.save()

    res.json({
      success: true,
      data: dataStore.data.branches[branchIndex],
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
    await dataStore.init()
    
    const branchIndex = dataStore.data.branches.findIndex(b => 
      b.id === parseInt(req.params.id) && b.businessId === req.business.id
    )
    
    if (branchIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or not owned by your business'
      })
    }

    const branch = dataStore.data.branches[branchIndex]

    // Safety checks
    if (branch.isMain) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the main branch'
      })
    }

    // Only prevent deletion if this is the last active branch
    if (branch.status === 'active') {
      const activeBranches = dataStore.data.branches.filter(b => 
        b.businessId === req.business.id && b.status === 'active'
      )
      if (activeBranches.length <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active branch'
        })
      }
    }

    // Find and delete offers specifically tied to this branch
    const branchName = branch.name
    const offersToDelete = dataStore.data.offers.filter(offer =>
      offer.businessId === req.business.id &&
      offer.branch === branchName &&
      offer.branch !== 'All Branches' &&
      offer.branch !== 'جميع الفروع'
    )

    // Remove the branch-specific offers
    if (offersToDelete.length > 0) {
      const offerIds = offersToDelete.map(o => o.id)
      for (let i = dataStore.data.offers.length - 1; i >= 0; i--) {
        if (offerIds.includes(dataStore.data.offers[i].id)) {
          dataStore.data.offers.splice(i, 1)
        }
      }
    }

    dataStore.data.branches.splice(branchIndex, 1)
    await dataStore.save()
    
    res.json({
      success: true,
      message: `Branch deleted successfully${offersToDelete.length > 0 ? ` and ${offersToDelete.length} associated offer(s) removed` : ''}`,
      deletedOffers: offersToDelete.length
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
    await dataStore.init()
    
    const branch = dataStore.data.branches.find(b => 
      b.id === parseInt(req.params.id) && b.businessId === req.business.id
    )
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found or not owned by your business'
      })
    }

    branch.status = branch.status === 'active' ? 'inactive' : 'active'
    await dataStore.save()

    res.json({
      success: true,
      data: branch,
      message: `Branch ${branch.status === 'active' ? 'activated' : 'deactivated'} successfully`
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

// Business login endpoint
router.post('/login', async (req, res) => {
  try {
    await dataStore.init()

    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      })
    }

    // Find business by email
    const business = dataStore.getBusinesses().find(b => b.email === email)
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

    // For now, check password directly (in production, use bcrypt)
    if (business.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Generate simple session token (in production, use JWT)
    const sessionToken = Date.now().toString() + Math.random().toString(36)

    // Update last login
    business.last_activity_at = new Date().toISOString()
    await dataStore.save()

    // Return business info (excluding password)
    const { password: _, ...businessData } = business

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        business: businessData,
        session_token: sessionToken
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

// Business registration endpoint (connects to unified DataStore)
router.post('/register', async (req, res) => {
  try {
    await dataStore.init()

    const businessData = req.body

    // Validate required fields
    const requiredFields = ['business_name', 'email', 'phone', 'owner_name', 'business_type', 'region']
    const missingFields = requiredFields.filter(field => !businessData[field])

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      })
    }

    // Check for duplicate email
    const existingBusiness = dataStore.getBusinesses().find(b => b.email === businessData.email)
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: 'Business with this email already exists'
      })
    }

    // Add business through unified DataStore
    const newBusiness = await dataStore.addBusiness(businessData)

    res.status(201).json({
      success: true,
      data: newBusiness,
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
// BUSINESS CATEGORIES ROUTES
// ===============================

// Get all business categories
router.get('/categories', async (req, res) => {
  try {
    await dataStore.init()
    res.json({
      success: true,
      data: dataStore.getBusinessCategories()
    })
  } catch (error) {
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
router.post('/scan/progress/:customerToken/:offerHash', requireBusinessAuth, async (req, res) => {
  try {
    const { customerToken, offerHash } = req.params
    const businessId = req.business.id

    console.log('🔍 Progress scan attempt:', { customerToken, offerHash, businessId })

    // Decode and validate customer token
    const tokenData = dataStore.decodeCustomerToken(customerToken)
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

    // Find the offer by reverse-engineering the hash
    const businessOffers = dataStore.getOffers().filter(offer => offer.businessId === businessId)
    let targetOffer = null

    for (const offer of businessOffers) {
      if (dataStore.verifyOfferHash(offer.id, businessId, offerHash)) {
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

    console.log('✅ Validated scan for:', { customerId, offerId: targetOffer.id, offerTitle: targetOffer.title })

    // Get or create customer progress
    let progress = await dataStore.getCustomerProgress(customerId, targetOffer.id)
    if (!progress) {
      progress = await dataStore.createCustomerProgress(customerId, targetOffer.id, businessId)
      console.log('🆕 Created new customer progress:', progress)
    }

    // Check if already completed
    if (progress.isCompleted && progress.currentStamps >= progress.maxStamps) {
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
    const progressBefore = progress.currentStamps

    // Update progress (add one stamp)
    const updatedProgress = await dataStore.updateCustomerProgress(customerId, targetOffer.id, 1)

    // Record scan transaction
    const scanTransaction = await dataStore.recordScanTransaction(
      customerToken,
      targetOffer.id,
      businessId,
      req.business.email, // scanned by business email
      progressBefore,
      updatedProgress.currentStamps
    )

    console.log('📊 Progress updated:', {
      before: progressBefore,
      after: updatedProgress.currentStamps,
      completed: updatedProgress.isCompleted
    })

    // Push updates to wallet passes (Apple & Google Wallet)
    const walletUpdates = []

    try {
      // Push to Apple Wallet
      const appleUpdate = await appleWalletController.pushProgressUpdate(
        customerId,
        targetOffer.id,
        updatedProgress
      )
      walletUpdates.push({ platform: 'Apple Wallet', ...appleUpdate })

      // Push to Google Wallet
      const googleUpdate = await googleWalletController.pushProgressUpdate(
        customerId,
        targetOffer.id,
        updatedProgress
      )
      walletUpdates.push({ platform: 'Google Wallet', ...googleUpdate })

      console.log('📱 Wallet updates completed:', walletUpdates.map(u => ({ platform: u.platform, success: u.success })))
    } catch (walletError) {
      console.warn('⚠️ Wallet updates failed (continuing with scan):', walletError.message)
    }

    // Prepare response
    const responseData = {
      progress: updatedProgress,
      customer: { id: customerId },
      offer: {
        id: targetOffer.id,
        title: targetOffer.title,
        business: targetOffer.businessName || req.business.business_name
      },
      scan: {
        id: scanTransaction.id,
        timestamp: scanTransaction.scannedAt
      },
      rewardEarned: updatedProgress.isCompleted && !progress.isCompleted,
      walletUpdates: walletUpdates.map(u => ({
        platform: u.platform,
        success: u.success,
        updated: u.updated
      }))
    }

    // Success message in Arabic and English
    let message = `Progress updated! ${updatedProgress.currentStamps}/${updatedProgress.maxStamps} stamps collected.`
    if (updatedProgress.isCompleted) {
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
router.get('/scan/verify/:customerToken/:offerHash', requireBusinessAuth, async (req, res) => {
  try {
    const { customerToken, offerHash } = req.params
    const businessId = req.business.id

    // Decode and validate customer token
    const tokenData = dataStore.decodeCustomerToken(customerToken)
    if (!tokenData.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired customer token'
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
    const businessOffers = dataStore.getOffers().filter(offer => offer.businessId === businessId)
    let targetOffer = null

    for (const offer of businessOffers) {
      if (dataStore.verifyOfferHash(offer.id, businessId, offerHash)) {
        targetOffer = offer
        break
      }
    }

    if (!targetOffer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      })
    }

    // Get customer progress
    const progress = await dataStore.getCustomerProgress(customerId, targetOffer.id)

    res.json({
      success: true,
      data: {
        customer: { id: customerId },
        offer: {
          id: targetOffer.id,
          title: targetOffer.title,
          stampsRequired: targetOffer.stampsRequired
        },
        progress: progress || {
          currentStamps: 0,
          maxStamps: targetOffer.stampsRequired,
          isCompleted: false
        },
        canScan: !progress?.isCompleted
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
    const businessId = req.business.id
    const limit = parseInt(req.query.limit) || 50

    const scanHistory = await dataStore.getScanHistory(businessId, limit)

    // Enrich scan data with offer titles
    const enrichedHistory = await Promise.all(scanHistory.map(async (scan) => {
      const offer = dataStore.getOffers().find(o => o.id === scan.offerId)
      return {
        ...scan,
        offerTitle: offer?.title || 'Unknown Offer',
        offerType: offer?.type || 'stamps'
      }
    }))

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
    const businessId = req.business.id
    const offerId = req.query.offerId ? parseInt(req.query.offerId) : null

    const analytics = await dataStore.getScanAnalytics(businessId, offerId)

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
    const businessId = req.business.id

    console.log('🧪 Testing dual QR flow for business:', businessId)

    // Step 1: Create test customer progress
    const testCustomerId = 'demo-customer-123'
    const testOfferId = dataStore.getOffers().find(o => o.businessId === businessId)?.id

    if (!testOfferId) {
      return res.status(400).json({
        success: false,
        message: 'No offers found for this business. Please create an offer first.'
      })
    }

    const progress = await dataStore.createCustomerProgress(testCustomerId, testOfferId, businessId)

    // Step 2: Generate customer progress QR data
    const customerToken = Buffer.from(`${testCustomerId}:${businessId}:${Date.now()}`).toString('base64').substring(0, 24)
    const offerHash = dataStore.verifyOfferHash.toString().substring(0, 8)

    // Step 3: Simulate wallet pass generation with customer progress QR
    const walletPassData = {
      customer: { customerId: testCustomerId },
      offer: { offerId: testOfferId, businessId },
      progress: progress,
      progressQRUrl: `http://localhost:3000/scan/${customerToken}/${offerHash}`
    }

    // Step 4: Return test results
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

export default router