function StatsCardGrid({ analytics }) {
  // Map existing analytics data to design stats
  const statsCards = [
    {
      id: 'total_customers',
      title: 'Total Customers',
      value: analytics?.totalCustomers || 0,
      icon: '👥',
      color: 'bg-blue-500',
      highlight: false
    },
    {
      id: 'active_members',
      title: 'Active Members',
      value: analytics?.cardsIssued || 0, // Using cardsIssued as active members
      icon: '✅',
      color: 'bg-primary',
      highlight: true // This card has the purple highlight in the design
    },
    {
      id: 'points_redeemed',
      title: 'Points Redeemed',
      value: analytics?.rewardsRedeemed || 0,
      icon: '💎',
      color: 'bg-purple-500',
      highlight: false
    },
    {
      id: 'revenue_impact',
      title: 'Revenue Impact',
      value: `$${(analytics?.totalCustomers * 12.5).toLocaleString() || '0'}`, // Estimated revenue
      icon: '💰',
      color: 'bg-green-500',
      highlight: false
    }
  ]

  return (
    <div className="mb-8">
      {/* Mobile: Horizontal scrolling layout */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
          {statsCards.map((stat) => (
            <div
              key={stat.id}
              className={`
                relative p-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl
                flex-none w-auto min-w-[160px] max-w-[240px] snap-start
                ${stat.highlight
                  ? 'bg-gradient-to-br from-primary to-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }
              `}
            >
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center mb-3
                ${stat.highlight
                  ? 'bg-white/20'
                  : `${stat.color} text-white`
                }
              `}>
                <span className="text-xl">{stat.icon}</span>
              </div>

              {/* Content */}
              <div>
                <h3 className={`
                  text-sm font-medium mb-1
                  ${stat.highlight
                    ? 'text-white/80'
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}>
                  {stat.title}
                </h3>
                <p className={`
                  text-2xl font-bold
                  ${stat.highlight
                    ? 'text-white'
                    : 'text-gray-900 dark:text-white'
                  }
                `}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
              </div>

              {/* Highlight border for active card */}
              {stat.highlight && (
                <div className="absolute inset-0 rounded-xl border-2 border-white/30"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tablet and Desktop: Grid layout */}
      <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <div
            key={stat.id}
            className={`
              relative p-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl
              ${stat.highlight
                ? 'bg-gradient-to-br from-primary to-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }
            `}
          >
            {/* Icon */}
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center mb-4
              ${stat.highlight
                ? 'bg-white/20'
                : `${stat.color} text-white`
              }
            `}>
              <span className="text-2xl">{stat.icon}</span>
            </div>

            {/* Content */}
            <div>
              <h3 className={`
                text-sm font-medium mb-2
                ${stat.highlight
                  ? 'text-white/80'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}>
                {stat.title}
              </h3>
              <p className={`
                text-3xl font-bold
                ${stat.highlight
                  ? 'text-white'
                  : 'text-gray-900 dark:text-white'
                }
              `}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </p>
            </div>

            {/* Highlight border for active card */}
            {stat.highlight && (
              <div className="absolute inset-0 rounded-xl border-2 border-white/30"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsCardGrid