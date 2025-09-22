function HowItWorks() {
  const steps = [
    {
      number: '1',
      emoji: '✍️',
      title: 'Create Account',
      description: 'Sign up in 60 seconds with just your business details. No credit card required.',
    },
    {
      number: '2',
      emoji: '🎨',
      title: 'Design Loyalty Offer',
      description: 'Choose rewards & requirements. Stamp cards, points, or discounts - whatever works for you.',
    },
    {
      number: '3',
      emoji: '📱',
      title: 'Generate QR Code',
      description: 'Get a unique QR code to print or display. Customers scan to join instantly.',
    },
    {
      number: '4',
      emoji: '🎉',
      title: 'Customers Join',
      description: 'Instant mobile wallet cards track progress. No apps to download, works everywhere.',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="container-max section-padding">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From setup to first customer in under 10 minutes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step number */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {step.number}
                </div>
              </div>

              {/* Connecting line (hidden on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-1/2 w-full h-0.5 bg-gray-300 transform translate-x-6"></div>
              )}

              {/* Content */}
              <div className="text-center">
                <div className="text-4xl mb-4">{step.emoji}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Demo preview */}
        <div className="mt-16 bg-white rounded-2xl p-8 lg:p-12 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                See it in action
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Customer scans QR code</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Fills simple form (30 seconds)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Gets loyalty card in wallet</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Starts earning rewards immediately</span>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Mock phone display */}
              <div className="bg-gray-900 rounded-3xl p-2 mx-auto max-w-sm">
                <div className="bg-white rounded-2xl p-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 mb-2">🍕 Joe's Pizza</div>
                    <div className="text-sm text-gray-600 mb-4">Buy 10, Get 1 FREE</div>
                    <div className="flex justify-center space-x-1 mb-4">
                      <span className="text-2xl">⭐</span>
                      <span className="text-2xl">⭐</span>
                      <span className="text-2xl">⭐</span>
                      <span className="text-2xl text-gray-300">⭐</span>
                      <span className="text-2xl text-gray-300">⭐</span>
                    </div>
                    <div className="text-sm text-gray-600">3 of 10 stamps</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks