import React, { useState, useRef, useEffect } from 'react'
import LocationService from '../services/LocationService'

const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = 'ابحث عن المنطقة أو المدينة أو الحي...',
  placeholderEn = 'Search for region, city, or district...',
  language = 'ar',
  disabled = false,
  required = false,
  className = '',
  error = null,
  onLocationSelect = null,
  maxResults = 10
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debouncedSearchRef = useRef(null)

  // Create debounced search function
  useEffect(() => {
    debouncedSearchRef.current = LocationService.createDebouncedSearch(
      (searchResults) => {
        setResults(searchResults)
        setIsLoading(false)
        setIsOpen(searchResults.length > 0)
      },
      300
    )
  }, [])

  // Handle input change
  const handleInputChange = (e) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    setSelectedIndex(-1)
    
    if (newQuery.length >= 2) {
      setIsLoading(true)
      debouncedSearchRef.current(newQuery, language)
    } else {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
    }
  }

  // Handle location selection
  const handleLocationSelect = (location) => {
    const displayText = LocationService.formatLocationDisplay(location, language)
    setQuery(displayText)
    setIsOpen(false)
    setResults([])
    setSelectedIndex(-1)
    
    // Call onChange with the full location object
    if (onChange) {
      onChange(location)
    }
    
    // Call onLocationSelect callback if provided
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        )
        break
        
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleLocationSelect(results[selectedIndex])
        }
        break
        
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update query when value prop changes
  useEffect(() => {
    if (value && typeof value === 'object') {
      const displayText = LocationService.formatLocationDisplay(value, language)
      setQuery(displayText)
    } else if (typeof value === 'string') {
      setQuery(value)
    }
  }, [value, language])

  const isRTL = language === 'ar'
  const currentPlaceholder = language === 'ar' ? placeholder : placeholderEn

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true)
            }
          }}
          placeholder={currentPlaceholder}
          disabled={disabled}
          required={required}
          dir={isRTL ? 'rtl' : 'ltr'}
          className={`
            w-full px-4 py-3 
            border rounded-lg 
            ${error ? 'border-red-500' : 'border-gray-300'} 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${isRTL ? 'text-right' : 'text-left'}
            transition-colors duration-200
          `}
        />
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'}`}>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Search Icon */}
        {!isLoading && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} text-gray-400`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {error}
        </p>
      )}

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className={`
            absolute top-full left-0 right-0 mt-1 
            bg-white border border-gray-300 rounded-lg shadow-lg 
            max-h-60 overflow-y-auto z-50
            ${isRTL ? 'text-right' : 'text-left'}
          `}
        >
          {results.map((location, index) => {
            // Handle different ID formats from backend
            const locationId = location.city_id || location.region_id || location.district_id || location.id || index
            const uniqueKey = `${location.type}-${locationId}-${index}`
            
            return (
              <div
                key={uniqueKey}
                onClick={() => handleLocationSelect(location)}
                className={`
                px-4 py-3 cursor-pointer transition-colors duration-150
                hover:bg-blue-50
                ${index === selectedIndex ? 'bg-blue-100' : ''}
                ${index !== results.length - 1 ? 'border-b border-gray-100' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {LocationService.getLocationIcon(location.type)}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {language === 'ar' ? location.name_ar : location.name_en}
                  </div>
                  {location.hierarchy && (
                    <div className="text-sm text-gray-500 mt-1">
                      {location.hierarchy}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {language === 'ar' 
                    ? (location.type === 'region' ? 'منطقة' : location.type === 'city' ? 'مدينة' : 'حي')
                    : location.type
                  }
                </div>
              </div>
            </div>
          )
          })}
        </div>
      )}

      {/* No Results */}
      {isOpen && results.length === 0 && query.length >= 2 && !isLoading && (
        <div
          ref={dropdownRef}
          className={`
            absolute top-full left-0 right-0 mt-1 
            bg-white border border-gray-300 rounded-lg shadow-lg 
            px-4 py-6 text-center text-gray-500 z-50
            ${isRTL ? 'text-right' : 'text-left'}
          `}
        >
          {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
        </div>
      )}
    </div>
  )
}

export default LocationAutocomplete