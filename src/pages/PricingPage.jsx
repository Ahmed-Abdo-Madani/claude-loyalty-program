import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for small businesses getting started',
      features: [
        'Up to 1,000 customers',
        'Basic loyalty programs',
        'Mobile wallet integration',
        'Email support',
        'Basic analytics'
      ],
      popular: false
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'Ideal for growing businesses',
      features: [
        'Up to 10,000 customers',
        'Advanced loyalty programs',
        'Mobile wallet integration',
        'Priority support',
        'Advanced analytics',
        'Custom branding',
        'API access'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with specific needs',
      features: [
        'Unlimited customers',
        'Custom loyalty solutions',
        'White-label options',
        '24/7 dedicated support',
        'Advanced integrations',
        'Custom analytics',
        'SLA guarantees'
      ],
      popular: false
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
              <Link to="/features" className="text-gray-600 dark:text-gray-300 hover:text-primary">Features</Link>
              <Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-primary">Contact</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">Simple, Transparent Pricing</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your business. All plans include core loyalty features and mobile wallet integration.
          </p>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div key={index} className={`bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg relative ${plan.popular ? 'border-2 border-primary' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold">Most Popular</span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-primary">{plan.price}</span>
                    <span className="text-gray-600 dark:text-gray-300">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/business/register"
                  className={`w-full block text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-primary hover:bg-blue-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Can I change plans anytime?</h3>
              <p className="text-gray-600 dark:text-gray-300">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Is there a free trial?</h3>
              <p className="text-gray-600 dark:text-gray-300">All plans come with a 14-day free trial. No credit card required to get started.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">What payment methods do you accept?</h3>
              <p className="text-gray-600 dark:text-gray-300">We accept all major credit cards and PayPal. Enterprise customers can pay via bank transfer.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default PricingPage