/**
 * ValidationPanel Component
 * Display validation errors, warnings, and compliance status
 * Phase 2 - Frontend Components
 */

import { getValidationStatusUI, isDesignProductionReady } from '../../utils/designValidation'

function ValidationPanel({ validation, design }) {
  if (!validation) return null

  const { isValid, hasWarnings, hasErrors, errors = [], warnings = [] } = validation

  const statusUI = getValidationStatusUI(isValid, hasWarnings)
  const productionStatus = isDesignProductionReady(design || {}, validation)

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className={`rounded-xl p-4 border-2 ${statusUI.borderColor} ${statusUI.bgColor}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{statusUI.icon}</span>
            <h3 className={`text-lg font-bold ${statusUI.color}`}>
              {statusUI.label}
            </h3>
          </div>
          {productionStatus.ready ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold rounded-full">
              Production Ready
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-semibold rounded-full">
              Needs Work
            </span>
          )}
        </div>

        {!isValid && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Please fix the errors below before saving your design.
          </p>
        )}

        {isValid && hasWarnings && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your design is valid but has some warnings you may want to address.
          </p>
        )}

        {isValid && !hasWarnings && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your design looks great and meets all requirements!
          </p>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center space-x-2">
            <span>❌</span>
            <span>Errors ({errors.length})</span>
          </h4>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div
                key={index}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
              >
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center space-x-2">
            <span>⚠️</span>
            <span>Warnings ({warnings.length})</span>
          </h4>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3"
              >
                <p className="text-sm text-yellow-800 dark:text-yellow-300">{warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Production Blockers */}
      {!productionStatus.ready && productionStatus.blockers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center space-x-2">
            <span>🚫</span>
            <span>Production Blockers</span>
          </h4>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
              The following must be addressed before this design can be used in production:
            </p>
            <ul className="space-y-1">
              {productionStatus.blockers.map((blocker, index) => (
                <li key={index} className="text-sm text-orange-800 dark:text-orange-300 flex items-start space-x-2">
                  <span className="mt-0.5">•</span>
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Design Checklist
        </h4>
        <div className="space-y-2">
          <ChecklistItem
            label="Colors selected"
            checked={design?.background_color && design?.foreground_color}
          />
          <ChecklistItem
            label="Good color contrast (WCAG AA)"
            checked={isValid}
          />
          <ChecklistItem
            label="Logo uploaded"
            checked={design?.logo_url || design?.logo_google_url || design?.logo_apple_url}
          />
          <ChecklistItem
            label="Production ready"
            checked={productionStatus.ready}
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</span>
          <div className="flex-1 text-xs text-gray-700 dark:text-gray-300">
            <p className="font-semibold mb-1">Accessibility Tips</p>
            <ul className="space-y-1 opacity-90">
              <li>• WCAG AA requires 4.5:1 contrast ratio for normal text</li>
              <li>• AAA level (7:1) provides enhanced accessibility</li>
              <li>• Use high-contrast colors for better readability</li>
              <li>• Test your design on both light and dark backgrounds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({ label, checked }) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-5 h-5 rounded flex items-center justify-center
        ${checked
          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
          : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
        }`}
      >
        {checked && <span className="text-green-600 dark:text-green-400 text-xs">✓</span>}
      </div>
      <span className={`text-sm
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

export default ValidationPanel
