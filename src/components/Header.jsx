import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="container-max section-padding">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-primary">
              🎯 Loyalty Platform
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#support" className="text-gray-600 hover:text-primary transition-colors">
              Support
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              to="/auth?mode=signin"
              className="text-primary hover:text-blue-600 font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/business/register"
              className="btn-primary"
            >
              Register Business
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header