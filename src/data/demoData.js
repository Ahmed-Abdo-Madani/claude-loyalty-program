/**
 * Mock data for the Demo Dashboard feature.
 * These follow the same structure as the real API responses.
 */

export const demoUser = {
    businessName: 'Karak Café (Demo)',
    userEmail: 'demo@madna.me',
    businessId: 'demo_biz_001',
    currency: 'SAR'
};

export const demoAnalytics = {
    totalCustomers: 142,
    cardsIssued: 89,
    rewardsRedeemed: 23,
    growthPercentage: '+12%',
    vipCustomers: 8,
    averageStampsPerCard: 3.4,
    retentionRate: '68%'
};

export const demoOffers = [
    {
        id: 'off_demo_1',
        title: 'Free Karak for 5 Stamps',
        titleAr: 'كرك مجاني مقابل 5 طوابع',
        description: 'Get 1 free karak after collecting 5 stamps.',
        descriptionAr: 'احصل على 1 كرك مجاني بعد جمع 5 طوابع.',
        stampsToReward: 5,
        rewardName: 'Free Karak',
        rewardNameAr: 'كرك مجاني',
        status: 'active',
        isActive: true,
        stats: { total_stamps: 450, total_rewards: 85 }
    },
    {
        id: 'off_demo_2',
        title: 'Buy 10 Get 1 Free Dessert',
        titleAr: 'اشترِ 10 واحصل على حلى مجاني',
        description: 'Enjoy a free dessert of your choice after 10 purchases.',
        descriptionAr: 'استمتع بحلى مجاني من اختيارك بعد 10 عمليات شراء.',
        stampsToReward: 10,
        rewardName: 'Free Dessert',
        rewardNameAr: 'حلى مجاني',
        status: 'active',
        isActive: true,
        stats: { total_stamps: 120, total_rewards: 10 }
    }
];

export const demoBranches = [
    {
        public_id: 'branch_demo_1',
        name: 'Main Branch - Riyadh',
        nameAr: 'الفرع الرئيسي - الرياض',
        location: 'Olaya St, Riyadh',
        isActive: true,
        totalStamps: 320
    },
    {
        public_id: 'branch_demo_2',
        name: 'Jeddah Branch',
        nameAr: 'فرع جدة',
        location: 'Tahliya St, Jeddah',
        isActive: true,
        totalStamps: 250
    }
];

export const demoProducts = [
    { public_id: 'prod_1', name: 'Signature Karak', category: 'Beverages', price: 5, emoji: '☕' },
    { public_id: 'prod_2', name: 'Ginger Karak', category: 'Beverages', price: 6, emoji: '🫚' },
    { public_id: 'prod_3', name: 'Saffron Milk', category: 'Beverages', price: 8, emoji: '🥛' },
    { public_id: 'prod_4', name: 'Oman Chips Sandwich', category: 'Food', price: 12, emoji: '🥪' },
    { public_id: 'prod_5', name: 'Date Cake', category: 'Dessert', price: 15, emoji: '🍰' }
];

export const demoRecentActivity = [
    { id: 'act_1', type: 'stamp', customerName: 'Ahmed M.', action: 'Awarded 1 stamp', time: '2 mins ago' },
    { id: 'act_2', type: 'reward', customerName: 'Sara K.', action: 'Redeemed Free Karak', time: '15 mins ago' },
    { id: 'act_3', type: 'customer', customerName: 'Fahad S.', action: 'Joined Loyalty Program', time: '1 hour ago' },
    { id: 'act_4', type: 'stamp', customerName: 'Noura A.', action: 'Awarded 2 stamps', time: '2 hours ago' }
];

export const demoTodaysSnapshot = {
    sales: 1250.50,
    transactions: 48,
    stampsAwarded: 124,
    rewardsRedeemed: 6,
    averageOrderValue: 26.05
};

export const demoPOSAnalytics = {
    dailySales: [
        { date: '2024-03-20', total: 1100 },
        { date: '2024-03-21', total: 1350 },
        { date: '2024-03-22', total: 980 },
        { date: '2024-03-23', total: 1500 },
        { date: '2024-03-24', total: 1250 }
    ]
};
