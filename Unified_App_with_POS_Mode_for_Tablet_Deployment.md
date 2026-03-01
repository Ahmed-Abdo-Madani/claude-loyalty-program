# Phase Breakdown

## Task 1: Integrate Capacitor for iOS & Android Packaging

Add Capacitor to the existing Vite + React project to enable iOS & Android app store packaging:

- Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` as dependencies in `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\package.json`
- Initialize Capacitor config (`capacitor.config.ts`) pointing `webDir` to `dist` (Vite build output)
- Update `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\vite.config.js` build settings if needed for Capacitor compatibility
- Add `cap:build` and `cap:sync` scripts to `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\package.json` scripts section
- Create `capacitor.config.ts` with app ID, app name, and server URL configuration for both dev and production


## Task 2: Replace Web APIs with Capacitor Native Plugins (Camera & Barcode)

Replace browser-only APIs with Capacitor native equivalents for camera and barcode scanning used in `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\pages\BranchScanner.jsx`:

- Install `@capacitor/camera` and `@capacitor-community/barcode-scanner` plugins
- Add platform detection utility (web vs native) to conditionally use `barcode-detector` (web) or the native Capacitor barcode plugin (iOS/Android)
- Update `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\pages\BranchScanner.jsx` to use the platform-aware scanner abstraction
- Ensure `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\pages\BranchPOS.jsx` camera/image features (if any) also use the native plugin on mobile


## Task 3: Optimize POS UI for Tablet Screen Sizes

Optimize the POS interface in `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\pages\BranchPOS.jsx` and its sub-components for tablet form factors (iPad, Android tablets):

- Review and improve the split-screen layout (`lg:flex-row`, `lg:w-3/5`, `lg:w-2/5`) for common tablet resolutions (768px–1024px)
- Increase touch target sizes on `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\components\pos\POSCart.jsx`, `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\components\pos\ProductGrid.jsx`, and `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\components\pos\CheckoutModal.jsx` (minimum 44×44px per Apple HIG)
- Add a tablet-specific breakpoint in `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\tailwind.config.js` if needed (e.g., `tablet: '768px'`)
- Prevent the mobile "bottom sheet" cart layout from triggering on landscape tablets (currently `h-[45vh]` on non-lg screens)


## Task 4: Harden POS Auth Session for Native App (Persistent Login)

Improve branch manager session persistence for the native tablet app context in `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\utils\secureAuth.js`:

- Replace `localStorage` manager auth storage (`managerAuthenticated`, `managerToken`, `managerBranchId`, `managerBranchName`) with `@capacitor/preferences` (Capacitor's secure key-value store) on native, falling back to `localStorage` on web
- Add session expiry logic to `isManagerAuthenticated()` — currently there is no token expiry check, which is a security risk on a shared POS tablet
- Update `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\components\ManagerProtectedRoute.jsx` to handle async auth check from the Capacitor Preferences plugin
- Add an auto-lock timeout (e.g., 8 hours of inactivity) that redirects to `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\pages\BranchManagerLogin.jsx`


## Task 5: Add App Store Assets & Native Configuration

Prepare the native app shell for App Store and Google Play submission:

- Add app icons (1024×1024 for iOS, 512×512 for Android) and splash screens using `@capacitor/assets` CLI tool
- Configure `Info.plist` (iOS) permissions for camera (`NSCameraUsageDescription`) and `AndroidManifest.xml` for camera + internet permissions
- Update `capacitor.config.ts` with production API base URL (currently configured in `c:\Users\Design_Bench_12\Documents\claude-loyalty-program\src\config\api.js`) so the native app points to the live backend
- Add public/manifest.json (PWA manifest) updates for app name, theme color, and display mode to align with native branding