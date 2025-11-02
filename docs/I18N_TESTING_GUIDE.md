# i18n Testing Guide

## Overview
This guide provides comprehensive testing procedures for the internationalization (i18n) implementation in the Madna Loyalty Platform, covering language switching, RTL layouts, forms, modals, and cross-browser testing.

---

## 1. Language Switching Tests

### 1.1 LanguageSwitcher Component
**Test all three variants across different pages:**

- **Button Variant** (DashboardHeader, BranchScanner, AdminDashboard, MobileBottomNav):
  - Click globe icon → Should toggle between Arabic and English
  - Verify `showLabels={false}` hides text labels
  - Check icon visibility on mobile (min 44px touch target)

- **Tabs Variant** (DashboardSidebar):
  - Click "العربية" → Interface switches to Arabic, RTL layout applied
  - Click "English" → Interface switches to English, LTR layout applied
  - Verify active state highlighting (primary color background)

- **Dropdown Variant** (if implemented):
  - Open dropdown menu → List shows both languages
  - Select language → Dropdown closes, interface switches

### 1.2 Language Persistence
- **localStorage Check**:
  1. Switch to Arabic → Reload page → Should remain Arabic
  2. Switch to English → Close tab → Reopen → Should remain English
  3. Check `localStorage.getItem('i18nextLng')` in DevTools console

### 1.3 Cross-Page Consistency
- **Navigation Test**:
  1. Set language to Arabic on Landing page
  2. Navigate to Dashboard → Should remain Arabic
  3. Navigate to Card Design Editor → Should remain Arabic
  4. Switch to English → All pages should update

---

## 2. RTL Layout Tests

### 2.1 Text Alignment
**Pages to test:** Landing, Dashboard, Card Design Editor, Admin Dashboard, Branch Scanner

- **LTR (English)**:
  - Text aligned left by default
  - Headings, paragraphs, lists align left
  - Numbers and URLs stay LTR (expected)

- **RTL (Arabic)**:
  - Text aligned right automatically
  - Headings, paragraphs, lists align right
  - Numbers stay LTR (expected Arabic behavior)
  - URLs stay LTR (expected)

### 2.2 Flex Direction & Spacing
**Components with `gap` utilities (replaced `space-x`):**

- **DashboardHeader**:
  - Logo + Business name spacing works in both directions
  - Action buttons (Language, Dark Mode, Logout) spacing correct

- **DashboardSidebar**:
  - Navigation items: Icon + Label spacing consistent
  - Action buttons spacing uniform

- **Footer**:
  - Social media icons spacing correct
  - Footer links spacing consistent
  - Copyright + Language Switcher spacing correct

- **MobileBottomNav**:
  - 6 navigation items (including LanguageSwitcher) evenly spaced

### 2.3 Icon Flipping
**Components with directional icons:**

- **CollapsibleSection** (Chevrons):
  - LTR: Chevron-down when closed, chevron-up when open
  - RTL: Should auto-flip (CSS handles this)

- **Arrow Icons** (if any in modals/navigation):
  - LTR: → (right arrow) for "Next"
  - RTL: ← (left arrow) for "Next" (apply `.rtl-flip` class)

### 2.4 Form Layouts
**Forms to test:** CustomerSignup, BusinessRegistrationPage, Card Design Editor

- **Input Fields**:
  - LTR: Labels left, input fields stretch right
  - RTL: Labels right, input fields stretch left
  - Placeholder text alignment matches input direction

- **Multi-Field Rows** (e.g., First Name + Last Name):
  - LTR: First Name left, Last Name right
  - RTL: First Name right, Last Name left

- **Dropdowns & Selects**:
  - Chevron icons position correctly (right in LTR, left in RTL)

### 2.5 Modals & Overlays
**Components:** QRCodeModal, NotificationModal, CreateOfferModal, BranchModal

- **Modal Header**:
  - Icon + Title spacing correct
  - Close button position (top-right LTR, top-left RTL)

- **Modal Content**:
  - Text alignment matches language direction
  - Form fields align correctly

- **Modal Footer** (Action Buttons):
  - LTR: Cancel (left), Confirm (right)
  - RTL: Cancel (right), Confirm (left)

---

## 3. Translation Key Tests

### 3.1 Namespace Coverage
**Verify all namespaces load correctly:**

- `common`: Global UI elements (buttons, labels, errors)
- `auth`: Login, signup, password reset
- `customer`: Customer signup, customer dashboard
- `landing`: Public pages (hero, features, pricing, FAQ)
- `dashboard`: Business dashboard tabs, navigation
- `admin`: Admin dashboard, branch scanner
- `cardDesign`: Card design editor, previews, validation

### 3.2 Cross-Namespace Syntax
**Test components using multiple namespaces:**

- **ValidationPanel** (`cardDesign:validation.status` + `common:actions.close`):
  - English: "Validation Status" + "Close"
  - Arabic: "حالة التحقق" + "إغلاق"

- **CollapsibleSection** (`cardDesign:sections.basicInfo` + `common:labels.required`):
  - English: "Basic Information" + "Required"
  - Arabic: "المعلومات الأساسية" + "مطلوب"

### 3.3 Missing Key Detection
**Force missing keys to test fallback:**

1. Open DevTools console
2. Filter logs for "i18next"
3. Switch languages while watching for warnings:
   - ⚠️ "key 'someKey' not found in namespace 'dashboard'"
4. If found, add missing key to `locales/[lang]/[namespace].json`

---

## 4. Component-Specific Tests

### 4.1 Card Design Editor
**Test all sections:**

