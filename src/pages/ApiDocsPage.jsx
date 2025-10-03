import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function ApiDocsPage() {
  const endpoints = [
    {
      method: 'POST',
      path: '/api/customers',
      description: 'Create a new customer',
      parameters: ['name', 'email', 'phone']
    },
    {
      method: 'GET',
      path: '/api/customers/:id',
      description: 'Get customer details',
      parameters: ['id (path parameter)']
    },
    {
      method: 'POST',
      path: '/api/loyalty/stamp',
      description: 'Add stamp to customer card',
      parameters: ['customerId', 'businessId']
    },
    {
      method: 'GET',
      path: '/api/loyalty/:customerId/cards',
      description: 'Get customer loyalty cards',
      parameters: ['customerId (path parameter)']
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <DarkModeToggle />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="flex items-center">
              <img src="/assets/images/madna-logo.svg" alt="Madna Logo" className="w-8 h-8 mr-3" />
              <span className="text-2xl font-bold text-primary">Madna</span>
            </Link>
            <nav className="flex space-x-8">
              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-primary">Home</Link>
              <Link to="/features" className="text-gray-600 dark:text-gray-300 hover:text-primary">Features</Link>
              <Link to="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary">Pricing</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">API Documentation</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Integrate Madna's powerful loyalty platform into your applications with our comprehensive REST API.
          </p>
        </div>
      </section>

      {/* Documentation Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Getting Started */}
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Getting Started</h2>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Authentication</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  All API requests require authentication using an API key. Include your API key in the Authorization header:
                </p>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <code className="text-sm text-gray-800 dark:text-gray-200">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Base URL</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  All API endpoints are relative to the base URL:
                </p>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <code className="text-sm text-gray-800 dark:text-gray-200">
                    https://api.madna.com/v1
                  </code>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">API Endpoints</h3>
              <div className="space-y-6">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold mr-3 ${
                        endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-gray-800 dark:text-gray-200 font-mono">{endpoint.path}</code>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-3">{endpoint.description}</p>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Parameters:</h4>
                      <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                        {endpoint.parameters.map((param, paramIndex) => (
                          <li key={paramIndex}>{param}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg sticky top-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Links</h3>
                <ul className="space-y-2">
                  <li><a href="#authentication" className="text-primary hover:underline">Authentication</a></li>
                  <li><a href="#customers" className="text-primary hover:underline">Customer API</a></li>
                  <li><a href="#loyalty" className="text-primary hover:underline">Loyalty API</a></li>
                  <li><a href="#webhooks" className="text-primary hover:underline">Webhooks</a></li>
                  <li><a href="#errors" className="text-primary hover:underline">Error Handling</a></li>
                </ul>

                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Need Help?</h4>
                  <Link
                    to="/contact"
                    className="text-primary hover:underline block mb-2"
                  >
                    Contact Support
                  </Link>
                  <a
                    href="https://github.com/madna/api-examples"
                    className="text-primary hover:underline block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Code Examples
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default ApiDocsPage