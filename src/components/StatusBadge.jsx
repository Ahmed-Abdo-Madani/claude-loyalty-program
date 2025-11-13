function StatusBadge({ status, size = 'md' }) {
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-400',
          icon: '🟢'
        }
      case 'inactive':
      case 'paused':
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
          icon: '⏸️'
        }
      case 'out_of_stock':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-400',
          icon: '📦'
        }
      case 'scheduled':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-400',
          icon: '⏰'
        }
      case 'expired':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-400',
          icon: '⏹️'
        }
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
          icon: '⚪'
        }
    }
  }

  const getSizeClasses = (size) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs'
      case 'lg':
        return 'px-3 py-1 text-sm'
      default:
        return 'px-2.5 py-0.5 text-xs'
    }
  }

  const statusConfig = getStatusStyle(status)
  const sizeClasses = getSizeClasses(size)
  const displayText = status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-colors duration-200 ${statusConfig.bg} ${statusConfig.text} ${sizeClasses}`}
    >
      <span className="mr-1">{statusConfig.icon}</span>
      {displayText}
    </span>
  )
}

export default StatusBadge