/**
 * MiniStatCard - Reusable compact stat card component
 * 
 * A small, color-coded stat card with gradient background and left border accent.
 * Used in StatsCardGrid and CompactStatsBar for consistent stat visualization.
 * 
 * @param {string} icon - Emoji icon to display
 * @param {string} label - Stat label/title
 * @param {number|string} value - Stat value to display
 * @param {string} bgGradient - Gradient background classes
 * @param {string} border - Border accent classes
 * @param {string} iconBg - Icon container background classes
 * @param {string} valueColor - Value text color classes
 * @param {string} labelColor - Label text color classes
 * @param {string} variant - Size variant: 'default' or 'compact'
 * @param {string} className - Additional CSS classes
 */
function MiniStatCard({
  icon,
  label,
  value,
  bgGradient,
  border,
  iconBg,
  valueColor,
  labelColor,
  variant = 'default',
  className = ''
}) {
  // Variant-based sizing
  const isCompact = variant === 'compact'
  const padding = isCompact ? 'p-1.5' : 'p-2'
  const iconSize = isCompact ? 'w-6 h-6' : 'w-8 h-8'
  const iconTextSize = isCompact ? 'text-sm' : 'text-base'
  const valueTextSize = isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'

  return (
    <div
      className={`flex flex-col gap-1.5 ${padding} rounded-lg transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${bgGradient} ${border} ${className}`}
    >
      {/* Icon Container */}
      <div className={`${iconSize} rounded-lg ${iconBg} flex items-center justify-center`}>
        <span className={iconTextSize}>{icon}</span>
      </div>

      {/* Value and Label */}
      <div className="flex flex-col">
        <div className={`${valueTextSize} font-bold ${valueColor}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className={`text-xs font-medium ${labelColor}`}>
          {label}
        </div>
      </div>
    </div>
  )
}

export default MiniStatCard
