import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'
import CompactStatsBar from './CompactStatsBar'
import NotificationModal from './NotificationModal'
import CampaignBuilder from './CampaignBuilder'
import CampaignHistory from './CampaignHistory'

function CustomersTab({ analytics: globalAnalytics }) {
  const { t } = useTranslation(['dashboard', 'notification'])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedCustomers, setSelectedCustomers] = useState(new Set())
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Notification modal state
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationType, setNotificationType] = useState('custom')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [offers, setOffers] = useState([])
  const [successMessage, setSuccessMessage] = useState('')

  // Segment state
  const [segments, setSegments] = useState([])
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [selectedSegmentData, setSelectedSegmentData] = useState(null)
  const [loadingSegments, setLoadingSegments] = useState(false)
  const [audienceMode, setAudienceMode] = useState('all') // 'all' | 'selected' | 'segment'

  // Campaign state
  const [activeTab, setActiveTab] = useState('customers') // 'customers' | 'campaigns'
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false)
  const [campaignRefreshTrigger, setCampaignRefreshTrigger] = useState(0)
  const [campaignToEdit, setCampaignToEdit] = useState(null)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  // Load customers and offers on component mount
  useEffect(() => {
    loadCustomers()
    loadOffers()
    loadSegments()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await secureApi.get(endpoints.customers)
      const data = await response.json()

      if (data.success) {
        // Map API response to expected format
        const customersData = data.data.customers.map(customer => ({
          customer_id: customer.customer_id,
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          phone: customer.phone,
          status: customer.status,
          lifecycle_stage: customer.lifecycle_stage || 'new_customer',
          total_visits: customer.total_visits || 0,
          total_stamps_earned: customer.total_stamps_earned || 0,
          total_rewards_claimed: customer.total_rewards_claimed || 0,
          total_lifetime_value: parseFloat(customer.total_lifetime_value || 0),
          last_activity_date: customer.last_activity_date || customer.created_at,
          created_at: customer.created_at,
          // Add customer progress/offers data
          progress: customer.progress || []
        }))

        setCustomers(customersData)
      } else {
        throw new Error(data.message || 'Failed to load customers')
      }

    } catch (err) {
      console.error('Failed to load customers:', err)
      setError('Failed to load customers: ' + err.message)

      // Fallback to empty array on error
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const loadOffers = async () => {
    try {
      const response = await secureApi.get(endpoints.myOffers)
      const data = await response.json()

      if (data.success && data.data) {
        // Handle both array and object shapes
        let offersArray = []
        
        if (Array.isArray(data.data)) {
          offersArray = data.data
        } else if (data.data.offers && Array.isArray(data.data.offers)) {
          offersArray = data.data.offers
        }
        
        setOffers(offersArray)
      } else {
        console.warn('⚠️ No offers data received from API')
        setOffers([])
      }
    } catch (err) {
      console.error('Failed to load offers:', err)
      setOffers([])
    }
  }

  const loadSegments = async () => {
    try {
      setLoadingSegments(true)

      const response = await secureApi.get(endpoints.segments)
      const data = await response.json()

      if (data.success && data.data) {
        // Extract segments array and filter for active segments only
        const segmentsArray = data.data.segments || []
        const activeSegments = segmentsArray.filter(s => s.is_active)
        setSegments(activeSegments)
      } else {
        console.warn('⚠️ No segments data received from API')
        setSegments([])
      }
    } catch (err) {
      console.error('Failed to load segments:', err)
      // Don't block UI - segments are optional feature
      setSegments([])
    } finally {
      setLoadingSegments(false)
    }
  }

  // Notification handlers
  const handleSendNotificationClick = () => {
    if (selectedCustomers.size === 0) {
      setError(t('customers.selectAtLeastOne'))
      return
    }
    setNotificationType('custom')
    setSelectedCustomer(null)
    setShowNotificationModal(true)
  }

  const handleSendToCustomer = (customer) => {
    setSelectedCustomer(customer)
    setNotificationType('custom')
    setShowNotificationModal(true)
  }

  const handleQuickAction = (type, filter = null) => {
    let targetCustomers = customers

    if (filter === 'vip') {
      targetCustomers = customers.filter(c => c.status === 'vip' || c.lifecycle_stage === 'vip_customer')
    } else if (filter === 'inactive') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      targetCustomers = customers.filter(c => new Date(c.last_activity_date) < thirtyDaysAgo)
    } else if (filter === 'birthday') {
      // Filter customers with birthdays in the next 7 days (would need birth_date field)
      targetCustomers = customers // For now, use all customers
    }

    if (targetCustomers.length === 0) {
      setError(t('customers.noCustomersWithFilter', { filter: filter || '' }))
      return
    }

    // Select the filtered customers
    setSelectedCustomers(new Set(targetCustomers.map(c => c.customer_id)))
    setNotificationType(type)
    setShowNotificationModal(true)
  }

  const handleSendToSegment = async () => {
    try {
      if (!selectedSegment) {
        setError('Please select a segment')
        return
      }

      // Find the segment object
      const segment = segments.find(s => s.segment_id === selectedSegment)
      if (!segment || segment.customer_count === 0) {
        setError('Selected segment has no customers')
        return
      }

      setLoading(true)
      // Fetch segment customers
      const response = await secureApi.get(`${endpoints.segments}/${selectedSegment}/customers`)
      const data = await response.json()

      if (data.success && data.data) {
        const segmentCustomers = data.data.customers || []
        
        // Set these customers as selected
        setSelectedCustomers(new Set(segmentCustomers.map(c => c.customer_id)))
        
        // Store segment metadata
        setSelectedSegmentData({
          segmentId: selectedSegment,
          segmentName: segment.name,
          customerCount: segmentCustomers.length
        })

        // Open notification modal in segment mode
        setNotificationType('segment')
        setShowNotificationModal(true)
      } else {
        throw new Error(data.message || 'Failed to fetch segment customers')
      }
    } catch (err) {
      console.error('Error fetching segment customers:', err)
      setError(err.message || 'Failed to load segment customers')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationSuccess = (results) => {
    setShowNotificationModal(false)
    setSelectedCustomers(new Set())
    setSelectedCustomer(null)
    
    // Clear segment selection and audience mode
    setSelectedSegment(null)
    setSelectedSegmentData(null)
    setAudienceMode('all')

    const count = results.successful_customers || results.successful || 0
    const message = t('customers.notificationSuccess', { count })
    setSuccessMessage(message)

    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 5000)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
      case 'vip': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20'
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
      case 'churning': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
    }
  }

  const getLifecycleIcon = (stage) => {
    switch (stage) {
      case 'new_customer': return '🌱'
      case 'repeat_customer': return '🔄'
      case 'loyal_customer': return '❤️'
      case 'vip_customer': return '👑'
      default: return '👤'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter customers based on search and status
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm ||
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)

    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus

    return matchesSearch && matchesStatus
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  const toggleCustomerSelection = (customerId) => {
    const newSelected = new Set(selectedCustomers)
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId)
    } else {
      newSelected.add(customerId)
    }
    setSelectedCustomers(newSelected)
  }

  const selectAllCustomers = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.customer_id)))
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">{t('customers.loading')}</p>
      </div>
    )
  }

  return (
    <div className="compact-spacing">
      {/* Compact Stats Bar - Global analytics from Dashboard */}
      {globalAnalytics && <CompactStatsBar analytics={globalAnalytics} />}
      
      {/* Header Section - Mobile-first */}
      <div className="compact-header">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('customers.customerManagement')}</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">{t('customers.manageAndNotify')}</p>
          </div>
          <button
            onClick={() => setShowCampaignBuilder(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-xl">📢</span>
            <span className="hidden sm:inline">{t('dashboard:customers.createCampaignButton')}</span>
            <span className="sm:hidden">{t('dashboard:customers.campaignShort')}</span>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'customers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              👥 {t('dashboard:customers.tabs.customers')}
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'campaigns'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📢 {t('dashboard:customers.tabs.campaigns')}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 sm:mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-red-600 dark:text-red-400 mr-3">⚠️</span>
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Success Display */}
      {successMessage && (
        <div className="mb-4 sm:mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-green-600 dark:text-green-400 mr-3">✅</span>
            <span className="text-green-800 dark:text-green-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'customers' && (
      <div className="compact-spacing">
        {/* Search and Filters */}
        <div className="compact-card mobile-compact">
          <div className="compact-spacing">
            {/* Search Input */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder={t('customers.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary touch-target"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Inline Status Filter Buttons and Action */}
            <div className="space-y-3 mb-3">
              {/* Filter Pills Row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[36px] touch-manipulation ${
                    filterStatus === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('customers.all')}
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[36px] touch-manipulation ${
                    filterStatus === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('customers.active')}
                </button>
                <button
                  onClick={() => setFilterStatus('vip')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[36px] touch-manipulation ${
                    filterStatus === 'vip'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('customers.vip')}
                </button>
                <button
                  onClick={() => setFilterStatus('inactive')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[36px] touch-manipulation ${
                    filterStatus === 'inactive'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('customers.inactive')}
                </button>
                <button
                  onClick={() => setFilterStatus('churning')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[36px] touch-manipulation ${
                    filterStatus === 'churning'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('customers.atRisk')}
                </button>
              </div>

              {/* Target Audience Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('dashboard:customers.targetAudience')}
                </label>
                <select
                  value={audienceMode === 'segment' ? selectedSegment : audienceMode}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'all') {
                      setAudienceMode('all')
                      setSelectedSegment(null)
                      setSelectedCustomers(new Set())
                    } else if (value === 'selected') {
                      setAudienceMode('selected')
                      setSelectedSegment(null)
                    } else {
                      // It's a segment ID
                      setAudienceMode('segment')
                      setSelectedSegment(value)
                      setSelectedCustomers(new Set())
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">
                    {t('dashboard:customers.allCustomers')}
                  </option>
                  <option 
                    value="selected" 
                    disabled={selectedCustomers.size === 0}
                  >
                    {t('dashboard:customers.selectedCustomers', { count: selectedCustomers.size })}
                  </option>
                  
                  {/* Segments Section */}
                  {!loadingSegments && segments.length > 0 && (
                    <>
                      <option disabled>{t('dashboard:customers.segmentSelector.segments')}</option>
                      {segments.map(segment => (
                        <option key={segment.segment_id} value={segment.segment_id}>
                          {segment.name} ({t('dashboard:customers.segmentSelector.customersCount', { count: segment.customer_count || 0 })})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Action Button Row */}
              <div className="flex justify-stretch sm:justify-end">
                <button
                  onClick={audienceMode === 'segment' ? handleSendToSegment : handleSendNotificationClick}
                  disabled={audienceMode === 'all' || (audienceMode === 'selected' && selectedCustomers.size === 0)}
                  className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-primary hover:bg-primary/90 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 touch-target"
                >
                  <span>📧</span>
                  <span>
                    {audienceMode === 'segment'
                      ? t('dashboard:customers.sendToSegment')
                      : audienceMode === 'selected' && selectedCustomers.size > 0
                      ? t('dashboard:customers.sendToSelected', { count: selectedCustomers.size })
                      : t('dashboard:customers.selectCustomersOrSegment')
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Selected Count */}
          {selectedCustomers.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-blue-800 dark:text-blue-300 text-sm">
                {selectedCustomers.size} {t('customers.selected')}
              </span>
            </div>
          )}

          {/* Customer List - Mobile Cards, Desktop Table */}
          
          {/* Mobile: Card Layout */}
          <div className="block md:hidden mt-6 space-y-3">
            {paginatedCustomers.map((customer) => (
              <div key={customer.customer_id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.has(customer.customer_id)}
                      onChange={() => toggleCustomerSelection(customer.customer_id)}
                      className="mt-1 rounded border-gray-300 text-primary focus:ring-primary min-w-[20px] min-h-[20px]"
                    />
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{customer.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.email || 'No email'}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{customer.phone || 'No phone'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                    {customer.status}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                    {getLifecycleIcon(customer.lifecycle_stage)} {customer.lifecycle_stage.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Visits:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">{customer.total_visits}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Stamps:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">{customer.total_stamps_earned}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Last activity:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">{formatDate(customer.last_activity_date)}</span>
                  </div>
                </div>

                {customer.progress && customer.progress.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {customer.progress.slice(0, 1).map((prog, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium text-gray-900 dark:text-white">{prog.offer?.title || 'Unknown'}</span>
                        <span className="ml-2 text-gray-500 dark:text-gray-400">
                          {prog.current_stamps}/{prog.max_stamps}
                          {prog.is_completed && <span className="ml-1 text-green-500">✓</span>}
                        </span>
                      </div>
                    ))}
                    {customer.progress.length > 1 && (
                      <div className="text-xs text-primary font-medium">
                        +{customer.progress.length - 1} more
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendToCustomer(customer)}
                    className="flex-1 px-3 py-2 min-h-[44px] bg-primary hover:bg-primary/90 active:scale-95 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 touch-target"
                  >
                    <span>📧</span>
                    <span>{t('notification:notifyButton')}</span>
                  </button>
                  <button className="px-3 py-2 min-h-[44px] bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center touch-target">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={selectAllCustomers}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('customers.customerName')}</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('customers.status')}</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('customers.lastActivity')}</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('customers.activeCards')}</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t('customers.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer, index) => (
                  <tr
                    key={customer.customer_id}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                      index === paginatedCustomers.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="py-3 px-2">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.customer_id)}
                        onChange={() => toggleCustomerSelection(customer.customer_id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{customer.name || 'Unknown Customer'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{customer.email || 'No email'}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{customer.phone || 'No phone'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                          {customer.status}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{getLifecycleIcon(customer.lifecycle_stage)}</span>
                          <span>{customer.lifecycle_stage.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                        <div className="text-sm space-y-1">
                          <div className="text-gray-900 dark:text-white">{customer.total_visits} {t('customers.visits')}</div>
                          <div className="text-gray-500 dark:text-gray-400">{customer.total_stamps_earned} {t('customers.stamps')}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {t('customers.lastActivity')}: {formatDate(customer.last_activity_date)}
                          </div>
                        </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-sm space-y-1">
                        {customer.progress && customer.progress.length > 0 ? (
                          <>
                            {customer.progress.slice(0, 1).map((prog, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white truncate text-xs">
                                    {prog.offer?.title || 'Unknown Offer'}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{prog.current_stamps}/{prog.max_stamps}</span>
                                    {prog.is_completed && <span className="text-green-500">✓</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {customer.progress.length > 1 && (
                              <div className="text-xs text-primary font-medium">
                                +{customer.progress.length - 1} more
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 dark:text-gray-500">No active offers</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendToCustomer(customer)}
                          title="Send notification"
                          className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          title="View details"
                          className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">{t('customers.noCustomersFound')}</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm || filterStatus !== 'all'
                    ? t('customers.tryAdjustingFilters')
                    : t('customers.customersWillAppear')
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredCustomers.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Page Info and Items Per Page */}
            <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {t('customers.showing')} {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} {t('customers.of')} {filteredCustomers.length} {t('customers.customers')}
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="itemsPerPage" className="whitespace-nowrap">{t('customers.itemsPerPage')}:</label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← {t('customers.previous')}
              </button>

              {/* Mobile: Simple page indicator */}
              <div className="sm:hidden px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('customers.page')} {currentPage} {t('customers.of')} {totalPages}
              </div>

              {/* Desktop: Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
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
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 min-h-[44px] rounded-lg border transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('customers.next')} →
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
            <span className="mr-2">🚀</span>
            {t('customers.quickActions')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleQuickAction('birthday', 'birthday')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                <span className="text-xl">🎂</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{t('customers.birthdayOffers')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('customers.birthdayOffersDesc')}</div>
              </div>
            </button>
            <button
              onClick={() => handleQuickAction('reengagement', 'inactive')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                <span className="text-xl">📧</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{t('customers.reEngagement')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('customers.reEngagementDesc')}</div>
              </div>
            </button>
            <button
              onClick={() => handleQuickAction('offer', 'vip')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                <span className="text-xl">👑</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{t('customers.vipRewards')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('customers.vipRewardsDesc')}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="compact-spacing">
          <CampaignHistory 
            onCreateCampaign={(campaign) => {
              setCampaignToEdit(campaign || null)
              setShowCampaignBuilder(true)
            }}
            refreshTrigger={campaignRefreshTrigger}
          />
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <NotificationModal
          customers={selectedCustomer ? [selectedCustomer] : customers.filter(c => selectedCustomers.has(c.customer_id))}
          notificationType={notificationType}
          offers={offers}
          segmentData={selectedSegmentData}
          segmentId={audienceMode === 'segment' ? selectedSegment : null}
          onClose={() => {
            setShowNotificationModal(false)
            setSelectedCustomer(null)
          }}
          onSuccess={handleNotificationSuccess}
        />
      )}

      {/* Campaign Builder Modal */}
      {showCampaignBuilder && (
        <CampaignBuilder
          initialData={campaignToEdit}
          onClose={() => {
            setShowCampaignBuilder(false)
            setCampaignToEdit(null)
          }}
          onSuccess={(campaign) => {
            setShowCampaignBuilder(false)
            setCampaignToEdit(null)
            setSuccessMessage(`Campaign "${campaign.name}" ${campaignToEdit ? 'updated' : 'created'} successfully!`)
            setCampaignRefreshTrigger(prev => prev + 1)
            setActiveTab('campaigns')
            setTimeout(() => setSuccessMessage(''), 5000)
          }}
        />
      )}
    </div>
  )
}

export default CustomersTab
