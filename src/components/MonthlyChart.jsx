function MonthlyChart({ analytics }) {
  // Generate sample monthly data based on existing analytics
  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const baseValue = analytics?.totalCustomers || 100

    return months.map((month, index) => ({
      month,
      value: Math.max(0, baseValue * (0.6 + (index * 0.15) + Math.random() * 0.3)),
      growth: index > 0 ? Math.random() > 0.3 : true // Mostly positive growth
    }))
  }

  const monthlyData = generateMonthlyData()
  const maxValue = Math.max(...monthlyData.map(d => d.value))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Performance</h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Customer Activity</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative">
        {/* Chart Grid */}
        <div className="flex items-end justify-between h-48 space-x-2">
          {monthlyData.map((data, index) => {
            const height = (data.value / maxValue) * 100
            return (
              <div key={data.month} className="flex-1 flex flex-col items-center">
                {/* Bar */}
                <div className="w-full max-w-12 flex items-end justify-center mb-2">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      data.growth
                        ? 'bg-gradient-to-t from-primary to-blue-400'
                        : 'bg-gradient-to-t from-gray-400 to-gray-300'
                    }`}
                    style={{ height: `${height}%` }}
                  >
                    {/* Value on hover */}
                    <div className="opacity-0 hover:opacity-100 transition-opacity duration-200 p-1">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {Math.round(data.value).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Month Label */}
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {data.month}
                </span>
              </div>
            )
          })}
        </div>

        {/* Chart Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(monthlyData[monthlyData.length - 1]?.value || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">This Month</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                +{((monthlyData[monthlyData.length - 1]?.value / monthlyData[0]?.value - 1) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Growth</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">
                {Math.round(monthlyData.reduce((sum, d) => sum + d.value, 0) / monthlyData.length).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthlyChart