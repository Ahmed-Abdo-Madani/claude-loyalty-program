import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function ContactPage() {
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
          <h1 className="text-5xl font-bold mb-6">Get in Touch</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Have questions about Madna? We're here to help you build the perfect loyalty program for your business.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Send us a message</h2>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select a topic</option>
                    <option value="sales">Sales Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Tell us how we can help you..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Other ways to reach us</h2>

              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">📧</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Email Support</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Get help with your account or technical questions
                    </p>
                    <a href="mailto:support@madna.com" className="text-primary hover:underline">
                      support@madna.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">💼</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Sales Team</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Learn about our enterprise solutions
                    </p>
                    <a href="mailto:sales@madna.com" className="text-primary hover:underline">
                      sales@madna.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">📞</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Phone Support</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Available Monday-Friday, 9am-6pm EST
                    </p>
                    <a href="tel:+1-555-123-4567" className="text-primary hover:underline">
                      +1 (555) 123-4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-primary text-2xl mr-4">💬</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Live Chat</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      Chat with our support team in real-time
                    </p>
                    <button className="text-primary hover:underline">
                      Start Live Chat
                    </button>
                  </div>
                </div>
              </div>

              {/* Office Information */}
              <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Our Office</h3>
                <div className="text-gray-600 dark:text-gray-300">
                  <p>Madna Platform Inc.</p>
                  <p>123 Innovation Drive</p>
                  <p>San Francisco, CA 94105</p>
                  <p>United States</p>
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

export default ContactPage