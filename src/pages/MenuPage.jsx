import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingBagIcon, MapPinIcon, PhoneIcon, SparklesIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { FaFacebook, FaInstagram, FaTwitter, FaSnapchatGhost } from 'react-icons/fa'
import { apiBaseUrl, endpoints, publicApi } from '../config/api'
import SEO from '../components/SEO'
import LanguageSwitcher from '../components/LanguageSwitcher'
import MenuListView from '../components/menu/MenuListView'
import MenuGridView from '../components/menu/MenuGridView'
import MenuPDFView from '../components/menu/MenuPDFView'

function MenuPage({ type }) {
  const { businessId, branchId } = useParams()
  const { t, i18n } = useTranslation(['menu', 'common'])
  const isRTL = i18n.language === 'ar'

  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cardDesign, setCardDesign] = useState(null)
  const [viewMode, setViewMode] = useState('grid')

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
        if (data.data.menuDisplayMode) {
          setViewMode(data.data.menuDisplayMode)
        }
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
  const getBusinessDescription = () => i18n.language === 'ar' && menu?.business?.description_ar ? menu.business.description_ar : menu?.business?.description || ''
  const getBranchName = () => {
    if (!menu?.branch) return ''
    return i18n.language === 'ar' && menu.branch.name_ar ? menu.branch.name_ar : menu.branch.name
  }
  const getProductName = (product) => i18n.language === 'ar' && product.name_ar ? product.name_ar : product.name
  const getProductDescription = (product) => i18n.language === 'ar' && product.description_ar ? product.description_ar : product.description
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
  const hasSocialMedia = menu?.business?.facebook_url || menu?.business?.instagram_url || menu?.business?.twitter_url || menu?.business?.snapchat_url

  // Use menu-specific phone number if set (even if empty string), otherwise fallback to main business phone
  const displayPhone = (menu?.business?.menu_phone !== null && menu?.business?.menu_phone !== undefined)
    ? menu.business.menu_phone
    : menu?.business?.phone

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
      <p className="text-gray-500 font-medium animate-pulse">{t('loadingMenu')}</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('errorLoading')}</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={fetchMenu} className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
          {t('retryLoading')}
        </button>
      </div>
    </div>
  )


  return (
    <>
      <SEO title={`${businessName} - ${t('title')}`} description={getBusinessDescription()} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans pb-safe-area-bottom" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Modern Hero Section */}
        <div className="relative bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          {/* Background Pattern/Gradient */}
          <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, transparent 100%)` }}></div>

          <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-50`}>
            <LanguageSwitcher variant="minimal" />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 pt- safe-area-top pb-6">

            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 mt-2 mb-6">
              {logoUrl ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full opacity-30 blur group-hover:opacity-50 transition duration-200"></div>
                  <img src={logoUrl} alt={businessName} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white dark:border-gray-800 object-cover shadow-lg" />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                  <ShoppingBagIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
                  {businessName}
                </h1>
                {getBusinessDescription() && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 max-w-lg mx-auto sm:mx-0 leading-relaxed line-clamp-2">
                    {getBusinessDescription()}
                  </p>
                )}

                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                  {menu?.branch && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                      <MapPinIcon className="w-3 h-3" />
                      {getBranchName()}
                    </div>
                  )}
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center -mt-6 mb-8 relative z-20 px-4">
          <div className="inline-flex p-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
            {[
              { id: 'grid', label: t('viewMode.grid') },
              { id: 'list', label: t('viewMode.list') },
              { id: 'pdf', label: t('viewMode.pdf') }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${viewMode === mode.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 transform scale-105'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky Categories */}
        {viewMode !== 'pdf' && (
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
                  {t('allCategories')}
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
        )}

        {/* Products Content */}
        <div className={`max-w-4xl mx-auto ${viewMode === 'pdf' ? 'px-0 py-4 sm:px-4 sm:py-8' : 'px-4 py-8'}`}>
          {viewMode === 'grid' && (
            <MenuGridView
              products={products}
              getProductName={getProductName}
              getProductDescription={getProductDescription}
              formatPrice={formatPrice}
              isRTL={isRTL}
              t={t}
            />

          )}

          {viewMode === 'list' && (
            <MenuListView
              products={products}
              categories={menu?.categories || []}
              uncategorizedProducts={menu?.uncategorizedProducts || []}
              getProductName={getProductName}
              getProductDescription={getProductDescription}
              getCategoryName={getCategoryName}
              formatPrice={formatPrice}
              isRTL={isRTL}
              t={t}
              selectedCategory={selectedCategory}
            />
          )}

          {viewMode === 'pdf' && (
            menu?.business?.menu_pdf_url ? (
              <MenuPDFView
                pdfUrl={menu.business.menu_pdf_url.startsWith('http') ? menu.business.menu_pdf_url : `${apiBaseUrl}${menu.business.menu_pdf_url}`}
                businessName={businessName}
                isRTL={isRTL}
              />
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('pdfNotAvailable')}</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {t('pdfNotAvailableDesc')}
                </p>

              </div>
            )
          )}
        </div>

        <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-600 pb-12">
          {/* Social Media Links */}
          {/* Social Media Links */}
          {hasSocialMedia && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="font-medium text-gray-600 dark:text-gray-400">{t('followUs')}</span>
              {menu?.business?.facebook_url && (
                <a
                  href={menu.business.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white dark:bg-gray-800 rounded-full text-[#1877F2] shadow-sm hover:shadow-md transition-all transform hover:scale-110"
                  aria-label="Facebook"
                >
                  <FaFacebook className="w-5 h-5" />
                </a>
              )}
              {menu?.business?.instagram_url && (
                <a
                  href={menu.business.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white dark:bg-gray-800 rounded-full text-[#E4405F] shadow-sm hover:shadow-md transition-all transform hover:scale-110"
                  aria-label="Instagram"
                >
                  <FaInstagram className="w-5 h-5" />
                </a>
              )}
              {menu?.business?.twitter_url && (
                <a
                  href={menu.business.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white dark:bg-gray-800 rounded-full text-[#1DA1F2] shadow-sm hover:shadow-md transition-all transform hover:scale-110"
                  aria-label="Twitter"
                >
                  <FaTwitter className="w-5 h-5" />
                </a>
              )}
              {menu?.business?.snapchat_url && (
                <a
                  href={menu.business.snapchat_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white dark:bg-gray-800 rounded-full text-[#FFFC00] shadow-sm hover:shadow-md transition-all transform hover:scale-110"
                  aria-label="Snapchat"
                >
                  <FaSnapchatGhost className="w-5 h-5 text-black" />
                </a>
              )}
            </div>
          )}

          {displayPhone && (
            <div className="flex justify-center mb-6">
              <a
                href={`tel:${displayPhone}`}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-900 dark:text-white font-medium"
              >
                <PhoneIcon className="w-5 h-5" />
                <span>{t('callBusiness')}</span>
                <span className="opacity-60 text-sm ml-1">{displayPhone}</span>
              </a>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <SparklesIcon className="w-4 h-4" />
            <span>{t('poweredBy')}</span>
          </div>

          <p>© {new Date().getFullYear()} Madna Platform</p>
        </div>
      </div>
    </>
  )
}

export default MenuPage
