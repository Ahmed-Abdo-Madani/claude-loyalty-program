/**
 * TemplateSelector Component
 * Browse and apply design templates
 * Phase 2 - Frontend Components
 */

import { useState, useEffect } from 'react'
import { useCardDesign } from '../../contexts/CardDesignContext'

function TemplateSelector({ onApply, onClose }) {
  const { templates, loadTemplates, applyTemplate, loading } = useCardDesign()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleApply = async () => {
    if (!selectedTemplate) return

    try {
      setApplying(true)
      await applyTemplate(selectedTemplate.id)
      onApply?.(selectedTemplate)
      onClose?.()
    } catch (error) {
      console.error('Error applying template:', error)
      alert('Failed to apply template. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const getTemplateIcon = (industry) => {
    const icons = {
      coffee: '☕',
      restaurant: '🍽️',
      retail: '🛍️',
      beauty: '💆',
      fitness: '💪',
      professional: '⭐'
    }
    return icons[industry] || '🎨'
  }

  if (loading && templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Choose a Template
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Start with a professionally designed template for your industry
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={`text-left p-4 rounded-xl border-2 transition-all duration-200
              ${selectedTemplate?.id === template.id
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
          >
            {/* Template Preview */}
            <div
              className="w-full h-32 rounded-lg mb-3 flex items-center justify-center text-4xl"
              style={{
                backgroundColor: template.config.background_color,
                color: template.config.foreground_color || '#FFFFFF'
              }}
            >
              {template.config.stamp_icon || getTemplateIcon(template.industry)}
            </div>

            {/* Template Info */}
            <div>
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {template.name}
                </h4>
                {selectedTemplate?.id === template.id && (
                  <span className="text-primary">✓</span>
                )}
              </div>

              {template.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {template.description}
                </p>
              )}

              {/* Color Preview */}
              <div className="flex items-center space-x-1 mt-2">
                <div
                  className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: template.config.background_color }}
                  title="Background color"
                />
                <div
                  className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: template.config.foreground_color || '#FFFFFF' }}
                  title="Foreground color"
                />
                {template.config.label_color && (
                  <div
                    className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: template.config.label_color }}
                    title="Label color"
                  />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Template Details */}
      {selectedTemplate && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                backgroundColor: selectedTemplate.config.background_color,
                color: selectedTemplate.config.foreground_color || '#FFFFFF'
              }}
            >
              {selectedTemplate.config.stamp_icon || getTemplateIcon(selectedTemplate.industry)}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {selectedTemplate.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {selectedTemplate.description}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Industry: {selectedTemplate.industry}</span>
                {selectedTemplate.usage_count > 0 && (
                  <span>Used by {selectedTemplate.usage_count} businesses</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!selectedTemplate || applying}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {applying ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Applying...</span>
            </>
          ) : (
            <>
              <span>Apply Template</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️</span>
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            Applying a template will replace your current design settings.
            Your uploaded logos and images will be preserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TemplateSelector
