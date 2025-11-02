/**
 * TemplateSelector Component
 * Browse and apply design templates
 * Phase 2 - Frontend Components
 * Phase 4 - Mobile Optimization
 */

import { useState, useEffect } from 'react'
import { useCardDesign } from '../../contexts/CardDesignContext'

function TemplateSelector({ onApply, onClose }) {
  const { templates, loadTemplates, applyTemplate, loading } = useCardDesign()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [applying, setApplying] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [previewTemplate, setPreviewTemplate] = useState(null)

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

  // Get unique categories from templates
  const categories = ['all', ...new Set(templates.map(t => t.industry).filter(Boolean))]

  // Filter templates by category
  const filteredTemplates = categoryFilter === 'all' 
    ? templates 
    : templates.filter(t => t.industry === categoryFilter)

  if (loading && templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
      </div>
    )
  }

  // Preview modal
  if (previewTemplate) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {previewTemplate.name}
            </h3>
            <button
              onClick={() => setPreviewTemplate(null)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            <div
              className="w-full h-64 rounded-lg mb-4 flex items-center justify-center text-6xl"
              style={{
                backgroundColor: previewTemplate.config.background_color,
                color: previewTemplate.config.foreground_color || '#FFFFFF'
              }}
            >
              {previewTemplate.config.stamp_icon || getTemplateIcon(previewTemplate.industry)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {previewTemplate.description}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedTemplate(previewTemplate)
                  setPreviewTemplate(null)
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
              >
                Select Template
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Choose a Template
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Start with a professionally designed template for your industry
        </p>
      </div>

      {/* Category Filter - Horizontal Scrollable on Mobile */}
      {categories.length > 1 && (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex items-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1
                  ${categoryFilter === category
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                <span>{category === 'all' ? '📋' : getTemplateIcon(category)}</span>
                <span className="capitalize">{category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer
              ${selectedTemplate?.id === template.id
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
              }`}
            onClick={() => setSelectedTemplate(template)}
          >
            {/* Template Preview */}
            <div
              className="w-full h-40 rounded-lg mb-3 flex items-center justify-center text-4xl"
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
                  <span className="text-primary text-xl">✓</span>
                )}
              </div>

              {template.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {template.description}
                </p>
              )}

              {/* Color Preview */}
              <div className="flex items-center gap-1 mt-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: template.config.background_color }}
                  title="Background color"
                />
                <div
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: template.config.foreground_color || '#FFFFFF' }}
                  title="Foreground color"
                />
                {template.config.label_color && (
                  <div
                    className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: template.config.label_color }}
                    title="Label color"
                  />
                )}
              </div>

              {/* Preview Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewTemplate(template)
                }}
                className="mt-3 w-full py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                👁️ Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Template Details */}
      {selectedTemplate && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="capitalize">{selectedTemplate.industry}</span>
                {selectedTemplate.usage_count > 0 && (
                  <span>Used by {selectedTemplate.usage_count} businesses</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium order-2 sm:order-1"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!selectedTemplate || applying}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
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
        <div className="flex items-start gap-2">
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
