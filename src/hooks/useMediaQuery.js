/**
 * useMediaQuery Hook
 * Detects responsive breakpoints for mobile-first design
 * Phase 4: Mobile Optimization
 */

import { useState, useEffect } from 'react'

/**
 * Check if a media query matches
 * @param {string} query - Media query string (e.g., '(min-width: 1024px)')
 * @returns {boolean} - Whether the media query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    // Initialize with current match state (SSR-safe)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    // Update state when media query changes
    const handler = (event) => setMatches(event.matches)

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      // Legacy browsers
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [query])

  return matches
}

/**
 * Predefined breakpoint hooks matching Tailwind CSS
 */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)') // lg breakpoint
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)') // md breakpoint
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)') // sm and below
}

/**
 * Additional mobile-first breakpoint helpers for granular responsive control
 */
export function useIsSmallMobile() {
  return useMediaQuery('(max-width: 479px)') // Very small phones
}

export function useIsMediumMobile() {
  return useMediaQuery('(min-width: 480px) and (max-width: 767px)') // Medium phones
}

export function useIsLargeDesktop() {
  return useMediaQuery('(min-width: 1280px)') // xl breakpoint and above
}

export default useMediaQuery

