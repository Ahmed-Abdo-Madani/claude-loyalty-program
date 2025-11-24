import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'

/**
 * PaymentHistoryPage Component
 * 
 * Displays paginated payment history with filters:
 * - Status filter (paid, pending, failed, refunded, cancelled)
 * - Date range filter
 * - Amount range filter
 * - Search by invoice number or Moyasar payment ID
 * 
 * Features:
 * - Sortable table columns
 * - Invoice PDF download
 * - Responsive design (table on desktop, cards on mobile)
 * - Dark mode support
 * - Loading and error states
 */
export default function PaymentHistoryPage() {
  const { t, i18n } = useTranslation(['subscription', 'dashboard'])

  // State management
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    total_pages: 1,
    current_page: 1,
    total_items: 0,
    per_page: 20
  })

  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    search: ''
  })

  const [sortBy, setSortBy] = useState('payment_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  })

  // Load payments on mount and when filters/sort/page change
  useEffect(() => {
    loadPayments()
  }, [filters, sortBy, sortOrder, currentPage])

  /**
   * Load payments from API with current filters
   */
  const loadPayments = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      params.append('page', currentPage)
      params.append('limit', 20)

      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.minAmount) params.append('minAmount', filters.minAmount)
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount)
      if (filters.search) params.append('search', filters.search)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)

      // Fetch payments
      const response = await secureApi.get(`${endpoints.businessPayments}?${params.toString()}`)

      if (response.data.success) {
        setPayments(response.data.data.payments)
        setPagination(response.data.data.pagination)
      } else {
        setError(response.data.message || 'Failed to load payments')
      }

    } catch (err) {
      console.error('Failed to load payments:', err)
      setError(err.response?.data?.message || 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle filter changes
   */
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to page 1 on filter change
  }

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      search: ''
    })
    setCurrentPage(1)
  }

  /**
   * Handle sort column change
   */
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  /**
   * Handle invoice download
   */
  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const response = await secureApi.get(endpoints.businessInvoices(invoiceId), {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToast({
        show: true,
        message: t('subscription:payment.history.actions.downloadSuccess'),
        type: 'success'
      });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);

    } catch (err) {
      console.error('Failed to download invoice:', err);
      setToast({
        show: true,
        message: t('subscription:payment.history.actions.downloadFailed'),
        type: 'error'
      });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    }
  }

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  /**
   * Format currency
   */
  const formatCurrency = (amount, currency = 'SAR') => {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0.00 SAR'
    return `${num.toFixed(2)} ${currency}`
  }

  /**
   * Get status badge component
   */
  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    };

    const badgeClass = badges[status] || badges.pending;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
        {t(`subscription:payment.history.statuses.${status}`)}
      </span>
    )
  }

  /**
   * Get payment method icon
   */
  const getPaymentMethodIcon = (method) => {
    const icons = {
      card: '💳',
      apple_pay: '🍎',
      stc_pay: '📱'
    }
    return icons[method] || '💳'
  }

  // Loading state
  if (loading && payments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('subscription:payment.history.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('subscription:payment.history.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('subscription:payment.history.filters.search')}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={t('subscription:payment.history.filters.searchPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('subscription:payment.history.filters.status')}
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('subscription:payment.history.filters.allStatuses')}</option>
              <option value="paid">{t('subscription:payment.history.statuses.paid')}</option>
              <option value="pending">{t('subscription:payment.history.statuses.pending')}</option>
              <option value="failed">{t('subscription:payment.history.statuses.failed')}</option>
              <option value="refunded">{t('subscription:payment.history.statuses.refunded')}</option>
              <option value="cancelled">{t('subscription:payment.history.statuses.cancelled')}</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('subscription:payment.history.filters.dateFrom')}
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('subscription:payment.history.filters.dateTo')}
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('subscription:payment.history.filters.minAmount')}
            </label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Max Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('subscription:payment.history.filters.maxAmount')}
            </label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
              placeholder="999.99"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.status || filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount || filters.search) && (
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('subscription:payment.history.filters.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={loadPayments}
              className="px-3 py-1 text-sm font-medium text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
            >
              {t('subscription:payment.history.actions.retry')}
            </button>
          </div>
        </div>
      )}

      {/* Payments Table (Desktop) */}
      {!error && payments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('payment_date')}>
                    {t('subscription:payment.history.table.date')}
                    {sortBy === 'payment_date' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('subscription:payment.history.table.invoiceNumber')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('amount')}>
                    {t('subscription:payment.history.table.amount')}
                    {sortBy === 'amount' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('subscription:payment.history.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('subscription:payment.history.table.paymentMethod')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('subscription:payment.history.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((payment) => (
                  <tr key={payment.public_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {payment.invoice?.invoice_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <span className="flex items-center gap-2">
                        <span>{getPaymentMethodIcon(payment.payment_method)}</span>
                        <span>{t(`subscription:payment.history.paymentMethods.${payment.payment_method}`)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {payment.status === 'paid' && payment.invoice && (
                        <button
                          onClick={() => handleDownloadInvoice(payment.invoice.invoice_number, payment.invoice.invoice_number)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          {t('subscription:payment.history.actions.downloadInvoice')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {t('subscription:payment.history.pagination.showing')} {((currentPage - 1) * pagination.per_page) + 1} {t('subscription:payment.history.pagination.to')} {Math.min(currentPage * pagination.per_page, pagination.total_items)} {t('subscription:payment.history.pagination.of')} {pagination.total_items} {t('subscription:payment.history.pagination.items')}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!pagination.has_prev}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('subscription:payment.history.pagination.previous')}
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('subscription:payment.history.pagination.page')} {currentPage} {t('subscription:payment.history.pagination.of')} {pagination.total_pages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                disabled={!pagination.has_next}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('subscription:payment.history.pagination.next')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && !loading && payments.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filters.status || filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount || filters.search
              ? t('subscription:payment.history.emptyState.noResults')
              : t('subscription:payment.history.emptyState.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {!filters.status && !filters.dateFrom && !filters.dateTo && !filters.minAmount && !filters.maxAmount && !filters.search 
              ? t('subscription:payment.history.emptyState.description')
              : ''}
          </p>
          {(filters.status || filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount || filters.search) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('subscription:payment.history.emptyState.clearFiltersButton')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
