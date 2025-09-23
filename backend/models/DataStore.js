import fs from 'fs/promises'
import path from 'path'

class DataStore {
  constructor() {
    this.dataFile = path.join(process.cwd(), 'data', 'platform-data.json')
    this.data = {
      offers: [],
      branches: [],
      customers: [],
      businessCategories: [],
      businesses: [],
      analytics: {}
    }
    this.initialized = false
  }

  async init() {
    if (this.initialized) return

    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true })

      // Try to load existing data
      try {
        const fileData = await fs.readFile(this.dataFile, 'utf8')
        this.data = JSON.parse(fileData)
        console.log('📊 Loaded existing platform data')
      } catch (error) {
        // File doesn't exist, initialize with Saudi data
        console.log('🆕 Initializing platform data with Saudi sample data')
        this.initializeWithSaudiData()
        await this.save()
      }

      this.initialized = true
    } catch (error) {
      console.error('❌ Error initializing DataStore:', error)
      this.initializeWithSaudiData()
      this.initialized = true
    }
  }

  initializeWithSaudiData() {
    this.data = {
      // Saudi offers data
      offers: [
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
          isTimeLimited: false,
          businessId: 1
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
          isTimeLimited: false,
          businessId: 1
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
          isTimeLimited: true,
          businessId: 1
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
          isTimeLimited: false,
          businessId: 1
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
          isTimeLimited: false,
          businessId: 1
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
          isTimeLimited: true,
          businessId: 1
        }
      ],

      // Saudi branches data
      branches: [
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
          createdAt: "2023-03-01",
          businessId: 1
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
          createdAt: "2023-05-15",
          businessId: 1
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
          createdAt: "2023-07-20",
          businessId: 1
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
          createdAt: "2023-08-10",
          businessId: 1
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
          createdAt: "2023-09-05",
          businessId: 1
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
          createdAt: "2023-10-12",
          businessId: 1
        }
      ],

      // Saudi customers data
      customers: [
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
          preferredLanguage: "ar",
          businessId: 1
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
          preferredLanguage: "ar",
          businessId: 1
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
          preferredLanguage: "ar",
          businessId: 1
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
          preferredLanguage: "en",
          businessId: 1
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
          preferredLanguage: "ar",
          businessId: 1
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
          preferredLanguage: "ar",
          businessId: 1
        }
      ],

      // Business categories
      businessCategories: [
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
      ],

      // Business entities (what admin manages)
      businesses: [
        {
          id: 1,
          email: 'info@alamalrestaurant.sa',
          password: 'password123', // Test password
          business_name: 'مطعم الأمل - Al-Amal Restaurant',
          phone: '+966 11 123-4567',
          status: 'active',
          created_at: '2023-03-01T10:30:00Z',
          approved_at: '2023-03-02T09:15:00Z',
          approved_by: 1,
          last_activity_at: new Date().toISOString(),
          total_branches: 6,
          total_offers: 6,
          active_offers: 6,
          total_customers: 3675, // Sum of all branch customers
          total_redemptions: 205, // Sum of all offer redemptions
          business_type: 'Restaurant & Cafe',
          region: 'Saudi Arabia - All Regions',
          owner_name: 'أحمد محمد الأحمد - Ahmed Mohammed Al-Ahmed',
          license_number: 'CR-1234567890-SA',
          city: 'Multiple Cities'
        },
        {
          id: 2,
          email: 'contact@saudicoffee.sa',
          business_name: 'مقهى الأصيل - Authentic Coffee House',
          phone: '+966 12 987-6543',
          status: 'pending',
          created_at: '2024-01-18T08:45:00Z',
          approved_at: null,
          approved_by: null,
          last_activity_at: '2024-01-18T08:45:00Z',
          total_branches: 1,
          total_offers: 1,
          active_offers: 0,
          total_customers: 0,
          total_redemptions: 0,
          business_type: 'Coffee Shop',
          region: 'Western Region',
          owner_name: 'فاطمة عبدالله الزهراني - Fatima Abdullah Al-Zahrani',
          license_number: 'CR-2345678901-SA',
          city: 'Jeddah'
        },
        {
          id: 3,
          email: 'info@saudisweets.sa',
          business_name: 'حلويات الشام - Al-Sham Sweets',
          phone: '+966 13 456-7890',
          status: 'suspended',
          created_at: '2024-01-10T12:00:00Z',
          approved_at: '2024-01-11T10:00:00Z',
          approved_by: 1,
          last_activity_at: '2024-01-17T16:30:00Z',
          suspension_reason: 'Incomplete documentation - نقص في الوثائق المطلوبة',
          suspension_date: '2024-01-19T10:00:00Z',
          total_branches: 1,
          total_offers: 2,
          active_offers: 0,
          total_customers: 45,
          total_redemptions: 12,
          business_type: 'Bakery & Sweets',
          region: 'Eastern Region',
          owner_name: 'محمد سالم القحطاني - Mohammed Salem Al-Qahtani',
          license_number: 'CR-3456789012-SA',
          city: 'Dammam'
        }
      ],

      // Analytics metadata
      analytics: {
        lastUpdated: new Date().toISOString(),
        platform: 'Saudi Loyalty Program',
        version: '1.0.0'
      }
    }
  }

  async save() {
    try {
      this.data.analytics.lastUpdated = new Date().toISOString()
      await fs.writeFile(this.dataFile, JSON.stringify(this.data, null, 2))
      console.log('💾 Platform data saved successfully')
      return true
    } catch (error) {
      console.error('❌ Error saving platform data:', error)
      return false
    }
  }

  // Getters for different data types
  getOffers() {
    return this.data.offers || []
  }

  getBranches() {
    return this.data.branches || []
  }

  getCustomers() {
    return this.data.customers || []
  }

  getBusinesses() {
    return this.data.businesses || []
  }

  getBusinessCategories() {
    return this.data.businessCategories || []
  }

  // Business management methods
  async updateBusinessStatus(businessId, status, reason = null) {
    await this.init()

    const business = this.data.businesses.find(b => b.id === parseInt(businessId))
    if (!business) {
      throw new Error('Business not found')
    }

    business.status = status
    business.last_activity_at = new Date().toISOString()

    if (status === 'active' && !business.approved_at) {
      business.approved_at = new Date().toISOString()
      business.approved_by = 1 // Admin ID
    }

    if (status === 'suspended') {
      business.suspension_date = new Date().toISOString()
      if (reason) {
        business.suspension_reason = reason
      }
    }

    await this.save()
    console.log(`✅ Business ${business.business_name} status updated to: ${status}`)
    return business
  }

  async addBusiness(businessData) {
    await this.init()

    const newId = Math.max(...this.data.businesses.map(b => b.id), 0) + 1
    const newBusiness = {
      ...businessData,
      id: newId,
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      status: 'pending',
      total_branches: 0,
      total_offers: 0,
      active_offers: 0,
      total_customers: 0,
      total_redemptions: 0
    }

    this.data.businesses.push(newBusiness)

    // Automatically create the first main branch for the new business
    const mainBranch = {
      id: this.getNextBranchId(),
      businessId: newId,
      name: businessData.business_name + ' - Main Branch',
      address: businessData.address || 'Address not provided',
      city: businessData.city || businessData.region || 'City not provided', 
      state: businessData.state || businessData.region || 'State not provided',
      zipCode: businessData.zipCode || '00000',
      phone: businessData.phone,
      email: businessData.email,
      manager: businessData.owner_name,
      isMain: true,
      status: 'active', // First branch should be active
      customers: 0,
      activeOffers: 0,
      monthlyRevenue: 0,
      createdAt: new Date().toISOString().split('T')[0],
      openingHours: {
        monday: "9:00 AM - 6:00 PM",
        tuesday: "9:00 AM - 6:00 PM", 
        wednesday: "9:00 AM - 6:00 PM",
        thursday: "9:00 AM - 6:00 PM",
        friday: "9:00 AM - 6:00 PM",
        saturday: "10:00 AM - 4:00 PM",
        sunday: "Closed"
      }
    }

    this.data.branches.push(mainBranch)
    
    // Update business totals
    newBusiness.total_branches = 1

    await this.save()

    console.log(`✅ New business added: ${newBusiness.business_name}`)
    console.log(`✅ Main branch created: ${mainBranch.name}`)
    return newBusiness
  }

  // Calculate real-time analytics
  calculateAnalytics() {
    const businesses = this.getBusinesses()
    const offers = this.getOffers()
    const branches = this.getBranches()
    const customers = this.getCustomers()

    return {
      total_businesses: businesses.length,
      active_businesses: businesses.filter(b => b.status === 'active').length,
      pending_businesses: businesses.filter(b => b.status === 'pending').length,
      suspended_businesses: businesses.filter(b => b.status === 'suspended').length,
      total_offers: offers.length,
      active_offers: offers.filter(o => o.status === 'active').length,
      total_customers: branches.reduce((sum, branch) => sum + branch.customers, 0),
      total_redemptions: offers.reduce((sum, offer) => sum + offer.redeemed, 0),
      apple_wallet_passes: Math.floor(customers.length * 0.6),
      google_wallet_passes: Math.floor(customers.length * 0.4),
      monthly_growth_rate: 22.8,
      customer_engagement_rate: 78.5,
      total_revenue: branches.reduce((sum, branch) => sum + branch.monthlyRevenue, 0)
    }
  }

  // Get next available IDs
  getNextOfferId() {
    return Math.max(...this.data.offers.map(o => o.id), 0) + 1
  }

  getNextBranchId() {
    return Math.max(...this.data.branches.map(b => b.id), 0) + 1
  }

  getNextCustomerId() {
    return Math.max(...this.data.customers.map(c => c.id), 0) + 1
  }

  getNextBusinessId() {
    return Math.max(...this.data.businesses.map(b => b.id), 0) + 1
  }
}

// Create singleton instance
const dataStore = new DataStore()

export default dataStore