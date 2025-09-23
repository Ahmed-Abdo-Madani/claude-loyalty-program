import { Link } from 'react-router-dom'

function Hero() {
  return (
    <section className="bg-gradient-to-br from-primary to-blue-700 text-white">
      <div className="container-max section-padding py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
            Build Customer Loyalty
            <br />
            <span className="text-yellow-300">That Actually Works</span>
          </h1>

          <p className="text-xl lg:text-2xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Create custom loyalty programs that keep customers coming back.
            Simple setup, powerful results.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/business/register"
              className="bg-white text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
            >
              Start Free Trial
            </Link>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary">
              📺 Watch Demo
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-12 text-blue-100">
            <div className="flex items-center">
              <span className="text-2xl mr-2">📱</span>
              <span>Mobile-First Design</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              <span>Easy Setup</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">📊</span>
              <span>Track Results</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wave separator */}
      <div className="relative">
        <svg
          className="w-full h-12 text-gray-50"
          viewBox="0 0 1440 74"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 74V0L48 8.85C96 17.7 192 35.4 288 35.4C384 35.4 480 17.7 576 17.7C672 17.7 768 35.4 864 44.25C960 53.1 1056 53.1 1152 44.25C1248 35.4 1344 17.7 1392 8.85L1440 0V74H0Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  )
}

export default Hero