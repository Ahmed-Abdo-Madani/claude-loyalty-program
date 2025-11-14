import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function ProductModal({ isOpen, onClose, onSave, product, categories, branches }) {
  const { t } = useTranslation('dashboard')
  
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    price: '',
    cost: '',
    sku: '',
    category_id: '',
    branch_id: '',
    tax_rate: '15.00',
    tax_included: true,
    status: 'active',
    image_url: '',
    display_order: 0
  })
  
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        name_ar: product.name_ar || '',
        description: product.description || '',
        price: product.price || '',
        cost: product.cost || '',
        sku: product.sku || '',
        category_id: product.category_id || '',
        branch_id: product.branch_id || '',
        tax_rate: product.tax_rate || '15.00',
        tax_included: product.tax_included || false,
        status: product.status || 'active',
        image_url: product.image_url || '',
        display_order: product.display_order || 0
      })
    } else {
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        price: '',
        cost: '',
        sku: '',
        category_id: '',
        branch_id: '',
        tax_rate: '15.00',
        tax_included: true,
        status: 'active',
        image_url: '',
        display_order: 0
      })
    }
    setErrors({})
  }, [product, isOpen])

  // Validation
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = t('products.modal.validation.nameRequired')
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = t('products.modal.validation.pricePositive')
    }
    
    if (formData.tax_rate && (parseFloat(formData.tax_rate) < 0 || parseFloat(formData.tax_rate) > 100)) {
      newErrors.tax_rate = t('products.modal.validation.taxRateRange')
    }
    
    if (formData.display_order && parseInt(formData.display_order) < 0) {
      newErrors.display_order = t('products.modal.validation.displayOrderPositive')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Calculate price with/without tax
  const calculateTaxDisplay = () => {
    const price = parseFloat(formData.price) || 0
    const taxRate = parseFloat(formData.tax_rate) || 0
    
    if (formData.tax_included) {
      const priceWithoutTax = price / (1 + taxRate / 100)
      return {
        label: t('products.modal.priceExcludingTax'),
        value: priceWithoutTax.toFixed(2)
      }
    } else {
      const priceWithTax = price * (1 + taxRate / 100)
      return {
        label: t('products.modal.priceIncludingTax'),
        value: priceWithTax.toFixed(2)
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSaving(true)
    
    try {
      // Prepare data
      const dataToSave = {
        ...formData,
        name: formData.name.trim(),
        name_ar: formData.name_ar?.trim() || null,
        description: formData.description?.trim() || null,
        sku: formData.sku?.trim() || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        tax_rate: parseFloat(formData.tax_rate),
        display_order: parseInt(formData.display_order) || 0,
        category_id: formData.category_id || null,
        branch_id: formData.branch_id || null,
        image_url: formData.image_url?.trim() || null
      }
      
      // Include public_id if editing
      if (product?.public_id) {
        dataToSave.public_id = product.public_id
      }
      
      await onSave(dataToSave)
    } catch (err) {
      console.error('Failed to save:', err)
      alert(err.message || t('products.messages.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const taxDisplay = calculateTaxDisplay()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-lg z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {product ? t('products.modal.titleEdit') : t('products.modal.titleCreate')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {product ? t('products.modal.subtitleEdit') : t('products.modal.subtitleCreate')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form - Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto p-6 flex-1">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('products.modal.basicInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.productName')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder={t('products.modal.productNamePlaceholder')}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.productNameAr')}
                  </label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('products.modal.productNameArPlaceholder')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('products.modal.descriptionPlaceholder')}
                    rows="3"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.sku')}
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('products.modal.skuPlaceholder')}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('products.modal.skuHelper')}
                  </p>
                </div>
              </div>
            </div>

            {/* Category & Branch Assignment */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('products.modal.categoryBranch')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.category')}
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">{t('products.modal.noCategory')}</option>
                    {categories.map(cat => (
                      <option key={cat.public_id} value={cat.public_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.branch')}
                  </label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">{t('products.modal.allBranches')}</option>
                    {branches.map(branch => (
                      <option key={branch.public_id} value={branch.public_id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('products.modal.branchHelper')}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing & Tax */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('products.modal.pricingTax')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.price')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder={t('products.modal.pricePlaceholder')}
                  />
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.cost')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('products.modal.costPlaceholder')}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('products.modal.costHelper')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.taxRate')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.tax_rate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder={t('products.modal.taxRatePlaceholder')}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('products.modal.taxRateHelper')}
                  </p>
                  {errors.tax_rate && (
                    <p className="text-red-500 text-sm mt-1">{errors.tax_rate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.taxIncluded')}
                  </label>
                  <div className="flex items-center h-10">
                    <input
                      type="checkbox"
                      checked={formData.tax_included}
                      onChange={(e) => setFormData({ ...formData, tax_included: e.target.checked })}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t('products.modal.taxIncludedHelper')}
                    </label>
                  </div>
                </div>

                {formData.price && (
                  <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <span className="font-medium">{taxDisplay.label}:</span>{' '}
                      <span className="font-bold">{taxDisplay.value} SAR</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Display Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('products.modal.displaySettings')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.displayOrder')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('products.modal.displayOrderPlaceholder')}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('products.modal.displayOrderHelper')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="active">{t('products.modal.statusActive')}</option>
                    <option value="inactive">{t('products.modal.statusInactive')}</option>
                    <option value="out_of_stock">{t('products.modal.statusOutOfStock')}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.modal.imageUrl')}
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('products.modal.imageUrlPlaceholder')}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('products.modal.imageUrlHelper')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Footer - Sticky */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 rounded-b-lg z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              disabled={saving}
            >
              {t('products.modal.cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white bg-primary hover:bg-primary-dark rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? t('products.modal.saving') : t('products.modal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
