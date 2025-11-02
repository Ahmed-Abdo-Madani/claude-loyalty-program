# Language Switcher Icon Update - Testing Guide

## Overview
This document provides a comprehensive testing checklist for verifying the language switcher icon updates implemented across the application.

## Testing Checklist

### 1. Visual Verification - Light Mode
- [ ] Open the app in light mode
- [ ] Navigate to all pages with language switcher (Landing, Dashboard, Admin, Branch Scanner)
- [ ] Verify the language icon displays correctly (not broken/404)
- [ ] Verify the icon is black/dark gray (readable on light background)
- [ ] Verify the icon background is light gray (`bg-gray-100`)
- [ ] Verify the icon is the correct size (20px on mobile, 24px on desktop)
- [ ] Verify the icon changes when you switch languages (Arabic ↔ English)

### 2. Visual Verification - Dark Mode
- [ ] Switch to dark mode
- [ ] Navigate to all pages with language switcher
- [ ] Verify the language icon displays correctly
- [ ] Verify the icon is white/light (readable on dark background) via `dark:invert`
- [ ] Verify the icon background is dark gray (`bg-gray-800`)
- [ ] Verify the icon is the correct size
- [ ] Verify the icon changes when you switch languages

### 3. Responsive Verification
#### Mobile viewport (< 640px)
- [ ] Verify icon is 20px (compact)
- [ ] Verify icon doesn't overlap with other header elements
- [ ] Verify touch target is at least 44x44px
- [ ] Verify icon is visible in DashboardHeader (not hidden)
- [ ] Verify icon is NOT in MobileBottomNav (removed successfully)

#### Desktop viewport (≥ 640px)
- [ ] Verify icon is 24px (slightly larger)
- [ ] Verify icon has proper spacing with theme toggle
- [ ] Verify icon aligns vertically with other header elements

### 4. Functional Verification
- [ ] Click the language icon in Header (public pages)
- [ ] Verify language switches from Arabic to English (or vice versa)
- [ ] Verify the icon image changes to match the new language
- [ ] Verify the page content updates to the new language
- [ ] Verify the language preference persists after page reload
- [ ] Repeat for DashboardHeader, DashboardSidebar, Footer, AdminDashboard, BranchScanner

### 5. Theme Transition Verification
- [ ] Start in light mode with Arabic selected
- [ ] Switch to dark mode
- [ ] Verify the Arabic icon turns white (via invert)
- [ ] Switch to English
- [ ] Verify the English icon is white in dark mode
- [ ] Switch back to light mode
- [ ] Verify the English icon turns black
- [ ] Verify smooth transitions (no flashing or jarring color changes)

### 6. Cross-Browser Verification
- [ ] Test on Chrome (desktop and mobile)
- [ ] Test on Firefox (desktop and mobile)
- [ ] Test on Safari (desktop and iOS)
- [ ] Test on Edge
- [ ] Verify the `dark:invert` filter works consistently across browsers
- [ ] Verify SVG rendering is consistent

### 7. Accessibility Verification
- [ ] Verify aria-label is present and descriptive
- [ ] Verify keyboard navigation works (Tab to focus, Enter/Space to activate)
- [ ] Verify focus indicator is visible in both light and dark modes
- [ ] Verify screen readers announce the language switcher correctly

### 8. Edge Cases
- [ ] Test with browser zoom at 150%, 200%
- [ ] Verify icons scale correctly and remain crisp (SVG advantage)
- [ ] Test on very small screens (< 375px)
- [ ] Verify icons don't cause layout overflow
- [ ] Test rapid language switching (click multiple times quickly)
- [ ] Verify no visual glitches or state inconsistencies

### 9. Integration Verification
Verify all 6+ instances of LanguageSwitcher use the new icons:
- [ ] Header.jsx (public pages)
- [ ] DashboardHeader.jsx (business dashboard)
- [ ] DashboardSidebar.jsx (desktop sidebar)
- [ ] Footer.jsx (public pages footer)
- [ ] AdminDashboard.jsx (admin panel)
- [ ] BranchScanner.jsx (branch manager portal)
- [ ] Verify each instance adapts to its container's theme
- [ ] Verify each instance uses appropriate sizing for its context

### 10. Performance Verification
- [ ] Check browser Network tab for SVG file requests
- [ ] Verify SVGs are cached after first load (304 Not Modified)
- [ ] Verify no 404 errors for old icon paths (ar.svg, en.svg)
- [ ] Verify page load time is not impacted
- [ ] Verify language switching is instant (no delay loading new icons)

## Common Issues and Solutions

### Issue: Icons appear broken (404)
**Solutions:**
- Verify file paths are correct (`/assets/lang-icons/Lang-icon-English.svg`)
- Verify files exist in `public/assets/lang-icons/` directory
- Clear browser cache and hard reload

### Issue: Icons are black in dark mode (invert not working)
**Solutions:**
- Verify `dark:invert` class is present on `<img>` element
- Verify Tailwind dark mode is configured correctly
- Check browser dev tools to see if the class is applied
- Try the alternative currentColor approach

### Issue: Icons are too small/large
**Solutions:**
- Adjust sizing classes (`w-5 h-5 sm:w-6 sm:h-6`)
- Test on actual devices, not just browser emulation
- Consider using fixed size (`w-6 h-6`) if responsive sizing causes issues

### Issue: Icons don't change when language switches
**Solutions:**
- Verify the conditional rendering uses `baseLang` correctly
- Check browser console for React errors
- Verify i18n.language is updating correctly

### Issue: Touch targets feel too small on mobile
**Solutions:**
- Verify parent button has `min-h-[44px] min-w-[44px]`
- Increase padding on the button if needed
- Test on actual mobile devices with fingers, not mouse clicks

## Sign-off
- [ ] All visual checks passed in both light and dark modes
- [ ] All functional checks passed
- [ ] All responsive checks passed
- [ ] All accessibility checks passed
- [ ] No regressions found
- [ ] Ready for production

---

**Date Tested:** _________________

**Tested By:** _________________

**Browser(s) Tested:** _________________

**Device(s) Tested:** _________________

**Issues Found:** _________________

**Notes:** _________________
