import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import CustomerSignup from './pages/CustomerSignup'
import AuthPage from './pages/AuthPage'
import TestPage from './pages/TestPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboard from './pages/AdminDashboard'
import BusinessRegistrationPage from './pages/BusinessRegistrationPage'
import RegistrationSuccessPage from './pages/RegistrationSuccessPage'
import FeaturesPage from './pages/FeaturesPage'
import PricingPage from './pages/PricingPage'
import IntegrationsPage from './pages/IntegrationsPage'
import ApiDocsPage from './pages/ApiDocsPage'
import HelpCenterPage from './pages/HelpCenterPage'
import ContactPage from './pages/ContactPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/join/:offerId" element={<CustomerSignup />} />
          <Route path="/customer-signup/:offerId" element={<CustomerSignup />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/business/register" element={<BusinessRegistrationPage />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/api-docs" element={<ApiDocsPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
        </Routes>
      </div>
    </ThemeProvider>
  )
}

export default App