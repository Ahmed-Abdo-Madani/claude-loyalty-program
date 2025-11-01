import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'

function CampaignHistory({ onCreateCampaign, refreshTrigger }) {
  const { t } = useTranslation()
  
  // State management
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [deliveryStats, setDeliveryStats] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [pagination, setPagination] = useState(null)
  
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
        setError(data.message || 'Failed to load campaigns')
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setError(err.message || 'Failed to load campaigns')
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
        {status?.replace(/_/g, ' ').toUpperCase()}
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
          No Campaigns Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your first promotional campaign to engage with customers
        </p>
        <button
          onClick={onCreateCampaign}
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
        >
          Create Campaign
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
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Campaign name..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign Type
            </label>
            <select
              value={filters.campaign_type}
              onChange={(e) => setFilters({ ...filters, campaign_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="new_offer_announcement">New Offer Announcement</option>
              <option value="custom_promotion">Custom Promotion</option>
              <option value="seasonal_campaign">Seasonal Campaign</option>
              <option value="lifecycle">Lifecycle</option>
              <option value="transactional">Transactional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date From
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
              Date To
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
            Clear Filters
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
            No Campaigns Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters
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
                    Campaign {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('campaign_type')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Type {sortBy === 'campaign_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('total_recipients')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Recipients {sortBy === 'total_recipients' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th 
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Created {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
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
                      {campaign.campaign_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                          Sent: {campaign.total_sent || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">
                          {campaign.total_opened || 0} opens
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {campaign.total_recipients > 0 
                            ? `${Math.round((campaign.total_opened / campaign.total_recipients) * 100)}%`
                            : '0%'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(campaign.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => loadCampaignDetails(campaign.campaign_id)}
                        className="text-primary hover:text-primary/80 font-medium text-sm"
                      >
                        View Details
                      </button>
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
                        {campaign.campaign_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {campaign.total_recipients || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Opens:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {campaign.total_opened || 0} ({campaign.total_recipients > 0 
                        ? `${Math.round((campaign.total_opened / campaign.total_recipients) * 100)}%`
                        : '0%'})
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
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm px-6 py-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {pagination ? ((pagination.current_page - 1) * pagination.per_page + 1) : 1} to {pagination ? Math.min(pagination.current_page * pagination.per_page, pagination.total_campaigns) : campaigns.length} of {pagination?.total_campaigns || campaigns.length} campaigns
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!pagination?.has_prev_page}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
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
                  Next
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
                    {selectedCampaign.campaign_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                      <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Recipients</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {selectedCampaign.total_recipients || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Sent</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {selectedCampaign.total_sent || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Opens</div>
                      <div className="text-2xl font-bold text-primary mt-1">
                        {selectedCampaign.total_opened || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Targeting Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Targeting</h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Target Type</div>
                    <div className="text-gray-900 dark:text-white">
                      {selectedCampaign.target_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>
                </div>

                {/* Message Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Message</h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="font-medium text-gray-900 dark:text-white mb-2">
                      {selectedCampaign.message_template?.header || selectedCampaign.message_header || 'No header'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {selectedCampaign.message_template?.body || selectedCampaign.message_body || 'No message body'}
                    </div>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Engagement Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Delivery Rate</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {deliveryStats?.delivery_rate || (selectedCampaign.total_recipients > 0 
                          ? `${Math.round((selectedCampaign.total_sent / selectedCampaign.total_recipients) * 100)}%`
                          : '0%')}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Open Rate</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {deliveryStats?.open_rate || (selectedCampaign.total_sent > 0 
                          ? `${Math.round((selectedCampaign.total_opened / selectedCampaign.total_sent) * 100)}%`
                          : '0%')}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                      <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                        {deliveryStats?.failed || selectedCampaign.total_failed || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Converted</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {deliveryStats?.converted || selectedCampaign.total_converted || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Campaign Created
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
                            Campaign Sent
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
                            Campaign Completed
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignHistory
