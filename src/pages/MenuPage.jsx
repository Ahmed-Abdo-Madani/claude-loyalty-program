import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingBagIcon, MapPinIcon, PhoneIcon, SparklesIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [cardDesign, setCardDesign] = useState(null)

  const identifier = type === 'branch' ? branchId : businessId

  useEffect(() => {
    fetchMenu()
  }, [identifier, type, i18n.language])

  const fetchMenu = async () => {
    setLoading(true)
    try {
      const endpoint = endpoints.publicMenu(identifier, type || 'business')
      const response = await publicApi.get(endpoint)
      if (!response.ok) throw new Error('Failed to load menu')
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

  const getBusinessName = () => i18n.language === 'ar' && menu?.business?.name_ar ? menu.business.name_ar : menu?.business?.name || ''
  const getProductName = (product) => i18n.language === 'ar' && product.name_ar ? product.name_ar : product.name
  const getCategoryName = (category) => i18n.language === 'ar' && category.name_ar ? category.name_ar : category.name
  const getLogoUrl = (url) => url ? (url.startsWith('http') ? url : `${apiBaseUrl}${url}`) : null

  const formatPrice = (price) => new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)

  const filteredProducts = () => {
    if (!menu) return []
    let products = []

    // First, gather products based on category
    if (selectedCategory === 'all') {
      menu.categories?.forEach(cat => products = products.concat(cat.products || []))
      products = products.concat(menu.uncategorizedProducts || [])
    } else if (selectedCategory === 'uncategorized') {
      products = menu.uncategorizedProducts || []
    } else {
      const category = menu.categories?.find(cat => cat.id === selectedCategory)
      products = category?.products || []
    }

    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      products = products.filter(p =>
        getProductName(p).toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }

    return products
  }

  const products = filteredProducts()
  const businessName = getBusinessName()
  const logoUrl = getLogoUrl(menu?.business?.logo_url)
  const themeColor = cardDesign?.background_color || '#7C3AED'

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
      <p className="text-gray-500 font-medium animate-pulse">{t('menu.loadingMenu')}</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('menu.errorLoading')}</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={fetchMenu} className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
          {t('menu.retryLoading')}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <SEO title={`${businessName} - ${t('menu.title')}`} description={menu?.business?.description} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans pb-safe-area-bottom" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Modern Hero Section */}
        <div className="relative bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          {/* Background Pattern/Gradient */}
          <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, transparent 100%)` }}></div>

          <div className="relative max-w-4xl mx-auto px-4 pt- safe-area-top pb-6">
            <div className="flex justify-between items-center py-4">
              {/* Language Switcher */}
              <LanguageSwitcher variant="minimal" />
            </div>

            <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-6 mt-4 mb-8">
              {logoUrl ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full opacity-30 blur group-hover:opacity-50 transition duration-200"></div>
                  <img src={logoUrl} alt={businessName} className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-gray-800 object-cover shadow-xl" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                  <ShoppingBagIcon className="w-10 h-10 text-gray-400" />
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                  {businessName}
                </h1>
                {menu?.business?.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-lg mx-auto sm:mx-0 leading-relaxed">
                    {menu.business.description}
                  </p>
                )}

                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                  {menu?.branch && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                      <MapPinIcon className="w-3.5 h-3.5" />
                      {menu.branch.name}
                    </div>
                  )}
                  {menu?.business?.phone && (
                    <a href={`tel:${menu.business.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium hover:bg-green-100 transition-colors">
                      <PhoneIcon className="w-3.5 h-3.5" />
                      {menu.business.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-lg mx-auto sm:mx-0 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border-none rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                placeholder={t('menu.searchPlaceholder') || "Search for dishes..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Sticky Categories */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === 'all'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transform scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {t('menu.allCategories')}
              </button>
              {menu?.categories?.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transform scale-105'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {getCategoryName(category)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBagIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('menu.noProducts')}</h3>
              <p className="text-gray-500">{t('menu.noProductsDesc')}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {products.map(product => (
                <div
                  key={product.id}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 flex gap-4"
                >
                  {/* Image */}
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={getProductName(product)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('flex', 'items-center', 'justify-center'); }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingBagIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                          {getProductName(product)}
                        </h3>
                        <span className="flex-shrink-0 text-primary font-bold text-sm sm:text-base bg-primary/5 dark:bg-primary/20 px-2 py-1 rounded-lg">
                          {formatPrice(product.price)}
                          <span className="text-xs ml-1 font-normal opacity-80">{t('menu.sar')}</span>
                        </span>
                      </div>

                      {product.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-600">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <SparklesIcon className="w-4 h-4" />
            <span>{t('menu.poweredBy')}</span>
          </div>
          <p>© {new Date().getFullYear()} Madna Platform</p>
        </div>
      </div>
    </>
  )
}

export default MenuPage
