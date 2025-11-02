/**
 * CollapsibleSection Component
 * Reusable collapsible section for card designer
 * Phase 4 - Mobile Optimization
 */

import { useTranslation } from 'react-i18next'

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  required = false, // Changed from badge string to boolean
  optional = false, // Explicit optional prop
  sectionId = null, // NEW: Explicit section ID for navigation
  completed = false
}) {
  const { t } = useTranslation('cardDesign')
  
  // Generate stable ID from sectionId prop or fallback to title-based ID
  const contentId = sectionId ? `section-${sectionId}` : `section-${title.replace(/\s+/g, '-').toLowerCase()}`
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-h-[60px] sm:min-h-[44px]"
        aria-expanded={isOpen}
        aria-controls={contentId}
        type="button"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          {icon && (
            <span className="text-xl sm:text-2xl flex-shrink-0">
              {icon}
            </span>
          )}
          
          {/* Title and Badge */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {required && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {t('editor.badges.required')}
              </span>
            )}
            {optional && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                {t('editor.badges.optional')}
              </span>
            )}
          </div>
        </div>

        {/* Right Side - Completion Check and Chevron */}
        <div className="flex items-center gap-2">
          {completed && (
            <span className="text-green-500 text-lg">✓</span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      {/* Content Area */}
      <div
        id={contentId}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
          {children}
        </div>
      </div>
    </div>
  )
}

export default CollapsibleSection
