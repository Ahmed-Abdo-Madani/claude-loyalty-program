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
import { useTranslation } from 'react-i18next'
import { getValidationStatusUI, isDesignProductionReady } from '../../utils/designValidation'

function ValidationPanel({ validation, design, onNavigateToSection }) {
  const { t } = useTranslation('cardDesign')
  
  if (!validation) return null

  const { isValid, hasWarnings, hasErrors, errors = [], warnings = [] } = validation
  const [showErrors, setShowErrors] = useState(errors.length > 0 && errors.length <= 3) // Auto-expand if 3 or fewer
  const [showWarnings, setShowWarnings] = useState(false)
  const [showBlockers, setShowBlockers] = useState(false)

  const statusUI = getValidationStatusUI(isValid, hasWarnings, t)
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
              {t('validation.ready')} ✓
            </span>
          ) : (
            <span className="px-2.5 sm:px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
              {t('validation.fixIssues')}
            </span>
          )}
        </div>

        {!isValid && (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            {t('validation.fixBeforeUse')}
          </p>
        )}

        {isValid && hasWarnings && (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            {t('validation.canImprove')}
          </p>
        )}

        {isValid && !hasWarnings && (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            {t('validation.perfectDesign')}
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
              <span>{t('validation.issuesToFix', { count: errors.length })}</span>
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
                    {translateError(error, t)}
                  </p>
                  {getFixAction(error, onNavigateToSection, t) && (
                    <button
                      onClick={() => getFixAction(error, onNavigateToSection, t).action()}
                      className="mt-2 px-3 py-1.5 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 min-h-[36px]"
                    >
                      {getFixAction(error, onNavigateToSection, t).label}
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
              <span>{t('validation.suggestions', { count: warnings.length })}</span>
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
                    {translateWarning(warning, t)}
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
              <span>{t('validation.mustFixBeforeUse')}</span>
            </h4>
            <span className="text-orange-700 dark:text-orange-400 text-xl flex-shrink-0 ml-2">
              {showBlockers ? '▼' : '▶'}
            </span>
          </button>
          
          {showBlockers && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mb-3">
                {t('validation.fixBeforeLive')}
              </p>
              <ul className="space-y-2">
                {productionStatus.blockers.map((blocker, index) => (
                  <li key={index} className="text-sm sm:text-base text-orange-800 dark:text-orange-300 flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0">•</span>
                    <span className="flex-1">{translateBlocker(blocker, t)}</span>
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
          {t('validation.cardChecklist')}
        </h4>
        <div className="space-y-2 sm:space-y-2.5">
          <ChecklistItem
            label={t('validation.checklist.colorsSelected')}
            checked={design?.background_color && design?.foreground_color}
          />
          <ChecklistItem
            label={t('validation.checklist.easyToRead')}
            checked={isValid}
          />
          <ChecklistItem
            label={t('validation.checklist.logoAdded')}
            checked={design?.logo_url || design?.logo_google_url || design?.logo_apple_url}
          />
          {/* Only show on desktop or if there are blockers */}
          <ChecklistItem
            label={t('validation.checklist.readyToUse')}
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
            <p className="font-semibold mb-1.5 sm:mb-2">{t('validation.quickTips')}</p>
            <ul className="space-y-1 sm:space-y-1.5 opacity-90">
              <li>{t('validation.tips.highContrast')}</li>
              <li>{t('validation.tips.testBothModes')}</li>
              <li className="hidden sm:block">{t('validation.tips.uploadLogo')}</li>
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
function translateError(error, t) {
  const translations = {
    'Background color is required': t('validation.errors.backgroundColorRequired'),
    'Foreground color is required': t('validation.errors.foregroundColorRequired'),
    'WCAG AA': t('validation.errors.readableColors'),
    'WCAG': t('validation.errors.readable'),
    'contrast ratio': t('validation.errors.colorDifference'),
    'too similar': t('validation.errors.tooSimilar'),
    'insufficient contrast': t('validation.errors.hardToRead')
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
function translateWarning(warning, t) {
  const translations = {
    'WCAG AAA': t('validation.warnings.maximumReadability'),
    'WCAG AA': t('validation.warnings.goodReadability'),
    'contrast ratio': t('validation.warnings.colorDifference'),
    'recommended': t('validation.warnings.recommended'),
    'accessibility': t('validation.warnings.readability')
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
function translateBlocker(blocker, t) {
  const translations = {
    'WCAG AA': t('validation.errors.readableColors'),
    'contrast': t('validation.errors.colorDifference'),
    'production': t('validation.warnings.liveUse'),
    'deployed': t('validation.warnings.published'),
    'validated': t('validation.warnings.checked')
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
function getFixAction(error, onNavigateToSection, t) {
  if (!onNavigateToSection) return null
  
  const errorLower = error.toLowerCase()
  
  if (errorLower.includes('background color') || errorLower.includes('foreground color')) {
    return {
      label: t('validation.actions.fixColors'),
      action: () => onNavigateToSection('colors')
    }
  }
  
  if (errorLower.includes('contrast') || errorLower.includes('similar')) {
    return {
      label: t('validation.actions.improveColors'),
      action: () => onNavigateToSection('colors')
    }
  }
  
  if (errorLower.includes('logo')) {
    return {
      label: t('validation.actions.addLogo'),
      action: () => onNavigateToSection('logo')
    }
  }
  
  return null
}

export default ValidationPanel
