import { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ViewColumnsIcon, ListBulletIcon } from '@heroicons/react/24/outline'

export default function ProductGrid({ products, onAddToCart, loading }) {
  const { t, i18n } = useTranslation('pos')
  const [viewMode, setViewMode] = useState('list')
  const [addedProductId, setAddedProductId] = useState(null)

  // Load saved view preference and detect device type
  useEffect(() => {
    const savedMode = localStorage.getItem('posViewMode')
    const isMobile = window.innerWidth < 768
    
    if (isMobile) {
      setViewMode('list') // Force list on mobile
    } else if (savedMode) {
      setViewMode(savedMode)
    } else {
      setViewMode('grid') // Default to grid on tablet+
    }
  }, [])

  // Handle view mode toggle
  const toggleViewMode = (mode) => {
    setViewMode(mode)
    localStorage.setItem('posViewMode', mode)
  }

  // Handle quick add with visual feedback
  const handleQuickAdd = (product) => {
    onAddToCart(product)
    setAddedProductId(product.public_id)
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    
    // Clear feedback after animation
    setTimeout(() => setAddedProductId(null), 600)
  }

  // Detect if mobile to hide view toggle
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (loading) {
    return (
      /* Loading Skeleton */
      <div className={viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'}>
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className={viewMode === 'list' 
              ? 'bg-gray-200 dark:bg-gray-700 rounded-lg h-20 animate-pulse'
              : 'bg-gray-200 dark:bg-gray-700 rounded-lg h-48 animate-pulse'
            }
          />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      /* Empty State */
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-semibold">
          {t('products.noProducts')}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          {t('products.noProductsDesc')}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* View Mode Toggle - Hide on Mobile */}
      {!isMobile && (
        <div className="flex justify-end mb-3 gap-2">
          <button
            onClick={() => toggleViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={t('products.viewMode.switchToList')}
            aria-label={t('products.viewMode.switchToList')}
          >
            <ListBulletIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => toggleViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={t('products.viewMode.switchToGrid')}
            aria-label={t('products.viewMode.switchToGrid')}
          >
            <ViewColumnsIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Product List/Grid */}
      {viewMode === 'list' ? (
        /* List View - Mobile Optimized */
        <div className="space-y-2">
          {products.map(product => (
            <ProductListRow
              key={product.public_id}
              product={product}
              onQuickAdd={handleQuickAdd}
              isAdded={addedProductId === product.public_id}
              t={t}
              i18n={i18n}
            />
          ))}
        </div>
      ) : (
        /* Grid View - Compact Cards */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map(product => (
            <ProductGridCard
              key={product.public_id}
              product={product}
              onClick={() => handleQuickAdd(product)}
              isAdded={addedProductId === product.public_id}
              t={t}
              i18n={i18n}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Product List Row Component (Mobile-Optimized)
const ProductListRow = memo(function ProductListRow({ product, onQuickAdd, isAdded, t, i18n }) {
  const isDisabled = product.status !== 'active'
  const displayName = i18n.language === 'ar' && product.name_ar ? product.name_ar : product.name
  
  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-3 border transition-all ${
        isDisabled 
          ? 'opacity-50 border-gray-200 dark:border-gray-700' 
          : 'border-gray-200 dark:border-gray-700 hover:border-primary active:scale-[0.98]'
      }`}
    >
      {/* Product Image - 60x60px */}
      <div className="w-[60px] h-[60px] bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = '<div class="text-3xl">📦</div>'
            }}
          />
        ) : (
          <div className="text-3xl">📦</div>
        )}
      </div>
      
      {/* Product Info - Flex Grow */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 mb-1">
          {displayName}
        </h3>
        
        {/* Price and Category */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {parseFloat(product.price).toFixed(2)} {t('common.sar')}
          </span>
          {product.category && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {i18n.language === 'ar' && product.category.name_ar 
                ? product.category.name_ar 
                : product.category.name}
            </span>
          )}
        </div>
        
        {/* Out of Stock Badge */}
        {product.status === 'out_of_stock' && (
          <span className="inline-block px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded font-semibold mt-1">
            {t('products.outOfStock')}
          </span>
        )}
      </div>
      
      {/* Quick Add Button */}
      <button
        onClick={() => onQuickAdd(product)}
        disabled={isDisabled}
        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex-shrink-0 ${
          isAdded
            ? 'bg-green-500 text-white'
            : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isAdded ? '✓' : t('products.quickAdd')}
      </button>
    </div>
  )
})

// Product Grid Card Component (Compact)
const ProductGridCard = memo(function ProductGridCard({ product, onClick, isAdded, t, i18n }) {
  const isDisabled = product.status !== 'active'
  const displayName = i18n.language === 'ar' && product.name_ar ? product.name_ar : product.name
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 text-left border-2 transition-all ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
          : isAdded
          ? 'border-green-500 scale-95'
          : 'border-transparent hover:border-primary hover:shadow-md active:scale-95'
      }`}
    >
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = '<div class="text-4xl">📦</div>'
            }}
          />
        ) : (
          <div className="text-4xl">📦</div>
        )}
      </div>
      
      {/* Product Name */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
        {displayName}
      </h3>
      
      {/* Price */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold text-primary">
          {parseFloat(product.price).toFixed(2)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('common.sar')}
        </span>
      </div>
      
      {/* Category Badge */}
      {product.category && (
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded truncate max-w-full">
            {i18n.language === 'ar' && product.category.name_ar 
              ? product.category.name_ar 
              : product.category.name}
          </span>
        </div>
      )}
      
      {/* Out of Stock Badge */}
      {product.status === 'out_of_stock' && (
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded font-semibold">
            {t('products.outOfStock')}
          </span>
        </div>
      )}
      
      {/* Added Checkmark */}
      {isAdded && (
        <div className="mt-2 text-center">
          <span className="inline-block px-3 py-1 text-sm bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded font-semibold">
            ✓ {t('products.added')}
          </span>
        </div>
      )}
    </button>
  )
})
