import {
  CheckCircleIcon,
  PauseCircleIcon,
  XCircleIcon,
  ClockIcon,
  StopCircleIcon
} from '@heroicons/react/24/outline'

function StatusBadge({ status, size = 'md' }) {
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-400',
          Icon: CheckCircleIcon
        }
      case 'inactive':
      case 'paused':
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
          Icon: PauseCircleIcon
        }
      case 'out_of_stock':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-400',
          Icon: XCircleIcon
        }
      case 'scheduled':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-400',
          Icon: ClockIcon
        }
      case 'expired':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-400',
          Icon: StopCircleIcon
        }
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
          Icon: PauseCircleIcon
        }
    }
  }

  const getSizeClasses = (size) => {
    switch (size) {
      case 'sm':
        return { container: 'px-2 py-0.5 text-xs', icon: 'w-3 h-3' }
      case 'lg':
        return { container: 'px-3 py-1 text-sm', icon: 'w-4 h-4' }
      default:
        return { container: 'px-2.5 py-0.5 text-xs', icon: 'w-3.5 h-3.5' }
    }
  }

  const statusConfig = getStatusStyle(status)
  const sizeClasses = getSizeClasses(size)
  const displayText = status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
  const StatusIcon = statusConfig.Icon

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-colors duration-200 ${statusConfig.bg} ${statusConfig.text} ${sizeClasses.container}`}
    >
      <StatusIcon className={`mr-1 ${sizeClasses.icon}`} />
      {displayText}
    </span>
  )
}

export default StatusBadge