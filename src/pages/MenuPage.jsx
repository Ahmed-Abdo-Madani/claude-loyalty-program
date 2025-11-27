import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingBagIcon, MapPinIcon, PhoneIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { apiBaseUrl, endpoints, publicApi } from '../config/api'
import SEO from '../components/SEO'
import LanguageSwitcher from '../components/LanguageSwitcher'

function MenuPage({ type }) {
  const { businessId, branchId } = useParams()
  const { t, i18n } = useTranslation('common')
  const isRTL = i18n.language === 'ar'

  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cardDesign, setCardDesign] = useState(null)

  // Determine identifier based on type
  const identifier = type === 'branch' ? branchId : businessId

  useEffect(() => {
    fetchMenu()
  }, [identifier, type, i18n.language])

  const fetchMenu = async () => {
    setLoading(true)
    setError(null)

    try {
      const endpoint = endpoints.publicMenu(identifier, type || 'business')
      const response = await publicApi.get(endpoint)

      if (!response.ok) {
        throw new Error('Failed to load menu')
      }

      const data = await response.json()

      if (data.success) {
        setMenu(data.data)
        setCardDesign(data.data.cardDesign || null)
      } else {
        throw new Error(data.message || 'Failed to load menu')
      }
    } catch (err) {
      console.error('Menu fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getBusinessName = () => {
    if (!menu?.business) return ''
    return i18n.language === 'ar' && menu.business.name_ar 
      ? menu.business.name_ar 
      : menu.business.name
  }

  const getProductName = (product) => {
    return i18n.language === 'ar' && product.name_ar 
      ? product.name_ar 
      : product.name
  }

  const getCategoryName = (category) => {
    return i18n.language === 'ar' && category.name_ar 
      ? category.name_ar 
      : category.name
  }

  const getLogoUrl = (url) => {
    if (!url) return null
    // Check if URL is absolute (starts with http:// or https://)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Relative URL, prepend API base
    return `${apiBaseUrl}${url}`
  }

  const getHeaderGradientStyle = () => {
    if (cardDesign?.background_color) {
      // Create a subtle gradient using the background color
      return {
        background: `linear-gradient(to bottom right, ${cardDesign.background_color}, ${cardDesign.background_color})`
      }
    }
    return {} // Fall back to Tailwind classes
  }

  const getCategoryButtonStyle = (isSelected) => {
    if (isSelected) {
      return {
        backgroundColor: cardDesign?.background_color || '#7C3AED',
        color: cardDesign?.foreground_color || '#FFFFFF'
      }
    }
    return {}
  }

  const getPriceStyle = () => {
    return {
      color: cardDesign?.background_color || '#7C3AED'
    }
  }

  const filteredProducts = () => {
    if (!menu) return []
    
    let products = []
    
    if (selectedCategory === 'all') {
      // Show all products from all categories plus uncategorized
      menu.categories?.forEach(cat => {
        products = products.concat(cat.products || [])
      })
      products = products.concat(menu.uncategorizedProducts || [])
    } else if (selectedCategory === 'uncategorized') {
      products = menu.uncategorizedProducts || []
    } else {
      // Show products from selected category
      const category = menu.categories?.find(cat => cat.id === selectedCategory)
      products = category?.products || []
    }

    return products
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('menu.loadingMenu')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('menu.errorLoading')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchMenu}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {t('menu.retryLoading')}
          </button>
        </div>
      </div>
    )
  }

  const products = filteredProducts()
  const businessName = getBusinessName()
  const logoUrl = getLogoUrl(menu?.business?.logo_url)

  return (
    <>
      <SEO
        title={`${businessName} - ${t('menu.title')}`}
        description={menu?.business?.description || `${t('menu.viewMenu')} ${businessName}`}
        keywords="menu, products, prices, restaurant, cafe, business"
      />

      <div 
        className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-safe"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header Section */}
        <div 
          className={`bg-gradient-to-br ${!cardDesign?.background_color ? 'from-purple-600 to-purple-800 dark:from-purple-900 dark:to-purple-950' : ''} text-white pt-safe`}
          style={getHeaderGradientStyle()}
        >
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Language Switcher */}
            <div className="flex justify-end mb-4">
              <LanguageSwitcher />
            </div>

            {/* Business Logo & Name */}
            <div className="flex items-center gap-4 mb-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="w-20 h-20 rounded-full border-4 border-white/20 object-cover shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              )}
              <div className="flex-1">
                <h1 
                  className="text-2xl font-bold mb-1"
                  style={{ color: cardDesign?.foreground_color || '#FFFFFF' }}
                >
                  {businessName}
                </h1>
                {menu?.business?.description && (
                  <p 
                    className="text-sm"
                    style={{ color: cardDesign?.label_color || 'rgba(243, 232, 255, 1)' }}
                  >
                    {menu.business.description}
                  </p>
                )}
              </div>
            </div>

            {/* Branch Info (if applicable) */}
            {menu?.branch && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <MapPinIcon 
                    className="w-5 h-5 flex-shrink-0 mt-0.5" 
                    style={{ color: cardDesign?.foreground_color || '#FFFFFF' }}
                  />
                  <div className="flex-1">
                    <p 
                      className="font-medium"
                      style={{ color: cardDesign?.foreground_color || '#FFFFFF' }}
                    >
                      {menu.branch.name}
                    </p>
                    {menu.branch.address && (
                      <p 
                        className="text-sm"
                        style={{ color: cardDesign?.label_color || 'rgba(243, 232, 255, 1)' }}
                      >
                        {menu.branch.address}, {menu.branch.city}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info */}
            {(menu?.business?.phone || menu?.business?.address) && (
              <div className="flex flex-wrap gap-3 text-sm">
                {menu.business.phone && (
                  <a
                    href={`tel:${menu.business.phone}`}
                    className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
                    style={{ color: cardDesign?.foreground_color || '#FFFFFF' }}
                  >
                    <PhoneIcon className="w-4 h-4" />
                    {menu.business.phone}
                  </a>
                )}
                {menu.business.address && !menu.branch && (
                  <div 
                    className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full"
                    style={{ color: cardDesign?.foreground_color || '#FFFFFF' }}
                  >
                    <MapPinIcon className="w-4 h-4" />
                    <span className="text-sm">
                      {menu.business.city && `${menu.business.city}, `}
                      {menu.business.district}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category Filter */}
        {menu?.categories && menu.categories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? ''
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  style={selectedCategory === 'all' ? getCategoryButtonStyle(true) : {}}
                >
                  {t('menu.allCategories')}
                </button>
                {menu.categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? ''
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    style={selectedCategory === category.id ? getCategoryButtonStyle(true) : {}}
                  >
                    {getCategoryName(category)}
                  </button>
                ))}
                {menu.uncategorizedProducts && menu.uncategorizedProducts.length > 0 && (
                  <button
                    onClick={() => setSelectedCategory('uncategorized')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === 'uncategorized'
                        ? ''
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    style={selectedCategory === 'uncategorized' ? getCategoryButtonStyle(true) : {}}
                  >
                    {t('common:other')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBagIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('menu.noProducts')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t('menu.noProductsDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(product => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex gap-4 p-4">
                    {/* Product Image */}
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={getProductName(product)}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect fill="%23f3f4f6" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%239ca3af"%3E📦%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <ShoppingBagIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {getProductName(product)}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-lg font-bold"
                          style={getPriceStyle()}
                        >
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {t('menu.sar')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm">{t('menu.poweredBy')}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} Madna Platform
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default MenuPage
