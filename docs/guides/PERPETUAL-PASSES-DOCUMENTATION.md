# 🔄 Perpetual Loyalty Passes with Customizable Tier System

## Overview

The loyalty platform now supports **perpetual loyalty passes** with an optional **customizable tier/medal system**. This transforms the loyalty experience from single-use passes to reusable, gamified engagement that rewards continued customer loyalty.

### Key Features
- ✅ **Auto-Reset on Reward Claim**: Stamps automatically reset to 0 after prize confirmation
- 🏆 **Customizable Tiers**: Businesses define tier names, thresholds, and icons
- 📊 **Completion Tracking**: Display total rewards claimed
- 🎯 **Progress Motivation**: Show next tier progress  
- ⏰ **Inactivity-Based Expiration**: Only expire passes after 90 days of no activity
- 🔁 **Continuous Engagement**: Customers use one pass forever

---

## 1. How Perpetual Passes Work

### Prize Confirmation Flow

**Customer completes stamps (5 of 5):**
1. Branch manager scans QR code  
2. Manager confirms prize given
3. **System automatically:**
   - Resets `current_stamps` to 0
   - Increments `rewards_claimed` counter  
   - Calculates customer's tier
   - Sends pass update to wallet
4. Customer sees updated pass: "0 of 5 • 🥇 Gold Member • 7x completed"
5. Customer can immediately start earning stamps again

### Pass Never Expires (Unless Inactive)
- Passes remain **active forever** as long as customer keeps scanning
- Only expire after **90 days of inactivity** (no scans)
- Automatic cleanup of abandoned passes
- Seamless multi-cycle experience

---

## 2. Tier System Configuration

### Default Tiers (If Not Configured)
- 🥉 **Bronze Member**: 1-2 completions
- 🥈 **Silver Member**: 3-5 completions  
- 🥇 **Gold Member**: 6+ completions

### Custom Tier Configuration

Businesses customize tiers via **Dashboard → Offers → Edit Offer → Loyalty Tiers**:

**Configuration Options:**
- **Tier Name (English)**: Custom name (e.g., "Expert", "VIP", "Champion")
- **Tier Name (Arabic)**: Bilingual support (e.g., "خبير", "مميز", "بطل")
- **Minimum Rewards**: Threshold to reach tier (e.g., 6)
- **Maximum Rewards**: Upper limit (null = unlimited)
- **Tier Icon**: Emoji or custom icon (e.g., 🥇, 🏆, ⭐, 👑)
- **Tier Color**: Optional color for visual differentiation

**Example Custom Tiers (Coffee Shop):**
```json
{
  "enabled": true,
  "tiers": [
    { 
      "id": "lover",
      "name": "Coffee Lover", 
      "nameAr": "محب القهوة", 
      "minRewards": 1, 
      "maxRewards": 3, 
      "icon": "☕",
      "color": "#6F4E37"
    },
    { 
      "id": "expert",
      "name": "Coffee Expert", 
      "nameAr": "خبير القهوة", 
      "minRewards": 4, 
      "maxRewards": 9, 
      "icon": "🏆",
      "color": "#C0A062"
    },
    { 
      "id": "master",
      "name": "Coffee Master", 
      "nameAr": "أستاذ القهوة", 
      "minRewards": 10, 
      "maxRewards": null, 
      "icon": "👑",
      "color": "#FFD700"
    }
  ]
}
```

---

## 3. Pass Display

