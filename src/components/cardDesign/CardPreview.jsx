/**
 * CardPreview Component
 * Combined preview with platform toggle
 * Phase 2 - Mobile-First Optimization
 * 
 * Mobile Optimizations:
 * - Larger platform toggle buttons (44x44px touch targets)
 * - Platform brand icons (Google G, Apple logo)
 * - Pinch-to-zoom support
 * - Swipe gestures to switch platforms
 * - Reduced min-height (400px on mobile)
 * - Fullscreen button
 */

import { useState, useRef, useEffect } from 'react'
import GoogleWalletPreview from './GoogleWalletPreview'
import AppleWalletPreview from './AppleWalletPreview'

function CardPreview({ design, offerData, isMobile = false }) {
  const [platform, setPlatform] = useState('apple') // Default to 'apple' for accurate preview
  const [zoom, setZoom] = useState(isMobile ? 0.85 : 1) // Smaller default zoom on mobile
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewRef = useRef(null)
  const touchStartX = useRef(null)
  const pinchDistance = useRef(null)

  // Handle swipe gestures to switch platforms (mobile only)
  useEffect(() => {
    if (!isMobile || !previewRef.current) return

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStartX.current = e.touches[0].clientX
      } else if (e.touches.length === 2) {
        // Pinch gesture start
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchDistance.current = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && pinchDistance.current !== null) {
        // Pinch to zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const currentDistance = Math.sqrt(dx * dx + dy * dy)
        const scale = currentDistance / pinchDistance.current
        
        setZoom(prevZoom => Math.max(0.5, Math.min(2, prevZoom * scale)))
        pinchDistance.current = currentDistance
      }
    }

    const handleTouchEnd = (e) => {
      if (touchStartX.current !== null && e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX
        const diffX = touchStartX.current - touchEndX

        // Swipe threshold: 50px
        if (Math.abs(diffX) > 50) {
          if (diffX > 0) {
            // Swipe left: Google → Apple
            if (platform === 'google') setPlatform('apple')
          } else {
            // Swipe right: Apple → Google
            if (platform === 'apple') setPlatform('google')
          }
        }
      }
      
      touchStartX.current = null
      pinchDistance.current = null
    }

    const element = previewRef.current
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, platform])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4 overflow-auto' : 'space-y-3 sm:space-y-4'}`}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Platform Toggle - Enhanced with Icons */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setPlatform('google')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-sm font-medium transition-all duration-200 min-h-[44px]
              ${platform === 'google'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="hidden sm:inline">Google</span>
          </button>
          <button
            onClick={() => setPlatform('apple')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-sm font-medium transition-all duration-200 min-h-[44px]
              ${platform === 'apple'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span className="hidden sm:inline">Apple</span>
          </button>
          {/* Hide "Both" option on mobile */}
          {!isMobile && (
            <button
              onClick={() => setPlatform('both')}
              className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 min-h-[44px]
                ${platform === 'both'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              Both
            </button>
          )}
        </div>

        {/* Right Controls: Zoom + Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls - Desktop Only */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[36px] min-w-[36px]"
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
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[36px] min-w-[36px]"
                title="Zoom In"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Preview Area with Touch Support */}
      <div
        ref={previewRef}
        className={`bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-auto
          ${isFullscreen ? 'min-h-[calc(100vh-8rem)]' : 'min-h-[400px] sm:min-h-[500px]'}
          ${isMobile ? 'p-4' : 'p-6'}
          flex items-center justify-center`}
      >
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

      {/* Mobile Gesture Hint */}
      {isMobile && !isFullscreen && (
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span>↔️</span>
            <span>Swipe to switch</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
          <div className="flex items-center gap-1.5">
            <span>🤏</span>
            <span>Pinch to zoom</span>
          </div>
        </div>
      )}

      {/* Live Update Indicator */}
      {!isMobile && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>Preview updates in real-time</span>
        </div>
      )}
    </div>
  )
}

export default CardPreview
