import React from 'react'
import { PhotoIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

function ImagePlaceholder({
    type = 'empty', // 'loading' | 'error' | 'empty'
    size = 'md',    // 'sm' | 'md' | 'lg'
    className = '',
    onRetry
}) {
    // Size mappings for icon sizing
    const iconSizes = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16'
    }

    // Text size mappings
    const textSizes = {
        sm: 'text-[10px]',
        md: 'text-xs',
        lg: 'text-sm'
    }

    if (type === 'loading') {
        return (
            <div className={`w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse flex items-center justify-center ${className}`}>
                <PhotoIcon className={`${iconSizes[size]} text-gray-300 dark:text-gray-700`} />
            </div>
        )
    }

    if (type === 'error') {
        return (
            <div className={`w-full h-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-400 gap-2 p-4 ${className}`}>
                <ExclamationCircleIcon className={`${iconSizes[size]} text-gray-400`} />
                <span className={`${textSizes[size]} text-center`}>
                    Failed to load
                </span>
                {onRetry && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onRetry()
                        }}
                        className="text-[10px] text-primary hover:underline mt-1"
                    >
                        Retry
                    </button>
                )}
            </div>
        )
    }

    // Empty state
    return (
        <div className={`w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50 dark:bg-gray-900 ${className}`}>
            <span className="text-3xl sm:text-4xl">🍽️</span>
            <span className={`${textSizes[size] || 'text-[10px] sm:text-xs'}`}>No image</span>
        </div>
    )
}

export default ImagePlaceholder
