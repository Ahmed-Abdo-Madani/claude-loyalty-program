import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function IntegrationsPage() {
  const integrations = [
    {
      name: 'Shopify',
      description: 'Seamlessly integrate with your Shopify store',
      logo: '🛍️',
      category: 'E-commerce'
    },
    {
      name: 'WooCommerce',
      description: 'Connect with your WordPress WooCommerce site',
      logo: '🛒',
      category: 'E-commerce'
    },
    {
      name: 'Square',
      description: 'Integrate with Square POS systems',
      logo: '⚡',
      category: 'POS'
    },
    {
      name: 'Zapier',
      description: 'Connect with thousands of apps via Zapier',
      logo: '🔗',
      category: 'Automation'
    },
    {
      name: 'Mailchimp',
      description: 'Sync customer data with email campaigns',
      logo: '📧',
      category: 'Email Marketing'
    },
    {
      name: 'Stripe',
      description: 'Process payments and track transactions',
      logo: '💳',
      category: 'Payments'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <SEO title="Integrations - Madna Platform" description="Integrate Madna with your existing tools. Apple Wallet, Google Pay, and more." />
      
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
          <h1 className="text-5xl font-bold mb-6">Powerful Integrations</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Connect Madna with your existing tools and platforms for seamless loyalty program management.
          </p>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {integrations.map((integration, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">{integration.logo}</div>
                <div className="mb-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{integration.category}</span>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{integration.name}</h3>
                <p className="text-gray-600 dark:text-gray-300">{integration.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default IntegrationsPage