function QuickActions({ onNewOffer, onScanQR, onViewReports }) {
  const actions = [
    {
      id: 'new_offer',
      label: 'New Offer',
      icon: '🎁',
      action: onNewOffer,
      description: 'Create a new loyalty offer'
    },
    {
      id: 'scan_qr',
      label: 'Scan QR',
      icon: '📱',
      action: onScanQR,
      description: 'Scan customer QR codes'
    },
    {
      id: 'view_reports',
      label: 'View Reports',
      icon: '📊',
      action: onViewReports,
      description: 'View analytics and reports'
    }
  ]

  return (
    <div className="bg-gradient-to-br from-primary to-purple-600 dark:from-purple-900 dark:to-indigo-900 rounded-xl p-4 sm:p-6 text-white">
      <h3 className="text-lg font-semibold mb-4 sm:mb-6">Quick Actions</h3>

      <div className="space-y-3 sm:space-y-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className="w-full flex items-center space-x-3 p-4 sm:p-5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all duration-200 text-left group touch-manipulation min-h-[44px]"
            title={action.description}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors duration-200">
              <span className="text-xl sm:text-2xl">{action.icon}</span>
            </div>
            <div className="flex-1">
              <span className="font-medium text-white group-hover:text-white/90">
                {action.label}
              </span>
            </div>
            <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats at bottom */}
      <div className="mt-4 sm:mt-6 pt-4 border-t border-white/20">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">Quick Access</span>
          <span className="text-white/70">3 Actions</span>
        </div>
      </div>
    </div>
  )
}

export default QuickActions