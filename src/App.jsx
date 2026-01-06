import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'

// Pages loaded immediately (landing page and auth - critical for first visit)
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import AdminLoginPage from './pages/AdminLoginPage'
import BranchManagerLogin from './pages/BranchManagerLogin'
import BranchScanner from './pages/BranchScanner'
import BranchPOS from './pages/BranchPOS'
import ManagerProtectedRoute from './components/ManagerProtectedRoute'

// Lazy load heavy components (Dashboard, Admin, etc.)
// These are only loaded when user navigates to them
const Dashboard = lazy(() => import('./pages/Dashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const CustomerSignup = lazy(() => import('./pages/CustomerSignup'))
const MenuPage = lazy(() => import('./pages/MenuPage'))
const TestPage = lazy(() => import('./pages/TestPage'))
const BusinessRegistrationPage = lazy(() => import('./pages/BusinessRegistrationPage'))
const RegistrationSuccessPage = lazy(() => import('./pages/RegistrationSuccessPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage'))
const SuspendedAccountPage = lazy(() => import('./pages/SuspendedAccountPage'))
const SubscriptionPlansPage = lazy(() => import('./pages/SubscriptionPlansPage'))

// Lazy load marketing/info pages
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'))
const DemoDashboard = lazy(() => import('./pages/DemoDashboard'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Critical pages - loaded immediately */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Branch Manager Routes */}
            <Route path="/branch-manager-login" element={<BranchManagerLogin />} />
            <Route
              path="/branch-scanner"
              element={
                <ManagerProtectedRoute>
                  <BranchScanner />
                </ManagerProtectedRoute>
              }
            />
            <Route
              path="/branch-pos"
              element={
                <ManagerProtectedRoute>
                  <BranchPOS />
                </ManagerProtectedRoute>
              }
            />

            {/* Heavy pages - lazy loaded */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/demo" element={<DemoDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/join/:offerId" element={<CustomerSignup />} />
            <Route path="/customer-signup/:offerId" element={<CustomerSignup />} />
            <Route path="/menu/business/:businessId" element={<MenuPage type="business" />} />
            <Route path="/menu/branch/:branchId" element={<MenuPage type="branch" />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/business/register" element={<BusinessRegistrationPage />} />
            <Route path="/registration-success" element={<RegistrationSuccessPage />} />
            <Route path="/subscription/checkout" element={<CheckoutPage />} />
            <Route path="/subscription/payment-callback" element={<PaymentCallbackPage />} />
            <Route path="/subscription/suspended" element={<SuspendedAccountPage />} />
            <Route path="/subscription/plans" element={<SubscriptionPlansPage />} />

            {/* Marketing pages - lazy loaded */}
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
          </Routes>
        </Suspense>
      </div>
    </ThemeProvider>
  )
}

export default App