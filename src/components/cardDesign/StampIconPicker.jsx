/**
 * StampIconPicker Component
 * Allows businesses to select from a library of SVG stamp icons
 * Phase 4 - Mobile Optimization
 */

import { useState, useEffect } from 'react'
import { secureApi, apiBaseUrl } from '../../config/api'

function StampIconPicker({ selectedIconId, onChange, disabled = false }) {
  const [icons, setIcons] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadIcons()
  }, [selectedCategory])

  const loadIcons = async () => {
    try {
      setLoading(true)

      // Build URL with query params (full URL with base)
      const url = selectedCategory !== 'all'
        ? `${apiBaseUrl}/api/stamp-icons?category=${selectedCategory}`
        : `${apiBaseUrl}/api/stamp-icons`

      console.log('🎨 Loading stamp icons from:', url)
      const response = await secureApi.get(url)

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200)
        })
        throw new Error(`Server returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Stamp icons loaded:', data.total, 'icons')

      setIcons(data.icons || [])
      setCategories(data.categories || [])
      setError(null)
    } catch (err) {
      setError('Failed to load stamp icons')
      console.error('Failed to load icons:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter icons by search query
  const filteredIcons = icons.filter(icon => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return icon.name.toLowerCase().includes(query) || 
           (icon.description && icon.description.toLowerCase().includes(query))
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 w-full opacity-30">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        {error}
      </div>
    )
  }

  if (icons.length === 0) {
    return (
      <div className="text-gray-500 text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        No stamp icons available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search icons..."
          disabled={disabled}
          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        />
      </div>

      {/* Category Filter - Horizontal Scrollable Pills */}
      {categories.length > 0 && (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedCategory('all')}
              disabled={disabled}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0
                ${selectedCategory === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                disabled={disabled}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0
                  ${selectedCategory === cat.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Icon Grid - Responsive */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {filteredIcons.map((icon) => (
          <button
            key={icon.id}
            onClick={() => onChange(icon.id)}
            disabled={disabled}
            title={`${icon.name}${icon.description ? ` - ${icon.description}` : ''}${icon.seasonal ? ' (Seasonal)' : ''}`}
            className={`
              relative aspect-square rounded-lg p-3
              transition-all duration-200
              border-2
              ${selectedIconId === icon.id
                ? 'border-primary bg-primary/10 shadow-lg scale-105'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              min-h-[44px] min-w-[44px]
            `}
          >
            {/* Icon Preview Image */}
            <img
              src={`${apiBaseUrl}/api/stamp-icons/${icon.id}/preview`}
              alt={icon.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to a placeholder if preview fails to load
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            {/* Fallback placeholder */}
            <div
              className="w-full h-full items-center justify-center text-gray-400 hidden"
              style={{ display: 'none' }}
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Seasonal Badge */}
            {icon.seasonal && (
              <div
                className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"
                title="Seasonal icon"
              />
            )}

            {/* Selection Checkmark */}
            {selectedIconId === icon.id && (
              <div className="absolute top-1 left-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected Icon Info */}
      {selectedIconId && (
        <div className="text-sm text-center">
          <span className="text-gray-600 dark:text-gray-400">Selected: </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {filteredIcons.find(i => i.id === selectedIconId)?.name || selectedIconId}
          </span>
        </div>
      )}

      {/* Icon Count Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} 
        {searchQuery && ` matching "${searchQuery}"`}
        {selectedCategory !== 'all' && !searchQuery && ` in ${categories.find(c => c.id === selectedCategory)?.name || selectedCategory}`}
      </div>
    </div>
  )
}

export default StampIconPicker
