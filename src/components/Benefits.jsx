function Benefits() {
  const benefits = [
    {
      icon: '🎯',
      title: 'SIMPLE',
      subtitle: '5-min setup',
      description: 'No training needed. Create your first loyalty program in minutes with our intuitive interface.',
    },
    {
      icon: '📱',
      title: 'MOBILE',
      subtitle: 'QR code integration',
      description: 'Customers scan QR codes to join. Instant Apple/Google Wallet cards for seamless experience.',
    },
    {
      icon: '💰',
      title: 'COST EFFECTIVE',
      subtitle: 'No monthly fees',
      description: 'Pay only for what you use. No hidden costs, no setup fees, no long-term contracts.',
    },
    {
      icon: '📈',
      title: 'SCALABLE',
      subtitle: 'Grows with business',
      description: 'Start small and expand. Handle everything from single location to enterprise chains.',
    },
  ]

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container-max section-padding">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Our Platform?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built for businesses that want results without complexity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300"
            >
              <div className="text-5xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {benefit.title}
              </h3>
              <p className="text-primary font-semibold mb-3">
                {benefit.subtitle}
              </p>
              <p className="text-gray-600 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats section */}
        <div className="mt-20 bg-gray-50 rounded-2xl p-8 lg:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">5 min</div>
              <div className="text-gray-600">Average setup time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">85%</div>
              <div className="text-gray-600">Customer retention increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">$0</div>
              <div className="text-gray-600">Monthly fees to start</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Benefits