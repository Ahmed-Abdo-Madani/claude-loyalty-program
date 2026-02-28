# Landing Page Features Update

## Overview
The user wants to update the features section on the landing page. We need to remove the "Automated Engagement" feature and replace it with four new features: "Live Menu", "Loyalty Program", "Multi-Branch Management", and "Centralized Products". The task includes defining befitting English titles, subtitles, and their corresponding Arabic translations, and then updating both the UI (`LandingPage.jsx`) and the translation files (`en/landing.json` and `ar/landing.json`).

## Project Type
WEB

## Success Criteria
- [ ] "Automated Engagement" is removed from the landing page UI and translation files.
- [ ] Four new features are added to `LandingPage.jsx` with appropriate icons from Heroicons and matching colors.
- [ ] English translations for the new features are added to `src/locales/en/landing.json`.
- [ ] Arabic translations for the new features are added to `src/locales/ar/landing.json`.
- [ ] The Landing Page features grid displays correctly without breaking the layout.

## Tech Stack
- React
- Tailwind CSS
- react-i18next (for translations)
- Heroicons (for feature icons)

## Proposed Content & Translations

### 1. Live Menu (القائمة التفاعلية)
* **Title (EN):** Live Menu
* **Subtitle (EN):** Give your customers a seamless ordering experience with a live, interactive digital menu.
* **Title (AR):** القائمة التفاعلية
* **Subtitle (AR):** امنح عملائك تجربة طلب سلسة من خلال قائمة رقمية تفاعلية ومباشرة.
* **Icon Suggestion:** `DevicePhoneMobileIcon` or `BookOpenIcon`
* **Color Suggestion:** Purple (`bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400`)

### 2. Loyalty Program (برنامج الولاء)
* **Title (EN):** Loyalty Program
* **Subtitle (EN):** Reward your customers and turn them into lifelong fans with custom loyalty points.
* **Title (AR):** برنامج الولاء
* **Subtitle (AR):** كافئ عملائك وحوّلهم إلى محبين دائمين لعلامتك التجارية عبر نقاط الولاء المخصصة.
* **Icon Suggestion:** `GiftIcon` or `HeartIcon`
* **Color Suggestion:** Rose (`bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400`)

### 3. Multi-Branch Management (إدارة الفروع المتعددة)
* **Title (EN):** Multi-Branch Management
* **Subtitle (EN):** Control and monitor all your business locations from a single, unified dashboard.
* **Title (AR):** إدارة الفروع المتعددة
* **Subtitle (AR):** تحكم وراقب جميع فروع عملك من خلال لوحة تحكم واحدة وموحدة.
* **Icon Suggestion:** `BuildingStorefrontIcon` or `MapIcon`
* **Color Suggestion:** Teal (`bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400`)

### 4. Centralized Products (المنتجات المركزية)
* **Title (EN):** Centralized Products
* **Subtitle (EN):** Manage your entire inventory and product catalog centrally across all your branches.
* **Title (AR):** المنتجات المركزية
* **Subtitle (AR):** أدر مخزونك وكتالوج منتجاتك بشكل مركزي لتطبيقه على جميع فروعك في وقت واحد.
* **Icon Suggestion:** `ArchiveBoxIcon` or `Squares2X2Icon`
* **Color Suggestion:** Amber (`bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400`)

## File Structure Map
Files to be modified:
- `src/pages/LandingPage.jsx` (UI updates & new Heroicon imports)
- `src/locales/en/landing.json` (English text updates)
- `src/locales/ar/landing.json` (Arabic text updates)

## Task Breakdown

### Task 1: Update English Translations
- **Agent:** `frontend-specialist`
- **Priority:** P1
- **Dependencies:** None
- **INPUT:** `docs/PLAN-landing-page-features.md`
- **OUTPUT:** Modified `src/locales/en/landing.json`.
- **VERIFY:** Check that `features.liveMenu`, `features.loyaltyProgram`, `features.multiBranch`, and `features.centralizedProducts` exist, and `features.automatedEngagement` is removed.

### Task 2: Update Arabic Translations
- **Agent:** `frontend-specialist`
- **Priority:** P1
- **Dependencies:** None
- **INPUT:** `docs/PLAN-landing-page-features.md`
- **OUTPUT:** Modified `src/locales/ar/landing.json`.
- **VERIFY:** Check that the new Arabic translation keys exist and `features.automatedEngagement` is removed.

### Task 3: Update LandingPage UI Component
- **Agent:** `frontend-specialist`
- **Priority:** P1
- **Dependencies:** Task 1, Task 2
- **INPUT:** `src/pages/LandingPage.jsx`
- **OUTPUT:** Modified `src/pages/LandingPage.jsx` with the new features array and icons imported from `@heroicons/react/24/outline`.
- **VERIFY:** Ensure the component renders without errors and the 9 total features (5 old + 4 new) are displayed in the grid.

## ✅ PHASE X: Verification
- [ ] Lint: Run `npm run lint` to ensure no unused imports.
- [ ] Build/Run: Check UI in browser (`npm run dev`) to ensure visually appealing design and no broken icons or layout issues.
- [ ] Validate translations display correctly in both English and Arabic views.
