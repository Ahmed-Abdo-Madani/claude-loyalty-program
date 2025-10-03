import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function HelpCenterPage() {
  const categories = [
    {
      title: 'Getting Started',
      icon: '🚀',
      articles: [
        'How to set up your first loyalty program',
        'Adding your business information',
        'Configuring rewards and stamps',
        'Inviting team members'
      ]
    },
    {
      title: 'Customer Management',
      icon: '👥',
      articles: [
        'Adding customers to your program',
        'Managing customer profiles',
        'Viewing customer activity',
        'Exporting customer data'
      ]
    },
    {
      title: 'Mobile Wallet',
      icon: '📱',
      articles: [
        'Setting up Apple Wallet integration',
        'Configuring Google Pay passes',
        'Customizing pass design',
        'Troubleshooting wallet issues'
      ]
    },
    {
      title: 'Analytics & Reporting',
      icon: '📊',
      articles: [
        'Understanding your dashboard',
        'Customer engagement metrics',
        'Revenue tracking',
        'Generating reports'
      ]
    }
  ]

  const faqs = [
    {
      question: 'How do I reset my password?',
      answer: 'You can reset your password by clicking the "Forgot Password" link on the login page and following the instructions sent to your email.'
    },
    {
      question: 'Can I customize the appearance of loyalty cards?',
      answer: 'Yes! Professional and Enterprise plans include custom branding options where you can add your logo, colors, and customize the card design.'
    },
    {
      question: 'How do customers redeem their rewards?',
      answer: 'Customers can redeem rewards directly from their mobile wallet or by showing their QR code at your business location.'
    },
    {
      question: 'Is there a limit to the number of customers I can have?',
      answer: 'Limits depend on your plan: Starter (1,000), Professional (10,000), Enterprise (unlimited).'
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
          <h1 className="text-5xl font-bold mb-6">Help Center</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Find answers to your questions and learn how to get the most out of Madna's loyalty platform.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for help articles..."
                className="w-full px-6 py-4 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Browse by Category</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {categories.map((category, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-6">
                  <span className="text-3xl mr-4">{category.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{category.title}</h3>
                </div>
                <ul className="space-y-3">
                  {category.articles.map((article, articleIndex) => (
                    <li key={articleIndex}>
                      <a
                        href="#"
                        className="text-primary hover:underline block py-1"
                      >
                        {article}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{faq.question}</h3>
                <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Still need help?</h2>
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            Our support team is here to help you succeed with your loyalty program.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Email Support</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Get help via email</p>
              <Link
                to="/contact"
                className="text-primary hover:underline"
              >
                Contact Us
              </Link>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Live Chat</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Chat with our team</p>
              <button className="text-primary hover:underline">
                Start Chat
              </button>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Documentation</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Technical guides</p>
              <Link
                to="/api-docs"
                className="text-primary hover:underline"
              >
                View Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default HelpCenterPage