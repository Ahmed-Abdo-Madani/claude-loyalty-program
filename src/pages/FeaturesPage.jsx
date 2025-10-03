import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function FeaturesPage() {
  const features = [
    {
      icon: '🎯',
      title: 'Smart Targeting',
      description: 'Create targeted campaigns based on customer behavior, purchase history, and preferences.'
    },
    {
      icon: '📱',
      title: 'Mobile Wallet Integration',
      description: 'Seamless integration with Apple Wallet and Google Pay for easy customer access.'
    },
    {
      icon: '📊',
      title: 'Real-time Analytics',
      description: 'Monitor program performance with comprehensive analytics and reporting tools.'
    },
    {
      icon: '🔄',
      title: 'Automated Campaigns',
      description: 'Set up automated reward notifications and engagement campaigns.'
    },
    {
      icon: '💳',
      title: 'Multiple Reward Types',
      description: 'Support for stamps, points, cashback, and custom reward structures.'
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'Bank-level security with encrypted data and secure authentication.'
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
              <img
                src="/assets/images/madna-logo.svg"
                alt="Madna Logo"
                className="w-8 h-8 mr-3"
              />
              <span className="text-2xl font-bold text-primary">Madna</span>
            </Link>
            <nav className="flex space-x-8">
              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-primary">Home</Link>
              <Link to="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary">Pricing</Link>
              <Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-primary">Contact</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">Powerful Features for Modern Loyalty</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Everything you need to create, manage, and optimize customer loyalty programs that drive real business results.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Ready to get started?</h2>
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            Join thousands of businesses already using Madna to build customer loyalty.
          </p>
          <Link
            to="/business/register"
            className="bg-primary hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default FeaturesPage