- **Basic Info Section**:
  - Labels: "Offer Title", "Subtitle" → "عنوان العرض", "العنوان الفرعي"
  - Validation errors show in correct language

- **Color Pickers**:
  - Labels: "Background Color", "Text Color" → "لون الخلفية", "لون النص"
  - Hex input stays LTR (expected)

- **Logo/Hero Uploaders**:
  - Button text: "Choose Image" → "اختر صورة"
  - File name displays correctly in RTL

- **Stamp Icon Picker**:
  - Labels: "Stamp Icon", "Custom" → "أيقونة الختم", "مخصص"
  - Icon grid layout works in RTL

- **Previews** (Apple & Google Wallet):
  - Card header text aligns correctly
  - Progress section (stamps) flows RTL in Arabic
  - Barcode section maintains position

### 4.2 Dashboard Tabs
**Test all tabs:**

- **Overview Tab**: Stats cards, charts layout
- **My Offers Tab**: Offer cards grid, filters, "Create Offer" button
- **Branches Tab**: Branch table, "Add Branch" button, BranchModal
- **Customers Tab**: Customer table, pagination, search
- **QR Scanner Tab**: Scanner UI, success/error modals

### 4.3 Modals
**QRCodeModal**:
- Analytics cards spacing
- Download buttons order (QR, Link, Share)
- Accordion sections expand/collapse correctly

**NotificationModal**:
- Form fields align correctly
- Character counter position (bottom-right LTR, bottom-left RTL)
- Preview section text alignment

---

## 5. Browser & Device Testing

### 5.1 Desktop Browsers
**Test on:**
- Chrome (latest)
- Firefox (latest)
- Safari (macOS if available)
- Edge (latest)

**Verify:**
- Font rendering (Arabic diacritics, ligatures)
- Layout consistency across browsers
- localStorage persistence

### 5.2 Mobile Browsers
**Test on:**
- Chrome Mobile (Android)
- Safari Mobile (iOS)

**Verify:**
- Touch targets ≥44px (LanguageSwitcher, buttons)
- MobileBottomNav 6th tab (LanguageSwitcher) works
- Viewport scaling correct in RTL
- Soft keyboard doesn't break layout

### 5.3 Responsive Breakpoints
**Test at:**
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1280px, 1920px

**Verify:**
- DashboardSidebar collapses to MobileBottomNav on mobile
- LanguageSwitcher visibility rules (`hidden sm:flex`)
- Grid layouts adapt to RTL

---

## 6. Accessibility Tests

### 6.1 Screen Readers
**Test with NVDA (Windows) or VoiceOver (macOS):**

- Language announcements match interface language
- LanguageSwitcher announces current language
- Form labels read correctly in Arabic

### 6.2 Keyboard Navigation
- Tab through LanguageSwitcher → Should focus and activate with Enter/Space
- Tab through forms → Focus order matches visual RTL/LTR order

### 6.3 Color Contrast
- Dark mode text meets WCAG AA standards (4.5:1 ratio)
- Primary color (#3B82F6) on white background passes

---

## 7. Performance Tests

### 7.1 Bundle Size
**Check translation files don't bloat bundle:**

```bash
npm run build
```

- Inspect `dist/assets/*.js` sizes
- Verify i18n resources lazy-load (not bundled in main chunk)

### 7.2 Language Switch Speed
- Measure time from LanguageSwitcher click to UI update
- Should be <100ms for optimal UX

### 7.3 Initial Load
- Arabic default (index.html has `lang="ar" dir="rtl"`)
- No layout shift from LTR→RTL on first load

---

## 8. Regression Tests

### 8.1 Existing Features
**Verify no functionality broke:**

- Card design save/publish works
- QR code generation works
- Wallet pass download works
- Customer signup completes
- Business registration completes
- Admin CRUD operations work

### 8.2 Dark Mode
- Dark mode toggle works in both languages
- Dark mode persists across language switches

### 8.3 Authentication
- Login works in both languages
- Error messages display correctly
- Session persistence works

---

## 9. Sign-Off Checklist

Before marking i18n as production-ready:

- [ ] All LanguageSwitcher locations functional (6 locations)
- [ ] All 25 plan files implemented
- [ ] 65 RTL CSS utilities working
- [ ] All namespaces (7) load without errors
- [ ] No missing translation keys in console
- [ ] All components tested in LTR and RTL
- [ ] Forms submit correctly in both languages
- [ ] Modals display correctly in both languages
- [ ] Mobile testing complete (iOS + Android)
- [ ] Desktop testing complete (Chrome, Firefox, Safari, Edge)
- [ ] Accessibility pass (screen reader, keyboard nav)
- [ ] Performance acceptable (bundle size, switch speed)
- [ ] Dark mode works in both languages
- [ ] No regressions in existing features

---

## 10. Troubleshooting

### Issue: Text stays LTR in Arabic
**Fix:** Verify `i18n.changeLanguage('ar')` sets `document.documentElement.dir = 'rtl'`

### Issue: Spacing broken in RTL
**Fix:** Replace `space-x-*` with `gap-*` in component

### Issue: Icons don't flip
**Fix:** Add `.rtl-flip` class to icon element

### Issue: Missing translation
**Fix:** Add key to `locales/ar/[namespace].json` and `locales/en/[namespace].json`

### Issue: Language doesn't persist
**Fix:** Check localStorage key `i18nextLng` is set correctly

---

**Testing Responsibility:** QA Team + Development Team  
**Estimated Time:** 8-12 hours for full test suite  
**Last Updated:** January 2025
