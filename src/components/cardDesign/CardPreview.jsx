/**
 * CardPreview Component
 * Combined preview with platform toggle
 * Phase 2 - Frontend Components
 * Phase 4 - Mobile Optimization
 */

import { useState } from 'react'
import GoogleWalletPreview from './GoogleWalletPreview'
import AppleWalletPreview from './AppleWalletPreview'

function CardPreview({ design, offerData, isMobile = false }) {
  const [platform, setPlatform] = useState('apple') // Default to 'apple' for accurate preview
  const [zoom, setZoom] = useState(isMobile ? 0.85 : 1) // Smaller default zoom on mobile

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Platform Toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setPlatform('google')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${platform === 'google'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Google</span>
            </div>
          </button>
          <button
            onClick={() => setPlatform('apple')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${platform === 'apple'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-black dark:bg-white"></div>
              <span>Apple</span>
            </div>
          </button>
          {/* Hide "Both" option on mobile */}
          {!isMobile && (
            <button
              onClick={() => setPlatform('both')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${platform === 'both'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              Both
            </button>
          )}
        </div>

        {/* Zoom Controls - Desktop Only */}
        {!isMobile && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Zoom Out"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Zoom In"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Preview Area */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 min-h-[500px] flex items-center justify-center overflow-auto">
        <div
          className="transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          {platform === 'google' && (
            <GoogleWalletPreview design={design} offerData={offerData} />
          )}

          {platform === 'apple' && (
            <AppleWalletPreview design={design} offerData={offerData} />
          )}

          {platform === 'both' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoogleWalletPreview design={design} offerData={offerData} />
              <AppleWalletPreview design={design} offerData={offerData} />
            </div>
          )}
        </div>
      </div>

      {/* Live Update Indicator */}
      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span>Preview updates in real-time</span>
      </div>
    </div>
  )
}

export default CardPreview
