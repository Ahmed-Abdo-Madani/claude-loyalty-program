function WalletCard({ title, value, subtitle, icon, color, trend, onClick, children }) {
  const getColorClasses = (color) => {
    switch (color) {
      case 'primary':
        return 'bg-gradient-to-br from-primary to-blue-600 text-white'
      case 'green':
        return 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
      case 'blue':
        return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
      case 'purple':
        return 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
      case 'orange':
        return 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
      default:
        return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
    }
  }

  const getTrendIcon = (trend) => {
    if (!trend) return null
    if (trend > 0) return '📈'
    if (trend < 0) return '📉'
    return '➖'
  }

  const getTrendColor = (trend) => {
    if (!trend) return ''
    if (trend > 0) return 'text-green-400'
    if (trend < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <div
      className={`
        rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
        ${getColorClasses(color)}
        ${onClick ? 'hover:scale-105' : ''}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl md:text-2xl">{icon}</span>}
          <h3 className={`font-medium text-xs md:text-sm ${color && color !== 'default' ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
            {title}
          </h3>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs md:text-sm ${getTrendColor(trend)}`}>
            <span>{getTrendIcon(trend)}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <div className={`text-2xl md:text-3xl font-bold ${color && color !== 'default' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </div>
        {subtitle && (
          <div className={`text-xs md:text-sm ${color && color !== 'default' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Additional Content */}
      {children}
    </div>
  )
}

export default WalletCard
