# Apple Wallet - Card Design Integration

## ✅ Changes Implemented

### Problem Identified
The Apple Wallet pass generator was not using custom colors from the card designer due to field name mismatches. Generated passes always showed the default blue color instead of custom brand colors.

### Root Cause
- Controller was looking for `design.text_color` (doesn't exist)
- Database model uses `design.foreground_color`
- `design.label_color` was not being used at all

---

## 🔧 Fixes Applied

### 1. Fixed Color Field Mapping
**File:** `backend/controllers/appleWalletController.js`
**Lines:** 156-166

**Before:**
```javascript
const foregroundColor = design?.text_color
  ? this.hexToRgb(design.text_color)
  : 'rgb(255, 255, 255)' // Default white
const labelColor = foregroundColor // Use same color for labels as text
```

**After:**
```javascript
const foregroundColor = design?.foreground_color
  ? this.hexToRgb(design.foreground_color)
  : 'rgb(255, 255, 255)' // Default white
const labelColor = design?.label_color
  ? this.hexToRgb(design.label_color)
  : foregroundColor // Use foreground color as fallback
```

### 2. Added Design Tracking
**File:** `backend/controllers/appleWalletController.js`
**Lines:** 120-129

Added automatic tracking when a card design is used to generate a pass:

```javascript
// Mark card design as applied (if design was used)
if (design) {
  try {
    await CardDesignService.markDesignAsApplied(offerData.offerId)
    console.log('🎨 Card design marked as applied for offer:', offerData.offerId)
  } catch (error) {
    console.warn('⚠️ Failed to mark design as applied:', error.message)
    // Non-critical error, don't fail the request
  }
}
```

This updates the `last_applied_at` timestamp in the `offer_card_designs` table.

---

## 📋 Database Schema Reference

The `offer_card_designs` table stores custom designs with these color fields:

```sql
background_color  VARCHAR(7)  -- Hex format: #3B82F6
foreground_color  VARCHAR(7)  -- Hex format: #FFFFFF
label_color       VARCHAR(7)  -- Hex format: #E0F2FE
```

These are automatically converted to RGB format for Apple Wallet:
- `#3B82F6` → `rgb(59, 130, 246)`
- `#FFFFFF` → `rgb(255, 255, 255)`
- `#E0F2FE` → `rgb(224, 242, 254)`

---

## 🧪 How to Test

### Step 1: Create or Edit a Card Design
1. Log in to your platform at http://localhost:3000
2. Navigate to an offer
3. Go to the "Card Design" section
4. Customize the colors:
   - **Background Color:** Choose your brand color (e.g., red #DC2626, green #10B981)
   - **Text Color (Foreground):** Choose contrasting color (usually white #FFFFFF)
   - **Label Color:** Choose a lighter shade for labels
5. Save the design

### Step 2: Generate Apple Wallet Pass
1. Navigate to a customer who has this offer
2. Click "Add to Apple Wallet" button
3. Download the `.pkpass` file

### Step 3: Verify Custom Colors
1. Transfer the `.pkpass` file to your iPhone
2. Open the file to install the pass
3. **VERIFY:** The pass should show your custom colors instead of default blue!

### Step 4: Check Backend Logs
You should see these log messages in the backend console:

```
🎨 Using custom card design for Apple Wallet pass: off_xxxxx
🎨 Colors: {
  backgroundColor: 'rgb(220, 38, 38)',
  foregroundColor: 'rgb(255, 255, 255)',
  labelColor: 'rgb(254, 202, 202)'
}
🎨 Card design marked as applied for offer: off_xxxxx
```

---

## 📊 Design Fields Supported

The Apple Wallet pass now uses these fields from card designer:

| Card Designer Field | Apple Wallet Usage | Format |
|---------------------|-------------------|---------|
| `background_color` | Card background | RGB |
| `foreground_color` | Text color | RGB |
| `label_color` | Field labels | RGB |
| `logo_apple_url` | Logo image | PNG |
| `hero_image_url` | Strip image | PNG |

---

## 🎨 Example Color Combinations

### Coffee Shop (Brown/Cream)
```javascript
{
  background_color: '#6B4226',  // Dark brown
  foreground_color: '#FFFFFF',  // White
  label_color: '#F5DEB3'        // Wheat
}
```

### Tech Brand (Blue/White)
```javascript
{
  background_color: '#1E40AF',  // Deep blue
  foreground_color: '#FFFFFF',  // White
  label_color: '#DBEAFE'        // Light blue
}
```

### Restaurant (Red/White)
```javascript
{
  background_color: '#DC2626',  // Red
  foreground_color: '#FFFFFF',  // White
  label_color: '#FECACA'        // Light red
}
```

---

## 🔍 Troubleshooting

### Pass still shows default blue color

**Check 1:** Verify card design exists for the offer
```sql
SELECT * FROM offer_card_designs WHERE offer_id = 'off_xxxxx';
```

**Check 2:** Check backend logs for this message:
```
🎨 Using custom card design for Apple Wallet pass: off_xxxxx
```

If you see:
```
📝 No custom design found, using defaults for: off_xxxxx
```
Then the offer doesn't have a card design yet.

**Check 3:** Verify color values in database are valid hex:
```sql
SELECT offer_id, background_color, foreground_color, label_color
FROM offer_card_designs
WHERE offer_id = 'off_xxxxx';
```

Should return values like: `#3B82F6`, `#FFFFFF`, `#E0F2FE`

### Design exists but colors not applied

**Check:** Restart backend server to ensure code changes are loaded:
```bash
cd backend
npm start
```

---

## 📝 Related Files

- `backend/controllers/appleWalletController.js` - Pass generation logic
- `backend/models/OfferCardDesign.js` - Card design database model
- `backend/services/CardDesignService.js` - Card design business logic
- `src/components/cardDesign/CardDesignEditor.jsx` - Frontend editor

---

## ✨ Next Steps

The integration is complete! Now when you:
1. Create a custom card design in the platform
2. Generate an Apple Wallet pass for a customer

The pass will automatically use your custom brand colors, logos, and images!

All passes will continue to install successfully on iOS 15.6+ thanks to the compact JSON formatting fix.
