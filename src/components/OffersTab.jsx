import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import QRCodeModal from './QRCodeModal'
import OfferGrid from './OfferGrid'
import CompactStatsBar from './CompactStatsBar'
import { endpoints, secureApi } from '../config/api'
import { CardDesignProvider } from '../contexts/CardDesignContext'
import CardDesignEditor from './cardDesign/CardDesignEditor'
import OfferAnalyticsModal from './OfferAnalyticsModal'

function OffersTab({ analytics }) {
  const { t } = useTranslation('dashboard')
  const [offers, setOffers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showQRModal, setShowQRModal] = useState(null)
  const [showCardDesigner, setShowCardDesigner] = useState(null)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [selectedOfferForAnalytics, setSelectedOfferForAnalytics] = useState(null)

  // Filter states - use internal constants, not translated strings
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('offersFiltersExpanded')
    return saved ? JSON.parse(saved) : false
  })

  // Persist filters expanded state
  const toggleFiltersExpanded = () => {
    setFiltersExpanded(prev => {
      const newValue = !prev
      localStorage.setItem('offersFiltersExpanded', JSON.stringify(newValue))
      return newValue
    })
  }

  // Load offers and branches on component mount
  useEffect(() => {
    loadOffers()
    loadBranches()
  }, [])

  const loadOffers = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('🔒 Loading offers with secure authentication...')
      const response = await secureApi.get(endpoints.myOffers)
      const data = await response.json()
      
      if (data.success) {
        setOffers(data.data || [])
        console.log('🔒 Offers loaded successfully:', data.data?.length || 0)
      } else {
        throw new Error(data.message || 'Failed to load offers')
      }
    } catch (err) {
      setError(err.message || 'Failed to load offers')
      console.error('Error loading offers:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      console.log('🔒 Loading branches with secure authentication...')
      const response = await secureApi.get(endpoints.myBranches)
      const data = await response.json()
      
      if (data.success) {
        setBranches(data.data || [])
        console.log('🔒 Branches loaded successfully:', data.data?.length || 0)
      }
    } catch (err) {
      console.error('Error loading branches:', err)
      // Don't set error here as it's secondary data
    }
  }


  const toggleOfferStatus = async (secureOfferId, currentStatus) => {
    try {
      console.log('🔒 Toggling offer status:', { secureOfferId, currentStatus })
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      
      const response = await secureApi.patch(`${endpoints.myOffers}/${secureOfferId}/status`, {
        status: newStatus
      })
      const data = await response.json()
      
      if (data.success) {
        setOffers(offers.map(offer => 
          offer.public_id === secureOfferId 
            ? { ...offer, status: newStatus }
            : offer
        ))
        console.log('🔒 Offer status updated successfully')
      } else {
        alert(t('offers.statusUpdateFailed'))
      }
    } catch (err) {
      console.error('Error updating offer status:', err)
      alert(t('offers.statusUpdateFailed'))
    }
  }
  
  const deleteOffer = async (secureOfferId) => {
    try {
      console.log('🔒 Deleting offer:', secureOfferId)
      const response = await secureApi.delete(`${endpoints.myOffers}/${secureOfferId}`)
      const data = await response.json()
      
      if (data.success) {
        setShowDeleteConfirm(null)
        await loadOffers() // Reload to get updated data
        console.log('🔒 Offer deleted successfully')
      } else {
        throw new Error(data.message || t('offers.deleteFailed'))
      }
    } catch (err) {
      setError(err.message || t('offers.deleteFailed'))
      console.error('Error deleting offer:', err)
      setShowDeleteConfirm(null)
    }
  }

  const duplicateOffer = async (secureOfferId) => {
    try {
      console.log('🔒 Duplicating offer:', secureOfferId)
      const offer = offers.find(o => o.public_id === secureOfferId)
      if (offer) {
        const newOffer = {
          ...offer,
          title: `${offer.title} (Copy)`,
          status: 'active' // Duplicated offers should be active by default
        }
        delete newOffer.public_id // Remove ID so API creates a new one
        delete newOffer.id // Remove any legacy ID

        const response = await secureApi.post(endpoints.myOffers, newOffer)
        const data = await response.json()

        if (data.success) {
          await loadOffers() // Reload to get updated data
          console.log('🔒 Offer duplicated successfully')
        } else {
          throw new Error(data.message || 'Failed to duplicate offer')
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to duplicate offer')
      console.error('Error duplicating offer:', err)
    }
  }

  const handleAnalytics = (offer) => {
    console.log('📊 Opening analytics for offer:', offer.public_id)
    setSelectedOfferForAnalytics(offer)
    setAnalyticsModalOpen(true)
  }

  // Filter offers based on selected filters - use constants for comparison
  const filteredOffers = offers.filter(offer => {
    const statusMatch = statusFilter === 'all' || offer.status === statusFilter
    const branchMatch = branchFilter === 'all' || offer.branch === branchFilter
    const typeMatch = typeFilter === 'all' || offer.type === typeFilter

    return statusMatch && branchMatch && typeMatch
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('offers.loading')}</p>
      </div>
    )
  }

  return (
    <div className="compact-spacing">
      {/* Compact Stats Bar - Space-efficient metrics */}
      {analytics && <CompactStatsBar analytics={analytics} />}
      
      {/* Header Section - Mobile-first: Stack vertically */}
      <div className="flex flex-col space-y-3 compact-header">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('offers.activeOffers')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('offers.managePrograms')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg min-h-[44px] active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{t('offers.createOffer')}</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Filters */}
      <div className="mb-4">
        {/* Filter Toggle Button with Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleFiltersExpanded}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            <span>🔍</span>
            <span className="font-medium text-gray-900 dark:text-white">{t('offers.filters')}</span>
            {(statusFilter !== 'all' || branchFilter !== 'all' || typeFilter !== 'all') && (
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                {[statusFilter !== 'all', branchFilter !== 'all', typeFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
            <svg 
              className={`w-4 h-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Quick Filter Pills */}
          <button
            onClick={() => { setStatusFilter('all'); setBranchFilter('all'); setTypeFilter('all'); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'all' && branchFilter === 'all' && typeFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('offers.all')}
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('offers.active')}
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('offers.inactive')}
          </button>
        </div>

        {/* Expandable Filter Panel */}
        <div className={`filter-transition ${filtersExpanded ? 'filter-expanded mt-3' : 'filter-collapsed'}`}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    if (window.innerWidth < 640) {
                      setFiltersExpanded(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('offers.allStatus')}</option>
                  <option value="active">{t('offers.active')}</option>
                  <option value="inactive">{t('offers.inactive')}</option>
                  <option value="scheduled">{t('offers.scheduled')}</option>
                  <option value="expired">{t('offers.expired')}</option>
                </select>
              </div>
              <div>
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value)
                    if (window.innerWidth < 640) {
                      setFiltersExpanded(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('offers.allBranches')}</option>
                  {branches?.map((branch) => (
                    <option key={branch.public_id || branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    if (window.innerWidth < 640) {
                      setFiltersExpanded(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('offers.allTypes')}</option>
                  <option value="stamps">{t('offers.stampCards')}</option>
                  <option value="discount">{t('offers.discounts')}</option>
                  <option value="points">{t('offers.points')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offers Grid */}
      <OfferGrid
        offers={filteredOffers}
        loading={false}
        onEdit={setShowEditModal}
        onDelete={setShowDeleteConfirm}
        onToggleStatus={toggleOfferStatus}
        onQRCode={setShowQRModal}
        onAnalytics={handleAnalytics}
        onDesignCard={setShowCardDesigner}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('offers.deleteConfirmTitle')}</h3>
            <p className="text-gray-600 mb-6">
              {t('offers.deleteConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteOffer(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <CreateOfferModal
          offer={showEditModal}
          branches={branches}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(null)
          }}
          onSave={async (offerData) => {
            try {
              console.log('💾 Saving offer data:', JSON.stringify(offerData, null, 2))
              
              if (showEditModal) {
                // Update existing offer using secure ID
                console.log('📝 Updating offer:', showEditModal.public_id)
                const response = await secureApi.put(`${endpoints.myOffers}/${showEditModal.public_id}`, offerData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || t('offers.saveFailed'))
                }
                console.log('✅ Offer updated successfully')
              } else {
                // Create new offer
                console.log('➕ Creating new offer')
                const response = await secureApi.post(endpoints.myOffers, offerData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || t('offers.saveFailed'))
                }
                console.log('✅ Offer created successfully:', data.data?.public_id)
              }
              await loadOffers() // Reload to get updated data
              setShowCreateModal(false)
              setShowEditModal(null)
            } catch (err) {
              console.error('❌ Error saving offer:', {
                message: err.message,
                response: err.response,
                data: err.response?.data,
                status: err.response?.status
              })
              setError(err.message || t('offers.saveFailed'))
            }
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          offer={showQRModal}
          onClose={() => setShowQRModal(null)}
        />
      )}

      {/* Card Design Editor Modal */}
      {showCardDesigner && (
        <CardDesignProvider>
          <CardDesignEditor
            offer={showCardDesigner}
            onClose={() => setShowCardDesigner(null)}
            onSave={(savedDesign) => {
              console.log('💾 Card design saved:', savedDesign)
              setShowCardDesigner(null)
              // Optionally reload offers to get updated data
              // loadOffers()
            }}
          />
        </CardDesignProvider>
      )}

      {/* Offer Analytics Modal */}
      {analyticsModalOpen && selectedOfferForAnalytics && (
        <OfferAnalyticsModal
          isOpen={analyticsModalOpen}
          onClose={() => {
            setAnalyticsModalOpen(false)
            setSelectedOfferForAnalytics(null)
          }}
          offer={selectedOfferForAnalytics}
        />
      )}
    </div>
  )
}

function CreateOfferModal({ offer, branches, onClose, onSave }) {
  const { t } = useTranslation('dashboard')
  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    branch: offer?.branch || 'all',
    type: offer?.type || 'stamps',
    stamps_required: offer?.stamps_required || 10,
    is_time_limited: offer?.is_time_limited || false,
    start_date: offer?.start_date || '',
    end_date: offer?.end_date || '',
    loyalty_tiers: offer?.loyalty_tiers || null
  })

  const [tiersEnabled, setTiersEnabled] = useState(
    offer?.loyalty_tiers?.enabled || false
  )

  const [tiers, setTiers] = useState(
    offer?.loyalty_tiers?.tiers || [
      { id: 'bronze', name: 'Bronze Member', nameAr: 'عضو برونزي', minRewards: 1, maxRewards: 2, icon: '🥉', color: '#CD7F32' },
      { id: 'silver', name: 'Silver Member', nameAr: 'عضو فضي', minRewards: 3, maxRewards: 5, icon: '🥈', color: '#C0C0C0' },
      { id: 'gold', name: 'Gold Member', nameAr: 'عضو ذهبي', minRewards: 6, maxRewards: null, icon: '🥇', color: '#FFD700' }
    ]
  )

  const updateTier = (index, field, value) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setTiers(newTiers)
  }

  const addTier = () => {
    if (tiers.length < 5) {
      const lastTier = tiers[tiers.length - 1]
      const newMinRewards = (lastTier.maxRewards || lastTier.minRewards) + 1
      
      // Update previous last tier's maxRewards if it's currently null
      const updatedTiers = [...tiers]
      if (lastTier.maxRewards === null) {
        updatedTiers[tiers.length - 1] = {
          ...lastTier,
          maxRewards: newMinRewards - 1
        }
      }
      
      // Add new tier
      setTiers([
        ...updatedTiers,
        {
          id: `tier${tiers.length + 1}`,
          name: 'New Tier',
          nameAr: 'مستوى جديد',
          minRewards: newMinRewards,
          maxRewards: null,
          icon: '⭐',
          color: '#000000'
        }
      ])
    }
  }

  const removeTier = (index) => {
    if (tiers.length > 2) {
      setTiers(tiers.filter((_, i) => i !== index))
    }
  }

  const loadDefaultTiers = () => {
    setTiers([
      { id: 'bronze', name: 'Bronze Member', nameAr: 'عضو برونزي', minRewards: 1, maxRewards: 2, icon: '🥉', color: '#CD7F32' },
      { id: 'silver', name: 'Silver Member', nameAr: 'عضو فضي', minRewards: 3, maxRewards: 5, icon: '🥈', color: '#C0C0C0' },
      { id: 'gold', name: 'Gold Member', nameAr: 'عضو ذهبي', minRewards: 6, maxRewards: null, icon: '🥇', color: '#FFD700' }
    ])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Include tier configuration in form data
    const dataToSave = {
      ...formData,
      loyalty_tiers: tiersEnabled ? { enabled: true, tiers } : null
    }
    
    onSave(dataToSave)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="relative w-full max-w-full h-full sm:w-auto sm:max-w-2xl sm:h-auto sm:max-h-[90vh] bg-white dark:bg-gray-800 sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-gray-200 dark:sm:border-gray-700 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {offer ? t('offers.editOffer') : t('offers.createNewOffer')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {offer ? t('offers.updateOfferDetails') : t('offers.setupNewProgram')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" id="offer-form">
            {/* Offer Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('offers.offerTitle')} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={t('offers.offerTitlePlaceholder')}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('offers.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 min-h-[88px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none"
                rows="3"
                placeholder={t('offers.descriptionPlaceholder')}
              />
            </div>

            {/* Branch and Program Type Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('offers.branchLocation')}
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({...formData, branch: e.target.value})}
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all touch-target"
                >
                  <option value="all">{t('offers.allBranches')}</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('offers.programType')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                >
                  <option value="stamps">🎫 {t('offers.stampCard')}</option>
                  <option value="points">⭐ {t('offers.pointsSystem')}</option>
                  <option value="discount">💰 {t('offers.discountCode')}</option>
                </select>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {formData.type === 'stamps' ? '🎫 ' + t('offers.stampsRequired') : formData.type === 'points' ? '⭐ ' + t('offers.pointsRequired') : '💰 ' + t('offers.minimumPurchase')}
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.stamps_required}
                onChange={(e) => setFormData({...formData, stamps_required: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={formData.type === 'stamps' ? t('offers.stampsPlaceholder') : formData.type === 'points' ? t('offers.pointsPlaceholder') : t('offers.minimumPurchasePlaceholder')}
              />
            </div>

            {/* Loyalty Tiers Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tiersEnabled"
                  checked={tiersEnabled}
                  onChange={(e) => setTiersEnabled(e.target.checked)}
                  className="h-5 w-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="tiersEnabled" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  🏆 {t('offers.enableTiers')}
                </label>
              </div>

              {tiersEnabled && (
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('offers.tierConfigDesc')}
                    </p>
                    <button
                      type="button"
                      onClick={loadDefaultTiers}
                      className="px-3 py-2 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      {t('offers.resetToDefaults')}
                    </button>
                  </div>

                  {/* Tier Configuration List */}
                  <div className="space-y-4">
                    {tiers.map((tier, index) => (
                      <div key={tier.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{tier.icon}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {t('offers.tier')} {index + 1}
                            </span>
                          </div>
                          {tiers.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeTier(index)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('offers.tierNameEnglish')} *
                            </label>
                            <input
                              type="text"
                              required
                              value={tier.name}
                              onChange={(e) => updateTier(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder={t('offers.tierNamePlaceholder')}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('offers.tierNameArabic')}
                            </label>
                            <input
                              type="text"
                              value={tier.nameAr}
                              onChange={(e) => updateTier(index, 'nameAr', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder={t('offers.tierNameArPlaceholder')}
                              dir="rtl"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('offers.minimumRewards')} *
                            </label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={tier.minRewards}
                              onChange={(e) => updateTier(index, 'minRewards', parseInt(e.target.value))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('offers.maximumRewards')} {index === tiers.length - 1 ? t('offers.emptyUnlimited') : '*'}
                            </label>
                            <input
                              type="number"
                              min={tier.minRewards}
                              value={tier.maxRewards === null ? '' : tier.maxRewards}
                              onChange={(e) => updateTier(index, 'maxRewards', e.target.value === '' ? null : parseInt(e.target.value))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder={index === tiers.length - 1 ? t('offers.unlimited') : ''}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('offers.iconEmoji')} *
                            </label>
                            <input
                              type="text"
                              required
                              value={tier.icon}
                              onChange={(e) => updateTier(index, 'icon', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder={t('offers.iconPlaceholder')}
                              maxLength="2"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {t('offers.iconUrl')}
                            </label>
                            <input
                              type="url"
                              value={tier.iconUrl || ''}
                              onChange={(e) => updateTier(index, 'iconUrl', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="https://example.com/icon.png"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Tier Color
                            </label>
                            <input
                              type="color"
                              value={tier.color}
                              onChange={(e) => updateTier(index, 'color', e.target.value)}
                              className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Tier Button */}
                  {tiers.length < 5 && (
                    <button
                      type="button"
                      onClick={addTier}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors font-medium"
                    >
                      + Add Tier (max 5)
                    </button>
                  )}

                  {/* Preview */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                      📱 Preview in Wallet Pass:
                    </p>
                    <div className="space-y-1">
                      {tiers.map((tier, index) => (
                        <p key={tier.id} className="text-sm text-blue-800 dark:text-blue-300">
                          {tier.minRewards}-{tier.maxRewards === null ? '∞' : tier.maxRewards} rewards: {tier.icon} {tier.name}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Time Limits Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="timeLimited"
                  checked={formData.is_time_limited}
                  onChange={(e) => setFormData({...formData, is_time_limited: e.target.checked})}
                  className="h-5 w-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="timeLimited" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ⏰ Set time limits for this offer
                </label>
              </div>

              {formData.is_time_limited && (
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required={formData.is_time_limited}
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required={formData.is_time_limited}
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer - Fixed on mobile */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-6 py-3 min-h-[44px] border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 active:scale-95"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="offer-form"
            className="w-full sm:flex-1 px-6 py-3 min-h-[44px] bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 transform hover:scale-[1.02] active:scale-95 shadow-lg"
          >
            {offer ? '✨ ' + t('offers.updateOffer') : '🎉 ' + t('offers.createOffer')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OffersTab