### Apple Wallet Pass (Front)
**Secondary Fields:**
1. **Progress**: "4 of 5" (current cycle)
2. **Completed**: "7x" (total completions)
3. **Tier**: "🥇 Gold Member" (customer's tier)

### Google Wallet Pass
- **Loyalty Points**: Shows total completions (not current stamps)
- **Text Modules**: 
  - Member Status: "🥇 Gold Member"
  - Next Tier: "2 more for Platinum"
  - Progress: Visual bar
  
---

## 4. Database & Migration

### Storage
- **New Field**: `offers.loyalty_tiers` (JSON, nullable)
- **No New Tables**: Tier config stored in offer
- **Performance**: Tier calculated on-the-fly (< 10ms)

### Run Migration
```bash
cd backend
npm run migrate:loyalty-tiers
```

**Or manually:**
```sql
ALTER TABLE offers ADD COLUMN loyalty_tiers JSON;
COMMENT ON COLUMN offers.loyalty_tiers 
IS 'Customizable tier/medal system for perpetual loyalty passes';
```

**Verify:**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'offers' AND column_name = 'loyalty_tiers';
```

---

## 5. Testing Checklist

### Perpetual Pass Testing
- [ ] Customer completes 5 of 5 stamps
- [ ] Manager confirms prize given
- [ ] Verify stamps reset to 0 immediately
- [ ] Verify `rewards_claimed` increments (2→3)
- [ ] Verify tier displays correctly ("🥈 Silver Member")
- [ ] Verify pass update pushed to wallet
- [ ] Customer scans again - verify stamp awarded (0→1)
- [ ] Complete 3-5 cycles and verify counter keeps incrementing
- [ ] Verify tier upgrades at threshold (Silver→Gold at 6)

### Tier Configuration Testing
- [ ] Create offer with default tiers (no custom config)
- [ ] Verify default tiers used (Bronze/Silver/Gold)
- [ ] Edit offer and enable custom tiers
- [ ] Configure 3 custom tiers with unique names/icons
- [ ] Save and verify tier config stored
- [ ] Generate pass and verify custom tier names appear
- [ ] Test Arabic tier names
- [ ] Test custom icons (emojis)
- [ ] Test tier validation (overlapping ranges, gaps)

### Tier Upgrade Testing
- [ ] Customer with 2 completions (Bronze tier)
- [ ] Complete one more reward (2→3)
- [ ] Verify tier upgrades to Silver
- [ ] Verify pass shows "🥈 Silver Member"
- [ ] Verify manager sees tier upgrade message
- [ ] Test all tier transitions

### Inactivity Expiration Testing
- [ ] Create test pass, don't scan for 90+ days (simulate with date)
- [ ] Run: `npm run expire-passes`
- [ ] Verify inactive pass expired
- [ ] Verify active passes (scanned recently) NOT expired
- [ ] Verify passes with many completions but recent scans stay active

---

## 6. API Changes

### Prize Confirmation Endpoint
**POST** `/api/branch-manager/confirm-prize/:customerId/:offerId`

**Changes:**
- Calls `claimReward()` instead of `markRewardFulfilled()`
- Calculates customer tier
- Triggers immediate wallet pass updates
- Returns tier data in response

**Response:**
```json
{
  "success": true,
  "progress": {
    "currentStamps": 0,
    "maxStamps": 5,
    "rewardsClaimed": 3,
    "stampsEarned": 0,
    "stampsRequired": 5
  },
  "tier": {
    "currentTier": {
      "id": "silver",
      "name": "Silver Member",
      "icon": "🥈"
    },
    "rewardsClaimed": 3,
    "rewardsToNextTier": 3,
    "nextTier": {
      "name": "Gold Member",
      "icon": "🥇"
    },
    "isTopTier": false
  },
  "newCycleStarted": true,
  "totalCompletions": 3
}
```

---

## 7. Troubleshooting

### Issue: Stamps not resetting after prize confirmation
**Cause**: Old code still using `markRewardFulfilled()` instead of `claimReward()`  
**Solution**: Verify branch manager routes updated, redeploy backend  
**Verification**: Check logs for "Stamps reset to 0, new cycle started"

### Issue: Tier not showing in pass
**Cause**: Tier calculation failed or tier data not passed to pass generation  
**Solution**: Check logs for tier calculation errors, verify offer has tier config  
**Verification**: Check pass.json includes tier field in secondaryFields

### Issue: Custom tier names not appearing
**Cause**: Tier configuration not saved or invalid JSON  
**Solution**: Re-save tier configuration, check for validation errors  
**Verification**: Query database: `SELECT loyalty_tiers FROM offers WHERE public_id = 'off_...'`

### Issue: Pass still expires after 30 days
**Cause**: Old expiration cron job still running  
**Solution**: Update cron job to use `expireInactivePasses(90)`, redeploy  
**Verification**: Check cron job logs for "Expiring passes inactive for 90+ days"

---

## 8. Business Configuration Guide

### Setting Up Custom Tiers

1. Navigate to **Dashboard → Offers**
2. Edit existing offer or create new one
3. Scroll to **"Loyalty Tiers"** section
4. Toggle **"Enable Custom Tiers"** to ON
5. Configure each tier:
   - Enter tier name (English and Arabic)
   - Set minimum rewards threshold
   - Set maximum rewards (or leave empty for unlimited)
   - Choose an icon (emoji or upload custom image)
   - Optionally set a tier color
6. Click **"Save"**
7. Preview in wallet pass preview

### Best Practices
- Use 3-4 tiers (too many dilutes achievement)
- Make tier names aspirational and positive
- Use recognizable icons (medals, stars, crowns)
- Set achievable thresholds (first tier at 1-2 completions)
- Leave top tier unlimited (`maxRewards: null`)
- Test tier display in wallet pass preview

---

## 9. Environment Variables

**New Environment Variable:**
```bash
# Days of inactivity before pass expiration (default: 90)
PASS_INACTIVITY_EXPIRATION_DAYS=90
```

**Update in production:**
- Render.com: Dashboard → Environment → Add Variable
- .env file: Add `PASS_INACTIVITY_EXPIRATION_DAYS=90`

---

## 10. Cron Job Configuration

### Update Expiration Cron Job

**Old schedule** (daily): `0 2 * * *`  
**New schedule** (weekly): `0 2 * * 0` (Sundays at 2 AM)

**Reason**: Inactivity-based expiration is less time-sensitive than completion-based. Weekly execution reduces database load.

**Update in production:**
```yaml
# render.yaml
services:
  - type: cron
    name: expire-inactive-passes
    schedule: "0 2 * * 0"  # Weekly on Sundays
    command: "npm run expire-passes"
```

---

## 11. Migration Rollback

**If migration needs to be rolled back:**
```bash
node backend/migrations/20250129-add-loyalty-tiers-to-offers.js down
```

**Or manually:**
```sql
ALTER TABLE offers DROP COLUMN IF EXISTS loyalty_tiers;
```

---

## 12. Benefits Summary

### Customer Benefits
- ✅ One pass forever (no need to get new passes)
- 🏆 Visible progress and achievement (tiers)
- 📊 See total rewards earned
- 🎯 Motivating tier progression
- 🔁 Seamless multi-cycle experience

### Business Benefits
- 📈 Higher engagement (perpetual use)
- 🎨 Brand-specific tier customization
- 💰 Lower friction (no pass expiration hassle)
- 📊 Better loyalty tracking (completion counter)
- 🌟 Competitive advantage (unique tier system)

### Technical Benefits
- 🗄️ Reduced pass generation overhead
- 🧹 Cleaner database (only expire abandoned passes)
- 🔧 Flexible tier configuration (no code changes)
- 📱 Platform consistency (Apple + Google)
- 🚀 Scalable architecture

---

## 13. Competitive Advantage

Most loyalty platforms use:
- ❌ Single-use passes (expire after completion)
- ❌ Fixed tier systems (Bronze/Silver/Gold only)
- ❌ Time-based expiration (30-90 days regardless of use)

**Our platform offers:**
- ✅ Perpetual passes (reusable indefinitely)
- ✅ Customizable tiers (brand-specific names/icons)
- ✅ Inactivity-based expiration (only expire abandoned passes)
- ✅ Real-time tier upgrades (motivating celebrations)
- ✅ Bilingual tier support (Arabic + English)

---

**For more details, see:**
- `backend/services/CustomerService.js` - Tier calculation logic
- `backend/routes/branchManager.js` - Prize confirmation flow
- `backend/controllers/appleWalletController.js` - Apple Wallet implementation
- `backend/controllers/realGoogleWalletController.js` - Google Wallet implementation
- `src/components/OffersTab.jsx` - Tier configuration UI
