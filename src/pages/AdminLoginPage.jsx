import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../config/api'

function AdminLoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Demo credentials for admin
  const demoCredentials = {
    email: 'admin@loyaltyplatform.com',
    password: 'admin123'
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${endpoints.baseURL}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (data.success) {
        // Store admin authentication data
        localStorage.setItem('adminAuthenticated', 'true')
        localStorage.setItem('adminAccessToken', data.data.access_token)
        localStorage.setItem('adminSessionToken', data.data.session_token)
        localStorage.setItem('adminInfo', JSON.stringify(data.data.admin))

        console.log('✅ Admin login successful')
        navigate('/admin/dashboard')
      } else {
        setError(data.message || 'Login failed')
      }

    } catch (error) {
      console.error('Admin login error:', error)
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setFormData({
      email: demoCredentials.email,
      password: demoCredentials.password
    })
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">👑</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Platform Admin
          </h2>
          <p className="text-purple-200">
            Sign in to manage the loyalty platform
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-purple-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Admin Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="Enter your admin email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Demo Credentials Button */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-medium">Demo Access</p>
                  <p className="text-xs text-blue-600">Use demo admin credentials</p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Fill Demo
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in to Admin Panel'
                )}
              </button>
            </div>
          </form>

          {/* Additional Info */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Admin Features</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="flex items-center">
                <span className="text-purple-500 mr-1">📊</span>
                Platform Analytics
              </div>
              <div className="flex items-center">
                <span className="text-purple-500 mr-1">🏢</span>
                Business Management
              </div>
              <div className="flex items-center">
                <span className="text-purple-500 mr-1">⚙️</span>
                System Settings
              </div>
              <div className="flex items-center">
                <span className="text-purple-500 mr-1">🎯</span>
                User Support
              </div>
            </div>
          </div>

          {/* Back to Main Site */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              ← Back to main site
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-purple-200 text-sm">
          Loyalty Platform Admin Panel v1.0
        </p>
      </div>
    </div>
  )
}

export default AdminLoginPage