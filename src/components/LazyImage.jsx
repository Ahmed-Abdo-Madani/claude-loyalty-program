import { useState, useEffect, useRef } from 'react'
import ImagePlaceholder from './ImagePlaceholder'

function LazyImage({
    src,
    thumbnail,
    alt,
    className = "",
    onLoad,
    onError
}) {
    const [status, setStatus] = useState('pending') // pending, loading, loaded, error
    const [inView, setInView] = useState(false)
    const imgRef = useRef(null)
    const observerRef = useRef(null)

    // Handle intersection observer
    useEffect(() => {
        // Reset status if src changes
        setStatus('pending')

        if (observerRef.current) {
            observerRef.current.disconnect()
        }

        if (!src && !thumbnail) {
            setStatus('empty')
            return
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setInView(true)
                    observerRef.current.disconnect()
                }
            },
            {
                rootMargin: '50px', // Start loading slightly before
                threshold: 0.01
            }
        )

        if (imgRef.current) {
            observerRef.current.observe(imgRef.current)
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [src, thumbnail])

    // Handle actual image loading once in view
    useEffect(() => {
        if (!inView || !src) return

        setStatus('loading')

        const img = new Image()
        img.src = src
        img.onload = () => {
            setStatus('loaded')
            if (onLoad) onLoad()
        }
        img.onerror = () => {
            setStatus('error')
            if (onError) onError()
        }

    }, [inView, src])

    // If no src provided initially (and no thumbnail), show empty
    if (!src && !thumbnail) {
        return (
            <div className={`overflow-hidden relative ${className}`}>
                <ImagePlaceholder type="empty" />
            </div>
        )
    }

    return (
        <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
            {/* Loading / Placeholder State - Show if pending or loading (and no loaded image yet) */}
            {status !== 'loaded' && status !== 'error' && (
                <div className="absolute inset-0 z-10">
                    {thumbnail ? (
                        <img
                            src={thumbnail}
                            alt={alt}
                            className={`w-full h-full object-cover filter blur-sm transition-opacity duration-300 ${status === 'loading' ? 'opacity-50' : 'opacity-100'
                                }`}
                        />
                    ) : (
                        <ImagePlaceholder type="loading" />
                    )}
                </div>
            )}

            {/* Actual Image */}
            {inView && src && status !== 'error' && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'
                        }`}
                />
            )}

            {/* Error State */}
            {status === 'error' && (
                <div className="absolute inset-0 z-20">
                    {/* If thumbnail is available, maybe keep showing it? 
                         But usually we want to indicate the full image failed. 
                         Let's show the error placeholder. 
                     */}
                    <ImagePlaceholder type="error" onRetry={() => setStatus('pending')} />
                </div>
            )}
        </div>
    )
}

export default LazyImage
