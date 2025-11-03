# Open Graph Image Requirements

## File: `og-image.png`

### Specifications:
- **Dimensions**: 1200x630px (Facebook/WhatsApp recommended size)
- **Format**: PNG or JPG (PNG preferred for quality)
- **File size**: Under 1MB (ideally under 300KB)
- **Location**: `/public/og-image.png`

### Design Requirements:

#### Background:
- Use brand purple gradient (#9333ea to #7c3aed)
- Or use solid brand colors
- Ensure good contrast with text

#### Text Content:
- **Main text**: "Madna Platform" or "منصة مدنا" (bilingual)
- **Tagline**: "Simple, Reliable Loyalty Solutions" / "حلول ولاء بسيطة وموثوقة"
- **Font size**: Minimum 60px for readability
- **Text color**: White for good contrast

#### Logo:
- Include the Madna logo if available
- Place in center or top-left
- Ensure logo is visible at small sizes

#### Safe Zones:
- Keep important content in center 1200x600px area
- Some platforms crop edges differently
- Avoid placing text near edges (50px margin recommended)

### Testing Checklist:
- [ ] Test on WhatsApp (most common use case in Saudi market)
- [ ] Test on Facebook Sharing Debugger (https://developers.facebook.com/tools/debug/)
- [ ] Test on Twitter Card Validator (https://cards-dev.twitter.com/validator)
- [ ] Test on LinkedIn Post Inspector
- [ ] Verify readability on mobile devices
- [ ] Check file size is under 300KB for fast loading

### Quick Creation Options:

#### Option 1: Canva
1. Go to Canva.com
2. Search for "Facebook Post" template (1200x630px)
3. Add brand colors and text
4. Export as PNG

#### Option 2: Figma
1. Create new frame 1200x630px
2. Add gradient background
3. Add text and logo
4. Export as PNG

#### Option 3: Photoshop
1. New document 1200x630px
2. Apply gradient
3. Add text layers
4. Save for Web (PNG-24)

### Alternative: Use Placeholder
If no design resources available, create a simple image with:
- Solid purple background (#9333ea)
- White centered text: "Madna Platform"
- White subtitle: "Customer Loyalty Programs"
- This is better than no image!

### After Creating:
1. Place file at: `/public/og-image.png`
2. Test with: `curl -I https://api.madna.me/og-image.png`
3. Verify it's accessible publicly
4. Clear Facebook/Twitter cache if needed

### Page-Specific Images (Future Enhancement):
You can create specific images for key pages:
- `/public/og-image-pricing.png` - Include pricing info
- `/public/og-image-features.png` - Feature highlights
- `/public/og-image-contact.png` - Contact information

Then reference in SEO component:
```jsx
<SEO image="/og-image-pricing.png" titleKey="..." descriptionKey="..." />
```
