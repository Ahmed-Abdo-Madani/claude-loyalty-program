import { Link } from 'react-router-dom'

function TestPage() {
  const testRoutes = [
    {
      title: 'Landing Page',
      path: '/',
      description: 'Main marketing page with hero, benefits, and CTA sections',
      icon: '🏠'
    },
    {
      title: 'Business Sign In',
      path: '/auth?mode=signin',
      description: 'Business owner authentication (use demo credentials)',
      icon: '🔐',
      credentials: {
        email: 'demo@business.com',
        password: 'demo123'
      }
    },
    {
      title: 'Business Sign Up',
      path: '/auth?mode=signup',
      description: 'New business registration flow',
      icon: '✍️'
    },
    {
      title: 'Business Dashboard',
      path: '/dashboard',
      description: 'Business owner control panel (requires authentication)',
      icon: '📊'
    },
    {
      title: 'Customer Signup - Pizza',
      path: '/join/pizza123',
      description: 'Customer enrollment for pizza loyalty program',
      icon: '🍕'
    },
    {
      title: 'Customer Signup - Coffee',
      path: '/join/coffee456',
      description: 'Customer enrollment for coffee loyalty program',
      icon: '☕'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧪 Platform Test Suite
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Test all features and pages of the loyalty program platform
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">
            🔑 Demo Credentials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-blue-700">Business Owner Login</h3>
              <div className="text-sm text-blue-600 mt-1">
                <div>📧 Email: <code className="bg-blue-100 px-2 py-1 rounded">demo@business.com</code></div>
                <div>🔒 Password: <code className="bg-blue-100 px-2 py-1 rounded">demo123</code></div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-blue-700">Customer Signup</h3>
              <div className="text-sm text-blue-600 mt-1">
                <div>📱 Use any name/phone to test</div>
                <div>✨ Instant wallet card creation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Routes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testRoutes.map((route, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">{route.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {route.title}
                  </h3>
                </div>

                <p className="text-gray-600 mb-4">
                  {route.description}
                </p>

                {route.credentials && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="text-sm text-gray-600">
                      <div>📧 {route.credentials.email}</div>
                      <div>🔒 {route.credentials.password}</div>
                    </div>
                  </div>
                )}

                <Link
                  to={route.path}
                  className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Test Page →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Status */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            🎯 Feature Implementation Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-800">✅ Completed Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Landing page with responsive design
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Authentication flow with test credentials
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Business dashboard with tabs
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Customer signup flow
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Mobile wallet card UI
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Scalability documentation
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-800">🔄 Pending Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  QR code generation
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  Apple Wallet integration
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  Google Wallet integration
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  Backend API development
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  Database integration
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <div className="space-x-4">
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🏠 Back to Home
            </Link>
            <Link
              to="/auth?mode=signin"
              className="inline-flex items-center px-6 py-3 bg-secondary text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              🚀 Start Testing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestPage