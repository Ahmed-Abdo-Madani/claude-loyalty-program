/**
 * ColorPicker Component
 * Color selection with WCAG contrast validation
 * Phase 2 - Frontend Components
 */

import { useState, useEffect } from 'react'
import { validateColorContrast, isValidHex, colorPresets } from '../../utils/colorUtils'

function ColorPicker({
  label,
  value,
  onChange,
  contrastWith = null, // Color to check contrast against
  showPresets = true,
  required = false
}) {
  const [inputValue, setInputValue] = useState(value || '#3B82F6')
  const [isValid, setIsValid] = useState(true)
  const [contrast, setContrast] = useState(null)

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

  const getContrastBadge = () => {
    if (!contrast) return null

    const badges = {
      AAA: {
        icon: '✅',
        label: 'AAA',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        tooltip: `Excellent contrast (${contrast.ratio}:1) - AAA compliance`
      },
      AA: {
        icon: '✓',
        label: 'AA',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        tooltip: `Good contrast (${contrast.ratio}:1) - AA compliance`
      },
      Fail: {
        icon: '⚠️',
        label: 'Poor',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        tooltip: `Poor contrast (${contrast.ratio}:1) - Fails WCAG standards`
      }
    }

    const badge = badges[contrast.level]

    return (
      <div
        className={`px-2 py-1 rounded-md text-xs font-semibold ${badge.color} flex items-center space-x-1`}
        title={badge.tooltip}
      >
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
        <span className="text-[10px] opacity-75">{contrast.ratio}:1</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Label and Contrast Badge */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {contrast && getContrastBadge()}
      </div>

      {/* Color Input Row */}
      <div className="flex items-center space-x-3">
        {/* Color Swatch */}
        <div className="relative">
          <input
            type="color"
            value={inputValue}
            onChange={handleColorChange}
            className="w-16 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: inputValue }}
          />
          {!isValid && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
          )}
        </div>

        {/* Hex Input */}
        <div className="flex-1">
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
          {!isValid && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Invalid hex color format (use #RRGGBB)
            </p>
          )}
        </div>
      </div>

      {/* Color Presets */}
      {showPresets && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Industry Presets
          </p>
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(colorPresets).map(([key, preset]) => (
              <div key={key} className="space-y-1">
                {preset.colors.slice(0, 3).map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePresetClick(color)}
                    className="w-full h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-primary hover:scale-105 transition-all duration-200 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={`${preset.name} - ${color}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contrast Info */}
      {contrast && !contrast.isValid && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <span className="text-red-600 dark:text-red-400 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Accessibility Issue
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                This color combination has poor contrast ({contrast.ratio}:1).
                WCAG requires at least 4.5:1 for readable text.
              </p>
            </div>
          </div>
        </div>
      )}

      {contrast && contrast.isValid && !contrast.meetsAAA && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</span>
            <div className="flex-1">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Contrast meets AA standards ({contrast.ratio}:1).
                For enhanced accessibility, aim for 7:1 (AAA level).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPicker
