import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'
import ProductModal from './ProductModal'
import StatusBadge from './StatusBadge'
import QRCodeModal from './QRCodeModal'
import { getSecureBusinessId } from '../utils/secureAuth'
import {
  MagnifyingGlassIcon, FunnelIcon, PlusIcon,
  TrashIcon, PencilSquareIcon, DocumentDuplicateIcon,
  Squares2X2Icon, TableCellsIcon, ArchiveBoxIcon,
  TagIcon, CurrencyDollarIcon, EllipsisVerticalIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'

export default function ProductsTab({ demoData, onAddProduct }) {
  const { t, i18n } = useTranslation('dashboard')

  // State Management
  const [products, setProducts] = useState(demoData || [])
  const [categories, setCategories] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(!demoData)
  const [error, setError] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showMenuQRModal, setShowMenuQRModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [filters, setFilters] = useState({
    status: 'all',
    categoryId: 'all',
    branchId: 'all',
    search: ''
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [expandedProductId, setExpandedProductId] = useState(null)
  const [viewMode, setViewMode] = useState('auto') // auto, mobile, tablet, desktop

  // Detect view mode based on viewport
  useEffect(() => {
    const updateViewMode = () => {
      const width = window.innerWidth
      if (width < 768) setViewMode('mobile')
      else if (width < 1024) setViewMode('tablet')
      else setViewMode('desktop')
    }

    updateViewMode()
    window.addEventListener('resize', updateViewMode)
    return () => window.removeEventListener('resize', updateViewMode)
  }, [])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Data Loading Functions
  useEffect(() => {
    if (!demoData) {
      loadCategories()
      loadBranches()
    } else {
      setCategories([{ public_id: 'demo-cat', name: 'General (Demo)', product_count: (demoData?.length || 0) }])
      setBranches([{ public_id: 'demo-branch', name: 'Main Branch (Demo)' }])
    }
  }, [demoData])

  // Load products when filters change (using debounced search)
  useEffect(() => {
    if (!demoData) {
      loadProducts()
    }
  }, [filters.status, filters.categoryId, filters.branchId, debouncedSearch, demoData])

  const loadProducts = async () => {
    try {
      setLoading(true)

      // Build query params from filters (omit 'all' values)
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.categoryId !== 'all') params.append('category_id', filters.categoryId)
      if (filters.branchId !== 'all') {
        if (filters.branchId === null) {
          params.append('branch_id', 'null')
        } else {
          params.append('branch_id', filters.branchId)
        }
      }
      if (debouncedSearch) params.append('search', debouncedSearch)

      const queryString = params.toString()
      const url = queryString ? `${endpoints.posProducts}?${queryString}` : endpoints.posProducts

      const res = await secureApi.get(url)
      const response = await res.json()
      if (response.success) {
        setProducts(response.products || [])
        console.log('✅ Products loaded:', response.products?.length)
      } else {
        setError(t('products.messages.errorLoading'))
      }
    } catch (err) {
      console.error('❌ Failed to load products:', err)
      setError(t('products.messages.errorLoading'))
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await secureApi.get(endpoints.posCategories)
      const response = await res.json()
      if (response.success) {
        setCategories(response.categories || [])
        console.log('✅ Categories loaded:', response.categories?.length)
      }
    } catch (err) {
      console.error('❌ Failed to load categories:', err)
    }
  }

  const loadBranches = async () => {
    try {
      const res = await secureApi.get(endpoints.myBranches)
      const response = await res.json()
      if (response.success) {
        setBranches(response.branches || [])
        console.log('✅ Branches loaded:', response.branches?.length)
      }
    } catch (err) {
      console.error('❌ Failed to load branches:', err)
    }
  }

  // CRUD Operations
  const handleSaveProduct = async (productData) => {
    try {
      const isEdit = !!productData.public_id
      const endpoint = isEdit
        ? endpoints.posProductUpdate(productData.public_id)
        : endpoints.posProducts

      const res = isEdit
        ? await secureApi.put(endpoint, productData)
        : await secureApi.post(endpoint, productData)
      const response = await res.json()

      if (response.success) {
        console.log('✅ Product saved:', response.product)
        await loadProducts()
        setShowProductModal(false)
        setSelectedProduct(null)
      } else {
        console.error('❌ Save failed:', response.error)
        throw new Error(response.error || t('products.messages.errorSaving'))
      }
    } catch (err) {
      console.error('❌ Failed to save product:', err)
      throw err
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    try {
      const res = await secureApi.delete(
        endpoints.posProductDelete(selectedProduct.public_id)
      )
      const response = await res.json()

      if (response.success) {
        console.log('✅ Product deleted')
        await loadProducts()
        setShowDeleteModal(false)
        setSelectedProduct(null)
      } else {
        console.error('❌ Delete failed:', response.error)
        alert(response.error || t('products.messages.errorDeleting'))
      }
    } catch (err) {
      console.error('❌ Failed to delete product:', err)
      alert(t('products.messages.errorDeleting'))
    }
  }

  const handleToggleStatus = async (productId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const res = await secureApi.patch(
        endpoints.posProductStatus(productId),
        { status: newStatus }
      )
      const response = await res.json()

      if (response.success) {
        // Optimistic update
        setProducts(products.map(p =>
          p.public_id === productId ? { ...p, status: newStatus } : p
        ))
      } else {
        console.error('❌ Status update failed:', response.error)
      }
    } catch (err) {
      console.error('❌ Failed to update status:', err)
    }
  }

  const handleDuplicateProduct = (product) => {
    const duplicatedProduct = {
      ...product,
      public_id: null,
      name: `${product.name} (Copy)`,
      sku: null // Clear SKU for duplicate
    }
    setSelectedProduct(duplicatedProduct)
    setShowProductModal(true)
  }

  // Category Management Functions
  const handleSaveCategory = async (categoryData) => {
    try {
      const isEdit = !!categoryData.public_id
      const endpoint = isEdit
        ? endpoints.posCategoryUpdate(categoryData.public_id)
        : endpoints.posCategories

      const res = isEdit
        ? await secureApi.put(endpoint, categoryData)
        : await secureApi.post(endpoint, categoryData)
      const response = await res.json()

      if (response.success) {
        await loadCategories()
      } else {
        throw new Error(response.error)
      }
    } catch (err) {
      console.error('❌ Failed to save category:', err)
      alert(t('products.messages.errorCategorySaving'))
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm(t('products.categories.deleteConfirm'))) return

    try {
      const res = await secureApi.delete(
        endpoints.posCategoryDelete(categoryId)
      )
      const response = await res.json()

      if (response.success) {
        await loadCategories()
      } else {
        alert(response.error || t('products.categories.cannotDelete'))
      }
    } catch (err) {
      console.error('❌ Failed to delete category:', err)
      alert(t('products.messages.errorCategoryDeleting'))
    }
  }

  // Filtering Logic
  const filteredProducts = products.filter(product => {
    if (filters.status !== 'all' && product.status !== filters.status) return false
    if (filters.categoryId !== 'all' && product.category_id !== filters.categoryId) return false
    if (filters.branchId !== 'all') {
      if (filters.branchId === null) {
        if (product.branch_id !== null) return false
      } else {
        if (product.branch_id !== null && product.branch_id !== filters.branchId) return false
      }
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesName = product.name?.toLowerCase().includes(searchLower)
      const matchesNameAr = product.name_ar?.toLowerCase().includes(searchLower)
      const matchesSku = product.sku?.toLowerCase().includes(searchLower)
      if (!matchesName && !matchesNameAr && !matchesSku) return false
    }
    return true
  })

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue, bValue
    switch (sortColumn) {
      case 'name':
        aValue = a.name?.toLowerCase() || ''
        bValue = b.name?.toLowerCase() || ''
        break
      case 'price':
        aValue = parseFloat(a.price) || 0
        bValue = parseFloat(b.price) || 0
        break
      case 'sku':
        aValue = a.sku?.toLowerCase() || ''
        bValue = b.sku?.toLowerCase() || ''
        break
      case 'category':
        const catA = categories.find(c => c.public_id === a.category_id)
        const catB = categories.find(c => c.public_id === b.category_id)
        aValue = catA?.name?.toLowerCase() || 'zzz'
        bValue = catB?.name?.toLowerCase() || 'zzz'
        break
      case 'status':
        aValue = a.status || ''
        bValue = b.status || ''
        break
      default:
        aValue = a[sortColumn] || ''
        bValue = b[sortColumn] || ''
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Stats
  const stats = [
    {
      label: t('products.stats.totalProducts'),
      value: products.length,
      icon: ArchiveBoxIcon,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10'
    },
    {
      label: t('products.stats.activeProducts'),
      value: products.filter(p => p.status === 'active').length,
      icon: TagIcon,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/10'
    },
    {
      label: t('products.stats.categories'),
      value: categories.length,
      icon: Squares2X2Icon,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10'
    },
    {
      label: t('products.stats.outOfStock'),
      value: products.filter(p => p.status === 'out_of_stock').length,
      icon: ArchiveBoxIcon, // Or a warning icon
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/10'
    }
  ]

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('products.loading') || 'Loading Products...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">🛍️</span>
            {t('products.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 md:mt-2 text-sm md:text-lg">
            {t('products.manageProducts')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <Squares2X2Icon className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{t('products.manageCategories')}</span>
            <span className="sm:hidden">Categories</span>
          </button>
          <button
            onClick={() => setShowMenuQRModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <QrCodeIcon className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{t('products.generateMenuQR')}</span>
            <span className="sm:hidden">Menu QR</span>
          </button>
          <button
            onClick={() => {
              if (onAddProduct) {
                onAddProduct()
              } else {
                setSelectedProduct(null)
                setShowProductModal(true)
              }
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5"
          >
            <PlusIcon className="w-5 h-5" />
            {t('products.addProduct')}
          </button>
        </div>
      </div>

      {/* Modern Stats Cards - 2 cols on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="relative overflow-hidden bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 group transition-all duration-300 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600">
            <div className={`absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 -mr-4 -mt-4 md:-mr-6 md:-mt-6 rounded-full opacity-10 bg-gradient-to-br ${stat.color} transition-transform group-hover:scale-110 duration-500`}></div>
            <div className="relative flex flex-col md:flex-row md:justify-between md:items-start gap-2">
              <div className="order-2 md:order-1">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 md:mb-1">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
              </div>
              <div className={`order-1 md:order-2 self-start p-2 md:p-3 rounded-xl ${stat.bgColor} ${stat.textColor}`}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Controls Bar - Improved Mobile Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-5 transition-all duration-300">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 justify-between items-start lg:items-center">
          {/* Enhanced Search */}
          <div className="relative w-full lg:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none text-sm md:text-base"
            />
          </div>

          {/* Filters Group - Grid on Mobile */}
          <div className="w-full lg:w-auto grid grid-cols-[1fr,1fr,auto] md:flex md:flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
              <TagIcon className="w-4 h-4 text-gray-500 hidden md:block" />
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="bg-transparent dark:bg-gray-800 border-none text-sm font-medium focus:ring-0 p-0 text-gray-700 dark:text-gray-200 cursor-pointer w-full md:w-32"
              >
                <option value="all" className="dark:bg-gray-800">{t('products.filters.allCategories')}</option>
                {categories.map(cat => (
                  <option key={cat.public_id} value={cat.public_id} className="dark:bg-gray-800">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
              <FunnelIcon className="w-4 h-4 text-gray-500 hidden md:block" />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="bg-transparent dark:bg-gray-800 border-none text-sm font-medium focus:ring-0 p-0 text-gray-700 dark:text-gray-200 cursor-pointer w-full"
              >
                <option value="all" className="dark:bg-gray-800">{t('products.filters.allStatus')}</option>
                <option value="active" className="dark:bg-gray-800">{t('products.filters.active')}</option>
                <option value="inactive" className="dark:bg-gray-800">{t('products.filters.inactive')}</option>
                <option value="out_of_stock" className="dark:bg-gray-800">{t('products.filters.outOfStock')}</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1.5 gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode !== 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {sortedProducts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-16 text-center">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {products.length === 0 ? t('products.noProductsFound') : t('products.noProductsFound')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {products.length === 0 ? t('products.noProductsDesc') : t('products.tryAdjustingFilters')}
          </p>
          {products.length === 0 && (
            <button
              onClick={() => {
                setSelectedProduct(null)
                setShowProductModal(true)
              }}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20 transform hover:-translate-y-1"
            >
              ➕ {t('products.addProduct')}
            </button>
          )}
        </div>
      ) : viewMode === 'mobile' ? (
        // Mobile List View with Cards - Optimized
        <div className="grid grid-cols-1 gap-3">
          {sortedProducts.map(product => (
            <ProductListView
              key={product.public_id}
              product={product}
              categories={categories}
              branches={branches}
              viewMode="mobile"
              isExpanded={expandedProductId === product.public_id}
              onToggleExpand={() => setExpandedProductId(
                expandedProductId === product.public_id ? null : product.public_id
              )}
              onEdit={() => {
                setSelectedProduct(product)
                setShowProductModal(true)
              }}
              onDuplicate={() => handleDuplicateProduct(product)}
              onToggleStatus={() => handleToggleStatus(product.public_id, product.status)}
              onDelete={() => {
                setSelectedProduct(product)
                setShowDeleteModal(true)
              }}
              t={t}
              i18n={i18n}
            />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        // Desktop Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProducts.map(product => (
            <ProductListView
              key={product.public_id}
              product={product}
              categories={categories}
              branches={branches}
              viewMode="grid"
              isExpanded={expandedProductId === product.public_id}
              onToggleExpand={() => setExpandedProductId(
                expandedProductId === product.public_id ? null : product.public_id
              )}
              onEdit={() => {
                setSelectedProduct(product)
                setShowProductModal(true)
              }}
              onDuplicate={() => handleDuplicateProduct(product)}
              onToggleStatus={() => handleToggleStatus(product.public_id, product.status)}
              onDelete={() => {
                setSelectedProduct(product)
                setShowDeleteModal(true)
              }}
              t={t}
              i18n={i18n}
            />
          ))}
        </div>
      ) : (
        // Desktop Table View (keep as is)
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('products.table.columns.image')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      {t('products.table.columns.name')}
                      {sortColumn === 'name' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {viewMode === 'desktop' && (
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('products.table.columns.sku')}
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-1">
                      {t('products.table.columns.price')}
                      {sortColumn === 'price' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('products.table.columns.category')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('products.table.columns.branch')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('products.table.columns.status')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('products.table.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {sortedProducts.map(product => (
                  <ProductListView
                    key={product.public_id}
                    product={product}
                    categories={categories}
                    branches={branches}
                    viewMode={viewMode}
                    onEdit={() => {
                      setSelectedProduct(product)
                      setShowProductModal(true)
                    }}
                    onDuplicate={() => handleDuplicateProduct(product)}
                    onToggleStatus={() => handleToggleStatus(product.public_id, product.status)}
                    onDelete={() => {
                      setSelectedProduct(product)
                      setShowDeleteModal(true)
                    }}
                    t={t}
                    i18n={i18n}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false)
            setSelectedProduct(null)
          }}
          onSave={handleSaveProduct}
          product={selectedProduct}
          categories={categories}
          branches={branches}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          categories={categories}
          onSave={handleSaveCategory}
          onDelete={handleDeleteCategory}
          t={t}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedProduct(null)
          }}
          onConfirm={handleDeleteProduct}
          productName={selectedProduct?.name}
          t={t}
        />
      )}

      {/* Menu QR Code Modal */}
      {showMenuQRModal && (
        <QRCodeModal
          type="menu"
          identifier={getSecureBusinessId()}
          onClose={() => setShowMenuQRModal(false)}
        />
      )}
    </div>
  )
}

// Product List View Component (Responsive Hybrid)
function ProductListView({ product, categories, branches, viewMode, isExpanded, onToggleExpand, onEdit, onDuplicate, onToggleStatus, onDelete, t, i18n }) {
  const category = categories.find(c => c.public_id === product.category_id)
  const branch = branches.find(b => b.public_id === product.branch_id)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  // Mobile/Grid View - Card Style
  if (viewMode === 'mobile' || viewMode === 'grid') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all active:scale-[0.99] h-fit">
        <div
          className="flex items-center gap-4 p-4 cursor-pointer"
          onClick={onToggleExpand}
        >
          {/* Product Image */}
          <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700/50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-600">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ArchiveBoxIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">
                {product.name}
              </h3>
            </div>
            {product.name_ar && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.name_ar}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {parseFloat(product.price).toFixed(2)} {t('common.sar')}
              </span>
              <StatusBadge
                status={product.status}
                statusLabels={{
                  active: t('products.filters.active'),
                  inactive: t('products.filters.inactive'),
                  out_of_stock: t('products.filters.outOfStock')
                }}
              />
            </div>
          </div>

          <button
            className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
            <span className={`block transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>

        {/* Expanded Details */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 pt-0 space-y-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-4 text-sm">
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider font-semibold mb-0.5">{t('products.table.columns.category')}</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {category ? (i18n.language === 'ar' && category.name_ar ? category.name_ar : category.name) : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider font-semibold mb-0.5">{t('products.card.sku')}</span>
                <span className="text-gray-900 dark:text-white font-medium">{product.sku || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider font-semibold mb-0.5">{t('products.card.tax')}</span>
                <span className="text-gray-900 dark:text-white font-medium">{product.tax_rate}%</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wider font-semibold mb-0.5">{t('products.table.columns.branch')}</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {branch ? (i18n.language === 'ar' && branch.name_ar ? branch.name_ar : branch.name) : t('products.card.allBranches')}
                </span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors"
              >
                <PencilSquareIcon className="w-4 h-4" />
                {t('products.card.edit')}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
                {t('products.card.duplicate')}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-colors ${product.status === 'active'
                  ? 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100'
                  : 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100'
                  }`}
              >
                {product.status === 'active' ? (
                  <>⏸️ {t('products.card.deactivate')}</>
                ) : (
                  <>▶️ {t('products.card.activate')}</>
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 shadow-sm transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                {t('products.card.delete')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop Table Row
  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700/50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-600">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ArchiveBoxIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-bold text-gray-900 dark:text-white">
          {product.name}
        </div>
        {product.name_ar && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {product.name_ar}
          </div>
        )}
      </td>
      {viewMode === 'desktop' && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-medium">
          {product.sku || '-'}
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-primary">
          {parseFloat(product.price).toFixed(2)} {t('common.sar')}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {category ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {i18n.language === 'ar' && category.name_ar ? category.name_ar : category.name}
          </span>
        ) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {branch ? (i18n.language === 'ar' && branch.name_ar ? branch.name_ar : branch.name) : (
          <span className="text-gray-400 italic">{t('products.card.allBranches')}</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge
          status={product.status}
          statusLabels={{
            active: t('products.filters.active'),
            inactive: t('products.filters.inactive'),
            out_of_stock: t('products.filters.outOfStock')
          }}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title={t('products.card.edit')}
          >
            <PencilSquareIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleStatus}
            className={`p-2 rounded-lg transition-colors ${product.status === 'active'
              ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
            title={product.status === 'active' ? t('products.card.deactivate') : t('products.card.activate')}
          >
            {product.status === 'active' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animation-scale-in">
                <button
                  onClick={() => { onDuplicate(); setShowActionsMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  {t('products.card.duplicate')}
                </button>
                <button
                  onClick={() => { onDelete(); setShowActionsMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  {t('products.card.delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// Category Modal Component - Redesigned
function CategoryModal({ isOpen, onClose, categories, onSave, onDelete, t }) {
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    display_order: 0
  })
  const [editingId, setEditingId] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      await onSave(editingId ? { ...formData, public_id: editingId } : formData)
      setFormData({ name: '', name_ar: '', description: '', display_order: 0 })
      setEditingId(null)
    } catch (err) {
      console.error('Failed to save category:', err)
    }
  }

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      name_ar: category.name_ar || '',
      description: category.description || '',
      display_order: category.display_order || 0
    })
    setEditingId(category.public_id)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Squares2X2Icon className="w-6 h-6 text-primary" />
              {t('products.categories.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('products.categories.manageDesc') || 'Manage your product categories'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              {editingId ? t('products.categories.editCategory') : t('products.categories.addCategory')}
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('products.categories.name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder={t('products.categories.namePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('products.categories.nameAr')}
                  </label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder={t('products.categories.nameArPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('products.categories.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder={t('products.categories.descriptionPlaceholder')}
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('products.categories.displayOrder')}
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  min="0"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-0.5"
                >
                  {editingId ? t('products.categories.update') || 'Update' : t('products.categories.add') || 'Add Category'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ name: '', name_ar: '', description: '', display_order: 0 })
                      setEditingId(null)
                    }}
                    className="px-6 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('products.modal.cancel')}
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>{t('products.categories.list')}</span>
              <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{categories.length} Total</span>
            </h4>

            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('products.categories.noCategories')}</p>
              </div>
            ) : (
              categories.map(category => (
                <div
                  key={category.public_id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold">
                      {category.display_order}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {category.name}
                        {category.name_ar && (
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            / {category.name_ar}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {category.product_count} {t('products.categories.productsCount', { count: category.product_count })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      title={t('common.edit')}
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(category.public_id)}
                      className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={category.product_count > 0}
                      title={category.product_count > 0 ? t('products.categories.cannotDelete') : t('common.delete')}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal - Redesigned
function DeleteConfirmModal({ isOpen, onClose, onConfirm, productName, t }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-0 overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrashIcon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('products.deleteConfirm.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            {t('products.deleteConfirm.message')}
            <br />
            <span className="font-bold text-gray-900 dark:text-white mt-1 block">"{productName}"</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-bold transition-colors"
            >
              {t('products.deleteConfirm.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-colors shadow-lg shadow-red-600/20"
            >
              {t('products.deleteConfirm.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
