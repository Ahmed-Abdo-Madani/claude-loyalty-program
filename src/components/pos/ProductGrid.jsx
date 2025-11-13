import { useTranslation } from 'react-i18next'

export default function ProductGrid({ products, onAddToCart, loading }) {
  const { t, i18n } = useTranslation('pos')

  if (loading) {
    return (
      /* Loading Skeleton */
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48 animate-pulse" 
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
    /* Product Grid */
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map(product => (
        <button
          key={product.public_id}
          onClick={() => onAddToCart(product)}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 text-left border-2 border-transparent hover:border-primary active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={product.status !== 'active'}
        >
          {/* Product Image or Placeholder */}
          <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={i18n.language === 'ar' && product.name_ar ? product.name_ar : product.name}
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
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
            {i18n.language === 'ar' && product.name_ar ? product.name_ar : product.name}
          </h3>
          
          {/* Arabic Name (if available and displaying English) */}
          {i18n.language === 'en' && product.name_ar && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
              {product.name_ar}
            </p>
          )}
          
          {/* English Name (if available and displaying Arabic) */}
          {i18n.language === 'ar' && product.name && product.name !== product.name_ar && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
              {product.name}
            </p>
          )}
          
          {/* Price */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xl font-bold text-primary">
              {parseFloat(product.price).toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.sar')}
            </span>
          </div>
          
          {/* Category Badge (optional) */}
          {product.category && (
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                {i18n.language === 'ar' && product.category.name_ar 
                  ? product.category.name_ar 
                  : product.category.name}
              </span>
            </div>
          )}
          
          {/* Out of Stock Badge */}
          {product.status === 'out_of_stock' && (
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded font-semibold">
                {t('products.outOfStock')}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
