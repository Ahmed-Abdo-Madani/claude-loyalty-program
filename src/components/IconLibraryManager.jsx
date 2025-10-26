import React, { useState, useEffect } from 'react'
import { apiBaseUrl, endpoints } from '../config/api'

/**
 * Icon Library Manager Component
 * Allows super admins to manage stamp icons
 */
const IconLibraryManager = () => {
  // State management
  const [icons, setIcons] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Get auth headers from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminAccessToken')
    const sessionToken = localStorage.getItem('adminSessionToken')
    
    return {
      'Authorization': `Bearer ${token}`,
      'X-Session-Token': sessionToken
    }
  }

  // Fetch icons from API
  const fetchIcons = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch icons from existing stamp-icons endpoint
      const response = await fetch(endpoints.stampIcons, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        // Parse error response
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || `Failed to fetch icons (${response.status})`
        console.error('Server error:', { status: response.status, data: errorData })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Fetched icons data:', data)
      
      // Guard against missing data with strict Array.isArray checks
      // Support both flat and nested API shapes to avoid crashes
      const icons = Array.isArray(data.icons) 
        ? data.icons 
        : Array.isArray(data.data?.icons) 
          ? data.data.icons 
          : []
      
      const categories = Array.isArray(data.categories) 
        ? data.categories 
        : Array.isArray(data.data?.categories) 
          ? data.data.categories 
          : []
      
      console.log('Normalized data:', { iconsCount: icons.length, categoriesCount: categories.length })
      
      setIcons(icons)
      setCategories(categories)
    } catch (err) {
      console.error('Error fetching icons:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch icons on component mount
  useEffect(() => {
    fetchIcons()
  }, [])

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Handle icon upload
  const handleUploadIcon = async (formData) => {
    try {
      setUploadProgress({ status: 'uploading', percent: 0 })

      const response = await fetch(endpoints.adminIcons, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed')
      }

      setUploadProgress({ status: 'complete', percent: 100 })
      // Show generated ID in success message
      const generatedId = data.data?.id || 'unknown'
      setSuccessMessage(`Icon uploaded successfully! Generated ID: ${generatedId}`)
      setShowUploadModal(false)
      await fetchIcons() // Refresh list
    } catch (err) {
      console.error('Error uploading icon:', err)
      setUploadProgress({ status: 'error', message: err.message })
      setError(err.message)
    }
  }

  // Handle icon update
  const handleUpdateIcon = async (iconId, formData) => {
    try {
      setUploadProgress({ status: 'uploading', percent: 0 })

      const response = await fetch(`${endpoints.adminIcons}/${iconId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Update failed')
      }

      setUploadProgress({ status: 'complete', percent: 100 })
      setSuccessMessage('Icon updated successfully!')
      setShowEditModal(false)
      setSelectedIcon(null)
      await fetchIcons() // Refresh list
    } catch (err) {
      console.error('Error updating icon:', err)
      setUploadProgress({ status: 'error', message: err.message })
      setError(err.message)
    }
  }

  // Handle icon deletion
  const handleDeleteIcon = async (iconId) => {
    if (!window.confirm('Are you sure you want to delete this icon? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${endpoints.adminIcons}/${iconId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Delete failed')
      }

      setSuccessMessage('Icon deleted successfully!')
      await fetchIcons() // Refresh list
    } catch (err) {
      console.error('Error deleting icon:', err)
      setError(err.message)
    }
  }

  // Handle regenerate previews
  const handleRegeneratePreviews = async () => {
    if (!window.confirm('Regenerate all preview images? This may take a few moments.')) {
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(endpoints.adminIconsRegeneratePreviews, {
        method: 'POST',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Regeneration failed')
      }

      setSuccessMessage(`Regenerated ${data.data.successCount} of ${data.data.total} previews`)
      await fetchIcons() // Refresh list
    } catch (err) {
      console.error('Error regenerating previews:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle add category
  const handleAddCategory = async (categoryData) => {
    try {
      setLoading(true)
      
      const response = await fetch(endpoints.adminIconsCategories, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add category')
      }

      setSuccessMessage('Category added successfully!')
      setShowCategoryModal(false)
      await fetchIcons() // Refresh list (includes categories)
    } catch (err) {
      console.error('Error adding category:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter icons by category and search
  const filterIcons = () => {
    let filtered = icons

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(icon => icon.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(icon => 
        icon.name.toLowerCase().includes(query) ||
        icon.id.toLowerCase().includes(query) ||
        (icon.description && icon.description.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  const filteredIcons = filterIcons()

  return (
    <div className="icon-library-manager">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Icon Library - مكتبة الأيقونات
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage stamp icons for loyalty cards
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            disabled={loading}
          >
            🏷️ Manage Categories
          </button>
          <button
            onClick={handleRegeneratePreviews}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            disabled={loading}
          >
            🔄 Regenerate Previews
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            ➕ Upload Icon
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-green-600 text-xl mr-3">✓</span>
            <span className="text-green-800">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠</span>
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
          <button
            onClick={() => fetchIcons()}
            className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category - الفئة
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories - جميع الفئات</option>
              {(categories || []).map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search - بحث
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredIcons.length} of {icons.length} icons
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading icons...</p>
        </div>
      )}

      {/* Icons Grid */}
      {!loading && filteredIcons.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredIcons.map(icon => (
            <IconCard
              key={icon.id}
              icon={icon}
              onEdit={() => {
                setSelectedIcon(icon)
                setShowEditModal(true)
              }}
              onDelete={() => handleDeleteIcon(icon.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredIcons.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Icons Found</h3>
          <p className="text-gray-600">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first icon to get started'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadIconModal
          categories={categories}
          onClose={() => {
            setShowUploadModal(false)
            setUploadProgress(null)
          }}
          onSubmit={handleUploadIcon}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedIcon && (
        <EditIconModal
          icon={selectedIcon}
          categories={categories}
          onClose={() => {
            setShowEditModal(false)
            setSelectedIcon(null)
            setUploadProgress(null)
          }}
          onSubmit={handleUpdateIcon}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onSubmit={handleAddCategory}
        />
      )}
    </div>
  )
}

/**
 * Icon Card Component
 */
const IconCard = ({ icon, onEdit, onDelete }) => {
  const [imageError, setImageError] = useState(false)
  const previewUrl = `${apiBaseUrl}/api/stamp-icons/${icon.id}/preview`

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Preview Image */}
      <div className="flex justify-center mb-3">
        {!imageError ? (
          <img
            src={previewUrl}
            alt={icon.name}
            className="w-12 h-12 object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center text-3xl">
            🎨
          </div>
        )}
      </div>

      {/* Icon Info */}
      <div className="text-center mb-3">
        <h4 className="font-medium text-gray-900 truncate" title={icon.name}>
          {icon.name}
        </h4>
        <p className="text-xs text-gray-500 mt-1">{icon.id}</p>
      </div>

      {/* Category Badge */}
      <div className="flex justify-center mb-3">
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
          {icon.category}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          ✏️ Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}

/**
 * Upload Icon Modal Component
 */
const UploadIconModal = ({ categories, onClose, onSubmit, uploadProgress }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: categories[0]?.id || '',
    description: ''
  })
  const [files, setFiles] = useState({
    filled: null,
    stroke: null
  })
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}

    // Validate name
    if (!formData.name) {
      newErrors.name = 'Icon name is required'
    }

    // Validate category
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    // Validate files
    if (!files.filled) {
      newErrors.filled = 'Filled variant SVG is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const data = new FormData()
    // ID is auto-generated server-side from name
    data.append('name', formData.name)
    data.append('category', formData.category)
    data.append('description', formData.description)

    if (files.filled) {
      data.append('filled', files.filled)
    }
    if (files.stroke) {
      data.append('stroke', files.stroke)
    }

    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Upload New Icon - رفع أيقونة جديدة
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={uploadProgress?.status === 'uploading'}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Icon Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Icon Name * (ID will be auto-generated)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Coffee Cup"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            <p className="text-xs text-gray-500 mt-1">
              A unique ID will be automatically generated from the name
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {(categories || []).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Optional description..."
            />
          </div>

          {/* Filled Variant File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filled Variant SVG *
            </label>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(e) => setFiles({ ...files, filled: e.target.files[0] })}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.filled ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.filled && <p className="text-red-600 text-sm mt-1">{errors.filled}</p>}
            <p className="text-xs text-gray-500 mt-1">Maximum 500KB</p>
          </div>

          {/* Stroke Variant File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stroke Variant SVG (Optional)
            </label>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(e) => setFiles({ ...files, stroke: e.target.files[0] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum 500KB</p>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-3 bg-gray-50 rounded-lg">
              {uploadProgress.status === 'uploading' && (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-sm text-gray-700">Uploading...</span>
                </div>
              )}
              {uploadProgress.status === 'error' && (
                <div className="text-red-600 text-sm">
                  Error: {uploadProgress.message}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={uploadProgress?.status === 'uploading'}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploadProgress?.status === 'uploading'}
            >
              {uploadProgress?.status === 'uploading' ? 'Uploading...' : 'Upload Icon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Edit Icon Modal Component
 */
const EditIconModal = ({ icon, categories, onClose, onSubmit, uploadProgress }) => {
  const [formData, setFormData] = useState({
    name: icon.name,
    category: icon.category,
    description: icon.description || ''
  })
  const [files, setFiles] = useState({
    filled: null,
    stroke: null
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    const data = new FormData()
    data.append('name', formData.name)
    data.append('category', formData.category)
    data.append('description', formData.description)

    if (files.filled) {
      data.append('filled', files.filled)
    }
    if (files.stroke) {
      data.append('stroke', files.stroke)
    }

    onSubmit(icon.id, data)
  }

  const previewUrl = `${apiBaseUrl}/uploads/icons/stamps/previews/${icon.id}.png`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Edit Icon - تعديل الأيقونة
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={uploadProgress?.status === 'uploading'}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Icon Preview */}
          <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <img
                src={previewUrl}
                alt={icon.name}
                className="w-20 h-20 object-contain mx-auto mb-2"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="32">🎨</text></svg>'
                }}
              />
              <p className="text-sm text-gray-600">ID: {icon.id}</p>
            </div>
          </div>

          {/* Icon Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Icon Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {(categories || []).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
          </div>

          {/* Replace Filled Variant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Replace Filled Variant SVG (Optional)
            </label>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(e) => setFiles({ ...files, filled: e.target.files[0] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Only upload if replacing existing file</p>
          </div>

          {/* Replace Stroke Variant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Replace Stroke Variant SVG (Optional)
            </label>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(e) => setFiles({ ...files, stroke: e.target.files[0] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Only upload if replacing existing file</p>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="p-3 bg-gray-50 rounded-lg">
              {uploadProgress.status === 'uploading' && (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-sm text-gray-700">Updating...</span>
                </div>
              )}
              {uploadProgress.status === 'error' && (
                <div className="text-red-600 text-sm">
                  Error: {uploadProgress.message}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={uploadProgress?.status === 'uploading'}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploadProgress?.status === 'uploading'}
            >
              {uploadProgress?.status === 'uploading' ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Category Management Modal Component
 */
const CategoryModal = ({ categories, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: ''
    // ID and order will be auto-generated server-side
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors = {}

    // Validate name
    if (!formData.name) {
      newErrors.name = 'Category name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Send only name; backend will generate ID from name and auto-assign order
      await onSubmit({ name: formData.name })
      // Modal will be closed by parent on success
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Manage Categories - إدارة الفئات
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Existing Categories List */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Existing Categories ({(categories || []).length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {(categories || []).map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <span className="font-medium text-gray-900">{cat.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({cat.id})</span>
                  </div>
                  <span className="text-xs text-gray-500">Order: {cat.order}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Category Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Add New Category
              </h4>
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name * (ID and order will be auto-generated)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Automotive"
                  disabled={isSubmitting}
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  A unique ID will be automatically generated from the name
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default IconLibraryManager
