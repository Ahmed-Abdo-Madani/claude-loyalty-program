import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'
import ProductModal from './ProductModal'
import CompactStatsBar from './CompactStatsBar'
import StatusBadge from './StatusBadge'

export default function ProductsTab() {
  const { t } = useTranslation('dashboard')
  
  // State Management
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [filters, setFilters] = useState({
    status: 'all',
    categoryId: 'all',
    branchId: 'all',
    search: ''
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Data Loading Functions
  useEffect(() => {
    loadCategories()
    loadBranches()
  }, [])

  // Load products when filters change (using debounced search)
  useEffect(() => {
    loadProducts()
  }, [filters.status, filters.categoryId, filters.branchId, debouncedSearch])

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
        // Show success message (you can add toast notification here)
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
        console.log('✅ Status updated')
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
        console.log('✅ Category saved')
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
        console.log('✅ Category deleted')
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
    // Status filter
    if (filters.status !== 'all' && product.status !== filters.status) {
      return false
    }
    
    // Category filter
    if (filters.categoryId !== 'all' && product.category_id !== filters.categoryId) {
      return false
    }
    
    // Branch filter
    if (filters.branchId !== 'all') {
      if (filters.branchId === null) {
        // Show only products available to all branches (branch_id is null)
        if (product.branch_id !== null) return false
      } else {
        // Show products for specific branch or all branches
        if (product.branch_id !== null && product.branch_id !== filters.branchId) {
          return false
        }
      }
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesName = product.name?.toLowerCase().includes(searchLower)
      const matchesNameAr = product.name_ar?.toLowerCase().includes(searchLower)
      const matchesSku = product.sku?.toLowerCase().includes(searchLower)
      
      if (!matchesName && !matchesNameAr && !matchesSku) {
        return false
      }
    }
    
    return true
  })

  // Stats Calculation
  const stats = [
    {
      label: t('products.stats.totalProducts'),
      value: products.length,
      icon: '🛍️'
    },
    {
      label: t('products.stats.activeProducts'),
      value: products.filter(p => p.status === 'active').length,
      icon: '✅'
    },
    {
      label: t('products.stats.totalCategories'),
      value: categories.length,
      icon: '📁'
    },
    {
      label: t('products.stats.outOfStock'),
      value: products.filter(p => p.status === 'out_of_stock').length,
      icon: '⚠️'
    }
  ]

  const clearFilters = () => {
    setFilters({
      status: 'all',
      categoryId: 'all',
      branchId: 'all',
      search: ''
    })
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🛍️ {t('products.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('products.manageProducts')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            📁 {t('products.manageCategories')}
          </button>
          <button
            onClick={() => {
              setSelectedProduct(null)
              setShowProductModal(true)
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
          >
            ➕ {t('products.addProduct')}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <CompactStatsBar stats={stats} />

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
                    <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="all">{t('products.filters.all')}</option>
            <option value="active">{t('products.filters.active')}</option>
            <option value="inactive">{t('products.filters.inactive')}</option>
            <option value="out_of_stock">{t('products.filters.outOfStock')}</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">{t('products.filters.allCategories')}</option>
            {categories.map(cat => (
              <option key={cat.public_id} value={cat.public_id}>
                {cat.name} ({cat.product_count})
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={filters.branchId === null ? 'null' : filters.branchId}
            onChange={(e) => setFilters({ 
              ...filters, 
              branchId: e.target.value === 'null' ? null : e.target.value 
            })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">{t('products.filters.allBranches')}</option>
            <option value="null">{t('products.card.allBranches')}</option>
            {branches.map(branch => (
              <option key={branch.public_id} value={branch.public_id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(filters.search || filters.status !== 'all' || filters.categoryId !== 'all' || filters.branchId !== 'all') && (
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              🔄 {t('products.filters.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {products.length === 0 ? t('products.noProductsFound') : t('products.noProductsFound')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {products.length === 0 ? t('products.noProductsDesc') : t('products.tryAdjustingFilters')}
          </p>
          {products.length === 0 && (
            <button
              onClick={() => {
                setSelectedProduct(null)
                setShowProductModal(true)
              }}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
            >
              ➕ {t('products.addProduct')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.public_id}
              product={product}
              categories={categories}
              branches={branches}
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
            />
          ))}
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
    </div>
  )
}

// Product Card Component
function ProductCard({ product, categories, branches, onEdit, onDuplicate, onToggleStatus, onDelete, t }) {
  const category = categories.find(c => c.public_id === product.category_id)
  const branch = branches.find(b => b.public_id === product.branch_id)
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4">
      {/* Product Image or Icon */}
      <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">🛍️</span>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {product.name}
          </h3>
          {product.name_ar && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {product.name_ar}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="text-lg font-bold text-primary">
          {parseFloat(product.price).toFixed(2)} {t('products.card.price')}
        </div>

        {/* Category & Branch */}
        <div className="flex flex-wrap gap-2">
          {category && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              📁 {category.name}
            </span>
          )}
          {branch ? (
            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
              🏪 {branch.name}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              🌐 {t('products.card.allBranches')}
            </span>
          )}
        </div>

        {/* SKU & Tax */}
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {product.sku && (
            <div>{t('products.card.sku')}: {product.sku}</div>
          )}
          <div>{t('products.card.tax')}: {product.tax_rate}%</div>
        </div>

        {/* Status Badge */}
        <StatusBadge 
          status={product.status} 
          statusLabels={{
            active: t('products.filters.active'),
            inactive: t('products.filters.inactive'),
            out_of_stock: t('products.filters.outOfStock')
          }}
        />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onEdit}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            ✏️ {t('products.card.edit')}
          </button>
          <button
            onClick={onDuplicate}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            📋 {t('products.card.duplicate')}
          </button>
          <button
            onClick={onToggleStatus}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              product.status === 'active'
                ? 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                : 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
            }`}
          >
            {product.status === 'active' ? '⏸️ ' + t('products.card.deactivate') : '▶️ ' + t('products.card.activate')}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            🗑️ {t('products.card.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Category Modal Component
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              📁 {t('products.categories.title')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Add/Edit Category Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.categories.name')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={t('products.categories.namePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.categories.nameAr')}
              </label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={t('products.categories.nameArPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.categories.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={t('products.categories.descriptionPlaceholder')}
                rows="2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.categories.displayOrder')}
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={t('products.categories.displayOrderPlaceholder')}
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
              >
                {editingId ? t('products.categories.editCategory') : t('products.categories.addCategory')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ name: '', name_ar: '', description: '', display_order: 0 })
                    setEditingId(null)
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  {t('products.modal.cancel')}
                </button>
              )}
            </div>
          </form>

          {/* Categories List */}
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📁</div>
              <p>{t('products.categories.noCategories')}</p>
              <p className="text-sm">{t('products.categories.noCategoriesDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => (
                <div
                  key={category.public_id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {category.name}
                      {category.name_ar && (
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          ({category.name_ar})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {category.product_count} {t('products.categories.productsCount', { count: category.product_count })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1 text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(category.public_id)}
                      className="px-3 py-1 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                      disabled={category.product_count > 0}
                      title={category.product_count > 0 ? t('products.categories.cannotDelete') : ''}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
function DeleteConfirmModal({ isOpen, onClose, onConfirm, productName, t }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('products.deleteConfirm.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {t('products.deleteConfirm.message')}
        </p>
        <p className="font-medium text-gray-900 dark:text-white mb-4">
          "{productName}"
        </p>
        <p className="text-sm text-orange-600 dark:text-orange-400 mb-6">
          {t('products.deleteConfirm.warning')}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            {t('products.deleteConfirm.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            {t('products.deleteConfirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
