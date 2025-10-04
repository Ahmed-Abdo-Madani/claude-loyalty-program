import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'

// Pages loaded immediately (landing page and auth - critical for first visit)
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import AdminLoginPage from './pages/AdminLoginPage'

// Lazy load heavy components (Dashboard, Admin, etc.)
// These are only loaded when user navigates to them
const Dashboard = lazy(() => import('./pages/Dashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const CustomerSignup = lazy(() => import('./pages/CustomerSignup'))
const TestPage = lazy(() => import('./pages/TestPage'))
const BusinessRegistrationPage = lazy(() => import('./pages/BusinessRegistrationPage'))
const RegistrationSuccessPage = lazy(() => import('./pages/RegistrationSuccessPage'))

// Lazy load marketing/info pages
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'))
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'))
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))

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

            {/* Heavy pages - lazy loaded */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/join/:offerId" element={<CustomerSignup />} />
            <Route path="/customer-signup/:offerId" element={<CustomerSignup />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/business/register" element={<BusinessRegistrationPage />} />
            <Route path="/registration-success" element={<RegistrationSuccessPage />} />

            {/* Marketing pages - lazy loaded */}
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
          </Routes>
        </Suspense>
      </div>
    </ThemeProvider>
  )
}

export default App