import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'

function CampaignHistory({ onCreateCampaign, refreshTrigger }) {
  const { t } = useTranslation(['campaign', 'common'])
  
  // State management
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [deliveryStats, setDeliveryStats] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [pagination, setPagination] = useState(null)
  
  // Action states
  const [confirmDialog, setConfirmDialog] = useState({ show: false, type: '', campaign: null, message: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  
  // Filters and sorting
  const [filters, setFilters] = useState({
    campaign_type: '',
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Load campaigns on mount and when refresh trigger changes
  useEffect(() => {
    loadCampaigns()
  }, [refreshTrigger, filters, sortBy, sortOrder, currentPage])

  const loadCampaigns = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        sort: sortBy,
        order: sortOrder,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value
          return acc
        }, {})
      })

      const response = await secureApi.get(`${endpoints.notificationCampaigns}?${params}`)
      const data = await response.json()

      if (data.success && data.data) {
        const campaignsArray = data.data.campaigns || []
        setCampaigns(campaignsArray)
        setPagination(data.data.pagination)
      } else {
        setError(data.message || t('campaign:errors.loadHistoryFailed'))
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setError(err.message || t('campaign:errors.loadHistoryFailed'))
    } finally {
      setLoading(false)
    }
  }

  const loadCampaignDetails = async (campaignId) => {
    setDetailsLoading(true)
    
    try {
      const response = await secureApi.get(`${endpoints.notificationCampaigns}/${campaignId}`)
      const data = await response.json()

      if (data.success && data.data) {
        setSelectedCampaign(data.data.campaign)
        setDeliveryStats(data.data.delivery_stats || null)
        setShowDetails(true)
      }
    } catch (err) {
      console.error('Failed to load campaign details:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  // Action handlers
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const handleDeleteCampaign = (campaign) => {
    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      showToast(t('campaign:history.actions.cannotDeleteCompleted'), 'error')
      return
    }
    
    setConfirmDialog({
      show: true,
      type: 'delete',
      campaign,
      message: t('campaign:history.actions.confirmDeleteMessage', { name: campaign.name })
    })
  }

  const handleActivateCampaign = (campaign) => {
    setConfirmDialog({
      show: true,
      type: 'activate',
      campaign,
      message: t('campaign:history.actions.confirmActivateMessage')
    })
  }

  const handleDeactivateCampaign = (campaign) => {
    setConfirmDialog({
      show: true,
      type: 'deactivate',
      campaign,
      message: t('campaign:history.actions.confirmDeactivateMessage')
    })
  }

  const handleResendCampaign = (campaign) => {
    setConfirmDialog({
      show: true,
      type: 'resend',
      campaign,
      message: t('campaign:history.actions.confirmResendMessage')
    })
  }

  const handleEditCampaign = (campaign) => {
    if (campaign.status !== 'draft') {
      showToast(t('campaign:history.actions.cannotEditCompleted'), 'error')
      return
    }
    // Open CampaignBuilder with initialData
    onCreateCampaign(campaign)
  }

  const executeAction = async () => {
    const { type, campaign } = confirmDialog
    setActionLoading(true)

    try {
      let response
      
      switch (type) {
        case 'delete':
          response = await secureApi.delete(`${endpoints.notificationCampaigns}/${campaign.campaign_id}`)
          break
        case 'activate':
          response = await secureApi.patch(endpoints.notificationCampaignStatus(campaign.campaign_id), { status: 'active' })
          break
        case 'deactivate':
          response = await secureApi.patch(endpoints.notificationCampaignStatus(campaign.campaign_id), { status: 'paused' })
          break
        case 'resend':
          response = await secureApi.post(`${endpoints.notificationCampaigns}/${campaign.campaign_id}/send`)
          break
      }

      const data = await response.json()

      if (data.success) {
        showToast(t(`campaign:history.actions.${type}Success`), 'success')
        loadCampaigns() // Reload campaigns
      } else {
        showToast(t(`campaign:history.actions.${type}Failed`), 'error')
      }
    } catch (err) {
      console.error(`Failed to ${type} campaign:`, err)
      showToast(t(`campaign:history.actions.${type}Failed`), 'error')
    } finally {
      setActionLoading(false)
      setConfirmDialog({ show: false, type: '', campaign: null, message: '' })
    }
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {t(`campaign:history.statuses.${status}`)}
      </span>
    )
  }

  const getCampaignTypeIcon = (type) => {
    const icons = {
      new_offer_announcement: '🎁',
      custom_promotion: '💬',
      seasonal_campaign: '🎉',
      lifecycle: '♻️',
      transactional: '📝'
    }
    return icons[type] || '📢'
  }

  // Use backend pagination directly - no client-side slice
  const paginatedCampaigns = campaigns
  const totalPages = pagination?.total_pages || 1

  // Empty state
  if (!loading && campaigns.length === 0 && !Object.values(filters).some(v => v)) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📢</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('campaign:history.emptyState.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('campaign:history.emptyState.description')}
        </p>
        <button
          onClick={onCreateCampaign}
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
        >
          {t('campaign:history.emptyState.createButton')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('campaign:history.filters.search')}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder={t('campaign:history.filters.searchPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('campaign:history.filters.campaignType')}
            </label>
            <select
              value={filters.campaign_type}
              onChange={(e) => setFilters({ ...filters, campaign_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('campaign:history.filters.allTypes')}</option>
              <option value="new_offer_announcement">{t('campaign:history.types.new_offer_announcement')}</option>
              <option value="custom_promotion">{t('campaign:history.types.custom_promotion')}</option>
              <option value="seasonal_campaign">{t('campaign:history.types.seasonal_campaign')}</option>
              <option value="lifecycle">{t('campaign:history.types.lifecycle')}</option>
              <option value="transactional">{t('campaign:history.types.transactional')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('campaign:history.filters.status')}
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('campaign:history.filters.allStatuses')}</option>
              <option value="draft">{t('campaign:history.statuses.draft')}</option>
              <option value="active">{t('campaign:history.statuses.active')}</option>
              <option value="completed">{t('campaign:history.statuses.completed')}</option>
              <option value="cancelled">{t('campaign:history.statuses.cancelled')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('campaign:history.filters.dateFrom')}
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('campaign:history.filters.dateTo')}
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {Object.values(filters).some(v => v) && (
          <button
            onClick={() => setFilters({ campaign_type: '', status: '', search: '', dateFrom: '', dateTo: '' })}
            className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
          >
            {t('campaign:history.filters.clearFilters')}
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-red-600 dark:text-red-400 mr-3">⚠️</span>
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* No Results State */}
      {!loading && campaigns.length === 0 && Object.values(filters).some(v => v) && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('campaign:history.noResults.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('campaign:history.noResults.description')}
          </p>
        </div>
      )}

      {/* Desktop Table View */}
      {!loading && campaigns.length > 0 && (
        <>
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('campaign:history.table.campaign')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('campaign_type')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('campaign:history.table.type')} {sortBy === 'campaign_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('campaign:history.table.status')} {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('total_recipients')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('campaign:history.table.recipients')} {sortBy === 'total_recipients' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('campaign:history.table.engagement')}
                  </th>
                  <th 
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    {t('campaign:history.table.created')} {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('campaign:history.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedCampaigns.map((campaign) => (
                  <tr 
                    key={campaign.campaign_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">{getCampaignTypeIcon(campaign.campaign_type)}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {campaign.name}
                          </div>
                          {campaign.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                              {campaign.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {t(`campaign:history.types.${campaign.campaign_type}`)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {campaign.total_recipients || 0}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {t('campaign:history.table.sent')}: {campaign.total_sent || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">
                          {campaign.total_opened || 0} {t('campaign:history.table.opens')}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {campaign.total_recipients > 0 
                            ? t('campaign:history.table.openRate', { rate: Math.round((campaign.total_opened / campaign.total_recipients) * 100) })
                            : t('campaign:history.table.openRate', { rate: 0 })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(campaign.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadCampaignDetails(campaign.campaign_id)}
                          className="text-primary hover:text-primary/80 font-medium text-sm"
                        >
                          {t('campaign:history.table.viewDetails')}
                        </button>
                        
                        {campaign.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEditCampaign(campaign)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title={t('campaign:history.actions.edit')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(campaign)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title={t('campaign:history.actions.delete')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleActivateCampaign(campaign)}
                              className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors font-medium"
                            >
                              {t('campaign:history.actions.activate')}
                            </button>
                          </>
                        )}
                        
                        {campaign.status === 'active' && (
                          <button
                            onClick={() => handleDeactivateCampaign(campaign)}
                            className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 rounded-lg transition-colors font-medium"
                          >
                            {t('campaign:history.actions.deactivate')}
                          </button>
                        )}
                        
                        {campaign.status === 'paused' && (
                          <button
                            onClick={() => handleResendCampaign(campaign)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title={t('campaign:history.actions.resend')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedCampaigns.map((campaign) => (
              <div 
                key={campaign.campaign_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start flex-1">
                    <span className="text-2xl mr-3">{getCampaignTypeIcon(campaign.campaign_type)}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t(`campaign:history.types.${campaign.campaign_type}`)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('campaign:history.table.recipients')}:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {campaign.total_recipients || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('campaign:history.table.opens')}:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {campaign.total_opened || 0} ({campaign.total_recipients > 0 
                        ? t('campaign:history.table.openRate', { rate: Math.round((campaign.total_opened / campaign.total_recipients) * 100) })
                        : t('campaign:history.table.openRate', { rate: 0 })})
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatDate(campaign.created_at)}
                  </span>
                  <button
                    onClick={() => loadCampaignDetails(campaign.campaign_id)}
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    {t('campaign:history.table.viewDetails')} →
                  </button>
                </div>

                {/* Action buttons for mobile */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {campaign.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          className="flex-1 min-w-[100px] px-3 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          {t('campaign:history.actions.edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign)}
                          className="flex-1 min-w-[100px] px-3 py-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                          {t('campaign:history.actions.delete')}
                        </button>
                        <button
                          onClick={() => handleActivateCampaign(campaign)}
                          className="flex-1 min-w-[100px] px-3 py-2 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                        >
                          {t('campaign:history.actions.activate')}
                        </button>
                      </>
                    )}
                    
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => handleDeactivateCampaign(campaign)}
                        className="flex-1 px-3 py-2 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                      >
                        {t('campaign:history.actions.deactivate')}
                      </button>
                    )}
                    
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => handleResendCampaign(campaign)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {t('campaign:history.actions.resend')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm px-6 py-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('campaign:history.pagination.showing', {
                  from: pagination ? ((pagination.current_page - 1) * pagination.per_page + 1) : 1,
                  to: pagination ? Math.min(pagination.current_page * pagination.per_page, pagination.total_campaigns) : campaigns.length,
                  total: pagination?.total_campaigns || campaigns.length
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!pagination?.has_prev_page}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('campaign:history.pagination.previous')}
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } transition-colors`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={!pagination?.has_next_page}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('campaign:history.pagination.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Campaign Details Modal */}
      {showDetails && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getCampaignTypeIcon(selectedCampaign.campaign_type)}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedCampaign.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(`campaign:history.types.${selectedCampaign.campaign_type}`)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetails(false)
                  setSelectedCampaign(null)
                  setDeliveryStats(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            {detailsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Overview Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('campaign:history.details.overview')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.table.status')}</div>
                      <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.table.recipients')}</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {selectedCampaign.total_recipients || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.table.sent')}</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {selectedCampaign.total_sent || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.table.opens')}</div>
                      <div className="text-2xl font-bold text-primary mt-1">
                        {selectedCampaign.total_opened || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Targeting Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('campaign:history.details.targeting')}</h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('campaign:history.details.targetType')}</div>
                    <div className="text-gray-900 dark:text-white">
                      {selectedCampaign.target_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>
                </div>

                {/* Message Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('campaign:history.details.message')}</h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="font-medium text-gray-900 dark:text-white mb-2">
                      {selectedCampaign.message_template?.header || selectedCampaign.message_header || t('campaign:history.details.noHeader')}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {selectedCampaign.message_template?.body || selectedCampaign.message_body || t('campaign:history.details.noMessage')}
                    </div>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('campaign:history.details.engagement')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.details.deliveryRate')}</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {deliveryStats?.delivery_rate || (selectedCampaign.total_recipients > 0 
                          ? `${Math.round((selectedCampaign.total_sent / selectedCampaign.total_recipients) * 100)}%`
                          : '0%')}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.details.openRate')}</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {deliveryStats?.open_rate || (selectedCampaign.total_sent > 0 
                          ? `${Math.round((selectedCampaign.total_opened / selectedCampaign.total_sent) * 100)}%`
                          : '0%')}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.details.failed')}</div>
                      <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                        {deliveryStats?.failed || selectedCampaign.total_failed || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('campaign:history.details.converted')}</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {deliveryStats?.converted || selectedCampaign.total_converted || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('campaign:history.details.timeline')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('campaign:history.details.campaignCreated')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(selectedCampaign.created_at)}
                        </div>
                      </div>
                    </div>
                    {selectedCampaign.sent_at && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('campaign:history.details.campaignSent')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(selectedCampaign.sent_at)}
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedCampaign.completed_at && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('campaign:history.details.campaignCompleted')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(selectedCampaign.completed_at)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={() => {
                  setShowDetails(false)
                  setSelectedCampaign(null)
                  setDeliveryStats(null)
                }}
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('campaign:history.details.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              {t(`campaign:history.actions.confirm${confirmDialog.type.charAt(0).toUpperCase() + confirmDialog.type.slice(1)}`)}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog({ show: false, type: '', campaign: null, message: '' })}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {t('campaign:history.actions.cancel')}
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50 transition-colors ${
                  confirmDialog.type === 'delete' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : confirmDialog.type === 'activate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  t(`campaign:history.actions.${confirmDialog.type}`)
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
            toast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignHistory
