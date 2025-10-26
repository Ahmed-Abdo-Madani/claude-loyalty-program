/**
 * ColorPicker Component
 * Mobile-friendly color selection with simplified UX
 * Phase 2 - Frontend Components
 * Phase 4 - Mobile Optimization
 */

import { useState, useEffect } from 'react'
import { 
  validateColorContrast, 
  isValidHex, 
  businessFriendlyPresets,
  getSimplifiedContrastMessage,
  getContrastIcon,
  suggestContrastingColor
} from '../../utils/colorUtils'

function ColorPicker({
  label,
  value,
  onChange,
  contrastWith = null, // Color to check contrast against
  showPresets = true,
  required = false,
  suggestedColor = null, // Suggested color from logo
  onApplySuggested = null
}) {
  const [inputValue, setInputValue] = useState(value || '#3B82F6')
  const [isValid, setIsValid] = useState(true)
  const [contrast, setContrast] = useState(null)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('popular')
  const [showMorePresets, setShowMorePresets] = useState(false)

  useEffect(() => {
    setInputValue(value || '#3B82F6')
  }, [value])

  useEffect(() => {
    // Validate contrast when either color changes
    if (contrastWith && inputValue) {
      const contrastResult = validateColorContrast(
        contrastWith,
        inputValue
      )
      setContrast(contrastResult)
    } else {
      setContrast(null)
    }
  }, [inputValue, contrastWith])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Validate hex format
    const valid = isValidHex(newValue)
    setIsValid(valid)

    // Call onChange if valid
    if (valid) {
      onChange(newValue.toUpperCase())
    }
  }

  const handleColorChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue.toUpperCase())
    setIsValid(true)
    onChange(newValue.toUpperCase())
  }

  const handlePresetClick = (color) => {
    setInputValue(color)
    setIsValid(true)
    onChange(color)
  }

  const handleAutoContrast = () => {
    if (contrastWith) {
      const suggested = suggestContrastingColor(contrastWith)
      setInputValue(suggested)
      setIsValid(true)
      onChange(suggested)
    }
  }

  const getSimpleContrastIndicator = () => {
    if (!contrast) return null

    const icon = getContrastIcon(contrast.ratio)
    const message = getSimplifiedContrastMessage(contrastWith, inputValue)

    return (
      <div className="flex items-center space-x-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          {message}
        </span>
      </div>
    )
  }

  const currentPresets = businessFriendlyPresets[selectedCategory]
  const visibleColors = showMorePresets ? currentPresets.colors : currentPresets.colors.slice(0, 9)

  return (
    <div className="space-y-3">
      {/* Label and Simple Contrast Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {contrast && getSimpleContrastIndicator()}
      </div>

      {/* Color Input Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
        {/* Color Swatch */}
        <div className="relative w-20 h-16 sm:flex-shrink-0">
          <input
            type="color"
            value={inputValue}
            onChange={handleColorChange}
            className="w-full h-full rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: inputValue }}
          />
          {!isValid && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
          )}
        </div>

        {/* Hex Input and Toggle */}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="#3B82F6"
            maxLength={7}
            className={`w-full px-4 py-3 border rounded-xl font-mono text-sm uppercase
              ${isValid
                ? 'border-gray-300 dark:border-gray-600'
                : 'border-red-500 dark:border-red-500'
              }
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-primary
              transition-all duration-200`}
          />
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            {showTechnicalDetails ? 'Hide' : 'Show'} technical details
          </button>
        </div>
      </div>

      {!isValid && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Invalid color format (use #RRGGBB)
        </p>
      )}

      {/* Quick Actions */}
      {contrastWith && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAutoContrast}
            className="px-3 py-2 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            ✨ Auto-Contrast
          </button>
          {suggestedColor && onApplySuggested && (
            <button
              type="button"
              onClick={() => {
                handlePresetClick(suggestedColor)
                onApplySuggested?.()
              }}
              className="px-3 py-2 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center space-x-1"
            >
              <div className="w-4 h-4 rounded border border-blue-300" style={{ backgroundColor: suggestedColor }} />
              <span>Use Logo Color</span>
            </button>
          )}
        </div>
      )}

      {/* Color Presets */}
      {showPresets && (
        <div className="space-y-3">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-2 -mx-1 px-1">
            {Object.keys(businessFriendlyPresets).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedCategory(key)
                  setShowMorePresets(false)
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                  ${selectedCategory === key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {businessFriendlyPresets[key].name}
              </button>
            ))}
          </div>

          {/* Preset Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {visibleColors.map((color, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePresetClick(color)}
                className="h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-primary hover:scale-105 transition-all duration-200 shadow-sm relative"
                style={{ backgroundColor: color }}
                title={color}
              >
                {inputValue.toUpperCase() === color.toUpperCase() && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <span className="text-white text-xl font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Show More Button */}
          {currentPresets.colors.length > 9 && (
            <button
              type="button"
              onClick={() => setShowMorePresets(!showMorePresets)}
              className="w-full py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {showMorePresets ? 'Show Less' : `Show More (${currentPresets.colors.length - 9} more)`}
            </button>
          )}
        </div>
      )}

      {/* Simplified Error/Warning Messages */}
      {contrast && !contrast.isValid && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <span className="text-red-600 dark:text-red-400 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Colors are too similar
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                Customers may have trouble reading text with these colors. Try the Auto-Contrast button above.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Technical Details (Collapsible) */}
      {showTechnicalDetails && contrast && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Contrast Ratio
            </span>
            <span className="text-xs font-mono text-gray-900 dark:text-white">
              {contrast.ratio}:1
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              WCAG Level
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded
              ${contrast.meetsAAA 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : contrast.meetsAA
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {contrast.level}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            WCAG requires 4.5:1 minimum for readable text (AA). 7:1 is AAA (enhanced).
          </p>
        </div>
      )}
    </div>
  )
}

export default ColorPicker
