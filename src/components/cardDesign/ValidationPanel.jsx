/**
 * ValidationPanel Component
 * Display validation errors, warnings, and compliance status
 * Phase 2 - Mobile-First Optimization
 * 
 * Mobile Optimizations:
 * - Business-friendly language (replaced WCAG terminology)
 * - Collapsible error/warning lists
 * - "Fix This" action buttons
 * - Reduced checklist (3-4 essential items)
 * - Larger touch targets (44x44px minimum)
 */

import { useState } from 'react'
import { getValidationStatusUI, isDesignProductionReady } from '../../utils/designValidation'

function ValidationPanel({ validation, design, onNavigateToSection }) {
  if (!validation) return null

  const { isValid, hasWarnings, hasErrors, errors = [], warnings = [] } = validation
  const [showErrors, setShowErrors] = useState(errors.length > 0 && errors.length <= 3) // Auto-expand if 3 or fewer
  const [showWarnings, setShowWarnings] = useState(false)
  const [showBlockers, setShowBlockers] = useState(false)

  const statusUI = getValidationStatusUI(isValid, hasWarnings)
  const productionStatus = isDesignProductionReady(design || {}, validation)

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Overall Status */}
      <div className={`rounded-xl p-4 sm:p-5 border-2 ${statusUI.borderColor} ${statusUI.bgColor}`}>
        <div className="flex items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="text-3xl sm:text-2xl flex-shrink-0">{statusUI.icon}</span>
            <h3 className={`text-base sm:text-lg font-bold ${statusUI.color} truncate`}>
              {statusUI.label}
            </h3>
          </div>
          {productionStatus.ready ? (
            <span className="px-2.5 sm:px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
              Ready ✓
            </span>
          ) : (
            <span className="px-2.5 sm:px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
              Fix Issues
            </span>
          )}
        </div>

        {!isValid && (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Fix the issues below to use your card design.
          </p>
        )}

        {isValid && hasWarnings && (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Your design works, but you can improve it further.
          </p>
        )}

        {isValid && !hasWarnings && (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Perfect! Your card design is ready to use. 🎉
          </p>
        )}
      </div>

      {/* Errors - Collapsible with Fix Action */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="w-full flex items-center justify-between min-h-[44px] text-left"
          >
            <h4 className="text-sm sm:text-base font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <span>❌</span>
              <span>Issues to Fix ({errors.length})</span>
            </h4>
            <span className="text-red-700 dark:text-red-400 text-xl flex-shrink-0 ml-2">
              {showErrors ? '▼' : '▶'}
            </span>
          </button>
          
          {showErrors && (
            <div className="space-y-2 sm:space-y-2.5">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4"
                >
                  <p className="text-sm sm:text-base text-red-800 dark:text-red-300 mb-2">
                    {translateError(error)}
                  </p>
                  {getFixAction(error, onNavigateToSection) && (
                    <button
                      onClick={() => getFixAction(error, onNavigateToSection).action()}
                      className="mt-2 px-3 py-1.5 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 min-h-[36px]"
                    >
                      {getFixAction(error, onNavigateToSection).label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings - Collapsible */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full flex items-center justify-between min-h-[44px] text-left"
          >
            <h4 className="text-sm sm:text-base font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>Suggestions ({warnings.length})</span>
            </h4>
            <span className="text-yellow-700 dark:text-yellow-400 text-xl flex-shrink-0 ml-2">
              {showWarnings ? '▼' : '▶'}
            </span>
          </button>
          
          {showWarnings && (
            <div className="space-y-2 sm:space-y-2.5">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4"
                >
                  <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-300">
                    {translateWarning(warning)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Production Blockers - Collapsible */}
      {!productionStatus.ready && productionStatus.blockers.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowBlockers(!showBlockers)}
            className="w-full flex items-center justify-between min-h-[44px] text-left"
          >
            <h4 className="text-sm sm:text-base font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <span>🚫</span>
              <span>Must Fix Before Use</span>
            </h4>
            <span className="text-orange-700 dark:text-orange-400 text-xl flex-shrink-0 ml-2">
              {showBlockers ? '▼' : '▶'}
            </span>
          </button>
          
          {showBlockers && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mb-3">
                Fix these before your card can go live:
              </p>
              <ul className="space-y-2">
                {productionStatus.blockers.map((blocker, index) => (
                  <li key={index} className="text-sm sm:text-base text-orange-800 dark:text-orange-300 flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0">•</span>
                    <span className="flex-1">{translateBlocker(blocker)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Simplified Checklist - Essential Items Only */}
      <div className="space-y-2 sm:space-y-3">
        <h4 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
          Card Checklist
        </h4>
        <div className="space-y-2 sm:space-y-2.5">
          <ChecklistItem
            label="Colors selected"
            checked={design?.background_color && design?.foreground_color}
          />
          <ChecklistItem
            label="Easy to read colors"
            checked={isValid}
          />
          <ChecklistItem
            label="Logo added"
            checked={design?.logo_url || design?.logo_google_url || design?.logo_apple_url}
          />
          {/* Only show on desktop or if there are blockers */}
          <ChecklistItem
            label="Ready to use"
            checked={productionStatus.ready}
            className="hidden sm:flex"
          />
        </div>
      </div>

      {/* Help Text - Simplified for Mobile */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <span className="text-blue-600 dark:text-blue-400 mt-0.5 text-lg sm:text-base flex-shrink-0">💡</span>
          <div className="flex-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold mb-1.5 sm:mb-2">Quick Tips</p>
            <ul className="space-y-1 sm:space-y-1.5 opacity-90">
              <li>• Use high-contrast colors for readability</li>
              <li>• Test on both light and dark phones</li>
              <li className="hidden sm:block">• Upload your logo for brand recognition</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({ label, checked, className = '' }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded flex items-center justify-center flex-shrink-0
        ${checked
          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
          : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
        }`}
      >
        {checked && <span className="text-green-600 dark:text-green-400 text-sm sm:text-xs">✓</span>}
      </div>
      <span className={`text-sm sm:text-base
        ${checked
          ? 'text-gray-900 dark:text-white font-medium'
          : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Translate technical error messages to business-friendly language
 */
function translateError(error) {
  const translations = {
    'Background color is required': 'Please choose a background color',
    'Foreground color is required': 'Please choose a text color',
    'WCAG AA': 'easy to read colors',
    'WCAG': 'readable',
    'contrast ratio': 'color difference',
    'too similar': 'too close in color',
    'insufficient contrast': 'hard to read'
  }
  
  let translated = error
  Object.keys(translations).forEach(key => {
    translated = translated.replace(new RegExp(key, 'gi'), translations[key])
  })
  
  return translated
}

/**
 * Translate technical warning messages to business-friendly language
 */
function translateWarning(warning) {
  const translations = {
    'WCAG AAA': 'maximum readability',
    'WCAG AA': 'good readability',
    'contrast ratio': 'color difference',
    'recommended': 'suggested',
    'accessibility': 'readability'
  }
  
  let translated = warning
  Object.keys(translations).forEach(key => {
    translated = translated.replace(new RegExp(key, 'gi'), translations[key])
  })
  
  return translated
}

/**
 * Translate production blocker messages to business-friendly language
 */
function translateBlocker(blocker) {
  const translations = {
    'WCAG AA': 'readable colors',
    'contrast': 'color difference',
    'production': 'live use',
    'deployed': 'published',
    'validated': 'checked'
  }
  
  let translated = blocker
  Object.keys(translations).forEach(key => {
    translated = translated.replace(new RegExp(key, 'gi'), translations[key])
  })
  
  return translated
}

/**
 * Get fix action button for common errors
 */
function getFixAction(error, onNavigateToSection) {
  if (!onNavigateToSection) return null
  
  const errorLower = error.toLowerCase()
  
  if (errorLower.includes('background color') || errorLower.includes('foreground color')) {
    return {
      label: '→ Fix Colors',
      action: () => onNavigateToSection('colors')
    }
  }
  
  if (errorLower.includes('contrast') || errorLower.includes('similar')) {
    return {
      label: '→ Improve Colors',
      action: () => onNavigateToSection('colors')
    }
  }
  
  if (errorLower.includes('logo')) {
    return {
      label: '→ Add Logo',
      action: () => onNavigateToSection('logo')
    }
  }
  
  return null
}

export default ValidationPanel
