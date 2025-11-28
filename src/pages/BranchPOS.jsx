import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { getManagerAuthData, managerLogout, isManagerAuthenticated, managerApiRequest } from '../utils/secureAuth'
import { endpoints } from '../config/api'
import POSCart from '../components/pos/POSCart'
import ProductGrid from '../components/pos/ProductGrid'
import CheckoutModal from '../components/pos/CheckoutModal'
import ReceiptPreviewModal from '../components/pos/ReceiptPreviewModal'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SEO from '../components/SEO'

export default function BranchPOS() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('pos')
  
  // State Management
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState(null)
  const [branchInfo, setBranchInfo] = useState(null)
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  
  // Refs
  const searchDebounceRef = useRef(null)
  const productsContainerRef = useRef(null)

  // Authentication Check and Data Loading
  useEffect(() => {
    const initializePOS = async () => {
      // Check authentication
      if (!isManagerAuthenticated()) {
        navigate('/branch-manager-login')
        return
      }

      // Load branch info
      const managerData = getManagerAuthData()
      if (!managerData || !managerData.branchId) {
        setError('Branch information not found')
        return
      }
      setBranchInfo(managerData)

      try {
        setLoading(true)
        setError(null)

        // Load products (branch-specific + all-branches) using manager endpoints
        const productsParams = new URLSearchParams({ status: 'active' })
        const productsResponse = await managerApiRequest(`${endpoints.posManagerProducts}?${productsParams.toString()}`, {
          method: 'GET'
        })

        // Parse response JSON
        const productsJson = await productsResponse.json()
        
        if (productsJson.success && productsJson.products) {
          setProducts(productsJson.products)
        }

        // Load categories using manager endpoints
        const categoriesResponse = await managerApiRequest(endpoints.posManagerCategories, {
          method: 'GET'
        })

        // Parse response JSON
        const categoriesJson = await categoriesResponse.json()
        
        if (categoriesJson.success && categoriesJson.categories) {
          setCategories(categoriesJson.categories)
        }

      } catch (err) {
        console.error('Failed to load POS data:', err)
        setError(t('messages.loadingFailed'))
      } finally {
        setLoading(false)
      }
    }

    initializePOS()
  }, [navigate, t])

  // Search Debouncing (300ms delay)
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery])

  // Scroll Detection for Shadow Effect
  useEffect(() => {
    const container = productsContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 10)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Clear Search Handler
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearchQuery('')
  }, [])

  // Cart Management Functions
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.public_id === product.public_id)
      
      if (existingItem) {
        // Increment quantity
        return prevCart.map(item => {
          if (item.product.public_id === product.public_id) {
            const newQuantity = item.quantity + 1
            
            // Coerce price to number to avoid string concatenation
            const unitPrice = parseFloat(product.price)
            
            // Normalize tax rate: convert percentage to decimal
            const ratePct = parseFloat(product.tax_rate ?? 15) // Default 15% Saudi VAT
            const rate = ratePct / 100
            
            let subtotal, tax, total
            
            if (product.tax_included) {
              // Tax is included in price: derive base price and tax
              const priceWithTax = unitPrice * newQuantity
              subtotal = priceWithTax / (1 + rate)
              tax = priceWithTax - subtotal
              total = priceWithTax
            } else {
              // Tax is added on top of price
              subtotal = unitPrice * newQuantity
              tax = subtotal * rate
              total = subtotal + tax
            }
            
            return {
              ...item,
              quantity: newQuantity,
              subtotal,
              tax,
              total
            }
          }
          return item
        })
      } else {
        // Add new item
        // Coerce price to number to avoid string concatenation
        const unitPrice = parseFloat(product.price)
        
        // Normalize tax rate: convert percentage to decimal
        const ratePct = parseFloat(product.tax_rate ?? 15)
        const rate = ratePct / 100
        
        let subtotal, tax, total
        
        if (product.tax_included) {
          // Tax is included in price: derive base price and tax
          const priceWithTax = unitPrice
          subtotal = priceWithTax / (1 + rate)
          tax = priceWithTax - subtotal
          total = priceWithTax
        } else {
          // Tax is added on top of price
          subtotal = unitPrice
          tax = subtotal * rate
          total = subtotal + tax
        }
        
        return [...prevCart, {
          product,
          quantity: 1,
          subtotal,
          tax,
          total
        }]
      }
    })
  }

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product.public_id !== productId))
  }

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prevCart => prevCart.map(item => {
      if (item.product.public_id === productId) {
        // Coerce price to number to avoid string concatenation
        const unitPrice = parseFloat(item.product.price)
        
        // Normalize tax rate: convert percentage to decimal
        const ratePct = parseFloat(item.product.tax_rate ?? 15)
        const rate = ratePct / 100
        
        let subtotal, tax, total
        
        if (item.product.tax_included) {
          // Tax is included in price: derive base price and tax
          const priceWithTax = unitPrice * newQuantity
          subtotal = priceWithTax / (1 + rate)
          tax = priceWithTax - subtotal
          total = priceWithTax
        } else {
          // Tax is added on top of price
          subtotal = unitPrice * newQuantity
          tax = subtotal * rate
          total = subtotal + tax
        }
        
        return {
          ...item,
          quantity: newQuantity,
          subtotal,
          tax,
          total
        }
      }
      return item
    }))
  }

  const clearCart = () => {
    setCart([])
    setShowCheckout(false)
  }

  const calculateCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const tax = cart.reduce((sum, item) => sum + item.tax, 0)
    const total = cart.reduce((sum, item) => sum + item.total, 0)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    return { subtotal, tax, total, itemCount }
  }

  // Product Filtering (using debounced search)
  const filteredProducts = products.filter(product => {
    // Filter by category
    if (selectedCategory && product.category_id !== selectedCategory) {
      return false
    }

    // Filter by debounced search query
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      const matchesName = product.name?.toLowerCase().includes(query)
      const matchesNameAr = product.name_ar?.toLowerCase().includes(query)
      const matchesSku = product.sku?.toLowerCase().includes(query)
      
      if (!matchesName && !matchesNameAr && !matchesSku) {
        return false
      }
    }

    // Only show active products
    return product.status === 'active'
  })

  // Checkout Flow
  const handleCheckout = () => {
    if (cart.length === 0) {
      return
    }
    setShowCheckout(true)
  }

  const handleCheckoutComplete = (saleData, options = {}) => {
    // Clear cart
    clearCart()
    
    // Reset loyalty discount
    setLoyaltyDiscount(0)
    
    // Show success message
    // (You can add a toast notification here)
    
    // Handle receipt action if specified
    if (options.action === 'preview') {
      setSelectedSaleForReceipt(saleData)
      setShowReceiptPreview(true)
    }
    
    // Close checkout modal
    setShowCheckout(false)
    
    // Note: print and email actions are handled in CheckoutModal
  }

  const handleLogout = () => {
    managerLogout()
    navigate('/branch-manager-login')
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden" dir={i18n.dir()}>
      {/* SEO Component */}
      <SEO title={t('title')} description={t('description')} noindex={true} />
      
      {/* Header Bar */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4">
          {/* Branch Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {t('header.pos')}
            </h1>
            {branchInfo && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {branchInfo.branchName || t('header.branch')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-red-500/50"
              aria-label={t('header.logout')}
            >
              {t('header.logout')}
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content - Split Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Product Grid (60% on desktop) */}
        <div 
          ref={productsContainerRef}
          className="flex-1 lg:w-3/5 overflow-y-auto"
        >
          {/* Sticky Filter Bar with Scroll Shadow */}
          <div className={`sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 transition-shadow ${
            isScrolled ? 'shadow-md' : ''
          }`}>
            <div className="p-4 pb-0">
              {/* Category Filter Tabs - Scrollable */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors text-sm font-medium ${
                    selectedCategory === null
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('categories.all')}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.public_id}
                    onClick={() => setSelectedCategory(cat.public_id)}
                    className={`px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors text-sm font-medium ${
                      selectedCategory === cat.public_id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {i18n.language === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
                  </button>
                ))}
              </div>
              
              {/* Search Bar with Clear Button */}
              <div className="relative mb-3">
                <input 
                  type="search" 
                  placeholder={t('products.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={t('products.clearSearch')}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Product Grid Component - Scrollable Content */}
          <div className="p-4 pt-2">
            <ProductGrid 
              products={filteredProducts}
              onAddToCart={addToCart}
              loading={loading}
            />
          </div>
        </div>
        
        {/* Right Side: Cart (40% on desktop, bottom sheet on mobile) */}
        <div className="h-[45vh] lg:h-full lg:w-2/5 bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700">
          <POSCart 
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onCheckout={handleCheckout}
            totals={calculateCartTotals()}
            loyaltyDiscount={loyaltyDiscount}
          />
        </div>
      </div>
      
      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal 
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          cart={cart}
          totals={calculateCartTotals()}
          onComplete={handleCheckoutComplete}
          branchInfo={branchInfo}
          onLoyaltyDiscountChange={setLoyaltyDiscount}
        />
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && selectedSaleForReceipt && (
        <ReceiptPreviewModal
          isOpen={showReceiptPreview}
          onClose={() => {
            setShowReceiptPreview(false)
            setSelectedSaleForReceipt(null)
          }}
          saleId={selectedSaleForReceipt.public_id}
        />
      )}
    </div>
  )
}
