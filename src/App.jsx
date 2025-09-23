import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import CustomerSignup from './pages/CustomerSignup'
import AuthPage from './pages/AuthPage'
import TestPage from './pages/TestPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboard from './pages/AdminDashboard'
import BusinessRegistrationPage from './pages/BusinessRegistrationPage'
import RegistrationSuccessPage from './pages/RegistrationSuccessPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/join/:offerId" element={<CustomerSignup />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/business/register" element={<BusinessRegistrationPage />} />
        <Route path="/registration-success" element={<RegistrationSuccessPage />} />
      </Routes>
    </div>
  )
}

export default App