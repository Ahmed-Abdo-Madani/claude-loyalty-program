import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useTranslation } from 'react-i18next'
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    MagnifyingGlassPlusIcon,
    MagnifyingGlassMinusIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

function MenuPDFView({ pdfUrl, businessName, isRTL }) {
    const { t } = useTranslation('menu')
    const [numPages, setNumPages] = useState(null)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [containerWidth, setContainerWidth] = useState(null)

    // Adjust initial scale based on window width
    useEffect(() => {
        const handleResize = () => {
            setContainerWidth(document.getElementById('pdf-container')?.clientWidth || width)
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages)
        setLoading(false)
        setError(null)
    }

    function onDocumentLoadError(err) {
        console.error('PDF Load Error:', err)
        setError(t('pdfError') || 'Failed to load PDF menu')
        setLoading(false)
    }


    function zoomIn() {
        setScale(prev => Math.min(prev + 0.2, 3.0))
    }

    function zoomOut() {
        setScale(prev => Math.max(prev - 0.2, 0.5))
    }

    function handleDownload() {
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = `${businessName || 'Menu'}.pdf`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="flex flex-col items-center w-full" dir={isRTL ? 'rtl' : 'ltr'}>


            {/* PDF Document Container */}
            <div
                id="pdf-container"
                className={`w-full max-w-4xl min-h-[500px] flex justify-center bg-gray-200 dark:bg-gray-900/50 rounded-none sm:rounded-2xl p-0 sm:p-8 overflow-hidden transition-all duration-300 ${loading ? 'items-center' : 'items-start'}`}
            >
                {loading && (
                    <div className="flex flex-col items-center justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                        <p className="text-gray-500 font-medium animate-pulse">{t('pdfLoading') || 'Loading PDF menu...'}</p>
                    </div>
                )}

                {error && (
                    <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-100 dark:border-red-900/30">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{error}</h3>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!error && (
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null}
                        className="shadow-2xl rounded-sm overflow-hidden flex flex-col gap-4"
                    >
                        {Array.from(new Array(numPages), (el, index) => (
                            <div key={`page_${index + 1}`} className="relative shadow-md">
                                <Page
                                    pageNumber={index + 1}
                                    scale={scale}
                                    width={containerWidth ? (window.innerWidth < 640 ? containerWidth : Math.min(containerWidth, 800)) : undefined}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="border border-gray-200 dark:border-gray-800"
                                />
                            </div>
                        ))}
                    </Document>
                )}
            </div>

            {/* Controls Toolbar (Static Bottom) */}
            <div className="mt-4 w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-wrap items-center justify-between gap-3">
                {/* Zoom Controls */}
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={zoomOut}
                        className="p-2 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors"
                        aria-label="Zoom Out"
                    >
                        <MagnifyingGlassMinusIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>

                    <span className="text-sm font-medium px-2 min-w-[60px] text-center text-gray-700 dark:text-gray-200">
                        {Math.round(scale * 100)}%
                    </span>

                    <button
                        onClick={zoomIn}
                        className="p-2 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors"
                        aria-label="Zoom In"
                    >
                        <MagnifyingGlassPlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                </div>

                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-sm text-sm font-medium"
                >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>{t('pdfDownload') || 'Download'}</span>
                </button>
            </div>

            {/* Mobile Page Indicator (Bottom) */}

        </div>
    )
}

export default MenuPDFView
