import { useState, useEffect } from 'react'

export function useResponsiveImage(product, apiBaseUrl) {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)

        // Initial check
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const formatUrl = (url) => {
        if (!url) return null
        return url.startsWith('http') ? url : `${apiBaseUrl}${url}`
    }

    const getImageUrl = () => {
        if (!product) return null

        // Mobile: prefer thumbnail (200px)
        if (isMobile && product.image_thumbnail_url) {
            return formatUrl(product.image_thumbnail_url)
        }

        // Desktop: prefer large (800px)
        if (product.image_large_url) {
            return formatUrl(product.image_large_url)
        }

        // Fallback to original or legacy url
        return formatUrl(product.image_original_url || product.image_url)
    }

    return {
        imageUrl: getImageUrl(),
        thumbnailUrl: product?.image_thumbnail_url ? formatUrl(product.image_thumbnail_url) : null,
        isMobile
    }
}
