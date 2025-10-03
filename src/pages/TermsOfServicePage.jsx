import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function TermsOfServicePage() {
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Terms of Service</h1>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            Last updated: December 1, 2024
          </div>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By accessing and using Madna Platform ("the Service"), you accept and agree to be bound by the terms and
                provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. Description of Service</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Madna Platform provides loyalty program management services including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li>Customer loyalty program creation and management</li>
                <li>Mobile wallet integration (Apple Wallet, Google Pay)</li>
                <li>Analytics and reporting tools</li>
                <li>API access for third-party integrations</li>
                <li>Customer support and technical assistance</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. User Accounts</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To access certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. Acceptable Use</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Distribute malicious software or code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service for fraudulent purposes</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Payment Terms</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                For paid subscriptions:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li>Fees are billed in advance on a monthly or annual basis</li>
                <li>All payments are non-refundable except as required by law</li>
                <li>You authorize us to charge your payment method automatically</li>
                <li>We may suspend service for non-payment</li>
                <li>Price changes will be communicated 30 days in advance</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. Data and Privacy</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your privacy is important to us. Our collection and use of personal information is governed by our
                Privacy Policy, which is incorporated into these Terms by reference. You are responsible for ensuring
                you have appropriate consent from your customers for data collection and processing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Intellectual Property</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The Service and its original content, features, and functionality are owned by Madna Platform and are
                protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                You retain ownership of content you submit to the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">8. Service Availability</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We strive to maintain high service availability but cannot guarantee uninterrupted access. We may:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li>Perform scheduled maintenance with advance notice</li>
                <li>Experience unexpected downtime due to technical issues</li>
                <li>Modify or discontinue features with reasonable notice</li>
                <li>Suspend service for security or legal reasons</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">9. Limitation of Liability</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To the fullest extent permitted by law, Madna Platform shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly
                or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">10. Indemnification</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You agree to indemnify and hold harmless Madna Platform from any claims, losses, damages, liabilities,
                and expenses arising from your use of the Service, violation of these Terms, or infringement of any
                third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">11. Termination</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Either party may terminate this agreement at any time. Upon termination:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li>Your access to the Service will cease immediately</li>
                <li>You remain liable for any outstanding fees</li>
                <li>We may delete your data after a reasonable retention period</li>
                <li>Provisions that should survive termination will continue to apply</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">12. Governing Law</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the State of California,
                without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of
                San Francisco, California.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">13. Changes to Terms</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We reserve the right to modify these Terms at any time. We will provide notice of material changes
                at least 30 days in advance. Your continued use of the Service after changes take effect constitutes
                acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">14. Contact Information</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-300">
                  Email: <a href="mailto:legal@madna.com" className="text-primary hover:underline">legal@madna.com</a><br />
                  Address: Madna Platform Inc., 123 Innovation Drive, San Francisco, CA 94105<br />
                  Phone: <a href="tel:+1-555-123-4567" className="text-primary hover:underline">+1 (555) 123-4567</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default TermsOfServicePage